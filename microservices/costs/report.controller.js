import * as reportService from '../../shared/services/report.service.js';

// api that gives the monthly report
export async function get(req, res) {
  // id, year and month arrive in the query string
  const report = await reportService.getMonthlyReport(req.query);

  res.json(report);
}
