import { startService } from './createService.js';
import { addRouter } from './add.routes.js';
import { userRouter } from './user.routes.js';

// the service that handles everything about users
const SERVICE_NAME = 'users';

await startService(SERVICE_NAME, [addRouter, userRouter]);
