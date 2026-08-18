import { startService } from '../../shared/createService.js';
import { addRouter } from './add.routes.js';
import { userRouter } from './user.routes.js';

// the service that handles everything about users
const SERVICE_NAME = 'users';
const DEFAULT_PORT = 3002;

await startService(SERVICE_NAME, DEFAULT_PORT, [addRouter, userRouter]);
