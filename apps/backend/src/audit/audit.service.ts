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
    const blockedKeys = new Set(['content', 'initialMessage', 'text', 'message']);
    const safeMetadata: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(metadata ?? {})) {
      if (blockedKeys.has(key)) continue;
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        safeMetadata[key] = value;
      }
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          targetType,
          targetId,
          metadata: safeMetadata,
        },
      });

      this.logger.log(`Audit: actor=${actorId} action=${action} target=${targetType}:${targetId}`);
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`);
    }
  }
}
