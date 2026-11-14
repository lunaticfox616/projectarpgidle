import { createBattleFrameStats } from './battle-frame-stats.mjs';
const battleFrameStats = createBattleFrameStats();
safeExposeGlobals({ battleFrameStats });
