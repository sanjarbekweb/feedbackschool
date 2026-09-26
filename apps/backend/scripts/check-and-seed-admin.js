const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@school.uz';
  const password = process.env.ADMIN_PASSWORD || 'AdminPass1234!';

  console.log(`Connecting to database...`);
  await prisma.$connect();
  console.log(`Database connected successfully!`);

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      credentialVersion: { increment: 1 },
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`\n========================================`);
  console.log(`ADMIN CREDENTIALS READY:`);
  console.log(`Email:    ${admin.email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     ${admin.role}`);
  console.log(`========================================\n`);
}

main()
  .catch((err) => {
    console.error('Database connection / provisioning error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
