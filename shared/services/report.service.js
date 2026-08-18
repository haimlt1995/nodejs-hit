import { Cost, COST_CATEGORIES } from '../../models/cost.model.js';
import { Report } from '../../models/report.model.js';
import { ApiError } from '../lib/ApiError.js';
import { getNextSequenceValue } from '../lib/nextSequence.js';

const FIRST_MONTH = 1;
const LAST_MONTH = 12;

/*
 * Computed pattern.
 *
 * Grouping a whole month of costs is heavy work, and once the month is over
 * the answer can never change again. So a finished month is worked out once,
 * saved into the reports collection, and simply read back after that. The
 * current month and any month ahead are always worked out fresh, because a
 * new cost can still land in them.
 */

// builds the monthly report of one user
export async function getMonthlyReport(queryParameters) {
  const { userid, year, month } = readReportKey(queryParameters);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  // the month is over once its last day has passed
  const isClosedMonth = monthEnd <= new Date();

  if (isClosedMonth) {
    const cachedReport = await Report.findOne({ userid, year, month });

    // already worked out before, so just hand it back
    if (cachedReport !== null) {
      return { userid, year, month, costs: cachedReport.costs };
    }
  }

  const monthlyCosts = await Cost.find({ userid, date: { $gte: monthStart, $lt: monthEnd } });
  const groupedCosts = groupCostsByCategory(monthlyCosts);

  // this month and later can still change, so nothing is saved
  if (!isClosedMonth) {
    return { userid, year, month, costs: groupedCosts };
  }

  // updateOne skips the model hooks, so the running number is set by hand
  await Report.updateOne(
    { userid, year, month },
    {
      $set: { userid, year, month, costs: groupedCosts },
      $setOnInsert: { id: await getNextSequenceValue('reports') },
    },
    { upsert: true },
  );

  // read it back, in case another request saved it first
  const storedReport = await Report.findOne({ userid, year, month });

  return { userid, year, month, costs: storedReport.costs };
}

// reads id, year and month out of the query string
function readReportKey(queryParameters) {
  // convert on purpose, a silent NaN would search the whole collection
  const userid = Number(queryParameters.id);
  const year = Number(queryParameters.year);
  const month = Number(queryParameters.month);

  if (!Number.isInteger(userid)) {
    throw ApiError.badRequest('id is required, and must be a whole number');
  }

  if (!Number.isInteger(year)) {
    throw ApiError.badRequest('year is required, and must be a whole number');
  }

  // a month outside 1 to 12 would slide into another year
  if (!Number.isInteger(month) || month < FIRST_MONTH || month > LAST_MONTH) {
    throw ApiError.badRequest('month is required, and must be between 1 and 12');
  }

  return { userid, year, month };
}

// puts the costs under their category, always in the same order
function groupCostsByCategory(monthlyCosts) {
  return COST_CATEGORIES.map((category) => {
    const costsOfCategory = monthlyCosts
      .filter((cost) => cost.category === category)
      .map((cost) => ({
        sum: cost.sum,
        description: cost.description,
        day: cost.date.getDate(),
      }));

    // a category with nothing in it still has to show up
    return { [category]: costsOfCategory };
  });
}
