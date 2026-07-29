import type { RequestHandler } from "express";

const apiSecurityHeaders = {
  "Content-Security-Policy":
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Permitted-Cross-Domain-Policies": "none"
} as const;

export const securityHeaders: RequestHandler = (_request, response, next) => {
  for (const [name, value] of Object.entries(apiSecurityHeaders)) {
    response.setHeader(name, value);
  }

  next();
};
