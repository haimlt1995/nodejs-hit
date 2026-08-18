import * as logService from '../../shared/services/log.service.js';

/**
 * GET /api/logs, returns every log entry.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function list(req, res) {
  res.json(await logService.listLogs());
}
