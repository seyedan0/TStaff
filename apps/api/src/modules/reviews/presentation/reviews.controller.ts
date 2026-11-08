import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  CreateStageSubmissionDtoSchema,
  SubmitReviewDecisionDtoSchema,
} from "@tstaff/contracts";
import { ReviewsService } from "../application/reviews.service.js";
import {
  StageGuard,
  RequireStage,
  RequireRoles,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Reviews (داوری علمی و گزارش مراحل)")
@Controller()
@UseGuards(StageGuard)
@RequireStage("INTERN")
export class ReviewsController {
  constructor(
    @Inject(ReviewsService)
    private readonly reviewsService: ReviewsService,
  ) {}

  @Post("stages/:stageId/submissions")
  @ApiOperation({
    summary: "ارسال گزارش مرحله (تبیین، تجویز) جهت بررسی و داوری (FR-016, FR-019)",
  })
  @ApiResponse({ status: 201, description: "گزارش با موفقیت ثبت شد" })
  async submitStageReport(
    @Param("stageId") stageId: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = CreateStageSubmissionDtoSchema.parse(body);
    const submission = await this.reviewsService.submitStageReport(
      stageId,
      request.user.id,
      validated,
    );
    return submission.toJSON();
  }

  @Get("stages/:stageId/submissions")
  @ApiOperation({ summary: "دریافت تاریخچه ارسال‌های یک مرحله" })
  async getStageSubmissions(@Param("stageId") stageId: string, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    await this.reviewsService.assertCanAccessStage(stageId, request.user.id, roles);
    const list = await this.reviewsService.getSubmissionsForStage(stageId);
    return list.map((s) => s.toJSON());
  }

  @Get("submissions/:id")
  @ApiOperation({ summary: "مشاهده جزئیات یک ارسال مرحله" })
  async getSubmission(@Param("id") id: string, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    await this.reviewsService.assertCanAccessSubmission(id, request.user.id, roles);
    const sub = await this.reviewsService.getSubmissionById(id);
    return sub.toJSON();
  }

  @Post("submissions/:id/review")
  @RequireRoles("SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ثبت تصمیم داوری علمی با کنترل همزمانی خوش‌بینانه CAS (D-02, D-03, FR-057, AT-29)",
  })
  @ApiResponse({ status: 200, description: "تصمیم داوری با موفقیت ثبت شد" })
  @ApiResponse({
    status: 409,
    description: "تعارض نسخه داوری علمی (STALE_REVISION)",
  })
  async submitReviewDecision(
    @Param("id") submissionId: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = SubmitReviewDecisionDtoSchema.parse(body);
    const result = await this.reviewsService.submitReviewDecision(
      submissionId,
      request.user.id,
      validated,
    );
    return {
      submission: result.submission.toJSON(),
      decision: result.decision.toJSON(),
    };
  }

  @Get("scientific-supervisors/me/reviews")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  async getSupervisorWorklist(@Req() request: any) {
    return this.reviewsService.getPendingReviewWorklist(request.user.id);
  }
}

