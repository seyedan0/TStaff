import { Controller, Get, Inject, Param, Req, UseGuards } from "@nestjs/common";
import { RequireRoles, StageGuard } from "../../../platform/security/stage.guard.js";
import { SupervisorWorkspaceService } from "../application/supervisor-workspace.service.js";

@Controller("scientific-supervisors/me")
@UseGuards(StageGuard)
@RequireRoles("SCIENTIFIC_SUPERVISOR")
export class SupervisorWorkspaceController {
  constructor(@Inject(SupervisorWorkspaceService) private readonly workspace: SupervisorWorkspaceService) {}
  @Get("workspace")
  list(@Req() request: any) { return this.workspace.list(request.user.id); }
  @Get("trainees/:userId")
  detail(@Req() request: any, @Param("userId") userId: string) { return this.workspace.detail(request.user.id, userId); }
}
