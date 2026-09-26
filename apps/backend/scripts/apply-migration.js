const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function splitStatements(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Connected!');

  // 1. Check applied migrations
  const applied = await prisma.$queryRaw`
    SELECT migration_name FROM "_prisma_migrations"
  `;
  const appliedNames = new Set(applied.map(m => m.migration_name));
  console.log('Applied migrations in DB:', Array.from(appliedNames));

  const migrationDirName = '20260912000000_staff_roles_and_delivery';
  if (!appliedNames.has(migrationDirName)) {
    console.log(`Applying migration ${migrationDirName}...`);
    const sqlPath = path.join(__dirname, '../prisma/migrations', migrationDirName, 'migration.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statements = splitStatements(sqlContent);

    for (const statement of statements) {
      console.log(`Executing: ${statement.slice(0, 60)}...`);
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (e) {
        // If already exists or applied in earlier partial run, log and continue
        if (e.message.includes('already exists') || e.message.includes('duplicate key')) {
          console.log(`Notice: ${e.message.split('\n')[0]}`);
        } else {
          throw e;
        }
      }
    }

    const checksum = crypto.createHash('sha256').update(sqlContent).digest('hex');
    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (
        id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
      ) VALUES (
        $1, $2, NOW(), $3, NULL, NULL, NOW(), 1
      )
    `, id, checksum, migrationDirName);

    console.log(`Migration ${migrationDirName} applied successfully!`);
  } else {
    console.log(`Migration ${migrationDirName} was already applied.`);
  }

  // 2. Provision Admin User
  const email = 'admin@school.uz';
  const password = 'AdminPass1234!';
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

  console.log('\n========================================');
  console.log('ADMIN ACCOUNT CREATED / UPDATED:');
  console.log('Email:    ' + admin.email);
  console.log('Password: ' + password);
  console.log('Role:     ' + admin.role);
  console.log('========================================\n');
}

main()
  .catch((err) => {
    console.error('Migration / Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
