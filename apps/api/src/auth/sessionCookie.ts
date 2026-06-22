import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const anonymousSessionCookieName = "jtp_session";
export const anonymousSessionCookieMaxAgeSeconds = 60 * 60 * 24 * 180;

// MVP ownership uses an opaque anonymous session ID signed into an HTTP-only cookie.
// Public share links should use separate read-only tokens instead of this edit session.
export type AnonymousSessionCookieOptions = {
  cookieName?: string;
  maxAgeSeconds?: number;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
};

export function createAnonymousSessionId() {
  return randomUUID();
}

function signSessionId(sessionId: string, secret: string) {
  return createHmac("sha256", secret).update(sessionId).digest("base64url");
}

export function createSignedSessionValue(sessionId: string, secret: string) {
  return `${sessionId}.${signSessionId(sessionId, secret)}`;
}

export function verifySignedSessionValue(value: string, secret: string) {
  const separatorIndex = value.lastIndexOf(".");

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  const sessionId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const expectedSignature = signSessionId(sessionId, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  return sessionId;
}

export function readCookie(
  cookieHeader: string | undefined,
  cookieName = anonymousSessionCookieName
) {
  if (cookieHeader === undefined) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (rawName === cookieName) {
      return rawValueParts.join("=");
    }
  }

  return undefined;
}

export function readSignedSessionCookie(
  cookieHeader: string | undefined,
  secret: string,
  cookieName = anonymousSessionCookieName
) {
  const signedValue = readCookie(cookieHeader, cookieName);

  if (signedValue === undefined) {
    return null;
  }

  return verifySignedSessionValue(signedValue, secret);
}

export function serializeSignedSessionCookie(
  sessionId: string,
  secret: string,
  options: AnonymousSessionCookieOptions = {}
) {
  const cookieName = options.cookieName ?? anonymousSessionCookieName;
  const maxAgeSeconds =
    options.maxAgeSeconds ?? anonymousSessionCookieMaxAgeSeconds;
  const sameSite = options.sameSite ?? "Lax";
  const attributes = [
    `${cookieName}=${createSignedSessionValue(sessionId, secret)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    `SameSite=${sameSite}`
  ];

  if (options.secure === true) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}
