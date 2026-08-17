import { TEAM_MEMBERS } from '../config/team.js';

/**
 * GET /api/about, returns the team behind the project.
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Outgoing response.
 * @returns {void}
 */
export function get(req, res) {
  // A plain array, holding one entry per team member.
  res.json(TEAM_MEMBERS);
}
