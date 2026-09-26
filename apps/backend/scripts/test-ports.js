const { PrismaClient } = require('@prisma/client');

async function testConnection(url) {
  console.log('Testing URL:', url.replace(/:[^:@]+@/, ':****@'));
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    const start = Date.now();
    const count = await client.user.count();
    console.log(`Success! User count: ${count} (${Date.now() - start}ms)`);
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await client.$disconnect();
  }
}

async function run() {
  const p6543 = "postgresql://postgres.lewmtpvgkmowwyzklset:14-augusT0814@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public";
  const p5432 = "postgresql://postgres.lewmtpvgkmowwyzklset:14-augusT0814@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?schema=public";

  console.log('--- TEST 1: Port 6543 ---');
  await testConnection(p6543);

  console.log('\n--- TEST 2: Port 5432 ---');
  await testConnection(p5432);
}

run();
