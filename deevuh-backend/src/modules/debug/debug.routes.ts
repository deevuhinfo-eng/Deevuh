import { Router, Request, Response } from 'express';

const router = Router();

router.post('/logs', (req: Request, res: Response) => {
  const { logs, systemInfo, errors } = req.body;

  console.log('\n=================== SAFARI DIAGNOSTIC DUMP ===================');
  console.log(`[Timestamp]: ${new Date().toISOString()}`);
  console.log(`[User Agent]: ${systemInfo?.userAgent || 'Unknown'}`);
  console.log(`[IP Address]: ${req.ip}`);
  console.log(`[CORS Origin]: ${req.headers.origin || 'None'}`);

  console.log('\n--- SYSTEM STORAGE & APIS ---');
  console.log(JSON.stringify(systemInfo, null, 2));

  if (errors && errors.length > 0) {
    console.error('\n--- JS UNCAUGHT EXCEPTIONS ---');
    errors.forEach((err: any, idx: number) => {
      console.error(`[Error #${idx + 1}]: ${err.message}`);
      console.error(`Stack: ${err.stack || 'No stack trace'}`);
      console.error(`URL: ${err.url || 'N/A'}, Line: ${err.line || 'N/A'}, Col: ${err.col || 'N/A'}`);
    });
  }

  if (logs && logs.length > 0) {
    console.log('\n--- NETWORK FETCH LOGS ---');
    logs.forEach((log: any, idx: number) => {
      console.log(`[Fetch #${idx + 1}] [${log.method || 'GET'}] ${log.url}`);
      console.log(`  Initiated At: ${log.timestamp}`);
      console.log(`  Credentials: ${log.credentials || 'N/A'}, Mode: ${log.mode || 'N/A'}, Cache: ${log.cache || 'N/A'}`);
      console.log(`  Request Headers:`, JSON.stringify(log.requestHeaders || {}, null, 2));
      
      if (log.error) {
        console.error(`  Result: FAILED`);
        console.error(`  Exception: ${log.error.message || log.error}`);
        console.error(`  Stack: ${log.error.stack || 'N/A'}`);
      } else {
        console.log(`  Result: SUCCESS (Status ${log.status})`);
        console.log(`  Response Headers:`, JSON.stringify(log.responseHeaders || {}, null, 2));
        console.log(`  Response Body Preview:`, JSON.stringify(log.responseBody || {}, null, 2).slice(0, 500));
      }
      console.log('----------------------------------------------------');
    });
  }
  console.log('==============================================================\n');

  res.status(200).json({ status: 'success' });
});

export default router;
