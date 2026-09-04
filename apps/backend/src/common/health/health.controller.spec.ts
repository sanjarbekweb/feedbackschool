import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    controller = new HealthController(prisma as any);
  });

  it('should return 200 OK and connected status when database is healthy', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await controller.check(mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
        service: 'psychology-support-backend',
      }),
    );
  });

  it('should return 503 SERVICE_UNAVAILABLE when database connection fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

    await controller.check(mockResponse as any);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        database: 'disconnected',
        error: 'Database connection failed',
      }),
    );
  });
});
