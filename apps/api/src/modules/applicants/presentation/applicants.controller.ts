import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  CreateApplicantDtoSchema,
  ReviewApplicantDecisionDtoSchema,
  ApplicantReopenRequestDtoSchema,
} from "@tstaff/contracts";
import { ApplicantsService } from "../application/applicants.service.js";
import { RequireRoles, StageGuard } from "../../../platform/security/stage.guard.js";

@ApiTags("Applicants (پذیرش و ارزیابی متقاضیان)")
@Controller("applicants")
@UseGuards(StageGuard)
export class ApplicantsController {
  constructor(
    @Inject(ApplicantsService)
    private readonly applicantsService: ApplicantsService,
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
    const applicant = await this.applicantsService.createDraft(validated, request.user.id);
    return applicant.toJSON();
  }

  @Post(":id/submit")
  @RequireRoles("PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "ارسال پرونده متقاضی برای داوری و ارزیابی علمی (FR-002)",
  })
  async submitForReview(@Param("id") id: string) {
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
  async requestReopen(@Param("id") id: string, @Body() body: unknown) {
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
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (roles.includes("SCIENTIFIC_SUPERVISOR") && !roles.includes("SYSTEM_ADMIN") && applicant.initialSupervisorId !== request.user.id) {
      throw new ForbiddenException("این متقاضی به مدیر علمی دیگری ارجاع شده است");
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
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    const applicants = await this.applicantsService.list({
      provinceId,
      status,
    }, roles.includes("SCIENTIFIC_SUPERVISOR") && !roles.includes("SYSTEM_ADMIN") ? request.user.id : undefined);
    return applicants.map((a) => a.toJSON());
  }
}
