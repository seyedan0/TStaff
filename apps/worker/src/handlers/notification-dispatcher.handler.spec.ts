import { describe, it, expect, vi } from "vitest";
import {
  NotificationDispatcherHandler,
  type NotificationWriterPort,
} from "./notification-dispatcher.handler.js";

describe("NotificationDispatcherHandler (D-04, FR-060, AT-32)", () => {
  it("dispatches notification and persists through writer", async () => {
    const writer: NotificationWriterPort = {
      createNotification: vi.fn().mockResolvedValue(undefined),
    };
    const handler = new NotificationDispatcherHandler(writer);

    await handler.handle(
      {
        userId: "11111111-1111-1111-1111-111111111111",
        type: "STAGE_SUBMITTED",
        title: "گزارش ثبت شد",
        body: "گزارش مرحله تبیین با موفقیت ثبت گردید.",
        isCritical: false,
      },
      "ev-notif-1",
    );

    expect(writer.createNotification).toHaveBeenCalledWith({
      userId: "11111111-1111-1111-1111-111111111111",
      type: "STAGE_SUBMITTED",
      title: "گزارش ثبت شد",
      body: "گزارش مرحله تبیین با موفقیت ثبت گردید.",
      isCritical: false,
    });
  });

  it("handles critical notifications with immediate push priority", async () => {
    const writer: NotificationWriterPort = {
      createNotification: vi.fn().mockResolvedValue(undefined),
    };
    const handler = new NotificationDispatcherHandler(writer);

    await handler.handle(
      {
        userId: "22222222-2222-2222-2222-222222222222",
        type: "USER_SUSPENDED",
        title: "تعلیق حساب کاربری",
        body: "حساب شما تعلیق شد.",
        isCritical: true,
      },
      "ev-notif-2",
    );

    expect(writer.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ isCritical: true }),
    );
  });
});

