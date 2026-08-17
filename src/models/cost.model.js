import mongoose from 'mongoose';

/*
 * Schema of the documents kept in the `costs` collection.
 *
 * The API contract requires one shared set of names across the request parameters,
 * the stored document, and the response body. The schema therefore avoids both the
 * `timestamps` option and a `toJSON` transform renaming `_id` into `id`, so that
 * what is written to the collection is exactly what is sent back to the client.
 */

// The categories a cost item is allowed to belong to.
export const COST_CATEGORIES = ['food', 'health', 'housing', 'sport', 'education'];

const costSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: COST_CATEGORIES },
    userid: { type: Number, required: true },
    sum: { type: Number, required: true },
    // Falls back to the moment the request reached the server.
    date: { type: Date, default: Date.now },
  },
  {
    // Drops the internal __v property, so it never shows up in a response.
    versionKey: false,
    collection: 'costs',
  },
);

// Supports per user lookups and the monthly grouping a report needs.
costSchema.index({ userid: 1, date: 1 });

export const Cost = mongoose.model('Cost', costSchema);
