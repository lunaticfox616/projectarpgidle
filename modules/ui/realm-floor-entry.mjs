import { underworldEntryProgress } from '../state/realm-progress.mjs';
import { selectLabyrinthLevel, selectRealmLevel, validRealmFloor, strengthenSkyStone } from '../domain/realm-entry-rules.mjs';

export class RealmFloorEntry {
    constructor(deps) { this.deps = deps; this.active = true; }

    labyrinth(requestedFloor) {
        if (!this.active) return;
        const blocked = this.blockReason((0, this.deps.LABYRINTH_ZONE_ID));
        if (blocked) return (0, this.deps.addLog)(blocked, 'attack-monster');
        const result = selectLabyrinthLevel(this.deps.game,requestedFloor);
        if (!result.ok) {
            return (0, this.deps.addLog)((0, this.deps._t)('1~{max} 범위의 층수를 입력하세요.', { max:result.max }), 'attack-monster');
        }
        (0, this.deps.changeZone)((0, this.deps.LABYRINTH_ZONE_ID));
    }

    async confirmSky() {
        if ((0, this.deps.getSkyTowerRemainingClears)() === 0) return (0, this.deps.requestGameConfirmation)((0, this.deps._t)('등반 보상 없이 한 층을 연습합니다.'), {
            title: (0, this.deps._t)('연습 전투'), tone: 'warning', confirmLabel: (0, this.deps._t)('연습 입장')
        });
        if (this.deps.game.settings.mapCompleteAction !== 'repeatZone') return true;
        return (0, this.deps.requestGameConfirmation)((0, this.deps._t)("현재 맵 완료 행동이 '같은 지역 반복'입니다. 돌파 후 같은 층에 머무릅니다."), {
            title: (0, this.deps._t)('반복 설정 확인'), tone: 'warning', confirmLabel: (0, this.deps._t)('그대로 입장')
        });
    }

    async pickSkyFloor(tower, selectedFloor, context) {
        const max = tower.highestFloor;
        let value = selectedFloor;
        if (value === undefined && max > 1) value = await (0, this.deps.requestGameNumber)({
            title: (0, this.deps._t)('창공의 탑 층 선택'),
            message: (0, this.deps._t)('이번 루프 남은 보상 전투: {skyTowerRemainingClears}/{skyTowerLoopClearLimit}', { skyTowerRemainingClears: (0, this.deps.getSkyTowerRemainingClears)(), skyTowerLoopClearLimit: (0, this.deps.getSkyTowerLoopClearLimit)() }),
            min: 1, max, value: tower.currentFloor, confirmLabel: (0, this.deps._t)('입장')
        });
        if (!this.current(context,this.deps.canEnterSkyTower)) return null;
        if (value === undefined) value = 1;
        if (value === null) return null;
        const floor = validRealmFloor(value,max);
        if (floor !== null) return floor;
        (0, this.deps.addLog)((0, this.deps._t)('1~{max} 범위의 층수를 입력하세요.', { max }), 'attack-monster');
        return null;
    }

    blockReason(zoneId) {
        return (0, this.deps.getZoneTravelBlockReason)(zoneId) || (0, this.deps.getHeldRunBlockReason)();
    }

    current(context, canEnter) {
        return this.active && this.deps.game === context.owner && this.deps.game[context.field] === context.progress
            && this.deps.game.season === context.season && this.deps.game.loopCount === context.loop && canEnter();
    }

    async sky(selectedFloor) {
        if (!this.active) return;
        const held = this.blockReason((0, this.deps.SKY_TOWER_ZONE_ID));
        if (held) return (0, this.deps.addLog)(held, 'attack-monster');
        const st = (0, this.deps.ensureSkyTowerState)();
        if (!st.unlocked) return (0, this.deps.addLog)((0, this.deps._t)('창공의 탑은 루프 15 이후 이번 루프 혼돈 20층 클리어 시 해금됩니다.'), 'attack-monster');
        if (!(0, this.deps.canEnterSkyTower)()) return (0, this.deps.addLog)((0, this.deps._t)('창공의 탑은 영구 해금 후 해당 루프에서 혼돈에 입성하면 입장할 수 있습니다.'), 'attack-monster');
        const context = { owner: this.deps.game, progress: st, field: 'skyTower', season: this.deps.game.season, loop:this.deps.game.loopCount };
        if (!await this.confirmSky()) return;
        if (!this.current(context,this.deps.canEnterSkyTower)) return;
        const floor = await this.pickSkyFloor(st, selectedFloor, context);
        if (floor === null) return;
        this.finishSkyEntry(context,floor);
    }

    finishSkyEntry(context, floor) {
        if (!this.current(context, (0, this.deps.canEnterSkyTower))) return;
        const stillHeld = this.blockReason((0, this.deps.SKY_TOWER_ZONE_ID));
        if (stillHeld) return (0, this.deps.addLog)(stillHeld, 'attack-monster');
        if (!selectRealmLevel(context.progress,floor,context.progress.highestFloor).ok) return;
        (0, this.deps.changeZone)((0, this.deps.SKY_TOWER_ZONE_ID));
        (0, this.deps.updateStaticUI)();
    }

    skyStone() {
        if (!this.active || !(0, this.deps.assertBuildEditable)()) return;
        const tower = this.deps.ensureSkyTowerState();
        const result = strengthenSkyStone(tower,this.deps.getSkyStoneMaxLevel(),this.deps.getSkyStoneNextCost());
        if (!result.ok) return this.skyStoneFailure(result);
        (0, this.deps.addLog)((0, this.deps._t)(result.before === 0 ? '창공석 제작 완료: 지하계 중력 패널티 감소 {pct}%' : '창공석 강화 완료: 지하계 중력 패널티 감소 {pct}%', { pct: (0, this.deps.getSkyStoneReductionPct)() }), 'loot-unique');
        (0, this.deps.queueImportantSave)(200);
        (0, this.deps.updateStaticUI)();
    }

    skyStoneFailure(result) {
        const { _t,addLog } = this.deps;
        if (result.reason === 'unlock') return addLog(_t('창공의 탑이 열린 뒤 창공석을 만들 수 있습니다.'),'attack-monster',{toast:true});
        if (result.reason === 'max') return addLog(_t('창공석은 이미 최종 강화 상태입니다.'),'attack-monster');
        return addLog(_t('응축된 창공의 정수가 부족합니다. (필요: {cost})',{cost:result.cost}),'attack-monster');
    }

    async chaos() {
        if (!this.active) return;
        const held = this.blockReason((0, this.deps.CHAOS_REALM_ZONE_ID));
        if (held) return (0, this.deps.addLog)(held, 'attack-monster');
        let st = (0, this.deps.ensureChaosRealmState)();
        if (!st.unlocked) return (0, this.deps.addLog)((0, this.deps._t)('혼돈계는 혼돈 밖 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투 종료 시 해금됩니다.'), 'attack-monster');
        if (!(0, this.deps.canEnterChaosRealm)()) return (0, this.deps.addLog)((0, this.deps._t)('혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.'), 'attack-monster');
        const context = { owner: this.deps.game, progress: st, field: 'chaosRealm', season: this.deps.game.season, loop:this.deps.game.loopCount };
        const max = st.highestFloor;
        let v = await (0, this.deps.requestGameNumber)({
            title: (0, this.deps._t)('혼돈계 층 선택'),
            message: (0, this.deps._t)('입장 가능한 최고 층은 {max}층입니다.', { max }),
            min: 1,
            max,
            value: max,
            confirmLabel: (0, this.deps._t)('입장')
        });
        if (v === null || !this.current(context, (0, this.deps.canEnterChaosRealm))) return;
        const blocked = this.blockReason((0, this.deps.CHAOS_REALM_ZONE_ID));
        if (blocked) return (0, this.deps.addLog)(blocked, 'attack-monster');
        if (!selectRealmLevel(st,v,st.highestFloor).ok) return (0, this.deps.addLog)((0, this.deps._t)('1~{highestFloor} 범위의 층수를 입력하세요.', { highestFloor: st.highestFloor }), 'attack-monster');
        (0, this.deps.changeZone)((0, this.deps.CHAOS_REALM_ZONE_ID));
        (0, this.deps.updateStaticUI)();
    }

    underworld(requestedFloor) {
        if (!this.active) return;
        const held = this.blockReason((0, this.deps.UNDERWORLD_ZONE_ID));
        if (held) return (0, this.deps.addLog)(held, 'attack-monster');
        if (!(typeof (0, this.deps.canEnterUnderworld) === 'function' && (0, this.deps.canEnterUnderworld)())) return (0, this.deps.addLog)((0, this.deps._t)('지하계 입장 조건: 야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층 + 이번 루프 혼돈20 클리어'), 'attack-monster');
        const uw = underworldEntryProgress(this.deps.game);
        let max = Math.max(1, Math.floor(uw.highestFloor || 1));
        if (!selectRealmLevel(uw,requestedFloor,max).ok) return (0, this.deps.addLog)((0, this.deps._t)('1~{max} 범위의 층수를 입력하세요.', { max }), 'attack-monster');
        (0, this.deps.changeZone)((0, this.deps.UNDERWORLD_ZONE_ID));
        (0, this.deps.updateStaticUI)();
    }

    async pickUnderworld() {
        if (!this.active) return;
        const held = this.blockReason((0, this.deps.UNDERWORLD_ZONE_ID));
        if (held) return (0, this.deps.addLog)(held, 'attack-monster');
        if (!(typeof (0, this.deps.canEnterUnderworld) === 'function' && (0, this.deps.canEnterUnderworld)())) return this.underworld(1);
        const uw = underworldEntryProgress(this.deps.game);
        const context = { owner: this.deps.game, progress: uw, field: 'underworldProgress', season: this.deps.game.season, loop:this.deps.game.loopCount };
        let max = Math.max(1, Math.floor(uw.highestFloor || 1));
        let v = await (0, this.deps.requestGameNumber)({
            title: (0, this.deps._t)('지하계 층 선택'),
            message: (0, this.deps._t)('입장 가능한 최고 층은 {max}층입니다.', { max }),
            min: 1,
            max,
            value: max,
            confirmLabel: (0, this.deps._t)('입장')
        });
        if (v === null || !this.current(context, (0, this.deps.canEnterUnderworld))) return;
        this.underworld(v);
    }

    dispose() { this.active = false; }
}
