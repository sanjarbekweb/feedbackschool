import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

describe('Telegram Webhook & Controller', () => {
  let controller: TelegramController;
  let service: Partial<TelegramService>;
  let mockRes: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    service = {
      handleStudentWebhook: jest.fn().mockImplementation((_req, res) => {
        return res.status(200).json({ ok: true, status: 'student_handled' });
      }),
      handleStaffWebhook: jest.fn().mockImplementation((_req, res) => {
        return res.status(200).json({ ok: true, status: 'staff_handled' });
      }),
    };

    controller = new TelegramController(service as TelegramService);
  });

  it('should delegate student webhook updates to TelegramService', async () => {
    const mockReq = { body: { update_id: 12345 } };
    await controller.handleStudentWebhook(mockReq as any, mockRes as any);

    expect(service.handleStudentWebhook).toHaveBeenCalledWith(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ ok: true, status: 'student_handled' });
  });

  it('should delegate staff webhook updates to TelegramService', async () => {
    const mockReq = { body: { update_id: 67890 } };
    await controller.handleStaffWebhook(mockReq as any, mockRes as any);

    expect(service.handleStaffWebhook).toHaveBeenCalledWith(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ ok: true, status: 'staff_handled' });
  });

  it('should return safe response when webhook is received in dormant/polling state', () => {
    const realService = new TelegramService(
      { get: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    realService.handleStudentWebhook({}, mockRes as any);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ ok: true, status: 'dormant_or_polling' });
  });
});
