const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating user staff roles...');
  const res1 = await prisma.user.updateMany({
    where: { telegramId: '8264201735' },
    data: { staffRoleId: 'psychologist', displayName: 'Bosh Psixolog' }
  });
  console.log(`Updated admin telegram user: ${res1.count}`);

  const res2 = await prisma.user.updateMany({
    where: { email: 'admin@school.uz' },
    data: { staffRoleId: 'psychologist', displayName: 'Administrator' }
  });
  console.log(`Updated admin email user: ${res2.count}`);

  const roles = await prisma.staffRole.findMany({
    include: { users: { select: { id: true, role: true, displayName: true, telegramId: true } } }
  });
  console.log('Roles with assigned users:', JSON.stringify(roles, null, 2));
}

main().finally(() => prisma.$disconnect());
