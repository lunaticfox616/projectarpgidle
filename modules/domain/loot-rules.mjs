import { getAdditiveDropBonusMultiplier } from '../common/numbers.mjs';

/** Drop planning only. State and tables are explicit; generation/id allocation remain injected item-domain owners. */
class LootRules {
    constructor(tables, deps) {
        this.tables = tables; this.deps = deps;
        this.codexKeys = new Set(tables.UNIQUE_DB.filter(entry => !entry.realmCodexOnly).map(entry => `${entry.slots[0]}|${entry.name}`));
    }
    getCodexBonusPct(state) {
        if (!this.deps.isUnlocked('codex', state)) return 0;
        return this.getCodexBonusPctFromCount(this.getUniqueCodexProgress(state).stored);
    }
    getUniqueCodexProgress(state) {
        let codex = (state.uniqueCodex && typeof state.uniqueCodex === 'object') ? state.uniqueCodex : {};
        let stored = Object.keys(codex).filter(key => !!codex[key] && this.codexKeys.has(key)).length;
        return { stored: stored, total: this.codexKeys.size };
    }
    claimCodexCompletion(state) {
        const progress = this.getUniqueCodexProgress(state);
        if (progress.total <= 0 || progress.stored < progress.total || state.uniqueCodexCompletedRewardClaimed) return false;
        state.uniqueCodexCompletedRewardClaimed = true;
        return true;
    }
    /** Called once by loop settlement, after the carried inventory has been restored. */
    grantCodexStarter(state) {
        if (!state.uniqueCodexCompletedRewardClaimed) return null;
        const pool = this.tables.UNIQUE_DB.filter(entry => (entry.reqTier || 1) <= 1 && !entry.ultraRare && !entry.dropOnly);
        if (!pool.length) return null;
        const pick = this.deps.rndChoice(pool);
        const item = this.deps.generateUniqueItem(1, null, pick.name, {});
        if (!this.deps.canStoreEquipmentItems([item], state)) return null;
        state.inventory.push(this.deps.normalizeItem(item));
        return { item, pick };
    }
    getCodexBonusPctFromCount(storedCount) {
        let count = Math.max(0, Math.floor(Number(storedCount) || 0));
        let preSoftCap = Math.min(50, count) * 0.2;
        let postSoftCap = Math.max(0, count - 50) * 0.1;
        return preSoftCap + postSoftCap;
    }
    getWildTalismanBaseDropChance(enemy) {
        if (enemy && enemy.isBoss) return this.tables.TALISMAN_WILD_DROPS.chance.boss;
        return enemy && enemy.isElite ? this.tables.TALISMAN_WILD_DROPS.chance.elite : this.tables.TALISMAN_WILD_DROPS.chance.normal;
    }
    getEquipmentBaseDropChance(enemy) {
        if (enemy && enemy.isBoss) return this.tables.EQUIPMENT_BASE_DROP_CHANCES.boss;
        return enemy && enemy.isElite ? this.tables.EQUIPMENT_BASE_DROP_CHANCES.elite : this.tables.EQUIPMENT_BASE_DROP_CHANCES.regular;
    }
    isFirstActBossEquipmentDropThisLoop(state, zone, enemy) {
        if (!zone || zone.type !== 'act' || !enemy || !enemy.isBoss) return false;
        return String(zone.id) === String(Math.max(0, Math.floor(Number(state.maxZoneId) || 0)));
    }
    getLabyrinthFossilDropChances(floor, fossilDropMultiplier, fossilRareMultiplier) {
        let currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
        let commonMul = Math.max(0, Number(fossilDropMultiplier) || 0);
        // LABYRINTH_DEEP_FOSSIL: 원시와 고대가 상한에 닿은 뒤로는 심연 화석이 층마다 더 자주 나온다.
        let deepMul = 1 + Math.max(0, currentFloor - this.tables.LABYRINTH_DEEP_FOSSIL.fromFloor) * this.tables.LABYRINTH_DEEP_FOSSIL.abyssalPerFloor;
        let rareMul = Math.max(0, Number(fossilRareMultiplier) || 0) * deepMul;
        return {
            base: 0.5 * commonMul * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
            typed: 0.5 * commonMul * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
            primal: Math.min(0.45, (0.10 + currentFloor * 0.003) * commonMul) * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
            ancient: Math.min(0.14, (0.025 + currentFloor * 0.001) * commonMul) * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
            abyssal: 0.03 * rareMul * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER
        };
    }
    getEnemyLootDropMultiplier(state, zone, enemy) {
        let progression = getAdditiveDropBonusMultiplier(this.getCodexBonusPct(state));
        let raw = progression * this.deps.getAbyssMonsterScales(zone).dropMul * (Number(enemy.dropMul) || 1) * (Number(enemy.greedDropMul) || 1);   // greedDropMul: 탐욕의 광기(js/combat-kill-rewards.js rollLootForEnemy)
        return this.deps.capEndlessContentDropMultiplier(zone, raw) * this.deps.getContentDropRateMultiplier(zone);
    }
    getEquipmentDropChances(state, zone, enemy) {
        let multiplier = this.getEnemyLootDropMultiplier(state, zone, enemy);
        if (zone.type === 'labyrinth') {
            let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
            let progress = Math.min(1, Math.max(0, (floor - 30) / 170));
            multiplier *= 1 - 0.7 * progress;
        }
        return {
            equipment: this.isFirstActBossEquipmentDropThisLoop(state, zone, enemy) ? 1 : this.getEquipmentBaseDropChance(enemy) * multiplier * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level, 'equipment')
                * (Number(enemy.equipmentDropMul) || 1),
            talisman: this.getWildTalismanBaseDropChance(enemy) * multiplier * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level)
        };
    }
    rollEquipmentDrop(state, zone, enemy, chance) {
        let rank = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'regular');
        let progress = state.equipmentDropProgress + this.tables.EQUIPMENT_DROUGHT_RULES.credit[rank] * this.deps.getContentDropRateMultiplier(zone) * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level, 'equipment');
        let guaranteed = progress >= this.tables.EQUIPMENT_DROUGHT_RULES.threshold;
        const expected = Math.max(0, Number(chance) || 0), whole = Math.floor(expected);
        const count = Math.max(guaranteed ? 1 : 0, whole + Number(this.deps.random() < expected - whole));
        let minimumRarity = guaranteed ? 'rare' : null;
        return { dropped: count > 0, count, guaranteed, minimumRarity, nextProgress: count > 0 ? 0 : progress };
    }
    getEquipmentDropRarity(enemy, roll) {
        let rank = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'regular');
        let thresholds = this.tables.EQUIPMENT_DROP_RARITY_THRESHOLDS[rank];
        let scaled = roll / Math.max(1, Number(enemy.lootRarityMul) || 1);
        if (scaled < thresholds.unique * Math.max(1, Number(enemy.uniqueChanceMul) || 1)) return 'unique';
        return ['rare', 'magic'].find(rarity => scaled < thresholds[rarity]) || 'normal';
    }
    generateRealmBossUniqueDrop(state, zone, enemy) {
        const baseChance = enemy.isBoss ? this.tables.REALM_BOSS_UNIQUE_DROP_RULES.chance[zone.type] : 0;
        if (!baseChance) return null;
        const chance = baseChance * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level);
        if (this.deps.random() >= chance) return null;
        const itemLevel = this.deps.levelProgression.itemLevel(zone, enemy);
        const cap = Math.min(this.deps.getRealmEquipmentHiddenTierCap(zone), this.deps.levelProgression.maxDropTier(itemLevel));
        const eligible = this.tables.UNIQUE_DB.filter(unique => unique.dropOnly?.type === zone.type && this.deps.uniqueDropsInZone(unique, zone)
            && cap >= (unique.dropOnly.minTier || unique.reqTier || 1));
        const chase = eligible.filter(unique => unique.ultraRare);
        const useChase = chase.length > 0 && this.deps.random() < this.tables.REALM_BOSS_UNIQUE_DROP_RULES.ultraRareShare;
        const pool = useChase ? chase : eligible.filter(unique => !unique.ultraRare);
        if (!pool.length) return null;
        const item = this.deps.generateUniqueItem(cap, null, this.deps.rndChoice(pool).name, zone);
        return this.deps.levelProgression.stampItem(item, itemLevel);
    }
    getMappingTicketDrops(state, enemy, zone, mappingOpened) {
        let drops = [];
        if (!mappingOpened || !zone || ['trial', 'seasonBoss'].includes(zone.type)) return drops;
        let contentDropMul = this.deps.getContentDropRateMultiplier(zone);
        const key = this.mappingBossKey(state, enemy, contentDropMul);
        if (key) drops.push([key, 1]);
        if (!this.highTrialUnlocked(state)) return drops;
        let trialKeyChance = enemy.isBoss ? 0.015 : (enemy.isElite ? 0.001 : 0);
        // Retry access uses a fixed chance, independent of the underworld loot reduction.
        if (trialKeyChance > 0 && this.deps.random() < trialKeyChance) drops.push(['trialKey3', 1]);
        return drops;
    }
    mappingBossKey(state, enemy, multiplier) {
        if ((state.season || 1) < 2) return null;
        const keys = ['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm'];
        if (enemy.isBoss && this.deps.random() < 0.044 * multiplier) return this.deps.rndChoice(keys);
        if (enemy.isElite && this.deps.random() < 0.01 * multiplier) return this.deps.rndChoice(keys);
        return null;
    }
    highTrialUnlocked(state) {
        return ['trial_3', 'trial_4'].some(key => (state.unlockedTrials || []).includes(key)
            || (state.completedTrials || []).includes(key));
    }
    getUnderworldResourceDropChances(enemy) {
        if (enemy && enemy.isBoss) {
            return { fossil: 0.11, typedFossil: 0.0375, tool: 0.025, rune: 0.18, core: 0.01, ...this.tables.UNDERWORLD_ORE_DROP_CHANCES };
        }
        if (enemy && enemy.isElite) {
            return { fossil: 0.0125, typedFossil: 0.003, tool: 0.0025, rune: 0.008, core: 0.0005, ...this.tables.UNDERWORLD_ORE_DROP_CHANCES };
        }
        return { fossil: 0.0025, typedFossil: 0.0006, tool: 0.0005, rune: 0.0015, core: 0.00005, ...this.tables.UNDERWORLD_ORE_DROP_CHANCES };
    }
}
export const createLootRules = (tables, deps) => new LootRules(tables, deps);
