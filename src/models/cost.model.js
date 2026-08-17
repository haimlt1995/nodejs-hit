import mongoose from 'mongoose';

/*
 * Documents in the `costs` collection.
 *
 * The contract wants one set of names across request, storage and response. So
 * no timestamps, and no toJSON rename of _id: what is stored is what comes back.
 */

// Allowed categories for a cost item.
export const COST_CATEGORIES = ['food', 'health', 'housing', 'sport', 'education'];

const costSchema = new mongoose.Schema(
  {
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

export const Cost = mongoose.model('Cost', costSchema);
