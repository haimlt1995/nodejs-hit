import { ApiError } from '../lib/ApiError.js';
import { Cost } from '../models/cost.model.js';
import { User } from '../models/user.model.js';

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
