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
    const current = this.getSession(userId);
    this.sessions.set(userId, {
      state: StudentSessionState.IDLE,
      botMessageIds: current.botMessageIds,
      isMenuMinimized: current.isMenuMinimized,
    });
  }

  private safeAnswerCallback(
    ctx: Context,
    options?: Parameters<Context['answerCallbackQuery']>[0],
  ) {
    void ctx.answerCallbackQuery(options).catch(() => {});
  }

  private cleanupPreviousBotMessages(ctx: Context, session: StudentSessionData) {
    if (!ctx.chat || !ctx.api?.deleteMessage) return;
    const chatId = ctx.chat.id;
    const ids = new Set<number>(session.botMessageIds || []);
    if (ctx.callbackQuery?.message?.message_id) {
      ids.add(ctx.callbackQuery.message.message_id);
    }
    session.botMessageIds = [];
    if (ids.size === 0) return;
    void Promise.all(
      Array.from(ids).map((msgId) => ctx.api.deleteMessage(chatId, msgId).catch(() => {})),
    ).catch(() => {});
  }

  private async renderResponse(
    ctx: Context,
    text: string,
    options?: {
      reply_markup?: any;
      parse_mode?: 'Markdown';
      forceNew?: boolean;
    },
  ) {
    if (!ctx.from) return;
    const session = this.getSession(ctx.from.id);

    // 1. Try in-place editing if triggered via callback query and not forced new
    if (ctx.callbackQuery?.message && !options?.forceNew && ctx.editMessageText) {
      try {
        await ctx.editMessageText(text, {
          parse_mode: options?.parse_mode,
          reply_markup: options?.reply_markup,
        });
        session.botMessageIds = [ctx.callbackQuery.message.message_id];
        return;
      } catch (err: any) {
        if (err?.description?.includes('message is not modified')) {
          return;
        }
      }
    }

    // 2. Otherwise delete previous bot messages asynchronously
    this.cleanupPreviousBotMessages(ctx, session);

    // 3. Send fresh message
    try {
      const replyCall =
        options?.reply_markup !== undefined || options?.parse_mode !== undefined
          ? ctx.reply(text, {
              parse_mode: options?.parse_mode,
              reply_markup: options?.reply_markup,
            })
          : ctx.reply(text);

      const sent = await Promise.resolve(replyCall);
      if (sent && typeof sent === 'object' && 'message_id' in sent) {
        session.botMessageIds = [(sent as any).message_id];
      }
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'error_code' in err &&
        (err as { error_code: number }).error_code === 403
      ) {
        this.logger.warn(`O‘quvchi Bot: foydalanuvchi botni bloklagan (chatId: ${ctx.from.id})`);
        return;
      }
      throw err;
    }
  }

  private registerHandlers() {
    // /start command
    this.bot.command('start', async (ctx) => {
      if (!ctx.from) return;
      this.resetSession(ctx.from.id);
      await this.sendMainMenu(ctx, true);
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

    this.bot.hears('❌ Bekor qilish', async (ctx) => {
      if (!ctx.from) return;
      this.resetSession(ctx.from.id);
      await this.sendMainMenu(ctx, true);
    });

    // Callback queries
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from?.id;
      if (!userId) return;

      if (data === 'student:noop') {
        this.safeAnswerCallback(ctx);
        return;
      }

      if (data === 'student:home') {
        this.safeAnswerCallback(ctx);
        this.resetSession(userId);
        await this.sendMainMenu(ctx, true);
        return;
      }

      if (data === 'student:cancel') {
        this.safeAnswerCallback(ctx, { text: 'Bekor qilindi' });
        this.resetSession(userId);
        await this.sendMainMenu(ctx, true);
        return;
      }

      if (data === 'student:action:compose') {
        this.safeAnswerCallback(ctx);
        await this.sendRecipients(ctx);
        return;
      }

      if (data === 'student:menu:minimize') {
        this.safeAnswerCallback(ctx, { text: 'Menyu yig‘ildi' });
        this.setSession(userId, { isMenuMinimized: true });
        await this.renderResponse(
          ctx,
          'Assalomu alaykum! Maktab xodimlariga shu yerda yozishingiz mumkin. (Menyu yig‘ilgan)',
          { reply_markup: StudentKeyboards.inlineMainMenu(true) },
        );
        return;
      }

      if (data === 'student:menu:expand') {
        this.safeAnswerCallback(ctx, { text: 'Menyu ochildi' });
        this.setSession(userId, { isMenuMinimized: false });
        await this.renderResponse(
          ctx,
          'Assalomu alaykum! Maktab xodimlariga shu yerda yozishingiz mumkin.',
          { reply_markup: StudentKeyboards.inlineMainMenu(false) },
        );
        return;
      }

      if (data.startsWith('recipient:')) {
        const roleId = data.substring(10);
        const roles = await this.usersService.listRoles(true);
        if (!roles.some(role => role.id === roleId)) {
          this.safeAnswerCallback(ctx, { text: 'Qabul qiluvchi mavjud emas.' });
          return;
        }
        this.setSession(userId, { state: StudentSessionState.AWAITING_CATEGORY, recipientRoleId: roleId });
        this.safeAnswerCallback(ctx);
        // Category options appear, recipient list disappears
        await this.renderResponse(ctx, 'Mavzuni tanlang:', { reply_markup: StudentKeyboards.categories() });
        return;
      }

      if (data.startsWith('cat:')) {
        const category = data.substring(4) as ConversationCategory;
        if (!Object.values(ConversationCategory).includes(category) || !this.getSession(userId).recipientRoleId) {
          this.safeAnswerCallback(ctx, { text: 'Avval qabul qiluvchini tanlang.' });
          return;
        }
        this.safeAnswerCallback(ctx);
        this.setSession(userId, {
          state: StudentSessionState.AWAITING_INITIAL_MESSAGE,
          selectedCategory: category,
        });

        const label = CATEGORY_LABELS[category] || category;
        // Large category menu disappears, minimized to a single cancel button
        await this.renderResponse(
          ctx,
          `Mavzu: *${label}*\n\n✍️ Xabaringizni yozing.`,
          { parse_mode: 'Markdown', reply_markup: StudentKeyboards.cancelOnly() },
        );
        return;
      }

      if (data === 'student:list') {
        this.safeAnswerCallback(ctx);
        await this.sendConversationsList(ctx, 1);
        return;
      }

      if (data.startsWith('student:page:')) {
        const page = parseInt(data.substring(13), 10) || 1;
        this.safeAnswerCallback(ctx);
        await this.sendConversationsList(ctx, page);
        return;
      }

      if (data.startsWith('student:history:')) {
        const [, , id = '', pageText = '1'] = data.split(':');
        this.safeAnswerCallback(ctx);
        await this.sendConversationDetail(ctx, id, Math.max(1, parseInt(pageText, 10) || 1));
        return;
      }

      if (data.startsWith('student:case:')) {
        const conversationId = data.substring(13);
        this.safeAnswerCallback(ctx);
        await this.sendConversationDetail(ctx, conversationId);
        return;
      }

      if (data.startsWith('student:reply:')) {
        const conversationId = data.substring(14);
        this.safeAnswerCallback(ctx);
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
    if (!roles.length) {
      await this.renderResponse(ctx, 'Hozircha qabul qiluvchi yo‘q. Keyinroq urinib ko‘ring.', {
        reply_markup: StudentKeyboards.mainMenu(),
      });
      return;
    }
    const keyboard = new InlineKeyboard();
    for (const role of roles) keyboard.text(role.name, `recipient:${role.id}`).row();
    keyboard.text('❌ Bekor qilish', 'student:cancel');

    await this.renderResponse(ctx, 'Kimga yozmoqchisiz?', {
      reply_markup: keyboard,
    });
  }

  private async sendMainMenu(ctx: Context, forceNew = false) {
    if (!ctx.from) return;
    await this.renderResponse(
      ctx,
      'Assalomu alaykum! Maktab xodimlariga shu yerda yozishingiz mumkin.',
      {
        reply_markup: StudentKeyboards.mainMenu(),
        forceNew,
      },
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
      const keyboard = new InlineKeyboard().text('🏠 Bosh menyu', 'student:home');
      await this.renderResponse(ctx, 'Hali xabar yo‘q.', {
        reply_markup: keyboard,
      });
      return;
    }

    const messageText = `📨 *Mening xabarlarim* (Sahifa ${result.meta.page}/${result.meta.totalPages})\n\nMurojaatni tanlang:`;

    await this.renderResponse(ctx, messageText, {
      parse_mode: 'Markdown',
      reply_markup: StudentKeyboards.conversationList(
        result.data.map((c) => ({
          id: c.id,
          caseId: c.caseId,
          status: c.status,
          category: c.category,
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

    const messagesResult = await this.messagesService.getMessages(conv.id, page, 5);

    const catEmoji =
      conv.category === ConversationCategory.ACADEMIC
        ? '📚'
        : conv.category === ConversationCategory.PERSONAL
        ? '💙'
        : conv.category === ConversationCategory.SOCIAL
        ? '👥'
        : conv.category === ConversationCategory.URGENT
        ? '🚨'
        : '💬';

    const categoryLabel = CATEGORY_LABELS[conv.category] || conv.category;
    let statusBadge = '⏳ Javob kutilmoqda';
    if (conv.status === ConversationStatus.ANSWERED) {
      statusBadge = '💬 Javob berilgan';
    } else if (conv.status === ConversationStatus.CLOSED) {
      statusBadge = '🔒 Yakunlangan';
    }

    let text = `📬 *Murojaatingiz*\n\n`;
    text += `📂 *Mavzu:* ${catEmoji} ${categoryLabel}\n`;
    text += `📊 *Holati:* ${statusBadge}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (messagesResult.data.length === 0) {
      text += `_Xabarlar mavjud emas_\n`;
    } else {
      for (const msg of messagesResult.data) {
        const isStudent = msg.senderType === SenderType.STUDENT;
        const senderIcon = isStudent ? '👤' : '👨‍💼';
        const senderName = isStudent ? 'Siz' : 'Mutaxassis';

        let timeStr = '';
        if (msg.createdAt) {
          try {
            timeStr = new Intl.DateTimeFormat('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Tashkent',
            }).format(new Date(msg.createdAt));
          } catch {}
        }
        const timeBadge = timeStr ? ` • _${timeStr}_` : '';
        const escapedContent = (msg.content || '').replace(/([*_`\[])/g, '\\$1');

        text += `${senderIcon} *${senderName}*${timeBadge}\n`;
        text += `${escapedContent}\n\n`;
      }
    }

    text += `━━━━━━━━━━━━━━━━━━━━`;

    const isClosed = conv.status === ConversationStatus.CLOSED;
    const markup = StudentKeyboards.conversationDetail(
      conv.id,
      isClosed,
      messagesResult.meta.page,
      messagesResult.meta.totalPages,
    );

    const chunks = splitTelegramText(text);
    if (chunks.length <= 1) {
      await this.renderResponse(ctx, text, {
        parse_mode: 'Markdown',
        reply_markup: markup,
      });
    } else {
      const session = this.getSession(ctx.from.id);
      this.cleanupPreviousBotMessages(ctx, session);
      const sentIds: number[] = [];
      for (const [index, chunk] of chunks.entries()) {
        const sent = await Promise.resolve(
          ctx.reply(
            chunk,
            {
              parse_mode: 'Markdown',
              reply_markup: index === chunks.length - 1 ? markup : undefined,
            },
          ),
        );
        if (sent && typeof sent === 'object' && 'message_id' in sent) {
          sentIds.push((sent as any).message_id);
        }
      }
      session.botMessageIds = sentIds;
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
      await this.renderResponse(ctx, 'Murojaat yopilgan. Yangi murojaat yuborishingiz mumkin.', {
        reply_markup: StudentKeyboards.inlineMainMenu(),
      });
      return;
    }

    this.setSession(ctx.from.id, {
      state: StudentSessionState.AWAITING_FOLLOWUP_MESSAGE,
      activeConversationId: conv.id,
      activeCaseId: conv.caseId,
    });

    await this.renderResponse(ctx, `${conv.caseId}: xabaringizni yozing.`, {
      parse_mode: 'Markdown',
      reply_markup: StudentKeyboards.cancelOnly(),
    });
  }

  private async handleCreateConversation(
    ctx: Context,
    session: StudentSessionData,
    initialMessage: string,
  ) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const category = session.selectedCategory || ConversationCategory.GENERAL;
    const recipientRoleId = session.recipientRoleId;
    const updateId = ctx.update?.update_id;

    this.resetSession(ctx.from.id);

    // Optimistically send confirmation immediately so user experiences zero latency
    await this.renderResponse(
      ctx,
      '✅ Xabaringiz yuborildi.',
      {
        parse_mode: 'Markdown',
        reply_markup: StudentKeyboards.mainMenu(),
        forceNew: true,
      },
    );

    // Ensure conversation is persisted and delivered to server and admin/staff
    void this.conversationsService
      .createConversation(
        {
          studentTelegramId: telegramId,
          recipientRoleId,
          category,
          initialMessage,
        },
        undefined,
        updateId === undefined ? undefined : `student:${updateId}`,
      )
      .catch(async (error) => {
        this.logger.error('Bot amalini bajarib bo‘lmadi.', error instanceof Error ? error.stack : error);
        if (ctx.reply) {
          await Promise.resolve(
            ctx.reply('❌ Xatolik yuz berdi: xabaringiz serverga yetkazilmadi. Qayta urinib ko‘ring.', {
              reply_markup: StudentKeyboards.mainMenu(),
            }),
          ).catch(() => {});
        }
      });
  }

  private async handleSendFollowup(
    ctx: Context,
    session: StudentSessionData,
    content: string,
  ) {
    if (!ctx.from || !session.activeConversationId) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);
    const caseId = session.activeCaseId || '';
    const conversationId = session.activeConversationId;
    const updateId = ctx.update?.update_id;

    this.resetSession(ctx.from.id);

    // Optimistically send confirmation immediately
    await this.renderResponse(
      ctx,
      `✅ ${caseId ? `${caseId}: ` : ''}xabaringiz yuborildi.`,
      {
        parse_mode: 'Markdown',
        reply_markup: StudentKeyboards.mainMenu(),
        forceNew: true,
      },
    );

    // Concurrently ensure message is saved to server and staff/admin is notified
    void this.messagesService
      .addMessage(
        conversationId,
        { content },
        { id: studentUser.id, role: UserRole.STUDENT, telegramId },
        updateId === undefined ? undefined : `student:${updateId}`,
      )
      .catch(async (error) => {
        this.logger.error('Follow-up xabarni yuborishda xato.', error instanceof Error ? error.stack : error);
        if (ctx.reply) {
          await Promise.resolve(
            ctx.reply('❌ Xatolik yuz berdi: xabaringiz serverga yetkazilmadi. Qayta urinib ko‘ring.', {
              reply_markup: StudentKeyboards.mainMenu(),
            }),
          ).catch(() => {});
        }
      });
  }
}
