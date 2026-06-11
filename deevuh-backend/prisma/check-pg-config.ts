import pg from 'pg';

const url = 'postgresql://postgres:Unicorndeevuh%402026@db.qgqwdqtjaqapomgtfgvn.supabase.co:6543/postgres?pgbouncer=true';
const pool = new pg.Pool({ 
  connectionString: url,
  ssl: { 
    rejectUnauthorized: false,
    servername: 'db.qgqwdqtjaqapomgtfgvn.supabase.co'
  }
});

// Create a client to parse parameters
const client = new pg.Client({ 
  connectionString: url,
  ssl: { 
    rejectUnauthorized: false,
    servername: 'db.qgqwdqtjaqapomgtfgvn.supabase.co'
  }
});

console.log('Pool SSL config:', (pool as any).options.ssl);
console.log('Client SSL config:', (client as any).connectionParameters.ssl);
