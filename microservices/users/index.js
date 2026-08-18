import { startService } from '../../shared/createService.js';
import { addRouter } from './add.routes.js';
import { userRouter } from './user.routes.js';

// Everything to do with users: listing them, reading one, and adding one.
const SERVICE_NAME = 'users';
const DEFAULT_PORT = 3002;

await startService(SERVICE_NAME, DEFAULT_PORT, [addRouter, userRouter]);
