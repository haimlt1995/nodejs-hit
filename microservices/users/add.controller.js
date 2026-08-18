import * as userService from '../../shared/services/user.service.js';

// A new resource, so 201.
const HTTP_CREATED = 201;

/**
 * POST /api/add on the users service, adds a user.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function add(req, res) {
  const user = await userService.addUser(req.body);

  // Send the stored document back, so the names match the collection.
  res.status(HTTP_CREATED).json(user);
}
