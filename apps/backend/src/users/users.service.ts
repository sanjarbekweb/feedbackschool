import { Injectable } from '@nestjs/common';
import { UserRole } from '@psychology/types';
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
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      // Generate an anonymized student identifier if not provided, e.g. "S-9481"
      const anonCode = studentIdentifier || `S-${Math.floor(1000 + Math.random() * 9000)}`;
      user = await this.prisma.user.create({
        data: {
          telegramId,
          role: UserRole.STUDENT,
          studentIdentifier: anonCode,
        },
      });
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

  async listStudents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.STUDENT },
        select: {
          id: true,
          studentIdentifier: true,
          createdAt: true,
          _count: {
            select: { conversations: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: { role: UserRole.STUDENT },
      }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
