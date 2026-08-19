import { ApiError } from '../lib/ApiError.js';
import { pickFields } from '../lib/pickFields.js';
import { Cost } from '../models/cost.model.js';
import { User } from '../models/user.model.js';

// what a client is allowed to send for a user
const WRITABLE_FIELDS = ['id', 'first_name', 'last_name', 'birthday'];

// saves a new user
export async function addUser(requestBody) {
  const userDetails = pickFields(requestBody, WRITABLE_FIELDS);

  // the same person must not be added twice
  if (userDetails.id !== undefined) {
    const existingUser = await User.findOne({ id: userDetails.id });

    if (existingUser !== null) {
      throw ApiError.conflict(`User ${userDetails.id} already exists`);
    }
  }

  return User.create(userDetails);
}

// says whether a user with that id is there
export async function userExists(userId) {
  // only fetches the _id, nothing else comes back
  const found = await User.exists({ id: userId });

  return found !== null;
}

// reads all users, ordered by id
export async function listUsers() {
  return User.find({}).sort({ id: 1 });
}

// reads one user together with what they spent in total
export async function getUserDetails(userId) {
  const user = await User.findOne({ id: userId });

  if (user === null) {
    throw ApiError.notFound(`User ${userId} not found`);
  }

  const total = await sumCostsForUser(userId);

  // only these four go back to the client
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    id: user.id,
    total,
  };
}

// adds up every cost of one user
async function sumCostsForUser(userId) {
  // mongo does the adding, so the costs never travel back to us
  const [summary] = await Cost.aggregate([
    { $match: { userid: userId } },
    { $group: { _id: null, total: { $sum: '$sum' } } },
  ]);

  // no result simply means this user spent nothing yet
  return summary === undefined ? 0 : summary.total;
}
