import { InlineKeyboard, Keyboard } from 'grammy';
import { ConversationCategory, ConversationStatus } from '@psychology/types';

export const StudentKeyboards = {
  mainMenu() {
    return new Keyboard()
      .text('📝 Xabar yozish')
      .row()
      .text('📨 Mening xabarlarim')
      .resized()
      .oneTime();
  },

  inputMenu() {
    return new Keyboard()
      .text('❌ Bekor qilish')
      .resized();
  },

  inlineMainMenu(isMinimized = false) {
    if (isMinimized) {
      return new InlineKeyboard().text('🔼 Menyuni ochish', 'student:menu:expand');
    }
    return new InlineKeyboard()
      .text('📝 Yangi xabar yozish', 'student:action:compose')
      .row()
      .text('📨 Mening xabarlarim', 'student:list')
      .row()
      .text('🔽 Menyuni yig‘ish', 'student:menu:minimize');
  },

  cancelOnly() {
    return new InlineKeyboard().text('❌ Bekor qilish', 'student:cancel');
  },

  categories() {
    return new InlineKeyboard()
      .text('💬 Umumiy savol', `cat:${ConversationCategory.GENERAL}`)
      .row()
      .text('📚 O‘qish', `cat:${ConversationCategory.ACADEMIC}`)
      .row()
      .text('💙 Shaxsiy masala', `cat:${ConversationCategory.PERSONAL}`)
      .row()
      .text('👥 Munosabatlar', `cat:${ConversationCategory.SOCIAL}`)
      .row()
      .text('🚨 Shoshilinch yordam', `cat:${ConversationCategory.URGENT}`)
      .row()
      .text('❌ Bekor qilish', 'student:cancel');
  },

  conversationList(
    conversations: Array<{ id: string; caseId: string; status: string; category?: string }>,
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
          ? 'Javob keldi'
          : conv.status === ConversationStatus.CLOSED
          ? 'Yopilgan'
          : 'Kutilmoqda';

      const catEmoji =
        conv.category === ConversationCategory.ACADEMIC
          ? '📚'
          : conv.category === ConversationCategory.PERSONAL
          ? '💙'
          : conv.category === ConversationCategory.SOCIAL
          ? '👥'
          : conv.category === ConversationCategory.URGENT
          ? '🚨'
          : '💬';

      const catTitle =
        conv.category === ConversationCategory.ACADEMIC
          ? 'O‘qish'
          : conv.category === ConversationCategory.PERSONAL
          ? 'Shaxsiy'
          : conv.category === ConversationCategory.SOCIAL
          ? 'Munosabatlar'
          : conv.category === ConversationCategory.URGENT
          ? 'Shoshilinch'
          : 'Umumiy';

      keyboard.text(`${catEmoji} ${catTitle} — ${statusIcon} ${statusText}`, `student:case:${conv.id}`).row();
    }

    // Pagination row
    if (page > 1) {
      keyboard.text('◀️ Oldingi', `student:page:${page - 1}`);
    } else {
      keyboard.text('◀️', 'student:noop');
    }

    keyboard.text(`${page}/${Math.max(totalPages, 1)}`, 'student:noop');

    if (page < totalPages) {
      keyboard.text('Keyingi ▶️', `student:page:${page + 1}`);
    } else {
      keyboard.text('▶️', 'student:noop');
    }

    keyboard.row();
    keyboard.text('🏠 Bosh menyu', 'student:home');

    return keyboard;
  },

  conversationDetail(conversationId: string, isClosed: boolean, page = 1, totalPages = 1) {
    const keyboard = new InlineKeyboard();
    if (page > 1) keyboard.text('◀️ Oldingi', `student:history:${conversationId}:${page - 1}`);
    if (page < totalPages) keyboard.text('Keyingi ▶️', `student:history:${conversationId}:${page + 1}`);
    if (totalPages > 1) keyboard.row();

    if (!isClosed) {
      keyboard.text('💬 Yana yozish', `student:reply:${conversationId}`).row();
    }
    keyboard.text('⬅️ Xabarlarimga qaytish', 'student:list');
    return keyboard;
  },
};
