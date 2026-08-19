import { startService } from '../../shared/createService.js';
import { logRouter } from './log.routes.js';

// the service that hands back the saved log lines
const SERVICE_NAME = 'logs';

await startService(SERVICE_NAME, [logRouter]);
