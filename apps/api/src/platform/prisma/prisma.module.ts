import { Global, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { TRANSACTION_RUNNER } from "../transactions/transaction-runner.js";

@Global()
@Module({
  providers: [
    {
      provide: TRANSACTION_RUNNER,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({ run: <T>(operation: () => Promise<T>) => prisma.runInTransaction(operation) }),
    },
    {
      provide: PrismaService,
      useFactory: () => {
        return new PrismaService();
      },
    },
  ],
  exports: [PrismaService, TRANSACTION_RUNNER],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Attempt soft connection; don't crash app bootstrap if DB is starting up
    try {
      await this.prisma.$connect();
    } catch {
      // Handled by health check
    }
  }

  async onModuleDestroy() {
    await this.prisma?.$disconnect();
  }
}
