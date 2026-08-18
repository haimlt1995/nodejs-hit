import { Log } from '../../models/log.model.js';

// reads every log line, newest first
export async function listLogs() {
  // lean() returns plain documents, keeping any extra field they carry
  return Log.find().sort({ timestamp: -1 }).lean();
}
