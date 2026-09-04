import { InlineKeyboard } from 'grammy';

export const StaffKeyboards = {
  mainMenu() {
    return new InlineKeyboard()
      .text('⏳ Unanswered Cases', 'staff:filter:UNANSWERED')
      .row()
      .text('📥 All Cases', 'staff:filter:ALL')
      .row()
      .text('✅ Answered Cases', 'staff:filter:ANSWERED')
      .row()
      .text('👥 Students', 'staff:students:1')
      .row()
      .text('📊 Statistics', 'staff:stats');
  },

  caseList(
    cases: Array<{ id: string; caseId: string }>,
    filter: string,
    page: number,
    totalPages: number,
  ) {
    const keyboard = new InlineKeyboard();

    for (const c of cases) {
      keyboard.text(`Open ${c.caseId}`, `staff:case:${c.id}`).row();
    }

    // Pagination row
    if (page > 1) {
      keyboard.text('◀️ Prev', `staff:page:${filter}:${page - 1}`);
    } else {
      keyboard.text('◀️', 'staff:noop');
    }

    keyboard.text(`${page}/${Math.max(totalPages, 1)}`, 'staff:noop');

    if (page < totalPages) {
      keyboard.text('Next ▶️', `staff:page:${filter}:${page + 1}`);
    } else {
      keyboard.text('▶️', 'staff:noop');
    }

    keyboard.row();
    keyboard.text('🏠 Main Menu', 'staff:home');

    return keyboard;
  },

  caseDetail(conversationId: string, isClosed: boolean) {
    const keyboard = new InlineKeyboard();
    if (!isClosed) {
      keyboard.text('💬 Respond', `staff:action:respond:${conversationId}`).row();
      keyboard.text('✅ Mark Answered', `staff:action:mark_answered:${conversationId}`).row();
      keyboard.text('🔒 Close Case', `staff:action:close:${conversationId}`).row();
    }
    keyboard.text('⬅️ Back to List', 'staff:filter:UNANSWERED');
    return keyboard;
  },

  studentsList(page: number, totalPages: number) {
    const keyboard = new InlineKeyboard();

    if (page > 1) {
      keyboard.text('◀️ Prev', `staff:students:${page - 1}`);
    } else {
      keyboard.text('◀️', 'staff:noop');
    }

    keyboard.text(`${page}/${Math.max(totalPages, 1)}`, 'staff:noop');

    if (page < totalPages) {
      keyboard.text('Next ▶️', `staff:students:${page + 1}`);
    } else {
      keyboard.text('▶️', 'staff:noop');
    }

    keyboard.row();
    keyboard.text('🏠 Main Menu', 'staff:home');

    return keyboard;
  },

  statsView() {
    return new InlineKeyboard()
      .text('🔄 Refresh', 'staff:stats')
      .row()
      .text('🏠 Main Menu', 'staff:home');
  },
};
