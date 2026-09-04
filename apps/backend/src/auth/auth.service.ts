import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, CurrentUser } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

const INVALID_CREDENTIAL_HASH =
  '$2a$12$ESQ9vA5u/DHWvRGpft80beC4wB36MvG0N1Nai2U.MR0BSNeUyTYSO';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateStaffLogin(dto: LoginDto): Promise<{ user: CurrentUser; token: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = await bcrypt
      .compare(dto.password, user?.passwordHash ?? INVALID_CREDENTIAL_HASH)
      .catch(() => false);

    if (
      !user ||
      !passwordMatches ||
      !user.isActive ||
      (user.role !== UserRole.STAFF && user.role !== UserRole.ADMIN)
    ) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      credentialVersion: user.credentialVersion,
    };
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
        email: user.email,
        role: user.role,
        studentIdentifier: user.studentIdentifier,
      },
      token,
    };
  }
}
