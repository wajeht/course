import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../../app.js";
import { createConfiguration } from "../../../configuration.js";
import { createContext, type AppContext } from "../../../context.js";

const contexts: AppContext[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.database.close()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

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
  const context = await createContext(configuration);
  contexts.push(context);
  return { app: createApp(context), context };
}

async function closeContext(context: AppContext): Promise<void> {
  const index = contexts.indexOf(context);
  if (index >= 0) contexts.splice(index, 1);
  await context.database.close();
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
          jsonRequest("POST", { password: "test-password", confirmPassword: "test-password" }),
        )
      ).status,
    ).toBe(201);

    const badLogin = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "wrong-password" }),
    );
    expect(badLogin.status).toBe(401);

    const login = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-password" }),
    );
    expect(login.status).toBe(200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toMatch(/^course_session=/);

    const catalog = await app.request("/api/catalog", { headers: { cookie: cookie! } });
    expect(catalog.status).toBe(200);

    const change = await app.request(
      "/api/auth/password",
      jsonRequest(
        "PUT",
        {
          currentPassword: "test-password",
          newPassword: "new-test-password",
          confirmPassword: "new-test-password",
        },
        cookie,
      ),
    );
    expect(change.status).toBe(200);

    const logout = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { cookie: cookie! },
    });
    expect(logout.status).toBe(200);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");

    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "test-password" }))).status,
    ).toBe(401);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "new-test-password" })))
        .status,
    ).toBe(200);
  });

  it("blocks repeated failed logins", async () => {
    const { app, context } = await testApp({ maxAttempts: 2 });
    await context.auth.setupPassword("test-password");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect(
        (await app.request("/api/auth", jsonRequest("POST", { password: "wrong-password" })))
          .status,
      ).toBe(401);
    }

    const blocked = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-password" }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("clears persisted failures after a successful login", async () => {
    const { app, context } = await testApp({ maxAttempts: 2 });
    await context.auth.setupPassword("test-password");

    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "wrong-password" }))).status,
    ).toBe(401);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "test-password" }))).status,
    ).toBe(200);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "wrong-password" }))).status,
    ).toBe(401);
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: "test-password" }))).status,
    ).toBe(200);
  });

  it("preserves blocked logins across application restarts", async () => {
    const dataDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "course-auth-test-"));
    temporaryDirectories.push(dataDirectory);
    const first = await testApp({ maxAttempts: 2, dataDirectory });
    await first.context.auth.setupPassword("test-password");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect(
        (await first.app.request("/api/auth", jsonRequest("POST", { password: "wrong-password" })))
          .status,
      ).toBe(401);
    }
    await closeContext(first.context);

    const second = await testApp({ maxAttempts: 2, dataDirectory });
    const blocked = await second.app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-password" }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("rejects unsigned or expired session cookies", async () => {
    const { app, context } = await testApp({ idleTimeoutMs: 1 });
    await context.auth.setupPassword("test-password");

    expect(
      (
        await app.request("/api/catalog", {
          headers: { cookie: `course_session=${context.auth.createSession()}` },
        })
      ).status,
    ).toBe(401);

    const login = await app.request(
      "/api/auth",
      jsonRequest("POST", { password: "test-password" }),
    );
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await app.request("/api/catalog", { headers: { cookie: cookie! } })).status).toBe(401);
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
    expect(
      (await app.request("/api/auth", jsonRequest("POST", { password: `${password}a` }))).status,
    ).toBe(400);
    expect((await app.request("/api/auth", jsonRequest("POST", { password }))).status).toBe(200);
  });
});
