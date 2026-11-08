import { describe, expect, it } from "vitest";
import { getLocalQuickLoginConfig } from "./local-quick-login.js";

describe("local test login visibility", () => {
  const user = { label: "مدیر علمی آزمایشی", phoneNumber: "09129011005", role: "SCIENTIFIC_SUPERVISOR" };

  it("exposes quick logins only in enabled development on a loopback host", () => {
    expect(getLocalQuickLoginConfig({
      isDevelopment: true,
      enabled: "true",
      hostname: "localhost",
      password: "local-test-password",
      usersJson: JSON.stringify([user]),
    })).toEqual({ password: "local-test-password", users: [user] });
  });

  it("does not expose quick logins in production or on a non-local host", () => {
    const options = {
      enabled: "true",
      password: "local-test-password",
      usersJson: JSON.stringify([user]),
    };
    expect(getLocalQuickLoginConfig({ ...options, isDevelopment: false, hostname: "localhost" })).toBeNull();
    expect(getLocalQuickLoginConfig({ ...options, isDevelopment: true, hostname: "tstaff.example" })).toBeNull();
    expect(getLocalQuickLoginConfig({ ...options, isDevelopment: true, hostname: "localhost", enabled: "false" })).toBeNull();
  });

  it("rejects invalid credentials and filters malformed user entries", () => {
    expect(getLocalQuickLoginConfig({
      isDevelopment: true,
      enabled: "true",
      hostname: "127.0.0.1",
      password: "short",
      usersJson: JSON.stringify([user]),
    })).toBeNull();

    const config = getLocalQuickLoginConfig({
      isDevelopment: true,
      enabled: "true",
      hostname: "127.0.0.1",
      password: "local-test-password",
      usersJson: JSON.stringify([user, { label: "bad", phoneNumber: "123", role: "ADMIN" }]),
    });
    expect(config?.users).toEqual([user]);
  });
});
