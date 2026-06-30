export interface LogContext {
  requestId?: string;
  userId?: string;
  orderId?: string;
  paymentId?: string;
  [key: string]: any;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    log('info', message, context);
  },
  warn: (message: string, context?: LogContext) => {
    log('warn', message, context);
  },
  error: (message: string, error?: Error | string, context?: LogContext) => {
    const errorDetails = error instanceof Error
      ? { errorMessage: error.message, errorStack: error.stack }
      : { errorMessage: error };
    log('error', message, { ...context, ...errorDetails });
  }
};

function log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON output for log aggregators (e.g. Datadog, CloudWatch)
    console.log(JSON.stringify({
      timestamp,
      level,
      message,
      ...context
    }));
  } else {
    // Colorless clean console logs for development
    const ctxString = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}${ctxString}`;
    if (level === 'error') {
      console.error(logMsg);
    } else if (level === 'warn') {
      console.warn(logMsg);
    } else {
      console.log(logMsg);
    }
  }
}
