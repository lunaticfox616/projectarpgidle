/** Currency rolls retain table order, gated RNG consumption and the final level/unlock filter. */
class CurrencyDropRules {
    constructor(tables, deps, rules) {
        this.tables = tables; this.deps = deps; this.rules = rules;
        this.loopRules = Object.freeze([
            [4, enemy => enemy.isSky, () => 0.35, 'skyEssence', 1],
            [5, enemy => enemy.isBoss, mul => 0.16 * mul, 'emberBranch', 1],
            [5, enemy => enemy.isBoss, mul => 0.03 * mul, 'jewelShard', 3],
            [5, enemy => enemy.isElite, mul => 0.008 * mul, 'jewelShard', 1],
            [6, (enemy, zone) => zone.type === 'labyrinth', () => 0.018, 'sealShard', 1],
            [6, (enemy, zone) => zone.type === 'labyrinth', () => 0.005, 'strongSealShard', 1],
            [6, (enemy, zone) => zone.type === 'labyrinth' && Math.floor(zone.floor || 0) >= 30, () => 0.00052, 'radiantSealShard', 1],
            [6, enemy => enemy.isBoss, mul => 0.018 * mul, 'blessing', 1],
            [6, enemy => enemy.isElite, mul => 0.004 * mul, 'blessing', 1],
            [6, (enemy, zone) => enemy.isBoss && zone.type === 'abyss' && Number(zone.id) >= 19, () => 0.0125, 'beastKeyCerberus', 1],
            // 버려진 날붙이 도전권 (루프 31+): 심층 콘텐츠 보스가 드랍한다. 루프당 결투 6회(다섯 날 + 완성작)를 노린 넉넉한 확률.
            [31, (enemy, zone) => enemy.isBoss && this.isDeepRivalKeyZone(zone), mul => 0.10 * mul, 'rivalKey', 1],
            // 잔향체 아스트라 도전권 (루프 31+): 우주계 은하 보스(planet-45~49)가 드랍한다.
            [31, (enemy, zone) => enemy.isBoss && zone.type === 'cosmos', () => 0.15, 'cosmosSovereignKey', 1]
        ]);
        this.underworldRules = Object.freeze([
            { chance: (rc, enemy) => (enemy.isBoss ? 0.015 : (enemy.isElite ? 0.003 : 0.0006)), drop: () => ['coreKey', 1] },
            { chance: rc => rc.fossil, drop: () => ['fossil', 1] },
            { chance: rc => rc.typedFossil, drop: () => [this.deps.rndChoice(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']), 1] },
            { chance: rc => rc.tool, drop: () => [this.deps.rndChoice(['deepWhetstone', 'rootIron', 'jewelPolish']), 1] },
            { when: (enemy, floor) => floor >= 10, chance: rc => rc.rune, drop: enemy => ['runeShard', enemy.isBoss ? 2 : 1] },
            { when: (enemy, floor, state) => this.deps.coreItems.canDrop(state), chance: rc => rc.core, drop: () => ['core', 1] },
            { chance: rc => rc.copper, drop: () => ['underCopper', 1] },
            { chance: rc => rc.silver, drop: () => ['underSilver', 1] },
            { chance: rc => rc.gold, drop: () => ['underGold', 1] },
            { when: enemy => enemy.isBoss, chance: () => 0.0025, drop: () => [this.deps.rndChoice(['uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']), 1] }
        ]);
    }
    getBasicCurrencyDrops(enemy, bonusRoll) {
        if (enemy.isBoss) return Object.entries(this.tables.BASIC_CURRENCY_DROP_CHANCES.boss)
            .filter(([, chance]) => bonusRoll(chance)).map(([key]) => [key, 1]);
        let drops = [];
        if (enemy.isElite) {
            if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.elite.mixed)) {
                drops.push([this.deps.random() < 0.9 ? 'magicBud' : 'formlessDew', 1]);
            }
            if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.elite.sapBud)) drops.push(['sapBud', 1]);
            if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.elite.formlessDew)) drops.push(['formlessDew', 1]);
        } else if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.regular.mixed)) {
            drops.push([[ 'magicBud', 'magicBud', 'magicBud', 'magicBud', 'blightSpore' ][Math.floor(this.deps.random() * 5)], 1]);
        }
        return drops;
    }
    getContentKillCurrencyDrops(state, zone, enemy, abyssScale) {
        const embers = this.deps.emberDrops(enemy);
        const catalysts = this.deps.sapDrops(enemy);
        const oils = this.deps.oilDrops(enemy);
        return [...embers, ...catalysts, ...oils, ...this.getContentBossCurrencyDrops(state, zone, enemy, abyssScale)];
    }
    getContentBossCurrencyDrops(state, zone, enemy, abyssScale) {
        const drops = [];
        if (enemy.isBoss && zone.type === 'abyss' && this.deps.random() < (abyssScale.bossExtraCurrencyChance || 0)) drops.push(['jewelShard', 2]);
        if ((state.season || 1) >= 2 && zone.type === 'seasonBoss' && enemy.isBoss && this.deps.random() < 0.22) drops.push(['bossCore', 1]);
        return drops;
    }
    getCurrencyDrops(state, enemy) {
        let zone = this.deps.getZone(state.currentZoneId) || this.deps.getZone(0);
        let abyssScale = this.deps.getAbyssMonsterScales(zone);
        let contentDropMul = this.deps.getContentDropRateMultiplier(zone);
        let dropMultiplier = this.rules.getEnemyLootDropMultiplier(state, zone, enemy);
        let bonusRoll = chance => this.deps.random() < Math.min(0.95, chance * dropMultiplier);
        let drops = this.getBasicCurrencyDrops(enemy, bonusRoll);
        drops.push(...this.getRareOrbDrops(state, enemy, zone, bonusRoll));
        let mappingOpened = (state.maxZoneId || 0) >= this.tables.ABYSS_START_ZONE_ID;
        drops.push(...this.rules.getMappingTicketDrops(state, enemy, zone, mappingOpened));
        drops.push(...this.getCosmosCurrencyDrops(enemy, zone, bonusRoll));
        drops.push(...this.getLoopCurrencyDrops(state, enemy, zone, contentDropMul));
        if (zone.type === 'chaosRealm') {
            let chaosKeyChance = enemy.isBoss ? 0.012 : (enemy.isElite ? 0.003 : 0.0006);
            if (this.deps.random() < chaosKeyChance) drops.push(['chaosKey', 1]);
        }
        if (zone.type === 'underworld') drops.push(...this.getUnderworldCurrencyDrops(state, enemy, zone));
        drops.push(...this.getContentKillCurrencyDrops(state, zone, enemy, abyssScale));
        return this.deps.levelProgression.filterCurrencyDrops(drops, this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level))
            .filter(([key]) => this.deps.canDropCurrency(key, state));
    }
    getRareOrbDrops(state, enemy, zone, bonusRoll) {
        const drops = [];
        let divineChance = enemy.isBoss ? 0.006 : (enemy.isElite ? 0.0004 : 0.00007);
        if (bonusRoll(divineChance)) drops.push(['goldenRule', 1]);
        if (bonusRoll(divineChance / 20)) drops.push(['fairyRing', 1]);
        if (bonusRoll(divineChance * 2)) drops.push(['sapBud', 1]);
        let ouroborosChance = (divineChance / 1200) * (this.isRepeatMasterworkBoss(state, enemy, zone) ? 2.5 : 1);
        if (bonusRoll(ouroborosChance)) drops.push(['ouroboros', 1]);
        return drops;
    }
    isRepeatMasterworkBoss(state, enemy, zone) {
        return enemy.isBoss && zone.id === 'rival_masterwork'
            && Array.isArray(state.clearedRootBosses) && state.clearedRootBosses.includes(zone.id);
    }
    getCosmosCurrencyDrops(enemy, zone, bonusRoll) {
        const drops = [];
        if (zone.type === 'cosmos' && bonusRoll(enemy.isBoss ? 0.025 : (enemy.isElite ? 0.006 : 0.0015))) drops.push(['pruningShears', 1]);
        if (zone.type === 'cosmos' && enemy.isBoss && bonusRoll(0.012)) drops.push(['abyssCatalyst', 1]);
        return drops;
    }
    getLoopCurrencyDrops(state, enemy, zone, contentDropMul) {
        const loop = state.season || 1, drops = [];
        this.loopRules.forEach(([fromLoop, when, chance, key, amount]) => {
            if (loop >= fromLoop && when(enemy, zone) && this.deps.random() < chance(contentDropMul)) drops.push([key, amount]);
        });
        return drops;
    }
    isDeepRivalKeyZone(zone) {
        return zone.type === 'chaosRealm' || zone.type === 'underworld' || zone.type === 'skyTower'
            || (zone.type === 'abyss' && Math.floor(this.deps.getAbyssDepthFromZoneId(Number(zone.id)) || 0) >= 21);
    }
    getUnderworldCurrencyDrops(state, enemy, zone) {
        let underFloor = Math.max(1, Math.floor(zone.floor || 1));
        let resourceChance = this.rules.getUnderworldResourceDropChances(enemy);
        const drops = [];
        this.underworldRules.forEach(rule => {
            if ((!rule.when || rule.when(enemy, underFloor, state)) && this.deps.random() < rule.chance(resourceChance, enemy)) drops.push(rule.drop(enemy));
        });
        return drops;
    }
}
export const createCurrencyDropRules = (tables, deps, rules) => new CurrencyDropRules(tables, deps, rules);
