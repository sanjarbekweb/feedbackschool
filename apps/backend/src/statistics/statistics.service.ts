import { Injectable } from '@nestjs/common';
import { CurrentUser, DashboardStatistics, UserRole } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}
  async getDashboardStatistics(actor?: CurrentUser): Promise<DashboardStatistics> {
    const admin = actor?.role === UserRole.ADMIN;
    const roleId = actor?.staffRoleId || '__unassigned__';
    const [row] = await this.prisma.$queryRaw<DashboardStatistics[]>`
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
    `;
    if (!row) throw new Error('Statistika hisoblanmadi.');
    return row;
  }
}
