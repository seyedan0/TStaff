import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  UseGuards,
  Req,
  ForbiddenException,
  forwardRef,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  CreateApplicantDtoSchema,
  ReviewApplicantDecisionDtoSchema,
  ApplicantReopenRequestDtoSchema,
} from "@tstaff/contracts";
import { ApplicantsService } from "../application/applicants.service.js";
import { RequireRoles, StageGuard } from "../../../platform/security/stage.guard.js";
import { OrganizationService } from "../../organization/application/organization.service.js";
import { ResourceBankService } from "../../resources/application/resource-bank.service.js";

@ApiTags("Applicants (پذیرش و ارزیابی متقاضیان)")
@Controller("applicants")
@UseGuards(StageGuard)
export class ApplicantsController {
  constructor(
    @Inject(ApplicantsService)
    private readonly applicantsService: ApplicantsService,
    @Optional() @Inject(OrganizationService)
    private readonly organizationService?: OrganizationService,
    @Optional() @Inject(forwardRef(() => ResourceBankService))
    private readonly resourceBankService?: ResourceBankService,
  ) {}

  @Post()
  @RequireRoles("PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN")
  @ApiOperation({
    summary: "ثبت پرونده پیش‌نویس متقاضی توسط مدیر استانی (FR-001, FR-056)",
  })
  @ApiResponse({
    status: 201,
    description: "پرونده متقاضی ایجاد شد (بدون ساخت حساب کاربر)",
  })
  async createApplicant(@Body() body: unknown, @Req() request: any) {
    const validated = CreateApplicantDtoSchema.parse(body);
    if (this.organizationService) {
      const provinces = await this.organizationService.provinces();
      if (!provinces.some((province) => province.id === validated.provinceId)) {
        throw new BadRequestException("استان انتخاب‌شده معتبر نیست");
      }
      const roles = this.roles(request);
      if (roles.includes("PROVINCIAL_DIRECTOR") && !roles.includes("SYSTEM_ADMIN")) {
        if (!(await this.organizationService.canAccessProvince(request.user.id, validated.provinceId))) {
          throw new ForbiddenException("استان متقاضی در قلمرو دسترسی شما نیست");
        }
      }
    }
    const applicant = await this.applicantsService.createDraft(validated, request.user.id);
    return applicant.toJSON();
  }

  @Post(":id/submit")
  @RequireRoles("PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "ارسال پرونده متقاضی برای داوری و ارزیابی علمی (FR-002)",
  })
  async submitForReview(@Param("id") id: string, @Req() request: any) {
    await this.assertProvincialScope(id, request);
    const applicant = await this.applicantsService.submitForReview(id);
    return applicant.toJSON();
  }

  @Post(":id/decisions")
  @RequireRoles("SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "ثبت تصمیم ارزیابی علمی: تأیید یا رد متقاضی (FR-002, AT-01)",
  })
  async reviewDecision(@Param("id") id: string, @Req() request: any, @Body() body: unknown) {
    const validated = ReviewApplicantDecisionDtoSchema.parse(body);
    const applicant = await this.applicantsService.reviewDecision(
      id,
      validated,
      (request.user.roles ?? [request.user.role]).includes("SYSTEM_ADMIN") ? undefined : request.user.id,
    );
    return applicant.toJSON();
  }

  @Post(":id/reopen")
  @RequireRoles("PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "درخواست بازگشایی پرونده متقاضی ردشده (FR-033)" })
  async requestReopen(@Param("id") id: string, @Req() request: any, @Body() body: unknown) {
    await this.assertProvincialScope(id, request);
    const validated = ApplicantReopenRequestDtoSchema.parse(body);
    const applicant = await this.applicantsService.requestReopen(
      id,
      validated.reason,
    );
    return applicant.toJSON();
  }

  @Get(":id")
  @RequireRoles("PROVINCIAL_DIRECTOR", "SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  @ApiOperation({ summary: "مشاهده مشخصات پرونده متقاضی" })
  async getApplicant(@Param("id") id: string, @Req() request: any) {
    const applicant = await this.applicantsService.getById(id);
    const roles = this.roles(request);
    if (!roles.includes("SYSTEM_ADMIN")) {
      if (roles.includes("SCIENTIFIC_SUPERVISOR") && !roles.includes("PROVINCIAL_DIRECTOR")) {
        if (applicant.initialSupervisorId !== request.user.id) {
          throw new ForbiddenException("این متقاضی به مدیر علمی دیگری ارجاع شده است");
        }
      } else if (roles.includes("PROVINCIAL_DIRECTOR")) {
        const hasProvince = await this.organizationService?.canAccessProvince(request.user.id, applicant.provinceId ?? null);
        const hasReferral = await this.resourceBankService?.canReadApplicant(request.user.id, applicant.id);
        const sameSupervisor = roles.includes("SCIENTIFIC_SUPERVISOR") && applicant.initialSupervisorId === request.user.id;
        if (!hasProvince && !hasReferral && !sameSupervisor) {
          throw new ForbiddenException("این متقاضی در قلمرو استانی شما نیست");
        }
      }
    }
    return applicant.toJSON();
  }

  @Get()
  @RequireRoles("PROVINCIAL_DIRECTOR", "SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  @ApiOperation({
    summary: "فهرست متقاضیان با امکان فیلتر بر اساس استان و وضعیت",
  })
  async listApplicants(
    @Req() request: any,
    @Query("provinceId") provinceId?: string,
    @Query("status") status?: string,
  ) {
    const roles = this.roles(request);
    if (provinceId && roles.includes("PROVINCIAL_DIRECTOR") && !roles.includes("SYSTEM_ADMIN") && this.organizationService) {
      if (!(await this.organizationService.canAccessProvince(request.user.id, provinceId))) {
        throw new ForbiddenException("این استان در قلمرو دسترسی شما نیست");
      }
    }
    const supervisorFilter = roles.includes("SCIENTIFIC_SUPERVISOR") && !roles.includes("SYSTEM_ADMIN") && !roles.includes("PROVINCIAL_DIRECTOR")
      ? request.user.id
      : undefined;
    const applicants = await this.applicantsService.list({
      provinceId,
      status,
    }, supervisorFilter);
    if (roles.includes("SYSTEM_ADMIN") || !roles.includes("PROVINCIAL_DIRECTOR") || !this.organizationService) {
      return applicants.map((a) => a.toJSON());
    }
    const allowedProvinces = new Set(await this.organizationService.provinceIds(request.user.id));
    const filtered = await Promise.all(applicants.map(async (applicant) => {
      if (applicant.provinceId && allowedProvinces.has(applicant.provinceId)) return applicant;
      if (await this.resourceBankService?.canReadApplicant(request.user.id, applicant.id)) return applicant;
      if (roles.includes("SCIENTIFIC_SUPERVISOR") && applicant.initialSupervisorId === request.user.id) return applicant;
      return null;
    }));
    return filtered.filter((item): item is NonNullable<typeof item> => item !== null).map((a) => a.toJSON());
  }

  private roles(request: any): string[] {
    return request.user.roles ?? (request.user.role ? [request.user.role] : []);
  }

  private async assertProvincialScope(applicantId: string, request: any) {
    const roles = this.roles(request);
    if (roles.includes("SYSTEM_ADMIN") || !roles.includes("PROVINCIAL_DIRECTOR") || !this.organizationService) return;
    const applicant = await this.applicantsService.getById(applicantId);
    const hasProvince = await this.organizationService.canAccessProvince(request.user.id, applicant.provinceId ?? null);
    const hasReferral = await this.resourceBankService?.canReadApplicant(request.user.id, applicant.id);
    if (!hasProvince && !hasReferral) {
      throw new ForbiddenException("این متقاضی در قلمرو استانی شما نیست");
    }
  }
}
