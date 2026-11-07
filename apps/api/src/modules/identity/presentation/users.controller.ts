import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import {
  PromoteToInternDtoSchema,
  SuspendUserDtoSchema,
  ReactivateUserDtoSchema,
} from "@tstaff/contracts";
import { IdentityService } from "../application/identity.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Users (کاربران و ارتقای عضویت)")
@Controller("users")
@UseGuards(StageGuard)
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی (APPRENTICE یا INTERN)",
  required: true,
})
export class UsersController {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService,
  ) {}

  @Post(":id/promote-to-intern")
  @RequireStage("INTERN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ارتقای کاربر از کارآموز به کارورز توسط مدیر استانی (FR-004, AT-03)",
  })
  @ApiResponse({
    status: 200,
    description: "کاربر با موفقیت به کارورز ارتقا یافت",
  })
  async promoteToIntern(@Param("id") id: string, @Body() body: unknown) {
    const validated = PromoteToInternDtoSchema.parse(body);
    const user = await this.identityService.promoteToIntern(
      id,
      validated.evaluationNotes,
    );
    return user.toJSON();
  }

  @Get(":id")
  @ApiOperation({ summary: "مشاهده مشخصات حساب کاربر" })
  async getUser(@Param("id") id: string) {
    const user = await this.identityService.getById(id);
    return user.toJSON();
  }

  @Post(":id/suspend")
  @RequireStage("INTERN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "تعلیق حساب کاربری به دلیل نقض قوانین (FR-035, AT-12, BR-18)",
  })
  @ApiResponse({
    status: 200,
    description: "حساب کاربری با موفقیت تعلیق شد",
  })
  async suspendUser(@Param("id") id: string, @Body() body: unknown) {
    const validated = SuspendUserDtoSchema.parse(body);
    const user = await this.identityService.suspendUser(id, validated.reason);
    return user.toJSON();
  }

  @Post(":id/reactivate")
  @RequireStage("INTERN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "رفع تعلیق و فعال‌سازی مجدد حساب کاربر (FR-035, AT-12)",
  })
  @ApiResponse({
    status: 200,
    description: "حساب کاربری مجدداً فعال شد",
  })
  async reactivateUser(@Param("id") id: string, @Body() body: unknown) {
    const validated = ReactivateUserDtoSchema.parse(body);
    const user = await this.identityService.reactivateUser(
      id,
      validated.reason,
    );
    return user.toJSON();
  }
}
