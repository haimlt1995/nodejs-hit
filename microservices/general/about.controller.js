import { TEAM_MEMBERS } from './config/team.js';

// api that shows the participants names
export function get(req, res) {
  res.json(TEAM_MEMBERS);
}
