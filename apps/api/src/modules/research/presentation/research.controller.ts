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
  CreateResearchCaseDtoSchema,
  AdvanceStageDtoSchema,
  RollbackStageDtoSchema,
  ReviewDecisionDtoSchema,
  StageTypeSchema,
} from "@tstaff/contracts";
import { ResearchService } from "../application/research.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Research (پرونده‌های پژوهش)")
@Controller("research-cases")
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description:
    "سطح کاربری (حداقل INTERN برای دسترسی به سامانه پژوهش - مسدود برای کارآموز AT-02)",
  required: true,
})
export class ResearchController {
  constructor(
    @Inject(ResearchService)
    private readonly researchService: ResearchService,
  ) {}

  @Post()
  @ApiOperation({ summary: "ایجاد پرونده پژوهشی جدید" })
  @ApiResponse({ status: 201, description: "پرونده با موفقیت ایجاد شد" })
  async createCase(@Body() body: unknown) {
    const validated = CreateResearchCaseDtoSchema.parse(body);
    const rCase = await this.researchService.createCase(validated);
    return rCase.toJSON();
  }

  @Get(":id")
  @ApiOperation({ summary: "مشاهده مشخصات و مراحل پرونده پژوهشی" })
  async getCase(@Param("id") id: string) {
    const rCase = await this.researchService.getCase(id);
    return rCase.toJSON();
  }

  @Get()
  @ApiOperation({
    summary:
      "فهرست پرونده‌های پژوهش (فقط برای کارورزان و مدیران - مسدود برای کارآموز AT-02)",
  })
  async listCases() {
    const cases = await this.researchService.listCases();
    return cases.map((c) => c.toJSON());
  }

  @Post(":id/advance-stage")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "پیشروی مرحله پرونده با بررسی نسخه همزمانی خوش‌بینانه CAS (D-02, AT-29)",
  })
  @ApiResponse({ status: 200, description: "مرحله با موفقیت پیشروی کرد" })
  @ApiResponse({
    status: 409,
    description: "تعارض نسخه داوری علمی (STALE_REVISION)",
  })
  async advanceStage(@Param("id") id: string, @Body() body: unknown) {
    const validated = AdvanceStageDtoSchema.parse(body);
    const rCase = await this.researchService.advanceStage(
      id,
      validated.expectedVersion,
    );
    return rCase.toJSON();
  }

  @Post(":id/rollback-stage")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "عقب‌گرد مرحله و تغییر وضعیت خودکار مراحل وابسته به REVIEW_REQUIRED (D-05, AT-33)",
  })
  async rollbackStage(@Param("id") id: string, @Body() body: unknown) {
    const validated = RollbackStageDtoSchema.parse(body);
    const rCase = await this.researchService.rollbackStage(id, validated);
    return rCase.toJSON();
  }

  @Post(":id/stages/:stageType/review")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ثبت تصمیم داوری علمی توسط مدیر اصلی یا همکار با بررسی CAS (D-02, D-03, AT-29)",
  })
  async reviewDecision(
    @Param("id") id: string,
    @Param("stageType") rawStageType: string,
    @Headers("x-user-id") userId: string | undefined,
    @Body() body: unknown,
  ) {
    const stageType = StageTypeSchema.parse(rawStageType);
    const validated = ReviewDecisionDtoSchema.parse(body);
    if (!userId) {
      throw new UnauthorizedException("شناسه کاربر ناظر (x-user-id) الزامی است");
    }
    const supervisorId = userId;

    const rCase = await this.researchService.reviewDecision(
      id,
      stageType,
      supervisorId,
      validated,
    );
    return rCase.toJSON();
  }
}
