import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { AuditQueryFilterSchema } from "@tstaff/contracts";
import { AuditService } from "../application/audit.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Audit (لاگ ممیزی و نظارت)")
@Controller("audit-events")
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی (INTERN)",
  required: true,
})
export class AuditController {
  constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "جست‌وجو و دریافت رخدادهای ممیزی سیستم (D-04, FR-060, AT-31)",
  })
  @ApiResponse({
    status: 200,
    description: "فهرست رخدادهای ممیزی با موفقیت بازگردانده شد",
  })
  async queryEvents(@Query() query: unknown) {
    const filter = AuditQueryFilterSchema.parse(query);
    const events = await this.auditService.queryEvents(filter);
    return events.map((e) => e.toJSON());
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت جزئیات یک رخداد ممیزی با شناسه" })
  @ApiResponse({
    status: 200,
    description: "جزئیات رخداد ممیزی با موفقیت بازگردانده شد",
  })
  async getEventById(@Param("id") id: string) {
    const event = await this.auditService.getEventById(id);
    return event.toJSON();
  }
}
