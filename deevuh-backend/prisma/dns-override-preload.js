const dns = require('dns');
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'db.qgqwdqtjaqapomgtfgvn.supabase.co') {
    const ipv4Pooler = '3.106.102.114'; // IPv4 of aws-0-ap-southeast-2.pooler.supabase.com
    return callback(null, ipv4Pooler, 4);
  }
  return originalLookup(hostname, options, callback);
};
