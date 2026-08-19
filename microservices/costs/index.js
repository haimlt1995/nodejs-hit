import { startService } from './createService.js';
import { addRouter } from './add.routes.js';
import { reportRouter } from './report.routes.js';

// the service that handles everything about costs
const SERVICE_NAME = 'costs';

await startService(SERVICE_NAME, [addRouter, reportRouter]);
