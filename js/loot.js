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

function getWildTalismanBaseDropChance(enemy) {
    if (enemy && enemy.isBoss) return TALISMAN_WILD_DROPS.chance.boss;
    return enemy && enemy.isElite ? TALISMAN_WILD_DROPS.chance.elite : TALISMAN_WILD_DROPS.chance.normal;
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

/** One capped multiplier for equipment, wild talismans and bonus currency rolls. */
function getEnemyLootDropMultiplier(zone, enemy) {
    let progression = getAdditiveDropBonusMultiplier(getCodexBonusPct());
    let raw = progression * getAbyssMonsterScales(zone).dropMul * (Number(enemy.dropMul) || 1);
    return capEndlessContentDropMultiplier(zone, raw) * getContentDropRateMultiplier(zone);
}

/** Independent base chances share bonuses without deriving talisman drops from equipment. */
function getEquipmentDropChances(zone, enemy) {
    let multiplier = getEnemyLootDropMultiplier(zone, enemy);
    if (zone.type === 'labyrinth') {
        let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
        let progress = Math.min(1, Math.max(0, (floor - 30) / 170));
        multiplier *= 1 - 0.7 * progress;
    }
    return {
        equipment: isFirstActBossEquipmentDropThisLoop(zone, enemy) ? 1 : getEquipmentBaseDropChance(enemy) * multiplier * levelProgression.rewardMultiplier(zone, enemy, game.level, 'equipment'),
        talisman: getWildTalismanBaseDropChance(enemy) * multiplier * levelProgression.rewardMultiplier(zone, enemy, game.level)
    };
}

/**
 * @param {{type:string}} zone
 * @param {{isBoss?:boolean,isElite?:boolean}} enemy
 * @param {number} chance Expected equipment count of the kill: the whole part drops for sure, the fraction is one more roll.
 * @returns {{dropped:boolean,count:number,guaranteed:boolean,minimumRarity:string|null,nextProgress:number}}
 * Read-only planning; commit after generation and the inventory's pickup/salvage policy finish. minimumRarity applies to the
 * first item only (the drought guarantee).
 */
function rollEquipmentDrop(zone, enemy, chance) {
    let rank = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'regular');
    let progress = game.equipmentDropProgress + EQUIPMENT_DROUGHT_RULES.credit[rank] * getContentDropRateMultiplier(zone) * levelProgression.rewardMultiplier(zone, enemy, game.level, 'equipment');
    let guaranteed = progress >= EQUIPMENT_DROUGHT_RULES.threshold;
    const expected = Math.max(0, Number(chance) || 0), whole = Math.floor(expected);
    const count = Math.max(guaranteed ? 1 : 0, whole + Number(Math.random() < expected - whole));
    let minimumRarity = guaranteed ? 'rare' : null;
    return { dropped: count > 0, count, guaranteed, minimumRarity, nextProgress: count > 0 ? 0 : progress };
}

/** Roll thresholds stay independent of minimum-rarity rewards and inventory filtering. An atlas map's item rarity
 * (enemy.lootRarityMul, js/atlas-maps.js) scales the roll down, so every rarer outcome grows by the same factor. */
function getEquipmentDropRarity(enemy, roll) {
    let rank = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'regular');
    let thresholds = EQUIPMENT_DROP_RARITY_THRESHOLDS[rank];
    let scaled = roll / Math.max(1, Number(enemy.lootRarityMul) || 1);
    return ['unique', 'rare', 'magic'].find(rarity => scaled < thresholds[rarity]) || 'normal';
}

/** Extra realm-boss reward. Generate only; combat commits pickup, codex and visual feedback. */
function generateRealmBossUniqueDrop(zone, enemy) {
    if (!enemy.isBoss || !['chaosRealm', 'underworld', 'cosmos'].includes(zone.type)) return null;
    const chance = REALM_BOSS_UNIQUE_DROP_RULES.chance * levelProgression.rewardMultiplier(zone, enemy, game.level);
    if (Math.random() >= chance) return null;
    const itemLevel = levelProgression.itemLevel(zone, enemy);
    const cap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
    const eligible = UNIQUE_DB.filter(unique => unique.dropOnly?.type === zone.type
        && cap >= (unique.dropOnly.minTier || unique.reqTier || 1));
    const chase = eligible.filter(unique => unique.ultraRare);
    const useChase = chase.length > 0 && Math.random() < REALM_BOSS_UNIQUE_DROP_RULES.ultraRareShare;
    const pool = useChase ? chase : eligible.filter(unique => !unique.ultraRare);
    if (!pool.length) return null;
    const item = generateUniqueItem(cap, null, rndChoice(pool).name, zone);
    return levelProgression.stampItem(item, itemLevel);
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
    // Retry access uses a fixed chance, independent of the underworld loot reduction.
    if (trialKeyChance > 0 && Math.random() < trialKeyChance) drops.push(['trialKey3', 1]);
    return drops;
}

// Classic-script consumers: combat owns committing rewards; this module owns their rules.
safeExposeGlobals({ getEnemyLootDropMultiplier, getEquipmentDropChances, rollEquipmentDrop, getEquipmentDropRarity });


function getUnderworldResourceDropChances(enemy) {
    if (enemy && enemy.isBoss) {
        return { fossil: 0.11, typedFossil: 0.0375, tool: 0.025, rune: 0.18, core: 0.01, ...UNDERWORLD_ORE_DROP_CHANCES };
    }
    if (enemy && enemy.isElite) {
        return { fossil: 0.0125, typedFossil: 0.003, tool: 0.0025, rune: 0.008, core: 0.0005, ...UNDERWORLD_ORE_DROP_CHANCES };
    }
    return { fossil: 0.0025, typedFossil: 0.0006, tool: 0.0005, rune: 0.0015, core: 0.00005, ...UNDERWORLD_ORE_DROP_CHANCES };
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

/** Content kills: the ember pack's branches (잿불 터, js/ember-corruption.js), the sap pack's catalysts (수액 상처, js/sap-catalysts.js),
 * then the content bosses' extras. */
function getContentKillCurrencyDrops(zone, enemy, abyssScale) {
    const embers = typeof emberCorruption === 'object' ? emberCorruption.killDrops(enemy) : [];
    const catalysts = typeof sapCatalysts === 'object' ? sapCatalysts.killDrops(enemy) : [];
    return [...embers, ...catalysts, ...getContentBossCurrencyDrops(zone, enemy, abyssScale)];
}

/** A deep abyss boss's jewel shards and a season boss's core. */
function getContentBossCurrencyDrops(zone, enemy, abyssScale) {
    const drops = [];
    if (enemy.isBoss && zone.type === 'abyss' && Math.random() < (abyssScale.bossExtraCurrencyChance || 0)) drops.push(['jewelShard', 2]);
    if ((game.season || 1) >= 2 && zone.type === 'seasonBoss' && enemy.isBoss && Math.random() < 0.22) drops.push(['bossCore', 1]);
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
        // Core and uber entry tickets are exempt from the underworld loot reduction.
        let coreKeyChance = enemy.isBoss ? 0.015 : (enemy.isElite ? 0.003 : 0.0006);
        if (Math.random() < coreKeyChance) drops.push(['coreKey', 1]);
        if (Math.random() < resourceChance.fossil) drops.push(['fossil', 1]);
        if (Math.random() < resourceChance.typedFossil) drops.push([rndChoice(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']), 1]);
        if (Math.random() < resourceChance.tool) drops.push([rndChoice(['deepWhetstone', 'rootIron', 'jewelPolish']), 1]);
        if (underFloor >= 10 && Math.random() < resourceChance.rune) drops.push(['runeShard', enemy.isBoss ? 2 : 1]);
        if (coreItems.canDrop() && Math.random() < resourceChance.core) drops.push(['core', 1]);
        if (Math.random() < resourceChance.copper) drops.push(['underCopper', 1]);
        if (Math.random() < resourceChance.silver) drops.push(['underSilver', 1]);
        if (Math.random() < resourceChance.gold) drops.push(['underGold', 1]);
        if (enemy.isBoss && Math.random() < 0.0025) drops.push([rndChoice(['uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']), 1]);
    }
    drops.push(...getContentKillCurrencyDrops(zone, enemy, abyssScale));
    return levelProgression.filterCurrencyDrops(drops, levelProgression.rewardMultiplier(zone, enemy, game.level))
        .filter(([key]) => contentProgression.canDropCurrency(key));
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

    /** Affix tags a rule can count (data/affix-tags.js), in table order. */
    function tagOptions() {
        return Object.entries(AFFIX_TAG_LABELS).map(([id, name]) => ({ id, name }));
    }

    /** One option line ({statId, minValue, minTier}) or a count of lines carrying a tag ({tag, minCount, minTier}). */
    function normalizeRule(rule, validIds) {
        if (!rule || !Number.isFinite(rule.minTier)) return null;
        const minTier = clampNumber(Math.floor(Number(rule.minTier)), 0, 20);
        if (typeof rule.tag === 'string') {
            return AFFIX_TAG_LABELS[rule.tag] && Number.isFinite(rule.minCount)
                ? { tag: rule.tag, minCount: clampNumber(Math.floor(Number(rule.minCount)), 1, 6), minTier } : null;
        }
        return validIds.has(rule.statId) && Number.isFinite(rule.minValue) ? { statId: rule.statId, minValue: Math.max(0, Number(rule.minValue)), minTier } : null;
    }

    function ruleKey(rule) {
        return rule.tag ? 'tag:' + rule.tag : rule.statId;
    }

    /** Normalize external save/UI input; invalid rows cannot become broad keep rules. */
    function normalizeTargets(input) {
        const source = input && typeof input === 'object' ? input : {};
        const validIds = new Set(statOptions().map(stat => stat.id));
        const seen = new Set();
        const rules = (Array.isArray(source.rules) ? source.rules : []).map(rule => normalizeRule(rule, validIds)).filter(rule => {
            if (!rule || seen.has(ruleKey(rule))) return false;
            seen.add(ruleKey(rule));
            return true;
        }).slice(0, 6);
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

    /** The pickup settings a quick preset sets (data/items.js ITEM_PICKUP_PRESETS), the late one relative to the zone's tier cap. */
    function pickupPreset(key, zone) {
        const preset = ITEM_PICKUP_PRESETS[key];
        if (!preset) return null;
        const tierFloor = preset.tierBelowZoneCap ? Math.max(1, getZoneEquipmentTierCap(zone) - preset.tierBelowZoneCap) : 1;
        return { itemFilterEnabled: true, itemFilterRarities: { ...preset.rarities }, itemFilterMinHiddenTier: tierFloor, itemFilterMinTierCount: 0,
            itemFilterOnlyNewCodexUnique: !!preset.onlyNewCodexUnique };
    }

    function targetLines(item, scope) {
        const stats = item.stats || [];
        return (scope === 'all' ? stats.concat(item.baseStats || [], item.underEnchant || []) : stats).filter(Boolean);
    }

    /** Lines with their compound extras as their own entries (an extra keeps its line's tier). */
    function targetStats(lines) {
        return lines.flatMap(stat => [stat, ...(stat.extraStats || []).map(extra => ({ ...extra, tier: stat.tier }))]);
    }

    /** One line meets a rule at its tier: the option and value, or for a tag rule a line carrying the tag. */
    function lineMatchesRule(stat, rule) {
        if (!stat || Number(stat.tier || 0) < rule.minTier) return false;
        return rule.tag ? getAffixTags(stat).includes(rule.tag) : stat.id === rule.statId && Number(stat.val) >= rule.minValue;
    }

    /** An option rule needs one line (compound extras included), never a sum of lines; a tag rule counts whole lines. */
    function ruleMet(rule, lines, expanded) {
        return rule.tag ? lines.filter(line => lineMatchesRule(line, rule)).length >= rule.minCount : expanded.some(stat => lineMatchesRule(stat, rule));
    }

    function matches(item, targetGame = game) {
        const filter = targetGame.settings && targetGame.settings.equipmentTargets;
        if (!filter || !filter.enabled || !filter.rules.length || !item) return false;
        if (filter.slot !== 'any' && filter.slot !== item.slot) return false;
        const lines = targetLines(item, filter.scope), expanded = targetStats(lines);
        return filter.rules.filter(rule => ruleMet(rule, lines, expanded)).length >= filter.minMatches;
    }

    function highlight(item, targetGame = game) {
        if (item.rarity === 'unique' && (targetGame.uniqueHuntTargets || []).includes(getUniqueCodexKeyByItem(item))) return { reason: '목표 고유 획득', color: '#7fffd2', priority: 3 };
        if (matches(item, targetGame)) return { reason: '목표 옵션 일치', color: '#7fffd2', priority: 3 };
        if (item.rarity === 'unique') return { reason: '고유 장비 획득', color: '#ffbb69', priority: 2 };
        if (item.exceptionalBase) return { reason: '특출 베이스 발견', color: '#f3d779', priority: 1 };
        if (item.corrupted) return { reason: '타락 장비 발견', color: '#e7685c', priority: 1 };
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
            const worn = Object.values(after.equipment || {}).includes(item); // 빈 칸에 자동으로 입었다(검토 6차)
            rows.push({ id: item.id, name: item.name, rarity: item.rarity, slot: item.slot, location: inStash ? '방치 보관함' : worn ? '자동 착용' : '장비창', ...info });
        }
        rows.sort((a, b) => b.priority - a.priority);
        return { items: rows.slice(0, 5), total: rows.length };
    }

    const equipmentLootPolicy = Object.freeze({ statOptions, tagOptions, ruleKey, normalizeTargets, normalizeSettings, pickupPreset, lineMatchesRule, matches,
        highlight, collectHighlights });
    safeExposeGlobals({ equipmentLootPolicy });
})();

// 장비 드랍 변형(2026-10-05 사용자 요청, data/items.js EQUIPMENT_DROP_VARIANTS): 떨어진 장비 한 개를 복제 · 같은 베이스 묶음 ·
// 타락(제작 불가 대신 추가 옵션 강화) 목록으로 바꾼다. 몬스터 드랍(combat.js rollEquipmentLoot)과 탐험 상자가 같은 추첨을 쓴다.
(function () {
    'use strict';

    function explicitLines(item) {
        return (item.stats || []).filter(stat => stat && !stat.fixedValue && Number(stat.val) > 0);
    }

    function sameRange(range, stat) {
        return Math.abs(range.min - Number(stat.valMin)) < 1e-9 && Math.abs(range.max - Number(stat.valMax)) < 1e-9;
    }

    /** The MOD_DB row (or compound sub-stat) a rolled line came from; null when it cannot be told apart. */
    function lineMod(stat) {
        if (stat.sourceModId) return MOD_DB.find(mod => mod.id === stat.sourceModId) || null;
        return MOD_DB.find(mod => (mod.statId || mod.id) === stat.id && !mod.tierValues
            && [false, true].some(round => sameRange(getAffixTierRange(mod, stat.id, stat.tier, round), stat))) || null;
    }

    /**
     * The corrupted value of one line (2026-10-05 user decision A): × corruptedBoost on the line's own value step, at least one
     * step when that step is at most 30% of the value (a gem level never jumps 1 → 2), and never above the line's maximum at the
     * item's affix tier cap — a corrupted item may read like a higher tier, never like an item level it could not drop at.
     * @returns {number} the new value; the old one when it cannot grow
     */
    function corruptedValue(item, stat, mod) {
        const value = Number(stat.val), boost = EQUIPMENT_DROP_VARIANTS.corruptedBoost;
        const own = getAffixTierRange(mod, stat.id, stat.tier), step = Number(stat.valueStep) || own.step;
        const capTier = Math.max(Number(stat.tier) || 1, Math.floor(Number(item.affixTierCap) || 1));
        const cap = Math.max(Number(stat.valMax) || value, getAffixTierRange(mod, stat.id, capTier).max);
        let next = Math.floor(value * boost / step + 1e-9) * step;
        if (next <= value && step <= value * 0.3) next = value + step;
        next = Number(Math.min(next, cap).toFixed(2));
        return next > value ? next : value;
    }

    /** Every [line, new value] a corruption would apply; empty when no line can grow. */
    function corruptionPlan(item) {
        return explicitLines(item).flatMap(stat => {
            const mod = lineMod(stat);
            if (!mod) return [];
            const extras = (stat.extraStats || []).filter(extra => Number(extra.val) > 0).map(extra => {
                const sub = (mod.compound || []).find(row => (row.statId || row.id) === extra.id);
                return sub ? [extra, corruptedValue(item, extra, sub)] : [extra, Number(extra.val)];
            });
            return [[stat, corruptedValue(item, stat, mod)], ...extras];
        }).filter(([line, next]) => next > Number(line.val));
    }

    /** One draw per dropped item. Null before fromLoop, for uniques and already corrupted items; a corrupted roll on an item
     * whose explicit lines cannot grow (none, or all at the cap) drops as it is. scale multiplies every chance (better chests). */
    function pick(item, roll, scale) {
        const rules = EQUIPMENT_DROP_VARIANTS;
        if (!item || item.rarity === 'unique' || item.corrupted || (Number(game.season) || 1) < rules.fromLoop) return null;
        let edge = 0;
        for (const [kind, chance] of rules.odds) {
            edge += chance * scale;
            if (roll < edge) return kind === 'corrupted' && !corruptionPlan(item).length ? null : kind;
        }
        return null;
    }

    function corrupt(item) {
        corruptionPlan(item).forEach(([line, next]) => { line.val = next; });
        item.corrupted = true;
        return [item];
    }

    function duplicate(item) {
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = ++itemIdCounter;
        return [item, copy];
    }

    /** Same base, same rarity and level; each extra rolls its own explicit lines. */
    function bundle(item, rng) {
        const base = BASE_ITEM_DB.find(row => row.id === item.baseId);
        if (!base) return [item];
        const { min, max } = EQUIPMENT_DROP_VARIANTS.bundle;
        const extra = min + Math.floor(rng() * (max - min + 1));
        const origin = { dropRealm: item.dropRealm, affixTierCap: item.affixTierCap,
            affixTierFloor: getDroppedAffixTierRange(item.affixTierCap).min, tierWeightFalloff: DROPPED_AFFIX_TIER_WEIGHT_FALLOFF };
        const extras = Array.from({ length: extra }, () => levelProgression.stampItem(createItemFromBase(base, item.rarity, item.itemTier, origin), item.itemLevel));
        return [item, ...extras];
    }

    /**
     * @param {object} item a freshly generated drop (corrupted in place when that variant is drawn)
     * @param {{rng?: function(): number, scale?: number}} [options] rng in [0,1); scale multiplies the variant chances
     * @returns {{kind: 'duplicate'|'bundle'|'corrupted'|null, items: object[]}} the original item first
     */
    function expand(item, options = {}) {
        const rng = options.rng || Math.random;
        const kind = pick(item, rng(), Math.max(0, Number(options.scale) || 1));
        if (!kind) return { kind: null, items: [item] };
        const items = kind === 'corrupted' ? corrupt(item) : kind === 'duplicate' ? duplicate(item) : bundle(item, rng);
        // js/currency-acquisition-ui.js names the variant in the loot log.
        dispatchRuntimeEvent('equipment-drop-variant', { kind, items });
        return { kind, items };
    }

    const equipmentDropVariants = Object.freeze({ expand });
    safeExposeGlobals({ equipmentDropVariants });
})();
