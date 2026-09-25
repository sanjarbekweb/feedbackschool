import { persistentSession } from '../utils/session-middleware';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { Logger } from '@nestjs/common';
import { ConversationsService } from '../../conversations/conversations.service';
import { MessagesService } from '../../messages/messages.service';
import { UsersService } from '../../users/users.service';
import { StudentKeyboards } from '../keyboards/student.keyboards';
import {
  StudentSessionData,
  StudentSessionState,
} from '../types/session';
import { splitTelegramText } from '../utils/telegram-text';
import {
  ConversationCategory,
  ConversationStatus,
  SenderType,
  UserRole,
} from '@psychology/types';

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'Umumiy savol',
  ACADEMIC: 'O‘qish',
  PERSONAL: 'Shaxsiy masala',
  SOCIAL: 'Munosabatlar',
  URGENT: 'Shoshilinch yordam',
};

export class StudentBotController {
  private readonly logger = new Logger(StudentBotController.name);
  private readonly sessions = new Map<number, StudentSessionData>();

  constructor(
    private readonly bot: Bot<Context>,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {
    this.bot.use(persistentSession('student', this.sessions, this.usersService));
    this.registerHandlers();
  }

  private getSession(userId: number): StudentSessionData {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, { state: StudentSessionState.IDLE });
    }
    return this.sessions.get(userId)!;
  }

  private setSession(userId: number, data: Partial<StudentSessionData>) {
    const current = this.getSession(userId);
    this.sessions.set(userId, { ...current, ...data });
  }

  private resetSession(userId: number) {
    this.sessions.set(userId, { state: StudentSessionState.IDLE });
  }

  private registerHandlers() {
    // /start command
    this.bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      this.resetSession(ctx.from.id);
      await this.sendMainMenu(ctx);
    });

    // Reply keyboard triggers
    this.bot.hears('📝 Xabar yozish', async (ctx) => {
      if (!ctx.from) return;
      await this.sendRecipients(ctx);
    });

    this.bot.hears('📨 Mening xabarlarim', async (ctx) => {
      if (!ctx.from) return;
      this.resetSession(ctx.from.id);
      await this.sendConversationsList(ctx, 1);
    });

    // Callback queries
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from?.id;
      if (!userId) return;

      if (data === 'student:noop') {
        await ctx.answerCallbackQuery();
        return;
      }

      if (data === 'student:home') {
        await ctx.answerCallbackQuery();
        this.resetSession(userId);
        await this.sendMainMenu(ctx);
        return;
      }

      if (data === 'student:cancel') {
        await ctx.answerCallbackQuery({ text: 'Bekor qilindi' });
        this.resetSession(userId);
        await ctx.reply('Bekor qilindi.');
        await this.sendMainMenu(ctx);
        return;
      }

      if (data.startsWith('recipient:')) {
        const roleId = data.substring(10);
        const roles = await this.usersService.listRoles(true);
        if (!roles.some(role => role.id === roleId)) {
          await ctx.answerCallbackQuery({ text: 'Qabul qiluvchi mavjud emas.' });
          return;
        }
        this.setSession(userId, { state: StudentSessionState.AWAITING_CATEGORY, recipientRoleId: roleId });
        await ctx.answerCallbackQuery();
        await ctx.reply('Mavzuni tanlang:', { reply_markup: StudentKeyboards.categories() });
        return;
      }

      if (data.startsWith('cat:')) {
        const category = data.substring(4) as ConversationCategory;
        if (!Object.values(ConversationCategory).includes(category) || !this.getSession(userId).recipientRoleId) {
          await ctx.answerCallbackQuery({ text: 'Avval qabul qiluvchini tanlang.' });
          return;
        }
        await ctx.answerCallbackQuery();
        this.setSession(userId, {
          state: StudentSessionState.AWAITING_INITIAL_MESSAGE,
          selectedCategory: category,
        });

        const label = CATEGORY_LABELS[category] || category;
        await ctx.reply(
          `Mavzu: ${label}
Xabaringizni yozing.`,
          { parse_mode: 'Markdown' },
        );
        return;
      }

      if (data === 'student:list') {
        await ctx.answerCallbackQuery();
        await this.sendConversationsList(ctx, 1);
        return;
      }

      if (data.startsWith('student:page:')) {
        const page = parseInt(data.substring(13), 10) || 1;
        await ctx.answerCallbackQuery();
        await this.sendConversationsList(ctx, page);
        return;
      }

      if (data.startsWith('student:history:')) {
        const [, , id = '', pageText = '1'] = data.split(':');
        await ctx.answerCallbackQuery();
        await this.sendConversationDetail(ctx, id, Math.max(1, parseInt(pageText, 10) || 1));
        return;
      }

      if (data.startsWith('student:case:')) {
        const conversationId = data.substring(13);
        await ctx.answerCallbackQuery();
        await this.sendConversationDetail(ctx, conversationId);
        return;
      }

      if (data.startsWith('student:reply:')) {
        const conversationId = data.substring(14);
        await ctx.answerCallbackQuery();
        await this.handleStartReply(ctx, conversationId);
        return;
      }
    });

    // Text & generic message input handling
    this.bot.on('message', async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const session = this.getSession(userId);

      // Handle non-text messages in input states
      if (
        session.state === StudentSessionState.AWAITING_INITIAL_MESSAGE ||
        session.state === StudentSessionState.AWAITING_FOLLOWUP_MESSAGE
      ) {
        if (!ctx.message.text) {
          await ctx.reply(
            'Faqat matn yuboring.',
          );
          return;
        }

        const text = ctx.message.text.trim();
        if (text.length > 4000) {
          await ctx.reply(
            'Xabar 4000 belgidan oshmasin.',
          );
          return;
        }

        if (session.state === StudentSessionState.AWAITING_INITIAL_MESSAGE) {
          await this.handleCreateConversation(ctx, session, text);
          return;
        }

        if (session.state === StudentSessionState.AWAITING_FOLLOWUP_MESSAGE) {
          await this.handleSendFollowup(ctx, session, text);
          return;
        }
      }
    });
  }

  private async sendRecipients(ctx: Context) {
    if (!ctx.from) return;
    this.resetSession(ctx.from.id);
    const roles = await this.usersService.listRoles(true);
    if (!roles.length) { await ctx.reply('Hozircha qabul qiluvchi yo‘q. Keyinroq urinib ko‘ring.'); return; }
    const keyboard = new InlineKeyboard();
    for (const role of roles) keyboard.text(role.name, `recipient:${role.id}`).row();
    keyboard.text('Bekor qilish', 'student:cancel');
    await ctx.reply('Kimga yozmoqchisiz?', { reply_markup: keyboard });
  }

  private async sendMainMenu(ctx: Context) {
    await ctx.reply(
      'Assalomu alaykum! Maktab xodimlariga shu yerda yozishingiz mumkin.',
      { reply_markup: StudentKeyboards.mainMenu() },
    );
  }

  private async sendConversationsList(ctx: Context, page: number) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);

    const result = await this.conversationsService.findAll(
      { page, limit: 5 },
      { id: studentUser.id, role: UserRole.STUDENT, telegramId },
    );

    if (result.meta.total === 0) {
      await ctx.reply(
        'Hali xabar yo‘q. «📝 Xabar yozish»ni bosing.',
        { reply_markup: StudentKeyboards.mainMenu() },
      );
      return;
    }

    const messageText = `📨 *Mening xabarlarim* (Sahifa ${result.meta.page}/${result.meta.totalPages})\n\nMurojaatni tanlang:`;

    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: StudentKeyboards.conversationList(
        result.data.map((c) => ({
          id: c.id,
          caseId: c.caseId,
          status: c.status,
        })),
        result.meta.page,
        result.meta.totalPages,
      ),
    });
  }

  private async sendConversationDetail(ctx: Context, conversationId: string, page = 1) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);

    const conv = await this.conversationsService.findOne(conversationId);

    // Strict ownership verification: students can only access their own cases!
    if (conv.studentId !== studentUser.id) {
      await ctx.reply('Murojaat topilmadi.');
      return;
    }

    const messagesResult = await this.messagesService.getMessages(conversationId, page, 5);

    const categoryLabel = CATEGORY_LABELS[conv.category] || conv.category;
    let statusLabel = '⏳ Javob kutilmoqda';
    if (conv.status === ConversationStatus.ANSWERED) {
      statusLabel = '💬 Javob keldi';
    } else if (conv.status === ConversationStatus.CLOSED) {
      statusLabel = '🔒 Yopilgan';
    }

    let text = `Murojaat ${conv.caseId}\nHolat: ${statusLabel}\nMavzu: ${categoryLabel}\n────────────────────────\n`;

    for (const msg of messagesResult.data) {
      const senderHeader = msg.senderType === SenderType.STUDENT ? '🧑 Siz:' : '💬 Xodim:';
      text += `\n${senderHeader}\n${msg.content}\n`;
    }

    text += '────────────────────────';

    const isClosed = conv.status === ConversationStatus.CLOSED;

    const chunks = splitTelegramText(text);
    for (const [index, chunk] of chunks.entries()) {
      await ctx.reply(
        chunk,
        index === chunks.length - 1
          ? { reply_markup: StudentKeyboards.conversationDetail(conv.id, isClosed, messagesResult.meta.page, messagesResult.meta.totalPages) }
          : undefined,
      );
    }
  }

  private async handleStartReply(ctx: Context, conversationId: string) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);

    const conv = await this.conversationsService.findOne(conversationId);
    if (conv.studentId !== studentUser.id) {
      await ctx.reply('Murojaat topilmadi.');
      return;
    }

    if (conv.status === ConversationStatus.CLOSED) {
      await ctx.reply('Murojaat yopilgan. Yangi murojaat yuborishingiz mumkin.');
      return;
    }

    this.setSession(ctx.from.id, {
      state: StudentSessionState.AWAITING_FOLLOWUP_MESSAGE,
      activeConversationId: conv.id,
      activeCaseId: conv.caseId,
    });

    await ctx.reply(
      `${conv.caseId}: xabaringizni yozing.`,
      { parse_mode: 'Markdown' },
    );
  }

  private async handleCreateConversation(
    ctx: Context,
    session: StudentSessionData,
    initialMessage: string,
  ) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const category = session.selectedCategory || ConversationCategory.GENERAL;

    try {
      const conv = await this.conversationsService.createConversation({
        studentTelegramId: telegramId,
        recipientRoleId: session.recipientRoleId,
        category,
        initialMessage,
      }, undefined, ctx.update?.update_id === undefined ? undefined : `student:${ctx.update.update_id}`);

      this.resetSession(ctx.from.id);


      await ctx.reply(
        `✅ ${conv.caseId}: xabaringiz yuborildi.`,
        {
          parse_mode: 'Markdown',
          reply_markup: StudentKeyboards.mainMenu(),
        },
      );
    } catch {
      this.logger.error('Bot amalini bajarib bo‘lmadi.');
      await ctx.reply('Xabar yuborilmadi. Qayta urinib ko‘ring.');
    }
  }

  private async handleSendFollowup(
    ctx: Context,
    session: StudentSessionData,
    content: string,
  ) {
    if (!ctx.from || !session.activeConversationId) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);

    try {
      await this.messagesService.addMessage(
        session.activeConversationId,
        { content },
        { id: studentUser.id, role: UserRole.STUDENT, telegramId },
        ctx.update?.update_id === undefined ? undefined : `student:${ctx.update.update_id}`,
      );

      const caseId = session.activeCaseId || '';
      this.resetSession(ctx.from.id);

      await ctx.reply(
        `✅ ${caseId}: xabaringiz yuborildi.`,
        {
          parse_mode: 'Markdown',
          reply_markup: StudentKeyboards.mainMenu(),
        },
      );
    } catch {
      this.logger.error('Bot amalini bajarib bo‘lmadi.');
      await ctx.reply('Xabar yuborilmadi. Qayta urinib ko‘ring.');
    }
  }
}
