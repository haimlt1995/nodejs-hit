import { Cost } from '../models/cost.model.js';

// The only properties a client is allowed to write into a cost document.
const WRITABLE_FIELDS = ['description', 'category', 'userid', 'sum', 'date'];

/**
 * Stores a new cost item in the costs collection.
 * @param {object} requestBody - Parsed body of the incoming request.
 * @returns {Promise<object>} The cost document that was stored.
 */
export async function addCost(requestBody) {
  // Whitelist first, so an injected _id in the body can never reach the database.
  const costDetails = pickWritableFields(requestBody);

  return Cost.create(costDetails);
}

/**
 * Copies the writable properties out of a raw request body.
 *
 * Absent properties are skipped rather than copied as null, which lets the schema
 * defaults apply. That is precisely what gives an omitted date the current time.
 * The function is pure, so it can be reasoned about and tested on its own.
 *
 * @param {object} requestBody - Parsed body of the incoming request.
 * @returns {object} An object holding only the writable properties that were sent.
 */
function pickWritableFields(requestBody) {
  const costDetails = {};

  // An empty or malformed body arrives here as null, or as a non object.
  if (requestBody === null || typeof requestBody !== 'object') {
    return costDetails;
  }

  for (const fieldName of WRITABLE_FIELDS) {
    const fieldValue = requestBody[fieldName];

    // Strict checks stop undefined and null from overwriting a schema default.
    if (fieldValue !== undefined && fieldValue !== null) {
      costDetails[fieldName] = fieldValue;
    }
  }

  return costDetails;
}
