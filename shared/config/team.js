/*
 * The people behind this project, returned as-is by GET /api/about.
 *
 * Kept here rather than in the database: it never changes at runtime, and one
 * obvious place to edit beats a collection nobody remembers to seed.
 */

export const TEAM_MEMBERS = Object.freeze([
  Object.freeze({ first_name: 'Tamir', last_name: 'Shevchenko' }),
  Object.freeze({ first_name: 'Haim', last_name: 'Lev Tov' }),
]);
