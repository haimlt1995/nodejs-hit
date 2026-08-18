import mongoose from 'mongoose';

import { getNextSequenceValue } from '../shared/lib/nextSequence.js';

/*
 * Documents in the `costs` collection.
 *
 * The contract wants one set of names across request, storage and response. So
 * no timestamps, and no toJSON rename of _id: what is stored is what comes back.
 */

// The order and spelling every JSON sample in the project document uses.
// 'Sport' is capitalised and singular there, so it is here too.
export const COST_CATEGORIES = ['food', 'education', 'health', 'housing', 'Sport'];

// The document spells it 'sports' in prose but 'Sport' in every sample, so both
// forms are accepted on the way in and stored as the one a report must show.
const CATEGORY_ALIASES = { sport: 'Sport', sports: 'Sport' };

/**
 * Maps the prose spelling of a category onto the one a report shows.
 * @param {string} category - The category as the client sent it.
 * @returns {string} The spelling to store.
 */
function normaliseCategory(category) {
  // Anything that is not a string is left for the schema to reject.
  if (typeof category !== 'string') {
    return category;
  }

  return CATEGORY_ALIASES[category.toLowerCase()] ?? category;
}

const costSchema = new mongoose.Schema(
  {
    // Auto incrementing, so every document keeps a friendly id next to _id.
    id: { type: Number, unique: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: COST_CATEGORIES, set: normaliseCategory },
    userid: { type: Number, required: true },
    // The project document states this one is a Double, not a plain Number.
    sum: { type: mongoose.Schema.Types.Double, required: true },
    // No date sent means now.
    date: { type: Date, default: Date.now },
  },
  {
    // Drop __v, so it never shows up in a response.
    versionKey: false,
    collection: 'costs',
  },
);

// Covers per user lookups and monthly grouping.
costSchema.index({ userid: 1, date: 1 });

// Assigns id once, on insert, never on a later save of the same document.
costSchema.pre('save', async function assignId() {
  if (this.isNew) {
    this.id = await getNextSequenceValue('costs');
  }
});

export const Cost = mongoose.model('Cost', costSchema);
