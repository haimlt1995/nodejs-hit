import { ApiError } from '../lib/ApiError.js';
import { pickFields } from '../lib/pickFields.js';
import { Cost } from '../../models/cost.model.js';
import { userExists } from './user.service.js';

// what a client is allowed to send for a cost
const WRITABLE_FIELDS = ['description', 'category', 'userid', 'sum', 'date'];

// saves a new cost item
export async function addCost(requestBody) {
  const costDetails = pickFields(requestBody, WRITABLE_FIELDS);

  // a cost has to belong to a user we actually know
  if (costDetails.userid !== undefined) {
    const isKnownUser = await userExists(costDetails.userid);

    if (!isKnownUser) {
      throw ApiError.badRequest(`User ${costDetails.userid} does not exist`);
    }
  }

  assertDateIsNotInAClosedMonth(costDetails.date);

  return Cost.create(costDetails);
}

// a finished month is already saved as a report, so nothing new may land there
function assertDateIsNotInAClosedMonth(rawDate) {
  // no date means now, which is always fine
  if (rawDate === undefined) {
    return;
  }

  const costDate = new Date(rawDate);

  // let the schema complain about a date it cannot read
  if (Number.isNaN(costDate.getTime())) {
    return;
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (costDate < startOfThisMonth) {
    throw ApiError.badRequest('A cost cannot be dated before the current month');
  }
}
