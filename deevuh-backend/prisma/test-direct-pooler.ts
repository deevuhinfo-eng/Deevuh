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
    console.log(`❌ Error for ${name}:`, error.message || error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const password = 'Unicorndeevuh%402026';
  const tenant = 'qgqwdqtjaqapomgtfgvn';
  const dbName = 'postgres';

  const urls = [
    {
      name: 'direct domain pooler (6543) with username: postgres',
      url: `postgresql://postgres:${password}@db.${tenant}.supabase.co:6543/${dbName}?pgbouncer=true`
    },
    {
      name: 'direct domain pooler (5432 - direct) with username: postgres',
      url: `postgresql://postgres:${password}@db.${tenant}.supabase.co:5432/${dbName}`
    }
  ];

  for (const item of urls) {
    console.log('---');
    await testUrl(item.name, item.url);
  }
}

main().catch(console.error);
