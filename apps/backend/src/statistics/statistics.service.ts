import { Injectable } from '@nestjs/common';
import { CurrentUser, DashboardStatistics, UserRole } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';
import { InMemoryCacheService } from '../common/cache/in-memory-cache.service';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: InMemoryCacheService,
  ) {}

  invalidateCache() {
    this.cache.invalidateTags('statistics');
  }

  async getDashboardStatistics(actor?: CurrentUser): Promise<DashboardStatistics> {
    const admin = actor?.role === UserRole.ADMIN;
    const roleId = actor?.staffRoleId || '__unassigned__';
    const cacheKey = `stats:${admin ? 'admin' : `role:${roleId}`}`;

    const cached = this.cache.get<DashboardStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    const [[row], totalStudents, categoryRows, dutyStaff] = await Promise.all([
      this.prisma.$queryRaw<DashboardStatistics[]>`
        WITH scoped AS (
          SELECT * FROM conversations WHERE (${admin} OR "recipientRoleId" = ${roleId})
        ), responses AS (
          SELECT m."conversationId",
            MIN(m."createdAt") FILTER (WHERE m."senderType" = 'STUDENT') AS student_at,
            MIN(m."createdAt") FILTER (WHERE m."senderType" = 'STAFF') AS staff_at
          FROM messages m JOIN scoped c ON c.id = m."conversationId" GROUP BY m."conversationId"
        )
        SELECT COUNT(*)::int AS "totalConversations",
          COUNT(*) FILTER (WHERE status = 'UNANSWERED')::int AS "unansweredCount",
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS "inProgressCount",
          COUNT(*) FILTER (WHERE status = 'ANSWERED')::int AS "answeredCount",
          COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS "closedCount",
          COUNT(*) FILTER (WHERE "lastMessageAt" >= NOW() - INTERVAL '24 hours')::int AS "recentActivityCount",
          (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (staff_at - student_at)) / 60))::int
            FROM responses WHERE staff_at >= student_at) AS "averageResponseTimeMinutes"
        FROM scoped
      `,
      this.prisma.user.count({
        where: { role: UserRole.STUDENT },
      }),
      this.prisma.$queryRaw<{ category: string; count: number }[]>`
        SELECT category, COUNT(*)::int as count
        FROM conversations
        WHERE (${admin} OR "recipientRoleId" = ${roleId})
        GROUP BY category
      `,
      this.prisma.staffRole.findFirst({
        where: { isActive: true },
        include: {
          users: {
            where: { isActive: true },
            select: { displayName: true },
            take: 1,
          },
        },
      }),
    ]);

    if (!row) throw new Error('Statistika hisoblanmadi.');

    const categoryBreakdown: Record<string, number> = {
      GENERAL: 0,
      ACADEMIC: 0,
      PERSONAL: 0,
      SOCIAL: 0,
      URGENT: 0,
    };
    for (const cat of categoryRows) {
      if (cat.category in categoryBreakdown) {
        categoryBreakdown[cat.category] = cat.count;
      }
    }

    const dutyRole = dutyStaff
      ? dutyStaff.users[0]?.displayName
        ? `${dutyStaff.name} (${dutyStaff.users[0].displayName})`
        : dutyStaff.name
      : 'Psixolog';

    const result: DashboardStatistics = {
      ...row,
      totalStudents,
      categoryBreakdown,
      dutyRole,
    };

    this.cache.set(cacheKey, result, 60, ['statistics']);

    return result;
  }
}

