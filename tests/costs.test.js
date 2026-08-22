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

const PORT = 4313;

// the order and spelling the project Q&A fixes for a report
const CATEGORIES = ['food', 'education', 'health', 'housing', 'sports'];

// a month that has certainly ended, so the report of it may be cached
const CLOSED_YEAR = 2026;
const CLOSED_MONTH = 1;

describe('costs service', () => {
  let service;
  let connection;

  before(async () => {
    connection = await openTestDatabase('costs');
    await resetDatabase(connection);
    await seedUser(connection, { id: 123123, first_name: 'mosh', last_name: 'israeli' });

    await seedCosts(connection, [
      { description: 'milk', category: 'food', userid: 123123, sum: 8, date: new Date('2026-01-05') },
      { description: 'chocolate', category: 'food', userid: 123123, sum: 12, date: new Date('2026-01-17') },
      { description: 'math book', category: 'education', userid: 123123, sum: 82, date: new Date('2026-01-10') },
      // another user's cost, which must never show up in mosh's report
      { description: 'not mine', category: 'food', userid: 999000, sum: 5, date: new Date('2026-01-06') },
    ]);

    service = await startService('costs', PORT);
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

  describe('POST /api/add', () => {
    it('stores a cost and sends the stored document back', async () => {
      const cost = { userid: 123123, description: 'bread', category: 'food', sum: 9 };
      const { status, body } = await postJson(service.baseUrl, '/api/add', cost);

      assert.equal(status, 201);
      assert.equal(body.description, 'bread');
      assert.equal(body.category, 'food');
      assert.equal(body.userid, 123123);
      assert.equal(body.sum, 9);
    });

    it('dates a cost that arrives without one', async () => {
      const { body } = await postJson(service.baseUrl, '/api/add', {
        userid: 123123,
        description: 'no date given',
        category: 'food',
        sum: 3,
      });

      assert.ok(body.date !== undefined, 'a date was filled in');
      assert.ok(!Number.isNaN(new Date(body.date).getTime()), 'and it is a real date');
    });

    it('refuses a cost for a user that does not exist', async () => {
      const { status, body } = await postJson(service.baseUrl, '/api/add', {
        userid: 999999,
        description: 'orphan',
        category: 'food',
        sum: 1,
      });

      assert.equal(status, 400);
      assert.equal(body.id, 400);
      assert.match(body.message, /999999/);
    });

    it('refuses a category it does not know', async () => {
      const { status, body } = await postJson(service.baseUrl, '/api/add', {
        userid: 123123,
        description: 'wine',
        category: 'drinks',
        sum: 1,
      });

      assert.equal(status, 400);
      assert.equal(body.id, 400);
    });

    it('accepts every category the brief lists', async () => {
      for (const category of CATEGORIES) {
        const { status } = await postJson(service.baseUrl, '/api/add', {
          userid: 123123,
          description: `a ${category} cost`,
          category,
          sum: 1,
        });

        assert.equal(status, 201, `${category} is accepted`);
      }
    });

    it('refuses a date in a month that has already closed', async () => {
      // a closed month may already be cached as a report, so nothing may land there
      const { status, body } = await postJson(service.baseUrl, '/api/add', {
        userid: 123123,
        description: 'too late',
        category: 'food',
        sum: 1,
        date: '2020-01-01',
      });

      assert.equal(status, 400);
      assert.equal(body.id, 400);
    });

    it('accepts a trailing slash, as the grading script sends it', async () => {
      const { status } = await postJson(service.baseUrl, '/api/add/', {
        userid: 123123,
        description: 'milk 9',
        category: 'food',
        sum: 8,
      });

      assert.equal(status, 201);
    });
  });

  describe('GET /api/report', () => {
    it('answers with userid, year, month and costs', async () => {
      const { status, body } = await getJson(
        service.baseUrl,
        `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      assert.equal(status, 200);
      assert.equal(body.userid, 123123);
      assert.equal(body.year, CLOSED_YEAR);
      assert.equal(body.month, CLOSED_MONTH);
      assert.ok(Array.isArray(body.costs));
    });

    it('lists every category, in the order the brief shows', async () => {
      const { body } = await getJson(
        service.baseUrl,
        `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      const names = body.costs.map((group) => Object.keys(group)[0]);

      assert.deepEqual(names, CATEGORIES);
    });

    it('describes a cost by sum, description and day', async () => {
      const { body } = await getJson(
        service.baseUrl,
        `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      const food = body.costs.find((group) => group.food !== undefined).food;
      const milk = food.find((cost) => cost.description === 'milk');

      assert.deepEqual(Object.keys(milk).sort(), ['day', 'description', 'sum']);
      assert.equal(milk.sum, 8);
      assert.equal(milk.day, 5);
    });

    it('keeps a category with no costs, as an empty list', async () => {
      const { body } = await getJson(
        service.baseUrl,
        `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      const health = body.costs.find((group) => group.health !== undefined).health;

      assert.deepEqual(health, []);
    });

    it('leaves out the costs of other users', async () => {
      const { body } = await getJson(
        service.baseUrl,
        `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      const descriptions = body.costs.flatMap((group) =>
        Object.values(group)[0].map((cost) => cost.description),
      );

      assert.ok(!descriptions.includes('not mine'), "another user's cost stays out");
    });

    it('gives every category empty for a month with nothing in it', async () => {
      const { status, body } = await getJson(service.baseUrl, '/api/report?id=123123&year=2025&month=11');

      assert.equal(status, 200);
      assert.equal(body.costs.length, CATEGORIES.length);

      for (const group of body.costs) {
        assert.deepEqual(Object.values(group)[0], []);
      }
    });

    it('answers 400 for a month outside 1 to 12', async () => {
      for (const month of ['0', '13', '99', 'abc']) {
        const { status, body } = await getJson(
          service.baseUrl,
          `/api/report?id=123123&year=2026&month=${month}`,
        );

        assert.equal(status, 400, `month ${month} is rejected`);
        assert.equal(body.id, 400);
      }
    });

    it('answers 400 when id or year is missing', async () => {
      for (const query of ['?year=2026&month=1', '?id=123123&month=1', '?id=abc&year=2026&month=1']) {
        const { status } = await getJson(service.baseUrl, `/api/report${query}`);

        assert.equal(status, 400, `${query} is rejected`);
      }
    });

    it('answers a trailing slash the same way', async () => {
      const { status } = await getJson(
        service.baseUrl,
        `/api/report/?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      assert.equal(status, 200);
    });
  });

  describe('the Computed pattern', () => {
    it('saves the report of a month that has closed', async () => {
      await connection.db.collection('reports').deleteMany({});

      await getJson(service.baseUrl, `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`);

      const saved = await connection.db
        .collection('reports')
        .findOne({ userid: 123123, year: CLOSED_YEAR, month: CLOSED_MONTH });

      assert.ok(saved !== null, 'a closed month is kept for next time');
    });

    it('reads the saved report back instead of working it out again', async () => {
      // a marker no cost could produce, so seeing it proves the cache was read
      await connection.db
        .collection('reports')
        .updateOne(
          { userid: 123123, year: CLOSED_YEAR, month: CLOSED_MONTH },
          { $set: { costs: [{ food: [{ sum: 1, description: 'from the cache', day: 1 }] }] } },
        );

      const { body } = await getJson(
        service.baseUrl,
        `/api/report?id=123123&year=${CLOSED_YEAR}&month=${CLOSED_MONTH}`,
      );

      assert.equal(body.costs[0].food[0].description, 'from the cache');
    });

    it('never saves the report of the current month', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await connection.db.collection('reports').deleteMany({ year, month });
      await getJson(service.baseUrl, `/api/report?id=123123&year=${year}&month=${month}`);

      const saved = await connection.db.collection('reports').findOne({ userid: 123123, year, month });

      // a cost can still land in this month, so the answer may still change
      assert.equal(saved, null, 'the current month is worked out fresh every time');
    });

    it('never saves the report of a month still ahead', async () => {
      const year = new Date().getFullYear() + 1;

      await getJson(service.baseUrl, `/api/report?id=123123&year=${year}&month=6`);

      const saved = await connection.db.collection('reports').findOne({ userid: 123123, year, month: 6 });

      assert.equal(saved, null);
    });
  });

  it('leaves the other services alone', async () => {
    for (const path of ['/api/about', '/api/logs', '/api/users']) {
      const { status } = await getJson(service.baseUrl, path);

      assert.equal(status, 404, `${path} is not served here`);
    }
  });
});
