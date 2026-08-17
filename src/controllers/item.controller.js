import * as itemService from '../services/item.service.js';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export async function list(req, res) {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 20)));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  res.json(await itemService.listItems({ page, limit, search }));
}

export async function getById(req, res) {
  res.json(await itemService.getItem(req.params.id));
}

export async function create(req, res) {
  const item = await itemService.createItem(req.body);
  res.status(201).location(`${req.baseUrl}/${item.id}`).json(item);
}

export async function update(req, res) {
  res.json(await itemService.updateItem(req.params.id, req.body));
}

export async function remove(req, res) {
  await itemService.deleteItem(req.params.id);
  res.status(204).end();
}
