import { consumeBattleTrialKey, woodsmanEchoOpen, talentBloomAdmission, prepareTalentBloomTrial,
    unlockedDeepChaosDepths, deepChaosEntryStatus, toggleRootBossRepeat } from '../domain/realm-entry-rules.mjs';

export class RealmTrialEntry {
    constructor(deps) { this.deps = deps; this.active = true; }

    trial(trialId) {
        if (!this.active) return;
        if (!(0, this.deps.contentProgression).isUnlocked('battleTrials')) return (0, this.deps.addLog)((0, this.deps._t)('루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다.'), 'attack-monster');
        if (!['trial_3','trial_4'].includes(trialId)) return (0, this.deps.changeZone)(trialId);
        const block = (0, this.deps.getContentStartBlockReason)() || (0, this.deps.getZoneTravelBlockReason)(trialId);
        if (block) return (0, this.deps.addLog)(block, 'attack-monster');
        if (!consumeBattleTrialKey(this.deps.game)) return (0, this.deps.addLog)((0, this.deps._t)('시련의 증표가 부족합니다.'), 'attack-monster');
        (0, this.deps.addLog)((0, this.deps._t)('🗝️ 시련의 증표 1개 소모 (남은 {value})', { value: this.deps.game.currencies.trialKey3 || 0 }), 'season-up');
        (0, this.deps.changeZone)(trialId);
    }

    echoOpen() {
        if (typeof (0, this.deps.ensureChaosRealmState) !== 'function') return false;
        return woodsmanEchoOpen(this.deps.ensureChaosRealmState());
    }

    bloomOpen() {
        return !talentBloomAdmission(this.deps.game,this.echoOpen());
    }

    async chooseHero() {
        return (0, this.deps.getTalentBloomHeroIdForAscendancy)(this.deps.game.ascendClass) || (0, this.deps.HERO_SELECTION_ORDER)[0];
    }

    async bloom() {
        if (!this.active) return;
        const held = (0, this.deps.getHeldRunBlockReason)();
        if (held) return (0, this.deps.addLog)(held, 'attack-monster');
        const reason = talentBloomAdmission(this.deps.game,this.echoOpen());
        if (reason) return this.bloomFailure(reason);
        const context = this.capture(), ascendClass = this.deps.game.ascendClass;
        let heroId = await this.chooseHero();
        if (!this.current(context) || this.deps.game.ascendClass !== ascendClass) return;
        if (!(0, this.deps.HERO_SELECTION_DEFS)[heroId]) return;
        const blocked = this.deps.getHeldRunBlockReason();
        if (blocked) return this.deps.addLog(blocked,'attack-monster');
        const result = prepareTalentBloomTrial(this.deps.game,heroId,this.echoOpen());
        if (!result.ok) return this.bloomFailure(result.reason);
        (0, this.deps.addLog)((0, this.deps._t)('개화 시련 도전: [{bloomName}] ({label} 재능 × {name})', { bloomName: (0, this.deps.getTalentCardName)(heroId, this.deps.game.ascendClass).bloomName, label: (0, this.deps.HERO_SELECTION_DEFS)[heroId].label, name: (0, this.deps.CLASS_TEMPLATES)[this.deps.game.ascendClass].name }), 'season-up');
        if (typeof (0, this.deps.saveGame) === 'function') (0, this.deps.saveGame)({ skipCloudSync: true });
        (0, this.deps.changeZone)('trial_5');
    }

    bloomFailure(reason) {
        const { _t,addLog } = this.deps;
        if (reason === 'echo') return addLog(_t('🔒 나무꾼의 잔상이 아직 열리지 않았습니다. 혼돈 밖 나무꾼을 100% 처치하세요.'),'attack-monster');
        if (reason === 'class') return addLog(_t('🔒 재능 개화는 전직을 고른 뒤 도전할 수 있습니다.'),'attack-monster');
        return addLog(_t('🔒 카오스 키와 코어 키가 각각 1개씩 필요합니다.'),'attack-monster');
    }

    capture() {
        const owner = this.deps.game;
        return {owner,season:owner.season,loop:owner.loopCount};
    }

    current(context) {
        const owner = this.deps.game;
        return this.active && owner === context.owner && owner.season === context.season && owner.loopCount === context.loop;
    }

    async deepChaos() {
        if (!this.active) return;
        const held = (0, this.deps.getHeldRunBlockReason)();
        if (held) return (0, this.deps.addLog)(held, 'attack-monster');
        const context = this.capture();
        const unlocked = unlockedDeepChaosDepths(this.deps.game);
        let max = Math.max(20, unlocked.length ? Math.max(...unlocked) : Math.floor(this.deps.game.abyssEndlessDepth || 20));
        let depth = await (0, this.deps.requestGameNumber)({
            title: (0, this.deps._t)('혼돈 심화층 선택'),
            message: unlocked.length > 0 ? (0, this.deps._t)('해금된 심화층 범위: 21 ~ {max}', { max }) : (0, this.deps._t)('입장 가능한 심화층 범위: 21 ~ {max}', { max }),
            min: 21,
            max,
            value: max,
            confirmLabel: (0, this.deps._t)('입장')
        });
        this.finishDeepEntry(context,depth);
    }

    finishDeepEntry(context, depth) {
        if (depth === null || !this.current(context)) return;
        const blocked = this.deps.getHeldRunBlockReason();
        if (blocked) return this.deps.addLog(blocked,'attack-monster');
        depth = Math.floor(Number(depth) || 0);
        const available = unlockedDeepChaosDepths(this.deps.game);
        if (available.length > 0 && !available.includes(depth)) return (0, this.deps.addLog)((0, this.deps._t)('해금된 심화 혼돈 층수만 입장 가능합니다.'), 'attack-monster');
        (0, this.deps.enterUnlockedEndlessDepth)(depth);
    }

    deepStatus() {
        return deepChaosEntryStatus(this.deps.game,this.deps.hasCurrentLoopChaos20Clear());
    }

    deepHtml() {
        let state = this.deepStatus();
        if (!state.open) return '';
        let current = (0, this.deps.getAbyssDepthFromZoneId)(this.deps.game.currentZoneId) >= 21 ? 'current' : '';
        let powerEstimate = (0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)((0, this.deps.getAbyssZoneIdForDepth)(state.currentDepth)));
        return `<div class="map-item map-item--deep-chaos ${current}" data-exploration-departure onclick="enterDeepChaosPrompt()">
            <div class="map-item-main"><span>♾️</span><span>${(0, this.deps._t)('혼돈 심화층')}<br><span class="map-zone-status">${(0, this.deps._t)('현재 심화층: {currentDepth}층, 최고 기록: {highestDepth}층', { currentDepth: state.currentDepth, highestDepth: state.highestDepth })}</span><br>${powerEstimate}</span></div>
            <div class="map-item-actions"><span class="map-zone-status">${(0, this.deps._t)('입장 가능: 21 ~ {highestDepth}', { highestDepth: state.highestDepth })}</span></div>
        </div>`;
    }

    toggleRepeat() {
        if (!this.active) return;
        toggleRootBossRepeat(this.deps.game);
        (0, this.deps.addLog)(`🗝️ ${(0, this.deps._t)('뿌리 보스 반복 도전')}: ${(0, this.deps._t)(this.deps.game.autoRepeatSeasonBoss ? '켜짐' : '꺼짐')}`, 'season-up');
        (0, this.deps.updateStaticUI)();
    }

    dispose() { this.active = false; }
}
