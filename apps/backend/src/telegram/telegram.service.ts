import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, GrammyError, HttpError, InlineKeyboard, webhookCallback } from 'grammy';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { StatisticsService } from '../statistics/statistics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentBotController } from './student/student.bot';
import { StaffBotController } from './staff/staff.bot';
import { UserRole } from '@psychology/types';
import { Request, Response } from 'express';

type ExpressWebhookHandler = (
  request: Request,
  response: Response,
) => void | Promise<void>;

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);

  public studentBot?: Bot<Context>;
  public staffBot?: Bot<Context>;
  public studentController?: StudentBotController;
  public staffController?: StaffBotController;

  private studentWebhookHandler?: ExpressWebhookHandler;
  private staffWebhookHandler?: ExpressWebhookHandler;
  private isWebhookMode = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
    private readonly statisticsService: StatisticsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    const studentToken = this.configService.get<string>('STUDENT_BOT_TOKEN');
    const staffToken = this.configService.get<string>('STAFF_BOT_TOKEN');
    const mode = this.configService.get<string>('TELEGRAM_MODE') || 'polling';
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    const webhookSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    this.isWebhookMode = mode.toLowerCase() === 'webhook';

    if (this.isWebhookMode && (!webhookUrl || !webhookSecret)) {
      throw new Error(
        'Webhook mode requires TELEGRAM_WEBHOOK_URL and TELEGRAM_WEBHOOK_SECRET.',
      );
    }

    // Synchronize only explicitly configured admin Telegram IDs. There is no
    // built-in fallback identity: production authorization must fail closed.
    const adminIds = (this.configService.get<string>('ADMIN_TELEGRAM_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => /^\d+$/.test(id));

    for (const [index, adminId] of adminIds.entries()) {
      try {
        await this.usersService.ensureStaffUser(adminId, UserRole.ADMIN);
        this.logger.log(`Configured Telegram admin identity ${index + 1} synchronized.`);
      } catch {
        this.logger.warn(`Could not synchronize configured Telegram admin identity ${index + 1}.`);
      }
    }

    this.notificationsService.registerStaffGroupNotifier(async (text, telegramId, conversationId) => {
      if (!this.staffBot || !telegramId) throw new Error('Xodim boti mavjud emas.');
      try {
        const keyboard = conversationId
          ? new InlineKeyboard()
              .text('💬 Javob berish', `staff:action:respond:${conversationId}`)
              .text('👁 Ko‘rish', `staff:case:${conversationId}`)
          : undefined;

        await this.staffBot.api.sendMessage(telegramId, text, {
          reply_markup: keyboard,
        });
      } catch (err: unknown) {
        if (err instanceof GrammyError && err.error_code === 403) {
          this.logger.warn(`Xodim Bot: Telegram foydalanuvchisi botni bloklagan (${telegramId})`);
          return;
        }
        throw err;
      }
    });

    // Wire notifications to student via Student Bot
    this.notificationsService.registerStudentNotifier(
      async (studentTelegramId: string, caseId: string, messageText: string, conversationId?: string) => {
        if (this.studentBot) {
          try {
            const targetId = conversationId || caseId;
            const keyboard = new InlineKeyboard().text('📨 Javobni ko‘rish', `student:case:${targetId}`);
            await this.studentBot.api.sendMessage(studentTelegramId, messageText, {
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            });
          } catch (err: unknown) {
            if (err instanceof GrammyError && err.error_code === 403) {
              this.logger.warn(`O‘quvchi Bot: Telegram foydalanuvchisi botni bloklagan (${studentTelegramId})`);
              return;
            }
            throw err;
          }
        } else {
          throw new Error('O‘quvchi boti mavjud emas.');
        }
      },
    );

    // Initialize Student Bot if token provided
    if (studentToken && studentToken.trim() !== '') {
      try {
        this.studentBot = new Bot(studentToken);
        this.studentBot.catch((err) => {
          this.handleBotError('O‘quvchi Bot', err);
        });
        this.studentController = new StudentBotController(
          this.studentBot,
          this.conversationsService,
          this.messagesService,
          this.usersService,
        );

        if (this.isWebhookMode) {
          this.studentWebhookHandler = webhookCallback(
            this.studentBot,
            'express',
            webhookSecret ? { secretToken: webhookSecret } : undefined,
          );

          if (webhookUrl) {
            const formattedWebhook = `${webhookUrl.replace(/\/$/, '')}/api/telegram/student`;
            await this.studentBot.api.setWebhook(formattedWebhook, {
              secret_token: webhookSecret,
              allowed_updates: ['message', 'callback_query'],
            });
            this.logger.log(`O‘quvchi Bot webhook registered at: ${formattedWebhook}`);
          } else {
            this.logger.warn('TELEGRAM_MODE is webhook but TELEGRAM_WEBHOOK_URL is not set.');
          }
        } else {
          this.studentBot
            .start({
              onStart: (info) => this.logger.log(`O‘quvchi Bot started via polling as @${info.username}`),
            })
            .catch((err) => {
              this.logger.error(`Failed to start O‘quvchi Bot polling: ${err.message}`);
            });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error initializing O‘quvchi Bot: ${message}`);
      }
    } else {
      this.logger.warn(
        'STUDENT_BOT_TOKEN is not configured. O‘quvchi Telegram Bot is dormant.',
      );
    }

    // Initialize Staff Bot if token provided
    if (staffToken && staffToken.trim() !== '') {
      try {
        this.staffBot = new Bot(staffToken);
        this.staffBot.catch((err) => {
          this.handleBotError('Xodim Bot', err);
        });
        this.staffController = new StaffBotController(
          this.staffBot,
          this.conversationsService,
          this.messagesService,
          this.usersService,
          this.statisticsService,
        );

        if (this.isWebhookMode) {
          this.staffWebhookHandler = webhookCallback(
            this.staffBot,
            'express',
            webhookSecret ? { secretToken: webhookSecret } : undefined,
          );

          if (webhookUrl) {
            const formattedWebhook = `${webhookUrl.replace(/\/$/, '')}/api/telegram/staff`;
            await this.staffBot.api.setWebhook(formattedWebhook, {
              secret_token: webhookSecret,
              allowed_updates: ['message', 'callback_query'],
            });
            this.logger.log(`Xodim Bot webhook registered at: ${formattedWebhook}`);
          } else {
            this.logger.warn('TELEGRAM_MODE is webhook but TELEGRAM_WEBHOOK_URL is not set.');
          }
        } else {
          this.staffBot
            .start({
              onStart: (info) => this.logger.log(`Xodim Bot started via polling as @${info.username}`),
            })
            .catch((err) => {
              this.logger.error(`Failed to start Xodim Bot polling: ${err.message}`);
            });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error initializing Xodim Bot: ${message}`);
      }
    } else {
      this.logger.warn(
        'STAFF_BOT_TOKEN is not configured. Xodim Telegram Bot is dormant.',
      );
    }
  }

  handleStudentWebhook(request: Request, response: Response) {
    if (this.studentWebhookHandler) {
      return this.studentWebhookHandler(request, response);
    }
    return response.status(200).json({ ok: true, status: 'dormant_or_polling' });
  }

  handleStaffWebhook(request: Request, response: Response) {
    if (this.staffWebhookHandler) {
      return this.staffWebhookHandler(request, response);
    }
    return response.status(200).json({ ok: true, status: 'dormant_or_polling' });
  }

  private handleBotError(
    botName: string,
    err: { error?: unknown; ctx?: Context; message?: string; stack?: string },
  ) {
    const e = err.error ?? err;
    const ctx = err.ctx;
    const chatId = ctx?.chat?.id ?? ctx?.from?.id;

    if (e instanceof GrammyError || (typeof e === 'object' && e !== null && 'error_code' in e)) {
      const grammyErr = e as GrammyError;
      const code = grammyErr.error_code;
      const desc = grammyErr.description || '';

      // 403 Forbidden: User blocked the bot or account deleted
      if (code === 403) {
        this.logger.warn(
          `${botName}: Foydalanuvchi botni bloklagan yoki chat mavjud emas (chatId: ${chatId}): ${desc}`,
        );
        return;
      }

      // 400 Bad Request: Expired callback query, message unmodified, or message deleted
      if (
        code === 400 &&
        (desc.includes('query is too old') ||
          desc.includes('message is not modified') ||
          desc.includes('message to edit not found'))
      ) {
        this.logger.debug?.(`${botName}: O‘tkazib yuborilgan so‘rov (${desc})`);
        return;
      }

      this.logger.error(`${botName} Telegram API xatosi (${code}): ${desc}`);
      return;
    }

    if (e instanceof HttpError || (typeof e === 'object' && e !== null && 'status' in e)) {
      this.logger.warn(`${botName} Telegram tarmoq xatosi: ${(e as Error).message}`);
      return;
    }

    this.logger.error(`${botName} kutilmagan xato: ${err.message || String(err)}`, err.stack);
  }

  async onModuleDestroy() {
    if (!this.isWebhookMode) {
      if (this.studentBot) {
        await this.studentBot.stop();
        this.logger.log('O‘quvchi Bot stopped.');
      }
      if (this.staffBot) {
        await this.staffBot.stop();
        this.logger.log('Xodim Bot stopped.');
      }
    } else {
      this.logger.log('Telegram webhook mode shutting down gracefully.');
    }
  }
}
