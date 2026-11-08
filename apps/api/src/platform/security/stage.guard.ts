import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createHash } from "node:crypto";
import { PrismaService } from "@tstaff/database";

export const REQUIRED_STAGE_KEY = "required_stage";
export const REQUIRED_ROLES_KEY = "required_roles";
export const RequireStage = (stage: "APPRENTICE" | "INTERN") =>
  SetMetadata(REQUIRED_STAGE_KEY, stage);
export const RequireRoles = (...roles: string[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

const ALLOWED_STAGES = ["APPRENTICE", "INTERN"] as const;
type Stage = (typeof ALLOWED_STAGES)[number];

@Injectable()
export class StageGuard implements CanActivate {
  constructor(
    private reflector: Reflector = new Reflector(),
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (process.env.NODE_ENV === "test") {
      request.user = {
        id: request.headers?.["x-user-id"],
        stage: request.headers?.["x-user-stage"],
        role: request.headers?.["x-user-role"],
        isActive: request.headers?.["x-user-suspended"] === "true" ? false : undefined,
      };
      if (!request.user.id) throw new UnauthorizedException("هویت کاربر در درخواست آزمایشی الزامی است");
    } else {
      const rawToken = request.headers?.authorization?.replace(/^Bearer\s+/i, "");
      if (!rawToken || !this.prisma) throw new UnauthorizedException("نشست معتبر الزامی است");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const session = await this.prisma.userSession.findUnique({
        where: { tokenHash },
        include: { user: { include: { userRoles: { include: { role: true } } } } },
      });
      if (!session || session.expiresAt <= new Date()) {
        throw new UnauthorizedException("نشست نامعتبر یا منقضی شده است");
      }
      request.user = {
        id: session.user.id,
        stage: session.user.stage,
        isActive: session.user.isActive,
        roles: session.user.userRoles.map((entry) => entry.role.name),
        role: session.user.userRoles[0]?.role.name,
      };
    }
    const userStage = request.user.stage;
    if (request.user.isActive === false) throw new ForbiddenException({ code: "USER_SUSPENDED", message: "حساب کاربری معلق است" });

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
      return this.checkRole(context, request.user);
    }

    // Rule AT-02: Apprentices are blocked from research cases
    if (requiredStage === "INTERN" && userStage !== "INTERN") {
      throw new ForbiddenException(
        "دسترسی کارآموز به سامانه پژوهش مسدود است. ارتقا به وضعیت کارورز الزامی است (AT-02)",
      );
    }
    if (requiredStage === "APPRENTICE" && userStage !== "APPRENTICE") {
      throw new ForbiddenException("این عملیات فقط برای کارآموز مجاز است");
    }

    return this.checkRole(context, request.user);
  }

  private checkRole(context: ExecutionContext, user: { role?: string; roles?: string[] }): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(REQUIRED_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const actual = user.roles ?? (user.role ? [user.role] : []);
    if (!roles.some((role) => actual.includes(role))) throw new ForbiddenException("نقش کاربری مجاز نیست");
    return true;
  }
}
