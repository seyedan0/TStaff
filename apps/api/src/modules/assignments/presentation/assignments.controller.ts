import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { AssignSupervisorDtoSchema } from "@tstaff/contracts";
import { AssignmentsService } from "../application/assignments.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Assignments (انتساب مدیران علمی و پژوهشگران)")
@Controller("research-cases/:id/assignments")
@UseGuards(StageGuard)
@RequireStage("INTERN")
@ApiHeader({
  name: "x-user-stage",
  description:
    "سطح کاربری جهت اعتبارسنجی (حداقل INTERN برای دسترسی به پرونده پژوهش AT-02)",
  required: true,
})
export class AssignmentsController {
  constructor(
    @Inject(AssignmentsService)
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @Post("supervisors")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "انتساب مدیر علمی اصلی یا همکار به پرونده پژوهشی (D-02, FR-045)",
  })
  @ApiResponse({ status: 200, description: "مدیر علمی با موفقیت انتساب یافت" })
  @ApiResponse({
    status: 409,
    description: "مدیر علمی هم‌اکنون فعال است یا ظرفیت پر است",
  })
  async assignSupervisor(@Param("id") caseId: string, @Body() body: unknown) {
    const validated = AssignSupervisorDtoSchema.parse(body);
    const assignment = await this.assignmentsService.assignSupervisor(
      caseId,
      validated,
    );
    return assignment.toJSON();
  }

  @Post("supervisors/reassign")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "جایگزینی مدیر علمی (آرشیو انتساب قبلی و ثبت انتساب جدید)",
  })
  async reassignSupervisor(@Param("id") caseId: string, @Body() body: unknown) {
    const validated = AssignSupervisorDtoSchema.parse(body);
    const assignment = await this.assignmentsService.reassignSupervisor(
      caseId,
      validated,
    );
    return assignment.toJSON();
  }

  @Get("supervisors")
  @ApiOperation({
    summary: "مشاهده مدیران علمی فعال پرونده پژوهشی (مدیر اصلی و مدیر همکار)",
  })
  async getSupervisors(@Param("id") caseId: string) {
    const supervisors = await this.assignmentsService.getSupervisors(caseId);
    return supervisors.map((s) => s.toJSON());
  }
}
