import { startService } from '../../shared/createService.js';
import { aboutRouter } from './about.routes.js';

// Admin process number two: the details of the developers behind the project.
const SERVICE_NAME = 'about';
const DEFAULT_PORT = 3004;

await startService(SERVICE_NAME, DEFAULT_PORT, [aboutRouter]);
