class BossMoveTiming {
    constructor(deps) {
        this.deps = deps;


    }

    shiftAlpha(enemy) {
        const shift = this.deps.bossMoves.shiftOf(enemy);
        if (!shift) return 1;
        const now = this.deps.bossAttackView.now();
        return shift.landed ? this.deps.clampNumber((now - shift.landAt) / 180, 0, 1)
            : this.deps.clampNumber((shift.landAt - 100 - now) / 160, 0, 1);
    }

    heldSide(enemy) {
        const shift = enemy && this.deps.bossMoves.shiftOf(enemy);
        if (shift && (!shift.released || this.deps.getCombatTime() < shift.releasedAt + 800)) {
            return shift.target.gx < this.deps.getGridUnitCenter(enemy).gx ? 'west' : 'east';
        }
        if (!enemy || !enemy.roomInvader) return null;
        const cells = this.grindCells(enemy, this.deps.bossAttackView.now());
        if (!cells) return null;
        return cells.reduce((sum, cell) => sum + cell.gx, 0) / cells.length < this.deps.getGridUnitCenter(enemy).gx ? 'west' : 'east';
    }

    grindCells(enemy, now) {
        if (enemy.patternArea) return enemy.patternArea.cells;
        const entry = this.deps.bossMoves.live(now).find(row => row.source === enemy && row.move.kind === 'grind');
        const stages = entry ? entry.move.stages : [];
        return stages.length && now <= entry.move.releasedAt + stages[stages.length - 1].ms ? stages[0].cells : null;
    }

    strikeHoldMs(enemy) {
        const entry = this.deps.bossMoves.live(this.deps.bossAttackView.now()).find(row => row.source === enemy && row.move.kind === 'beam');
        if (!entry) return 0;
        const stages = entry.move.stages;
        return stages[stages.length - 1].ms + this.deps.BOSS_MOVE_RULES.beam.tickMs;
    }
}

export function createBossMoveTiming(deps) {
    const view=new BossMoveTiming(deps);
    return Object.freeze({ heldSide:view.heldSide.bind(view), strikeHoldMs:view.strikeHoldMs.bind(view), shiftAlpha:view.shiftAlpha.bind(view) });
}
