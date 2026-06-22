import type { Request, RequestHandler } from "express";

import {
  createAnonymousSessionId,
  readSignedSessionCookie,
  serializeSignedSessionCookie,
  type AnonymousSessionCookieOptions
} from "../auth/sessionCookie.js";
import { ApiError } from "../errors/ApiError.js";

export type AnonymousSession = {
  id: string;
  isNew: boolean;
};

type AnonymousSessionRequest = Request & {
  anonymousSession?: AnonymousSession;
};

export type SessionMiddlewareOptions = AnonymousSessionCookieOptions & {
  secret: string;
};

export function createSessionMiddleware(
  options: SessionMiddlewareOptions
): RequestHandler {
  const secret = options.secret.trim();

  if (secret.length === 0) {
    throw new Error("Anonymous session secret is required.");
  }

  return (request, response, next) => {
    const sessionRequest = request as AnonymousSessionRequest;
    const sessionId = readSignedSessionCookie(
      request.headers.cookie,
      secret,
      options.cookieName
    );

    if (sessionId !== null) {
      sessionRequest.anonymousSession = {
        id: sessionId,
        isNew: false
      };
      next();
      return;
    }

    const newSessionId = createAnonymousSessionId();

    sessionRequest.anonymousSession = {
      id: newSessionId,
      isNew: true
    };
    response.setHeader(
      "Set-Cookie",
      serializeSignedSessionCookie(newSessionId, secret, options)
    );
    next();
  };
}

export function requireAnonymousSession(request: Request) {
  const sessionRequest = request as AnonymousSessionRequest;

  if (sessionRequest.anonymousSession === undefined) {
    throw new ApiError({
      statusCode: 500,
      code: "SESSION_UNAVAILABLE",
      message: "Anonymous session was not initialized."
    });
  }

  return sessionRequest.anonymousSession;
}
