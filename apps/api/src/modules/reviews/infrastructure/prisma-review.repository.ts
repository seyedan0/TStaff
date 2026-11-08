import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { StageSubmission } from "../domain/stage-submission.entity.js";
import { ReviewDecision } from "../domain/review-decision.entity.js";
import { StaleRevisionError } from "../domain/reviews-errors.js";
import type { ReviewRepositoryPort } from "../application/ports/review.repository.port.js";

@Injectable()
export class PrismaReviewRepository implements ReviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveSubmission(submission: StageSubmission): Promise<void> {
    await this.prisma.stageSubmission.upsert({
      where: { id: submission.id },
      create: {
        id: submission.id,
        stageInstanceId: submission.stageInstanceId,
        authorId: submission.authorId,
        version: submission.version,
        content: submission.content,
        storedObjectId: submission.toJSON().storedObjectId,
        status: submission.status as any,
        submittedAt: submission.submittedAt,
      },
      update: {
        content: submission.content,
        storedObjectId: submission.toJSON().storedObjectId,
        status: submission.status as any,
        version: submission.version,
      },
    });
  }

  async findSubmissionById(id: string): Promise<StageSubmission | null> {
    const raw = await this.prisma.stageSubmission.findUnique({
      where: { id },
    });
    if (!raw) return null;

    return StageSubmission.reconstruct({
      id: raw.id,
      stageInstanceId: raw.stageInstanceId,
      authorId: raw.authorId,
      version: raw.version,
      content: raw.content,
      storedObjectId: raw.storedObjectId,
      status: raw.status as any,
      submittedAt: raw.submittedAt,
    });
  }

  async findSubmissionsByStageInstanceId(
    stageInstanceId: string,
  ): Promise<StageSubmission[]> {
    const list = await this.prisma.stageSubmission.findMany({
      where: { stageInstanceId },
      orderBy: { version: "asc" },
    });

    return list.map((raw) =>
      StageSubmission.reconstruct({
        id: raw.id,
        stageInstanceId: raw.stageInstanceId,
        authorId: raw.authorId,
        version: raw.version,
        content: raw.content,
        storedObjectId: raw.storedObjectId,
        status: raw.status as any,
        submittedAt: raw.submittedAt,
      }),
    );
  }

  async saveDecision(decision: ReviewDecision): Promise<void> {
    await this.prisma.reviewDecision.create({
      data: {
        id: decision.id,
        stageSubmissionId: decision.stageSubmissionId,
        reviewerId: decision.reviewerId,
        decision: decision.decision as any,
        expectedVersion: decision.expectedVersion,
        actualVersion: decision.actualVersion,
        reason: decision.reason,
        idempotencyKey: decision.idempotencyKey,
        decidedAt: decision.decidedAt,
      },
    });
  }

  async findDecisionByIdempotencyKey(
    key: string,
  ): Promise<ReviewDecision | null> {
    const raw = await this.prisma.reviewDecision.findUnique({
      where: { idempotencyKey: key },
    });
    if (!raw) return null;

    return ReviewDecision.reconstruct({
      id: raw.id,
      stageSubmissionId: raw.stageSubmissionId ?? "",
      reviewerId: raw.reviewerId,
      decision: raw.decision as any,
      expectedVersion: raw.expectedVersion,
      actualVersion: raw.actualVersion,
      reason: raw.reason,
      idempotencyKey: raw.idempotencyKey,
      decidedAt: raw.decidedAt,
    });
  }

  async findDecisionsBySubmissionId(
    submissionId: string,
  ): Promise<ReviewDecision[]> {
    const list = await this.prisma.reviewDecision.findMany({
      where: { stageSubmissionId: submissionId },
      orderBy: { decidedAt: "asc" },
    });

    return list.map((raw) =>
      ReviewDecision.reconstruct({
        id: raw.id,
        stageSubmissionId: raw.stageSubmissionId ?? "",
        reviewerId: raw.reviewerId,
        decision: raw.decision as any,
        expectedVersion: raw.expectedVersion,
        actualVersion: raw.actualVersion,
        reason: raw.reason,
        idempotencyKey: raw.idempotencyKey,
        decidedAt: raw.decidedAt,
      }),
    );
  }

  async updateSubmissionWithVersionCheck(
    submission: StageSubmission,
    expectedVersion: number,
  ): Promise<void> {
    const result = await this.prisma.stageSubmission.updateMany({
      where: {
        id: submission.id,
        version: expectedVersion,
      },
      data: {
        status: submission.status as any,
        content: submission.content,
        version: submission.version,
      },
    });

    if (result.count === 0) {
      const current = await this.prisma.stageSubmission.findUnique({
        where: { id: submission.id },
      });
      throw new StaleRevisionError(current?.version ?? 0, expectedVersion);
    }
  }
}

