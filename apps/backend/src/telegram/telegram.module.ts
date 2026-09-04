import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConversationsModule,
    MessagesModule,
    UsersModule,
    StatisticsModule,
    NotificationsModule,
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
