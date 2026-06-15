import dns from 'dns';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

let cachedPoolerIp: string | null = null;
const poolerHost = 'aws-0-ap-southeast-2.pooler.supabase.com';

dns.lookup(poolerHost, { family: 4 }, (err, address) => {
  if (!err && address) {
    cachedPoolerIp = address;
    console.log(`[DNS Patch] Dynamically resolved Supabase pooler IPv4 (${poolerHost}): ${cachedPoolerIp}`);
  } else {
    console.error(`[DNS Patch] Failed to resolve Supabase pooler IPv4 (${poolerHost}):`, err);
  }
});

const originalLookup = dns.lookup;
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  let callbackFn = callback;
  let lookupOptions = options;
  if (typeof options === 'function') {
    callbackFn = options;
    lookupOptions = {};
  }
  
  if (hostname === 'db.qgqwdqtjaqapomgtfgvn.supabase.co' && cachedPoolerIp) {
    console.log(`[DNS Override] Mapping ${hostname} to dynamic IPv4: ${cachedPoolerIp} (all: ${!!(lookupOptions && lookupOptions.all)})`);
    if (lookupOptions && lookupOptions.all) {
      return callbackFn(null, [{ address: cachedPoolerIp, family: 4 }]);
    }
    return callbackFn(null, cachedPoolerIp, 4);
  }
  return originalLookup(hostname, lookupOptions, callbackFn);
};

async function main() {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const url = 'postgresql://postgres:Unicorndeevuh%402026@db.qgqwdqtjaqapomgtfgvn.supabase.co:6543/postgres?pgbouncer=true';
  console.log(`Connecting via Driver Adapter with explicit SNI to: ${url.replace(/:[^@]+@/, ':****@')}`);
  
  const pool = new pg.Pool({ 
    connectionString: url,
    ssl: { 
      rejectUnauthorized: false,
      servername: 'db.qgqwdqtjaqapomgtfgvn.supabase.co' // Explicitly force SNI hostname!
    }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('🎉 Success! Connected successfully using Driver Adapter + DNS Override + Explicit SNI:', result);
  } catch (error: any) {
    console.error('❌ Failed:', error.message || error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
