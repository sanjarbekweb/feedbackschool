import { Injectable, Logger } from '@nestjs/common';
import { ConversationCategory, ConversationStatus } from '@psychology/types';

export interface StaffNotificationPayload {
  caseId: string;
  category: ConversationCategory;
  status: ConversationStatus;
  timestamp: string;
  reason?: 'NEW_CONVERSATION' | 'STUDENT_FOLLOW_UP';
}

export type StaffGroupNotifier = (formattedText: string) => Promise<void>;
export type StudentNotifier = (studentTelegramId: string, caseId: string, messageText: string) => Promise<void>;

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Inquiry',
  ACADEMIC: 'Academic Stress',
  PERSONAL: 'Personal / Emotional',
  SOCIAL: 'Social / Relationships',
  URGENT: 'Urgent Support',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private staffGroupNotifier?: StaffGroupNotifier;
  private studentNotifier?: StudentNotifier;

  registerStaffGroupNotifier(notifier: StaffGroupNotifier) {
    this.staffGroupNotifier = notifier;
  }

  registerStudentNotifier(notifier: StudentNotifier) {
    this.studentNotifier = notifier;
  }

  /**
   * Dispatches a privacy-safe notification to authorized psychology staff group.
   * INVARIANT: Never contains message content or personal identifiers!
   * Only case ID, category, status, and timestamp.
   */
  async notifyStaffGroup(payload: StaffNotificationPayload): Promise<void> {
    const { caseId, category, status, timestamp, reason = 'NEW_CONVERSATION' } = payload;

    this.logger.log(
      `[Staff Notification] Case=${caseId} Category=${category} Status=${status} Time=${timestamp}`,
    );

    const categoryLabel = CATEGORY_LABELS[category] || category;
    const timeFormatted = new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const title =
      reason === 'STUDENT_FOLLOW_UP'
        ? 'Student follow-up received'
        : 'New psychology support request';

    const formattedText =
      `🔔 *${title}*\n\n` +
      `Case: *${caseId}*\n` +
      `Category: ${categoryLabel}\n` +
      `Status: ${status === ConversationStatus.UNANSWERED ? '⏳ Unanswered' : status}\n` +
      `Received: ${timeFormatted}\n\n` +
      `Open in staff bot or dashboard to review and reply.`;

    if (this.staffGroupNotifier) {
      try {
        await this.staffGroupNotifier(formattedText);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to send staff group notification: ${message}`);
      }
    }
  }

  /**
   * Dispatches a notification to the student when a staff response is submitted.
   */
  async notifyStudentResponse(studentTelegramId: string, caseId: string): Promise<void> {
    this.logger.log(`[Student Notification] Case=${caseId} Response available`);

    const messageText =
      `📩 *You have received a response from the psychology staff regarding Case ${caseId}.*\n\n` +
      `Click below to view the response:`;

    if (this.studentNotifier) {
      try {
        await this.studentNotifier(studentTelegramId, caseId, messageText);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to send student notification: ${message}`);
      }
    }
  }
}
