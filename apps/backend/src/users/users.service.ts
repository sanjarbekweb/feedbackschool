import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { CurrentUser } from '@psychology/types';
import { conversationScope } from '../common/conversation-access';
import { CreateStaffDto } from './staff.dto';
import { Injectable, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PaginatedResponse, StudentDirectoryItem, UserRole } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async getOrCreateStudent(telegramId: string, studentIdentifier?: string) {
    const user = await this.prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId, role: UserRole.STUDENT, studentIdentifier: studentIdentifier || `S-${randomUUID().slice(0, 8)}` },
    });
    if (!user.isActive || user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Bu hisob o‘quvchi uchun ochilmagan.');
    }

    return user;
  }

  async ensureStaffUser(telegramId: string, role: typeof UserRole.STAFF | typeof UserRole.ADMIN = UserRole.STAFF) {
    return this.prisma.user.upsert({
      where: { telegramId },
      update: { role },
      create: {
        telegramId,
        role,
      },
    });
  }

  async listStudents(
    page = 1,
    limit = 20,
    actor?: CurrentUser,
  ): Promise<PaginatedResponse<StudentDirectoryItem>> {
    const skip = (page - 1) * limit;
    const scope = actor ? conversationScope(actor) : { recipientRoleId: "__unassigned__" };
    const where = { role: UserRole.STUDENT, conversations: { some: scope } };
    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          studentIdentifier: true,
          createdAt: true,
          _count: {
            select: { conversations: { where: scope } },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: students,
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
  async listRoles(availableOnly = false) {
    return this.prisma.staffRole.findMany({
      where: availableOnly ? { isActive: true, users: { some: { isActive: true, role: UserRole.STAFF } } } : {},
      orderBy: { name: 'asc' }, take: 100,
    });
  }

  async createRole(name: string, actor: CurrentUser) {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException();
    try {
      return await this.prisma.$transaction(async tx => {
        const role = await tx.staffRole.create({ data: { name: name.trim() } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: 'ROLE_CREATED', targetType: 'STAFF_ROLE', targetId: role.id } });
        return role;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Bu lavozim mavjud.');
      throw error;
    }
  }

  async createStaff(dto: CreateStaffDto, actor: CurrentUser) {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException();
    if (Boolean(dto.email) !== Boolean(dto.password)) throw new BadRequestException('Panel uchun elektron pochta va parolni birga kiriting.');
    const role = await this.prisma.staffRole.findFirst({ where: { id: dto.staffRoleId, isActive: true } });
    if (!role) throw new BadRequestException('Lavozim topilmadi.');
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;
    try {
      return await this.prisma.$transaction(async tx => {
        const user = await tx.user.create({ data: {
          displayName: dto.displayName.trim(), staffRoleId: role.id,
          telegramId: dto.telegramId, role: UserRole.STAFF,
          email: dto.email?.trim().toLowerCase(), passwordHash,
        }, select: this.staffSelect });
        await tx.auditLog.create({ data: { actorId: actor.id, action: 'STAFF_CREATED', targetType: 'USER', targetId: user.id } });
        return user;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Bu Telegram yoki pochta hisobi mavjud.');
      throw error;
    }
  }

  private readonly staffSelect = { id: true, displayName: true, email: true, role: true, staffRoleId: true, isActive: true, staffRole: true } as const;

  async listStaff(page: number, limit: number) {
    const where = { role: UserRole.STAFF };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: this.staffSelect, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { data, meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
  }

  async setStaffActive(id: string, isActive: boolean, actor: CurrentUser) {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException();
    return this.prisma.$transaction(async tx => {
      const result = await tx.user.updateMany({ where: { id, role: UserRole.STAFF }, data: { isActive, credentialVersion: { increment: 1 } } });
      if (!result.count) throw new BadRequestException('Xodim topilmadi.');
      await tx.auditLog.create({ data: { actorId: actor.id, action: isActive ? 'STAFF_ENABLED' : 'STAFF_DISABLED', targetType: 'USER', targetId: id } });
      return { id, isActive };
    });
  }

  async loadBotSession(id: string) {
    const session = await this.prisma.botSession.findUnique({ where: { id } });
    return session && session.expiresAt.getTime() > Date.now() ? session.data : null;
  }
  async saveBotSession(id: string, data: Prisma.InputJsonValue) {
    await this.prisma.botSession.upsert({ where: { id },
      create: { id, data, expiresAt: new Date(Date.now() + 86400000) },
      update: { data, expiresAt: new Date(Date.now() + 86400000) },
    });
  }
}
