import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { CreateResearchChangeRequestDtoSchema, DecideResearchChangeRequestDtoSchema } from "@tstaff/contracts";
import { RequireRoles, RequireStage, StageGuard } from "../../../platform/security/stage.guard.js";
import { ChangeRequestsService } from "../application/change-requests.service.js";

@Controller("research-cases/:caseId/change-requests")
@UseGuards(StageGuard)
@RequireStage("INTERN")
export class ChangeRequestsController {
  constructor(@Inject(ChangeRequestsService) private readonly requests: ChangeRequestsService) {}
  @Get()
  list(@Param("caseId") caseId: string, @Req() request: any) {
    return this.requests.list(caseId, request.user.id, request.user.roles ?? [request.user.role]);
  }
  @Post()
  create(@Param("caseId") caseId: string, @Req() request: any, @Body() body: unknown) {
    return this.requests.create(caseId, request.user.id, CreateResearchChangeRequestDtoSchema.parse(body));
  }
  @Post(":requestId/decide")
  @RequireRoles("SCIENTIFIC_SUPERVISOR")
  decide(@Param("caseId") caseId: string, @Param("requestId") requestId: string, @Req() request: any, @Body() body: unknown) {
    return this.requests.decide(caseId, requestId, request.user.id, DecideResearchChangeRequestDtoSchema.parse(body));
  }
}
