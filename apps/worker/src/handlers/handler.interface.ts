export interface OutboxEventHandler {
  readonly eventType: string;
  handle(payload: unknown, eventId: string): Promise<void>;
}

