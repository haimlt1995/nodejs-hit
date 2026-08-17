import { Cost, COST_CATEGORIES } from '../models/cost.model.js';
import { Report } from '../models/report.model.js';
import { ApiError } from '../lib/ApiError.js';
import { getNextSequenceValue } from '../lib/nextSequence.js';

const FIRST_MONTH = 1;
const LAST_MONTH = 12;

/*
 * Computed pattern.
 *
 * Grouping a month of costs is read heavy work whose answer stops changing
 * once the month is over. So a finished month is cached and reused, while the
 * current and future months are grouped live: a cost can still land in them.
 */

/**
 * Builds the monthly report of one user.
 * @param {object} queryParameters - The request query string.
 * @returns {Promise<object>} The report, grouped by category.
 */
export async function getMonthlyReport(queryParameters) {
  const { userid, year, month } = readReportKey(queryParameters);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // A month is closed once its last day has passed.
  const isClosedMonth = monthEnd <= new Date();

  if (isClosedMonth) {
    const cachedReport = await Report.findOne({ userid, year, month });

    if (cachedReport !== null) {
      return { id: cachedReport.id, userid, year, month, costs: cachedReport.costs };
    }
  }

  const monthlyCosts = await Cost.find({ userid, date: { $gte: monthStart, $lt: monthEnd } });
  const groupedCosts = groupCostsByCategory(monthlyCosts);

  // A live report for the current or a future month is never stored, so it has no id.
  if (!isClosedMonth) {
    return { userid, year, month, costs: groupedCosts };
  }

  // updateOne skips document middleware, so id is assigned here instead.
  await Report.updateOne(
    { userid, year, month },
    {
      $set: { userid, year, month, costs: groupedCosts },
      $setOnInsert: { id: await getNextSequenceValue('reports') },
    },
    { upsert: true },
  );

  // Read back rather than trust the generated id, in case of a concurrent insert.
  const storedReport = await Report.findOne({ userid, year, month });

  return { id: storedReport.id, userid, year, month, costs: storedReport.costs };
}

/**
 * Validates the query string and converts it to numbers.
 * @param {object} queryParameters - The request query string.
 * @returns {{userid: number, year: number, month: number}} The report key.
 */
function readReportKey(queryParameters) {
  // Explicit Number(), since a silent NaN would query the whole collection.
  const userid = Number(queryParameters.id);
  const year = Number(queryParameters.year);
  const month = Number(queryParameters.month);

  if (!Number.isInteger(userid)) {
    throw ApiError.badRequest('id is required, and must be a whole number');
  }

  if (!Number.isInteger(year)) {
    throw ApiError.badRequest('year is required, and must be a whole number');
  }

  // A month outside 1 to 12 would roll over into another year.
  if (!Number.isInteger(month) || month < FIRST_MONTH || month > LAST_MONTH) {
    throw ApiError.badRequest('month is required, and must be between 1 and 12');
  }

  return { userid, year, month };
}

/**
 * Groups cost items by category, in a fixed order.
 * @param {Array<object>} monthlyCosts - The cost items of that month.
 * @returns {Array<object>} One entry per category, empty ones included.
 */
function groupCostsByCategory(monthlyCosts) {
  return COST_CATEGORIES.map((category) => {
    const costsOfCategory = monthlyCosts
      .filter((cost) => cost.category === category)
      .map((cost) => ({
        sum: cost.sum,
        description: cost.description,
        day: cost.date.getDate(),
      }));

    // A category with no costs still has to appear.
    return { [category]: costsOfCategory };
  });
}
