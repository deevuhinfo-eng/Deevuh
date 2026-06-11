import dns from 'dns';
dns.resolve4('db.qgqwdqtjaqapomgtfgvn.supabase.co', (err, addresses) => {
  console.log('IPv4 addresses:', addresses || err);
});
dns.resolve6('db.qgqwdqtjaqapomgtfgvn.supabase.co', (err, addresses) => {
  console.log('IPv6 addresses:', addresses || err);
});
