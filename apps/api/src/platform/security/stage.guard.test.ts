import { describe, it, expect } from "vitest";
import { Reflector } from "@nestjs/core";
import {
  ForbiddenException,
  UnauthorizedException,
  ExecutionContext,
} from "@nestjs/common";
import { StageGuard, REQUIRED_STAGE_KEY } from "./stage.guard.js";

function createMockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("StageGuard & Negative Authorization (AT-02)", () => {
  const reflector = new Reflector();
  const guard = new StageGuard(reflector);

  it("fails closed and throws UnauthorizedException when user stage header is missing", () => {
    reflector.getAllAndOverride = () => "INTERN";
    const unauthenticatedContext = createMockContext({});

    expect(() => guard.canActivate(unauthenticatedContext)).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(unauthenticatedContext)).toThrow(
      "شناسایی هویت و سطح کاربری الزامی است",
    );
  });

  it("fails closed and throws UnauthorizedException when user stage is invalid string", () => {
    reflector.getAllAndOverride = () => "APPRENTICE";
    const invalidContext = createMockContext({
      "x-user-stage": "INVALID_STAGE",
    });

    expect(() => guard.canActivate(invalidContext)).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(invalidContext)).toThrow(
      "سطح کاربری ارائه‌شده نامعتبر است",
    );
  });

  it("blocks APPRENTICE from accessing INTERN-only endpoint with 403 Forbidden (AT-02)", () => {
    // Mock handler requiring INTERN
    reflector.getAllAndOverride = () => "INTERN";

    const apprenticeContext = createMockContext({
      "x-user-stage": "APPRENTICE",
    });

    expect(() => guard.canActivate(apprenticeContext)).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(apprenticeContext)).toThrow(
      "دسترسی کارآموز به سامانه پژوهش مسدود است. ارتقا به وضعیت کارورز الزامی است (AT-02)",
    );
  });

  it("allows INTERN to access INTERN-only endpoint", () => {
    reflector.getAllAndOverride = () => "INTERN";

    const internContext = createMockContext({ "x-user-stage": "INTERN" });
    expect(guard.canActivate(internContext)).toBe(true);
  });

  it("allows any user to access public or unconstrained endpoint", () => {
    reflector.getAllAndOverride = () => undefined;

    const context = createMockContext({ "x-user-stage": "APPRENTICE" });
    expect(guard.canActivate(context)).toBe(true);
  });
});
