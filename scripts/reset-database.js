import path from 'node:path';
import process from 'node:process';

import mongoose from 'mongoose';

/*
 * Puts the database into the state the project has to be submitted in:
 * empty, apart from one imaginary user (submission guideline 7).
 *
 * Run it last, right before submitting. The services log every request they
 * receive, as the brief requires, so the logs collection starts filling up
 * again the moment anything touches a running service.
 */

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

// the settings live in the same env file the services read
try {
  process.loadEnvFile(path.join(PROJECT_ROOT, '.env'));
} catch {
  // nothing on disk, so the machine's own environment has to carry it
}

// the collections the project owns, all of which are emptied
const COLLECTIONS = ['users', 'costs', 'reports', 'logs', 'counters'];

// exactly the user the submission guidelines describe
const IMAGINARY_USER = { id: 123123, first_name: 'mosh', last_name: 'israeli' };

// deleting everything by accident would be no fun at all
const IS_CONFIRMED = process.argv.includes('--confirm');

function buildMongoUri() {
  const fullUri = process.env.MONGODB_URI;

  if (fullUri === undefined || fullUri === '') {
    throw new Error('MONGODB_URI is not set. Put the Atlas connection string in .env');
  }

  return fullUri;
}

// NamespaceExists just means the collection was already there
async function createCollectionIfMissing(connection, name) {
  try {
    await connection.db.createCollection(name);
  } catch (error) {
    if (error.codeName !== 'NamespaceExists') {
      throw error;
    }
  }
}

async function resetDatabase() {
  const connection = await mongoose.createConnection(buildMongoUri()).asPromise();

  console.log(`database: ${connection.name}`);

  for (const name of COLLECTIONS) {
    const { deletedCount } = await connection.db.collection(name).deleteMany({});

    // mongo only makes a collection on the first write, so create it here too:
    // an empty database should still show the structure the project uses
    await createCollectionIfMissing(connection, name);

    console.log(`  ${name.padEnd(9)} ${deletedCount} removed`);
  }

  await connection.db.collection('users').insertOne(IMAGINARY_USER);
  console.log(`  seeded user ${IMAGINARY_USER.id} ${IMAGINARY_USER.first_name} ${IMAGINARY_USER.last_name}`);

  await connection.close();
}

if (!IS_CONFIRMED) {
  console.log('This empties users, costs, reports, logs and counters.');
  console.log('Run it again with --confirm if that is what you want.');
  process.exit(1);
}

await resetDatabase();
