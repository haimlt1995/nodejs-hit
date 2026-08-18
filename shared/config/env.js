import process from 'node:process';

// everything from .env is read here, once
try {
  process.loadEnvFile();
} catch {
  // no .env file, so use whatever the machine already has
}

const DEFAULT_MONGO_PORT = '27017';
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/nodejs-hit';

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
});

// picks the port for a service, PORT wins if it is set
export function resolvePort(defaultPort) {
  return Number(process.env.PORT ?? defaultPort);
}
