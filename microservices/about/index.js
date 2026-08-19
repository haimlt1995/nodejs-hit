import { startService } from './createService.js';
import { aboutRouter } from './about.routes.js';

// the service that tells who developed the project
const SERVICE_NAME = 'about';

await startService(SERVICE_NAME, [aboutRouter]);
