import { Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import {
  Conversation,
  type ConversationType,
} from "../domain/conversation.entity.js";
import { Message } from "../domain/message.entity.js";
import type { MessagingRepositoryPort } from "../application/ports/messaging.repository.port.js";

@Injectable()
export class PrismaMessagingRepository implements MessagingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveConversation(conversation: Conversation): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.conversation.upsert({
        where: { id: conversation.id },
        create: {
          id: conversation.id,
          type: conversation.type,
          researchCaseId: conversation.researchCaseId ?? null,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        update: {
          updatedAt: conversation.updatedAt,
        },
      });

      for (const userId of conversation.participantIds) {
        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId,
            },
          },
          create: {
            conversationId: conversation.id,
            userId,
          },
          update: {},
        });
      }
    });
  }

  async findConversationById(id: string): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });
    if (!row) return null;
    return this.mapConversationToDomain(row);
  }

  async findDirectConversation(
    userA: string,
    userB: string,
  ): Promise<Conversation | null> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: userA } } },
          { participants: { some: { userId: userB } } },
        ],
      },
      include: {
        participants: true,
      },
    });

    const direct = conversations.find((c) => c.participants.length === 2);
    return direct ? this.mapConversationToDomain(direct) : null;
  }

  async findConversationsByUserId(userId: string): Promise<Conversation[]> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((r) => this.mapConversationToDomain(r));
  }

  async saveMessage(message: Message): Promise<void> {
    await this.prisma.message.upsert({
      where: { id: message.id },
      create: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        attachmentId: message.attachmentId ?? null,
        createdAt: message.createdAt,
      },
      update: {},
    });
  }

  async findMessagesByConversationId(
    conversationId: string,
    limit = 100,
  ): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return rows.map((r) =>
      Message.reconstitute({
        id: r.id,
        conversationId: r.conversationId,
        senderId: r.senderId,
        content: r.content,
        attachmentId: r.attachmentId,
        createdAt: r.createdAt,
      }),
    );
  }

  private mapConversationToDomain(row: {
    id: string;
    type: string;
    researchCaseId: string | null;
    createdAt: Date;
    updatedAt: Date;
    participants: { userId: string }[];
  }): Conversation {
    return Conversation.reconstitute({
      id: row.id,
      type: row.type as ConversationType,
      researchCaseId: row.researchCaseId,
      participantIds: row.participants.map((p) => p.userId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
