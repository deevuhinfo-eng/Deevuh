import { PrismaClient } from '@prisma/client';
async function main() {
  const url = 'postgresql://postgres.qgqwdqtjaqapomgtfgvn:Unicorndeevuh%402026@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
  console.log(`Connecting directly to: ${url.replace(/:[^@]+@/, ':****@')}`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('🎉 Success! Connected directly to Supabase pooler:', result);
  } catch (error: any) {
    console.error('❌ Failed:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(console.error);
