import { ApiError } from '../lib/ApiError.js';
import { pickFields } from '../lib/pickFields.js';
import { Cost } from '../../models/cost.model.js';
import { userExists } from './user.service.js';

// The only fields a client may write.
const WRITABLE_FIELDS = ['description', 'category', 'userid', 'sum', 'date'];

/**
 * Stores a new cost item.
 * @param {object} requestBody - Parsed request body.
 * @returns {Promise<object>} The stored document.
 */
export async function addCost(requestBody) {
  // Filter first, so a body carrying _id cannot write it.
  const costDetails = pickFields(requestBody, WRITABLE_FIELDS);

  // A cost has to belong to someone who is actually in the users collection.
  if (costDetails.userid !== undefined) {
    const isKnownUser = await userExists(costDetails.userid);

    if (!isKnownUser) {
      throw ApiError.badRequest(`User ${costDetails.userid} does not exist`);
    }
  }

  assertDateIsNotInAClosedMonth(costDetails.date);

  return Cost.create(costDetails);
}

/**
 * Refuses a cost dated inside a month that has already ended.
 *
 * The project document states the server does not accept costs dated in the
 * past, and the Computed pattern depends on it: a closed month's report is
 * cached and never rebuilt, so a late arrival there would go unnoticed.
 *
 * @param {*} rawDate - The date as the client sent it, if at all.
 * @returns {void}
 */
function assertDateIsNotInAClosedMonth(rawDate) {
  // No date means now, which is never in a closed month.
  if (rawDate === undefined) {
    return;
  }

  const costDate = new Date(rawDate);

  // An unparsable date is left to the schema, which reports it as a cast error.
  if (Number.isNaN(costDate.getTime())) {
    return;
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (costDate < startOfThisMonth) {
    throw ApiError.badRequest('A cost cannot be dated before the current month');
  }
}
