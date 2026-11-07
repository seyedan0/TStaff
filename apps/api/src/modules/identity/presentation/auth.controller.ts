import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { LoginDtoSchema } from "@tstaff/contracts";
import { IdentityService } from "../application/identity.service.js";

@ApiTags("Auth (احراز هویت و ورود)")
@Controller("auth")
export class AuthController {
  constructor(private readonly identityService: IdentityService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ورود به سامانه با شماره همراه و گذرواژه (فاز ۱ - OTP موکول به فاز بعد)",
  })
  @ApiResponse({ status: 200, description: "ورود موفق و صدور توکن نشست" })
  async login(@Body() body: unknown) {
    const validated = LoginDtoSchema.parse(body);
    const { user, token } = await this.identityService.login(validated);
    return {
      user: user.toJSON(),
      token,
    };
  }
}
