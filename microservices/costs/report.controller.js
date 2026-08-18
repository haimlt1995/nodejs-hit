import * as reportService from '../../shared/services/report.service.js';

/**
 * GET /api/report, returns the monthly report of one user.
 *
 * Express 5 hands a rejected promise to the error middleware, so no try / catch
 * is needed here.
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {Promise<void>} Resolves once the response is sent.
 */
export async function get(req, res) {
  // id, year and month arrive in the query string.
  const report = await reportService.getMonthlyReport(req.query);

  res.json(report);
}
