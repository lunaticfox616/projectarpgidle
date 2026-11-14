import { createExplorationLayouts } from './exploration-layouts.mjs';
const explorationLayouts = createExplorationLayouts(ACT_EXPLORATION_MAPS, CONTENT_EXPLORATION_MAPS);
safeExposeGlobals({ explorationLayouts });
