import process from 'node:process';

try {
  // Native .env loading (Node >= 20.6). Absent file is fine — CI and containers
  // supply the same variables through the real environment.
  process.loadEnvFile();
} catch {
  // No .env on disk; fall through to process.env as-is.
}

const env = process.env.NODE_ENV ?? 'development';

export const isProduction = env === 'production';
export const isTest = env === 'test';

if (isProduction && !process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI must be set when NODE_ENV=production');
}

export const config = {
  env,
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nodejs-hit',
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
};
