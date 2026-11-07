import type { OutboxEventHandler } from "./handler.interface.js";

export class HandlerRegistry {
  private handlers = new Map<string, OutboxEventHandler>();

  register(handler: OutboxEventHandler): this {
    this.handlers.set(handler.eventType, handler);
    return this;
  }

  get(eventType: string): OutboxEventHandler | undefined {
    return this.handlers.get(eventType);
  }

  has(eventType: string): boolean {
    return this.handlers.has(eventType);
  }

  registeredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

