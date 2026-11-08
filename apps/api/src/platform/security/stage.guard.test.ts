import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import { ForbiddenException, UnauthorizedException, ExecutionContext } from "@nestjs/common";
import { StageGuard, REQUIRED_STAGE_KEY, REQUIRED_ROLES_KEY } from "./stage.guard.js";

function createMockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("StageGuard & Negative Authorization (AT-02, AT-31)", () => {
  const reflector = new Reflector();

  const requireIntern = () => {
    reflector.getAllAndOverride = ((key: string) => key === REQUIRED_STAGE_KEY ? "INTERN" : key === REQUIRED_ROLES_KEY ? undefined : undefined) as any;
  };

  beforeEach(() => vi.stubEnv("NODE_ENV", "test"));
  afterEach(() => vi.unstubAllEnvs());

  it("rejects missing identity and stage (AT-31)", async () => {
    requireIntern();
    await expect(new StageGuard(reflector).canActivate(createMockContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an invalid test stage", async () => {
    reflector.getAllAndOverride = ((key: string) => key === REQUIRED_STAGE_KEY ? "APPRENTICE" : undefined) as any;
    await expect(new StageGuard(reflector).canActivate(createMockContext({ "x-user-id": "test-user", "x-user-stage": "INVALID_STAGE" }))).rejects.toThrow(UnauthorizedException);
  });

  it("blocks APPRENTICE from INTERN-only routes (AT-02)", async () => {
    requireIntern();
    await expect(new StageGuard(reflector).canActivate(createMockContext({ "x-user-id": "test-user", "x-user-stage": "APPRENTICE" }))).rejects.toThrow(ForbiddenException);
  });

  it("allows an INTERN in the isolated test identity adapter", async () => {
    requireIntern();
    await expect(new StageGuard(reflector).canActivate(createMockContext({ "x-user-id": "test-user", "x-user-stage": "INTERN" }))).resolves.toBe(true);
  });

  it("rejects spoofed identity headers when production session auth is active (AT-31)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    requireIntern();
    const prisma = { userSession: { findUnique: vi.fn() } } as any;
    const guard = new StageGuard(reflector, prisma);
    await expect(guard.canActivate(createMockContext({
      "x-user-id": "forged-user",
      "x-user-stage": "INTERN",
      "x-user-role": "SCIENTIFIC_SUPERVISOR",
    }))).rejects.toThrow(UnauthorizedException);
    expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
  });

  it("uses stage and roles loaded from the authenticated session", async () => {
    vi.stubEnv("NODE_ENV", "production");
    requireIntern();
    const prisma = { userSession: { findUnique: vi.fn(async () => ({
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "session-user", stage: "APPRENTICE", isActive: true, userRoles: [{ role: { name: "SCIENTIFIC_SUPERVISOR" } }] },
    })) } } as any;
    const guard = new StageGuard(reflector, prisma);
    await expect(guard.canActivate(createMockContext({ authorization: "Bearer valid-token" }))).rejects.toThrow(ForbiddenException);
  });

  it("blocks suspended session users (FR-035, AT-12, BR-18)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    requireIntern();
    const prisma = { userSession: { findUnique: vi.fn(async () => ({
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "suspended-user", stage: "INTERN", isActive: false, userRoles: [] },
    })) } } as any;
    await expect(new StageGuard(reflector, prisma).canActivate(createMockContext({ authorization: "Bearer valid-token" }))).rejects.toThrow(ForbiddenException);
  });

  it("permits unrestricted stage-required endpoints when authenticated in test adapter", async () => {
    reflector.getAllAndOverride = ((key: string) => key === REQUIRED_STAGE_KEY ? undefined : undefined) as any;
    await expect(new StageGuard(reflector).canActivate(createMockContext({ "x-user-id": "test-user", "x-user-stage": "APPRENTICE" }))).resolves.toBe(true);
  });
});
