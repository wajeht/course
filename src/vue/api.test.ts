// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  api,
  ApiError,
  apiErrorMessage,
  expectJson,
  expectProtectedJson,
  isLibraryResourceNotFound,
} from "./api.js";

const unauthorized = vi.fn();

afterEach(() => {
  window.removeEventListener("videos:unauthorized", unauthorized);
  unauthorized.mockReset();
  vi.unstubAllGlobals();
});

describe("API response handling", () => {
  it("returns successful JSON responses", async () => {
    const response = new Response(JSON.stringify({ ready: true }), {
      headers: { "content-type": "application/json" },
    });

    await expect(expectJson<{ ready: boolean }>(response)).resolves.toEqual({ ready: true });
  });

  it("does not expire the session for public endpoint failures", async () => {
    window.addEventListener("videos:unauthorized", unauthorized);
    const response = new Response(JSON.stringify({ message: "Invalid password" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    await expect(expectJson(response)).rejects.toEqual(new ApiError("Invalid password", 401));
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("notifies the auth provider when a protected endpoint rejects the session", async () => {
    window.addEventListener("videos:unauthorized", unauthorized);
    const response = new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    await expect(expectProtectedJson(response)).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it("recognizes malformed and missing library resources as not found", () => {
    expect(isLibraryResourceNotFound(new ApiError("Invalid identifier", 400))).toBe(true);
    expect(isLibraryResourceNotFound(new ApiError("Video not found", 404))).toBe(true);
    expect(isLibraryResourceNotFound(new ApiError("Server failed", 500))).toBe(false);
  });

  it("preserves API messages and hides technical client errors", () => {
    expect(apiErrorMessage(new ApiError("Invalid password", 401), "Could not sign in")).toBe(
      "Invalid password",
    );
    expect(apiErrorMessage(new TypeError("Failed to fetch"), "Could not sign in")).toBe(
      "Could not sign in",
    );
    expect(apiErrorMessage(new ApiError("", 500), "Request failed")).toBe("Request failed");
  });

  it("stops thumbnail polling when the request is aborted", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "running" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", request);
    const controller = new AbortController();

    const regeneration = api.regenerateVideoThumbnail("a".repeat(24), controller.signal);
    const rejection = expect(regeneration).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    controller.abort();

    await rejection;
    expect(request).toHaveBeenCalledOnce();
  });
});
