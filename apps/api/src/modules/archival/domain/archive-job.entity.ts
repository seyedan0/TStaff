export type ArchiveTargetType = "RESEARCH_CASE" | "CONVERSATION" | "APPLICANT";
export type ArchiveJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface ArchiveJobProps {
  id: string;
  targetType: ArchiveTargetType;
  targetId: string;
  status: ArchiveJobStatus;
  storageLocation?: string | null | undefined;
  createdAt: Date;
  completedAt?: Date | null | undefined;
}

export class ArchiveJob {
  private constructor(private readonly props: ArchiveJobProps) {}

  public static create(params: {
    id?: string;
    targetType: ArchiveTargetType;
    targetId: string;
  }): ArchiveJob {
    return new ArchiveJob({
      id: params.id || crypto.randomUUID(),
      targetType: params.targetType,
      targetId: params.targetId,
      status: "QUEUED",
      storageLocation: null,
      createdAt: new Date(),
      completedAt: null,
    });
  }

  public static reconstitute(props: ArchiveJobProps): ArchiveJob {
    return new ArchiveJob(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get targetType(): ArchiveTargetType {
    return this.props.targetType;
  }

  public get targetId(): string {
    return this.props.targetId;
  }

  public get status(): ArchiveJobStatus {
    return this.props.status;
  }

  public get storageLocation(): string | null | undefined {
    return this.props.storageLocation;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get completedAt(): Date | null | undefined {
    return this.props.completedAt;
  }

  public startRunning(): ArchiveJob {
    return new ArchiveJob({
      ...this.props,
      status: "RUNNING",
    });
  }

  public complete(storageLocation: string): ArchiveJob {
    return new ArchiveJob({
      ...this.props,
      status: "COMPLETED",
      storageLocation,
      completedAt: new Date(),
    });
  }

  public fail(): ArchiveJob {
    return new ArchiveJob({
      ...this.props,
      status: "FAILED",
      completedAt: new Date(),
    });
  }

  public toJSON(): ArchiveJobProps {
    return { ...this.props };
  }
}

