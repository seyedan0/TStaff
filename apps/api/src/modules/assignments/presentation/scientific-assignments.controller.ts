import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import {
  AssignScientificSupervisorToUserDtoSchema,
  AssignSupervisorDtoSchema,
  ReplaceMainSupervisorDtoSchema,
} from "@tstaff/contracts";
import { AssignmentsService } from "../application/assignments.service.js";
import { RequireRoles, StageGuard } from "../../../platform/security/stage.guard.js";

@Controller()
@UseGuards(StageGuard)
export class ScientificAssignmentsController {
  constructor(@Inject(AssignmentsService) private readonly assignments: AssignmentsService) {}

  @Get("scientific-supervisors/me/trainees")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  async listAssignedTrainees(@Req() request: any) {
    return this.assignments.getUsersForSupervisor(request.user.id);
  }

  @Post("users/:userId/scientific-supervisors")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  async addSupervisor(@Param("userId") userId: string, @Req() request: any, @Body() body: unknown) {
    const { supervisorId } = AssignScientificSupervisorToUserDtoSchema.parse(body);
    await this.assignments.assignSupervisorToUser(userId, supervisorId, request.user.id);
    return { userId, supervisorId, status: "ACTIVE" };
  }

  @Get("users/:userId/scientific-supervisors")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  async listUserSupervisors(@Param("userId") userId: string) {
    return this.assignments.getSupervisorsForUser(userId);
  }

  @Delete("users/:userId/scientific-supervisors/:supervisorId")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async revokeUserSupervisor(
    @Param("userId") userId: string,
    @Param("supervisorId") supervisorId: string,
    @Req() request: any,
  ) {
    await this.assignments.revokeSupervisorFromUser(userId, supervisorId, request.user.id);
    return { userId, supervisorId, status: "REVOKED" };
  }

  @Get("research-cases/:caseId/supervisors")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN", "SCIENTIFIC_SUPERVISOR")
  async listCaseSupervisors(@Param("caseId") caseId: string) {
    return (await this.assignments.getCaseSupervisors(caseId)).map((entry) => ({
      ...entry,
      assignedAt: entry.assignedAt.toISOString(),
    }));
  }

  @Post("research-cases/:caseId/supervisors")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  async assignCaseSupervisor(
    @Param("caseId") caseId: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const dto = AssignSupervisorDtoSchema.parse(body);
    await this.assignments.assignSupervisorToCase(caseId, dto.userId, dto.role, request.user.id);
    return { researchCaseId: caseId, userId: dto.userId, role: dto.role, status: "ACTIVE" };
  }

  @Put("research-cases/:caseId/supervisors/main")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async replaceMainSupervisor(
    @Param("caseId") caseId: string,
    @Req() request: any,
    @Body() body: unknown,
  ) {
    const dto = ReplaceMainSupervisorDtoSchema.parse(body);
    await this.assignments.replaceMainSupervisorOnCase(caseId, dto.supervisorId, request.user.id);
    return { researchCaseId: caseId, supervisorId: dto.supervisorId, role: "MAIN_SUPERVISOR", status: "ACTIVE" };
  }

  @Delete("research-cases/:caseId/supervisors/:supervisorId")
  @RequireRoles("TRACKING_DIRECTOR", "SYSTEM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async revokeCaseSupervisor(
    @Param("caseId") caseId: string,
    @Param("supervisorId") supervisorId: string,
    @Req() request: any,
  ) {
    await this.assignments.revokeSupervisorFromCase(caseId, supervisorId, request.user.id);
    return { researchCaseId: caseId, supervisorId, status: "REVOKED" };
  }
}
