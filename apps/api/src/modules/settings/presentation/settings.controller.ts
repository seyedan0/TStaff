import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { UpdateSystemSettingDtoSchema } from "@tstaff/contracts";
import { SettingsService } from "../application/settings.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Settings (تنظیمات پویای سامانه FR-052, AT-34)")
@Controller("settings")
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی (INTERN)",
  required: true,
})
export class SettingsController {
  constructor(
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "دریافت تمام تنظیمات پویای سامانه در زمان اجرا (FR-052, AT-34)",
  })
  @ApiResponse({
    status: 200,
    description: "فهرست تنظیمات با موفقیت بازگردانده شد",
  })
  async getAllSettings() {
    const settings = await this.settingsService.getAllSettings();
    return settings.map((s) => s.toJSON());
  }

  @Get(":key")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت یک تنظیم با کلید" })
  @ApiResponse({
    status: 200,
    description: "تنظیم مورد نظر با موفقیت بازگردانده شد",
  })
  async getSetting(@Param("key") key: string) {
    const setting = await this.settingsService.getSetting(key);
    return setting.toJSON();
  }

  @Put(":key")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "به‌روزرسانی یا ایجاد تنظیم سامانه بدون نیاز به استقرار مجدد کد (FR-052, AT-34)",
  })
  @ApiResponse({
    status: 200,
    description: "تنظیم با موفقیت ذخیره شد",
  })
  async updateSetting(
    @Param("key") key: string,
    @Headers("x-user-id") updatedBy: string | undefined,
    @Body() body: unknown,
  ) {
    const dto = UpdateSystemSettingDtoSchema.parse(body);
    const setting = await this.settingsService.updateSetting(
      key,
      dto,
      updatedBy,
    );
    return setting.toJSON();
  }
}
