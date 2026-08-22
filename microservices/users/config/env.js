import path from 'node:path';
import process from 'node:process';

/*
 * Everything from .env is read here, once.
 *
 * A service keeps its own .env beside its index.js, holding the port it
 * listens on. The one at the project root holds what every service shares,
 * the database above all. Whatever is set first wins, so the service file
 * beats the root file, and a real environment variable beats them both.
 */

// reads one env file, and shrugs when it is not there
function loadEnvFileQuietly(filePath) {
  try {
    process.loadEnvFile(filePath);
  } catch {
    // missing or unreadable, so carry on with what is already set
  }
}

// argv[1] is the index.js being run, so its folder is the service folder
const entryPoint = process.argv[1];

if (entryPoint !== undefined) {
  loadEnvFileQuietly(path.join(path.dirname(entryPoint), '.env'));
}

loadEnvFileQuietly(path.join(process.cwd(), '.env'));

// every service listens on 3000, each one on its own server
const DEFAULT_PORT = 3000;

const environmentName = process.env.NODE_ENV ?? 'development';

export const isProduction = environmentName === 'production';
export const isTest = environmentName === 'test';

// the whole address, since an Atlas cluster can only be reached that way
const mongoUri = process.env.MONGODB_URI;

// stop rather than guess: a wrong database is worse than no database
if (mongoUri === undefined || mongoUri === '') {
  throw new Error('MONGODB_URI is not set. Put the Atlas connection string in .env');
}

// the settings the rest of the code reads
export const config = Object.freeze({
  environmentName,
  mongoUri,
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  port: Number(process.env.PORT ?? DEFAULT_PORT),
});
