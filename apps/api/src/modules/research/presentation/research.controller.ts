import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  CreateResearchCaseDtoSchema,
  RollbackStageDtoSchema,
  ReviewDecisionDtoSchema,
  StageTypeSchema,
} from "@tstaff/contracts";
import { ResearchService } from "../application/research.service.js";
import {
  StageGuard,
  RequireStage,
  RequireRoles,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Research (پرونده‌های پژوهش)")
@Controller("research-cases")
@UseGuards(StageGuard)
@RequireStage("INTERN")
export class ResearchController {
  constructor(
    @Inject(ResearchService)
    private readonly researchService: ResearchService,
  ) {}

  @Post()
  @ApiOperation({ summary: "ایجاد پرونده پژوهشی جدید" })
  @ApiResponse({ status: 201, description: "پرونده با موفقیت ایجاد شد" })
  @RequireRoles("SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  async createCase(@Body() body: unknown, @Req() request: any) {
    const validated = CreateResearchCaseDtoSchema.parse(body);
    if (!validated.researcherId || !(await this.researchService.isResearchEligibleUser(validated.researcherId))) {
      throw new ForbiddenException("پرونده پژوهشی فقط برای کارورز فعال ایجاد می‌شود (AT-02)");
    }
    if (!validated.researcherId || !(await this.researchService.isSupervisorAssignedToUser(validated.researcherId, request.user.id))) {
      throw new UnauthorizedException("فقط مدیر علمی منتسب می‌تواند برای این کارورز پژوهش ایجاد کند");
    }
    const rCase = await this.researchService.createCase(validated);
    return rCase.toJSON();
  }

  @Get(":id")
  @ApiOperation({ summary: "مشاهده مشخصات و مراحل پرونده پژوهشی" })
  async getCase(@Param("id") id: string, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (!(await this.researchService.canUserAccessCase(id, request.user.id, roles))) {
      throw new ForbiddenException("این پرونده خارج از قلمرو دسترسی شماست");
    }
    const rCase = await this.researchService.getCase(id);
    return rCase.toJSON();
  }

  @Get()
  @ApiOperation({
    summary:
      "فهرست پرونده‌های پژوهش (فقط برای کارورزان و مدیران - مسدود برای کارآموز AT-02)",
  })
  async listCases(@Req() request: any, @Query("researcherId") researcherId?: string) {
    const cases = await this.researchService.listCases();
    const roles: string[] = request.user?.roles ?? (request.user?.role ? [request.user.role] : []);
    if (roles.includes("SCIENTIFIC_SUPERVISOR")) {
      if (researcherId && !(await this.researchService.isSupervisorAssignedToUser(researcherId, request.user.id))) {
        throw new ForbiddenException("این کارورز به شما منتسب نشده است");
      }
      const users = await this.researchService.getAssignedUserIds(request.user.id);
      return cases.filter((c) => users.includes(c.researcherId ?? "") && (!researcherId || c.researcherId === researcherId)).map((c) => c.toJSON());
    }
    if (request.user?.stage === "INTERN" && !roles.some((role) => ["SYSTEM_ADMIN", "TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR"].includes(role))) {
      return cases.filter((c) => c.researcherId === request.user.id).map((c) => c.toJSON());
    }
    if (researcherId) return cases.filter((c) => c.researcherId === researcherId).map((c) => c.toJSON());
    return cases.map((c) => c.toJSON());
  }

  @Post(":id/rollback-stage")
  @RequireRoles("SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "عقب‌گرد مرحله و تغییر وضعیت خودکار مراحل وابسته به REVIEW_REQUIRED (D-05, AT-33)",
  })
  async rollbackStage(@Param("id") id: string, @Body() body: unknown, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (!(await this.researchService.canUserAccessCase(id, request.user.id, roles))) {
      throw new ForbiddenException("این پرونده خارج از قلمرو دسترسی شماست");
    }
    const validated = RollbackStageDtoSchema.parse(body);
    const rCase = await this.researchService.rollbackStage(id, validated);
    return rCase.toJSON();
  }

  @Post(":id/resources/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "اتمام منابع و ارسال مجموعه برای داوری علمی (FR-015, FR-034, AT-04)" })
  async submitSourcesForReview(@Param("id") id: string, @Req() request: any, @Body() body: unknown) {
    const expectedVersion = RollbackStageDtoSchema.shape.expectedVersion.parse((body as { expectedVersion?: unknown })?.expectedVersion);
    const result = await this.researchService.submitSourcesForReview(id, request.user.id, expectedVersion);
    return result.toJSON();
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
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const roles: string[] = request.user?.roles ?? (request.user?.role ? [request.user.role] : []);
    if (!roles.some((role) => ["SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN"].includes(role))) {
      throw new ForbiddenException("فقط مدیر علمی می‌تواند تصمیم داوری ثبت کند");
    }
    const stageType = StageTypeSchema.parse(rawStageType);
    if (stageType !== "SOURCES") {
      throw new ForbiddenException("داوری تبیین، تجویز و سناریو فقط از روی ارسال همان مرحله مجاز است");
    }
    const validated = ReviewDecisionDtoSchema.parse(body);
    const supervisorId = request.user?.id as string | undefined;
    if (!supervisorId) throw new UnauthorizedException("نشست معتبر مدیر علمی الزامی است");

    const rCase = await this.researchService.reviewDecision(
      id,
      stageType,
      supervisorId,
      validated,
    );
    return rCase.toJSON();
  }
}
