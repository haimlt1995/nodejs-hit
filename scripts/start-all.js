import { spawn } from 'node:child_process';
import process from 'node:process';

/*
 * Runs all four microservices as separate child processes, for local work.
 *
 * Each one is still its own process with its own port, exactly as it would be
 * in production. This script only saves opening four terminals.
 */

// Name and port of every service, matching the defaults in each index.js.
const SERVICES = [
  { name: 'logs', port: 3001 },
  { name: 'users', port: 3002 },
  { name: 'costs', port: 3003 },
  { name: 'about', port: 3004 },
];

const children = SERVICES.map(({ name, port }) => {
  // PORT is passed explicitly, so the child never inherits a stray one.
  const child = spawn(process.execPath, [`microservices/${name}/index.js`], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return child;
});

// One Ctrl+C should take all four down together.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    for (const child of children) {
      child.kill(signal);
    }
  });
}
