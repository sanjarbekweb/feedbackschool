import { conversationScope, assertConversationAccess } from '../common/conversation-access';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ConversationCategory,
  ConversationStatus,
  SenderType,
  UserRole,
  CurrentUser,
  PaginatedResponse,
  ConversationDetail,
  ConversationListItem,
} from '@psychology/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationFilterDto } from './dto/conversation-filter.dto';
import * as crypto from 'crypto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * Generates a collision-resistant non-sensitive Case ID e.g. "#A81F42"
   */
  private generateCaseId(): string {
    const hex = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `#${hex}`;
  }

  /**
   * Creates a new conversation case with an initial message.
   * Shared by Student Telegram Bot and REST API.
   */
  async createConversation(
    dto: CreateConversationDto,
    creator?: CurrentUser,
    sourceKey?: string,
  ) {
    let studentUser;

    if (creator?.role === UserRole.STUDENT && dto.studentTelegramId && dto.studentTelegramId !== creator.telegramId) {
      throw new BadRequestException("Boshqa o‘quvchi nomidan yozib bo‘lmaydi.");
    }
    if (dto.studentTelegramId) {
      studentUser = await this.usersService.getOrCreateStudent(dto.studentTelegramId);
    } else if (creator && creator.role === UserRole.STUDENT) {
      studentUser = await this.usersService.findById(creator.id);
    } else {
      throw new BadRequestException('O‘quvchi hisobi kerak.');
    }

    if (!studentUser) {
      throw new NotFoundException('O‘quvchi topilmadi.');
    }

    if (!dto.initialMessage.trim() || dto.initialMessage.length > 4000) throw new BadRequestException('Xabar 1–4000 belgidan iborat bo‘lsin.');
    if (sourceKey) {
      const existing = await this.prisma.message.findUnique({ where: { sourceKey }, include: { conversation: true } });
      if (existing && existing.senderId === studentUser.id) return existing.conversation;
    }
    const recipientRoleId = dto.recipientRoleId || 'psychologist';
    const recipient = await this.prisma.staffRole.findFirst({ where: { id: recipientRoleId, isActive: true, users: { some: { role: UserRole.STAFF, isActive: true } } } });
    if (!recipient) throw new BadRequestException('Qabul qiluvchi hozir mavjud emas.');
    const caseId = this.generateCaseId();

    // Atomic transaction: create case + initial message
    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          caseId,
          recipientRoleId,
          studentId: studentUser.id,
          category: dto.category,
          status: ConversationStatus.UNANSWERED,
        },
      });

      const message = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: studentUser.id,
          senderType: SenderType.STUDENT,
          content: dto.initialMessage.trim(),
          sourceKey,
        },
      });

      await this.notificationsService.enqueueStaff(tx, recipientRoleId, caseId);
      return { conversation, message };
    });

    const createdAtIso = result.conversation.createdAt.toISOString();

    // Audit log (INVARIANT: never includes message content)
    await this.auditService.record({
      actorId: studentUser.id,
      action: 'CONVERSATION_CREATED',
      targetType: 'CONVERSATION',
      targetId: result.conversation.id,
      metadata: {
        caseId,
        category: dto.category,
      },
    });

    // Push realtime SSE event to staff dashboard
    this.realtimeService.emit({
      type: 'CONVERSATION_CREATED',
      recipientRoleId,
      timestamp: createdAtIso,
      payload: {
        conversationId: result.conversation.id,
        caseId,
        category: dto.category,
        status: ConversationStatus.UNANSWERED,
        createdAt: createdAtIso,
      },
    });

    return result.conversation;
  }

  /**
   * Retrieves conversations with filtering and pagination.
   * Enforces server-side ownership: students see ONLY their own conversations.
   */
  async findAll(
    filter: ConversationFilterDto,
    currentUser: CurrentUser,
  ): Promise<PaginatedResponse<ConversationListItem>> {
    const page = filter.page;
    const limit = filter.limit;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = conversationScope(currentUser);

    // Ownership enforcement: students only see their own cases
    if (currentUser.role === UserRole.STUDENT) {
      where.studentId = currentUser.id;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.category) {
      where.category = filter.category;
    }

    if (filter.search) {
      where.caseId = {
        contains: filter.search.toUpperCase(),
        mode: 'insensitive',
      };
    }

    let orderBy: Prisma.ConversationOrderByWithRelationInput = {
      lastMessageAt: 'desc',
    };
    if (filter.sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (filter.sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        select: {
          id: true,
          caseId: true,
          status: true,
          category: true,
          createdAt: true,
          lastMessageAt: true,
          student: {
            select: {
              studentIdentifier: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: conversations,
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
   * Retrieves single conversation by ID.
   */
  async findOne(id: string, actor?: CurrentUser): Promise<ConversationDetail & { studentId: string; recipientRoleId: string }> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        recipientRoleId: true,
        caseId: true,
        status: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        student: {
          select: {
            studentIdentifier: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    if (actor) assertConversationAccess(conversation, actor);
    return conversation;
  }

  /**
   * Updates conversation status or category.
   */
  async update(id: string, dto: UpdateConversationDto, actor: CurrentUser) {
    const existing = await this.findOne(id, actor);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: dto.status ?? existing.status,
        category: dto.category ?? existing.category,
      },
    });

    await this.auditService.record({
      actorId: actor.id,
      action: 'CONVERSATION_UPDATED',
      targetType: 'CONVERSATION',
      targetId: id,
      metadata: {
        fromStatus: existing.status,
        toStatus: updated.status,
        fromCategory: existing.category,
        toCategory: updated.category,
      },
    });

    this.realtimeService.emit({
      type: 'CONVERSATION_UPDATED',
      recipientRoleId: existing.recipientRoleId,
      timestamp: updated.updatedAt.toISOString(),
      payload: {
        conversationId: updated.id,
        caseId: updated.caseId,
        status: updated.status as ConversationStatus,
        category: updated.category as ConversationCategory,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    return updated;
  }
}
