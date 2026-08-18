import * as costService from '../../shared/services/cost.service.js';

// A new resource, so 201.
const HTTP_CREATED = 201;

/**
 * POST /api/add on the costs service, adds a cost item.
 *
 * Users are added by the users service, on its own /api/add. Each process owns
 * one resource, so nothing here has to guess what the body describes.
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
