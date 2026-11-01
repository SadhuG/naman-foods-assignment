import { describe, expect, it } from "vitest";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("maps SQL codes", () => {
    expect(friendlyError({ message: "already_applied" })).toBe(
      "You've already applied to this drive.",
    );
  });
  it("maps auth messages", () => {
    expect(friendlyError({ message: "User already registered" })).toBe(
      "An account with this email already exists. Sign in to apply.",
    );
    expect(friendlyError(new Error("Invalid login credentials"))).toBe(
      "Email or password is incorrect.",
    );
  });
  it("falls back for unknown errors", () => {
    expect(friendlyError({ message: "boom" })).toBe(
      "Something went wrong. Please try again.",
    );
    expect(friendlyError(null)).toBe("Something went wrong. Please try again.");
  });
});
