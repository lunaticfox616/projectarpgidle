export class SideEncounterProgress {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
        this.lastHudHtml = '';
        this.lastHudHost = null;
    }

    updateGrandBreachGauge(run) {
        if (run.phase === 'loot') { this.updateLootCollectionProgress(); return; }
        const progress = (0, this.deps.getGrandBreachProgress)(run.gauge);
        const survival = run.phase === 'survival';
        const pending = run.phase === 'bossPending';
        (0, this.deps.setTextById)('ui-progress-label', (0, this.deps._t)(survival ? '균열 게이지' : pending ? '군주 소환' : '최종 전투'));
        (0, this.deps.setTextById)('ui-move-time-text', survival ? `${progress.percent}%, ${this.links.grand.grandTimeLeft(run)}` : pending ? '100%' : (0, this.deps._t)('군주 처치'));
        (0, this.deps.setCombatProgressGaugePercent)(survival ? progress.percent : 100);
    }

    updateReturnAction(zone) {
        const grand = this.deps.game.voidRift.grandRun;
        const inGrand = zone.type === 'grandBreach' && grand?.inRun;
        const inColony = zone.type === 'colony' && this.deps.game.colony.inRun;
        // These runs own one loss dialog; other travel keeps the exploration confirmation.
        this.deps.document.getElementById('btn-combat-return')?.toggleAttribute('data-exploration-departure', !inGrand && !inColony);
    }

    /** The HUD return button's word: 원정 포기 in a grand breach fight, 철수 in a colony run, else 귀환. */
    returnLabel(zone) {
        if (zone.type === 'grandBreach' && this.deps.game.voidRift.grandRun?.inRun) return (0, this.deps._t)(this.deps.game.voidRift.grandRun.phase === 'loot' ? '귀환' : '원정 포기');
        return (0, this.deps._t)(zone.type === 'colony' && this.deps.game.colony.inRun ? '철수' : '귀환');
    }

    updateHud(zone) {
        this.updateReturnAction(zone);
        this.updateMeteorProgress(zone);
        this.updateColonyProgress(zone);
        this.updateEchoProgress(zone);
        const host = this.deps.document.getElementById('side-encounter-hud');
        if (!host) return;
        const run = this.deps.game.voidRift && this.deps.game.voidRift.grandRun;
        const active = zone.type === 'grandBreach' && run && run.inRun;
        host.toggleAttribute('hidden', !active);
        if (!active) { this.lastHudHtml = ''; return; }
        const html = this.links.grand.grandSummary(run);
        if (host !== this.lastHudHost || html !== this.lastHudHtml) {
            host.innerHTML = html;
            this.lastHudHtml = html;
            this.lastHudHost = host;
        }
        this.updateGrandBreachGauge(run);
    }

    dispose() {
        this.lastHudHtml = '';
        this.lastHudHost = null;
    }

    updateMeteorProgress(zone) {
        if (zone.type !== 'meteor' || this.deps.game.moveTimer > 0) return;
        const bossAlive = this.deps.game.enemies.some(enemy => enemy.isBoss && enemy.hp > 0);
        (0, this.deps.setTextById)('ui-progress-label', (0, this.deps._t)(bossAlive ? '운석 핵 파괴' : '운석 접근'));
        (0, this.deps.setTextById)('ui-move-time-text', bossAlive ? (0, this.deps._t)('처치 중') : `${this.deps.game.runProgress.toFixed(0)}%`);
    }

    /** 나무꾼의 잔상: 남은 시간. 방 단위 지도에서는 잔상이 일어설 때까지 30초 그대로 서 있다. */
    updateEchoProgress(zone) {
        const run = this.deps.game.woodsmanEchoRun;
        if (zone.type !== 'woodsmanEcho' || !run || !run.active) return;
        (0, this.deps.setTextById)('ui-progress-label', (0, this.deps._t)('남은 시간'));
        (0, this.deps.setTextById)('ui-move-time-text', (0, this.deps._t)('{n}초', { n: Math.ceil(Math.max(0, run.timeLeft)) }));
        (0, this.deps.setCombatProgressGaugePercent)(run.duration > 0 ? run.timeLeft / run.duration * 100 : 0);
    }

    updateColonyProgress(zone) {
        if (zone.type !== 'colony' || !this.deps.game.colony.inRun) return;
        if (this.deps.game.colony.lootPending) { this.updateLootCollectionProgress(); return; }
        const {wave, kills, requiredKills, coreHp, coreMaxHp} = this.deps.game.colony;
        if (!coreMaxHp) {
            (0, this.deps.setTextById)('ui-progress-label', (0, this.deps._t)('{n}웨이브', { n: wave }));
            (0, this.deps.setTextById)('ui-move-time-text', `${kills}/${requiredKills} ${(0, this.deps._t)('처치')}`);
            (0, this.deps.setCombatProgressGaugePercent)(requiredKills > 0 ? kills / requiredKills * 100 : 0);
            return;
        }
        const durability = Math.max(0, Math.ceil(coreHp / coreMaxHp * 100));
        (0, this.deps.setTextById)('ui-progress-label', `${(0, this.deps._t)('{n}웨이브', { n: wave })}, ${(0, this.deps._t)('군락 핵')}`);
        (0, this.deps.setTextById)('ui-move-time-text', `${durability}%, ${kills}/${requiredKills} ${(0, this.deps._t)('처치')}`);
        (0, this.deps.setCombatProgressGaugePercent)(durability);
    }

    updateLootCollectionProgress() {
        const remaining = this.deps.actExplorationState.current(this.deps.game)?.groundLoot?.length || 0;
        (0, this.deps.setTextById)('ui-progress-label', (0, this.deps._t)('전리품 수거'));
        (0, this.deps.setTextById)('ui-move-time-text', (0, this.deps._t)('{n}개 남음', { n: remaining }));
        (0, this.deps.setCombatProgressGaugePercent)(100);
    }
}
