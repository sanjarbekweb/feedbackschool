import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TelegramModule } from './telegram/telegram.module';

import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        serializers: {
          req(req) {
            // Strip sensitive student communication and auth bodies
            const rawBody = (req.raw as any)?.body;
            let safeBody = undefined;
            if (rawBody && typeof rawBody === 'object') {
              safeBody = { ...rawBody };
              delete safeBody.content;
              delete safeBody.initialMessage;
              delete safeBody.password;
            }
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              query: req.query,
              params: req.params,
              body: safeBody,
            };
          },
        },
      },
    }),
    DatabaseModule,
    CommonModule,
    AuditModule,
    UsersModule,
    AuthModule,
    ConversationsModule,
    MessagesModule,
    NotificationsModule,
    RealtimeModule,
    StatisticsModule,
    TelegramModule,
  ],
})
export class AppModule {}
