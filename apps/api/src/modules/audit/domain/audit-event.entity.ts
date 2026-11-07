export interface AuditEventProps {
  id: string;
  aggregateType: string;
  aggregateId: string;
  action: string;
  actorId?: string | null | undefined;
  ipAddress?: string | null | undefined;
  payload?: Record<string, unknown> | null | undefined;
  createdAt: Date;
}

export class AuditEvent {
  private constructor(private readonly props: AuditEventProps) {}

  public static create(
    params: Omit<AuditEventProps, "id" | "createdAt"> & { id?: string },
  ): AuditEvent {
    return new AuditEvent({
      id: params.id || crypto.randomUUID(),
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      action: params.action,
      actorId: params.actorId ?? null,
      ipAddress: params.ipAddress ?? null,
      payload: params.payload ?? null,
      createdAt: new Date(),
    });
  }

  public static reconstitute(props: AuditEventProps): AuditEvent {
    return new AuditEvent(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get aggregateType(): string {
    return this.props.aggregateType;
  }

  public get aggregateId(): string {
    return this.props.aggregateId;
  }

  public get action(): string {
    return this.props.action;
  }

  public get actorId(): string | null | undefined {
    return this.props.actorId;
  }

  public get ipAddress(): string | null | undefined {
    return this.props.ipAddress;
  }

  public get payload(): Record<string, unknown> | null | undefined {
    return this.props.payload;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public toJSON(): AuditEventProps {
    return { ...this.props };
  }
}

