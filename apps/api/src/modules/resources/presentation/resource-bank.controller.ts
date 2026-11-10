import { Body, Controller, Delete, ForbiddenException, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { CreateApplicantDtoSchema, CreateResourceReferralDtoSchema, ResourceBankQuerySchema, z } from "@tstaff/contracts";
import { ResourceBankService, type BankActor } from "../application/resource-bank.service.js";
import { RequireRoles, StageGuard } from "../../../platform/security/stage.guard.js";
import { IdentityService } from "../../identity/application/identity.service.js";

@Controller("resource-bank")
@UseGuards(StageGuard)
@RequireRoles("TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR")
export class ResourceBankController {
  constructor(@Inject(ResourceBankService) private readonly bank: ResourceBankService, private readonly modules: ModuleRef) {}
  @Get() list(@Query() query: unknown, @Req() request: any) { return this.bank.list(this.actor(request), ResourceBankQuerySchema.parse(query)); }
  @Get(":id") get(@Param("id") id: string, @Req() request: any) { return this.bank.get(z.string().uuid().parse(id), this.actor(request)); }
  @Post(":id/referrals") @RequireRoles("TRACKING_DIRECTOR")
  async refer(@Param("id") id: string, @Body() body: unknown, @Req() request: any) {
    const dto = CreateResourceReferralDtoSchema.parse(body);
    const manager = await this.modules.get(IdentityService, { strict: false }).getById(dto.recipientId);
    const info = manager.toJSON();
    if (!manager.isActive || !(info.roles ?? [info.role]).includes("PROVINCIAL_DIRECTOR")) throw new ForbiddenException("مدیر مقصد باید مدیر استانی فعال باشد");
    return this.bank.refer(z.string().uuid().parse(id), dto.recipientId, this.actor(request), dto.notes);
  }
  @Delete("referrals/:id") @RequireRoles("TRACKING_DIRECTOR")
  revoke(@Param("id") id: string, @Req() request: any) { return this.bank.revokeReferral(z.string().uuid().parse(id), this.actor(request)); }
  @Post(":id/applicants") @RequireRoles("PROVINCIAL_DIRECTOR")
  applicant(@Param("id") id: string, @Body() body: unknown, @Req() request: any) { return this.bank.createApplicant(z.string().uuid().parse(id), CreateApplicantDtoSchema.parse(body), this.actor(request)); }
  private actor(request: any): BankActor { return { id: request.user.id, roles: request.user.roles ?? [request.user.role] }; }
}
