import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  CreateApplicantDtoSchema,
  ReviewApplicantDecisionDtoSchema,
  ApplicantReopenRequestDtoSchema,
} from "@tstaff/contracts";
import { ApplicantsService } from "../application/applicants.service.js";

@ApiTags("Applicants (پذیرش و ارزیابی متقاضیان)")
@Controller("applicants")
export class ApplicantsController {
  constructor(private readonly applicantsService: ApplicantsService) {}

  @Post()
  @ApiOperation({
    summary: "ثبت پرونده پیش‌نویس متقاضی توسط مدیر استانی (FR-001, FR-056)",
  })
  @ApiResponse({
    status: 201,
    description: "پرونده متقاضی ایجاد شد (بدون ساخت حساب کاربر)",
  })
  async createApplicant(@Body() body: unknown) {
    const validated = CreateApplicantDtoSchema.parse(body);
    const applicant = await this.applicantsService.createDraft(validated);
    return applicant.toJSON();
  }

  @Post(":id/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "ارسال پرونده متقاضی برای داوری و ارزیابی علمی (FR-002)",
  })
  async submitForReview(@Param("id") id: string) {
    const applicant = await this.applicantsService.submitForReview(id);
    return applicant.toJSON();
  }

  @Post(":id/decisions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "ثبت تصمیم ارزیابی علمی: تأیید یا رد متقاضی (FR-002, AT-01)",
  })
  async reviewDecision(@Param("id") id: string, @Body() body: unknown) {
    const validated = ReviewApplicantDecisionDtoSchema.parse(body);
    const applicant = await this.applicantsService.reviewDecision(
      id,
      validated,
    );
    return applicant.toJSON();
  }

  @Post(":id/reopen")
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
  @ApiOperation({ summary: "مشاهده مشخصات پرونده متقاضی" })
  async getApplicant(@Param("id") id: string) {
    const applicant = await this.applicantsService.getById(id);
    return applicant.toJSON();
  }

  @Get()
  @ApiOperation({
    summary: "فهرست متقاضیان با امکان فیلتر بر اساس استان و وضعیت",
  })
  async listApplicants(
    @Query("provinceId") provinceId?: string,
    @Query("status") status?: string,
  ) {
    const applicants = await this.applicantsService.list({
      provinceId,
      status,
    });
    return applicants.map((a) => a.toJSON());
  }
}
