import path from "node:path";

import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { createConfiguration } from "../config.js";
import type { AppContext } from "../context.js";
import {
  closeTestDatabase,
  createTemporaryDirectory,
  createTestContext,
} from "../test/resources.js";

async function testApp(
  options: { maxAttempts?: number; idleTimeoutMs?: number; dataDirectory?: string } = {},
) {
  const baseConfiguration = createConfiguration({
    APP_ENV: "testing",
    LOGIN_MAX_ATTEMPTS: String(options.maxAttempts ?? 5),
    SESSION_IDLE_TIMEOUT_MS: String(options.idleTimeoutMs ?? 60_000),
  });
  const configuration = options.dataDirectory
    ? {
        ...baseConfiguration,
        database: { filename: path.join(options.dataDirectory, "course.sqlite") },
      }
    : baseConfiguration;
  const context = await createTestContext(configuration);
  return { app: createApp(context), context };
}

async function closeContext(context: AppContext): Promise<void> {
  await closeTestDatabase(context.database);
}

function jsonRequest(method: string, body: object, cookie?: string): RequestInit {
  return {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

describe("password authentication", () => {
  it("sets up a password, signs in, protects APIs, changes the password, and signs out", async () => {
    const { app } = await testApp();

    expect(await (await app.request("/api/auth/me")).json()).toEqual({
      authenticated: false,
      passwordConfigured: false,
      setupEnabled: true,
      setupTokenRequired: false,
    });
    expect((await app.request("/api/catalog")).status).toBe(401);

    expect(
      (
        await app.request(
          "/api/auth/password",
          jsonRequest("POST", {
            password: "test-course-password",
            confirmPassword: "test-course-password",
          }),
        )
      ).status,
    ).toBe(201);

    const badLogin = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "wrong-course-password" }),
    );
    expect(badLogin.status).toBe(401);

    const login = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-course-password" }),
    );
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toMatch(/^course_session=/);

    const catalog = await app.request("/api/catalog", { headers: { cookie: cookie! } });
    expect(catalog.status).toBe(200);
    const legacyPlaybackPath = "/api/playback/000000000000000000000000";
    expect(
      (
        await app.request(legacyPlaybackPath, {
          headers: { cookie: cookie!, "sec-fetch-site": "same-site" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(legacyPlaybackPath, {
          headers: { cookie: cookie!, "sec-fetch-site": "same-origin" },
        })
      ).status,
    ).toBe(404);

    const otherLogin = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-course-password" }),
    );
    const otherCookie = otherLogin.headers.get("set-cookie")?.split(";")[0];
    expect(otherCookie).toMatch(/^course_session=/);

    const change = await app.request(
      "/api/auth/password",
      jsonRequest(
        "PUT",
        {
          currentPassword: "test-course-password",
          newPassword: "new-test-password",
          confirmPassword: "new-test-password",
        },
        cookie,
      ),
    );
    expect(change.status).toBe(200);
    const refreshedCookie = change.headers.get("set-cookie")?.split(";")[0];
    expect(refreshedCookie).toMatch(/^course_session=/);
    expect((await app.request("/api/catalog", { headers: { cookie: cookie! } })).status).toBe(401);
    expect((await app.request("/api/catalog", { headers: { cookie: otherCookie! } })).status).toBe(
      401,
    );
    expect(
      (await app.request("/api/catalog", { headers: { cookie: refreshedCookie! } })).status,
    ).toBe(200);

    const logout = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { cookie: refreshedCookie!, origin: "http://localhost" },
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(
      (await app.request("/api/catalog", { headers: { cookie: refreshedCookie! } })).status,
    ).toBe(401);

    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "test-course-password" })))
        .status,
    ).toBe(401);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "new-test-password" })))
        .status,
    ).toBe(200);
  });

  it("blocks repeated failed logins", async () => {
    const { app, context } = await testApp({ maxAttempts: 2 });
    await context.auth.setupPassword("test-course-password");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect(
        (await app.request("/api/auth", jsonRequest("POST", { password: "wrong-course-password" })))
          .status,
      ).toBe(401);
    }

    const blocked = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-course-password" }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("clears persisted failures after a successful login", async () => {
    const { app, context } = await testApp({ maxAttempts: 2 });
    await context.auth.setupPassword("test-course-password");

    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "wrong-course-password" })))
        .status,
    ).toBe(401);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "test-course-password" })))
        .status,
    ).toBe(200);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "wrong-course-password" })))
        .status,
    ).toBe(401);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "test-course-password" })))
        .status,
    ).toBe(200);
  });

  it("preserves blocked logins across application restarts", async () => {
    const dataDirectory = await createTemporaryDirectory("course-auth-test-");
    const first = await testApp({ maxAttempts: 2, dataDirectory });
    await first.context.auth.setupPassword("test-course-password");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect(
        (
          await first.app.request(
            "/api/auth",
            jsonRequest("POST", { password: "wrong-course-password" }),
          )
        ).status,
      ).toBe(401);
    }
    await closeContext(first.context);

    const second = await testApp({ maxAttempts: 2, dataDirectory });
    const blocked = await second.app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-course-password" }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("preserves active sessions across application restarts", async () => {
    const dataDirectory = await createTemporaryDirectory("course-session-test-");
    const first = await testApp({ dataDirectory });
    await first.context.auth.setupPassword("test-course-password");
    const login = await first.app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-course-password" }),
    );
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    await closeContext(first.context);

    const second = await testApp({ dataDirectory });

    expect(
      (await second.app.request("/api/catalog", { headers: { cookie: cookie! } })).status,
    ).toBe(200);
  });

  it("rejects unsigned or expired session cookies", async () => {
    const { app, context } = await testApp({ idleTimeoutMs: 1 });
    await context.auth.setupPassword("test-course-password");

    expect(
      (
        await app.request("/api/catalog", {
          headers: { cookie: `course_session=${await context.auth.createSession()}` },
        })
      ).status,
    ).toBe(401);

    const login = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-course-password" }),
    );
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await app.request("/api/catalog", { headers: { cookie: cookie! } })).status).toBe(401);
  });

  it("rejects cross-origin form posts", async () => {
    const { app } = await testApp();

    const response = await app.request("/api/auth/logout", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://attacker.jaw.dev",
      },
    });

    expect(response.status).toBe(403);
  });

  it("requires at least 15 Unicode characters for new passwords", async () => {
    const { app } = await testApp();
    const shortPassword = "😀".repeat(14);
    const validPassword = "😀".repeat(15);

    const shortResponse = await app.request(
      "/api/auth/password",
      jsonRequest("POST", {
        password: shortPassword,
        confirmPassword: shortPassword,
      }),
    );
    expect(shortResponse.status).toBe(400);
    expect(await shortResponse.json()).toEqual({
      message: "Password must be at least 15 characters",
    });
    expect(
      (
        await app.request(
          "/api/auth/password",
          jsonRequest("POST", {
            password: validPassword,
            confirmPassword: validPassword,
          }),
        )
      ).status,
    ).toBe(201);
  });

  it("treats short sign-in passwords as invalid credentials", async () => {
    const { app, context } = await testApp();
    const password = "short123";
    await context.database.connection("auth_credentials").insert({
      id: 1,
      password_hash: await bcrypt.hash(password, 4),
    });

    expect(await context.auth.verifyPassword(password)).toBe(false);
    const response = await app.request("/api/auth", jsonRequest("POST", { password }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Invalid password" });
  });

  it("rejects oversized authentication requests before parsing them", async () => {
    const { app } = await testApp();
    const response = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "x".repeat(4 * 1024) }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ message: "Authentication request is too large" });
  });

  it("rejects passwords that bcrypt would silently truncate", async () => {
    const { app } = await testApp();
    const password = "😀".repeat(18);
    expect(Buffer.byteLength(password, "utf8")).toBe(72);
    expect(
      (
        await app.request(
          "/api/auth/password",
          jsonRequest("POST", { password, confirmPassword: password }),
        )
      ).status,
    ).toBe(201);
    const overlongLogin = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: `${password}a` }),
    );
    expect(overlongLogin.status).toBe(401);
    expect(await overlongLogin.json()).toEqual({ message: "Invalid password" });
    expect((await app.request("/api/auth", jsonRequest("POST", { password }))).status).toBe(200);
  });
});
