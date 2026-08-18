import mongoose from 'mongoose';

import { getNextSequenceValue } from '../shared/lib/nextSequence.js';

// the categories a cost can belong to
export const COST_CATEGORIES = ['food', 'education', 'health', 'housing', 'Sport'];

// 'sports' and 'Sport' mean the same thing
const CATEGORY_ALIASES = { sport: 'Sport', sports: 'Sport' };

// turns any accepted spelling into the one we store
function normaliseCategory(category) {
  if (typeof category !== 'string') {
    return category;
  }

  return CATEGORY_ALIASES[category.toLowerCase()] ?? category;
}

// shape of a cost document
const costSchema = new mongoose.Schema(
  {
    // running number, handy next to mongo's _id
    id: { type: Number, unique: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: COST_CATEGORIES, set: normaliseCategory },
    userid: { type: Number, required: true },
    sum: { type: mongoose.Schema.Types.Double, required: true },
    // no date sent means right now
    date: { type: Date, default: Date.now },
  },
  {
    // keeps __v out of the replies
    versionKey: false,
    collection: 'costs',
  },
);

// makes the per user and per month lookups fast
costSchema.index({ userid: 1, date: 1 });

// give each new cost its running number
costSchema.pre('save', async function assignId() {
  if (this.isNew) {
    this.id = await getNextSequenceValue('costs');
  }
});

export const Cost = mongoose.model('Cost', costSchema);
