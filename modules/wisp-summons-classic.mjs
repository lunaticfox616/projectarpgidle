import { createWispSummons } from './wisp-summons.mjs';
const wispSummons = createWispSummons(WISP_SUMMONS);
safeExposeGlobals({ wispSummons });
