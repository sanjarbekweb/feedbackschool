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
        await this.syncStandardRoles();
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

  async syncStandardRoles() {
    const roles = [
      { id: 'principal', name: 'Direktor' },
      { id: 'psychologist', name: 'Psixolog' },
      { id: 'counselor', name: 'Maktab maslahatchi' },
      { id: 'mmibdo', name: "MMIBDO'" },
      { id: 'otibdo', name: "O'TIBDO'" },
    ];
    for (const r of roles) {
      await this.staffRole
        .upsert({
          where: { id: r.id },
          update: { name: r.name, isActive: true },
          create: { id: r.id, name: r.name, isActive: true },
        })
        .catch((e: any) => this.logger.warn(`Lavozimni sinxronlashda ogohlantirish (${r.id}): ${e?.message}`));
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
