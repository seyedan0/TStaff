export interface MessageProps {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentId?: string | null | undefined;
  createdAt: Date;
}

export class Message {
  private constructor(private readonly props: MessageProps) {}

  public static create(
    params: Omit<MessageProps, "id" | "createdAt"> & { id?: string },
  ): Message {
    return new Message({
      id: params.id || crypto.randomUUID(),
      conversationId: params.conversationId,
      senderId: params.senderId,
      content: params.content,
      attachmentId: params.attachmentId ?? null,
      createdAt: new Date(),
    });
  }

  public static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get conversationId(): string {
    return this.props.conversationId;
  }

  public get senderId(): string {
    return this.props.senderId;
  }

  public get content(): string {
    return this.props.content;
  }

  public get attachmentId(): string | null | undefined {
    return this.props.attachmentId;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public toJSON(): MessageProps {
    return { ...this.props };
  }
}

