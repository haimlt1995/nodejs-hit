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
const DEFAULT_MONGO_PORT = '27017';
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/nodejs-hit';

// A root user lives in the admin database, so that is where authentication happens.
const DEFAULT_AUTH_SOURCE = 'admin';

const environmentName = process.env.NODE_ENV ?? 'development';

// Boolean flags carry an 'is' prefix, so their type is obvious at the call site.
export const isProduction = environmentName === 'production';
export const isTest = environmentName === 'test';

/**
 * Assembles a MongoDB connection string out of the separate DB_* variables.
 *
 * Hosting platforms usually publish a database as a set of parts rather than as one
 * ready made URI, so building the URI here keeps that detail out of the connection
 * code. The credentials are percent encoded, because a generated password may well
 * contain characters that carry a special meaning inside a URI.
 *
 * @returns {string|undefined} The assembled URI, or undefined when DB_HOST is unset.
 */
function buildMongoUriFromParts() {
  const host = process.env.DB_HOST;

  // Without a host there is simply nothing to assemble.
  if (host === undefined || host === '') {
    return undefined;
  }

  const port = process.env.DB_PORT ?? DEFAULT_MONGO_PORT;
  const databaseName = process.env.DB_NAME ?? '';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;

  // A server without authentication needs no credentials section at all.
  const hasCredentials = user !== undefined && password !== undefined;
  const credentials = hasCredentials
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
    : '';

  // Naming a database in the path also makes it the authentication database.
  const authSource = process.env.DB_AUTH_SOURCE ?? DEFAULT_AUTH_SOURCE;
  const query = hasCredentials ? `?authSource=${authSource}` : '';

  return `mongodb://${credentials}${host}:${port}/${databaseName}${query}`;
}

// An explicit MONGODB_URI always wins over the assembled DB_* parts.
const mongoUri = process.env.MONGODB_URI ?? buildMongoUriFromParts() ?? DEFAULT_MONGO_URI;

// A deployed server must never silently fall back to a database on localhost.
if (isProduction && mongoUri === DEFAULT_MONGO_URI) {
  throw new Error('Set MONGODB_URI, or DB_HOST with DB_USER and DB_PASS, in production');
}

// Number() makes the string to number conversion explicit at the system boundary.
export const config = Object.freeze({
  environmentName,
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  mongoUri,
  logLevel: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
});
