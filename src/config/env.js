import process from 'node:process';

/*
 * Environment configuration is read once, at module load, and exported frozen.
 * Collecting every process.env access in a single module keeps the rest of the
 * application free of hidden global state, and makes each setting easy to find.
 */

// Node reads a .env file from the project root natively since version 20.6.
try {
  process.loadEnvFile();
} catch {
  // No .env on disk, so the ambient environment supplies the values instead.
}

const DEFAULT_PORT = 3000;
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/nodejs-hit';

const environmentName = process.env.NODE_ENV ?? 'development';

// Boolean flags carry an 'is' prefix, so their type is obvious at the call site.
export const isProduction = environmentName === 'production';
export const isTest = environmentName === 'test';

// A deployed server must never silently fall back to a local database.
if (isProduction && process.env.MONGODB_URI === undefined) {
  throw new Error('MONGODB_URI must be set when NODE_ENV is production');
}

// Number() makes the string to number conversion explicit at the system boundary.
export const config = Object.freeze({
  environmentName,
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  mongoUri: process.env.MONGODB_URI ?? DEFAULT_MONGO_URI,
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
});
