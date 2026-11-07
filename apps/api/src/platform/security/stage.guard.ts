import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const REQUIRED_STAGE_KEY = "required_stage";
export const RequireStage = (stage: "APPRENTICE" | "INTERN") =>
  SetMetadata(REQUIRED_STAGE_KEY, stage);

const ALLOWED_STAGES = ["APPRENTICE", "INTERN"] as const;
type Stage = (typeof ALLOWED_STAGES)[number];

@Injectable()
export class StageGuard implements CanActivate {
  constructor(private reflector: Reflector = new Reflector()) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Rule FR-035 / AT-12 / BR-18: Account suspension immediately blocks API requests
    const isSuspended =
      request.headers?.["x-user-suspended"] === "true" ||
      request.headers?.["x-user-status"] === "SUSPENDED" ||
      request.headers?.["x-user-active"] === "false" ||
      request.user?.isActive === false;

    if (isSuspended) {
      throw new ForbiddenException({
        code: "USER_SUSPENDED",
        message:
          "حساب کاربری معلق شده است و دسترسی به سامانه مسدود می‌باشد (FR-035, AT-12)",
      });
    }

    // In Phase 1 mock/header auth, stage is passed in header or user payload
    const userStage = request.headers?.["x-user-stage"] || request.user?.stage;

    // Fail-closed authorization: Every guarded route requires a valid stage presented
    if (!userStage) {
      throw new UnauthorizedException("شناسایی هویت و سطح کاربری الزامی است");
    }

    if (!ALLOWED_STAGES.includes(userStage as Stage)) {
      throw new UnauthorizedException("سطح کاربری ارائه‌شده نامعتبر است");
    }

    const requiredStage = (this.reflector || new Reflector()).getAllAndOverride<
      "APPRENTICE" | "INTERN"
    >(REQUIRED_STAGE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredStage) {
      return true;
    }

    // Rule AT-02: Apprentices are blocked from research cases
    if (requiredStage === "INTERN" && userStage !== "INTERN") {
      throw new ForbiddenException(
        "دسترسی کارآموز به سامانه پژوهش مسدود است. ارتقا به وضعیت کارورز الزامی است (AT-02)",
      );
    }

    return true;
  }
}
