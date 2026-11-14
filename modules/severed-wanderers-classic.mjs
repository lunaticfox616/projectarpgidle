import { createSeveredWanderers } from './domain/severed-wanderers.mjs';

const rules = createSeveredWanderers({
    get SEVERED_WANDERER_CONFIG() { return SEVERED_WANDERER_CONFIG; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; },
    get SKILL_DB() { return SKILL_DB; },
    get SKILL_GRID_DB() { return typeof SKILL_GRID_DB === 'undefined' ? undefined : SKILL_GRID_DB; },
    get _t() { return _t; }
});
const buildSeveredWandererLoadout = rules.buildSeveredWandererLoadout;
const applySeveredWandererLoadout = rules.applySeveredWandererLoadout;
function canRollSeveredWanderer(zone, isElite, isBoss) {
    return rules.canRollSeveredWanderer(zone, isElite, isBoss, game);
}
function maybeApplySeveredWanderer(enemy, zone, isElite, isBoss, rng = Math.random) {
    return rules.maybeApplySeveredWanderer(enemy, zone, isElite, isBoss, rng, game);
}
safeExposeGlobals({ canRollSeveredWanderer, buildSeveredWandererLoadout,
    applySeveredWandererLoadout, maybeApplySeveredWanderer });
