import { ApiError } from '../lib/ApiError.js';
import { Item } from '../models/item.model.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listItems({ page = 1, limit = 20, search } = {}) {
  const filter = search ? { name: new RegExp(escapeRegExp(search), 'i') } : {};

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Item.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getItem(id) {
  const item = await Item.findById(id);
  if (!item) {
    throw ApiError.notFound(`Item ${id} not found`);
  }
  return item;
}

export async function createItem(payload) {
  return Item.create(pickWritable(payload));
}

export async function updateItem(id, payload) {
  const item = await Item.findByIdAndUpdate(id, pickWritable(payload), {
    new: true,
    runValidators: true,
  });

  if (!item) {
    throw ApiError.notFound(`Item ${id} not found`);
  }
  return item;
}

export async function deleteItem(id) {
  const item = await Item.findByIdAndDelete(id);
  if (!item) {
    throw ApiError.notFound(`Item ${id} not found`);
  }
}

/** Drops client-supplied fields that must never be written directly (id, timestamps, ...). */
function pickWritable({ name, description, quantity, tags } = {}) {
  const payload = { name, description, quantity, tags };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
