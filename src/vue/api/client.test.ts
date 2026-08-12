// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, expectJson, expectProtectedJson } from "./client.js";

const unauthorized = vi.fn();

afterEach(() => {
  window.removeEventListener("course:unauthorized", unauthorized);
  unauthorized.mockReset();
});

describe("API response handling", () => {
  it("returns successful JSON responses", async () => {
    const response = new Response(JSON.stringify({ ready: true }), {
      headers: { "content-type": "application/json" },
    });

    await expect(expectJson<{ ready: boolean }>(response)).resolves.toEqual({ ready: true });
  });

  it("does not expire the session for public endpoint failures", async () => {
    window.addEventListener("course:unauthorized", unauthorized);
    const response = new Response(JSON.stringify({ message: "Invalid password" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    await expect(expectJson(response)).rejects.toEqual(new ApiError("Invalid password", 401));
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("notifies the auth provider when a protected endpoint rejects the session", async () => {
    window.addEventListener("course:unauthorized", unauthorized);
    const response = new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    await expect(expectProtectedJson(response)).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledOnce();
  });
});
