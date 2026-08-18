import mongoose from 'mongoose';

import { getNextSequenceValue } from '../shared/lib/nextSequence.js';

/*
 * Documents in the `costs` collection.
 *
 * The contract wants one set of names across request, storage and response. So
 * no timestamps, and no toJSON rename of _id: what is stored is what comes back.
 */

// Allowed categories, in the order and spelling the project Q&A fixes for a
// report. 'Sport' is capitalised there, so it is capitalised here too.
export const COST_CATEGORIES = ['food', 'education', 'health', 'housing', 'Sport'];

const costSchema = new mongoose.Schema(
  {
    // Auto incrementing, so every document keeps a friendly id next to _id.
    id: { type: Number, unique: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: COST_CATEGORIES },
    userid: { type: Number, required: true },
    sum: { type: Number, required: true },
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
