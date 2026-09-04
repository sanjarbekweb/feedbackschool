import { Injectable, Logger } from '@nestjs/common';
import { ConversationCategory, ConversationStatus } from '@psychology/types';

export interface StaffNotificationPayload {
  caseId: string;
  category: ConversationCategory;
  status: ConversationStatus;
  timestamp: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Dispatches a notification to authorized psychology staff.
   * INVARIANT: Never contains message content! Only case ID, category, status, and timestamp.
   */
  async notifyStaffGroup(payload: StaffNotificationPayload): Promise<void> {
    const { caseId, category, status, timestamp } = payload;

    // Log the privacy-safe dispatch
    this.logger.log(
      `[Staff Notification] Case=${caseId} Category=${category} Status=${status} Time=${timestamp}`,
    );

    // In Phase 3, this will send a message via grammY to STAFF_TELEGRAM_GROUP_ID
    // Format:
    // 🔔 New psychology support request
    // Case: #A81F42
    // Category: Personal
    // Status: Unanswered
    // Received: 14:32
  }

  /**
   * Dispatches a notification to the student when a staff response is submitted.
   */
  async notifyStudentResponse(studentTelegramId: string, caseId: string): Promise<void> {
    this.logger.log(`[Student Notification] studentTelegramId=${studentTelegramId} Case=${caseId} Response available`);
    // In Phase 3, this triggers student bot message
  }
}
