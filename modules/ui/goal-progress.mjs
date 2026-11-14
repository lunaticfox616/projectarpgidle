import { nextGoalClampCount } from './goal-actions.mjs';

export function nextGoalHasEquippableInventoryItem(env, g) {
    if (!g || !Array.isArray(g.inventory) || !g.equipment || typeof g.equipment !== 'object') return false;
    return g.inventory.some(item => {
        if (!item) return false;
        let slots = [];
        if (typeof env.deps.getEquipCandidateSlots === 'function') slots = env.deps.getEquipCandidateSlots(item) || [];
        else if (item.slot) slots = [item.slot];
        return slots.some(slot => Object.prototype.hasOwnProperty.call(g.equipment, slot) && !g.equipment[slot]);
    });
}

export function nextGoalHasAffordableGemUpgrade(env, g) {
    if (!g || !g.gemEnhanceUnlocked || Math.max(1, Math.floor(Number(g.season) || 1)) < 2) return false;
    if (typeof env.deps.SKILL_DB === 'undefined' || !env.deps.SKILL_DB || !Array.isArray(g.skills)) return false;
    let currencies = g.currencies || {};
    return g.skills.some(name => {
        if (!env.deps.SKILL_DB[name] || !env.deps.SKILL_DB[name].isGem) return false;
        let gem = (g.gemData && g.gemData[name]) || {};
        let level = Math.max(0, Math.floor(Number(gem.enhanceLevel) || 0));
        return level < env.deps.GEM_CORE_FORGE.maxLevel && nextGoalClampCount(currencies[env.deps.GEM_CORE_FORGE.materialKey]) >= env.deps.GEM_CORE_FORGE.costs[level];
    });
}

export function nextGoalGetAstraProgress(g) {
    if (!g || Math.max(1, Math.floor(Number(g.season) || 1)) < 31) return null;
    const { atlas, underworld } = nextGoalCosmosRecords(g);
    if (!nextGoalAstraUnlocked(atlas, underworld)) return null;
    let required = ['planet-45', 'planet-46', 'planet-47', 'planet-48', 'planet-49'];
    let cleared = new Set(atlas && Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
    let clearedCount = required.filter(id => cleared.has(id)).length;
    let keyCount = nextGoalClampCount(g.currencies && g.currencies.cosmosSovereignKey);
    return {
        clearedCount,
        total: required.length,
        ready: clearedCount === required.length,
        keyCount,
        canChallenge: clearedCount === required.length && keyCount > 0
    };
}

export function nextGoalGetCosmosJourney(g) {
    if (!g) return null;
    const journal = Array.isArray(g.journalEntries) ? g.journalEntries : [];
    if (!journal.includes('woodsman_echo')) return null;
    const { atlas, underworld } = nextGoalCosmosRecords(g);
    const highestFloor = Math.max(0, Math.floor(Number(underworld && underworld.highestFloor) || 0));
    if (highestFloor < 30) return { stage: 'unlock', highestFloor };
    const bosses = new Set(atlas && Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
    const bossIds = ['planet-46', 'planet-47', 'planet-48', 'planet-49', 'planet-45'];
    const nextGalaxy = bossIds.findIndex(id => !bosses.has(id)) + 1;
    return { stage: nextGalaxy > 0 ? 'atlas' : 'complete', highestFloor, nextGalaxy };
}

export function nextGoalGetPinnacleJourney(env, g) {
    if (!g || Math.max(1, Math.floor(Number(g.season) || 1)) < 31) return null;
    const ids = ['pinnacle_underking', 'pinnacle_leviathan', 'pinnacle_sky', 'pinnacle_observer'];
    const zones = ids.map(id => env.deps.SEASON_BOSS_ZONES.find(zone => zone.id === id)).filter(Boolean);
    const cleared = new Set(Array.isArray(g.clearedRootBosses) ? g.clearedRootBosses : []);
    const next = zones.find(zone => !cleared.has(zone.id));
    if (!next) return { complete: true };
    // 최종 관문의 조건인 네 수호자(아스트라 포함)를 센다. 셋만 세어 3/3 옆에 관문 조건 3/4가 함께 보였다.
    const guardians = (zones.find(zone => zone.pinnacleCapstone) || {}).requiresPinnacles || [];
    const guardiansCleared = guardians.filter(id => cleared.has(id)).length;
    return { complete: false, next, gate: env.deps.getSeasonBossProgressGate(next, g), guardiansCleared, guardianTotal: guardians.length };
}

function nextGoalCosmosRecords(g) {
    return {
        atlas: g.cosmosAtlas && typeof g.cosmosAtlas === 'object' ? g.cosmosAtlas : null,
        underworld: g.underworldProgress && typeof g.underworldProgress === 'object' ? g.underworldProgress : null
    };
}

function nextGoalAstraUnlocked(atlas, underworld) {
    return !!(atlas && atlas.unlocked) || Math.max(0, Math.floor(Number(underworld && underworld.highestFloor) || 0)) >= 30;
}

export function nextGoalGetPinnacleJourneySubtab(journey, g) {
    if (!journey || !journey.next || journey.gate.met) return 'map-explore-root-boss';
    if (journey.next.pinnacleTrack === 'underworld') return 'map-tab-underworld';
    if (journey.next.pinnacleTrack === 'ocean') return 'map-tab-ocean';
    if (journey.next.pinnacleTrack === 'sky') return 'map-tab-sky';
    const cleared = new Set(Array.isArray(g && g.clearedRootBosses) ? g.clearedRootBosses : []);
    return cleared.has('cosmos_astra') ? 'map-explore-root-boss' : 'map-tab-cosmos';
}
