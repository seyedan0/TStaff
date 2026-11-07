import { Injectable, Inject } from "@nestjs/common";
import type { SendMessageDto } from "@tstaff/contracts";
import {
  Conversation,
  type ConversationType,
} from "../domain/conversation.entity.js";
import { Message } from "../domain/message.entity.js";
import {
  ConversationNotFoundError,
  MessageUnauthorizedError,
} from "../domain/messaging-errors.js";
import type { MessagingRepositoryPort } from "./ports/messaging.repository.port.js";

export const MESSAGING_REPOSITORY = Symbol("MESSAGING_REPOSITORY");

@Injectable()
export class MessagingService {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messagingRepo: MessagingRepositoryPort,
  ) {}

  /**
   * Rule FR-024 / FR-030 / AT-10 / BR-16:
   * Direct 1:1 chat between authorized pairs. Group chat is strictly forbidden.
   */
  async createOrGetDirectConversation(
    userA: string,
    userB: string,
    type: ConversationType = "DIRECT_SUPERVISOR_TRAINEE",
    researchCaseId?: string,
  ): Promise<Conversation> {
    const existing = await this.messagingRepo.findDirectConversation(
      userA,
      userB,
    );
    if (existing) {
      return existing;
    }

    const conversation = Conversation.create({
      participantIds: [userA, userB],
      type,
      researchCaseId,
    });

    await this.messagingRepo.saveConversation(conversation);
    return conversation;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const conversation =
      await this.messagingRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (!conversation.hasParticipant(senderId)) {
      throw new MessageUnauthorizedError();
    }

    const message = Message.create({
      conversationId,
      senderId,
      content: dto.content,
      attachmentId: dto.attachmentId,
    });

    await this.messagingRepo.saveMessage(message);

    const touched = conversation.touch();
    await this.messagingRepo.saveConversation(touched);

    return message;
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit?: number,
  ): Promise<Message[]> {
    const conversation =
      await this.messagingRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (!conversation.hasParticipant(userId)) {
      throw new MessageUnauthorizedError();
    }

    return this.messagingRepo.findMessagesByConversationId(
      conversationId,
      limit,
    );
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.messagingRepo.findConversationsByUserId(userId);
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation =
      await this.messagingRepo.findConversationById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    if (!conversation.hasParticipant(userId)) {
      throw new MessageUnauthorizedError();
    }

    return conversation;
  }
}

