import { beehivePanelProgress } from '../state/realm-progress.mjs';

export class BeehiveRun {
    constructor(deps, choices) {
        this.deps = deps;
        this.choices = choices;
    }

    *spawn(owner, isBoss) {
        let b = owner.beehive || {};
        let zone = (0, this.deps.getZone)('beehive_run') || (0, this.deps.getZone)(0);
        let step = Math.max(1, Math.floor(b.branchStep || 1));
        let count = this.waveCount(b, step, isBoss);
        let eliteCount = step >= 6 ? 3 : 2;
        owner.enemies = [];
        owner.encounterPlan = [];
        owner.encounterIndex = 0;
        owner.moveTimer = 0;
        let wave = [];
        for (let i = 0; i < count; i++) {
            let marker = { elite: !isBoss && i < eliteCount, boss: isBoss };
            let enemy = (0, this.deps.createEnemy)(zone, marker, i);
            wave.push((0, this.deps.tuneBeehiveWaveEnemy)(enemy, zone, isBoss, b.enemyEmpower));
        }
        // 방 단위 무대: 벌집 전용 지도의 다음 방(여왕은 여왕의 방)에 세운다(js/combat-encounters.js placeBeehiveRoomWave). 그 밖에서는 판에 바로 선다.
        let roomRun = (0, this.deps.getBeehiveRoomRun)();
        if (roomRun) (0, this.deps.placeBeehiveRoomWave)(roomRun, wave, step, isBoss);
        else owner.enemies.push(...wave);
        if (isBoss) (yield {kind:'log',args:[(0, this.deps._t)('👑 10개 갈림길을 완료해 여왕벌이 등장했습니다. 여왕벌을 처치하면 벌집 원정이 완료됩니다.'), 'loot-unique']});
        else (yield {kind:'log',args:[(0, this.deps._t)('🐝 벌떼 웨이브 시작! 진행도 {min}%, 남은 적을 모두 처치해야 다음 갈림길이 열립니다.', { min: Math.min(100, step * 10) }), 'attack-monster']});
    }

    waveCount(b, step, isBoss) {
        return isBoss ? 1 : Math.min(8, 6 + Math.floor((step - 1) / 4)) + (b.waveExtra || 0);
    }

    *start(owner) {
        let b = owner.beehive || (owner.beehive = {});
        if ((owner.currencies.hiveKey || 0) <= 0 || b.inRun) return;
        const block = (0, this.deps.getContentStartBlockReason)();
        if (block) return (yield {kind:'log',args:[block, 'attack-monster']});
        let lastDeepChaosDepth = Math.max(21, Math.min(owner.abyssEndlessDepth || 21, owner.loopProgressCurrent.bestAbyssDepth || 21));
        (0, this.deps.resetBeehiveRunModifiers)(b);
        owner.currencies.hiveKey--;
        b.entryDeepChaosDepth = lastDeepChaosDepth;
        b.inRun = true;
        b.branchStep = 0;
        b.inMapZoneId = 'beehive_run';
        b.returnZoneId = (0, this.deps.getContentReturnZoneId)();
        b.queenActive = false;
        (0, this.deps.actExplorationProgress).depart(owner);
        owner.currentZoneId = 'beehive_run';
        owner.enemies = [];
        owner.encounterPlan = [];
        owner.encounterIndex = 0;
        owner.runProgress = 0;
        owner.moveTimer = 0;
        if ((0, this.deps.actExplorationDoors).session()) (0, this.deps.startEncounterRun)(); // 방 단위 무대: 벌집 전용 지도를 열고 입구에 선다(js/content-maps.js hive)
        owner.combatHalted = true;
        this.choices.prepare(owner, b);
        (yield {kind:'log',args:[(0, this.deps._t)('🐝 벌집 원정 시작! 기준 난이도: 혼돈 심화 {max}, 갈림길을 선택하면 즉시 벌떼 웨이브가 시작됩니다.', { max: Math.max(21, Math.floor(b.entryDeepChaosDepth || 21)) }), 'season-up']});
        (yield {kind:'refresh',args:[]});
        (yield {kind:'save',args:[200]});
    }

    *syncChoices(owner) {
        const b = beehivePanelProgress(owner);
        if (b.inRun && !b.pendingChoice && !b.awaitingClear && !b.queenActive) this.choices.prepare(owner, b);
        if (b.inRun && b.awaitingClear && this.deps.countBeehiveWaveAlive() === 0) yield* this.cleared(owner);
        return b;
    }

    canResolve(b) {
        return !!b?.inRun && !!b.pendingChoice && !b.awaitingClear
            && (0, this.deps.countBeehiveWaveAlive)() === 0;
    }

    *validatePayment(owner, pick, displayedPenalty) {
        if (this.choices.canPay(owner, pick.penalty) && (!displayedPenalty || displayedPenalty === pick.penalty.key)) return true;
        (yield {kind:'close',args:[]});
        (yield {kind:'open',args:['보유 재료가 바뀌었습니다. 대가를 확인하고 다시 선택하세요.']});
        (yield {kind:'refresh',args:[]});
        return false;
    }

    *resolve(owner, key, displayedPenalty) {
        let b = owner.beehive;
        if (!this.canResolve(b)) return;
        let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
        const pick = this.selectedReward(owner, b, key, nextStep);
        if (!pick) return;
        if (!(yield* this.validatePayment(owner, pick, displayedPenalty))) return;
        let penaltyText = this.choices.applyPenalty(owner, pick.penalty, b);
        (yield {kind:'close',args:[]});
        const { rewardText, rewardResult } = this.queueReward(owner, b, pick);
        b.penaltyLedger.push(penaltyText || '');
        b.pendingChoice = null;
        b.branchStep = nextStep;
        b.awaitingClear = true;
        b.queenActive = false;
        owner.runProgress = Math.min(100, b.branchStep * 10);
        owner.combatHalted = false;
        const timingText = this.paymentText(pick.timing, rewardText, rewardResult);
        yield {kind:'log',args:[this.deps._t('🐝 갈림길 {step}/10 선택 완료: {timing}, 대가: {penalty}, 벌떼 웨이브 시작', { step: b.branchStep, timing: timingText, penalty: penaltyText || this.deps._t('없음') }), 'loot-magic']};
        yield* this.spawn(owner, false);
        yield {kind:'refresh',args:[]};
        yield {kind:'save',args:[200]};
    }

    selectedReward(owner, b, key, nextStep) {
        const pick = this.choices.selectable(owner, b.pendingChoice, key);
        if (pick || !['legacy_now', 'legacy_later'].includes(key)) return pick;
        return this.choices.option(owner, key === 'legacy_now' ? 'pollen' : 'honey', nextStep);
    }

    queueReward(owner, b, pick) {
        b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
        b.penaltyLedger = Array.isArray(b.penaltyLedger) ? b.penaltyLedger : [];
        let rewardText = String(pick.text || '').split(' / 대가:')[0];
        let rewardResult = '';
        b.pendingWaveReward = null;
        b.pendingWaveRewardText = '';
        b.pendingQueenRewards = Array.isArray(b.pendingQueenRewards) ? b.pendingQueenRewards : [];
        if (pick.timing === 'immediate') {
            rewardResult = this.choices.applyReward(owner, pick);
            if (rewardResult) b.rewardLedger.push(rewardResult);
        } else if (pick.timing === 'queen') {
            b.pendingQueenRewards.push({ effect: pick.effect, amount: pick.amount, chance: pick.chance, text: rewardText });
        } else {
            b.pendingWaveReward = { effect: pick.effect, amount: pick.amount, chance: pick.chance };
            b.pendingWaveRewardText = rewardText;
        }
        return { rewardText, rewardResult };
    }

    paymentText(timing, rewardText, rewardResult) {
        if (timing === 'immediate') return this.deps._t('즉시 지급({rewardResult})', { rewardResult: rewardResult || this.deps._t('보상 없음') });
        if (timing === 'queen') return this.deps._t('여왕벌 처치 후 지급({rewardText})', { rewardText: rewardText || this.deps._t('보상 없음') });
        return this.deps._t('웨이브 처치 후 지급({rewardText})', { rewardText: rewardText || this.deps._t('보상 없음') });
    }

    *exit(owner, message, logType) {
        (yield {kind:'close',args:[]});
        let b = owner.beehive || {};
        b.inRun = false;
        b.branchStep = 0;
        (0, this.deps.resetBeehiveRunModifiers)(b);
        (0, this.deps.actExplorationProgress).depart(owner); // 벌집 전용 지도를 걷던 중이면 바닥의 전리품을 거두고 그 탐험을 닫는다
        owner.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : owner.maxZoneId;
        b.returnZoneId = null;
        owner.enemies = [];
        owner.encounterPlan = [];
        owner.encounterIndex = 0;
        owner.runProgress = 0;
        owner.combatHalted = false;
        if (message) (yield {kind:'log',args:[message, logType || 'attack-monster']});
        (yield {kind:'refresh',args:[]});
        (yield {kind:'save',args:[200]});
    }

    *complete(owner) {
        let b = owner.beehive || {};
        if (!b.inRun || !b.queenActive) return;
        const rewardZone = (0, this.deps.getZone)('beehive_run');
        const risk = Math.max(0, Math.min(30, Math.floor(b.enemyEmpower || 0)));
        (yield {kind:'close',args:[]});
        let queenRewardResults = [];
        if (Array.isArray(b.pendingQueenRewards)) {
            b.pendingQueenRewards.forEach(reward => {
                let result = this.choices.applyReward(owner, reward);
                if (result) queenRewardResults.push(result);
            });
        }
        b.inRun = false;
        b.cleared = true;
        b.unlockedPermanent = true;
        (0, this.deps.resetBeehiveRunModifiers)(b);
        b.branchStep = 0;
        (0, this.deps.actExplorationProgress).depart(owner); // 벌집 전용 지도를 걷던 중이면 여왕이 떨군 것까지 거두고 그 탐험을 닫는다
        owner.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : owner.maxZoneId;
        b.returnZoneId = null;
        owner.enemies = [];
        owner.encounterPlan = [];
        owner.encounterIndex = 0;
        owner.runProgress = 0;
        owner.combatHalted = false;
        (0, this.deps.markLoopSpecialBossKill)('beehive_queen');
        (0, this.deps.unlockJournalEntry)('beehive_queen');
        const wax = (0, this.deps.awardCurrency)('beeswax', 1 + Math.floor(risk / 6), 'reward');
        const stinger = (0, this.deps.awardCurrency)('venomStinger', 1 + Math.floor(risk / 10), 'reward');
        if (this.deps.random() < 0.08) {
            const itemLevel = (0, this.deps.levelProgression).itemLevel(rewardZone, { isBoss: true });
            const tier = Math.min((0, this.deps.getRealmEquipmentHiddenTierCap)(rewardZone), (0, this.deps.levelProgression).maxDropTier(itemLevel));
            let item = (0, this.deps.levelProgression).stampItem((0, this.deps.generateUniqueItem)(tier, '무기', null, rewardZone), itemLevel);
            (0, this.deps.addItemToInventory)(item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true });
        }
        (yield {kind:'log',args:[(0, this.deps._t)('👑 여왕벌 처치! 밀랍 +{wax}, 독벌침 +{stinger} (군체 강화 {risk} 정산).{picked}', { wax, stinger, risk, picked: queenRewardResults.length ? ` ${(0, this.deps._t)('여왕벌 선택 보상')}: ${queenRewardResults.join(' / ')}` : '' }), 'level-up']});
        (yield {kind:'refresh',args:[]});
        (yield {kind:'save',args:[200]});
    }

    *cleared(owner) {
        let b = owner.beehive || {};
        if (!b.inRun || !b.awaitingClear) return;
        // HP 0 victims still in the field need their own loot and pack death records before the wave can advance.
        if ((0, this.deps.countBeehiveWaveAlive)() > 0) return;
        b.waveExtra = 0;
        owner.enemies = [];
        owner.encounterPlan = [];
        owner.encounterIndex = 0;
        owner.moveTimer = 0;
        if (b.queenActive) return (yield* this.complete(owner));
        const rewardResult = this.settleWaveReward(owner, b);
        b.awaitingClear = false;
        owner.combatHalted = true;
        owner.runProgress = Math.min(100, Math.max(0, Math.floor(b.branchStep || 0)) * 10);
        (yield {kind:'save',args:[200]});
        if (b.branchStep >= 10) return yield* this.summonQueen(owner, b, rewardResult);
        this.choices.prepare(owner, b);
        (yield {kind:'log',args:[(0, this.deps._t)('🐝 벌떼 웨이브 정리 완료{reward}. 다음 갈림길을 선택할 수 있습니다. ({step}/10)', { reward: rewardResult ? `: ${rewardResult}` : '', step: b.branchStep }), 'loot-magic']});
        (yield {kind:'open',args:[rewardResult ? (0, this.deps._t)('웨이브 보상: {rewardResult}', { rewardResult }) : '웨이브를 정리했습니다.']});
        (yield {kind:'refresh',args:[]});
    }

    *summonQueen(owner, b, rewardResult) {
        b.awaitingClear = true;
        b.queenActive = true;
        owner.combatHalted = false;
        yield* this.spawn(owner, true);
        if (rewardResult) yield {kind:'log',args:[this.deps._t('🐝 벌떼 웨이브 정리 완료: {rewardResult}. 여왕벌이 등장합니다.', { rewardResult }), 'loot-unique']};
        yield {kind:'refresh',args:[]};
    }

    settleWaveReward(owner, b) {
        if (!b.pendingWaveReward) return '';
        const result = this.choices.applyReward(owner, b.pendingWaveReward);
        b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
        if (result) b.rewardLedger.push(result);
        b.pendingWaveReward = null;
        b.pendingWaveRewardText = '';
        return result;
    }
}
