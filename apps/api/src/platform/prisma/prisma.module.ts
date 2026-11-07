import { Global, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: () => {
        return new PrismaService();
      },
    },
  ],
  exports: [PrismaService],
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
