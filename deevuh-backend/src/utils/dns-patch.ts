import dns from 'dns';

// Resolve the IPv4 address of the shared pooler dynamically at startup
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

// Extract host from DATABASE_URL
let dbHostname: string | null = null;
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    // Extract hostname manually to avoid URL parser issues with postgresql:// protocol
    const matches = dbUrl.match(/@([^:/\?]+)/);
    if (matches && matches[1]) {
      dbHostname = matches[1].trim();
      console.log(`[DNS Patch] Detected target database hostname to override: ${dbHostname}`);
    }
  } catch (e) {
    console.error('[DNS Patch] Error parsing DATABASE_URL:', e);
  }
}

const originalLookup = dns.lookup;
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (dbHostname && hostname === dbHostname && cachedPoolerIp) {
    return callback(null, cachedPoolerIp, 4);
  }
  
  return originalLookup(hostname, options, callback);
};
