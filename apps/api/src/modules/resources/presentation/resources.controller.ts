import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
  ForbiddenException,
  forwardRef,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  CreateResourceDtoSchema,
  CreateInterviewDtoSchema,
  CreateInterviewReportDtoSchema,
  ResourceOrganizationDtoSchema,
  UpdateResourceDtoSchema,
  UpdateInterviewDtoSchema,
} from "@tstaff/contracts";
import { ResourcesService } from "../application/resources.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";
import { ResearchService } from "../../research/application/research.service.js";

@ApiTags("Resources & Interviews (منابع پژوهشی و مصاحبه‌ها)")
@Controller()
@UseGuards(StageGuard)
@RequireStage("INTERN")
export class ResourcesController {
  constructor(
    @Inject(ResourcesService)
    private readonly resourcesService: ResourcesService,
    @Inject(forwardRef(() => ResearchService))
    private readonly researchService: ResearchService,
  ) {}

  @Post("research-cases/:caseId/resources")
  @ApiOperation({ summary: "ثبت منبع پژوهشی جدید برای پرونده" })
  @ApiResponse({ status: 201, description: "منبع با موفقیت ثبت شد" })
  async createResource(@Param("caseId") caseId: string, @Body() body: unknown, @Req() request: any) {
    await this.researchService.assertOwnerCanEditStage(caseId, "SOURCES", request.user.id);
    const validated = CreateResourceDtoSchema.parse(body);
    const resource = await this.resourcesService.createResource(
      caseId,
      validated,
    );
    await this.researchService.markStageInProgress(caseId, "SOURCES", request.user.id);
    return resource.toJSON();
  }

  @Patch("resources/:resourceId")
  async updateResource(@Param("resourceId") resourceId: string, @Body() body: unknown, @Req() request: any) {
    const resource = await this.resourcesService.getResourceById(resourceId);
    await this.researchService.assertOwnerCanEditStage(resource.researchCaseId, "SOURCES", request.user.id);
    const updated = await this.resourcesService.updateResource(resourceId, UpdateResourceDtoSchema.parse(body));
    await this.researchService.markStageInProgress(resource.researchCaseId, "SOURCES", request.user.id);
    return updated.toJSON();
  }

  @Patch("resources/:resourceId/organization")
  async saveOrganization(@Param("resourceId") resourceId: string, @Body() body: unknown, @Req() request: any) {
    const resource = await this.resourcesService.getResourceById(resourceId);
    await this.researchService.assertOwnerCanEditStage(resource.researchCaseId, "SOURCES", request.user.id);
    const validated = ResourceOrganizationDtoSchema.parse(body);
    await this.resourcesService.saveOrganization(resourceId, validated);
    await this.researchService.markStageInProgress(resource.researchCaseId, "SOURCES", request.user.id);
    return { resourceId, saved: true };
  }

  @Get("research-cases/:caseId/resources")
  @ApiOperation({ summary: "فهرست منابع پژوهشی ثبت‌شده برای پرونده" })
  async getResources(@Param("caseId") caseId: string, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (!(await this.researchService.canUserAccessCase(caseId, request.user.id, roles))) throw new ForbiddenException("دسترسی به این پرونده مجاز نیست");
    const resources = await this.resourcesService.getResourcesByCaseId(caseId);
    return Promise.all(resources.map(async (resource) => {
      const interview = resource.interviewId ? await this.resourcesService.getInterviewById(resource.interviewId) : null;
      const reports = interview ? await this.resourcesService.getReportsByInterviewId(interview.id) : [];
      return {
        ...resource.toJSON(),
        hasInterview: !!interview,
        interview: interview ? { ...interview.toJSON(), hasReport: reports.length > 0, reportsCount: reports.length, latestReport: reports.at(-1)?.toJSON() ?? null } : null,
        organization: await this.resourcesService.getOrganizationByResourceId(resource.id),
      };
    }));
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
    @Req() request: any,
  ) {
    const resource = await this.resourcesService.getResourceById(resourceId);
    await this.researchService.assertOwnerCanEditStage(resource.researchCaseId, "SOURCES", request.user.id);
    const validated = CreateInterviewDtoSchema.parse(body);
    const interview = await this.resourcesService.createInterview(
      resourceId,
      validated,
    );
    await this.researchService.markStageInProgress(resource.researchCaseId, "SOURCES", request.user.id);
    return interview.toJSON();
  }

  @Patch("interviews/:interviewId")
  async updateInterview(@Param("interviewId") interviewId: string, @Body() body: unknown, @Req() request: any) {
    const interview = await this.resourcesService.getInterviewById(interviewId);
    if (!interview) throw new ForbiddenException("مصاحبه یافت نشد");
    const resource = await this.resourcesService.getResourceById(interview.resourceId);
    await this.researchService.assertOwnerCanEditStage(resource.researchCaseId, "SOURCES", request.user.id);
    const updated = await this.resourcesService.updateInterview(interviewId, UpdateInterviewDtoSchema.parse(body));
    await this.researchService.markStageInProgress(resource.researchCaseId, "SOURCES", request.user.id);
    return updated.toJSON();
  }

  @Get("resources/:resourceId/interview")
  @ApiOperation({ summary: "مشاهده مشخصات مصاحبه ثبت‌شده برای منبع" })
  async getInterview(@Param("resourceId") resourceId: string, @Req() request: any) {
    const resource = await this.resourcesService.getResourceById(resourceId);
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    if (!(await this.researchService.canUserAccessCase(resource.researchCaseId, request.user.id, roles))) throw new ForbiddenException("دسترسی به این مصاحبه مجاز نیست");
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
    @Req() request: any,
  ) {
    const interview = await this.resourcesService.getInterviewById(interviewId);
    if (!interview) throw new ForbiddenException("مصاحبه یافت نشد");
    const resource = await this.resourcesService.getResourceById(interview.resourceId);
    await this.researchService.assertOwnerCanEditStage(resource.researchCaseId, "SOURCES", request.user.id);
    const validated = CreateInterviewReportDtoSchema.parse(body);
    const report = await this.resourcesService.createReport(
      interviewId,
      validated,
      request.user.id,
    );
    await this.researchService.markStageInProgress(resource.researchCaseId, "SOURCES", request.user.id);
    return report.toJSON();
  }
}
