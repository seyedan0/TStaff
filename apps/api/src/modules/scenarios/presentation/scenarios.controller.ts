import {
  Controller,
  Get,
  Post,
  Patch,
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
  CreateScenarioDtoSchema,
  UpdateScenarioDtoSchema,
  SubmitScenarioDtoSchema,
  ReviewScenarioDtoSchema,
  ScenarioBankQuerySchema,
} from "@tstaff/contracts";
import { ScenariosService } from "../application/scenarios.service.js";
import {
  StageGuard,
  RequireStage,
  RequireRoles,
} from "../../../platform/security/stage.guard.js";
import { ResearchService } from "../../research/application/research.service.js";

@ApiTags("Scenarios (سناریوها و بانک داخلی)")
@Controller()
@UseGuards(StageGuard)
@RequireStage("INTERN")
export class ScenariosController {
  constructor(
    @Inject(ScenariosService)
    private readonly scenariosService: ScenariosService,
    @Inject(ResearchService)
    private readonly researchService: ResearchService,
  ) {}

  @Post("research-cases/:caseId/scenarios")
  @ApiOperation({
    summary: "ایجاد پیش‌نویس سناریوی جدید برای پرونده پژوهشی (FR-021, AT-08)",
  })
  @ApiResponse({ status: 201, description: "سناریو با موفقیت ایجاد شد" })
  async createScenario(
    @Param("caseId") caseId: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = CreateScenarioDtoSchema.parse(body);
    const scenario = await this.scenariosService.createScenario(
      caseId,
      request.user.id,
      validated,
    );
    return scenario.toJSON();
  }

  @Get("research-cases/:caseId/scenarios")
  @ApiOperation({ summary: "دریافت لیست سناریوهای یک پرونده پژوهشی" })
  async getScenariosForCase(@Param("caseId") caseId: string, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (!(await this.researchService.canUserAccessCase(caseId, request.user.id, roles))) throw new ForbiddenException("دسترسی به این پرونده مجاز نیست");
    const list = await this.scenariosService.getScenariosByCaseId(caseId);
    return list.map((s) => s.toJSON());
  }

  @Get("scenarios/bank")
  @ApiOperation({
    summary:
      "مشاهده بانک سناریوهای تأییدشده داخلی (FR-023, FR-040, AT-16 - فاقد اکسپلور عمومی طبق مرزهای MVP)",
  })
  async getInternalBank(@Query() query: unknown) {
    const validated = ScenarioBankQuerySchema.parse(query);
    const list = await this.scenariosService.getInternalBank(validated);
    return list.map((s) => s.toJSON());
  }

  @Get("scientific-supervisors/me/scenarios")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  async getPendingScenarios(@Req() request: any) {
    return this.scenariosService.getPendingForSupervisor(request.user.id);
  }

  @Get("scenarios/:id")
  @ApiOperation({ summary: "مشاهده جزئیات یک سناریو" })
  async getScenario(@Param("id") id: string, @Req() request: any) {
    const scenario = await this.scenariosService.getScenarioById(id);
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (!(await this.researchService.canUserAccessCase(scenario.researchCaseId, request.user.id, roles))) throw new ForbiddenException("دسترسی به این سناریو مجاز نیست");
    return scenario.toJSON();
  }

  @Patch("scenarios/:id")
  @ApiOperation({ summary: "ویرایش اطلاعات سناریو پیش از تأیید نهایی" })
  async updateScenario(
    @Param("id") id: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = UpdateScenarioDtoSchema.parse(body);
    const updated = await this.scenariosService.updateScenario(id, request.user.id, validated);
    return updated.toJSON();
  }

  @Post("scenarios/:id/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "ارسال سناریو به وضعیت در حال داوری (UNDER_REVIEW)" })
  async submitForReview(
    @Param("id") id: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = SubmitScenarioDtoSchema.parse(body);
    const updated = await this.scenariosService.submitScenarioForReview(
      id,
      request.user.id,
      validated.expectedVersion,
    );
    return updated.toJSON();
  }

  @Post("scenarios/:id/review")
  @RequireRoles("SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "داوری علمی سناریو و انتشار در بانک داخلی (FR-040, AT-16 - مسدود در صورت وضعیت REVIEW_REQUIRED در پیش‌نیازها D-05, AT-33)",
  })
  @ApiResponse({
    status: 200,
    description: "سناریو تأیید و وارد بانک داخلی سناریوها شد",
  })
  @ApiResponse({
    status: 409,
    description: "مراحل پیش‌نیاز نیازمند بازبینی هستند (D-05)",
  })
  async reviewScenario(
    @Param("id") id: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = ReviewScenarioDtoSchema.parse(body);
    const updated = await this.scenariosService.reviewScenario(
      id,
      request.user.id,
      validated,
    );
    return updated.toJSON();
  }
}

