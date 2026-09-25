import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, NotificationJob } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type StaffGroupNotifier = (text: string, telegramId?: string) => Promise<void>;
export type StudentNotifier = (telegramId: string, caseId: string, text: string) => Promise<void>;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private staffGroupNotifier?: StaffGroupNotifier;
  private studentNotifier?: StudentNotifier;
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}
  registerStaffGroupNotifier(notifier: StaffGroupNotifier) { this.staffGroupNotifier = notifier; }
  registerStudentNotifier(notifier: StudentNotifier) { this.studentNotifier = notifier; }

  async enqueueStaff(tx: Prisma.TransactionClient, roleId: string, caseId: string) {
    const staff = await tx.user.findMany({ where: { staffRoleId: roleId, role: 'STAFF', isActive: true, telegramId: { not: null } }, select: { id: true } });
    if (staff.length) await tx.notificationJob.createMany({ data: staff.map(user => ({ kind: 'STAFF', target: user.id, caseId })) });
  }
  async enqueueStudent(tx: Prisma.TransactionClient, telegramId: string, caseId: string) {
    await tx.notificationJob.create({ data: { kind: 'STUDENT', target: telegramId, caseId } });
  }
  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.running) this.running = this.drain().catch(() => {
        this.logger.error('Bildirishnoma navbatini qayta ishlashda xato.');
      }).finally(() => { this.running = undefined; });
    }, 1000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  async drain() {
    if (!this.staffGroupNotifier || !this.studentNotifier) return;
    // Lease jobs without holding a transaction open during network calls.
    const jobs = await this.prisma.$queryRaw<NotificationJob[]>`
      UPDATE "notification_jobs" SET "availableAt" = NOW() + INTERVAL '5 minutes'
      WHERE id IN (
        SELECT id FROM "notification_jobs" WHERE "availableAt" <= NOW() AND attempts < 12
        ORDER BY "availableAt", "createdAt" LIMIT 10 FOR UPDATE SKIP LOCKED
      ) RETURNING *
    `;
    await Promise.all(jobs.map(job => this.deliver(job)));
  }
  private async deliver(job: NotificationJob) {
    try {
      if (job.kind === 'STAFF') {
        const user = await this.prisma.user.findUnique({ where: { id: job.target } });
        const conversation = await this.prisma.conversation.findUnique({ where: { caseId: job.caseId }, select: { recipientRoleId: true } });
        if (user?.isActive && user.role === 'STAFF' && user.telegramId && user.staffRoleId === conversation?.recipientRoleId) {
          await this.staffGroupNotifier!(`🔔 Yangi xabar: ${job.caseId}\nMurojaatni bot yoki panelda oching.`, user.telegramId);
        }
      } else {
        await this.studentNotifier!(job.target, job.caseId, `📩 ${job.caseId}: javob keldi.`);
      }
      await this.prisma.notificationJob.delete({ where: { id: job.id } });
    } catch (error: unknown) {
      const retry = (error as { parameters?: { retry_after?: number } }).parameters?.retry_after;
      const seconds = Math.max(retry || 0, Math.min(3600, 2 ** (job.attempts + 1)));
      await this.prisma.notificationJob.update({ where: { id: job.id }, data: {
        attempts: { increment: 1 }, availableAt: new Date(Date.now() + seconds * 1000),
      } });
      this.logger.warn(job.attempts >= 11 ? 'Bildirishnoma yuborilmadi; navbatni tekshiring.' : 'Bildirishnoma qayta yuboriladi.');
    }
  }
}
