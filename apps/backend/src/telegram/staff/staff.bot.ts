import { Bot, Context } from 'grammy';
import { Logger } from '@nestjs/common';
import { ConversationsService } from '../../conversations/conversations.service';
import { MessagesService } from '../../messages/messages.service';
import { UsersService } from '../../users/users.service';
import { StatisticsService } from '../../statistics/statistics.service';
import { StaffKeyboards } from '../keyboards/staff.keyboards';
import {
  StaffSessionData,
  StaffSessionState,
} from '../types/session';
import {
  ConversationStatus,
  SenderType,
  UserRole,
} from '@psychology/types';

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Inquiry',
  ACADEMIC: 'Academic Stress',
  PERSONAL: 'Personal / Emotional',
  SOCIAL: 'Social / Relationships',
  URGENT: 'Urgent Support',
};

export class StaffBotController {
  private readonly logger = new Logger(StaffBotController.name);
  private readonly sessions = new Map<number, StaffSessionData>();

  constructor(
    private readonly bot: Bot<Context>,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
    private readonly statisticsService: StatisticsService,
  ) {
    this.registerMiddlewareAndHandlers();
  }

  private getSession(userId: number): StaffSessionData {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, { state: StaffSessionState.IDLE });
    }
    return this.sessions.get(userId)!;
  }

  private setSession(userId: number, data: Partial<StaffSessionData>) {
    const current = this.getSession(userId);
    this.sessions.set(userId, { ...current, ...data });
  }

  private resetSession(userId: number) {
    this.sessions.set(userId, { state: StaffSessionState.IDLE });
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  public async authMiddleware(ctx: Context, next: () => Promise<void>) {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    const user = await this.usersService.findByTelegramId(telegramId);

    if (!user || (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN)) {
      this.logger.warn('Unauthorized staff bot access attempt.');
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: '⛔ Access Restricted. Authorized psychology staff only.',
          show_alert: true,
        });
      } else {
        await ctx.reply(
          '⛔ *Access Restricted.*\n\nThis portal is exclusively for authorized school psychology staff.',
          { parse_mode: 'Markdown' },
        );
      }
      return; // Halt middleware pipeline
    }

    // Attach authenticated staff user to context state for subsequent handlers
    (ctx as any).staffUser = user;
    await next();
  }

  private registerMiddlewareAndHandlers() {
    // 1. Immutable Telegram User ID Authorization Middleware
    this.bot.use((ctx, next) => this.authMiddleware(ctx, next));

    // 2. /start command
    this.bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      this.resetSession(ctx.from.id);
      await this.sendMainMenu(ctx);
    });

    // 3. Callback Queries
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from?.id;
      if (!userId) return;

      if (data === 'staff:noop') {
        await ctx.answerCallbackQuery();
        return;
      }

      if (data === 'staff:home') {
        await ctx.answerCallbackQuery();
        this.resetSession(userId);
        await this.sendMainMenu(ctx);
        return;
      }

      if (data.startsWith('staff:filter:')) {
        const filter = data.substring(13);
        await ctx.answerCallbackQuery();
        await this.sendCaseList(ctx, filter, 1);
        return;
      }

      if (data.startsWith('staff:page:')) {
        const parts = data.split(':');
        const filter = parts[2] || 'ALL';
        const page = parseInt(parts[3] || '1', 10) || 1;
        await ctx.answerCallbackQuery();
        await this.sendCaseList(ctx, filter, page);
        return;
      }

      if (data.startsWith('staff:case:')) {
        const conversationId = data.substring(11);
        await ctx.answerCallbackQuery();
        await this.sendCaseDetail(ctx, conversationId);
        return;
      }

      if (data.startsWith('staff:action:respond:')) {
        const conversationId = data.substring(21);
        await ctx.answerCallbackQuery();
        await this.handleStartReply(ctx, conversationId);
        return;
      }

      if (data.startsWith('staff:action:mark_answered:')) {
        const conversationId = data.substring(27);
        await ctx.answerCallbackQuery({ text: 'Marked as Answered' });
        await this.handleMarkAnswered(ctx, conversationId);
        return;
      }

      if (data.startsWith('staff:action:close:')) {
        const conversationId = data.substring(19);
        await ctx.answerCallbackQuery({ text: 'Case Closed' });
        await this.handleCloseCase(ctx, conversationId);
        return;
      }

      if (data.startsWith('staff:students:')) {
        const page = parseInt(data.substring(15), 10) || 1;
        await ctx.answerCallbackQuery();
        await this.sendStudentsList(ctx, page);
        return;
      }

      if (data === 'staff:stats') {
        await ctx.answerCallbackQuery();
        await this.sendStats(ctx);
        return;
      }
    });

    // 4. Message Input (for responses)
    this.bot.on('message', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const session = this.getSession(userId);

      if (session.state === StaffSessionState.AWAITING_REPLY) {
        if (!ctx.message.text) {
          await ctx.reply('Please send your response as text.');
          return;
        }

        const text = ctx.message.text.trim();
        if (text.length > 4000) {
          await ctx.reply('Response is too long. Please keep it under 4000 characters.');
          return;
        }

        await this.handleSendResponse(ctx, session, text);
      }
    });
  }

  private async sendMainMenu(ctx: Context) {
    await ctx.reply(
      '🏥 *Psychology Staff Portal*\n\nManage student cases, view statistics, and review responses.',
      {
        parse_mode: 'Markdown',
        reply_markup: StaffKeyboards.mainMenu(),
      },
    );
  }

  private async sendCaseList(ctx: Context, filter: string, page: number) {
    const staffUser = (ctx as any).staffUser;
    const filterDto: any = { page, limit: 5 };

    if (filter === 'UNANSWERED') {
      filterDto.status = ConversationStatus.UNANSWERED;
    } else if (filter === 'ANSWERED') {
      filterDto.status = ConversationStatus.ANSWERED;
    }

    const result = await this.conversationsService.findAll(filterDto, staffUser);

    let title = '📥 All Cases';
    if (filter === 'UNANSWERED') title = '⏳ Unanswered Cases';
    if (filter === 'ANSWERED') title = '✅ Answered Cases';

    if (result.meta.total === 0) {
      await ctx.reply(`${title}\n\nNo cases found in this view.`, {
        reply_markup: StaffKeyboards.caseList([], filter, 1, 1),
      });
      return;
    }

    let messageText = `*${title}* (Page ${result.meta.page}/${result.meta.totalPages})\n\n`;

    for (const c of result.data) {
      const cat = CATEGORY_LABELS[c.category] || c.category;
      const relTime = this.formatRelativeTime(new Date(c.lastMessageAt || c.createdAt));
      messageText += `• *${c.caseId}* | ${cat} | ${relTime}\n`;
    }

    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.caseList(
        result.data.map((c: any) => ({ id: c.id, caseId: c.caseId })),
        filter,
        result.meta.page,
        result.meta.totalPages,
      ),
    });
  }

  private async sendCaseDetail(ctx: Context, conversationId: string) {
    const conv = await this.conversationsService.findOne(conversationId);
    const messagesResult = await this.messagesService.getMessages(conversationId, 1, 50);

    const cat = CATEGORY_LABELS[conv.category] || conv.category;
    const studentAnon = conv.student?.studentIdentifier ? `Student #${conv.student.studentIdentifier}` : 'Student';

    let statusLabel = '⏳ Unanswered';
    if (conv.status === ConversationStatus.ANSWERED) statusLabel = '✅ Answered';
    if (conv.status === ConversationStatus.CLOSED) statusLabel = '🔒 Closed';

    let text = `Case *${conv.caseId}*\n` +
      `Student: ${studentAnon}\n` +
      `Category: ${cat}\n` +
      `Status: ${statusLabel}\n` +
      `Opened: ${new Date(conv.createdAt).toLocaleString('en-US')}\n` +
      `────────────────────────\n`;

    for (const msg of messagesResult.data) {
      const timeStr = new Date(msg.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const senderHeader =
        msg.senderType === SenderType.STUDENT ? `🧑 Student (${timeStr}):` : `👩‍⚕️ Staff (${timeStr}):`;
      text += `\n${senderHeader}\n${msg.content}\n`;
    }

    text += '────────────────────────';

    const isClosed = conv.status === ConversationStatus.CLOSED;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.caseDetail(conv.id, isClosed),
    });
  }

  private async handleStartReply(ctx: Context, conversationId: string) {
    const conv = await this.conversationsService.findOne(conversationId);
    if (conv.status === ConversationStatus.CLOSED) {
      await ctx.reply('Cannot reply to a closed case.');
      return;
    }

    this.setSession(ctx.from!.id, {
      state: StaffSessionState.AWAITING_REPLY,
      activeConversationId: conv.id,
      activeCaseId: conv.caseId,
    });

    await ctx.reply(
      `Replying to Case *${conv.caseId}*.\n\nPlease type and send your response message:`,
      { parse_mode: 'Markdown' },
    );
  }

  private async handleSendResponse(
    ctx: Context,
    session: StaffSessionData,
    content: string,
  ) {
    if (!session.activeConversationId) return;
    const staffUser = (ctx as any).staffUser;

    try {
      await this.messagesService.addMessage(
        session.activeConversationId,
        { content },
        staffUser,
      );

      const caseId = session.activeCaseId || '';
      this.resetSession(ctx.from!.id);

      await ctx.reply(
        `✅ Response sent for Case *${caseId}*.\nStatus updated to *Answered*.`,
        {
          parse_mode: 'Markdown',
          reply_markup: StaffKeyboards.mainMenu(),
        },
      );
    } catch (err: any) {
      this.logger.error(`Error sending staff response: ${err.message}`, err.stack);
      await ctx.reply('An error occurred while sending the response.');
    }
  }

  private async handleMarkAnswered(ctx: Context, conversationId: string) {
    const staffUser = (ctx as any).staffUser;
    await this.conversationsService.update(
      conversationId,
      { status: ConversationStatus.ANSWERED },
      staffUser,
    );
    await this.sendCaseDetail(ctx, conversationId);
  }

  private async handleCloseCase(ctx: Context, conversationId: string) {
    const staffUser = (ctx as any).staffUser;
    await this.conversationsService.update(
      conversationId,
      { status: ConversationStatus.CLOSED },
      staffUser,
    );
    await this.sendCaseDetail(ctx, conversationId);
  }

  private async sendStudentsList(ctx: Context, page: number) {
    const result = await this.usersService.listStudents(page, 5);

    if (result.meta.total === 0) {
      await ctx.reply('No students registered yet.', {
        reply_markup: StaffKeyboards.studentsList(1, 1),
      });
      return;
    }

    let text = `👥 *Students* (Page ${result.meta.page}/${result.meta.totalPages})\n\n`;

    for (const student of result.data) {
      const code = student.studentIdentifier || 'S-????';
      const casesCount = (student as any)._count?.conversations ?? 0;
      text += `• Student #${code} — ${casesCount} case(s)\n`;
    }

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.studentsList(result.meta.page, result.meta.totalPages),
    });
  }

  private async sendStats(ctx: Context) {
    const stats = await this.statisticsService.getDashboardStatistics();

    const text =
      `📊 *Support Portal Statistics*\n\n` +
      `• Total Cases: *${stats.totalConversations}*\n` +
      `• ⏳ Unanswered: *${stats.unansweredCount}*\n` +
      `• ✅ Answered: *${stats.answeredCount}*\n` +
      `• 🔒 Closed: *${stats.closedCount}*\n` +
      `• Recent Activity (24h): *${stats.recentActivityCount}*\n` +
      `• Avg Response Time: *${stats.averageResponseTimeMinutes} min*`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.statsView(),
    });
  }
}
