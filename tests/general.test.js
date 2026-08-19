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

const PORT = 4315;

describe('general service', () => {
  let service;
  let connection;

  before(async () => {
    connection = await openTestDatabase('general');
    await resetDatabase(connection);
    await seedUser(connection, { id: 123123, first_name: 'mosh', last_name: 'israeli' });
    await seedCosts(connection, [
      { description: 'milk', category: 'food', userid: 123123, sum: 8, date: new Date('2026-01-05') },
    ]);

    service = await startService('general', PORT);
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

  it('answers every endpoint of the other four', async () => {
    const paths = [
      '/api/about',
      '/api/users',
      '/api/users/123123',
      '/api/logs',
      '/api/report?id=123123&year=2026&month=1',
    ];

    for (const path of paths) {
      const { status } = await getJson(service.baseUrl, path);

      assert.equal(status, 200, `${path} is served here`);
    }
  });

  describe('POST /api/add picks by the shape of the body', () => {
    it('adds a cost when the body describes one', async () => {
      const { status, body } = await postJson(service.baseUrl, '/api/add', {
        userid: 123123,
        description: 'from general',
        category: 'food',
        sum: 4,
      });

      assert.equal(status, 201);
      assert.equal(body.description, 'from general');
      assert.equal(body.userid, 123123);
    });

    it('adds a user when the body describes one', async () => {
      const { status, body } = await postJson(service.baseUrl, '/api/add', {
        id: 777001,
        first_name: 'general',
        last_name: 'person',
        birthday: '1992-05-05',
      });

      assert.equal(status, 201);
      assert.equal(body.id, 777001);
      assert.equal(body.first_name, 'general');
    });

    it('refuses a body mixing the two', async () => {
      // guessing would be worse than saying no
      const { status, body } = await postJson(service.baseUrl, '/api/add', {
        id: 5,
        description: 'both at once',
        category: 'food',
        userid: 123123,
        sum: 1,
      });

      assert.equal(status, 400);
      assert.equal(body.id, 400);
    });

    it('refuses a body describing neither', async () => {
      const { status, body } = await postJson(service.baseUrl, '/api/add', { nonsense: true });

      assert.equal(status, 400);
      assert.equal(body.id, 400);
    });

    it('refuses an empty body', async () => {
      const { status } = await postJson(service.baseUrl, '/api/add', {});

      assert.equal(status, 400);
    });

    it('still checks the user exists when adding a cost', async () => {
      const { status } = await postJson(service.baseUrl, '/api/add', {
        userid: 999999,
        description: 'orphan',
        category: 'food',
        sum: 1,
      });

      assert.equal(status, 400);
    });

    it('still refuses a user that already exists', async () => {
      const { status } = await postJson(service.baseUrl, '/api/add', {
        id: 123123,
        first_name: 'mosh',
        last_name: 'israeli',
        birthday: '1990-01-01',
      });

      assert.equal(status, 409);
    });
  });

  it('describes an unknown address with id and message', async () => {
    const { status, body } = await getJson(service.baseUrl, '/api/nope');

    assert.equal(status, 404);
    assert.equal(body.id, 404);
    assert.equal(typeof body.message, 'string');
  });
});
