import { startService } from '../../shared/createService.js';
import { addRouter } from './add.routes.js';
import { reportRouter } from './report.routes.js';

// Everything to do with costs: adding an item, and the monthly report.
const SERVICE_NAME = 'costs';
const DEFAULT_PORT = 3003;

await startService(SERVICE_NAME, DEFAULT_PORT, [addRouter, reportRouter]);
