import {
  ConversationCategory,
  ConversationStatus,
  SenderType,
  UserRole,
} from '@psychology/types';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  const conversation = {
    id: 'conversation-1',
    caseId: '#A81F42',
    category: ConversationCategory.GENERAL,
    status: ConversationStatus.ANSWERED,
    student: { telegramId: 'student-telegram-id' },
  };

  const message = {
    id: 'message-1',
    conversationId: conversation.id,
    senderId: 'student-1',
    senderType: SenderType.STUDENT,
    content: 'Sensitive message text',
    createdAt: new Date('2026-09-05T08:00:00.000Z'),
    readAt: null,
  };

  function createFixture() {
    const transactionClient = {
      message: { create: jest.fn().mockResolvedValue(message) },
      conversation: {
        update: jest.fn().mockResolvedValue({
          status: ConversationStatus.UNANSWERED,
          category: conversation.category,
          updatedAt: new Date('2026-09-05T08:00:01.000Z'),
        }),
      },
    };
    const prisma = {
      conversation: { findUnique: jest.fn().mockResolvedValue(conversation) },
      $transaction: jest.fn(
        (callback: (client: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const auditService = { record: jest.fn().mockResolvedValue(undefined) };
    const notificationsService = {
      notifyStaffGroup: jest.fn().mockResolvedValue(undefined),
      notifyStudentResponse: jest.fn().mockResolvedValue(undefined),
    };
    const realtimeService = { emit: jest.fn() };

    const service = new MessagesService(
      prisma as never,
      auditService as never,
      notificationsService as never,
      realtimeService as never,
    );

    return {
      service,
      transactionClient,
      notificationsService,
      realtimeService,
    };
  }

  it('reopens an answered case and notifies staff when a student follows up', async () => {
    const fixture = createFixture();

    await fixture.service.addMessage(
      conversation.id,
      { content: message.content },
      { id: 'student-1', role: UserRole.STUDENT },
    );

    expect(fixture.transactionClient.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ConversationStatus.UNANSWERED }),
      }),
    );
    expect(fixture.notificationsService.notifyStaffGroup).toHaveBeenCalledWith({
      caseId: conversation.caseId,
      category: conversation.category,
      status: ConversationStatus.UNANSWERED,
      timestamp: message.createdAt.toISOString(),
      reason: 'STUDENT_FOLLOW_UP',
    });
    expect(fixture.notificationsService.notifyStudentResponse).not.toHaveBeenCalled();
    expect(fixture.realtimeService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MESSAGE_CREATED' }),
    );
    expect(fixture.realtimeService.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CONVERSATION_UPDATED' }),
    );
  });

  it('marks the case answered and notifies the student after a staff reply', async () => {
    const fixture = createFixture();
    fixture.transactionClient.message.create.mockResolvedValue({
      ...message,
      senderId: 'staff-1',
      senderType: SenderType.STAFF,
    });
    fixture.transactionClient.conversation.update.mockResolvedValue({
      status: ConversationStatus.ANSWERED,
      category: conversation.category,
      updatedAt: new Date('2026-09-05T08:00:01.000Z'),
    });

    await fixture.service.addMessage(
      conversation.id,
      { content: 'Staff response' },
      { id: 'staff-1', role: UserRole.STAFF },
    );

    expect(fixture.transactionClient.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ConversationStatus.ANSWERED }),
      }),
    );
    expect(fixture.notificationsService.notifyStudentResponse).toHaveBeenCalledWith(
      conversation.student.telegramId,
      conversation.caseId,
    );
    expect(fixture.notificationsService.notifyStaffGroup).not.toHaveBeenCalled();
  });
});
