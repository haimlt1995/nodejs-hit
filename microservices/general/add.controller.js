import { ApiError } from './lib/ApiError.js';
import * as costService from './services/cost.service.js';
import * as userService from './services/user.service.js';

// 201 means something new was created
const HTTP_CREATED = 201;

// fields that only ever appear on a user
const USER_FIELDS = ['id', 'first_name', 'last_name', 'birthday'];

// fields that only ever appear on a cost item
const COST_FIELDS = ['description', 'category', 'userid', 'sum'];

/*
 * Split apart, users and costs each own a /api/add of their own, so the url
 * says which is meant. Here they share one process, so the body has to say it
 * instead. The two field sets share no names, so the choice is never a guess.
 */

// api that adds either a user or a cost item
export async function add(req, res) {
  const resourceKind = detectResourceKind(req.body);

  const created =
    resourceKind === 'user'
      ? await userService.addUser(req.body)
      : await costService.addCost(req.body);

  res.status(HTTP_CREATED).json(created);
}

// works out whether a body describes a user or a cost item
function detectResourceKind(requestBody) {
  const hasUserField = containsAnyField(requestBody, USER_FIELDS);
  const hasCostField = containsAnyField(requestBody, COST_FIELDS);

  // a body carrying both is a mistake, not something to guess at
  if (hasUserField && hasCostField) {
    throw ApiError.badRequest('Body mixes user and cost fields, so it describes neither');
  }

  if (hasUserField) {
    return 'user';
  }

  if (hasCostField) {
    return 'cost';
  }

  // nothing recognisable, so say what each one needs
  throw ApiError.badRequest(
    'Send a cost (description, category, userid, sum) or a user (id, first_name, last_name, birthday)',
  );
}

// says whether a body carries any of the given fields
function containsAnyField(requestBody, fieldNames) {
  // a missing or broken body carries nothing at all
  if (requestBody === null || typeof requestBody !== 'object') {
    return false;
  }

  return fieldNames.some((fieldName) => requestBody[fieldName] !== undefined);
}
