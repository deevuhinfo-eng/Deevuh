import https from 'https';

function getIpRanges(): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const ranges = await getIpRanges();
  const matched = ranges.ipv6_prefixes.filter((item: any) => item.ipv6_prefix.startsWith('2406:da1c:'));
  console.log(JSON.stringify(matched, null, 2));
}

main().catch(console.error);
