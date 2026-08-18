import { Log } from '../../models/log.model.js';

/**
 * Returns every log entry, newest first.
 * @returns {Promise<Array<object>>} The stored log documents.
 */
export async function listLogs() {
  // lean() hands back the raw documents, so an entry keeps any extra property.
  return Log.find().sort({ timestamp: -1 }).lean();
}
