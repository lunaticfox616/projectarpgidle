import { colonyPanelProgress } from '../state/realm-progress.mjs';

export class RealmContentControls {
    constructor(deps, hive, bees, runs) {
        this.deps = deps;
        this.hive = hive;
        this.bees = bees;
        this.runs = runs;
        this.active = true;
        this.forfeits = new WeakSet();
    }

    renderHive(owner, shouldRenderPanel = true) {
        if (!this.active) return;
        let open = (owner.season || 1) >= 8;
        const panel = this.hivePanelVisibility(open && shouldRenderPanel);
        if (!open) return;
        const b = this.consume(this.bees.syncChoices(owner));
        if (!b) return;
        let aliveBeeEnemies = (0, this.deps.countBeehiveWaveAlive)();
        const choiceHtml = this.hive.runStatusHtml(owner, b, aliveBeeEnemies);
        if (shouldRenderPanel) this.paintHivePanel(panel, b, choiceHtml);
    }

    hivePanelVisibility(show) {
        let header = (0, this.deps.document).getElementById('ui-beehive-header');
        let panel = (0, this.deps.document).getElementById('ui-beehive-panel');
        const display = show ? 'block' : 'none';
        if (header) header.style.display = display;
        if (panel) panel.style.display = display;
        return panel;
    }

    paintHivePanel(panel, b, choiceHtml) {
        if (!panel) return;
        const html = (0, this.deps.sideEncounterUi).hivePanel(b, choiceHtml, (0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)('beehive_run')));
        (0, this.deps.sideEncounterUi).renderPanel(panel, html);
    }

    renderColony(owner) {
        if (!this.active) return;
        let open = (owner.season || 1) >= 15;
        let header = (0, this.deps.document).getElementById('ui-colony-header');
        let panel = (0, this.deps.document).getElementById('ui-colony-panel');
        let wardHost = (0, this.deps.document).getElementById('ui-colony-ward-panel');
        if (!header || !panel || !wardHost) return;
        header.style.display = open ? 'block' : 'none';
        panel.style.display = open ? 'block' : 'none';
        wardHost.hidden = !open;
        if (!open) return;
        const c = colonyPanelProgress(owner);
        (0, this.deps.sideEncounterUi).renderPanel(panel, (0, this.deps.sideEncounterUi).colonyPanel(c, (0, this.deps.getZone)('colony_run')));
        (0, this.deps.renderColonyWardView)('ui-colony-ward-panel');
    }

    forfeitColony() {
        if (this.active && this.deps.colonyRun.finish()) (0, this.deps.updateStaticUI)();
    }

    renderGrand(owner) {
        if (!this.active) return;
        let open = (owner.season || 1) >= 9;
        let header = (0, this.deps.document).getElementById('ui-voidrift-header');
        let panel = (0, this.deps.document).getElementById('ui-voidrift-panel');
        if (!header || !panel) return;
        header.style.display = open ? 'block' : 'none';
        panel.style.display = open ? 'block' : 'none';
        this.renderGrandAuto(owner, open);
        if (!open) return;
        const v = this.runs.reconcileGrand(owner);
        (0, this.deps.sideEncounterUi).renderPanel(panel, (0, this.deps.sideEncounterUi).grandPanel(v, (0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)('grand_breach_run'))));
    }

    renderGrandAuto(owner, open) {
        let autoBtn = (0, this.deps.document).getElementById('btn-grand-breach-auto-enter');
        if (autoBtn) {
            autoBtn.style.display = open ? 'inline-block' : 'none';
            autoBtn.innerText = (0, this.deps._t)('대균열 자동입장 {value}', { value: owner.settings && owner.settings.autoEnterGrandBreach ? (0, this.deps._t)('켜짐') : (0, this.deps._t)('꺼짐') });
        }
    }

    async forfeitHive(owner) {
        const b = owner.beehive;
        if (!this.active || !b?.inRun || this.forfeits.has(b)) return;
        const context = { owner, b, queenRewards:b.pendingQueenRewards, season:owner.season, loop:owner.loopCount };
        this.forfeits.add(b);
        try {
            const confirmed = await (0, this.deps.requestGameConfirmation)((0, this.deps._t)('이미 받은 보상은 유지됩니다.\n아직 받지 않은 웨이브/여왕 보상은 사라지며, 입장 열쇠는 반환되지 않습니다.'), {
                title: (0, this.deps._t)('벌집 원정을 포기할까요?'), tone: 'danger', confirmLabel: (0, this.deps._t)('포기하고 귀환'), cancelLabel: (0, this.deps._t)('계속 탐험')
            });
            if (confirmed && this.forfeitCurrent(context)) {
                this.consume(this.bees.exit(owner, '벌집 원정을 포기하고 탈출했습니다.', 'attack-monster'));
            }
        } finally {
            this.forfeits.delete(b);
        }
    }

    forfeitCurrent({ owner, b, queenRewards, season, loop }) {
        return this.active && owner === this.deps.game && owner.beehive === b && b.inRun
            && b.pendingQueenRewards === queenRewards && owner.season === season && owner.loopCount === loop;
    }

    resolveChoice(owner, key, penalty, revision) {
        if (!this.active || !this.hive.accepts(owner, revision)) return;
        return this.consume(this.bees.resolve(owner, key, penalty));
    }

    consume(flow) {
        if (!this.active) return;
        const owner = this.deps.game;
        const effects = {log:(...args) => this.deps.addLog(...args), refresh:() => this.deps.updateStaticUI(),
            save:(...args) => this.deps.queueImportantSave(...args), close:(...args) => this.hive.close(owner, ...args), open:(...args) => this.hive.open(owner, ...args)};
        let step = flow.next();
        while (!step.done) {
            const effect = effects[step.value.kind];
            if (!effect) throw new Error('Unknown realm effect: '+step.value.kind);
            const result = effect(...step.value.args);
            if (!this.active || this.deps.game !== owner) { flow.return(); return; }
            step = flow.next(result);
        }
        return step.value;
    }

    dispose() { this.active = false; this.forfeits = new WeakSet(); }
}
