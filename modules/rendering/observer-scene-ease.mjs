import { clampNumber } from '../common/numbers.mjs';

export const sceneEase = t => { const p = clampNumber(t,0,1); return p*p*(3-2*p); };
