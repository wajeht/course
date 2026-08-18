import crypto from "node:crypto";

import { zValidator } from "@hono/zod-validator";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { z } from "zod";

import type { Configuration } from "../configuration.js";
import type { AppContext } from "../context.js";
import { MIN_PASSWORD_LENGTH } from "./auth.service.js";

const authBodyLimit = bodyLimit({
  maxSize: 4 * 1024,
  onError: (c) => c.json({ message: "Authentication request is too large" }, 413),
});
const passwordSchema = z
  .string()
  .max(72)
  .refine(
    (password) => [...password].length >= MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  )
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, "Password is too long");
const loginSchema = z.object({ password: z.string() }).strict();
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
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function validationHook(
  result: { success: boolean; error?: { issues: readonly { message: string }[] } },
  c: Context,
): Response | undefined {
  if (!result.success) {
    return c.json({ message: result.error?.issues[0]?.message ?? "Invalid request" }, 400);
  }
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
    await context.auth.touchSession(session);
    await next();
  };
}

function clientKey(c: Context, configuration: Configuration): string {
  const address =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return crypto
    .createHmac("sha256", configuration.auth.sessionSecret)
    .update(address)
    .digest("hex");
}

export function createAuthRouter(context: AppContext) {
  const configuration = context.configuration;

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
    .post("/", authBodyLimit, zValidator("json", loginSchema, validationHook), async (c) => {
      const key = clientKey(c, configuration);
      const attempt = await context.auth.getLoginAttempt(key);
      if (attempt && attempt.failures >= configuration.auth.loginMaxAttempts) {
        const retryAfter = Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
        c.header("Retry-After", String(retryAfter));
        return c.json({ message: "Too many login attempts. Try again later." }, 429);
      }
      if (!(await context.auth.isPasswordConfigured())) {
        return c.json({ message: "Library password is not configured" }, 409);
      }
      if (!(await context.auth.verifyPassword(c.req.valid("json").password))) {
        await context.auth.recordLoginFailure(key);
        context.logger.warn("Failed login attempt", { client: key });
        return c.json({ message: "Invalid password" }, 401);
      }
      await context.auth.clearLoginFailures(key);
      await writeSession(c, context, await context.auth.createSession());
      context.logger.info("Login successful", { client: key });
      return c.json({ authenticated: true });
    })
    .post("/logout", async (c) => {
      const cookie = await getSignedCookie(
        c,
        configuration.auth.sessionSecret,
        sessionCookieName(configuration),
      );
      if (typeof cookie === "string") await context.auth.revokeSession(cookie);
      deleteCookie(c, sessionCookieName(configuration), sessionCookieOptions(configuration));
      return c.json({ authenticated: false });
    })
    .post(
      "/password",
      authBodyLimit,
      zValidator("json", setupSchema, validationHook),
      async (c) => {
        const { password, setupToken } = c.req.valid("json");
        const result = await context.auth.setupPassword(password, setupToken);
        if (result.ok) {
          context.logger.info("Initial application password configured");
          return c.json({ passwordConfigured: true }, 201);
        }
        if (result.reason === "already_configured") {
          return c.json({ message: "Library password is already configured" }, 409);
        }
        if (result.reason === "setup_disabled") {
          return c.json({ message: "Password setup is unavailable" }, 503);
        }
        return c.json({ message: "The password or setup token is incorrect" }, 400);
      },
    )
    .put(
      "/password",
      createRequireAuth(context),
      authBodyLimit,
      zValidator("json", changePasswordSchema, validationHook),
      async (c) => {
        const { currentPassword, newPassword } = c.req.valid("json");
        const result = await context.auth.changePassword(currentPassword, newPassword);
        if (!result.ok) return c.json({ message: "Current password is incorrect" }, 400);
        await writeSession(c, context, await context.auth.createSession());
        context.logger.info("Application password changed");
        return c.json({ passwordChanged: true });
      },
    );
}
