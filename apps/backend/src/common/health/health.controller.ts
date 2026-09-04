import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        service: 'psychology-support-backend',
        uptime: process.uptime(),
      });
    } catch (error: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'degraded',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
        service: 'psychology-support-backend',
      });
    }
  }
}
