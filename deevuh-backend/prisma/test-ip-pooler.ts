import { PrismaClient } from '@prisma/client';

async function testUrl(name: string, url: string) {
  console.log(`Testing ${name}: ${url.replace(/:[^@]+@/, ':****@')}`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log(`✅ Success for ${name}:`, result);
    return true;
  } catch (error: any) {
    console.log(`❌ Error for ${name}:`, error.message.split('\n')[0] || error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const password = 'Unicorndeevuh%402026';
  const tenant = 'qgqwdqtjaqapomgtfgvn';
  const dbName = 'postgres';
  const ip = '13.237.241.81';

  const urls = [
    {
      name: 'IP pooler with sslmode=no-verify',
      url: `postgresql://postgres.${tenant}:${password}@${ip}:6543/${dbName}?pgbouncer=true&sslmode=no-verify`
    },
    {
      name: 'IP pooler with sslmode=prefer',
      url: `postgresql://postgres.${tenant}:${password}@${ip}:6543/${dbName}?pgbouncer=true&sslmode=prefer`
    },
    {
      name: 'IP pooler with sslmode=disable',
      url: `postgresql://postgres.${tenant}:${password}@${ip}:6543/${dbName}?pgbouncer=true&sslmode=disable`
    }
  ];

  for (const item of urls) {
    console.log('---');
    await testUrl(item.name, item.url);
  }
}

main().catch(console.error);
