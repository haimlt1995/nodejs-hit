import * as costService from '../../shared/services/cost.service.js';

// 201 means something new was created
const HTTP_CREATED = 201;

// api that adds a cost item
export async function add(req, res) {
  const cost = await costService.addCost(req.body);

  res.status(HTTP_CREATED).json(cost);
}
