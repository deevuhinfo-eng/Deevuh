import dns from 'dns';
import { PrismaClient } from '@prisma/client';

let cachedPoolerIp: string | null = null;

// Resolve the IPv4 of the pooler dynamically
dns.lookup('aws-0-ap-southeast-2.pooler.supabase.com', { family: 4 }, (err, address) => {
  if (!err && address) {
    cachedPoolerIp = address;
    console.log(`[DNS Patch] Dynamically resolved Supabase pooler IPv4: ${cachedPoolerIp}`);
  } else {
    console.error(`[DNS Patch] Failed to resolve Supabase pooler IPv4:`, err);
  }
});

const originalLookup = dns.lookup;
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'db.qgqwdqtjaqapomgtfgvn.supabase.co' && cachedPoolerIp) {
    console.log(`[DNS Override] Mapping ${hostname} to dynamic IPv4: ${cachedPoolerIp}`);
    return callback(null, cachedPoolerIp, 4);
  }
  return originalLookup(hostname, options, callback);
};

async function main() {
  // Wait a bit to ensure the pooler IP is resolved
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const url = 'postgresql://postgres:Unicorndeevuh%402026@db.qgqwdqtjaqapomgtfgvn.supabase.co:6543/postgres?pgbouncer=true';
  console.log(`Connecting to: ${url.replace(/:[^@]+@/, ':****@')}`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('🎉 Success! Connected successfully using dynamic DNS override:', result);
  } catch (error: any) {
    console.error('❌ Failed:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
