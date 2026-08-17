import { ApiError } from '../lib/ApiError.js';
import * as costService from '../services/cost.service.js';
import * as userService from '../services/user.service.js';

// A new resource, so 201.
const HTTP_CREATED = 201;

// Fields that only ever appear on a user.
const USER_FIELDS = ['id', 'first_name', 'last_name', 'birthday'];

// Fields that only ever appear on a cost item.
const COST_FIELDS = ['description', 'category', 'userid', 'sum'];

/**
 * POST /api/add, adds either a cost item or a user.
 *
 * The brief gives both resources this one path, so the body has to say which is
 * meant. The two field sets share no names, so the choice is unambiguous, and a
 * body that matches both or neither is rejected rather than guessed at.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function add(req, res) {
  const resourceKind = detectResourceKind(req.body);

  const created =
    resourceKind === 'user'
      ? await userService.addUser(req.body)
      : await costService.addCost(req.body);

  // Send the stored document back, so the names match the collection.
  res.status(HTTP_CREATED).json(created);
}

/**
 * Works out whether a body describes a user or a cost item.
 * @param {object} requestBody - Parsed request body.
 * @returns {string} Either 'user' or 'cost'.
 */
function detectResourceKind(requestBody) {
  const hasUserField = containsAnyField(requestBody, USER_FIELDS);
  const hasCostField = containsAnyField(requestBody, COST_FIELDS);

  // A body carrying both is a mistake, and not something to guess at.
  if (hasUserField && hasCostField) {
    throw ApiError.badRequest('Body mixes user and cost fields, so it describes neither');
  }

  if (hasUserField) {
    return 'user';
  }

  if (hasCostField) {
    return 'cost';
  }

  // Nothing recognisable, so say what each resource needs.
  throw ApiError.badRequest(
    'Send a cost (description, category, userid, sum) or a user (id, first_name, last_name, birthday)',
  );
}

/**
 * Reports whether a body carries any of the given fields.
 * @param {object} requestBody - Parsed request body.
 * @param {Array<string>} fieldNames - Names to look for.
 * @returns {boolean} True when at least one is present.
 */
function containsAnyField(requestBody, fieldNames) {
  // A missing or broken body carries nothing at all.
  if (requestBody === null || typeof requestBody !== 'object') {
    return false;
  }

  return fieldNames.some((fieldName) => requestBody[fieldName] !== undefined);
}
