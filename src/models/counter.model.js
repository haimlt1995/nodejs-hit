import mongoose from 'mongoose';

/*
 * Documents in the `counters` collection.
 *
 * One document per collection name, holding the last id handed out. Backs the
 * auto incrementing `id` every collection keeps alongside Mongo's own `_id`.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    sequenceValue: { type: Number, required: true, default: 0 },
  },
  {
    versionKey: false,
    collection: 'counters',
  },
);

export const Counter = mongoose.model('Counter', counterSchema);
