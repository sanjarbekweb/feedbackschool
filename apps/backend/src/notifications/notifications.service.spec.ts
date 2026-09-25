import { NotificationsService } from './notifications.service';

describe('Durable notifications', () => {
  function fixture(active = true) {
    const job = { id: 'job', kind: 'STAFF', target: 'staff', caseId: '#CASE', attempts: 0 };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([job]),
      user: { findUnique: jest.fn().mockResolvedValue({ isActive: active, role: 'STAFF', telegramId: '123', staffRoleId: 'principal' }) },
      conversation: { findUnique: jest.fn().mockResolvedValue({ recipientRoleId: 'principal' }) },
      notificationJob: { delete: jest.fn(), update: jest.fn() },
    };
    const service = new NotificationsService(prisma as never);
    const send = jest.fn();
    service.registerStaffGroupNotifier(send);
    service.registerStudentNotifier(jest.fn());
    return { service, send, prisma };
  }

  it('sends only a case reference to the authorized recipient', async () => {
    const { service, send, prisma } = fixture();
    await service.drain();
    expect(send).toHaveBeenCalledWith('🔔 Yangi xabar: #CASE\nMurojaatni bot yoki panelda oching.', '123');
    expect(prisma.notificationJob.delete).toHaveBeenCalledWith({ where: { id: 'job' } });
  });

  it('does not notify a disabled staff account', async () => {
    const { service, send } = fixture(false);
    await service.drain();
    expect(send).not.toHaveBeenCalled();
  });

  it('does not notify staff after recipient membership changes', async () => {
    const { service, send, prisma } = fixture();
    prisma.conversation.findUnique.mockResolvedValue({ recipientRoleId: 'psychologist' });
    await service.drain();
    expect(send).not.toHaveBeenCalled();
  });

  it('persists a retry and honors Telegram retry_after without deleting the job', async () => {
    const { service, send, prisma } = fixture();
    send.mockRejectedValue({ parameters: { retry_after: 90 } });
    const before = Date.now();
    await service.drain();
    expect(prisma.notificationJob.delete).not.toHaveBeenCalled();
    const update = prisma.notificationJob.update.mock.calls[0]?.[0];
    expect(update.data.attempts).toEqual({ increment: 1 });
    expect(update.data.availableAt.getTime()).toBeGreaterThanOrEqual(before + 90_000);
  });
});
