import * as costService from '../services/cost.service.js';

// A new resource, so 201.
const HTTP_CREATED = 201;

/**
 * POST /api/add, stores a new cost item.
 *
 * Express 5 hands a rejected promise to the error middleware, so no try / catch
 * is needed here.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function add(req, res) {
  const cost = await costService.addCost(req.body);

  // Send the stored document back, so the names match the collection.
  res.status(HTTP_CREATED).json(cost);
}
