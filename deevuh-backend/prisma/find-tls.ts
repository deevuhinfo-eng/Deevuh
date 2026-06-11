import fs from 'fs';

const content = fs.readFileSync('node_modules/pg/lib/client.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('secure') || line.includes('ssl') || line.includes('stream') || line.includes('connect')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
