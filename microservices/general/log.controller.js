import * as logService from './services/log.service.js';

// api that lists the saved log lines
export async function list(req, res) {
  res.json(await logService.listLogs());
}
