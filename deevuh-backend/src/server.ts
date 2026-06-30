import app from './app.js';
import { initCronJobs } from './cron/cronJobs.js';
import prisma from './config/database.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main() {
  let server: any;
  try {
    // Initialize cron jobs
    initCronJobs();

    // Start server
    server = app.listen(PORT, () => {
      console.log(`\n🚀 DEEVUH Backend running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
    if (server) {
      server.close(() => {
        console.log('HTTP server closed.');
      });
    }
    try {
      await prisma.$disconnect();
      console.log('Database connection disconnected cleanly.');
      process.exit(0);
    } catch (err: any) {
      console.error('Error during database disconnect:', err.message);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
