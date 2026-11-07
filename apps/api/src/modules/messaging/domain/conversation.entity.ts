import {
  InvalidConversationParticipantsError,
  GroupChatNotAllowedError,
} from "./messaging-errors.js";

export type ConversationType =
  | "DIRECT_SUPERVISOR_TRAINEE"
  | "RESEARCH_TEAM_INTERNAL";

export interface ConversationProps {
  id: string;
  type: ConversationType;
  researchCaseId?: string | null | undefined;
  participantIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private constructor(private readonly props: ConversationProps) {}

  public static create(params: {
    id?: string;
    type?: ConversationType;
    researchCaseId?: string | null | undefined;
    participantIds: string[];
  }): Conversation {
    // BR-16 / AT-10: Strictly 1:1 chat in MVP. Group chat is forbidden.
    if (params.participantIds.length > 2) {
      throw new GroupChatNotAllowedError();
    }

    if (params.participantIds.length !== 2) {
      throw new InvalidConversationParticipantsError(
        "گفت‌وگوی دونفره باید دقیقاً دارای دو مخاطب باشد",
      );
    }

    const userA = params.participantIds[0];
    const userB = params.participantIds[1];
    if (!userA || !userB || userA === userB) {
      throw new InvalidConversationParticipantsError(
        "امکان ایجاد گفت‌وگو با خود وجود ندارد",
      );
    }

    return new Conversation({
      id: params.id || crypto.randomUUID(),
      type: params.type || "DIRECT_SUPERVISOR_TRAINEE",
      researchCaseId: params.researchCaseId ?? null,
      participantIds: [userA, userB],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public static reconstitute(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get type(): ConversationType {
    return this.props.type;
  }

  public get researchCaseId(): string | null | undefined {
    return this.props.researchCaseId;
  }

  public get participantIds(): readonly string[] {
    return this.props.participantIds;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public hasParticipant(userId: string): boolean {
    return this.props.participantIds.includes(userId);
  }

  public touch(): Conversation {
    return new Conversation({
      ...this.props,
      updatedAt: new Date(),
    });
  }

  public toJSON(): ConversationProps {
    return { ...this.props };
  }
}
