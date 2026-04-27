/**
 * Guider widget — public exports.
 *
 * Usage:
 *   import { GuiderWidget } from 'guider';
 *   <GuiderWidget mapUrl="/guider.map.json" apiKey={process.env.NEXT_PUBLIC_OPENAI_KEY} />
 */
export { GuiderWidget } from './GuiderWidget.jsx';
export { GuiderProvider, useGuider } from './context.js';
export { agentMode } from '../agent/index.js';
