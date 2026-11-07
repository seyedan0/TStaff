import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Research (پرونده‌های پژوهش)")
@Controller("research-cases")
@UseGuards(StageGuard)
@RequireStage("INTERN")
export class ResearchController {
  @Get()
  @ApiOperation({
    summary:
      "فهرست پرونده‌های پژوهش (فقط برای کارورزان و مدیران - مسدود برای کارآموز AT-02)",
  })
  @ApiResponse({ status: 200, description: "فهرست پرونده‌ها" })
  @ApiResponse({ status: 403, description: "دسترسی کارآموز مسدود است" })
  async listResearchCases() {
    return [
      {
        id: "case-01",
        title: "تحلیل الگوی مشارکت نخبگانی",
        status: "IN_PROGRESS",
      },
    ];
  }
}
