import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@tstaff/database';
import type { HealthResponse } from '@tstaff/contracts';

@ApiTags('Platform')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'بررسی وضعیت سلامت سرور و پایگاه داده (M1 Health Check)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'وضعیت کارکرد صحیح سرویس و ارتباط با دیتابیس',
  })
  async checkHealth(): Promise<HealthResponse> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      // Fast ping query
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: '0.1.0',
      database: dbStatus,
    };
  }
}
