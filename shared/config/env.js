import process from 'node:process';

/*
 * All env reading happens here, once, so the rest of the app never touches
 * process.env directly.
 */

// Node reads .env natively since 20.6.
try {
  process.loadEnvFile();
} catch {
  // No .env file, so use the real environment.
}

const DEFAULT_MONGO_PORT = '27017';
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/nodejs-hit';

// Root users live in admin, not in the app database.
const DEFAULT_AUTH_SOURCE = 'admin';

const environmentName = process.env.NODE_ENV ?? 'development';

// The 'is' prefix makes the type obvious.
export const isProduction = environmentName === 'production';
export const isTest = environmentName === 'test';

/**
 * Builds a Mongo URI out of the separate DB_* variables.
 * @returns {string|undefined} The URI, or undefined when DB_HOST is missing.
 */
function buildMongoUriFromParts() {
  const host = process.env.DB_HOST;

  // Nothing to build without a host.
  if (host === undefined || host === '') {
    return undefined;
  }

  const port = process.env.DB_PORT ?? DEFAULT_MONGO_PORT;
  const databaseName = process.env.DB_NAME ?? '';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  // Encode them, since generated passwords often contain URI syntax.
  const hasCredentials = user !== undefined && password !== undefined;
  const credentials = hasCredentials
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
    : '';

  // A database in the path doubles as the auth database, hence authSource.
  const authSource = process.env.DB_AUTH_SOURCE ?? DEFAULT_AUTH_SOURCE;
  const query = hasCredentials ? `?authSource=${authSource}` : '';

  return `mongodb://${credentials}${host}:${port}/${databaseName}${query}`;
}

// An explicit URI beats the assembled parts.
const mongoUri = process.env.MONGODB_URI ?? buildMongoUriFromParts() ?? DEFAULT_MONGO_URI;

// Never let a deployed server quietly talk to localhost.
if (isProduction && mongoUri === DEFAULT_MONGO_URI) {
  throw new Error('Set MONGODB_URI, or DB_HOST with DB_USER and DB_PASS, in production');
}

// Number() keeps the conversion visible.
export const config = Object.freeze({
  environmentName,
  mongoUri,
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
});

/**
 * Works out which port a microservice should listen on.
 *
 * Each service carries its own default, so all four can run side by side on one
 * machine. A PORT in the environment overrides it, which is what a hosting
 * platform sets when it picks the port itself.
 *
 * @param {number} defaultPort - The port this service uses when PORT is unset.
 * @returns {number} The port to listen on.
 */
export function resolvePort(defaultPort) {
  return Number(process.env.PORT ?? defaultPort);
}
