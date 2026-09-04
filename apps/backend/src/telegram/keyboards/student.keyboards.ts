import { InlineKeyboard, Keyboard } from 'grammy';
import { ConversationCategory, ConversationStatus } from '@psychology/types';

export const StudentKeyboards = {
  mainMenu() {
    return new Keyboard()
      .text('📝 Send a message')
      .row()
      .text('📨 My messages')
      .resized();
  },

  categories() {
    return new InlineKeyboard()
      .text('💬 General Inquiry', `cat:${ConversationCategory.GENERAL}`)
      .row()
      .text('📚 Academic Stress', `cat:${ConversationCategory.ACADEMIC}`)
      .row()
      .text('💙 Personal / Emotional', `cat:${ConversationCategory.PERSONAL}`)
      .row()
      .text('👥 Social / Relationships', `cat:${ConversationCategory.SOCIAL}`)
      .row()
      .text('🚨 Urgent Support', `cat:${ConversationCategory.URGENT}`)
      .row()
      .text('❌ Cancel', 'student:cancel');
  },

  conversationList(
    conversations: Array<{ id: string; caseId: string; status: string }>,
    page: number,
    totalPages: number,
  ) {
    const keyboard = new InlineKeyboard();

    for (const conv of conversations) {
      let statusIcon = '⏳';
      if (conv.status === ConversationStatus.ANSWERED) statusIcon = '💬';
      else if (conv.status === ConversationStatus.CLOSED) statusIcon = '🔒';

      const statusText =
        conv.status === ConversationStatus.ANSWERED
          ? 'Response available'
          : conv.status === ConversationStatus.CLOSED
          ? 'Closed'
          : 'Unanswered';

      keyboard.text(`${conv.caseId} — ${statusIcon} ${statusText}`, `student:case:${conv.id}`).row();
    }

    // Pagination row
    if (page > 1) {
      keyboard.text('◀️ Prev', `student:page:${page - 1}`);
    } else {
      keyboard.text('◀️', 'student:noop');
    }

    keyboard.text(`${page}/${Math.max(totalPages, 1)}`, 'student:noop');

    if (page < totalPages) {
      keyboard.text('Next ▶️', `student:page:${page + 1}`);
    } else {
      keyboard.text('▶️', 'student:noop');
    }

    keyboard.row();
    keyboard.text('🏠 Main Menu', 'student:home');

    return keyboard;
  },

  conversationDetail(conversationId: string, isClosed: boolean) {
    const keyboard = new InlineKeyboard();
    if (!isClosed) {
      keyboard.text('💬 Send Follow-up Message', `student:reply:${conversationId}`).row();
    }
    keyboard.text('⬅️ Back to My Messages', 'student:list');
    return keyboard;
  },
};
