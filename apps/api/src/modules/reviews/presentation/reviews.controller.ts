import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import {
  CreateStageSubmissionDtoSchema,
  SubmitReviewDecisionDtoSchema,
} from "@tstaff/contracts";
import { ReviewsService } from "../application/reviews.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Reviews (داوری علمی و گزارش مراحل)")
@Controller()
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری (حداقل INTERN برای دسترسی به سامانه پژوهش)",
  required: true,
})
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
    @Headers("x-user-id") userId: string,
    @Body() body: unknown,
  ) {
    if (!userId) {
      throw new UnauthorizedException("شناسه کاربر الزامی است");
    }
    const validated = CreateStageSubmissionDtoSchema.parse(body);
    const submission = await this.reviewsService.submitStageReport(
      stageId,
      userId,
      validated,
    );
    return submission.toJSON();
  }

  @Get("stages/:stageId/submissions")
  @ApiOperation({ summary: "دریافت تاریخچه ارسال‌های یک مرحله" })
  async getStageSubmissions(@Param("stageId") stageId: string) {
    const list = await this.reviewsService.getSubmissionsForStage(stageId);
    return list.map((s) => s.toJSON());
  }

  @Get("submissions/:id")
  @ApiOperation({ summary: "مشاهده جزئیات یک ارسال مرحله" })
  async getSubmission(@Param("id") id: string) {
    const sub = await this.reviewsService.getSubmissionById(id);
    return sub.toJSON();
  }

  @Post("submissions/:id/review")
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
    @Headers("x-user-id") reviewerId: string,
    @Body() body: unknown,
  ) {
    if (!reviewerId) {
      throw new UnauthorizedException("شناسه کاربر داور الزامی است");
    }
    const validated = SubmitReviewDecisionDtoSchema.parse(body);
    const result = await this.reviewsService.submitReviewDecision(
      submissionId,
      reviewerId,
      validated,
    );
    return {
      submission: result.submission.toJSON(),
      decision: result.decision.toJSON(),
    };
  }
}

