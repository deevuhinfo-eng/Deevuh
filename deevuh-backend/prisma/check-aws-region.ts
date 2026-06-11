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

// Simple IPv6 checker helper
function ipToBinary(ip: string): string {
  // expand ipv6 address
  const parts = ip.split(':');
  let expanded = '';
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') {
      const missing = 8 - parts.filter(p => p !== '').length;
      expanded += '0000:'.repeat(missing);
    } else {
      expanded += parts[i].padStart(4, '0') + ':';
    }
  }
  if (expanded.endsWith(':')) expanded = expanded.slice(0, -1);
  
  return expanded.split(':').map(part => parseInt(part, 16).toString(2).padStart(16, '0')).join('');
}

function inRange(targetBin: string, prefix: string, netmask: number): boolean {
  const prefixBin = ipToBinary(prefix);
  return targetBin.substring(0, netmask) === prefixBin.substring(0, netmask);
}

async function main() {
  const targetIp = '2406:da1c:61c:d600:d773:8d7b:f0a8:9563';
  console.log(`Checking region for IPv6: ${targetIp}`);
  
  const ranges = await getIpRanges();
  const targetBin = ipToBinary(targetIp);
  
  const matches: any[] = [];
  
  for (const item of ranges.ipv6_prefixes) {
    const [prefix, maskStr] = item.ipv6_prefix.split('/');
    const mask = parseInt(maskStr, 10);
    try {
      if (inRange(targetBin, prefix, mask)) {
        matches.push(item);
      }
    } catch (e) {}
  }
  
  console.log('Matches:', matches);
}

main().catch(console.error);
