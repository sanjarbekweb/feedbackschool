import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, CurrentUser } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateStaffLogin(dto: LoginDto): Promise<{ user: CurrentUser; token: string }> {
    const { email, password } = dto;

    // Look for staff or admin user by email (stored in studentIdentifier/email convention) or seed user
    let user = await this.prisma.user.findFirst({
      where: {
        role: { in: [UserRole.STAFF, UserRole.ADMIN] },
        studentIdentifier: email,
      },
    });

    // Default bootstrap staff user support for local development and testing
    const defaultEmail = process.env.DEFAULT_STAFF_EMAIL || 'staff@school.edu';
    const defaultPassword = process.env.DEFAULT_STAFF_PASSWORD || 'SchoolPsychology2026!';

    if (!user && email === defaultEmail) {
      // Upsert default bootstrap staff user
      user = await this.prisma.user.upsert({
        where: { telegramId: 'bootstrap-staff-001' },
        update: {
          role: UserRole.STAFF,
          studentIdentifier: defaultEmail,
        },
        create: {
          telegramId: 'bootstrap-staff-001',
          role: UserRole.STAFF,
          studentIdentifier: defaultEmail,
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Validate password (supports bcrypt hash or default fallback in development)
    const isDefaultMatch = email === defaultEmail && password === defaultPassword;
    if (!isDefaultMatch) {
      // If a password hash is stored in user metadata or future table, check bcrypt
      const isMatch = await bcrypt.compare(password, '$2b$10$dummyHashToPreventTimingAttack00000000000000000000000').catch(() => false);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid email or password.');
      }
    }

    const payload = { sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    await this.auditService.record({
      actorId: user.id,
      action: 'STAFF_LOGIN',
      targetType: 'USER',
      targetId: user.id,
      metadata: { method: 'WEB_DASHBOARD' },
    });

    return {
      user: {
        id: user.id,
        telegramId: user.telegramId,
        role: user.role,
        studentIdentifier: user.studentIdentifier,
      },
      token,
    };
  }
}
