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
    studentId: 'student-1',
    recipientRoleId: 'psychologist',
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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
      enqueueStaff: jest.fn().mockResolvedValue(undefined),
      enqueueStudent: jest.fn().mockResolvedValue(undefined),
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
    expect(fixture.notificationsService.enqueueStaff).toHaveBeenCalledWith(fixture.transactionClient, 'psychologist', conversation.caseId);
    expect(fixture.notificationsService.enqueueStudent).not.toHaveBeenCalled();
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
      { id: 'staff-1', role: UserRole.STAFF, staffRoleId: 'psychologist' },
    );

    expect(fixture.transactionClient.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ConversationStatus.ANSWERED }),
      }),
    );
    expect(fixture.notificationsService.enqueueStudent).toHaveBeenCalledWith(
      fixture.transactionClient,
      conversation.student.telegramId,
      conversation.caseId,
    );
    expect(fixture.notificationsService.enqueueStaff).not.toHaveBeenCalled();
  });
  it('rejects another student before any mutation or notification', async () => {
    const fixture = createFixture();
    await expect(fixture.service.addMessage(conversation.id, { content: 'test' }, { id: 'another', role: UserRole.STUDENT })).rejects.toThrow();
    expect(fixture.transactionClient.message.create).not.toHaveBeenCalled();
    expect(fixture.notificationsService.enqueueStaff).not.toHaveBeenCalled();
  });
  it('rejects staff from a different recipient role', async () => {
    const fixture = createFixture();
    await expect(fixture.service.addMessage(conversation.id, { content: 'test' }, { id: 'principal', role: UserRole.STAFF, staffRoleId: 'principal' })).rejects.toThrow();
    expect(fixture.transactionClient.message.create).not.toHaveBeenCalled();
  });

});
