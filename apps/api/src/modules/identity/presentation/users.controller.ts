import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { PromoteToInternDtoSchema } from "@tstaff/contracts";
import { IdentityService } from "../application/identity.service.js";
import { StageGuard } from "../../../platform/security/stage.guard.js";

@ApiTags("Users (کاربران و ارتقای عضویت)")
@Controller("users")
@UseGuards(StageGuard)
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی (APPRENTICE یا INTERN)",
  required: true,
})
export class UsersController {
  constructor(private readonly identityService: IdentityService) {}

  @Post(":id/promote-to-intern")
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
}
