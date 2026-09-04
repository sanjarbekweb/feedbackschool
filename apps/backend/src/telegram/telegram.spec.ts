import { Bot, Context } from 'grammy';
import { StudentBotController } from './student/student.bot';
import { StaffBotController } from './staff/staff.bot';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { StatisticsService } from '../statistics/statistics.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ConversationCategory,
  ConversationStatus,
  SenderType,
  UserRole,
} from '@psychology/types';

describe('Telegram Bots & Handlers (Phase 3)', () => {
  let studentBot: Bot<Context>;
  let staffBot: Bot<Context>;
  let conversationsService: jest.Mocked<ConversationsService>;
  let messagesService: jest.Mocked<MessagesService>;
  let usersService: jest.Mocked<UsersService>;
  let statisticsService: jest.Mocked<StatisticsService>;
  let notificationsService: NotificationsService;

  beforeEach(() => {
    // Instantiate dummy bots for testing handlers (avoiding live network calls)
    studentBot = new Bot<Context>('123456:dummy-student-token');
    staffBot = new Bot<Context>('123456:dummy-staff-token');

    conversationsService = {
      createConversation: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as any;

    messagesService = {
      getMessages: jest.fn(),
      addMessage: jest.fn(),
    } as any;

    usersService = {
      findById: jest.fn(),
      findByTelegramId: jest.fn(),
      getOrCreateStudent: jest.fn(),
      listStudents: jest.fn(),
    } as any;

    statisticsService = {
      getDashboardStatistics: jest.fn(),
    } as any;

    notificationsService = new NotificationsService();
  });

  describe('Privacy Invariant on Staff Group Notifications', () => {
    it('dispatches notification containing case ID, category, status, and timestamp, but ZERO message content', async () => {
      let capturedNotification = '';
      notificationsService.registerStaffGroupNotifier(async (text: string) => {
        capturedNotification = text;
      });

      const sensitiveMessage = 'I am struggling with deep depression and anxiety';

      await notificationsService.notifyStaffGroup({
        caseId: '#A81F42',
        category: ConversationCategory.PERSONAL,
        status: ConversationStatus.UNANSWERED,
        timestamp: new Date('2026-09-04T12:00:00Z').toISOString(),
      });

      expect(capturedNotification).toContain('#A81F42');
      expect(capturedNotification).toContain('Personal / Emotional');
      expect(capturedNotification).toContain('Unanswered');

      // CRITICAL PRIVACY INVARIANT: zero message body leakage
      expect(capturedNotification).not.toContain(sensitiveMessage);
      expect(capturedNotification).not.toContain('depression');
      expect(capturedNotification).not.toContain('anxiety');
      expect(capturedNotification).not.toContain('phone');
      expect(capturedNotification).not.toContain('username');
    });
  });

  describe('Student Telegram Bot', () => {
    let controller: StudentBotController;

    beforeEach(() => {
      controller = new StudentBotController(
        studentBot,
        conversationsService,
        messagesService,
        usersService,
      );
    });

    it('creates a conversation via ConversationsService when student completes flow', async () => {
      usersService.getOrCreateStudent.mockResolvedValue({
        id: 'student-user-uuid',
        telegramId: '99887766',
        role: UserRole.STUDENT,
        studentIdentifier: 'S-1234',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      conversationsService.createConversation.mockResolvedValue({
        id: 'conv-uuid-1',
        caseId: '#A81F42',
        studentId: 'student-user-uuid',
        category: ConversationCategory.ACADEMIC,
        status: ConversationStatus.UNANSWERED,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      } as any);

      const fakeCtx: any = {
        from: { id: 99887766 },
        reply: jest.fn(),
      };

      // Set session to awaiting initial message
      (controller as any).setSession(99887766, {
        state: 'AWAITING_INITIAL_MESSAGE',
        selectedCategory: ConversationCategory.ACADEMIC,
      });

      await (controller as any).handleCreateConversation(
        fakeCtx,
        (controller as any).getSession(99887766),
        'I need help with my exam schedule.',
      );

      expect(conversationsService.createConversation).toHaveBeenCalledWith({
        studentTelegramId: '99887766',
        category: ConversationCategory.ACADEMIC,
        initialMessage: 'I need help with my exam schedule.',
      });

      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('#A81F42'),
        expect.any(Object),
      );
    });

    it('enforces student ownership when viewing conversation details', async () => {
      usersService.getOrCreateStudent.mockResolvedValue({
        id: 'legit-student-id',
        telegramId: '111111',
        role: UserRole.STUDENT,
      } as any);

      // Return a conversation belonging to another student
      conversationsService.findOne.mockResolvedValue({
        id: 'conv-other-student',
        caseId: '#B99999',
        studentId: 'victim-student-id', // DIFFERENT STUDENT!
        category: ConversationCategory.PERSONAL,
        status: ConversationStatus.UNANSWERED,
      } as any);

      const fakeCtx: any = {
        from: { id: 111111 },
        reply: jest.fn(),
      };

      await (controller as any).sendConversationDetail(fakeCtx, 'conv-other-student');

      // Must reject access and not show messages!
      expect(fakeCtx.reply).toHaveBeenCalledWith('Case not found.');
      expect(messagesService.getMessages).not.toHaveBeenCalled();
    });
  });

  describe('Staff Telegram Bot', () => {
    let controller: StaffBotController;

    beforeEach(() => {
      controller = new StaffBotController(
        staffBot,
        conversationsService,
        messagesService,
        usersService,
        statisticsService,
      );
    });

    it('blocks unauthorized Telegram users who do not have STAFF or ADMIN role', async () => {
      usersService.findByTelegramId.mockResolvedValue(null); // Unknown user

      const fakeCtx: any = {
        from: { id: 555555 },
        reply: jest.fn(),
      };
      const next = jest.fn();

      await controller.authMiddleware(fakeCtx, next);

      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Access Restricted'),
        expect.any(Object),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('allows authorized staff users to proceed', async () => {
      usersService.findByTelegramId.mockResolvedValue({
        id: 'staff-uuid-1',
        telegramId: '777777',
        role: UserRole.STAFF,
      } as any);

      const fakeCtx: any = {
        from: { id: 777777 },
        reply: jest.fn(),
      };
      const next = jest.fn();

      await controller.authMiddleware(fakeCtx, next);

      expect(next).toHaveBeenCalled();
      expect(fakeCtx.staffUser).toBeDefined();
      expect(fakeCtx.staffUser.role).toBe(UserRole.STAFF);
    });

    it('sends response via MessagesService and updates conversation', async () => {
      const staffUser = {
        id: 'staff-uuid-1',
        telegramId: '777777',
        role: UserRole.STAFF,
      };

      messagesService.addMessage.mockResolvedValue({
        id: 'msg-uuid-1',
        conversationId: 'conv-123',
        senderId: staffUser.id,
        senderType: SenderType.STAFF,
        content: 'We are here to help.',
        createdAt: new Date(),
        readAt: null,
      });

      const fakeCtx: any = {
        from: { id: 777777 },
        staffUser,
        reply: jest.fn(),
      };

      const session = {
        state: 'AWAITING_REPLY' as any,
        activeConversationId: 'conv-123',
        activeCaseId: '#A81F42',
      };

      await (controller as any).handleSendResponse(
        fakeCtx,
        session,
        'We are here to help.',
      );

      expect(messagesService.addMessage).toHaveBeenCalledWith(
        'conv-123',
        { content: 'We are here to help.' },
        staffUser,
      );

      expect(fakeCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Response sent for Case *#A81F42*'),
        expect.any(Object),
      );
    });
  });
});
