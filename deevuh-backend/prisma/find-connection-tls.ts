import fs from 'fs';

const content = fs.readFileSync('node_modules/pg/lib/connection.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('ssl') || line.includes('tls') || line.includes('secure') || line.includes('stream')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
