import { PrismaClient } from '@prisma/client';

async function testUrl(name: string, url: string) {
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
    console.log(`❌ Error for ${name}:`);
    console.log(error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const password = 'Unicorndeevuh%402026';
  const tenant = 'qgqwdqtjaqapomgtfgvn';
  const dbName = 'postgres';

  const regions = [
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-south-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-northeast-3',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-north-1',
    'sa-east-1'
  ];

  for (const region of regions) {
    const name = `aws-0-${region} (6543)`;
    const url = `postgresql://postgres.${tenant}:${password}@aws-0-${region}.pooler.supabase.com:6543/${dbName}?pgbouncer=true&connection_limit=1`;
    console.log(`\n=================== Testing ${name} ===================`);
    await testUrl(name, url);
  }
}

main().catch(console.error);
