import { ApiError } from '../lib/ApiError.js';
import { pickFields } from '../lib/pickFields.js';
import { Cost } from '../models/cost.model.js';
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

  return Cost.create(costDetails);
}
