import { ApiError } from '../lib/ApiError.js';
import * as userService from '../services/user.service.js';

/**
 * GET /api/users, returns every user.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function list(req, res) {
  res.json(await userService.listUsers());
}

/**
 * GET /api/users/:id, returns the user with their total costs.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function getById(req, res) {
  // Convert at the boundary, so the service only ever sees a number.
  const userId = Number(req.params.id);

  // Catches 'abc', '', '12.5' and anything else that is not a whole number.
  if (!Number.isInteger(userId)) {
    throw ApiError.badRequest(`Invalid user id '${req.params.id}'`);
  }

  res.json(await userService.getUserDetails(userId));
}
