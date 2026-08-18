import * as logService from '../../shared/services/log.service.js';

// api that lists the saved log lines
export async function list(req, res) {
  res.json(await logService.listLogs());
}
