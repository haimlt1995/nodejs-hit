import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

import mongoose from 'mongoose';

/*
 * Test plumbing.
 *
 * A test starts the real index.js of a service, exactly as it is deployed, and
 * talks to it over http. Every service runs against its own database, never the
 * one the application uses, so a test can seed and wipe freely.
 */

/*
 * Never the real database, whatever the env file happens to say, and a
 * separate one per service: the test files run at the same time, so a shared
 * database would let one file wipe the rows another one just seeded.
 */
export function testDatabaseName(serviceName) {
  return `store_test_${serviceName}`;
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const READY_TIMEOUT_MS = 20000;
const READY_POLL_MS = 250;

// fail fast on a database that is not answering, rather than hanging the run
const SERVER_SELECTION_TIMEOUT_MS = 8000;

// the services read the env file themselves, and the tests need the same
// credentials to seed. A real environment variable still wins over the file.
try {
  process.loadEnvFile(path.join(PROJECT_ROOT, '.env'));
} catch {
  // no file, so whatever the machine already has will have to do
}

/*
 * Every child started here, so a failed test still leaves nothing running.
 * A surviving child keeps its pipes open, which would hang the whole run.
 */
const runningChildren = new Set();

process.on('exit', () => {
  for (const child of runningChildren) {
    child.kill('SIGKILL');
  }
});

// the connection string of one service's test database
export function testMongoUri(serviceName) {
  const fullUri = process.env.MONGODB_URI;

  if (fullUri === undefined || fullUri === '') {
    throw new Error('MONGODB_URI is not set. Put the Atlas connection string in .env');
  }

  // same cluster, its own database, so a test never touches real data
  const parsed = new URL(fullUri);
  parsed.pathname = `/${testDatabaseName(serviceName)}`;

  return parsed.toString();
}

// opens a connection of its own, so it never clashes with a service
export async function openTestDatabase(serviceName) {
  return mongoose
    .createConnection(testMongoUri(serviceName), {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    })
    .asPromise();
}

// empties every collection, so each file starts from nothing
export async function resetDatabase(connection) {
  const collections = await connection.db.listCollections().toArray();

  for (const { name } of collections) {
    await connection.db.collection(name).deleteMany({});
  }
}

// throws the whole test database away once a file is done with it
export async function dropTestDatabase(connection) {
  await connection.dropDatabase();
}

// the user the project brief asks the database to ship with
export async function seedUser(connection, user) {
  await connection.db.collection('users').insertOne(user);
}

export async function seedCosts(connection, costs) {
  if (costs.length > 0) {
    await connection.db.collection('costs').insertMany(costs);
  }
}

// waits until the service answers, so a test never races the startup
async function waitUntilReady(baseUrl) {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);

      if (response.ok) {
        return;
      }
    } catch {
      // not listening yet, so try again in a moment
    }

    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }

  throw new Error(`${baseUrl} did not come up within ${READY_TIMEOUT_MS}ms`);
}

/**
 * Starts one service as its own process, the way it is deployed.
 * @param {string} serviceName - Folder under microservices.
 * @param {number} port - Port to listen on.
 * @returns {Promise<{baseUrl: string, stop: Function}>} How to reach it, and how to stop it.
 */
export async function startService(serviceName, port) {
  const serviceEnv = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    // its own database on the cluster, never the one the application uses
    MONGODB_URI: testMongoUri(serviceName),
    // must stay on: silencing pino would stop the log collection filling up
    LOG_LEVEL: 'info',
  };

  const child = spawn(process.execPath, [`microservices/${serviceName}/index.js`], {
    cwd: PROJECT_ROOT,
    env: serviceEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  runningChildren.add(child);
  child.once('exit', () => runningChildren.delete(child));

  // keep the output around, to explain a startup that never finishes
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitUntilReady(baseUrl);
  } catch (error) {
    child.kill('SIGKILL');
    throw new Error(`${error.message}\n${output}`);
  }

  return {
    baseUrl,
    stop: () =>
      new Promise((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) {
          resolve();
          return;
        }

        child.once('exit', resolve);
        child.kill('SIGTERM');

        // a service refusing to go quietly must not hang the test run
        setTimeout(() => child.kill('SIGKILL'), 3000).unref();
      }),
  };
}

// small wrappers, so a test reads as the request it makes
export async function getJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);

  return { status: response.status, body: await response.json() };
}

export async function postJson(baseUrl, path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { status: response.status, body: await response.json() };
}
