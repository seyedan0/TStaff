import { Injectable, Inject, Optional } from "@nestjs/common";
import type { ConversationContactDto, DirectoryUserDto, SendMessageDto } from "@tstaff/contracts";
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
import { IdentityService } from "../../identity/application/identity.service.js";
import { AssignmentsService } from "../../assignments/application/assignments.service.js";
import { ResearchService } from "../../research/application/research.service.js";
import { OrganizationService } from "../../organization/application/organization.service.js";

export const MESSAGING_REPOSITORY = Symbol("MESSAGING_REPOSITORY");
const ESCALATION_ROLES = new Set(["SUPPORT_DIRECTOR", "TRACKING_DIRECTOR", "SYSTEM_ADMIN"]);

@Injectable()
export class MessagingService {
  constructor(
    @Inject(MESSAGING_REPOSITORY)
    private readonly messagingRepo: MessagingRepositoryPort,
    @Optional() @Inject(IdentityService)
    private readonly identity?: IdentityService,
    @Optional() @Inject(AssignmentsService)
    private readonly assignments?: AssignmentsService,
    @Optional() @Inject(ResearchService)
    private readonly research?: ResearchService,
    @Optional() @Inject(OrganizationService)
    private readonly organization?: OrganizationService,
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
    callerRoles: string[] = [],
  ): Promise<Conversation> {
    const existing = await this.messagingRepo.findDirectConversation(
      userA,
      userB,
    );
    if (existing) {
      return existing;
    }

    await this.assertAuthorizedPair(userA, userB, callerRoles, researchCaseId);

    const conversation = Conversation.create({
      participantIds: [userA, userB],
      type,
      researchCaseId,
    });

    await this.messagingRepo.saveConversation(conversation);
    return conversation;
  }

  async getContacts(userId: string, roles: string[] = []): Promise<ConversationContactDto[]> {
    if (!this.identity) return [];
    const directory = (await this.identity.getDirectoryUsers()).filter(
      (user) => user.isActive && user.id !== userId,
    );
    if (roles.some((role) => ESCALATION_ROLES.has(role))) {
      return directory.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        stage: user.stage,
        role: user.role,
      }));
    }
    const allowedIds = await this.collectRelatedUserIds(userId, roles, directory);
    return directory
      .filter((user) => allowedIds.has(user.id))
      .map((user) => ({
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        stage: user.stage,
        role: user.role,
      }));
  }

  async enrichConversations(userId: string, conversations: Conversation[]) {
    if (!this.identity) {
      return conversations.map((c) => c.toJSON());
    }
    const directory = new Map(
      (await this.identity.getDirectoryUsers()).map((u) => [u.id, u]),
    );
    return Promise.all(
      conversations.map(async (conv) => {
        const json = conv.toJSON();
        const otherId = json.participantIds.find((id) => id !== userId);
        let other = otherId ? directory.get(otherId) : undefined;
        if (!other && otherId) {
          try {
            const loaded = await this.identity!.getById(otherId);
            const u = loaded.toJSON();
            other = {
              id: u.id,
              fullName: u.fullName ?? "کاربر",
              phoneNumber: u.phoneNumber,
              stage: u.stage,
              role: (u.role ?? u.stage) as DirectoryUserDto["role"],
              roles: (u.roles?.length ? u.roles : [u.stage]) as DirectoryUserDto["roles"],
              isActive: u.isActive,
              provinceId: null,
              createdAt: u.createdAt.toISOString(),
            };
          } catch {
            // Ignore missing profile lookup
          }
        }
        const recent = await this.messagingRepo.findMessagesByConversationId(conv.id, 1);
        return {
          ...json,
          otherParticipant: other
            ? { id: other.id, fullName: other.fullName, phoneNumber: other.phoneNumber, role: other.role, stage: other.stage }
            : null,
          lastMessage: recent.at(-1)?.toJSON() ?? null,
        };
      }),
    );
  }

  private async assertAuthorizedPair(
    userA: string,
    userB: string,
    callerRoles: string[],
    researchCaseId?: string,
  ): Promise<void> {
    if (userA === userB || !this.assignments || !this.identity) return;
    if (callerRoles.some((role) => ESCALATION_ROLES.has(role))) return;

    const [supAB, supBA, grantAB, grantBA] = await Promise.all([
      this.assignments.isSupervisorAssignedToUser(userA, userB),
      this.assignments.isSupervisorAssignedToUser(userB, userA),
      this.organization?.hasUserGrant(userA, userB) ?? false,
      this.organization?.hasUserGrant(userB, userA) ?? false,
    ]);
    if (supAB || supBA || grantAB || grantBA) return;

    if (researchCaseId && this.research) {
      const [canA, canB] = await Promise.all([
        this.research.canUserAccessCase(researchCaseId, userA, callerRoles).catch(() => false),
        this.research.canUserAccessCase(researchCaseId, userB, ["SCIENTIFIC_SUPERVISOR"]).catch(() => false),
      ]);
      if (canA && canB) return;
    }

    if (this.research) {
      const cases = await this.research.listAccessibleCases(userA, callerRoles);
      for (const item of cases) {
        if (item.researcherId === userB) return;
        const caseSups = await this.assignments.getCaseSupervisors(item.id);
        if (caseSups.some((sup) => sup.userId === userB)) return;
      }
    }

    try {
      const target = await this.identity.getById(userB);
      const targetData = target.toJSON();
      const targetRoles = targetData.roles?.length ? targetData.roles : [targetData.role];
      if (targetRoles.some((role) => role && ESCALATION_ROLES.has(role))) return;
      if (callerRoles.includes("PROVINCIAL_DIRECTOR") && this.organization) {
        const provId = await this.identity.getUserProvinceId(userB);
        if (provId && (await this.organization.canAccessProvince(userA, provId))) return;
        if (targetRoles.includes("SCIENTIFIC_SUPERVISOR")) return;
      }
    } catch {
      // Target not found in repo (let strict relation fail below)
    }

    throw new MessageUnauthorizedError();
  }

  private async collectRelatedUserIds(
    userId: string,
    roles: string[],
    directory: DirectoryUserDto[],
  ): Promise<Set<string>> {
    const allowed = new Set<string>();
    for (const entry of directory) {
      if (entry.roles.some((role) => ESCALATION_ROLES.has(role))) {
        allowed.add(entry.id);
      }
    }
    if (this.assignments) {
      const [supervisors, trainees] = await Promise.all([
        this.assignments.getSupervisorsForUser(userId),
        this.assignments.getUsersForSupervisor(userId),
      ]);
      for (const s of supervisors) allowed.add(s.supervisorId);
      for (const t of trainees) allowed.add(t.id);
    }
    if (this.research && this.assignments) {
      const cases = await this.research.listAccessibleCases(userId, roles);
      for (const item of cases) {
        if (item.researcherId) allowed.add(item.researcherId);
        const caseSups = await this.assignments.getCaseSupervisors(item.id);
        for (const s of caseSups) allowed.add(s.userId);
      }
    }
    if (roles.includes("PROVINCIAL_DIRECTOR") && this.organization) {
      const myProvinces = new Set(await this.organization.provinceIds(userId));
      await Promise.all(
        directory.map(async (entry) => {
          if (entry.roles.includes("SCIENTIFIC_SUPERVISOR")) allowed.add(entry.id);
          if (entry.provinceId && myProvinces.has(entry.provinceId)) allowed.add(entry.id);
          if (await this.organization!.hasUserGrant(userId, entry.id)) allowed.add(entry.id);
        }),
      );
    }
    allowed.delete(userId);
    return allowed;
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

