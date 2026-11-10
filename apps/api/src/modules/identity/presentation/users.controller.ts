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
  ForbiddenException,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  SuspendUserDtoSchema,
  ReactivateUserDtoSchema,
  CreateManagerDtoSchema,
  RequestStudyEvaluationDtoSchema,
  EvaluateStudyDtoSchema,
  CreateSupportTicketDtoSchema,
  ResolveSupportTicketDtoSchema,
} from "@tstaff/contracts";
import { IdentityService } from "../application/identity.service.js";
import {
  StageGuard,
  RequireStage,
  RequireRoles,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Users (کاربران و ارتقای عضویت)")
@Controller("users")
@UseGuards(StageGuard)
export class UsersController {
  constructor(
    @Inject(IdentityService)
    private readonly identityService: IdentityService,
  ) {}

  @Get()
  @RequireStage("INTERN")
  @RequireRoles("SUPPORT_DIRECTOR", "SYSTEM_ADMIN", "TRACKING_DIRECTOR")
  @ApiOperation({ summary: "فهرست کاربران سامانه برای کارتابل پشتیبانی و مدیریت" })
  async listDirectory() {
    return this.identityService.getDirectoryUsers();
  }

  @Post("managers")
  @RequireStage("INTERN")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "ایجاد و انتصاب مدیر جدید توسط مدیر پیگیری",
  })
  @ApiResponse({
    status: 201,
    description: "مدیر جدید با موفقیت ایجاد و نقش وی منتسب شد",
  })
  async createManager(@Body() body: unknown) {
    const validated = CreateManagerDtoSchema.parse(body);
    const user = await this.identityService.createManager(validated);
    return user.toJSON();
  }

  @Get("managers")
  @RequireStage("INTERN")
  @RequireRoles("TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN")
  @ApiOperation({
    summary: "دریافت فهرست کلیه مدیران سامانه",
  })
  async getManagers() {
    const managers = await this.identityService.getManagers();
    return managers.map((m) => m.toJSON());
  }

  @Get("interns")
  @RequireStage("INTERN")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  async getInterns() {
    return (await this.identityService.getInterns()).map((user) => user.toJSON());
  }

  // Apprentice Study Evaluation Endpoints
  @Post("study-evaluations/request")
  @RequireStage("APPRENTICE")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "ارسال درخواست ارزیابی مطالعه شیوه‌نامه‌ها توسط کارآموز جهت ارتقا به کارورز",
  })
  async requestStudyEvaluation(
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = RequestStudyEvaluationDtoSchema.parse(body);
    return this.identityService.requestStudyEvaluation(request.user.id, validated.notes);
  }

  @Get("study-evaluations/my-status")
  @RequireStage("APPRENTICE")
  @ApiOperation({
    summary: "مشاهده وضعیت آخرین درخواست ارزیابی شیوه‌نامه کارآموز",
  })
  async getMyStudyStatus(@Req() request: any) {
    return this.identityService.getStudyEvaluationForUser(request.user.id);
  }

  @Get("study-evaluations/pending")
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @ApiOperation({
    summary: "کارتابل مدیر علمی: فهرست کارآموزان در انتظار ارزیابی شیوه‌نامه‌ها",
  })
  async getPendingStudyEvaluations(@Req() request: any) {
    return this.identityService.getPendingStudyEvaluations(request.user.id);
  }

  @Post("study-evaluations/:id/decide")
  @RequireStage("INTERN")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "کارتابل مدیر علمی: ثبت تصمیم ارزیابی کارآموز (تأیید و ارتقا / نیازمند اصلاح)",
  })
  async decideStudyEvaluation(
    @Param("id") id: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = EvaluateStudyDtoSchema.parse(body);
    return this.identityService.decideStudyEvaluation(
      id,
      request.user.id,
      validated.decision,
      validated.feedback,
    );
  }

  // Support Tickets Endpoints
  @Post("support-tickets")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "ارسال تیکت پشتیبانی توسط کاربر",
  })
  async createSupportTicket(
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const validated = CreateSupportTicketDtoSchema.parse(body);
    return this.identityService.createSupportTicket(
      request.user.id,
      validated.subject,
      validated.description,
    );
  }

  @Get("support-tickets")
  @RequireStage("INTERN")
  @RequireRoles("SUPPORT_DIRECTOR", "SYSTEM_ADMIN")
  @ApiOperation({
    summary: "مشاهده تیکت‌های پشتیبانی توسط مدیر پشتیبانی",
  })
  async getSupportTickets() {
    return this.identityService.getSupportTickets();
  }

  @Post("support-tickets/:id/resolve")
  @RequireStage("INTERN")
  @RequireRoles("SUPPORT_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "پاسخ و تعیین تکلیف تیکت پشتیبانی توسط مدیر پشتیبانی",
  })
  async resolveSupportTicket(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const validated = ResolveSupportTicketDtoSchema.parse(body);
    return this.identityService.resolveSupportTicket(
      id,
      validated.response,
      validated.status,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "مشاهده مشخصات حساب کاربر" })
  async getUser(@Param("id") id: string, @Req() request: any) {
    const roles: string[] = request.user.roles ?? (request.user.role ? [request.user.role] : []);
    const privileged = roles.some((role) => ["SYSTEM_ADMIN", "TRACKING_DIRECTOR", "PROVINCIAL_DIRECTOR", "SUPPORT_DIRECTOR"].includes(role));
    const assignedSupervisor = roles.includes("SCIENTIFIC_SUPERVISOR") && await this.identityService.isScientificSupervisorAssignedToUser(id, request.user.id);
    if (request.user.id !== id && !privileged && !assignedSupervisor) throw new ForbiddenException("مشاهده حساب کاربر دیگر مجاز نیست");
    const user = await this.identityService.getById(id);
    return user.toJSON();
  }

  @Post(":id/suspend")
  @RequireStage("INTERN")
  @RequireRoles("TRACKING_DIRECTOR", "SUPPORT_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "تعلیق حساب کاربری به دلیل نقض قوانین (FR-035, AT-12, BR-18)",
  })
  @ApiResponse({
    status: 200,
    description: "حساب کاربری با موفقیت تعلیق شد",
  })
  async suspendUser(@Param("id") id: string, @Req() request: any, @Body() body: unknown) {
    const validated = SuspendUserDtoSchema.parse(body);
    const user = await this.identityService.suspendUser(id, validated.reason, request.user?.id);
    return user.toJSON();
  }

  @Post(":id/reactivate")
  @RequireStage("INTERN")
  @RequireRoles("TRACKING_DIRECTOR", "SUPPORT_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "رفع تعلیق و فعال‌سازی مجدد حساب کاربر (FR-035, AT-12)",
  })
  @ApiResponse({
    status: 200,
    description: "حساب کاربری مجدداً فعال شد",
  })
  async reactivateUser(@Param("id") id: string, @Req() request: any, @Body() body: unknown) {
    const validated = ReactivateUserDtoSchema.parse(body);
    const user = await this.identityService.reactivateUser(
      id,
      validated.reason,
      request.user?.id,
    );
    return user.toJSON();
  }
}
