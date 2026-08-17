import mongoose from 'mongoose';

import { getNextSequenceValue } from '../lib/nextSequence.js';

/*
 * Documents in the `logs` collection.
 *
 * Shaped to match the records the collection already holds, so old and new
 * entries can be read together.
 */

export const LOG_NOT_APPLICABLE = 'N/A';
export const LOG_DEFAULT_STATUS_CODE = 200;

const logSchema = new mongoose.Schema(
  {
    // Auto incrementing, so every document keeps a friendly id next to _id.
    id: { type: Number, unique: true },
    level: { type: String, required: true },
    message: { type: String, default: '' },
    // 'N/A' covers records with no request behind them, such as startup.
    method: { type: String, default: LOG_NOT_APPLICABLE },
    endpoint: { type: String, default: LOG_NOT_APPLICABLE },
    statusCode: { type: Number, default: LOG_DEFAULT_STATUS_CODE },
    timestamp: { type: Date, default: Date.now },
  },
  {
    // Drop __v, so it never shows up in a response.
    versionKey: false,
    collection: 'logs',
  },
);

// Reading logs almost always means newest first.
logSchema.index({ timestamp: -1 });

// Assigns id once, on insert, never on a later save of the same document.
logSchema.pre('save', async function assignId() {
  if (this.isNew) {
    this.id = await getNextSequenceValue('logs');
  }
});

export const Log = mongoose.model('Log', logSchema);
