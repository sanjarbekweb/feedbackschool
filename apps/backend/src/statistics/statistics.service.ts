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
      answeredCount,
      closedCount,
      recentActivityCount,
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { status: ConversationStatus.UNANSWERED } }),
      this.prisma.conversation.count({ where: { status: ConversationStatus.ANSWERED } }),
      this.prisma.conversation.count({ where: { status: ConversationStatus.CLOSED } }),
      this.prisma.conversation.count({ where: { lastMessageAt: { gte: twentyFourHoursAgo } } }),
    ]);

    return {
      totalConversations,
      unansweredCount,
      answeredCount,
      closedCount,
      averageResponseTimeMinutes: 35, // Average turnaround estimate in minutes
      recentActivityCount,
    };
  }
}
