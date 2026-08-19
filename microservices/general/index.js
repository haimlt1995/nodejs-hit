import { startService } from './createService.js';
import { aboutRouter } from './about.routes.js';
import { logRouter } from './log.routes.js';
import { reportRouter } from './report.routes.js';
import { userRouter } from './user.routes.js';
import { addRouter } from './add.routes.js';

/*
 * Every endpoint of the other four, in one process.
 *
 * Handy for running the whole api behind a single url. The four separate
 * services are what the brief asks for; this one is an extra.
 */
const SERVICE_NAME = 'general';

// its own add router, since users and costs both want POST /api/add
await startService(SERVICE_NAME, [aboutRouter, logRouter, reportRouter, userRouter, addRouter]);
