import { PrismaService, type Prisma } from "@tstaff/database";
import type { NotificationWriterPort } from "./notification-dispatcher.handler.js";
import type { AuditWriterPort } from "./audit-dispatcher.handler.js";
import type { ArchivalWriterPort } from "./archival-snapshot.handler.js";
import type {
  StageDeadlineMonitorPort,
  OverdueCaseInfo,
} from "./stage-deadline.handler.js";

export class PrismaNotificationWriter implements NotificationWriterPort {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    isCritical: boolean;
  }): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        isCritical: data.isCritical,
      },
    });
  }
}

export class PrismaAuditWriter implements AuditWriterPort {
  constructor(private readonly prisma: PrismaService) {}

  async createAuditEvent(data: {
    aggregateType: string;
    aggregateId: string;
    action: string;
    actorId?: string | undefined;
    ipAddress?: string | undefined;
    payload?: unknown;
  }): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        action: data.action,
        actorId: data.actorId ?? null,
        ipAddress: data.ipAddress ?? null,
        payload: (data.payload as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}

export class PrismaArchivalWriter implements ArchivalWriterPort {
  constructor(private readonly prisma: PrismaService) {}

  async generateAndSaveSnapshot(
    _jobId: string,
    targetType: string,
    targetId: string,
  ): Promise<string> {
    let snapshotData: unknown = null;

    if (targetType === "RESEARCH_CASE") {
      snapshotData = await this.prisma.researchCase.findUnique({
        where: { id: targetId },
        include: {
          assignments: true,
          stages: true,
          resources: { include: { interview: true } },
          scenarios: true,
        },
      });
    } else if (targetType === "CONVERSATION") {
      snapshotData = await this.prisma.conversation.findUnique({
        where: { id: targetId },
        include: {
          participants: true,
          messages: true,
        },
      });
    } else if (targetType === "APPLICANT") {
      snapshotData = await this.prisma.applicant.findUnique({
        where: { id: targetId },
        include: {
          admissionReviews: true,
        },
      });
    }

    const storageLocation = `archives/${targetType.toLowerCase()}s/${targetId}_snapshot.json`;
    // Snapshot JSON stringified metadata
    JSON.stringify(snapshotData);

    return storageLocation;
  }

  async completeJob(jobId: string, storageLocation: string): Promise<void> {
    await this.prisma.archiveJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        storageLocation,
        completedAt: new Date(),
      },
    });
  }
}

export class PrismaStageDeadlineMonitor implements StageDeadlineMonitorPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOverdueCases(thresholdDays: number): Promise<OverdueCaseInfo[]> {
    const cutoff = new Date(Date.now() - thresholdDays * 24 * 3600 * 1000);

    const overdueStages = await this.prisma.stageInstance.findMany({
      where: {
        status: "IN_PROGRESS",
        updatedAt: { lt: cutoff },
        researchCase: { status: { notIn: ["COMPLETED", "ARCHIVED"] } },
      },
      include: {
        researchCase: true,
      },
    });

    const now = Date.now();
    return overdueStages.map((st) => ({
      caseId: st.researchCaseId,
      code: st.researchCase.code,
      subject: st.researchCase.subject,
      stageType: st.stageType,
      daysElapsed: Math.floor(
        (now - st.updatedAt.getTime()) / (1000 * 3600 * 24),
      ),
    }));
  }

  async alertTrackingDirector(overdueCase: OverdueCaseInfo): Promise<void> {
    // Record an audit log for the overdue stage alert
    await this.prisma.auditEvent.create({
      data: {
        aggregateType: "ResearchCase",
        aggregateId: overdueCase.caseId,
        action: "OVERDUE_STAGE_DETECTED",
        payload: {
          code: overdueCase.code,
          stageType: overdueCase.stageType,
          daysElapsed: overdueCase.daysElapsed,
        },
      },
    });
  }
}

