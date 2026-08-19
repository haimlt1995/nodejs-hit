import mongoose from 'mongoose';

// keeps the last running number given out for each collection
const counterSchema = new mongoose.Schema(
  {
    // the collection being numbered, like 'costs'
    _id: { type: String, required: true },
    sequenceValue: { type: Number, required: true, default: 0 },
  },
  {
    versionKey: false,
    collection: 'counters',
  },
);

export const Counter = mongoose.model('Counter', counterSchema);
