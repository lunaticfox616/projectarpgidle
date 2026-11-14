import { grandBreachPanelProgress } from '../state/realm-progress.mjs';

export class RealmRunControls {
    constructor(deps) {
        this.deps = deps;
    }

    *startColony(owner) {
        let c = owner.colony || (owner.colony = {});
        if ((owner.currencies.colonyTrace||0)<=0 || c.inRun) return;
        const held = (0, this.deps.getContentStartBlockReason)();
        if (held) return (yield {kind:'log',args:[held, 'attack-monster']});
        owner.currencies.colonyTrace--;
        c.entryDeepChaosDepth = (0, this.deps.getZone)('colony_run').entryDeepChaosDepth;
        c.inRun = true; c.wave = 1; c.kills = 0; c.requiredKills = (0, this.deps.getColonyWaveEnemyCount)(1);
        c.coreMaxHp = 0; c.coreHp = 0; c.failedWave = 0;
        c.returnAfterWave = 0; c.lastResult = null;
        c.pendingLoot = []; c.lootPending = false; c.bossLootCell = null;
        c.returnZoneId = (0, this.deps.getContentReturnZoneId)();
        (0, this.deps.actExplorationProgress).depart(owner);
        owner.currentZoneId = 'colony_run';
        owner.combatHalted = false;
        owner.enemies = []; owner.encounterPlan = []; owner.encounterIndex = 0; owner.runProgress = 0; owner.moveTimer = 0;
        (0, this.deps.spawnColonyWave)();
        (yield {kind:'log',args:[(0, this.deps._t)('🪲 군락지 방어전 시작! 기준 난이도: 혼돈 심화 {entryDeepChaosDepth}', { entryDeepChaosDepth: c.entryDeepChaosDepth }), 'season-up']});
        (yield {kind:'refresh',args:[]});
        (yield {kind:'save',args:[200]});
    }

    canAutoEnter(owner) {
        if ((0, this.deps.actExplorationState).current(owner)?.status === 'active') return false;
        let v = owner.voidRift;
        let g = v.grandRun || {};
        let beehiveRunning = (0, this.deps.isBeehiveRunLockedForMapTravel)();
        return !!(owner.settings && owner.settings.autoEnterGrandBreach && v.grandBreachUnlock && !g.inRun && !beehiveRunning && owner.currentZoneId !== 'grand_breach_run');
    }

    *autoEnter(owner) {
        // 콘텐츠 시작이 막힌 곳(열린 아틀라스 지도 같은)에서는 조용히 기다린다: 거절과 "진입" 기록이 지도마다 쌓였다(2026-10-20 검토)
        if (!this.canAutoEnter(owner) || (0, this.deps.getZone)(owner.currentZoneId)?.type === 'act' || (0, this.deps.getContentStartBlockReason)()) return false;
        (yield* this.enterGrand(owner, { automatic: true }));
        if (owner.currentZoneId !== 'grand_breach_run') return false;
        (yield {kind:'log',args:[(0, this.deps._t)('🌌 자동입장: 대균열이 열려 즉시 진입합니다.'), 'season-up']});
        return true;
    }

    *enterGrand(owner, options) {
        const held = (0, this.deps.getContentStartBlockReason)();
        if (held) return (yield {kind:'log',args:[held, 'attack-monster']});
        let v = owner.voidRift;
        if (!v.grandBreachUnlock) return;
        this.reconcileGrand(owner);
        if (v.grandRun && v.grandRun.inRun) return;
        v.grandBreachUnlock = false;
        v.grandRun = { inRun: true, phase: 'survival', survivalStarted: false, kills: 0, gauge: 0, pendingLoot: [],
            rewardVoidChisel: null, rewardJewelShard: null, nextRefillAt: 0, returnZoneId: (0, this.deps.getContentReturnZoneId)() };
        (0, this.deps.actExplorationProgress).depart(owner);
        owner.currentZoneId = 'grand_breach_run';
        owner.enemies = [];
        owner.encounterPlan = [];
        owner.encounterIndex = 0;
        owner.runProgress = 0;
        owner.moveTimer = 0;
        owner.combatHalted = false;
        if (!options || !options.automatic) (yield {kind:'log',args:[(0, this.deps._t)('🌌 대균열 진입! 일반 몬스터 0.5%, 정예 3%씩 게이지를 채워 균열 군주를 소환합니다. 전리품은 군주 처치 시 쏟아집니다.'), 'season-up']});
        (yield {kind:'refresh',args:[]});
        (yield {kind:'save',args:[200]});
    }

    reconcileGrand(owner) {
        const v = grandBreachPanelProgress(owner);
        const run = v.grandRun;
        if (run?.inRun && owner.currentZoneId !== 'grand_breach_run') {
            this.deps.actExplorationState.groundLoot.discardEncounter(owner, 'grand_breach_run');
            run.inRun = false;
            run.phase = 'failed';
        }
        return v;
    }

    *toggleMeteor(owner) { owner.settings = owner.settings || {}; owner.settings.autoEnterMeteor = !owner.settings.autoEnterMeteor; (yield {kind:'log',args:[`☄️ ${(0, this.deps._t)('운석 낙하 자동입장')} ${(0, this.deps._t)(owner.settings.autoEnterMeteor ? '켜짐' : '꺼짐')}`, 'season-up']}); (yield {kind:'refresh',args:[]}); }

    *toggleGrand(owner) { owner.settings = owner.settings || {}; owner.settings.autoEnterGrandBreach = !owner.settings.autoEnterGrandBreach; (yield {kind:'log',args:[`🌌 ${(0, this.deps._t)('대균열 자동입장')} ${(0, this.deps._t)(owner.settings.autoEnterGrandBreach ? '켜짐' : '꺼짐')}`, 'season-up']}); (yield* this.autoEnter(owner)); (yield {kind:'refresh',args:[]}); }
}
