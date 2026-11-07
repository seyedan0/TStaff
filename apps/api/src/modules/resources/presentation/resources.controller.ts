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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import {
  CreateResourceDtoSchema,
  CreateInterviewDtoSchema,
  CreateInterviewReportDtoSchema,
} from "@tstaff/contracts";
import { ResourcesService } from "../application/resources.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Resources & Interviews (منابع پژوهشی و مصاحبه‌ها)")
@Controller()
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری (حداقل INTERN برای دسترسی به سامانه پژوهش AT-02)",
  required: true,
})
export class ResourcesController {
  constructor(
    @Inject(ResourcesService)
    private readonly resourcesService: ResourcesService,
  ) {}

  @Post("research-cases/:caseId/resources")
  @ApiOperation({ summary: "ثبت منبع پژوهشی جدید برای پرونده" })
  @ApiResponse({ status: 201, description: "منبع با موفقیت ثبت شد" })
  async createResource(@Param("caseId") caseId: string, @Body() body: unknown) {
    const validated = CreateResourceDtoSchema.parse(body);
    const resource = await this.resourcesService.createResource(
      caseId,
      validated,
    );
    return resource.toJSON();
  }

  @Get("research-cases/:caseId/resources")
  @ApiOperation({ summary: "فهرست منابع پژوهشی ثبت‌شده برای پرونده" })
  async getResources(@Param("caseId") caseId: string) {
    const resources = await this.resourcesService.getResourcesByCaseId(caseId);
    return resources.map((r) => r.toJSON());
  }

  @Post("resources/:resourceId/interview")
  @ApiOperation({
    summary:
      "ثبت مصاحبه برای منبع پژوهشی (D-07, AT-30: حداکثر ۱ مصاحبه به ازای هر منبع)",
  })
  @ApiResponse({ status: 201, description: "مصاحبه با موفقیت ثبت شد" })
  @ApiResponse({
    status: 409,
    description: "برای این منبع قبلاً مصاحبه ثبت شده است (D-07)",
  })
  async createInterview(
    @Param("resourceId") resourceId: string,
    @Body() body: unknown,
  ) {
    const validated = CreateInterviewDtoSchema.parse(body);
    const interview = await this.resourcesService.createInterview(
      resourceId,
      validated,
    );
    return interview.toJSON();
  }

  @Get("resources/:resourceId/interview")
  @ApiOperation({ summary: "مشاهده مشخصات مصاحبه ثبت‌شده برای منبع" })
  async getInterview(@Param("resourceId") resourceId: string) {
    const interview =
      await this.resourcesService.getInterviewByResourceId(resourceId);
    return interview ? interview.toJSON() : null;
  }

  @Post("interviews/:interviewId/reports")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "ثبت گزارش مکتوب نسخه‌دار برای مصاحبه (D-07, FR-058)",
  })
  async createReport(
    @Param("interviewId") interviewId: string,
    @Body() body: unknown,
  ) {
    const validated = CreateInterviewReportDtoSchema.parse(body);
    const report = await this.resourcesService.createReport(
      interviewId,
      validated,
    );
    return report.toJSON();
  }
}
