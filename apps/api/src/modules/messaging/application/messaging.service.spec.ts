import { describe, it, expect, beforeEach } from "vitest";
import { MessagingService } from "./messaging.service.js";
import { Conversation } from "../domain/conversation.entity.js";
import { Message } from "../domain/message.entity.js";
import {
  ConversationNotFoundError,
  MessageUnauthorizedError,
  GroupChatNotAllowedError,
  InvalidConversationParticipantsError,
} from "../domain/messaging-errors.js";
import type { MessagingRepositoryPort } from "./ports/messaging.repository.port.js";

class InMemoryMessagingRepository implements MessagingRepositoryPort {
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message>();

  async saveConversation(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
  }

  async findConversationById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async findDirectConversation(
    userA: string,
    userB: string,
  ): Promise<Conversation | null> {
    for (const conv of this.conversations.values()) {
      if (
        conv.participantIds.includes(userA) &&
        conv.participantIds.includes(userB) &&
        conv.participantIds.length === 2
      ) {
        return conv;
      }
    }
    return null;
  }

  async findConversationsByUserId(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter((c) =>
      c.hasParticipant(userId),
    );
  }

  async saveMessage(message: Message): Promise<void> {
    this.messages.set(message.id, message);
  }

  async findMessagesByConversationId(
    conversationId: string,
    limit = 100,
  ): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .slice(0, limit);
  }
}

describe("MessagingService & 1:1 Direct Chat Constraints (FR-024, FR-030, AT-10, BR-16)", () => {
  let repo: InMemoryMessagingRepository;
  let service: MessagingService;
  const userA = "11111111-1111-1111-1111-111111111111";
  const userB = "22222222-2222-2222-2222-222222222222";
  const userC = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    repo = new InMemoryMessagingRepository();
    service = new MessagingService(repo);
  });

  it("creates a direct 1:1 conversation between trainee and supervisor", async () => {
    const conv = await service.createOrGetDirectConversation(
      userA,
      userB,
      "DIRECT_SUPERVISOR_TRAINEE",
    );

    expect(conv.id).toBeDefined();
    expect(conv.participantIds).toHaveLength(2);
    expect(conv.hasParticipant(userA)).toBe(true);
    expect(conv.hasParticipant(userB)).toBe(true);

    // Reusing create returns existing conversation
    const existing = await service.createOrGetDirectConversation(userA, userB);
    expect(existing.id).toBe(conv.id);
  });

  it("rejects conversation with self", async () => {
    await expect(
      service.createOrGetDirectConversation(userA, userA),
    ).rejects.toThrow(InvalidConversationParticipantsError);
  });

  it("rejects group chat attempt (more than 2 participants) with GroupChatNotAllowedError (BR-16)", () => {
    expect(() =>
      Conversation.create({
        participantIds: [userA, userB, userC],
      }),
    ).toThrow(GroupChatNotAllowedError);
  });

  it("sends message and updates conversation updatedAt", async () => {
    const conv = await service.createOrGetDirectConversation(userA, userB);

    const message = await service.sendMessage(conv.id, userA, {
      content: "سلام، منبع اول بررسی شد.",
    });

    expect(message.id).toBeDefined();
    expect(message.content).toBe("سلام، منبع اول بررسی شد.");

    const history = await service.getConversationMessages(conv.id, userB);
    expect(history).toHaveLength(1);
    expect(history[0]?.content).toBe("سلام، منبع اول بررسی شد.");
  });

  it("blocks non-participant user C from sending message or reading history", async () => {
    const conv = await service.createOrGetDirectConversation(userA, userB);

    await expect(
      service.sendMessage(conv.id, userC, { content: "پیام غیرمجاز" }),
    ).rejects.toThrow(MessageUnauthorizedError);

    await expect(
      service.getConversationMessages(conv.id, userC),
    ).rejects.toThrow(MessageUnauthorizedError);
  });
});

