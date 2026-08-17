import mongoose from 'mongoose';

/*
 * Documents in the `reports` collection.
 *
 * Storage half of the Computed pattern. A month that has ended can never
 * change, so its grouped report is kept here instead of being redone.
 */

const reportSchema = new mongoose.Schema(
  {
    userid: { type: Number, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    // Already grouped, stored exactly as it goes back out.
    costs: { type: [mongoose.Schema.Types.Mixed], required: true },
  },
  {
    // Drop __v, so it never shows up in a response.
    versionKey: false,
    collection: 'reports',
  },
);

// One cached report per user and month.
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);
