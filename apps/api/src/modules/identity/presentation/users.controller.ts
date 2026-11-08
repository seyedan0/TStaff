import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
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

  @Post("managers")
  @RequireStage("INTERN")
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
  @ApiOperation({
    summary: "دریافت فهرست کلیه مدیران سامانه",
  })
  async getManagers() {
    const managers = await this.identityService.getManagers();
    return managers.map((m) => m.toJSON());
  }

  // Apprentice Study Evaluation Endpoints
  @Post("study-evaluations/request")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "ارسال درخواست ارزیابی مطالعه شیوه‌نامه‌ها توسط کارآموز جهت ارتقا به کارورز",
  })
  async requestStudyEvaluation(
    @Headers("x-user-id") userId: string,
    @Body() body: unknown,
  ) {
    const validated = RequestStudyEvaluationDtoSchema.parse(body);
    const targetUserId = userId || "10000000-0000-0000-0000-000000000006";
    return this.identityService.requestStudyEvaluation(targetUserId, validated.notes);
  }

  @Get("study-evaluations/my-status")
  @ApiOperation({
    summary: "مشاهده وضعیت آخرین درخواست ارزیابی شیوه‌نامه کارآموز",
  })
  async getMyStudyStatus(@Headers("x-user-id") userId: string) {
    const targetUserId = userId || "10000000-0000-0000-0000-000000000006";
    return this.identityService.getStudyEvaluationForUser(targetUserId);
  }

  @Get("study-evaluations/pending")
  @RequireStage("INTERN")
  @ApiOperation({
    summary: "کارتابل مدیر علمی: فهرست کارآموزان در انتظار ارزیابی شیوه‌نامه‌ها",
  })
  async getPendingStudyEvaluations() {
    return this.identityService.getPendingStudyEvaluations();
  }

  @Post("study-evaluations/:id/decide")
  @RequireStage("INTERN")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "کارتابل مدیر علمی: ثبت تصمیم ارزیابی کارآموز (تأیید و ارتقا / نیازمند اصلاح)",
  })
  async decideStudyEvaluation(
    @Param("id") id: string,
    @Headers("x-user-id") supervisorId: string,
    @Body() body: unknown,
  ) {
    const validated = EvaluateStudyDtoSchema.parse(body);
    return this.identityService.decideStudyEvaluation(
      id,
      supervisorId || "10000000-0000-0000-0000-000000000003",
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
    @Headers("x-user-id") userId: string,
    @Body() body: unknown,
  ) {
    const validated = CreateSupportTicketDtoSchema.parse(body);
    return this.identityService.createSupportTicket(
      userId || "10000000-0000-0000-0000-000000000005",
      validated.subject,
      validated.description,
    );
  }

  @Get("support-tickets")
  @RequireStage("INTERN")
  @ApiOperation({
    summary: "مشاهده تیکت‌های پشتیبانی توسط مدیر پشتیبانی",
  })
  async getSupportTickets() {
    return this.identityService.getSupportTickets();
  }

  @Post("support-tickets/:id/resolve")
  @RequireStage("INTERN")
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
