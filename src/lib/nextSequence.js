import { Counter } from '../models/counter.model.js';

/**
 * Hands out the next id of one named sequence.
 * @param {string} sequenceName - The counters document to increment.
 * @returns {Promise<number>} The newly assigned id.
 */
export async function getNextSequenceValue(sequenceName) {
  // $inc plus upsert is atomic, so two concurrent inserts never get the same id.
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true },
  );

  return counter.sequenceValue;
}
