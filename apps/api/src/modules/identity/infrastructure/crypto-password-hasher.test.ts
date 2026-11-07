import { describe, it, expect } from "vitest";
import { CryptoPasswordHasher } from "./crypto-password-hasher.js";

describe("CryptoPasswordHasher (scrypt + timingSafeEqual)", () => {
  const hasher = new CryptoPasswordHasher();

  it("generates a hash in salt:key hex format", async () => {
    const hash = await hasher.hash("TStaff@Secure2026");
    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt).toBeDefined();
    expect(key).toBeDefined();
    expect(salt!.length).toBe(32); // 16 bytes = 32 hex chars
    expect(key!.length).toBe(128); // 64 bytes = 128 hex chars
  });

  it("successfully verifies a matching password", async () => {
    const password = "MySecretPassword#123";
    const hash = await hasher.hash(password);

    const matches = await hasher.compare(password, hash);
    expect(matches).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const password = "CorrectPassword";
    const hash = await hasher.hash(password);

    const matches = await hasher.compare("WrongPassword", hash);
    expect(matches).toBe(false);
  });

  it("rejects malformed hashes gracefully without throwing", async () => {
    expect(await hasher.compare("pass", "invalid-hash-without-colon")).toBe(
      false,
    );
    expect(await hasher.compare("pass", ":")).toBe(false);
    expect(await hasher.compare("pass", "onlysalt:")).toBe(false);
    expect(await hasher.compare("pass", ":onlykey")).toBe(false);
    expect(await hasher.compare("pass", "salthex:notproperhexlength")).toBe(
      false,
    );
  });
});
