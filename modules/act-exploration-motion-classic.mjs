import { createExplorationMotion } from './combat/exploration-motion.mjs';
// Remove the global bridge after the grid, save and canvas consumers import the same instance.
const actExplorationMotion=createExplorationMotion({
    depth:()=>STAGE_VIEW.depth,
    walkable:(map,cell)=>actExplorationMap.walkable(map,cell)
});
safeExposeGlobals({actExplorationMotion});
