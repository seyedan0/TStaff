import { Body, Controller, Delete, ForbiddenException, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ProvinceScopeDtoSchema, UserManagerGrantDtoSchema } from "@tstaff/contracts";
import { OrganizationService } from "../application/organization.service.js";
import { RequireRoles, StageGuard } from "../../../platform/security/stage.guard.js";
import { IdentityService } from "../../identity/application/identity.service.js";

@Controller("organization")
@UseGuards(StageGuard)
export class OrganizationController {
  constructor(@Inject(OrganizationService) private readonly organization: OrganizationService, @Inject(ModuleRef) private readonly modules: ModuleRef) {}
  @Get("provinces") provinces() { return this.organization.provinces(); }
  @Get("scopes") @RequireRoles("TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR")
  scopes(@Req() request: any) {
    return this.organization.scopes(this.roles(request).includes("TRACKING_DIRECTOR") ? undefined : request.user.id);
  }
  @Post("provincial-scopes") @RequireRoles("TRACKING_DIRECTOR")
  async assignProvince(@Body() body: unknown, @Req() request: any) {
    const dto = ProvinceScopeDtoSchema.parse(body);
    await this.assertManager(dto.managerId, "PROVINCIAL_DIRECTOR");
    await this.organization.setProvinceScope(dto.managerId, dto.provinceId, request.user.id, true);
    return { status: "ASSIGNED" };
  }
  @Delete("provincial-scopes/:managerId/:provinceId") @RequireRoles("TRACKING_DIRECTOR")
  async revokeProvince(@Param() params: unknown, @Req() request: any) {
    const dto = ProvinceScopeDtoSchema.parse(params);
    await this.organization.setProvinceScope(dto.managerId, dto.provinceId, request.user.id, false);
    return { status: "REVOKED" };
  }
  @Get("user-grants") @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  userGrants() {
    return this.organization.userGrants();
  }
  @Post("user-grants") @RequireRoles("TRACKING_DIRECTOR")
  async grantUser(@Body() body: unknown, @Req() request: any) {
    const dto = UserManagerGrantDtoSchema.parse(body);
    await this.assertManager(dto.managerId);
    await this.modules.get(IdentityService, { strict: false }).getById(dto.userId);
    await this.organization.setUserGrant(dto.managerId, dto.userId, request.user.id, true);
    return { status: "ASSIGNED" };
  }
  @Delete("user-grants/:managerId/:userId") @RequireRoles("TRACKING_DIRECTOR")
  async revokeUser(@Param() params: unknown, @Req() request: any) {
    const dto = UserManagerGrantDtoSchema.parse(params);
    await this.organization.setUserGrant(dto.managerId, dto.userId, request.user.id, false);
    return { status: "REVOKED" };
  }
  private roles(request: any): string[] { return request.user.roles ?? [request.user.role]; }
  private async assertManager(id: string, requiredRole?: string) {
    const user = await this.modules.get(IdentityService, { strict: false }).getById(id);
    const data = user.toJSON();
    const roles = data.roles ?? (data.role ? [data.role] : []);
    if (!user.isActive || (requiredRole ? !roles.includes(requiredRole) : !roles.some((role) => ["PROVINCIAL_DIRECTOR", "TRACKING_DIRECTOR", "SUPPORT_DIRECTOR", "SCIENTIFIC_SUPERVISOR"].includes(role)))) throw new ForbiddenException("مدیر مقصد مجاز نیست");
  }
}
