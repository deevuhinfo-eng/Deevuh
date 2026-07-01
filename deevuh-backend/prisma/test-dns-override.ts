import dns from 'dns';
import { PrismaClient } from '@prisma/client';

const originalLookup = dns.lookup;

(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'db.qgqwdqtjaqapomgtfgvn.supabase.co') {
    const ipv4Pooler = '3.106.102.114'; // IPv4 of aws-0-ap-southeast-2.pooler.supabase.com
    console.log(`[DNS Override] Mapping ${hostname} to IPv4: ${ipv4Pooler}`);
    return callback(null, ipv4Pooler, 4);
  }
  return originalLookup(hostname, options, callback);
};

async function main() {
  const url = 'postgresql://postgres:Unicorndeevuh%402026@db.qgqwdqtjaqapomgtfgvn.supabase.co:5432/postgres';
  console.log(`Connecting to: ${url.replace(/:[^@]+@/, ':****@')}`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('🎉 Success! Connected successfully over IPv4 using host override:', result);
  } catch (error: any) {
    console.error('❌ Failed:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
