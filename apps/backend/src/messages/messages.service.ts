import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  SenderType,
  UserRole,
  ConversationStatus,
  CurrentUser,
  PaginatedResponse,
  ConversationMessage,
} from '@psychology/types';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * Retrieves messages for a conversation, ordered chronologically.
   */
  async getMessages(
    conversationId: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResponse<ConversationMessage>> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        select: {
          id: true,
          conversationId: true,
          senderType: true,
          content: true,
          createdAt: true,
          readAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.message.count({
        where: { conversationId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Appends a message to a conversation.
   * Shared by Student Bot, Staff Bot, and Web Dashboard.
   */
  async addMessage(
    conversationId: string,
    dto: CreateMessageDto,
    sender: CurrentUser,
  ): Promise<ConversationMessage & { senderId: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        student: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Cannot send messages to a closed conversation.');
    }

    const senderType =
      sender.role === UserRole.STUDENT ? SenderType.STUDENT : SenderType.STAFF;

    const isStaffReply = senderType === SenderType.STAFF;
    const nextStatus = isStaffReply
      ? ConversationStatus.ANSWERED
      : ConversationStatus.UNANSWERED;

    const result = await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: sender.id,
          senderType,
          content: dto.content,
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          senderType: true,
          content: true,
          createdAt: true,
          readAt: true,
        },
      });

      const updatedConversation = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: message.createdAt,
          status: nextStatus,
        },
        select: {
          status: true,
          category: true,
          updatedAt: true,
        },
      });

      return { message, updatedConversation };
    });

    const createdAtIso = result.message.createdAt.toISOString();

    // Audit logging (INVARIANT: never includes message content)
    await this.auditService.record({
      actorId: sender.id,
      action: 'MESSAGE_SENT',
      targetType: 'CONVERSATION',
      targetId: conversationId,
      metadata: {
        senderType,
        messageId: result.message.id,
      },
    });

    // Realtime SSE event
    this.realtimeService.emit({
      type: 'MESSAGE_CREATED',
      timestamp: createdAtIso,
      payload: {
        messageId: result.message.id,
        conversationId,
        caseId: conversation.caseId,
        senderType,
        createdAt: createdAtIso,
      },
    });

    this.realtimeService.emit({
      type: 'CONVERSATION_UPDATED',
      timestamp: result.updatedConversation.updatedAt.toISOString(),
      payload: {
        conversationId,
        caseId: conversation.caseId,
        status: result.updatedConversation.status,
        category: result.updatedConversation.category,
        updatedAt: result.updatedConversation.updatedAt.toISOString(),
      },
    });

    // If staff responded, notify student via Telegram
    if (isStaffReply && conversation.student.telegramId) {
      await this.notificationsService.notifyStudentResponse(
        conversation.student.telegramId,
        conversation.caseId,
      );
    } else if (!isStaffReply) {
      await this.notificationsService.notifyStaffGroup({
        caseId: conversation.caseId,
        category: conversation.category,
        status: ConversationStatus.UNANSWERED,
        timestamp: createdAtIso,
        reason: 'STUDENT_FOLLOW_UP',
      });
    }

    return result.message;
  }
}
