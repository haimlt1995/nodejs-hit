import mongoose from 'mongoose';

// shape of a saved monthly report
const reportSchema = new mongoose.Schema(
  {
    // running number, handy next to mongo's _id
    id: { type: Number, unique: true },
    userid: { type: Number, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    // already grouped by category, saved exactly as it is sent back
    costs: { type: [mongoose.Schema.Types.Mixed], required: true },
  },
  {
    // keeps __v out of the replies
    versionKey: false,
    collection: 'reports',
  },
);

// one saved report per user and month
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);
