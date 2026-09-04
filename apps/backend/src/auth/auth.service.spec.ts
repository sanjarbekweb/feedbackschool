import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@psychology/types';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findFirst: jest.Mock; upsert: jest.Mock } };
  let jwtService: { sign: jest.Mock };
  let auditService: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
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

  it('should authenticate bootstrap staff user and return token and user', async () => {
    const mockStaff = {
      id: 'staff-uuid-1',
      telegramId: 'bootstrap-staff-001',
      role: UserRole.STAFF,
      studentIdentifier: 'staff@school.edu',
    };

    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.upsert.mockResolvedValue(mockStaff);

    const result = await service.validateStaffLogin({
      email: 'staff@school.edu',
      password: 'SchoolPsychology2026!',
    });

    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.role).toBe(UserRole.STAFF);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'STAFF_LOGIN',
        actorId: 'staff-uuid-1',
      }),
    );
  });

  it('should throw UnauthorizedException on invalid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.validateStaffLogin({
        email: 'wrong@school.edu',
        password: 'bad-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
