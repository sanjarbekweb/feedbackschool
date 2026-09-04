import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, InlineKeyboard, webhookCallback } from 'grammy';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { StatisticsService } from '../statistics/statistics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentBotController } from './student/student.bot';
import { StaffBotController } from './staff/staff.bot';
import { UserRole } from '@psychology/types';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);

  public studentBot?: Bot<Context>;
  public staffBot?: Bot<Context>;
  public studentController?: StudentBotController;
  public staffController?: StaffBotController;

  private studentWebhookHandler?: (req: any, res: any) => any;
  private staffWebhookHandler?: (req: any, res: any) => any;
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
    const staffGroupId =
      this.configService.get<string>('STAFF_GROUP_ID') ||
      this.configService.get<string>('STAFF_TELEGRAM_GROUP_ID');
    const mode = this.configService.get<string>('TELEGRAM_MODE') || 'polling';
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    const webhookSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    this.isWebhookMode = mode.toLowerCase() === 'webhook';

    // Auto-bootstrap configured admin Telegram IDs
    const adminIds = (
      this.configService.get<string>('ADMIN_TELEGRAM_IDS') || '8264201735'
    )
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    for (const adminId of adminIds) {
      try {
        await this.usersService.ensureStaffUser(adminId, UserRole.ADMIN);
        this.logger.log(`Ensured Telegram ID ${adminId} is registered with ADMIN role.`);
      } catch (err: any) {
        this.logger.warn(`Could not bootstrap admin Telegram ID ${adminId}: ${err.message}`);
      }
    }

    // Wire notifications to staff group via Staff Bot
    this.notificationsService.registerStaffGroupNotifier(async (formattedText: string) => {
      if (this.staffBot && staffGroupId) {
        await this.staffBot.api.sendMessage(staffGroupId, formattedText, {
          parse_mode: 'Markdown',
        });
      } else {
        this.logger.debug(
          `[Telegram Notification Mock] Staff Group (${staffGroupId || 'not set'}):\n${formattedText}`,
        );
      }
    });

    // Wire notifications to student via Student Bot
    this.notificationsService.registerStudentNotifier(
      async (studentTelegramId: string, caseId: string, messageText: string) => {
        if (this.studentBot) {
          const keyboard = new InlineKeyboard().text('📨 View Response in My Messages', 'student:list');
          await this.studentBot.api.sendMessage(studentTelegramId, messageText, {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
          });
        } else {
          this.logger.debug(
            `[Telegram Notification Mock] Student (${studentTelegramId}) Case ${caseId}:\n${messageText}`,
          );
        }
      },
    );

    // Initialize Student Bot if token provided
    if (studentToken && studentToken.trim() !== '') {
      try {
        this.studentBot = new Bot(studentToken);
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
              drop_pending_updates: true,
            });
            this.logger.log(`Student Bot webhook registered at: ${formattedWebhook}`);
          } else {
            this.logger.warn('TELEGRAM_MODE is webhook but TELEGRAM_WEBHOOK_URL is not set.');
          }
        } else {
          this.studentBot
            .start({
              drop_pending_updates: true,
              onStart: (info) => this.logger.log(`Student Bot started via polling as @${info.username}`),
            })
            .catch((err) => {
              this.logger.error(`Failed to start Student Bot polling: ${err.message}`);
            });
        }
      } catch (err: any) {
        this.logger.error(`Error initializing Student Bot: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'STUDENT_BOT_TOKEN is not configured. Student Telegram Bot is dormant.',
      );
    }

    // Initialize Staff Bot if token provided
    if (staffToken && staffToken.trim() !== '') {
      try {
        this.staffBot = new Bot(staffToken);
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
              drop_pending_updates: true,
            });
            this.logger.log(`Staff Bot webhook registered at: ${formattedWebhook}`);
          } else {
            this.logger.warn('TELEGRAM_MODE is webhook but TELEGRAM_WEBHOOK_URL is not set.');
          }
        } else {
          this.staffBot
            .start({
              drop_pending_updates: true,
              onStart: (info) => this.logger.log(`Staff Bot started via polling as @${info.username}`),
            })
            .catch((err) => {
              this.logger.error(`Failed to start Staff Bot polling: ${err.message}`);
            });
        }
      } catch (err: any) {
        this.logger.error(`Error initializing Staff Bot: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'STAFF_BOT_TOKEN is not configured. Staff Telegram Bot is dormant.',
      );
    }
  }

  handleStudentWebhook(req: any, res: any) {
    if (this.studentWebhookHandler) {
      return this.studentWebhookHandler(req, res);
    }
    return res.status(200).json({ ok: true, status: 'dormant_or_polling' });
  }

  handleStaffWebhook(req: any, res: any) {
    if (this.staffWebhookHandler) {
      return this.staffWebhookHandler(req, res);
    }
    return res.status(200).json({ ok: true, status: 'dormant_or_polling' });
  }

  async onModuleDestroy() {
    if (!this.isWebhookMode) {
      if (this.studentBot) {
        await this.studentBot.stop();
        this.logger.log('Student Bot stopped.');
      }
      if (this.staffBot) {
        await this.staffBot.stop();
        this.logger.log('Staff Bot stopped.');
      }
    } else {
      this.logger.log('Telegram webhook mode shutting down gracefully.');
    }
  }
}
