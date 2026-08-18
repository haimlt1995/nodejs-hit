import { startService } from '../../shared/createService.js';
import { addRouter } from './add.routes.js';
import { reportRouter } from './report.routes.js';

// the service that handles everything about costs
const SERVICE_NAME = 'costs';
const DEFAULT_PORT = 3003;

await startService(SERVICE_NAME, DEFAULT_PORT, [addRouter, reportRouter]);
