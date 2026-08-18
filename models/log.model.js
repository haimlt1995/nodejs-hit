import mongoose from 'mongoose';

import { getNextSequenceValue } from '../shared/lib/nextSequence.js';

// used when a log line has no request behind it, like startup
export const LOG_NOT_APPLICABLE = 'N/A';
export const LOG_DEFAULT_STATUS_CODE = 200;

// shape of a log document
const logSchema = new mongoose.Schema(
  {
    // running number, handy next to mongo's _id
    id: { type: Number, unique: true },
    level: { type: String, required: true },
    message: { type: String, default: '' },
    method: { type: String, default: LOG_NOT_APPLICABLE },
    endpoint: { type: String, default: LOG_NOT_APPLICABLE },
    statusCode: { type: Number, default: LOG_DEFAULT_STATUS_CODE },
    timestamp: { type: Date, default: Date.now },
  },
  {
    // keeps __v out of the replies
    versionKey: false,
    collection: 'logs',
  },
);

// logs are read newest first
logSchema.index({ timestamp: -1 });

// give each new log line its running number
logSchema.pre('save', async function assignId() {
  if (this.isNew) {
    this.id = await getNextSequenceValue('logs');
  }
});

export const Log = mongoose.model('Log', logSchema);
