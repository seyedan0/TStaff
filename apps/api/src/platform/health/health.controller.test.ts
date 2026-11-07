import { describe, it, expect, vi } from "vitest";
import { HealthController } from "./health.controller.js";
import type { PrismaService } from "@tstaff/database";

describe("HealthController (M1 Baseline)", () => {
  it("returns status ok when database ping succeeds", async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrisma);
    const result = await controller.checkHealth();

    expect(result.status).toBe("ok");
    expect(result.database).toBe("connected");
    expect(result.version).toBe("0.1.0");
    expect(typeof result.uptime).toBe("number");
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it("returns degraded status when database ping fails", async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error("Connection refused")),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrisma);
    const result = await controller.checkHealth();

    expect(result.status).toBe("degraded");
    expect(result.database).toBe("disconnected");
    expect(result.version).toBe("0.1.0");
  });
});
