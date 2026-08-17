import { pickFields } from '../lib/pickFields.js';
import { Cost } from '../models/cost.model.js';

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

  return Cost.create(costDetails);
}
