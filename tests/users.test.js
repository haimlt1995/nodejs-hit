import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import {
  getJson,
  dropTestDatabase,
  openTestDatabase,
  postJson,
  resetDatabase,
  seedCosts,
  seedUser,
  startService,
} from './helpers.js';

const PORT = 4312;

// the user the brief wants the database to ship with
const MOSH = { id: 123123, first_name: 'mosh', last_name: 'israeli' };

describe('users service', () => {
  let service;
  let connection;

  before(async () => {
    connection = await openTestDatabase('users');
    await resetDatabase(connection);
    await seedUser(connection, MOSH);
    await seedUser(connection, { id: 111111, first_name: 'dana', last_name: 'cohen' });

    // two costs, so the total has something to add up
    await seedCosts(connection, [
      { description: 'milk', category: 'food', userid: 123123, sum: 8, date: new Date('2026-01-05') },
      { description: 'book', category: 'education', userid: 123123, sum: 42.5, date: new Date('2026-01-10') },
    ]);

    service = await startService('users', PORT);
  });

  after(async () => {
    // setup may have failed part way, so only undo what actually happened
    if (service !== undefined) {
      await service.stop();
    }

    if (connection !== undefined) {
      await dropTestDatabase(connection);
      await connection.close();
    }
  });

  describe('GET /api/users', () => {
    it('returns every user', async () => {
      const { status, body } = await getJson(service.baseUrl, '/api/users');

      assert.equal(status, 200);
      assert.equal(body.length, 2);
    });

    it('orders them by id', async () => {
      const { body } = await getJson(service.baseUrl, '/api/users');
      const ids = body.map((user) => user.id);

      assert.deepEqual(ids, [111111, 123123]);
    });

    it('keeps the property names the collection uses', async () => {
      const { body } = await getJson(service.baseUrl, '/api/users');
      const mosh = body.find((user) => user.id === 123123);

      // snake_case is fixed by the contract, and _id is not renamed away
      assert.equal(mosh.first_name, 'mosh');
      assert.equal(mosh.last_name, 'israeli');
      assert.ok(mosh._id !== undefined, '_id is sent as stored');
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns the four properties the brief names', async () => {
      const { status, body } = await getJson(service.baseUrl, '/api/users/123123');

      assert.equal(status, 200);
      assert.deepEqual(Object.keys(body).sort(), ['first_name', 'id', 'last_name', 'total']);
    });

    it('totals every cost of that user', async () => {
      const { body } = await getJson(service.baseUrl, '/api/users/123123');

      assert.equal(body.total, 50.5);
    });

    it('gives a user with no costs a total of zero', async () => {
      const { body } = await getJson(service.baseUrl, '/api/users/111111');

      assert.equal(body.total, 0);
    });

    it('does not expose birthday or _id', async () => {
      const { body } = await getJson(service.baseUrl, '/api/users/123123');

      assert.equal(body.birthday, undefined);
      assert.equal(body._id, undefined);
    });

    it('answers 404 for a user that is not there', async () => {
      const { status, body } = await getJson(service.baseUrl, '/api/users/999999');

      assert.equal(status, 404);
      assert.equal(body.id, 404);
      assert.match(body.message, /999999/);
    });

    it('answers 400 when the id is not a whole number', async () => {
      for (const badId of ['abc', '12.5']) {
        const { status, body } = await getJson(service.baseUrl, `/api/users/${badId}`);

        assert.equal(status, 400, `${badId} is rejected`);
        assert.equal(body.id, 400);
      }
    });
  });

  describe('POST /api/add', () => {
    it('stores a user and sends the stored document back', async () => {
      const newUser = { id: 555001, first_name: 'test', last_name: 'person', birthday: '1999-03-04' };
      const { status, body } = await postJson(service.baseUrl, '/api/add', newUser);

      assert.equal(status, 201);
      assert.equal(body.id, 555001);
      assert.equal(body.first_name, 'test');
      assert.equal(body.last_name, 'person');

      // what came back has to be what went in
      const stored = await connection.db.collection('users').findOne({ id: 555001 });
      assert.equal(stored.first_name, 'test');
    });

    it('refuses a user that already exists', async () => {
      const duplicate = { id: 123123, first_name: 'mosh', last_name: 'israeli', birthday: '1990-01-01' };
      const { status, body } = await postJson(service.baseUrl, '/api/add', duplicate);

      assert.equal(status, 409);
      assert.equal(body.id, 409);
      assert.match(body.message, /123123/);

      // and the original is untouched
      const count = await connection.db.collection('users').countDocuments({ id: 123123 });
      assert.equal(count, 1);
    });

    it('refuses a body with nothing in it', async () => {
      const { status, body } = await postJson(service.baseUrl, '/api/add', {});

      assert.equal(status, 400);
      assert.equal(body.id, 400);
    });

    it('accepts a trailing slash, as the grading script sends it', async () => {
      const { status } = await postJson(service.baseUrl, '/api/add/', {
        id: 555002,
        first_name: 'slash',
        last_name: 'person',
        birthday: '1995-01-01',
      });

      assert.equal(status, 201);
    });
  });

  it('leaves the other services alone', async () => {
    for (const path of ['/api/about', '/api/logs', '/api/report?id=1&year=2026&month=1']) {
      const { status } = await getJson(service.baseUrl, path);

      assert.equal(status, 404, `${path} is not served here`);
    }
  });
});
