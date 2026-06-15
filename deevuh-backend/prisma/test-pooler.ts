import { PrismaClient } from '@prisma/client';

async function testUrl(name: string, url: string) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    // Set a very short timeout for Prisma query (e.g. 5 seconds)
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1 as connected`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
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

  const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-east-1',
    'ap-south-1',
    'ap-northeast-3',
    'ap-northeast-2',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-southeast-3',
    'ap-northeast-1',
    'ca-central-1',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-south-1',
    'eu-west-3',
    'eu-north-1',
    'me-south-1',
    'sa-east-1'
  ];

  for (const region of regions) {
    const name = `aws-0-${region}`;
    const url = `postgresql://postgres.${tenant}:${password}@aws-0-${region}.pooler.supabase.com:6543/${dbName}?pgbouncer=true`;
    console.log(`--- Testing ${name} ---`);
    const success = await testUrl(name, url);
    if (success) {
      console.log(`🎉 FOUND IT! Working region is: ${region}`);
      console.log(`Connection URL: ${url}`);
      break;
    }
  }
}

main().catch(console.error);
