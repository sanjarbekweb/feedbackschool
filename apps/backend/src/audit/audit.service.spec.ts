import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-uuid' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should record audit logs and strictly sanitize any sensitive message content fields', async () => {
    await service.record({
      actorId: 'user-123',
      action: 'CONVERSATION_ACCESSED',
      targetType: 'CONVERSATION',
      targetId: 'conv-456',
      metadata: {
        caseId: '#A81F42',
        status: 'UNANSWERED',
        // Attempt to pass sensitive fields:
        content: 'This sensitive message content should be stripped',
        text: 'Another sensitive text should be stripped',
        initialMessage: 'Secret student issue',
      },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const callArgs = prisma.auditLog.create.mock.calls[0][0];

    expect(callArgs.data.actorId).toBe('user-123');
    expect(callArgs.data.action).toBe('CONVERSATION_ACCESSED');
    expect(callArgs.data.targetId).toBe('conv-456');

    // Verify non-sensitive metadata is preserved
    expect(callArgs.data.metadata.caseId).toBe('#A81F42');
    expect(callArgs.data.metadata.status).toBe('UNANSWERED');

    // Verify sensitive content is completely stripped out
    expect(callArgs.data.metadata.content).toBeUndefined();
    expect(callArgs.data.metadata.text).toBeUndefined();
    expect(callArgs.data.metadata.initialMessage).toBeUndefined();
  });
});
