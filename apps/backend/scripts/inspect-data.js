const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, staffRoleId: true, isActive: true, telegramId: true }
  });
  const roles = await prisma.staffRole.findMany({
    include: { users: { select: { id: true, role: true, isActive: true } } }
  });
  console.log('--- ALL USERS ---');
  console.log(JSON.stringify(users, null, 2));
  console.log('--- ALL STAFF ROLES ---');
  console.log(JSON.stringify(roles, null, 2));
}

main().finally(() => prisma.$disconnect());
