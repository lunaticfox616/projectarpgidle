import * as part0 from './domain/player-ehp.mjs';
import * as part1 from './domain/map-readiness.mjs';
import { PLAYER_EHP_ELEMENT_KEYS, PLAYER_EHP_SEARCH_LIMIT } from './domain/combat-ehp-values.mjs';
// Removed with the legacy callers at bootstrap migration; this is the sole runtime owner.
const deps = {
    get _t() { return _t; },
    get getUnderworldGravityActionMultiplier() { return getUnderworldGravityActionMultiplier; },
    get getUnderworldLifeDrainPerTick() { return getUnderworldLifeDrainPerTick; },
    get getWorldTreeBarkEffect() { return getWorldTreeBarkEffect; }
};
const env = { get owner() { return game; }, deps };
const ehpBridge = {
    calculatePlayerRawHitTaken(stats, element, rawHit) { return part0.ehpCalculatePlayerRawHitTaken(stats, element, rawHit); },
    calculatePlayerEhpProfile(stats) { return part0.ehpCalculatePlayerEhpProfile(stats); },
    getMapPowerReadiness(stats, estimate) { return part1.ehpGetMapPowerReadiness(env, stats, estimate); }
};
safeExposeGlobals(ehpBridge);
safeExposeGlobals({ PLAYER_EHP_ELEMENT_KEYS, PLAYER_EHP_SEARCH_LIMIT });
