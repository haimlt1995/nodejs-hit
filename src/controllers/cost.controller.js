import * as costService from '../services/cost.service.js';

// The request adds a new resource to the collection, so 201 Created is returned.
const HTTP_CREATED = 201;

/**
 * Handles POST /api/add by storing a new cost item.
 *
 * Express 5 forwards a rejected promise from an async handler straight to the
 * error middleware, so a failure needs no try / catch of its own here.
 *
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The outgoing response.
 * @returns {Promise<void>} Resolves once the response has been sent.
 */
export async function add(req, res) {
  const cost = await costService.addCost(req.body);

  // The body is the stored document, so its properties match the collection.
  res.status(HTTP_CREATED).json(cost);
}
