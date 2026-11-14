import { COSMOS_BOSS_EQUIPMENT_DROP_CHANCE, COSMOS_BOSS_JEWEL_DROP_CHANCE, COSMOS_BOSS_TALISMAN_DROP_CHANCE } from '../data/cosmos-atlas.mjs';

/** Native atlas rewards; no DOM or renderer dependency. */
export class CosmosAtlasRewards {
    constructor(deps, services) { this.deps = deps; this.rules = services.rules; this.state = services.state; this.progress = services.progress; this.graph = services.graph; this.directives = services.directives; this.stones = services.stones; }

    *forceCosmosBossDrop(spec, tier) {
            const candidates = [];
            if (Array.isArray(spec.equipment) && spec.equipment.length > 0) candidates.push('equipment');
            if (spec.jewel) candidates.push('jewel');
            if (spec.talisman) candidates.push('talisman');
            const chosen = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
            if (chosen === 'equipment') return !!(yield* this.grantCosmosBossEquipment(spec, tier, true));
            if (chosen === 'jewel') return !!(yield* this.grantCosmosBossJewel(spec, true));
            if (chosen === 'talisman') return !!(yield* this.grantCosmosBossTalisman(spec, true));
        return false;
    }

    getCosmosBossRewardSpec(node) {
        if (!node || node.tag !== 'boss') return null;
        const db = this.deps.COSMOS_BOSS_REWARD_DB || {};
        return db[node.id] || null;
    }

    createCosmosBossJewel(row) {
        if (!row) return null;
        const stats = (row.stats || []).map(stat => ({
            id: stat.id,
            val: Number(stat.val || 0),
            valMin: Number(stat.val || 0),
            valMax: Number(stat.val || 0),
            tier: 1,
            statName: typeof this.deps.getStatName === 'function' ? this.deps.getStatName(stat.id) : stat.id
        }));
        const jewel = { id: Date.now() + Math.floor(Math.random() * 100000), uniqueId: row.id, name: row.name, rarity: 'unique', uniqueEffect: row.uniqueEffect || '', source: 'cosmosBoss', stats };
        if (row.cosmosKeystoneJewel) {
            jewel.cosmosKeystoneJewel = true;
            // 드랍 시 무작위 전직 키스톤을 고정 배정한다. (균형/심판 주얼이 같은 키스톤이면 할당)
            jewel.cosmosKeystone = (typeof this.deps.pickRandomAscendKeystoneId === 'function') ? this.deps.pickRandomAscendKeystoneId() : null;
        }
        return jewel;
    }

    pickCosmosBossEquipmentName(spec) {
        const names = spec && Array.isArray(spec.equipment) ? spec.equipment : [];
        const uniqueDb = Array.isArray(this.deps.UNIQUE_DB) ? this.deps.UNIQUE_DB : [];
        const chaseNames = names.filter(name => uniqueDb.some(item => item && item.name === name && item.cosmosChase));
        const regularNames = names.filter(name => !chaseNames.includes(name));
        if (chaseNames.length > 0 && Math.random() < 0.08) {
            return chaseNames[Math.floor(Math.random() * chaseNames.length)];
        }
        const pool = regularNames.length > 0 ? regularNames : names;
        return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    }

    rollCosmosEquipmentChance(spec, force) {
        if (!spec || !Array.isArray(spec.equipment) || spec.equipment.length <= 0) return false;
        return force || Math.random() < COSMOS_BOSS_EQUIPMENT_DROP_CHANCE;
    }

    rollCosmosBossEquipment(spec, tier, force) {
        if (!this.rollCosmosEquipmentChance(spec, force)) return false;
        if (!this.deps.game || !Array.isArray(this.deps.game.inventory)) return false;
        if (typeof this.deps.generateUniqueItem !== 'function') return false;
        const uniqueName = this.pickCosmosBossEquipmentName(spec);
        const item = uniqueName ? this.deps.generateUniqueItem(Math.max(1, Math.floor(tier || 1)), null, uniqueName) : null;
        return item;
    }

    *grantCosmosBossEquipment(spec, tier, force) {
        const item = this.rollCosmosBossEquipment(spec, tier, force);
        if (!item) return false;
        if (typeof this.deps.addItemToInventory === 'function') this.deps.addItemToInventory(item, { guaranteedKeep: true });
        else this.deps.game.inventory.push(item);
        this.deps.game.noti = this.deps.game.noti || {};
        this.deps.game.noti.items = true;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('🌌 우주계 보스 전용 고유 장비 획득: {name}', { name: item.name }), 'loot-unique', { item }] });
        return true;
    }

    *grantCosmosBossJewel(spec, force) {
        if (!spec || !spec.jewel || (!force && Math.random() >= COSMOS_BOSS_JEWEL_DROP_CHANCE)) return false;
        if (!this.deps.game) return false;
        const jewel = this.createCosmosBossJewel(spec.jewel);
        if (!jewel) return false;
        return yield* this.storeCosmosBossJewel(jewel);
    }

    *storeCosmosBossJewel(jewel) {
        // 가방에(js/bag-items.js), 가방이 차면 임시 보관으로: 우주계 보스 주얼은 잃지 않는다.
        const overflow = !this.deps.bagItems.put(this.deps.bagItems.asJewel(jewel), this.deps.game);
        if (overflow) this.deps.bagItems.put(jewel, this.deps.game, true);
        this.deps.game.noti = this.deps.game.noti || {};
        this.deps.game.noti.items = true;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('💠 우주계 보스 전용 주얼 획득: {name}{value}', { name: jewel.name, value: overflow ? this.deps._t(' (공간 부족 보호)') : '' }), 'loot-unique', { item:jewel, itemKind:'jewel' }] });
        return true;
    }

    *grantCosmosBossTalisman(spec, force) {
        if (!spec || !spec.talisman || (!force && Math.random() >= COSMOS_BOSS_TALISMAN_DROP_CHANCE)) return false;
        const talisman = this.deps.stumpBox.addTalisman(this.deps.game, this.deps.talismans.fromCosmos(spec.talisman), true);
        if (!talisman) return false;
        this.deps.game.noti = this.deps.game.noti || {};
        this.deps.game.noti.stump = true;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('🧿 우주계 보스 전용 부적 획득: {name}', { name: talisman.name }), 'loot-unique'] });
        return true;
    }

    *grantCosmosBossExclusiveDrops(node) {
        const spec = this.getCosmosBossRewardSpec(node);
        if (!spec) return false;
        const tier = this.rules.getDisplayedNodeTier(node);
        const state = this.state.getState();
        const misses = Math.max(0, Math.min(39, Math.floor((state.bossExclusiveMisses || {})[node.id] || 0)));
        const force = misses >= 39;
        let granted = false;
        if (force) granted = yield* this.forceCosmosBossDrop(spec, tier);
        else {
            granted = [
                (yield* this.grantCosmosBossEquipment(spec, tier, false)),
                (yield* this.grantCosmosBossJewel(spec, false)),
                (yield* this.grantCosmosBossTalisman(spec, false))
            ].some(Boolean);
        }
        state.bossExclusiveMisses[node.id] = granted ? 0 : Math.min(39, misses + 1);
        yield* this.reportCosmosExclusiveDrop(granted, force);
        return granted;
    }

    cloneCosmosBossRelic(spec, node) {
        const galaxy = Math.max(1, Math.min(5, Math.floor(node.orbit || 1)));
        return {
            id: `${spec.id}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            relicId: spec.id,
            bossId: node.id,
            galaxy: galaxy,
            name: spec.name,
            rerollStoneOption: true
        };
    }

    tryRollBossRelic(node) {
        if (!node || node.tag !== 'boss') return null;
        const specDb = this.deps.COSMOS_BOSS_RELIC_DB || {};
        const spec = specDb[node.id];
        if (!spec) return null;
        const state = this.state.getState();
        const relicBonus = this.progress.getCosmosMasteryValue('eliteHunt') * 0.007;
        if (Math.random() >= 0.22 + relicBonus) return null;
        const relic = this.cloneCosmosBossRelic(spec, node);
        state.bossRelics.push(relic);
        return relic;
    }

    completedCosmosNode(state, nodeIdOverride) {
        const targetId = nodeIdOverride || state.selectedId || 'planet-0';
        const node = this.graph.byId.get(targetId);
        if (!node) return;
        const status = this.progress.getNodeStatus(node);
        const completedChallenge = state.activeChallenge && state.activeChallenge.nodeId === node.id;
        if (!completedChallenge || state.activeChallenge.rewardSettled) return;
        return { node, status };
    }

    *exploreSelectedCosmosNode(nodeIdOverride) {
        this.graph.buildCosmosAtlasData();
        const state = this.state.getState();
        const completed = this.completedCosmosNode(state, nodeIdOverride);
        if (!completed) return;
        const { node, status } = completed;
        const firstClear = !state.cleared.includes(node.id);
        const defeatedBossStage = node.tag === 'boss' ? this.progress.getBossStage(node) : 0;
        if (!['available', 'cleared'].includes(status)) {
            if (this.deps.canLog) (yield { kind: 'addLog', args: ['아직 별길이 연결되지 않은 우주계 노드입니다.', 'attack-monster'] });
            return;
        }
        yield* this.recordCosmosClear(state, node, status);
        const directive = this.directives.getCompletedChallengeDirective(state, node) || {};
        const { reward, jackpot, jackpotBonus } = this.calculateCosmosClearReward(node, firstClear, defeatedBossStage, directive);
        const skyPower = this.progress.grantCosmosSkyPower(reward + jackpotBonus);
        const jackpotPower = jackpot ? Math.max(1, Math.round(jackpotBonus / this.deps.COSMOS_SKY_POWER_PER_REWARD)) : 0;
        yield* this.reportCosmosClear(node, state, { directive, skyPower, jackpot, jackpotPower });
        if (jackpot && this.deps.canToast) {
            (yield { kind: 'showGameToast', args: [this.deps._t('공명 잭팟, 창공의 정수 +{jackpotPower}', { jackpotPower }), { tone: 'success', duration: 3800 }] });
        }
        if (node.tag === 'boss') (yield* this.grantCosmosBossExclusiveDrops(node));
        (yield* this.finalizeCosmosExploration(state, node, skyPower));
    }

    *reportCosmosBossClear(node, state) {
                const kills = Math.max(0, Math.floor(state.bossKills[node.id] || 0));
                if (kills === 1) (yield { kind: 'addLog', args: [this.deps._t('💠 {name} 첫 격파: {node} 획득', { name: node.name, node: this.stones.getBossStoneName(node) }), 'loot-unique'] });
                if (kills === 1) (yield { kind: 'addLog', args: [this.deps._t('🧩 우주석 슬롯에 장착하면 우주계 난이도 바닥이 상승합니다.'), 'season-up'] });
                const relicDrop = this.tryRollBossRelic(node);
                if (relicDrop) (yield { kind: 'addLog', args: [this.deps._t('💠 보스 유물 획득: {name} (우주석 보스 옵션 리롤 재화)', { name: relicDrop.name }), 'loot-unique'] });
    }

    *reportCosmosClear(node, state, receipt) {
        if (!this.deps.canLog) return;
        const { directive, skyPower, jackpot, jackpotPower } = receipt;
            (yield { kind: 'addLog', args: [`${node.tag === 'boss' ? this.deps._t('👑 우주계 은하 보스 격파') : this.deps._t('🌠 우주계 탐사 완료')}: ${node.name}, ${directive.name || this.deps._t('기본 탐사')}, 창공의 정수 +${skyPower}${node.tag === 'boss' ? this.deps._t(', 난이도 바닥 Tier {cosmosTierFloor} 적용', { cosmosTierFloor: this.stones.getCosmosTierFloor() }) : ''}`, node.tag === 'boss' ? 'season-up' : (node.kind === 'planet' ? 'loot-unique' : 'loot-magic')] });
            if (jackpot) (yield { kind: 'addLog', args: [this.deps._t('🌌 공명 잭팟! {name} 보상 증가(창공의 정수 +{jackpotPower} 포함)', { name: directive.name || this.deps._t('탐사 신호'), jackpotPower }), 'loot-unique'] });
            if (node.tag === 'boss') yield* this.reportCosmosBossClear(node, state);
    }

    calculateCosmosClearReward(node, firstClear, defeatedBossStage, directive) {
        const rewardBase = node.tag === 'boss' ? (30 + node.orbit * 10 + defeatedBossStage * 10) : (node.kind === 'planet' ? 5 + node.orbit * 2 : 2 + node.orbit);
        const focusMul = node.kind === 'planet'
            ? (1 + this.progress.getCosmosMasteryValue('combatFocus') * 0.01)
            : (1 + this.progress.getCosmosMasteryValue('craftFocus') * 0.01);
        const rewardMul = this.cosmosClearRewardMultiplier(node, firstClear);
        const directiveRewardMul = Math.max(0.1, Math.min(5, Number(directive.rewardMul) || 1));
        const reward = Math.max(1, Math.floor(rewardBase * rewardMul * focusMul * directiveRewardMul));
        const jackpotChance = Math.max(0, Math.min(0.5, Number(directive.jackpotChance) || 0));
        const jackpot = jackpotChance > 0 && Math.random() < jackpotChance;
        const jackpotBonus = jackpot
            ? Math.max(1, Math.floor(reward * Math.max(0, Number(directive.jackpotBonusMul) || 0))) : 0;
        return { reward, jackpot, jackpotBonus };
    }

    *finalizeCosmosExploration(state, node, reward) {
        state.activeChallenge.rewardSettled = true;
        this.deps.cosmosRouteRuntime.complete(this.deps.game, node.id, reward);
        this.directives.advanceCosmosDirectiveCycle(state, node.id);
        // The combat completion boundary saves after the next node or the choice stop is installed.
        (yield { kind: 'renderCosmosAtlas', args: [] });
    }

    *reportCosmosExclusiveDrop(granted, force) {
        if (granted && force && this.deps.canLog) (yield { kind: 'addLog', args: ['🌠 누적된 성간 공명이 우주계 보스 전용 보상을 확정했습니다.', 'loot-unique'] });
        if (granted && this.deps.canRefresh) (yield { kind: 'updateStaticUI', args: [] });
    }


    recordCosmosBossClear(state, node) {
        if (node.tag === 'boss' && !state.bossClears.includes(node.id)) state.bossClears.push(node.id);
            const nextKill = Math.max(0, Math.floor((state.bossKills && state.bossKills[node.id]) || 0)) + 1;
            state.bossKills[node.id] = nextKill;
            const g = String(Math.max(1, Math.min(5, Math.floor(node.orbit || 1))));
            if (!state.bossStones[g]) {
                state.bossStones[g] = this.stones.getBossStoneName(node);
                this.stones.ensureCosmosStoneOptions(state, Number(g));
            }
    }

    *recordCosmosClear(state, node, status) {
        if (status === 'available' && !state.cleared.includes(node.id)) state.cleared.push(node.id);
        if (node.kind === 'planet' && typeof this.deps.markLoopCosmosPlanetClear === 'function') {
            const completedLoopGate = this.deps.markLoopCosmosPlanetClear(node.id);
            if (completedLoopGate && this.deps.canLog) (yield { kind: 'addLog', args: ['🪐 루프 대체 경로 달성: 우주계 에니프론 행성 돌파', 'season-up'] });
        }
        if (node.tag === 'boss') this.recordCosmosBossClear(state, node);
    }


    cosmosClearRewardMultiplier(node, firstClear) {
        const rewardMul = 1
            + this.progress.getCosmosMasteryValue('stardustGain') * 0.01
            + this.progress.getCosmosMasteryValue('highRisk') * 0.022
            + this.progress.getCosmosMasteryValue('warpEfficiency') * 0.01
            + (node.kind === 'asteroid' ? this.progress.getCosmosMasteryValue('asteroidRelief') * 0.016 : 0)
            + (node.tag === 'boss' ? (this.progress.getCosmosMasteryValue('bossBounty') * 0.022 + this.progress.getCosmosMasteryValue('apexProtocol') * 0.018) : 0)
            + this.progress.getCosmosMasteryValue('echoCache') * 0.01
            + (node.kind === 'asteroid' ? this.progress.getCosmosMasteryValue('stellarForge') * 0.009 : 0)
            + (node.orbit >= 4 ? this.progress.getCosmosMasteryValue('frontierTax') * 0.013 : 0)
            + (firstClear ? this.progress.getCosmosMasteryValue('chainMastery') * 0.02 : 0);
        return rewardMul;
    }

}
