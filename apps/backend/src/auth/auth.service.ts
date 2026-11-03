import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, CurrentUser } from '@psychology/types';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { STAFF_ROLES, StaffRoleId, VALID_ROLE_IDS } from './dto/role-login.dto';
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
      throw new UnauthorizedException('Pochta yoki parol noto\u2018g\u2018ri.');
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

  async roleLogin(roleId: StaffRoleId): Promise<{ user: CurrentUser; token: string }> {
    if (!VALID_ROLE_IDS.includes(roleId)) {
      throw new UnauthorizedException('Noto\u2018g\u2018ri lavozim tanlandi.');
    }

    const roleName = STAFF_ROLES[roleId];

    // Ensure the staff role exists in database
    await this.prisma.staffRole.upsert({
      where: { id: roleId },
      update: { isActive: true },
      create: {
        id: roleId,
        name: roleName,
        isActive: true,
      },
    });

    // Find or create default user for this role
    let user = await this.prisma.user.findFirst({
      where: { staffRoleId: roleId, role: UserRole.STAFF, isActive: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          role: UserRole.STAFF,
          staffRoleId: roleId,
          displayName: roleName,
          email: `${roleId}@maktab.uz`,
          isActive: true,
        },
      });
    }

    const payload = {
      sub: user.id,
      role: user.role,
      credentialVersion: user.credentialVersion,
    };
    const token = this.jwtService.sign(payload);

    await this.auditService.record({
      actorId: user.id,
      action: 'STAFF_ROLE_LOGIN',
      targetType: 'USER',
      targetId: user.id,
      metadata: { method: 'DIRECT_ROLE_SELECTION', roleId },
    });

    return {
      user: {
        id: user.id,
        telegramId: user.telegramId,
        email: user.email,
        role: user.role,
        staffRoleId: user.staffRoleId,
        displayName: user.displayName,
        studentIdentifier: user.studentIdentifier,
      },
      token,
    };
  }
}
