import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { dropTestDatabase, getJson, openTestDatabase, resetDatabase, startService } from './helpers.js';

// a port of its own, so the files can run side by side
const PORT = 4311;

describe('about service', () => {
  let service;
  let connection;

  before(async () => {
    connection = await openTestDatabase('about');
    await resetDatabase(connection);
    service = await startService('about', PORT);
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

  it('GET /api/about lists the team', async () => {
    const { status, body } = await getJson(service.baseUrl, '/api/about');

    assert.equal(status, 200);
    assert.ok(Array.isArray(body), 'the reply is an array');
    assert.equal(body.length, 2);
  });

  it('names every member with first_name and last_name', async () => {
    const { body } = await getJson(service.baseUrl, '/api/about');

    for (const member of body) {
      assert.equal(typeof member.first_name, 'string');
      assert.equal(typeof member.last_name, 'string');
      assert.ok(member.first_name.length > 0, 'first_name is filled in');
      assert.ok(member.last_name.length > 0, 'last_name is filled in');
    }
  });

  it('sends nothing but those two properties', async () => {
    const { body } = await getJson(service.baseUrl, '/api/about');

    // the brief asks for the names only, no id and no birthday
    for (const member of body) {
      assert.deepEqual(Object.keys(member).sort(), ['first_name', 'last_name']);
    }
  });

  it('answers a trailing slash the same way', async () => {
    const { status, body } = await getJson(service.baseUrl, '/api/about/');

    assert.equal(status, 200);
    assert.equal(body.length, 2);
  });

  it('leaves the other services alone', async () => {
    // this process owns /api/about and nothing else
    for (const path of ['/api/users', '/api/logs', '/api/report?id=1&year=2026&month=1']) {
      const { status } = await getJson(service.baseUrl, path);

      assert.equal(status, 404, `${path} is not served here`);
    }
  });

  it('describes an unknown address with id and message', async () => {
    const { status, body } = await getJson(service.baseUrl, '/api/nope');

    assert.equal(status, 404);
    assert.equal(body.id, 404);
    assert.equal(typeof body.message, 'string');
  });
});
