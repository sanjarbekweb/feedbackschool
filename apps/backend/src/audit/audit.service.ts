import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateAuditLogParams {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records a security/audit event.
   * INVARIANT: Never pass or log message content here!
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    const { actorId, action, targetType, targetId, metadata } = params;

    // Safety sanitize: strip any field that might accidentally contain message text
    const safeMetadata = metadata ? { ...metadata } : {};
    delete (safeMetadata as Record<string, unknown>)['content'];
    delete (safeMetadata as Record<string, unknown>)['initialMessage'];
    delete (safeMetadata as Record<string, unknown>)['text'];
    delete (safeMetadata as Record<string, unknown>)['message'];

    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          targetType,
          targetId,
          metadata: safeMetadata as any,
        },
      });

      this.logger.log(`Audit: actor=${actorId} action=${action} target=${targetType}:${targetId}`);
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`);
    }
  }
}
