export class MessagingDomainError extends Error {
  public readonly isDomainError = true;
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "MessagingDomainError";
  }
}

export class ConversationNotFoundError extends MessagingDomainError {
  constructor(id: string) {
    super(`گفت‌وگو با شناسه ${id} یافت نشد`, "CONVERSATION_NOT_FOUND");
  }
}

export class MessageUnauthorizedError extends MessagingDomainError {
  constructor() {
    super(
      "ارسال یا مشاهده پیام فقط برای اعضای این گفت‌وگو مجاز است",
      "FORBIDDEN",
    );
  }
}

export class InvalidConversationParticipantsError extends MessagingDomainError {
  constructor(message: string) {
    super(message, "INVALID_CONVERSATION_PARTICIPANTS");
  }
}

export class GroupChatNotAllowedError extends MessagingDomainError {
  constructor() {
    super(
      "گفت‌وگوهای گروهی و تالارهای عمومی خارج از محدوده فاز اول است (BR-16)",
      "GROUP_CHAT_NOT_ALLOWED",
    );
  }
}

