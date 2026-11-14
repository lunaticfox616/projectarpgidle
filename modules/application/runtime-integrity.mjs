// Startup diagnostics only: reports missing contracts without modifying the runtime.
const REQUIRED_NAMES = Object.freeze([
    'defaultGame', 'SKILL_DB', 'UNIQUE_DB', 'ORB_DB', 'PASSIVE_TREE',
    'saveGame', 'loadGame', 'getPlayerStats', 'getSkillTargets', 'updateStaticUI',
    'updateCombatUI', 'coreLoop', 'startMoving', 'startEncounterRun', 'renderBattlefield',
    'drawPassiveTree', 'renderCosmosAtlas'
]);

export function checkRuntimeIntegrity(contracts, logger) {
    const missing = REQUIRED_NAMES.filter(name => {
        const value = contracts[name];
        return value == null || value.__placeholderGlobal === true;
    });
    if (contracts.MAP_ZONES == null) missing.push('MAP_ZONES');
    if (missing.length) {
        logger.warn('[integrity-check] missing globals:', missing.join(', '));
        return false;
    }
    logger.info('[integrity-check] modular globals look ready.');
    return true;
}
