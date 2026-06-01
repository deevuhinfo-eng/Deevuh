import app from './app.js';
import { initCronJobs } from './cron/cronJobs.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main() {
  try {
    // Initialize cron jobs
    initCronJobs();

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 DEEVUH Backend running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
