import { hc } from "hono/client";

import type { AppType } from "../../app";

export const apiClient = hc<AppType>("/");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function expectJson<T>(response: Response, notifyUnauthorized = false): Promise<T> {
  const body = (await response.json()) as T | { message?: string };
  if (!response.ok) {
    if (notifyUnauthorized && response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("course:unauthorized"));
    }
    throw new ApiError(
      "message" in (body as object)
        ? ((body as { message?: string }).message ?? "Request failed")
        : "Request failed",
      response.status,
    );
  }
  return body as T;
}

export function expectProtectedJson<T>(response: Response): Promise<T> {
  return expectJson<T>(response, true);
}
