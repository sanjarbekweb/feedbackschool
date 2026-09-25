# Maktab murojaatlari: yangilash rejasi

## 1. Boshlang‘ich tizim
NestJS + PostgreSQL + Prisma, Telegram botlari va Next.js boshqaruv paneli saqlanadi. Docker shart emas: Node.js va boshqariladigan PostgreSQL yoki systemd orqali VPS. 1 000 faol foydalanuvchi har 10 soniyada bitta amal bajarsa taxminan 100 so‘rov/soniya; bu hisob, o‘lchangan natija emas.

## 2. Aniqlangan muammolar
Xodimlarning umumiy ruxsati, xotiradagi bot holati, sinxron Telegram bildirishnomalari, barcha xabarlarni ko‘radigan statistika so‘rovi, takroriy SSE qayta yuklashlar, inglizcha uzun matnlar. Mavjud bot tarixida keyingi sahifa yo‘q.

## 3. Maqsadli o‘zgarishlar
Avval baza va ruxsatlar: `staff_roles` (Psixolog, Direktor va administrator qo‘shadigan lavozimlar), xodimning lavozimi, murojaatning qabul qiluvchi lavozimi. ADMIN boshqaradi; STAFF faqat o‘z lavozimiga yuborilgan murojaatlarni ko‘radi. Direktor avtomatik administrator bo‘lmaydi. Eski murojaatlar va STAFF hisoblari Psixolog lavozimiga o‘tadi.

Keyin bot: qabul qiluvchini tanlash, qisqa o‘zbekcha matnlar, sanalarsiz xabarlar, sahifalash. Keyin panel: o‘zbekcha interfeys, lavozim va xodim qo‘shish, Apple dizaynidagi aniq ierarxiya, tez bosish javobi, klaviatura va kamaytirilgan harakat.

## 4. Xarajat va cheklovlar
PostgreSQL navbati tashqi yuborishni so‘rovdan ajratadi, lekin qayta urinish, tozalash va kuzatish talab qiladi. Telegram qayta urinishida takroriy bildirishnoma ehtimoli bor. Bitta backend nusxasi boshlang‘ich joylashtirish; SSE va rate limiter bir nechta nusxaga o‘tishdan oldin umumiylashtirilishi kerak. Baza pool hajmi barcha jarayonlar yig‘indisidan hisoblanadi. Redis faqat o‘lchov talab qilsa qo‘shiladi.

## 5. Tekshiruv va foydalanish
Migratsiya, rollar bo‘yicha maxfiylik sinovlari, bot oqimlari, build/lint/test, 1 000 virtual foydalanuvchili yuklama ssenariysi. Haqiqiy PostgreSQL va hostingda yuklama sinovi o‘tmaguncha 1 000 foydalanuvchiga tayyor deb hisoblanmaydi.

Manbalar: https://core.telegram.org/bots/faq (yuborish chegaralari), https://core.telegram.org/bots/api#setwebhook (1–100 webhook ulanishi), https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/connection-pool (pool), https://www.postgresql.org/docs/current/sql-select.html (SKIP LOCKED).
