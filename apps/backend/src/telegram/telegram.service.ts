import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, InlineKeyboard } from 'grammy';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { StatisticsService } from '../statistics/statistics.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentBotController } from './student/student.bot';
import { StaffBotController } from './staff/staff.bot';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);

  public studentBot?: Bot<Context>;
  public staffBot?: Bot<Context>;
  public studentController?: StudentBotController;
  public staffController?: StaffBotController;

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
    const staffGroupId = this.configService.get<string>('STAFF_GROUP_ID');

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

        this.studentBot
          .start({
            drop_pending_updates: true,
            onStart: (info) => this.logger.log(`Student Bot started as @${info.username}`),
          })
          .catch((err) => {
            this.logger.error(`Failed to start Student Bot polling: ${err.message}`);
          });
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

        this.staffBot
          .start({
            drop_pending_updates: true,
            onStart: (info) => this.logger.log(`Staff Bot started as @${info.username}`),
          })
          .catch((err) => {
            this.logger.error(`Failed to start Staff Bot polling: ${err.message}`);
          });
      } catch (err: any) {
        this.logger.error(`Error initializing Staff Bot: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'STAFF_BOT_TOKEN is not configured. Staff Telegram Bot is dormant.',
      );
    }
  }

  async onModuleDestroy() {
    if (this.studentBot) {
      await this.studentBot.stop();
      this.logger.log('Student Bot stopped.');
    }
    if (this.staffBot) {
      await this.staffBot.stop();
      this.logger.log('Staff Bot stopped.');
    }
  }
}
