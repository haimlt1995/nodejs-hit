import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { dropTestDatabase, getJson, openTestDatabase, resetDatabase, startService } from './helpers.js';

const PORT = 4314;

// the log is written after the response is sent, so give it a moment
const LOG_SETTLE_MS = 600;

describe('logs service', () => {
  let service;
  let connection;

  before(async () => {
    connection = await openTestDatabase('logs');
    await resetDatabase(connection);
    service = await startService('logs', PORT);
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

  it('GET /api/logs answers with a list', async () => {
    const { status, body } = await getJson(service.baseUrl, '/api/logs');

    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
  });

  it('records the requests it receives', async () => {
    await getJson(service.baseUrl, '/api/logs');
    await new Promise((resolve) => setTimeout(resolve, LOG_SETTLE_MS));

    const { body } = await getJson(service.baseUrl, '/api/logs');

    assert.ok(body.length > 0, 'something was written to the collection');
  });

  it('keeps the property names the collection uses', async () => {
    await getJson(service.baseUrl, '/api/logs');
    await new Promise((resolve) => setTimeout(resolve, LOG_SETTLE_MS));

    const { body } = await getJson(service.baseUrl, '/api/logs');
    const entry = body[0];

    assert.equal(typeof entry.level, 'string');
    assert.equal(typeof entry.message, 'string');
    assert.ok(entry.timestamp !== undefined, 'a timestamp is stored');
    assert.ok(entry._id !== undefined, '_id is sent as stored');
  });

  it('notes the method and the address of a request', async () => {
    await getJson(service.baseUrl, '/api/logs');
    await new Promise((resolve) => setTimeout(resolve, LOG_SETTLE_MS));

    const { body } = await getJson(service.baseUrl, '/api/logs');
    const aboutThisPath = body.filter((entry) => entry.endpoint === '/api/logs');

    assert.ok(aboutThisPath.length > 0, 'the endpoint that was reached is named');
    assert.ok(aboutThisPath.some((entry) => entry.method === 'GET'), 'the method is stored too');
  });

  it('hands back the newest entry first', async () => {
    await getJson(service.baseUrl, '/api/logs');
    await new Promise((resolve) => setTimeout(resolve, LOG_SETTLE_MS));

    const { body } = await getJson(service.baseUrl, '/api/logs');
    const times = body.map((entry) => new Date(entry.timestamp).getTime());

    for (let index = 1; index < times.length; index += 1) {
      assert.ok(times[index - 1] >= times[index], 'the list runs newest to oldest');
    }
  });

  it('leaves the other services alone', async () => {
    for (const path of ['/api/about', '/api/users', '/api/report?id=1&year=2026&month=1']) {
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
