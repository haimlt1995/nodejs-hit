import { Counter } from '../../models/counter.model.js';

// gives out the next running number for a collection
export async function getNextSequenceValue(sequenceName) {
  // one atomic step, so two inserts never get the same number
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true },
  );

  return counter.sequenceValue;
}
