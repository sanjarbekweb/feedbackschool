import { InlineKeyboard } from 'grammy';

export const StaffKeyboards = {
  mainMenu() {
    return new InlineKeyboard()
      .text('⏳ Javob kutilmoqda', 'staff:filter:UNANSWERED')
      .row()
      .text('📥 Barcha murojaatlar', 'staff:filter:ALL')
      .row()
      .text('✅ Javob berilganlar', 'staff:filter:ANSWERED')
      .row()
      .text('👥 O‘quvchilar', 'staff:students:1')
      .row()
      .text('📊 Statistika', 'staff:stats');
  },

  caseList(
    cases: Array<{ id: string; caseId: string }>,
    filter: string,
    page: number,
    totalPages: number,
  ) {
    const keyboard = new InlineKeyboard();

    for (const c of cases) {
      keyboard.text(`Ochish ${c.caseId}`, `staff:case:${c.id}`).row();
    }

    // Pagination row
    if (page > 1) {
      keyboard.text('◀️ Oldingi', `staff:page:${filter}:${page - 1}`);
    } else {
      keyboard.text('◀️', 'staff:noop');
    }

    keyboard.text(`${page}/${Math.max(totalPages, 1)}`, 'staff:noop');

    if (page < totalPages) {
      keyboard.text('Keyingi ▶️', `staff:page:${filter}:${page + 1}`);
    } else {
      keyboard.text('▶️', 'staff:noop');
    }

    keyboard.row();
    keyboard.text('🏠 Bosh menyu', 'staff:home');

    return keyboard;
  },

  caseDetail(conversationId: string, isClosed: boolean, page = 1, totalPages = 1) {
    const keyboard = new InlineKeyboard();
    if (page > 1) keyboard.text('◀️ Oldingi', `staff:history:${conversationId}:${page - 1}`);
    if (page < totalPages) keyboard.text('Keyingi ▶️', `staff:history:${conversationId}:${page + 1}`);
    if (totalPages > 1) keyboard.row();

    if (!isClosed) {
      keyboard.text('💬 Javob yozish', `staff:action:respond:${conversationId}`).row();
      keyboard.text('✅ Javob berilgan deb belgilash', `staff:action:mark_answered:${conversationId}`).row();
      keyboard.text('🔒 Yopish', `staff:action:close:${conversationId}`).row();
    }
    keyboard.text('⬅️ Ro‘yxatga qaytish', 'staff:filter:UNANSWERED');
    return keyboard;
  },

  studentsList(page: number, totalPages: number) {
    const keyboard = new InlineKeyboard();

    if (page > 1) {
      keyboard.text('◀️ Oldingi', `staff:students:${page - 1}`);
    } else {
      keyboard.text('◀️', 'staff:noop');
    }

    keyboard.text(`${page}/${Math.max(totalPages, 1)}`, 'staff:noop');

    if (page < totalPages) {
      keyboard.text('Keyingi ▶️', `staff:students:${page + 1}`);
    } else {
      keyboard.text('▶️', 'staff:noop');
    }

    keyboard.row();
    keyboard.text('🏠 Bosh menyu', 'staff:home');

    return keyboard;
  },

  statsView() {
    return new InlineKeyboard()
      .text('🔄 Yangilash', 'staff:stats')
      .row()
      .text('🏠 Bosh menyu', 'staff:home');
  },
};
