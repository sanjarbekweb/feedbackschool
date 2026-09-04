import { Bot, Context } from 'grammy';
import { Logger } from '@nestjs/common';
import { ConversationsService } from '../../conversations/conversations.service';
import { MessagesService } from '../../messages/messages.service';
import { UsersService } from '../../users/users.service';
import { StudentKeyboards } from '../keyboards/student.keyboards';
import {
  StudentSessionData,
  StudentSessionState,
} from '../types/session';
import {
  ConversationCategory,
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

export class StudentBotController {
  private readonly logger = new Logger(StudentBotController.name);
  private readonly sessions = new Map<number, StudentSessionData>();

  constructor(
    private readonly bot: Bot<Context>,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {
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
    this.bot.hears('📝 Send a message', async (ctx) => {
      if (!ctx.from) return;
      this.setSession(ctx.from.id, { state: StudentSessionState.AWAITING_CATEGORY });
      await ctx.reply('Please choose a category that best describes your request:', {
        reply_markup: StudentKeyboards.categories(),
      });
    });

    this.bot.hears('📨 My messages', async (ctx) => {
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
        await ctx.answerCallbackQuery({ text: 'Cancelled' });
        this.resetSession(userId);
        await ctx.reply('Message creation cancelled.');
        await this.sendMainMenu(ctx);
        return;
      }

      if (data.startsWith('cat:')) {
        const category = data.substring(4) as ConversationCategory;
        await ctx.answerCallbackQuery();
        this.setSession(userId, {
          state: StudentSessionState.AWAITING_INITIAL_MESSAGE,
          selectedCategory: category,
        });

        const label = CATEGORY_LABELS[category] || category;
        await ctx.reply(
          `Category selected: *${label}*\n\nPlease write your message below. Take your time.\nYour message is strictly confidential between you and the psychology team.`,
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
            'Please send your message as text. For confidentiality and privacy reasons, media attachments are not supported.',
          );
          return;
        }

        const text = ctx.message.text.trim();
        if (text.length > 4000) {
          await ctx.reply(
            'Your message is too long. Please keep it under 4000 characters.',
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

  private async sendMainMenu(ctx: Context) {
    await ctx.reply(
      'Welcome.\n\nThis is the school\'s psychology support system.\n\nYour messages are handled privately by authorized psychology staff.\n\nWhat would you like to do?',
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
        'You don\'t have any messages yet. Click "📝 Send a message" below to reach out to the psychology staff.',
        { reply_markup: StudentKeyboards.mainMenu() },
      );
      return;
    }

    const messageText = `📨 *My messages* (Page ${result.meta.page}/${result.meta.totalPages})\n\nSelect a case to view history or continue the conversation:`;

    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: StudentKeyboards.conversationList(
        result.data.map((c: any) => ({
          id: c.id,
          caseId: c.caseId,
          status: c.status,
        })),
        result.meta.page,
        result.meta.totalPages,
      ),
    });
  }

  private async sendConversationDetail(ctx: Context, conversationId: string) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);

    const conv = await this.conversationsService.findOne(conversationId);

    // Strict ownership verification: students can only access their own cases!
    if (conv.studentId !== studentUser.id) {
      await ctx.reply('Case not found.');
      return;
    }

    const messagesResult = await this.messagesService.getMessages(conversationId, 1, 50);

    const categoryLabel = CATEGORY_LABELS[conv.category] || conv.category;
    let statusLabel = '⏳ Unanswered';
    if (conv.status === ConversationStatus.ANSWERED) {
      statusLabel = '💬 Response available';
    } else if (conv.status === ConversationStatus.CLOSED) {
      statusLabel = '🔒 Closed';
    }

    let text = `Case *${conv.caseId}*\nStatus: ${statusLabel}\nCategory: ${categoryLabel}\n────────────────────────\n`;

    for (const msg of messagesResult.data) {
      const timeStr = new Date(msg.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const senderHeader =
        msg.senderType === SenderType.STUDENT ? `🧑 You (${timeStr}):` : `👩‍⚕️ Psychology Staff (${timeStr}):`;
      text += `\n${senderHeader}\n${msg.content}\n`;
    }

    text += '────────────────────────';

    const isClosed = conv.status === ConversationStatus.CLOSED;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: StudentKeyboards.conversationDetail(conv.id, isClosed),
    });
  }

  private async handleStartReply(ctx: Context, conversationId: string) {
    if (!ctx.from) return;
    const telegramId = String(ctx.from.id);
    const studentUser = await this.usersService.getOrCreateStudent(telegramId);

    const conv = await this.conversationsService.findOne(conversationId);
    if (conv.studentId !== studentUser.id) {
      await ctx.reply('Case not found.');
      return;
    }

    if (conv.status === ConversationStatus.CLOSED) {
      await ctx.reply('This case is closed. Please start a new message if you need further support.');
      return;
    }

    this.setSession(ctx.from.id, {
      state: StudentSessionState.AWAITING_FOLLOWUP_MESSAGE,
      activeConversationId: conv.id,
      activeCaseId: conv.caseId,
    });

    await ctx.reply(
      `Replying to Case *${conv.caseId}*.\n\nPlease write your follow-up message below:`,
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
        category,
        initialMessage,
      });

      this.resetSession(ctx.from.id);

      const categoryLabel = CATEGORY_LABELS[category] || category;

      await ctx.reply(
        `Your message has been received.\n\nCase: *${conv.caseId}*\nCategory: ${categoryLabel}\nStatus: ⏳ Unanswered\n\nA member of the psychology staff will review it. You can check the status at any time in "My messages".`,
        {
          parse_mode: 'Markdown',
          reply_markup: StudentKeyboards.mainMenu(),
        },
      );
    } catch (err: any) {
      this.logger.error(`Error creating conversation: ${err.message}`, err.stack);
      await ctx.reply('An error occurred while sending your message. Please try again later.');
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
      );

      const caseId = session.activeCaseId || '';
      this.resetSession(ctx.from.id);

      await ctx.reply(
        `Your follow-up message has been received for Case *${caseId}*.\n\nThe psychology staff will review it shortly.`,
        {
          parse_mode: 'Markdown',
          reply_markup: StudentKeyboards.mainMenu(),
        },
      );
    } catch (err: any) {
      this.logger.error(`Error sending follow-up: ${err.message}`, err.stack);
      await ctx.reply('An error occurred while sending your message. Please try again later.');
    }
  }
}
