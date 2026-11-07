import { Conversation } from "../../domain/conversation.entity.js";
import { Message } from "../../domain/message.entity.js";

export interface MessagingRepositoryPort {
  saveConversation(conversation: Conversation): Promise<void>;
  findConversationById(id: string): Promise<Conversation | null>;
  findDirectConversation(
    userA: string,
    userB: string,
  ): Promise<Conversation | null>;
  findConversationsByUserId(userId: string): Promise<Conversation[]>;
  saveMessage(message: Message): Promise<void>;
  findMessagesByConversationId(
    conversationId: string,
    limit?: number,
  ): Promise<Message[]>;
}

