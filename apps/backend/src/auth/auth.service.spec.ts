import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@psychology/types';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };
  let auditService: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('authenticates an active admin with a stored password hash', async () => {
    const passwordHash = await bcrypt.hash('valid-password', 4);
    const mockStaff = {
      id: 'staff-uuid-1',
      telegramId: null,
      email: 'admin@school.edu',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      credentialVersion: 1,
      studentIdentifier: null,
    };

    prisma.user.findUnique.mockResolvedValue(mockStaff);

    const result = await service.validateStaffLogin({
      email: ' ADMIN@school.edu ',
      password: 'valid-password',
    });

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.role).toBe(UserRole.ADMIN);
    expect(result.user.email).toBe('admin@school.edu');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@school.edu' },
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'staff-uuid-1',
      role: UserRole.ADMIN,
      credentialVersion: 1,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_LOGIN',
        actorId: 'staff-uuid-1',
      }),
    );
  });

  it('should throw UnauthorizedException on invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.validateStaffLogin({
        email: 'wrong@school.edu',
        password: 'bad-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive account even when its password is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'disabled-admin',
      telegramId: null,
      email: 'disabled@school.edu',
      passwordHash: await bcrypt.hash('valid-password', 4),
      role: UserRole.ADMIN,
      isActive: false,
      credentialVersion: 2,
      studentIdentifier: null,
    });

    await expect(
      service.validateStaffLogin({
        email: 'disabled@school.edu',
        password: 'valid-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
