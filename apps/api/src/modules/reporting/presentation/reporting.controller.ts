import {
  Controller,
  Get,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { ReportingService } from "../application/reporting.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Reporting (داشبوردهای گزارش‌گیری و نظارت مدیریتی)")
@Controller("reporting")
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی (INTERN)",
  required: true,
})
export class ReportingController {
  constructor(
    @Inject(ReportingService)
    private readonly reportingService: ReportingService,
  ) {}

  @Get("provincial-director")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "داشبورد شاخص‌های مدیر استانی (آمار متقاضیان، کارآموزان و پرونده‌ها FR-026, AT-09)",
  })
  @ApiResponse({
    status: 200,
    description: "شاخص‌های مدیر استانی با موفقیت بازگردانده شد",
  })
  async getProvincialDirectorMetrics(@Query("provinceId") provinceId?: string) {
    return this.reportingService.getProvincialDirectorMetrics(provinceId);
  }

  @Get("supervisor-worklist")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "کارتابل وظایف معوق و پرونده‌های تحت هدایت مدیر علمی (FR-027, AT-11)",
  })
  @ApiResponse({
    status: 200,
    description: "کارتابل مدیر علمی با موفقیت بازگردانده شد",
  })
  async getSupervisorWorklist(
    @Headers("x-user-id") headerUserId: string | undefined,
    @Query("supervisorId") querySupervisorId: string | undefined,
  ) {
    const supervisorId = querySupervisorId || headerUserId;
    if (!supervisorId) {
      throw new BadRequestException("شناسه مدیر علمی الزامی است");
    }
    return this.reportingService.getSupervisorWorklist(supervisorId);
  }

  @Get("tracking-director-backlog")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "گزارش صف پرونده‌های معطل، بدون مدیر یا نیازمند بازبینی مدیر پیگیری (FR-028, AT-15, AT-21)",
  })
  @ApiResponse({
    status: 200,
    description: "صف معوقات با موفقیت بازگردانده شد",
  })
  async getTrackingDirectorBacklog() {
    return this.reportingService.getTrackingDirectorBacklog();
  }

  @Get("general-director-summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "داشبورد کلان و خلاصه آماری مدیر کل (شاخص‌های کلیدی عملکرد FR-031, AT-24)",
  })
  @ApiResponse({
    status: 200,
    description: "آمار کلان با موفقیت بازگردانده شد",
  })
  async getGeneralDirectorSummary() {
    return this.reportingService.getGeneralDirectorSummary();
  }

  @Get("workflow-metrics")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "تحلیل شاخص‌های موتور فرایند و بازگشت مراحل (D-05, AT-33)",
  })
  @ApiResponse({
    status: 200,
    description: "شاخص‌های فرایند با موفقیت بازگردانده شد",
  })
  async getWorkflowMetrics() {
    return this.reportingService.getWorkflowMetrics();
  }
}
