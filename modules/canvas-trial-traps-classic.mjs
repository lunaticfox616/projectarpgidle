import { createTrialTrapRenderer } from './rendering/trial-traps.mjs';

const native = createTrialTrapRenderer({
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    createCanvas: () => document.createElement('canvas'),
    takenCells: () => getGroundTakenCellKeys(actExplorationState.current(window.GameModules.state.game)),
    get gridCellKey() { return gridCellKey; },
    lastingGround: () => window.GameModules.state.combat.trialHazardRuntime.ground
});
safeExposeGlobals({ trialTrapArt: native });
