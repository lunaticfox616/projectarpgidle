export class SideEncounterActions {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.colonyWithdrawPending = null;
        this.grandWithdrawPending = null;
    }

    toggleColonyReturn() {
        if (!this.active) return;
        if (this.deps.colonyRun.toggleReturn()) (0, this.deps.updateStaticUI)();
    }

    returnFromBattle() {
        if (!this.active) return false;
        if (this.deps.game.currentZoneId === 'colony_run' && this.deps.game.colony.inRun) return this.withdrawColony();
        if (this.deps.game.currentZoneId === 'grand_breach_run' && this.deps.game.voidRift.grandRun?.inRun) return this.withdrawGrandBreach();
        return (0, this.deps.returnToTown)();
    }

    pendingCurrent(view) {
        return !!view && this.active && view.owner === this.deps.game && view.run === this.deps.game.actExploration;
    }

    withdrawalPending() {
        return this.pendingCurrent(this.colonyWithdrawPending) || this.pendingCurrent(this.grandWithdrawPending);
    }

    withdrawalCurrent(view, encounter, zoneId, stage) {
        return this.deps.game === view.owner && encounter === view.encounter && encounter.inRun && this.deps.game.currentZoneId === zoneId
            && this.deps.game.actExploration === view.run && stage === view.stage && JSON.stringify(encounter.pendingLoot) === view.held;
    }

    async withdrawGrandBreach() {
        if (!this.active) return false;
        const grand = this.deps.game.voidRift.grandRun;
        if (this.pendingCurrent(this.grandWithdrawPending) || !grand?.inRun || this.deps.game.currentZoneId !== 'grand_breach_run') return false;
        if (grand.phase === 'loot') { (0, this.deps.returnToTown)(); return true; }
        const view = { owner: this.deps.game, encounter: grand, run: this.deps.game.actExploration, stage: grand.phase, held: JSON.stringify(grand.pendingLoot) };
        const message = grand.pendingLoot.length ? (0, this.deps._t)('보관 전리품 {length}묶음을 포기하고 귀환할까요?', { length: grand.pendingLoot.length }) : '대균열을 포기하고 귀환할까요?';
        return this.confirmGrandWithdrawal(view, message);
    }

    async confirmGrandWithdrawal(view, message) {
        this.grandWithdrawPending = view;
        try {
            const accepted = await (0, this.deps.requestGameConfirmation)(message, { kicker: (0, this.deps._t)('대균열'), title: (0, this.deps._t)('원정 포기'), tone: 'danger', confirmLabel: (0, this.deps._t)('포기'), cancelLabel: (0, this.deps._t)('계속 전투'), dismissOnBackdrop: false });
            if (!accepted || !this.active) return false;
            if (!this.withdrawalCurrent(view, this.deps.game.voidRift.grandRun, 'grand_breach_run', this.deps.game.voidRift.grandRun?.phase)) {
                (0, this.deps.addLog)((0, this.deps._t)('원정 상태가 바뀌었습니다. 다시 확인하세요.'), 'attack-monster'); return false;
            }
            (0, this.deps.returnToTown)();
            return true;
        } finally {
            if (this.grandWithdrawPending === view) this.grandWithdrawPending = null;
        }
    }

    async withdrawColony() {
        if (!this.active) return false;
        const colony = this.deps.game.colony;
        if (this.pendingCurrent(this.colonyWithdrawPending) || !colony.inRun || this.deps.game.currentZoneId !== 'colony_run') return false;
        const view = { owner: this.deps.game, encounter: colony, run: this.deps.game.actExploration, stage: colony.wave, held: JSON.stringify(colony.pendingLoot) };
        const message = colony.pendingLoot.length ? (0, this.deps._t)('보관 전리품 {length}묶음을 포기하고 철수할까요?', { length: colony.pendingLoot.length }) : '군락지에서 철수할까요?';
        this.colonyWithdrawPending = view;
        try {
            const accepted = await (0, this.deps.requestGameConfirmation)(message,
                { title: (0, this.deps._t)('군락지 철수'), confirmLabel: (0, this.deps._t)('철수'), cancelLabel: (0, this.deps._t)('취소'), dismissOnBackdrop: false });
            if (!accepted || !this.active) return false;
            if (!this.withdrawalCurrent(view, this.deps.game.colony, 'colony_run', this.deps.game.colony.wave)) { (0, this.deps.addLog)((0, this.deps._t)('군락지 원정이 바뀌었습니다. 다시 확인하세요.'), 'attack-monster'); return false; }
            (0, this.deps.forfeitColonyRun)();
            return true;
        } finally {
            if (this.colonyWithdrawPending === view) this.colonyWithdrawPending = null;
        }
    }

    dispose() {
        this.active = false;
        this.colonyWithdrawPending = null;
        this.grandWithdrawPending = null;
    }
}
