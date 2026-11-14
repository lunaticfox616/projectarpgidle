import { createGemCastScheduler } from './combat/gem-cast-scheduler.mjs';
// Late-bound grid/controller services retain the current load order. Replace at the shared application entry.
const skillGemCasts = createGemCastScheduler({
    get owner() { return game; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get getGridUnitCells() { return getGridUnitCells; },
    get gridCellKey() { return gridCellKey; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationDoors() { return actExplorationDoors; },
    get canPlaceGridFootprint() { return canPlaceGridFootprint; },
    get hasGridCell() { return hasGridCell; },
    get getClosestGridUnitCell() { return getClosestGridUnitCell; },
    get projectileShots() { return projectileShots; },
    get random() { return Math.random; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get rollProjectileExtraShots() { return rollProjectileExtraShots; },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() { return PROJECTILE_BONUS_SHOT_DAMAGE_PCT; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get findNearestGridEnemy() { return findNearestGridEnemy; },
    get getHeroAppearanceId() { return getHeroAppearanceId; }
});
safeExposeGlobals({ skillGemCasts });
