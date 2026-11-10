import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { CreateArchiveJobDtoSchema } from "@tstaff/contracts";
import { ArchivalService } from "../application/archival.service.js";
import {
  StageGuard,
  RequireStage,
  RequireRoles,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Archival (آرشیو دائمی و انجماد داده‌ها FR-025, AT-14, AT-27)")
@Controller("archives/jobs")
@UseGuards(StageGuard)
@RequireStage("INTERN")
@RequireRoles("SYSTEM_ADMIN", "TRACKING_DIRECTOR")
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی (INTERN)",
  required: true,
})
export class ArchivalController {
  constructor(
    @Inject(ArchivalService)
    private readonly archivalService: ArchivalService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "ایجاد و اجرای فرآیند انجماد و آرشیو موجودیت بدون حذف فیزیکی (FR-025, AT-14, BR-19)",
  })
  @ApiResponse({
    status: 201,
    description: "عملیات آرشیو با موفقیت ثبت و اجرا شد",
  })
  async createArchiveJob(
    @Headers("x-user-id") headerActorId: string | undefined,
    @Body() body: unknown,
    @Req() request?: any,
  ) {
    const dto = CreateArchiveJobDtoSchema.parse(body);
    const actorId = request?.user?.id ?? headerActorId;
    const job = await this.archivalService.createAndProcessArchiveJob(
      dto,
      actorId,
    );
    return job.toJSON();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت فهرست آخرین عملیات‌های آرشیو" })
  async listJobs(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;
    const jobs = await this.archivalService.listRecentJobs(parsedLimit);
    return jobs.map((j) => j.toJSON());
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت وضعیت یک عملیات آرشیو با شناسه" })
  async getJobById(@Param("id") id: string) {
    const job = await this.archivalService.getJobById(id);
    return job.toJSON();
  }
}
