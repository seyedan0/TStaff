export interface NotificationProps {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  isCritical: boolean; // D-04: Only critical notifications trigger immediate push
  createdAt: Date;
}

export class Notification {
  private constructor(private readonly props: NotificationProps) {}

  public static create(
    params: Omit<NotificationProps, "id" | "isRead" | "createdAt"> & {
      id?: string;
      isRead?: boolean;
    },
  ): Notification {
    return new Notification({
      id: params.id || crypto.randomUUID(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      isRead: params.isRead ?? false,
      isCritical: params.isCritical ?? false,
      createdAt: new Date(),
    });
  }

  public static reconstitute(props: NotificationProps): Notification {
    return new Notification(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get userId(): string {
    return this.props.userId;
  }

  public get type(): string {
    return this.props.type;
  }

  public get title(): string {
    return this.props.title;
  }

  public get body(): string {
    return this.props.body;
  }

  public get isRead(): boolean {
    return this.props.isRead;
  }

  public get isCritical(): boolean {
    return this.props.isCritical;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public markAsRead(): Notification {
    if (this.props.isRead) {
      return this;
    }
    return new Notification({
      ...this.props,
      isRead: true,
    });
  }

  public toJSON(): NotificationProps {
    return { ...this.props };
  }
}

