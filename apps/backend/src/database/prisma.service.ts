import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Ma’lumotlar bazasiga muvaffaqiyatli ulandi.');
        break;
      } catch (err: unknown) {
        retries--;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Bazaga ulanishda xatolik yuz berdi (${retries} ta urinish qoldi): ${msg}`);
        if (retries === 0) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
