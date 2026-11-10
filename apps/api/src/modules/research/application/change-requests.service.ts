import { Inject, Injectable } from "@nestjs/common";
import type { CreateResearchChangeRequestDto, DecideResearchChangeRequestDto, ResearchChangeRequestDto } from "@tstaff/contracts";
import { ResearchService } from "./research.service.js";
import { CHANGE_REQUEST_REPOSITORY, type ChangeRequestRepositoryPort } from "./ports/change-request.repository.port.js";
import { TRANSACTION_RUNNER, type TransactionRunner } from "../../../platform/transactions/transaction-runner.js";
import { AuditService } from "../../audit/application/audit.service.js";
import { InvalidStageTransitionError, ResearchCaseNotFoundError, StaleRevisionError, UnauthorizedSupervisorError } from "../domain/research-errors.js";

@Injectable()
export class ChangeRequestsService {
  constructor(@Inject(CHANGE_REQUEST_REPOSITORY) private readonly repository: ChangeRequestRepositoryPort,
    @Inject(ResearchService) private readonly research: ResearchService,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
    @Inject(AuditService) private readonly audit: AuditService) {}

  async list(caseId: string, actorId: string, roles: string[] = []) {
    if (!(await this.research.canUserAccessCase(caseId, actorId, roles))) throw new UnauthorizedSupervisorError(actorId, caseId);
    return this.repository.list(caseId);
  }

  async create(caseId: string, authorId: string, dto: CreateResearchChangeRequestDto): Promise<ResearchChangeRequestDto> {
    return this.transactions.run(async () => {
      const item = await this.research.getCase(caseId);
      if (item.researcherId !== authorId) throw new UnauthorizedSupervisorError(authorId, caseId);
      if (item.version !== dto.expectedVersion) throw new StaleRevisionError(item.version, dto.expectedVersion);
      if (item.getStage(dto.targetStage)?.status !== "APPROVED") throw new InvalidStageTransitionError("درخواست تغییر فقط برای مرحله تأییدشده ثبت می‌شود");
      if ((await this.repository.list(caseId)).some((request) => request.status === "PENDING" && request.targetStage === dto.targetStage)) throw new InvalidStageTransitionError("برای این مرحله درخواست تغییر در انتظار بررسی وجود دارد");
      const request: ResearchChangeRequestDto = { ...dto, id: crypto.randomUUID(), researchCaseId: caseId, authorId, status: "PENDING", version: 1, reviewerId: null, decisionReason: null, createdAt: new Date().toISOString(), decidedAt: null };
      await this.repository.create(request);
      await this.audit.recordEvent({ aggregateType: "ResearchCase", aggregateId: caseId, action: "CHANGE_REQUESTED", actorId: authorId, payload: { requestId: request.id, targetStage: dto.targetStage, expectedVersion: dto.expectedVersion } });
      return request;
    });
  }

  async decide(caseId: string, requestId: string, reviewerId: string, dto: DecideResearchChangeRequestDto): Promise<ResearchChangeRequestDto> {
    return this.transactions.run(async () => {
      if (!(await this.research.isSupervisorAssignedToCase(caseId, reviewerId))) throw new UnauthorizedSupervisorError(reviewerId, caseId);
      const request = await this.repository.get(requestId);
      if (!request || request.researchCaseId !== caseId) throw new ResearchCaseNotFoundError(requestId);
      if (request.status !== "PENDING" || request.version !== dto.expectedVersion) throw new StaleRevisionError(request.version, dto.expectedVersion);
      const item = await this.research.getCase(caseId);
      if (item.version !== dto.caseVersion) throw new StaleRevisionError(item.version, dto.caseVersion);
      const decided = { ...request, status: dto.decision, version: request.version + 1, reviewerId, decisionReason: dto.reason, decidedAt: new Date().toISOString() };
      await this.repository.decide(decided, dto.expectedVersion);
      if (dto.decision === "APPROVED") await this.research.rollbackStage(caseId, { targetStage: request.targetStage, reason: dto.reason, expectedVersion: dto.caseVersion }, reviewerId);
      await this.audit.recordEvent({ aggregateType: "ResearchCase", aggregateId: caseId, action: "CHANGE_REQUEST_DECIDED", actorId: reviewerId, payload: { requestId, decision: dto.decision, targetStage: request.targetStage, reason: dto.reason } });
      return decided;
    });
  }
}
