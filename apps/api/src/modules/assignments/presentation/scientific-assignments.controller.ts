import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AssignScientificSupervisorToUserDtoSchema } from "@tstaff/contracts";
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
}
