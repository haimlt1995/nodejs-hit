import { ApiError } from '../../shared/lib/ApiError.js';
import * as userService from '../../shared/services/user.service.js';

// api that lists all users
export async function list(req, res) {
  res.json(await userService.listUsers());
}

// api that shows one user and what they spent in total
export async function getById(req, res) {
  const userId = Number(req.params.id);

  // catches 'abc', '' and anything else that is not a whole number
  if (!Number.isInteger(userId)) {
    throw ApiError.badRequest(`Invalid user id '${req.params.id}'`);
  }

  res.json(await userService.getUserDetails(userId));
}
