import { BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS, OWN_PATTERN_MODES, SPECIAL_RECOVERY_MS, CORE_FRENZY_RECOVERY_SHARE, BOSS_PATTERN_NAMES, BOSS_PATTERN_DESCRIPTIONS } from './boss-pattern-values.mjs';

export function bossGetBossPatternPeakDamageMultiplier(mode) {
        return BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS[String(mode || '')] || 1;
    }

export function bossGetMaximumBossPatternDamageMultiplier() {
        return Math.max(...Object.values(BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS));
    }

export function bossGetBossPatternModesForLoop(loopValue) {
        const loop = Math.max(1, Math.floor(Number(loopValue) || 1));
        if (loop < 6) return ['intro'];
        if (loop === 6) return ['ramp'];
        if (loop === 7) return ['ramp', 'burst'];
        return ['ramp', 'burst', 'slam'];
    }

export function bossGetMaximumBossPatternDamageMultiplierForLoop(loopValue) {
        const modes = bossGetBossPatternModesForLoop(loopValue);
        if (modes.length === 0) return 1;
        return Math.max(...modes.map(bossGetBossPatternPeakDamageMultiplier));
    }

export function bossNormalizeAttackCount(enemy) {
        return Math.max(0, Math.floor(Number(enemy && enemy.patternAttackCount) || 0));
    }

export function bossGetRampStage(enemy) {
        let maxHp = Math.max(1, Number(enemy && enemy.maxHp) || 1);
        let hp = Math.max(0, Math.min(maxHp, Number(enemy && enemy.hp) || 0));
        let missingRatio = 1 - (hp / maxHp);
        if (missingRatio >= 0.72) return 3;
        if (missingRatio >= 0.42) return 2;
        if (missingRatio >= 0.18) return 1;
        return 0;
    }

export function bossRecoveryOf(state) { return state.recoveryMs ?? (state.isSpecial && !OWN_PATTERN_MODES.has(state.patternMode)
        && state.patternMode !== 'cosmos' ? (SPECIAL_RECOVERY_MS[state.mode] || 0) * (state.patternMode === 'coreFrenzy' ? CORE_FRENZY_RECOVERY_SHARE : 1) : 0); }

export function bossGetBossPatternModeLabel(mode) {
        return BOSS_PATTERN_NAMES[String(mode || '')] || '';
    }

export function bossGetBossPatternDescription(mode) {
        return BOSS_PATTERN_DESCRIPTIONS[String(mode || '')] || '';
    }

/** How long a special warns (ms): its own (a final boss combo, js/atlas-endgame.js comboState) or the shared default. */
    export function bossWarningDuration(env, state) { return state.warningMs || env.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs; }

/** 정점, 우주 보스는 새 후딜이 없어 예전 시계 그대로다: 게이지 절반에서 예고하고 게이지가 찬 뒤에 쓴다(앞당겨 예고하면 공격이 9~18% 잦아졌다). */
    export function bossKeepsOldClock(state) { return OWN_PATTERN_MODES.has(state.patternMode) || state.patternMode === 'cosmos'; }
