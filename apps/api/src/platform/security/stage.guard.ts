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
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredStage = this.reflector.getAllAndOverride<
      "APPRENTICE" | "INTERN"
    >(REQUIRED_STAGE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredStage) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // In Phase 1 mock/header auth, stage is passed in header or user payload
    const userStage = request.headers["x-user-stage"] || request.user?.stage;

    // Fail-closed authorization: must have a valid stage presented
    if (!userStage) {
      throw new UnauthorizedException("شناسایی هویت و سطح کاربری الزامی است");
    }

    if (!ALLOWED_STAGES.includes(userStage as Stage)) {
      throw new UnauthorizedException("سطح کاربری ارائه‌شده نامعتبر است");
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
