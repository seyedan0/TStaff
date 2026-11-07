import { NotificationEventPayloadSchema } from "@tstaff/contracts";
import type { OutboxEventHandler } from "./handler.interface.js";

export interface NotificationWriterPort {
  createNotification(data: {
    userId: string;
    type: string;
    title: string;
    body: string;
    isCritical: boolean;
  }): Promise<void>;
}

export class NotificationDispatcherHandler implements OutboxEventHandler {
  public readonly eventType = "NOTIFICATION_EVENT";

  constructor(private readonly writer: NotificationWriterPort) {}

  async handle(payload: unknown, _eventId: string): Promise<void> {
    const validated = NotificationEventPayloadSchema.parse(payload);

    await this.writer.createNotification({
      userId: validated.userId,
      type: validated.type,
      title: validated.title,
      body: validated.body,
      isCritical: validated.isCritical ?? false,
    });

    if (validated.isCritical) {
      // D-04: Critical notification immediate dispatch trigger
      process.stdout.write(
        JSON.stringify({
          level: "warn",
          context: "NotificationDispatcher",
          message: `CRITICAL notification dispatched to user ${validated.userId}: ${validated.title}`,
        }) + "\n",
      );
    }
  }
}

