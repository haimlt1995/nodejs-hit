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
  const costDetails = pickWritableFields(requestBody);

  return Cost.create(costDetails);
}

/**
 * Copies the writable fields out of a request body.
 *
 * Skips missing ones rather than passing null, which is what lets the schema
 * default fill in the date. Pure, so it is easy to test.
 *
 * @param {object} requestBody - Parsed request body.
 * @returns {object} Only the writable fields that were sent.
 */
function pickWritableFields(requestBody) {
  const costDetails = {};

  // An empty or broken body arrives as null, or as something that is not an object.
  if (requestBody === null || typeof requestBody !== 'object') {
    return costDetails;
  }

  for (const fieldName of WRITABLE_FIELDS) {
    const fieldValue = requestBody[fieldName];

    // Strict checks, so null never overwrites a default.
    if (fieldValue !== undefined && fieldValue !== null) {
      costDetails[fieldName] = fieldValue;
    }
  }

  return costDetails;
}
