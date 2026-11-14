class BossAttackTiming {
    constructor(deps) {
        this.deps = deps;

        this.isHeld = enemy => (enemy.ailments || []).some(ailment => ['freeze', 'stun', 'silence'].includes(ailment.type) && ailment.time > 0);
        this.stepClock = -1;
        this.stepAt = 0;
    }

    isLiveWarning(enemy) {
        if (!enemy || !enemy.isBoss || enemy.noAttack || !(enemy.hp > 0) || !enemy.patternArea) return false;
        return !this.isHeld(enemy);
    }

    smoothCombatTime() {
        const combat = this.deps.getCombatTime(), now = this.deps.performance.now();
        if (this.deps.bossMoves.observer.sceneActive()) { this.stepClock = combat; this.stepAt = now; return combat; }
        if (combat !== this.stepClock) { this.stepClock = combat; this.stepAt = now; }
        const since = now - this.stepAt;
        return since < 150 ? combat + Math.min(100, since) : combat;
    }

    warningShare(enemy) {
        const started = Number(enemy && enemy.patternTelegraphStartedAt) || 0;
        if (!enemy || !enemy.patternTelegraphKey || !started) return null;
        return this.deps.clampNumber((this.smoothCombatTime() - started) / (enemy.nextPatternState?.warningMs || this.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs), 0, 1);
    }
}

export function createBossAttackTiming(deps) {
    const view=new BossAttackTiming(deps);
    return Object.freeze({ isLiveWarning: view.isLiveWarning.bind(view), warningShare: view.warningShare.bind(view), now: view.smoothCombatTime.bind(view), isHeld:view.isHeld });
}
