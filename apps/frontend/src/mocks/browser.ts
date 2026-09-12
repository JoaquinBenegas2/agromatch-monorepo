import { setupWorker } from 'msw/browser';
import { advisorHandlers } from './handlers/advisor.js';
import { bullsHandlers } from './handlers/bulls.js';
import { chatHandlers } from './handlers/chat.js';
import { herdHandlers } from './handlers/herd.js';
import { matchingHandlers } from './handlers/matching.js';
import { meHandlers } from './handlers/me.js';
import { needsHandlers } from './handlers/needs.js';
import { planHandlers } from './handlers/plan.js';

/**
 * REQ-FS-05: un archivo de handlers por feature. En I1/I2 se apaga el
 * array de una feature (comentando su spread acá) sin afectar a las demás.
 */
export const worker = setupWorker(
  ...meHandlers,
  ...bullsHandlers,
  ...needsHandlers,
  ...herdHandlers,
  ...matchingHandlers,
  ...planHandlers,
  ...advisorHandlers,
  ...chatHandlers,
);
