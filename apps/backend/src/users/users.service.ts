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

  private readonly telegramUserCache = new Map<string, { user: any; expiresAt: number }>();
  private readonly studentCache = new Map<string, { user: any; expiresAt: number }>();
  private readonly rolesCache = new Map<boolean, { data: any[]; expiresAt: number }>();

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByTelegramId(telegramId: string) {
    const now = Date.now();
    const cached = this.telegramUserCache.get(telegramId);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (user) {
      this.telegramUserCache.set(telegramId, {
        user,
        expiresAt: now + 60_000, // 60s TTL
      });
    }

    return user;
  }

  async getOrCreateStudent(telegramId: string, studentIdentifier?: string) {
    const now = Date.now();
    const cached = this.studentCache.get(telegramId);
    if (cached && cached.expiresAt > now && cached.user.isActive && cached.user.studentIdentifier) {
      return cached.user;
    }

    let user = await this.prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId, role: UserRole.STUDENT, studentIdentifier: studentIdentifier || `S-${randomUUID().slice(0, 8)}` },
    });
    if (!user.isActive) {
      throw new ForbiddenException('Bu hisob faol emas.');
    }
    if (!user.studentIdentifier) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { studentIdentifier: studentIdentifier || `S-${randomUUID().slice(0, 8)}` },
      });
    }

    this.studentCache.set(telegramId, {
      user,
      expiresAt: now + 300_000, // 5 min TTL
    });

    return user;
  }

  async ensureStaffUser(telegramId: string, role: typeof UserRole.STAFF | typeof UserRole.ADMIN = UserRole.STAFF) {
    this.telegramUserCache.delete(telegramId);
    const user = await this.prisma.user.upsert({
      where: { telegramId },
      update: { role },
      create: {
        telegramId,
        role,
      },
    });
    this.rolesCache.clear();
    return user;
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
    const now = Date.now();
    const cached = this.rolesCache.get(availableOnly);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const roles = await this.prisma.staffRole.findMany({
      where: availableOnly
        ? {
            isActive: true,
            OR: [
              { users: { some: { isActive: true, role: { in: [UserRole.STAFF, UserRole.ADMIN] } } } },
              { id: { in: ['psychologist', 'principal'] } },
            ],
          }
        : {},
      orderBy: { name: 'asc' },
      take: 100,
    });

    this.rolesCache.set(availableOnly, {
      data: roles,
      expiresAt: now + 300_000, // 5 min TTL
    });

    return roles;
  }

  async createRole(name: string, actor: CurrentUser) {
    if (actor.role !== UserRole.ADMIN) throw new ForbiddenException();
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const role = await tx.staffRole.create({ data: { name: name.trim() } });
          await tx.auditLog.create({ data: { actorId: actor.id, action: 'ROLE_CREATED', targetType: 'STAFF_ROLE', targetId: role.id } });
          return role;
        },
        { maxWait: 10000, timeout: 20000 },
      );
      this.rolesCache.clear();
      return result;
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
      const user = await this.prisma.$transaction(
        async (tx) => {
          const created = await tx.user.create({ data: {
            displayName: dto.displayName.trim(), staffRoleId: role.id,
            telegramId: dto.telegramId, role: UserRole.STAFF,
            email: dto.email?.trim().toLowerCase(), passwordHash,
          }, select: this.staffSelect });
          await tx.auditLog.create({ data: { actorId: actor.id, action: 'STAFF_CREATED', targetType: 'USER', targetId: created.id } });
          return created;
        },
        { maxWait: 10000, timeout: 20000 },
      );
      this.rolesCache.clear();
      return user;
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
    const result = await this.prisma.$transaction(
      async (tx) => {
        const updateResult = await tx.user.updateMany({ where: { id, role: UserRole.STAFF }, data: { isActive, credentialVersion: { increment: 1 } } });
        if (!updateResult.count) throw new BadRequestException('Xodim topilmadi.');
        await tx.auditLog.create({ data: { actorId: actor.id, action: isActive ? 'STAFF_ENABLED' : 'STAFF_DISABLED', targetType: 'USER', targetId: id } });
        return { id, isActive };
      },
      { maxWait: 10000, timeout: 20000 },
    );
    this.rolesCache.clear();
    this.telegramUserCache.clear();
    return result;
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
