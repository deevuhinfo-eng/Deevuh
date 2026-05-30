/**
 * DEEVUH V3 — Admin JWT Token Generator
 * 
 * Generates a cryptographically valid, signed Admin JWT token using your active 
 * JWT_ACCESS_SECRET from deevuh-backend/.env. This token can be used in your 
 * browser to instantly authorize you as the Administrator.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple parser for .env file since dotenv might not be in the root directory
function loadEnv() {
  const envPath = path.join(__dirname, 'deevuh-backend', '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: deevuh-backend/.env file not found.");
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      // Remove quotes if present
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
const secret = env.JWT_ACCESS_SECRET;

if (!secret || secret === 'dev_jwt_secret_change_in_production' || secret === 'placeholder') {
  console.error("❌ Error: Please ensure JWT_ACCESS_SECRET is set to your production secret key inside deevuh-backend/.env first.");
  process.exit(1);
}

// Simple base64url encoder
function base64url(string) {
  return Buffer.from(string)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Sign payload manually using standard crypto to avoid jsonwebtoken dependency in root
function signToken(payload, secretKey) {
  const header = { alg: "HS256", typ: "JWT" };
  
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Admin seed payload matching backend spec: { id, role, email }
const adminPayload = {
  id: "admin-seed-id",
  role: "ADMIN",
  email: "admin@deevuh.com"
};

const token = signToken(adminPayload, secret);

console.log("\n==================================================");
console.log("🔒 DEEVUH V3 — ADMIN TOKEN GENERATED");
console.log("==================================================\n");
console.log("Active Secret Key loaded from backend .env:");
console.log(`🔑 ${secret.slice(0, 8)}...${secret.slice(-8)}`);
console.log("\nGenerated JWT Admin Token:");
console.log(`👉 ${token}`);
console.log("\n--------------------------------------------------");
console.log("💡 HOW TO ACTIVATE IN YOUR BROWSER:");
console.log("--------------------------------------------------");
console.log("1. Open http://localhost:3000 in your browser.");
console.log("2. Press F12 (or right-click -> Inspect) to open Developer Tools.");
console.log("3. Select the 'Console' tab.");
console.log("4. Paste and execute the following line of code:");
console.log(`\n   localStorage.setItem('deevuh_token', '${token}');\n`);
console.log("5. Refresh the page. You are now logged in as the Administrator! ✓");
console.log("==================================================\n");
