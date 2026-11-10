import { describe, expect, it } from "vitest";
import { canReadBankEntry } from "./resource-bank-access.js";

describe("CHG-BANK / FR-026, FR-037 scoped metadata access", () => {
  it("allows tracking nationwide including unmapped provinces", () => {
    expect(canReadBankEntry(["TRACKING_DIRECTOR"], "m", [], null, [])).toBe(true);
  });
  it("denies another province and unidentified province", () => {
    expect(canReadBankEntry(["PROVINCIAL_DIRECTOR"], "m", ["a"], "b", [])).toBe(false);
    expect(canReadBankEntry(["PROVINCIAL_DIRECTOR"], "m", ["a"], null, [])).toBe(false);
  });
  it("grants own province or live explicit referral only", () => {
    expect(canReadBankEntry(["PROVINCIAL_DIRECTOR"], "m", ["a"], "a", [])).toBe(true);
    expect(canReadBankEntry(["PROVINCIAL_DIRECTOR"], "m", [], "b", [{ recipientId: "m", revokedAt: null }])).toBe(true);
    expect(canReadBankEntry(["PROVINCIAL_DIRECTOR"], "m", [], "b", [{ recipientId: "m", revokedAt: new Date() }])).toBe(false);
  });
  it("denies unrelated roles even with matching ids", () => {
    expect(canReadBankEntry(["INTERN"], "m", ["a"], "a", [])).toBe(false);
    expect(canReadBankEntry(["SYSTEM_ADMIN"], "m", ["a"], "a", [])).toBe(false);
  });
});
