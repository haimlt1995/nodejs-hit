import { spawn } from 'node:child_process';
import process from 'node:process';

/*
 * Runs the four services at once, only to save opening four terminals.
 *
 * Deployed, each one sits on its own server and reads PORT=3000 from its own
 * env file. On one machine they cannot all have 3000, so a port is handed to
 * each here. A real environment variable beats the env file, so this wins.
 */
const SERVICES = [
  { name: 'logs', port: 3001 },
  { name: 'users', port: 3002 },
  { name: 'costs', port: 3003 },
  { name: 'about', port: 3004 },
];

const children = SERVICES.map(({ name, port }) => {
  // each one still runs as its own process, on its own port
  const child = spawn(process.execPath, [`microservices/${name}/index.js`], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return child;
});

// one Ctrl+C should stop all four
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    for (const child of children) {
      child.kill(signal);
    }
  });
}
