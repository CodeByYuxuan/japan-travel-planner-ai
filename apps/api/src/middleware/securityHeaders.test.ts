import express from "express";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { securityHeaders } from "./securityHeaders.js";

describe("security headers middleware", () => {
  test("sets API-safe browser security headers", async () => {
    const app = express();

    app.use(securityHeaders);
    app.get("/test", (_request, response) => {
      response.status(200).json({
        status: "ok"
      });
    });

    const response = await request(app).get("/test");

    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    );
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response.headers["permissions-policy"]).toBe(
      "camera=(), geolocation=(), microphone=()"
    );
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-permitted-cross-domain-policies"]).toBe("none");
  });
});
