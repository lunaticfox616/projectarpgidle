import { createSkillFootprintRenderer } from './rendering/skill-footprint.mjs';

const native = createSkillFootprintRenderer({
    get actExplorationDoors() { return actExplorationDoors; },
    get actExplorationMap() { return actExplorationMap; },
    get actExplorationState() { return actExplorationState; },
    currentRun: () => actExplorationState.current(window.GameModules.state.game),
    get getCombatGridSize() { return getCombatGridSize; },
    get gridCellKey() { return gridCellKey; }
});
safeExposeGlobals({
    projectSkillFootprint: native.projectSkillFootprint,
    clipSkillFootprint: native.clipSkillFootprint,
    getGroundTakenCellKeys: native.getGroundTakenCellKeys,
    clipSkillFootprintTerrain: native.clipSkillFootprintTerrain,
    drawSkillFootprintGround: native.drawSkillFootprintGround
});
