// Loot domain: drop rates, rewards and codex bonuses. No DOM or renderer dependencies.
const UNIQUE_CODEX_KEYS = new Set(UNIQUE_DB.filter(entry => !entry.realmCodexOnly)
    .map(entry => `${entry.slots[0]}|${entry.name}`));
function getUniqueCodexProgress() {
    let codex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
    let stored = Object.keys(codex).filter(key => !!codex[key] && UNIQUE_CODEX_KEYS.has(key)).length;
    return { stored: stored, total: UNIQUE_CODEX_KEYS.size };
}

function getCodexBonusPctFromCount(storedCount) {
    let count = Math.max(0, Math.floor(Number(storedCount) || 0));
    let preSoftCap = Math.min(50, count) * 0.2;
    let postSoftCap = Math.max(0, count - 50) * 0.1;
    return preSoftCap + postSoftCap;
}

function getCodexBonusPct() {
    if (!contentProgression.isUnlocked('codex')) return 0;
    return getCodexBonusPctFromCount(getUniqueCodexProgress().stored);
}

function getGrowthItemBaseDropChance(enemy) {
    if (enemy && enemy.isBoss) return GROWTH_ITEM_BASE_DROP_CHANCES.boss;
    return enemy && enemy.isElite ? GROWTH_ITEM_BASE_DROP_CHANCES.elite : GROWTH_ITEM_BASE_DROP_CHANCES.regular;
}

function getEquipmentBaseDropChance(enemy) {
    if (enemy && enemy.isBoss) return EQUIPMENT_BASE_DROP_CHANCES.boss;
    return enemy && enemy.isElite ? EQUIPMENT_BASE_DROP_CHANCES.elite : EQUIPMENT_BASE_DROP_CHANCES.regular;
}

function isFirstActBossEquipmentDropThisLoop(zone, enemy) {
    if (!zone || zone.type !== 'act' || !enemy || !enemy.isBoss) return false;
    return String(zone.id) === String(Math.max(0, Math.floor(Number(game.maxZoneId) || 0)));
}

function getLabyrinthFossilDropChances(floor, fossilDropMultiplier, fossilRareMultiplier) {
    let currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
    let commonMul = Math.max(0, Number(fossilDropMultiplier) || 0);
    let rareMul = Math.max(0, Number(fossilRareMultiplier) || 0);
    return {
        base: 0.5 * commonMul * LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        typed: 0.5 * commonMul * LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        primal: Math.min(0.45, (0.10 + currentFloor * 0.003) * commonMul) * LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        ancient: Math.min(0.14, (0.025 + currentFloor * 0.001) * commonMul) * LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        abyssal: 0.03 * rareMul * LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER
    };
}

/** One capped multiplier for equipment, growth items and bonus currency rolls. */
function getEnemyLootDropMultiplier(zone, enemy) {
    let progression = getAdditiveDropBonusMultiplier(getCodexBonusPct());
    let raw = progression * getAbyssMonsterScales(zone).dropMul * (Number(enemy.dropMul) || 1);
    return capEndlessContentDropMultiplier(zone, raw) * getContentDropRateMultiplier(zone);
}

/** Independent base chances share bonuses without deriving growth drops from equipment. */
function getEquipmentDropChances(zone, enemy) {
    let multiplier = getEnemyLootDropMultiplier(zone, enemy);
    if (zone.type === 'labyrinth') {
        let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
        let progress = Math.min(1, Math.max(0, (floor - 30) / 170));
        multiplier *= 1 - 0.7 * progress;
    }
    return {
        equipment: isFirstActBossEquipmentDropThisLoop(zone, enemy) ? 1 : getEquipmentBaseDropChance(enemy) * multiplier,
        growth: getGrowthItemBaseDropChance(enemy) * multiplier
    };
}

/**
 * @param {{type:string}} zone
 * @param {{isBoss?:boolean,isElite?:boolean}} enemy
 * @param {number} chance Final ordinary roll chance.
 * @returns {{dropped:boolean,guaranteed:boolean,minimumRarity:string|null,nextProgress:number}}
 * Read-only planning; commit after generation and the inventory's pickup/salvage policy finish.
 */
function rollEquipmentDrop(zone, enemy, chance) {
    let rank = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'regular');
    let progress = game.equipmentDropProgress + EQUIPMENT_DROUGHT_RULES.credit[rank] * getContentDropRateMultiplier(zone);
    let guaranteed = progress >= EQUIPMENT_DROUGHT_RULES.threshold;
    let dropped = guaranteed || Math.random() < chance;
    let minimumRarity = guaranteed ? 'rare' : null;
    return { dropped, guaranteed, minimumRarity, nextProgress: dropped ? 0 : progress };
}

/** Roll thresholds stay independent of minimum-rarity rewards and inventory filtering. */
function getEquipmentDropRarity(enemy, roll) {
    let rank = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'regular');
    let thresholds = EQUIPMENT_DROP_RARITY_THRESHOLDS[rank];
    return ['unique', 'rare', 'magic'].find(rarity => roll < thresholds[rarity]) || 'normal';
}

function getMappingTicketDrops(enemy, zone, mappingOpened) {
    let drops = [];
    if (!mappingOpened || !zone || zone.type === 'trial' || zone.type === 'seasonBoss') return drops;
    let contentDropMul = getContentDropRateMultiplier(zone);
    if ((game.season || 1) >= 2) {
        if (enemy.isBoss && Math.random() < 0.044 * contentDropMul) {
            drops.push([rndChoice(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm']), 1]);
        } else if (enemy.isElite && Math.random() < 0.01 * contentDropMul) {
            drops.push([rndChoice(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm']), 1]);
        }
    }
    let highTrialUnlocked = (game.unlockedTrials || []).includes('trial_3')
        || (game.unlockedTrials || []).includes('trial_4')
        || (game.completedTrials || []).includes('trial_3')
        || (game.completedTrials || []).includes('trial_4');
    if (!highTrialUnlocked) return drops;
    let trialKeyChance = enemy.isBoss ? 0.015 : (enemy.isElite ? 0.001 : 0);
    if (trialKeyChance > 0 && Math.random() < trialKeyChance * contentDropMul) drops.push(['trialKey3', 1]);
    return drops;
}

// Classic-script consumers: combat owns committing rewards; this module owns their rules.
safeExposeGlobals({ getEnemyLootDropMultiplier, getEquipmentDropChances, rollEquipmentDrop, getEquipmentDropRarity });


function getUnderworldResourceDropChances(enemy) {
    if (enemy && enemy.isBoss) {
        return { fossil: 0.11, typedFossil: 0.0375, tool: 0.025, rune: 0.18, blurredPower: 0.01, ...UNDERWORLD_ORE_DROP_CHANCES };
    }
    if (enemy && enemy.isElite) {
        return { fossil: 0.0125, typedFossil: 0.003, tool: 0.0025, rune: 0.008, blurredPower: 0.0005, ...UNDERWORLD_ORE_DROP_CHANCES };
    }
    return { fossil: 0.0025, typedFossil: 0.0006, tool: 0.0005, rune: 0.0015, blurredPower: 0.00005, ...UNDERWORLD_ORE_DROP_CHANCES };
}

(function () {
'use strict';

/**
 * @param {{isBoss?:boolean,isElite?:boolean}} enemy
 * @param {(chance:number) => boolean} bonusRoll Currency roll including enemy/content bonuses.
 * @returns {Array<[string,number]>} Common crafting rewards; no guaranteed boss payout.
 */
function getBasicCurrencyDrops(enemy, bonusRoll) {
    if (enemy.isBoss) return Object.entries(BASIC_CURRENCY_DROP_CHANCES.boss)
        .filter(([, chance]) => bonusRoll(chance)).map(([key]) => [key, 1]);
    let drops = [];
    if (enemy.isElite) {
        if (bonusRoll(BASIC_CURRENCY_DROP_CHANCES.elite.mixed)) {
            drops.push([Math.random() < 0.9 ? 'magicBud' : 'formlessDew', 1]);
        }
        if (bonusRoll(BASIC_CURRENCY_DROP_CHANCES.elite.sapBud)) drops.push(['sapBud', 1]);
        if (bonusRoll(BASIC_CURRENCY_DROP_CHANCES.elite.formlessDew)) drops.push(['formlessDew', 1]);
    } else if (bonusRoll(BASIC_CURRENCY_DROP_CHANCES.regular.mixed)) {
        drops.push([[ 'magicBud', 'magicBud', 'magicBud', 'magicBud', 'blightSpore' ][Math.floor(Math.random() * 5)], 1]);
    }
    return drops;
}

function getCurrencyDrops(enemy) {
    let zone = getZone(game.currentZoneId) || getZone(0);
    let abyssScale = getAbyssMonsterScales(zone);
    let contentDropMul = getContentDropRateMultiplier(zone);
    let dropMultiplier = getEnemyLootDropMultiplier(zone, enemy);
    let bonusRoll = chance => Math.random() < Math.min(0.95, chance * dropMultiplier);
    let drops = getBasicCurrencyDrops(enemy, bonusRoll);
    // 황금률: 일반 0.007% / 정예 0.04% / 보스 0.6%. 수액눈은 황금률의 2배다.
    let divineChance = enemy.isBoss ? 0.006 : (enemy.isElite ? 0.0004 : 0.00007);
    if (bonusRoll(divineChance)) drops.push(['goldenRule', 1]);
    if (bonusRoll(divineChance / 20)) drops.push(['fairyRing', 1]);
    if (bonusRoll(divineChance * 2)) drops.push(['sapBud', 1]);
    let isRepeatMasterwork = enemy.isBoss && zone.id === 'rival_masterwork'
        && Array.isArray(game.clearedRootBosses) && game.clearedRootBosses.includes(zone.id);
    let ouroborosChance = (divineChance / 1200) * (isRepeatMasterwork ? 2.5 : 1);
    if (bonusRoll(ouroborosChance)) drops.push(['ouroboros', 1]);
    let mappingOpened = (game.maxZoneId || 0) >= ABYSS_START_ZONE_ID;
    drops.push(...getMappingTicketDrops(enemy, zone, mappingOpened));
    if (zone.type === 'cosmos' && bonusRoll(enemy.isBoss ? 0.025 : (enemy.isElite ? 0.006 : 0.0015))) drops.push(['pruningShears', 1]);
    if (zone.type === 'cosmos' && enemy.isBoss && bonusRoll(0.012)) drops.push(['abyssCatalyst', 1]);
    if ((game.season || 1) >= 4 && enemy.isSky && Math.random() < 0.35) drops.push(['skyEssence', 1]);
    if ((game.season || 1) >= 5 && enemy.isBoss && Math.random() < 0.16 * contentDropMul) drops.push(['emberBranch', 1]);
    if ((game.season || 1) >= 5 && enemy.isBoss && Math.random() < 0.03 * contentDropMul) drops.push(['jewelShard', 3]);
    if ((game.season || 1) >= 5 && enemy.isElite && Math.random() < 0.008 * contentDropMul) drops.push(['jewelShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.random() < 0.018) drops.push(['sealShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.random() < 0.005) drops.push(['strongSealShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.floor(zone.floor || 0) >= 30 && Math.random() < 0.00052) drops.push(['radiantSealShard', 1]);
    if ((game.season || 1) >= 6 && enemy.isBoss && Math.random() < 0.018 * contentDropMul) drops.push(['blessing', 1]);
    if ((game.season || 1) >= 6 && enemy.isElite && Math.random() < 0.004 * contentDropMul) drops.push(['blessing', 1]);
    if ((game.season || 1) >= 6 && enemy.isBoss && zone.type === 'abyss' && Number(zone.id) >= 19 && Math.random() < 0.0125) drops.push(['beastKeyCerberus', 1]);
    // 버려진 날붙이 도전권 (루프 31+): 심층 콘텐츠 보스가 드랍한다. 루프당 결투 6회(다섯 날 + 완성작)를 노린 넉넉한 확률.
    if ((game.season || 1) >= 31 && enemy.isBoss
        && (zone.type === 'chaosRealm' || zone.type === 'underworld' || zone.type === 'skyTower' || (zone.type === 'abyss' && Math.floor(getAbyssDepthFromZoneId(Number(zone.id)) || 0) >= 21))
        && Math.random() < 0.10 * contentDropMul) drops.push(['rivalKey', 1]);
    // 잔향체 아스트라 도전권 (루프 31+): 우주계 은하 보스(planet-45~49)가 드랍한다.
    if ((game.season || 1) >= 31 && enemy.isBoss && zone.type === 'cosmos' && Math.random() < 0.15) drops.push(['cosmosSovereignKey', 1]);
    if (zone.type === 'chaosRealm') {
        let chaosKeyChance = enemy.isBoss ? 0.012 : (enemy.isElite ? 0.003 : 0.0006);
        if (Math.random() < chaosKeyChance) drops.push(['chaosKey', 1]);
    }
    if (zone.type === 'underworld') {
        let underFloor = Math.max(1, Math.floor(zone.floor || 1));
        let resourceChance = getUnderworldResourceDropChances(enemy);
        let coreKeyChance = enemy.isBoss ? 0.012 : (enemy.isElite ? 0.003 : 0.0006);
        if (Math.random() < coreKeyChance * contentDropMul) drops.push(['coreKey', 1]);
        if (Math.random() < resourceChance.fossil) drops.push(['fossil', 1]);
        if (Math.random() < resourceChance.typedFossil) drops.push([rndChoice(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']), 1]);
        if (Math.random() < resourceChance.tool) drops.push([rndChoice(['deepWhetstone', 'rootIron', 'jewelPolish']), 1]);
        if (underFloor >= 10 && Math.random() < resourceChance.rune) drops.push(['runeShard', enemy.isBoss ? 2 : 1]);
        if (typeof canDropCoreCubeBlurred45 === 'function' && canDropCoreCubeBlurred45() && Math.random() < resourceChance.blurredPower) drops.push(['blurred45', 1]);
        if (Math.random() < resourceChance.copper) drops.push(['underCopper', 1]);
        if (Math.random() < resourceChance.silver) drops.push(['underSilver', 1]);
        if (Math.random() < resourceChance.gold) drops.push(['underGold', 1]);
        if (enemy.isBoss && Math.random() < 0.0025 * contentDropMul) drops.push([rndChoice(['uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']), 1]);
    }
    if (enemy.isBoss && zone.type === 'abyss' && Math.random() < (abyssScale.bossExtraCurrencyChance || 0)) drops.push(['jewelShard', 2]);
    if ((game.season || 1) >= 2 && zone.type === 'seasonBoss' && enemy.isBoss && Math.random() < 0.22) drops.push(['bossCore', 1]);
    return drops.filter(([key]) => contentProgression.canDropCurrency(key));
}

safeExposeGlobals({ getCurrencyDrops });
})();

(function () {
    'use strict';

    function statOptions() {
        const ids = new Set(MOD_DB.flatMap(mod => [mod.statId || mod.id,
            ...(mod.compound || []).map(stat => stat.statId || stat.id)]));
        return [...ids].filter(Boolean).map(id => ({ id, name: getStatName(id) }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }

    /** Normalize external save/UI input; invalid rows cannot become broad keep rules. */
    function normalizeTargets(input) {
        const source = input && typeof input === 'object' ? input : {};
        const validIds = new Set(statOptions().map(stat => stat.id));
        const seen = new Set();
        const rules = (Array.isArray(source.rules) ? source.rules : []).filter(rule => {
            if (!rule || !validIds.has(rule.statId) || seen.has(rule.statId)) return false;
            if (!Number.isFinite(rule.minValue) || !Number.isFinite(rule.minTier)) return false;
            seen.add(rule.statId);
            return true;
        }).slice(0, 6).map(rule => ({ statId: rule.statId,
            minValue: Math.max(0, Number(rule.minValue)), minTier: clampNumber(Math.floor(Number(rule.minTier)), 0, 20) }));
        return { enabled: source.enabled === true, slot: EQUIPMENT_DROP_SLOTS.includes(source.slot) ? source.slot : 'any',
            scope: source.scope === 'all' ? 'all' : 'explicit',
            minMatches: clampNumber(Math.floor(Number(source.minMatches) || 1), 1, Math.max(1, rules.length)), rules };
    }

    function normalizeSettings(settings) {
        settings.autoSalvageEnabled = !!settings.autoSalvageEnabled;
        settings.autoSalvageRarities = { ...defaultGame.settings.autoSalvageRarities, ...settings.autoSalvageRarities };
        settings.itemFilterRarities = { ...defaultGame.settings.itemFilterRarities, ...settings.itemFilterRarities };
        settings.itemFilterMinHiddenTier = clampNumber(Math.floor(Number(settings.itemFilterMinHiddenTier) || 1), 1, 20);
        settings.itemFilterTierThreshold = clampNumber(Math.floor(Number(settings.itemFilterTierThreshold) || 10), 1, 20);
        settings.itemFilterMinTierCount = clampNumber(Math.floor(Number(settings.itemFilterMinTierCount) || 0), 0, 6);
        settings.equipmentTargets = normalizeTargets(settings.equipmentTargets);
    }

    function targetStats(item, scope) {
        let stats = item.stats || [];
        if (scope === 'all') stats = stats.concat(item.baseStats || [], item.underEnchant || []);
        return stats.filter(Boolean).flatMap(stat => [stat,
            ...(stat.extraStats || []).map(extra => ({ ...extra, tier: stat.tier }))]);
    }

    /** A rule matches one option line (including compound extras), never a sum of separate lines. */
    function matches(item, targetGame = game) {
        const filter = targetGame.settings && targetGame.settings.equipmentTargets;
        if (!filter || !filter.enabled || !filter.rules.length || !item) return false;
        if (filter.slot !== 'any' && filter.slot !== item.slot) return false;
        const stats = targetStats(item, filter.scope);
        return filter.rules.filter(rule => stats.some(stat => stat.id === rule.statId
            && Number(stat.val) >= rule.minValue && Number(stat.tier || 0) >= rule.minTier)).length >= filter.minMatches;
    }

    function highlight(item, targetGame = game) {
        if (item.rarity === 'unique' && (targetGame.uniqueHuntTargets || []).includes(getUniqueCodexKeyByItem(item))) return { reason: '목표 고유 획득', color: '#7fffd2', priority: 3 };
        if (matches(item, targetGame)) return { reason: '목표 옵션 일치', color: '#7fffd2', priority: 3 };
        if (item.rarity === 'unique') return { reason: '고유 장비 획득', color: '#ffbb69', priority: 2 };
        if (item.exceptionalBase) return { reason: '특출 베이스 발견', color: '#f3d779', priority: 1 };
        return null;
    }

    function ownedItems(state) {
        const equipped = getEquipmentLoadoutOwnedItems(state);
        const stash = state.offlineProgress || {};
        return [...new Set(equipped.concat(stash.stash || [], stash.protectedOverflow || []))];
    }

    /** Retained new items only, including equipped/stashed rewards; no invented score or new persistent log. */
    function collectHighlights(before, after) {
        const beforeIds = new Set(ownedItems(before).map(item => String(item.id)));
        const seen = new Set();
        const rows = [];
        for (const item of ownedItems(after)) {
            const id = String(item.id);
            if (beforeIds.has(id) || seen.has(id)) continue;
            seen.add(id);
            const info = highlight(item, before);
            if (!info) continue;
            const inStash = (after.offlineProgress?.stash || []).includes(item);
            rows.push({ id: item.id, name: item.name, rarity: item.rarity, slot: item.slot, location: inStash ? '방치 보관함' : '장비창', ...info });
        }
        rows.sort((a, b) => b.priority - a.priority);
        return { items: rows.slice(0, 5), total: rows.length };
    }

    const equipmentLootPolicy = Object.freeze({ statOptions, normalizeTargets, normalizeSettings, matches, highlight, collectHighlights });
    safeExposeGlobals({ equipmentLootPolicy });
})();
