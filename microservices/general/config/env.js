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

const DEFAULT_MONGO_PORT = '27017';
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/nodejs-hit';

// every service listens on 3000, each one on its own server
const DEFAULT_PORT = 3000;

// the root user lives in the admin database
const DEFAULT_AUTH_SOURCE = 'admin';

const environmentName = process.env.NODE_ENV ?? 'development';

export const isProduction = environmentName === 'production';
export const isTest = environmentName === 'test';

// builds the mongo address from the separate DB_ settings
function buildMongoUriFromParts() {
  const host = process.env.DB_HOST;

  if (host === undefined || host === '') {
    return undefined;
  }

  const port = process.env.DB_PORT ?? DEFAULT_MONGO_PORT;
  const databaseName = process.env.DB_NAME ?? '';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  // passwords often contain characters that break a url
  const hasCredentials = user !== undefined && password !== undefined;
  const credentials = hasCredentials
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
    : '';

  const authSource = process.env.DB_AUTH_SOURCE ?? DEFAULT_AUTH_SOURCE;
  const query = hasCredentials ? `?authSource=${authSource}` : '';

  return `mongodb://${credentials}${host}:${port}/${databaseName}${query}`;
}

// a full address wins over the separate parts
const mongoUri = process.env.MONGODB_URI ?? buildMongoUriFromParts() ?? DEFAULT_MONGO_URI;

// a real server should never end up talking to localhost
if (isProduction && mongoUri === DEFAULT_MONGO_URI) {
  throw new Error('Set MONGODB_URI, or DB_HOST with DB_USER and DB_PASS, in production');
}

// the settings the rest of the code reads
export const config = Object.freeze({
  environmentName,
  mongoUri,
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  port: Number(process.env.PORT ?? DEFAULT_PORT),
});
