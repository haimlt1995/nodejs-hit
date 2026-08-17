import { ApiError } from '../lib/ApiError.js';
import { pickFields } from '../lib/pickFields.js';
import { Cost } from '../models/cost.model.js';
import { User } from '../models/user.model.js';

// The only fields a client may write.
const WRITABLE_FIELDS = ['id', 'first_name', 'last_name', 'birthday'];

/**
 * Stores a new user.
 *
 * The id has to stay unique. This checks for a clash up front to give a clear
 * message, while the unique index on the collection guards against two requests
 * racing each other.
 *
 * @param {object} requestBody - Parsed request body.
 * @returns {Promise<object>} The stored document.
 */
export async function addUser(requestBody) {
  const userDetails = pickFields(requestBody, WRITABLE_FIELDS);

  // Only worth looking when an id was actually sent: a missing one is a validation error.
  if (userDetails.id !== undefined) {
    const existingUser = await User.findOne({ id: userDetails.id });

    if (existingUser !== null) {
      throw ApiError.conflict(`User ${userDetails.id} already exists`);
    }
  }

  return User.create(userDetails);
}

/**
 * Reports whether a user with that id exists.
 * @param {number} userId - The user's business id.
 * @returns {Promise<boolean>} True when the user is there.
 */
export async function userExists(userId) {
  // exists() fetches only the _id, so no document travels back.
  const found = await User.exists({ id: userId });

  return found !== null;
}

/**
 * Returns every user, exactly as stored.
 *
 * No projection here: unlike getUserDetails, this reply has to carry the same
 * property names the users collection uses.
 *
 * @returns {Promise<Array<object>>} The user documents, ordered by id.
 */
export async function listUsers() {
  // Sorted, so the order does not wander between requests.
  return User.find({}).sort({ id: 1 });
}

/**
 * Returns one user plus the sum of all their costs.
 * @param {number} userId - The user's business id.
 * @returns {Promise<{first_name: string, last_name: string, id: number, total: number}>} The details.
 */
export async function getUserDetails(userId) {
  const user = await User.findOne({ id: userId });

  // No such user, so say so rather than reporting a total of zero.
  if (user === null) {
    throw ApiError.notFound(`User ${userId} not found`);
  }

  const total = await sumCostsForUser(userId);

  // Only the four properties the contract asks for.
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    id: user.id,
    total,
  };
}

/**
 * Adds up every cost belonging to one user.
 * @param {number} userId - The user's business id.
 * @returns {Promise<number>} The total, or 0 when the user has no costs.
 */
async function sumCostsForUser(userId) {
  // Let Mongo add them up, so the documents never travel over the wire.
  const [summary] = await Cost.aggregate([
    { $match: { userid: userId } },
    { $group: { _id: null, total: { $sum: '$sum' } } },
  ]);

  // An empty result just means this user has no costs yet.
  return summary === undefined ? 0 : summary.total;
}
