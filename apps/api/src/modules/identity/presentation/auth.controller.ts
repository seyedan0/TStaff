import { Controller, Post, Get, Body, HttpCode, HttpStatus, Inject, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { LoginDtoSchema } from "@tstaff/contracts";
import { IdentityService } from "../application/identity.service.js";
import { StageGuard } from "../../../platform/security/stage.guard.js";

@ApiTags("Auth (احراز هویت و ورود)")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ورود به سامانه با شماره همراه و گذرواژه (فاز ۱ - OTP موکول به فاز بعد)",
  })
  @ApiResponse({ status: 200, description: "ورود موفق و صدور توکن نشست" })
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const validated = LoginDtoSchema.parse(body);
    const { user, token } = await this.identityService.login(validated);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const common = `Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`;
    const csrf = randomBytes(24).toString("base64url");
    response.setHeader("Set-Cookie", [
      `tstaff_session=${encodeURIComponent(token)}; ${common}`,
      `tstaff_csrf=${encodeURIComponent(csrf)}; Path=/; SameSite=Lax; Max-Age=28800${secure}`,
    ]);
    return {
      user: user.toJSON(),
    };
  }

  @Get("session")
  @UseGuards(StageGuard)
  async session(@Req() request: Request & { user?: { id: string } }) {
    const user = await this.identityService.getById(request.user!.id);
    return { user: user.toJSON() };
  }

  @Post("logout")
  @UseGuards(StageGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const cookie = request.headers.cookie ?? "";
    const token = cookie.match(/(?:^|;\s*)tstaff_session=([^;]+)/)?.[1];
    if (token) await this.identityService.revokeSession(decodeURIComponent(token));
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader("Set-Cookie", [
      `tstaff_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      `tstaff_csrf=; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    ]);
  }
}
