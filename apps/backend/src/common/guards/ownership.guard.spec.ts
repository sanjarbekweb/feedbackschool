import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { ConversationOwnershipGuard } from './ownership.guard';
import { UserRole } from '@psychology/types';

describe('ConversationOwnershipGuard', () => {
  let guard: ConversationOwnershipGuard;
  let prisma: { conversation: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      conversation: {
        findUnique: jest.fn(),
      },
    };
    guard = new ConversationOwnershipGuard(prisma as any);
  });

  function createMockContext(user: any, params: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow STAFF to access any conversation', async () => {
    const context = createMockContext(
      { id: 'staff-1', role: UserRole.STAFF },
      { id: 'any-conv-id' },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(prisma.conversation.findUnique).not.toHaveBeenCalled();
  });

  it('should allow STUDENT to access their own conversation', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      studentId: 'student-1',
    });

    const context = createMockContext(
      { id: 'student-1', role: UserRole.STUDENT },
      { id: 'conv-123' },
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conv-123' },
      select: { studentId: true },
    });
  });

  it('should throw NotFoundException (IDOR mitigation) when a student attempts to access another student conversation', async () => {
    prisma.conversation.findUnique.mockResolvedValue({
      studentId: 'other-student-999',
    });

    const context = createMockContext(
      { id: 'student-1', role: UserRole.STUDENT },
      { id: 'conv-123' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });
});
