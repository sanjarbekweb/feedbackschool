import { Injectable } from '@nestjs/common';
import { ConversationStatus, DashboardStatistics } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStatistics(): Promise<DashboardStatistics> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalConversations,
      unansweredCount,
      inProgressCount,
      answeredCount,
      closedCount,
      recentActivityCount,
      responseTimeRows,
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { status: ConversationStatus.UNANSWERED } }),
      this.prisma.conversation.count({ where: { status: ConversationStatus.IN_PROGRESS } }),
      this.prisma.conversation.count({ where: { status: ConversationStatus.ANSWERED } }),
      this.prisma.conversation.count({ where: { status: ConversationStatus.CLOSED } }),
      this.prisma.conversation.count({ where: { lastMessageAt: { gte: twentyFourHoursAgo } } }),
      this.prisma.$queryRaw<Array<{ minutes: number | null }>>`
        WITH first_responses AS (
          SELECT
            "conversationId",
            MIN("createdAt") FILTER (WHERE "senderType" = 'STUDENT'::"SenderType") AS first_student_at,
            MIN("createdAt") FILTER (WHERE "senderType" = 'STAFF'::"SenderType") AS first_staff_at
          FROM "messages"
          GROUP BY "conversationId"
        )
        SELECT AVG(
          EXTRACT(EPOCH FROM (first_staff_at - first_student_at)) / 60
        )::double precision AS minutes
        FROM first_responses
        WHERE first_staff_at IS NOT NULL
          AND first_student_at IS NOT NULL
          AND first_staff_at >= first_student_at
      `,
    ]);

    const averageResponseTimeMinutes = responseTimeRows[0]?.minutes;

    return {
      totalConversations,
      unansweredCount,
      inProgressCount,
      answeredCount,
      closedCount,
      averageResponseTimeMinutes:
        averageResponseTimeMinutes === null || averageResponseTimeMinutes === undefined
          ? null
          : Math.round(averageResponseTimeMinutes),
      recentActivityCount,
    };
  }
}
