import { zValidator } from "@hono/zod-validator";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { z } from "zod";

import type { Configuration } from "../../../configuration.js";
import type { AppContext } from "../../../context.js";

const loginPasswordSchema = z
  .string()
  .min(1)
  .max(72)
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, "Password is too long");
const passwordSchema = loginPasswordSchema.refine(
  (password) => password.length >= 8,
  "Password must be at least 8 characters",
);
const loginSchema = z.object({ password: loginPasswordSchema }).strict();
const setupSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    setupToken: z.string().min(16).max(256).optional(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
const changePasswordSchema = z
  .object({
    currentPassword: loginPasswordSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface AttemptRecord {
  failures: number;
  resetAt: number;
}

function sessionCookieName(configuration: Configuration): string {
  return configuration.app.env === "production" ? "__Host-course_session" : "course_session";
}

function sessionCookieOptions(configuration: Configuration) {
  return {
    httpOnly: true,
    secure: configuration.app.env === "production",
    sameSite: "Strict" as const,
    path: "/",
    maxAge: Math.floor(configuration.auth.absoluteTimeoutMs / 1000),
  };
}

async function readSession(c: Context, context: AppContext) {
  const cookie = await getSignedCookie(
    c,
    context.configuration.auth.sessionSecret,
    sessionCookieName(context.configuration),
  );
  return typeof cookie === "string" ? context.auth.parseSession(cookie) : null;
}

async function writeSession(c: Context, context: AppContext, value: string): Promise<void> {
  await setSignedCookie(
    c,
    sessionCookieName(context.configuration),
    value,
    context.configuration.auth.sessionSecret,
    sessionCookieOptions(context.configuration),
  );
}

export function createRequireAuth(context: AppContext): MiddlewareHandler {
  return async (c, next) => {
    const session = await readSession(c, context);
    if (!session) return c.json({ message: "Authentication required" }, 401);
    await writeSession(c, context, context.auth.refreshSession(session));
    await next();
  };
}

function clientKey(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function createAuthRouter(context: AppContext) {
  const attempts = new Map<string, AttemptRecord>();
  const configuration = context.configuration;

  function activeAttempt(key: string, now = Date.now()): AttemptRecord | null {
    const attempt = attempts.get(key);
    if (!attempt || attempt.resetAt <= now) {
      attempts.delete(key);
      return null;
    }
    return attempt;
  }

  return new Hono()
    .get("/me", async (c) => {
      const authenticated = Boolean(await readSession(c, context));
      const passwordConfigured = await context.auth.isPasswordConfigured();
      return c.json({
        authenticated,
        passwordConfigured,
        setupEnabled:
          !passwordConfigured &&
          (configuration.app.env !== "production" || Boolean(configuration.auth.setupToken)),
        setupTokenRequired: !passwordConfigured && configuration.app.env === "production",
      });
    })
    .post("/", zValidator("json", loginSchema), async (c) => {
      const key = clientKey(c);
      const attempt = activeAttempt(key);
      if (attempt && attempt.failures >= configuration.auth.loginMaxAttempts) {
        const retryAfter = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
        c.header("Retry-After", String(retryAfter));
        return c.json({ message: "Too many login attempts. Try again later." }, 429);
      }
      if (!(await context.auth.isPasswordConfigured())) {
        return c.json({ message: "Application password is not configured" }, 409);
      }
      if (!(await context.auth.verifyPassword(c.req.valid("json").password))) {
        const now = Date.now();
        const current = activeAttempt(key, now);
        if (!current && attempts.size >= 1_000) {
          attempts.delete(attempts.keys().next().value!);
        }
        attempts.set(key, {
          failures: (current?.failures ?? 0) + 1,
          resetAt: current?.resetAt ?? now + configuration.auth.loginWindowMs,
        });
        context.logger.warn("Failed login attempt", { client: key });
        return c.json({ message: "Invalid password" }, 401);
      }
      attempts.delete(key);
      await writeSession(c, context, context.auth.createSession());
      context.logger.info("Login successful", { client: key });
      return c.json({ authenticated: true });
    })
    .post("/logout", async (c) => {
      deleteCookie(c, sessionCookieName(configuration), sessionCookieOptions(configuration));
      return c.json({ authenticated: false });
    })
    .post("/password", zValidator("json", setupSchema), async (c) => {
      const { password, setupToken } = c.req.valid("json");
      const result = await context.auth.setupPassword(password, setupToken);
      if (result.ok) {
        context.logger.info("Initial application password configured");
        return c.json({ passwordConfigured: true }, 201);
      }
      if (result.reason === "already_configured") {
        return c.json({ message: "Application password is already configured" }, 409);
      }
      if (result.reason === "setup_disabled") {
        return c.json({ message: "Initial password setup is disabled" }, 503);
      }
      return c.json({ message: "Invalid password or setup token" }, 400);
    })
    .put(
      "/password",
      createRequireAuth(context),
      zValidator("json", changePasswordSchema),
      async (c) => {
        const { currentPassword, newPassword } = c.req.valid("json");
        const result = await context.auth.changePassword(currentPassword, newPassword);
        if (!result.ok) return c.json({ message: "Current password is incorrect" }, 400);
        context.logger.info("Application password changed");
        return c.json({ passwordChanged: true });
      },
    );
}
