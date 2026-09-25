import { persistentSession } from '../utils/session-middleware';
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
import { splitTelegramText } from '../utils/telegram-text';
import { ConversationFilterDto } from '../../conversations/dto/conversation-filter.dto';
import {
  ConversationStatus,
  CurrentUser,
  SenderType,
  UserRole,
} from '@psychology/types';

type StaffContext = Context & { staffUser?: CurrentUser };

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'Umumiy savol',
  ACADEMIC: 'O‘qish',
  PERSONAL: 'Shaxsiy masala',
  SOCIAL: 'Munosabatlar',
  URGENT: 'Shoshilinch yordam',
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
    this.bot.use(persistentSession('staff', this.sessions, this.usersService));
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
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} soat oldin`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} kun oldin`;
  }

  public async authMiddleware(ctx: Context, next: () => Promise<void>) {
    if (!ctx.from) return;

    const telegramId = String(ctx.from.id);
    const user = await this.usersService.findByTelegramId(telegramId);

    if (!user || !user.isActive || (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN)) {
      this.logger.warn('Unauthorized staff bot access attempt.');
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({
          text: '⛔ Kirish uchun ruxsat kerak.',
          show_alert: true,
        });
      } else {
        await ctx.reply(
          '⛔ *Ruxsat yo‘q.*\n\nKirish uchun administratorga murojaat qiling.',
          { parse_mode: 'Markdown' },
        );
      }
      return; // Halt middleware pipeline
    }

    // Attach authenticated staff user to context state for subsequent handlers
    (ctx as StaffContext).staffUser = user;
    await next();
  }

  private requireStaffUser(ctx: Context): CurrentUser {
    const user = (ctx as StaffContext).staffUser;
    if (!user) {
      throw new Error('Authenticated staff context is missing.');
    }
    return user;
  }

  private registerMiddlewareAndHandlers() {
    this.bot.command('id', async ctx => {
      if (ctx.from && ctx.chat?.type === 'private') await ctx.reply(`Telegram ID: ${ctx.from.id}`);
    });
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

      if (data.startsWith('staff:history:')) {
        const [, , id = '', pageText = '1'] = data.split(':');
        await ctx.answerCallbackQuery();
        await this.sendCaseDetail(ctx, id, Math.max(1, parseInt(pageText, 10) || 1));
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
        await ctx.answerCallbackQuery({ text: 'Javob berilgan deb belgilandi' });
        await this.handleMarkAnswered(ctx, conversationId);
        return;
      }

      if (data.startsWith('staff:action:close:')) {
        const conversationId = data.substring(19);
        await ctx.answerCallbackQuery({ text: 'Murojaat yopildi' });
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
          await ctx.reply('Faqat matn yuboring.');
          return;
        }

        const text = ctx.message.text.trim();
        if (text.length > 4000) {
          await ctx.reply('Javob 4000 belgidan oshmasin.');
          return;
        }

        await this.handleSendResponse(ctx, session, text);
      }
    });
  }

  private async sendMainMenu(ctx: Context) {
    await ctx.reply(
      '🏥 *Xodimlar paneli*\n\nManage student cases, view statistics, and review responses.',
      {
        parse_mode: 'Markdown',
        reply_markup: StaffKeyboards.mainMenu(),
      },
    );
  }

  private async sendCaseList(ctx: Context, filter: string, page: number) {
    const staffUser = this.requireStaffUser(ctx);
    const filterDto: ConversationFilterDto = { page, limit: 5 };

    if (filter === 'UNANSWERED') {
      filterDto.status = ConversationStatus.UNANSWERED;
    } else if (filter === 'ANSWERED') {
      filterDto.status = ConversationStatus.ANSWERED;
    }

    const result = await this.conversationsService.findAll(filterDto, staffUser);

    let title = '📥 Barcha murojaatlar';
    if (filter === 'UNANSWERED') title = '⏳ Javob kutilmoqda';
    if (filter === 'ANSWERED') title = '✅ Javob berilganlar';

    if (result.meta.total === 0) {
      await ctx.reply(`${title}\n\nMurojaat yo‘q.`, {
        reply_markup: StaffKeyboards.caseList([], filter, 1, 1),
      });
      return;
    }

    let messageText = `*${title}* (Sahifa ${result.meta.page}/${result.meta.totalPages})\n\n`;

    for (const c of result.data) {
      const cat = CATEGORY_LABELS[c.category] || c.category;
      const relTime = this.formatRelativeTime(new Date(c.lastMessageAt || c.createdAt));
      messageText += `• *${c.caseId}* | ${cat} | ${relTime}\n`;
    }

    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.caseList(
        result.data.map((c) => ({ id: c.id, caseId: c.caseId })),
        filter,
        result.meta.page,
        result.meta.totalPages,
      ),
    });
  }

  private async sendCaseDetail(ctx: Context, conversationId: string, page = 1) {
    const conv = await this.conversationsService.findOne(conversationId, this.requireStaffUser(ctx));
    const messagesResult = await this.messagesService.getMessages(conversationId, page, 5);

    const cat = CATEGORY_LABELS[conv.category] || conv.category;
    const studentAnon = conv.student?.studentIdentifier ? `O‘quvchi #${conv.student.studentIdentifier}` : 'O‘quvchi';

    let statusLabel = '⏳ Javob kutilmoqda';
    if (conv.status === ConversationStatus.ANSWERED) statusLabel = '✅ Javob berilgan';
    if (conv.status === ConversationStatus.CLOSED) statusLabel = '🔒 Yopilgan';

    let text = `Murojaat ${conv.caseId}\n` +
      `O‘quvchi: ${studentAnon}\n` +
      `Mavzu: ${cat}\n` +
      `Holat: ${statusLabel}\n` +
      `────────────────────────\n`;

    for (const msg of messagesResult.data) {
      const senderHeader = msg.senderType === SenderType.STUDENT ? '🧑 O‘quvchi:' : '💬 Xodim:';
      text += `\n${senderHeader}\n${msg.content}\n`;
    }

    text += '────────────────────────';

    const isClosed = conv.status === ConversationStatus.CLOSED;

    const chunks = splitTelegramText(text);
    for (const [index, chunk] of chunks.entries()) {
      await ctx.reply(
        chunk,
        index === chunks.length - 1
          ? { reply_markup: StaffKeyboards.caseDetail(conv.id, isClosed, messagesResult.meta.page, messagesResult.meta.totalPages) }
          : undefined,
      );
    }
  }

  private async handleStartReply(ctx: Context, conversationId: string) {
    const conv = await this.conversationsService.findOne(conversationId, this.requireStaffUser(ctx));
    if (conv.status === ConversationStatus.CLOSED) {
      await ctx.reply('Murojaat yopilgan.');
      return;
    }

    this.setSession(ctx.from!.id, {
      state: StaffSessionState.AWAITING_REPLY,
      activeConversationId: conv.id,
      activeCaseId: conv.caseId,
    });

    await ctx.reply(
      `${conv.caseId}: javobingizni yozing.`,
      { parse_mode: 'Markdown' },
    );
  }

  private async handleSendResponse(
    ctx: Context,
    session: StaffSessionData,
    content: string,
  ) {
    if (!session.activeConversationId) return;
    const staffUser = this.requireStaffUser(ctx);

    try {
      await this.messagesService.addMessage(
        session.activeConversationId,
        { content },
        staffUser,
        ctx.update?.update_id === undefined ? undefined : `staff:${ctx.update.update_id}`,
      );

      const caseId = session.activeCaseId || '';
      this.resetSession(ctx.from!.id);

      await ctx.reply(
        `✅ ${caseId}: javob yuborildi.`,
        {
          parse_mode: 'Markdown',
          reply_markup: StaffKeyboards.mainMenu(),
        },
      );
    } catch {
      this.logger.error('Bot amalini bajarib bo‘lmadi.');
      await ctx.reply('Javob yuborilmadi. Qayta urinib ko‘ring.');
    }
  }

  private async handleMarkAnswered(ctx: Context, conversationId: string) {
    const staffUser = this.requireStaffUser(ctx);
    await this.conversationsService.update(
      conversationId,
      { status: ConversationStatus.ANSWERED },
      staffUser,
    );
    await this.sendCaseDetail(ctx, conversationId);
  }

  private async handleCloseCase(ctx: Context, conversationId: string) {
    const staffUser = this.requireStaffUser(ctx);
    await this.conversationsService.update(
      conversationId,
      { status: ConversationStatus.CLOSED },
      staffUser,
    );
    await this.sendCaseDetail(ctx, conversationId);
  }

  private async sendStudentsList(ctx: Context, page: number) {
    const result = await this.usersService.listStudents(page, 5, this.requireStaffUser(ctx));

    if (result.meta.total === 0) {
      await ctx.reply('Hali o‘quvchi yo‘q.', {
        reply_markup: StaffKeyboards.studentsList(1, 1),
      });
      return;
    }

    let text = `👥 *O‘quvchilar* (Sahifa ${result.meta.page}/${result.meta.totalPages})\n\n`;

    for (const student of result.data) {
      const code = student.studentIdentifier || 'S-????';
      const casesCount = student._count.conversations;
      text += `• O‘quvchi #${code} — ${casesCount} ta murojaat\n`;
    }

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.studentsList(result.meta.page, result.meta.totalPages),
    });
  }

  private async sendStats(ctx: Context) {
    const stats = await this.statisticsService.getDashboardStatistics(this.requireStaffUser(ctx));

    const text =
      `📊 *Statistika*\n\n` +
      `• Jami murojaatlar: *${stats.totalConversations}*\n` +
      `• ⏳ Javob kutilmoqda: *${stats.unansweredCount}*\n` +
      `• ✅ Javob berilgan: *${stats.answeredCount}*\n` +
      `• 🔒 Yopilgan: *${stats.closedCount}*\n` +
      `• So‘nggi 24 soatda: *${stats.recentActivityCount}*\n` +
      `• O‘rtacha javob vaqti: *${stats.averageResponseTimeMinutes ?? '—'} daqiqa*`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: StaffKeyboards.statsView(),
    });
  }
}
