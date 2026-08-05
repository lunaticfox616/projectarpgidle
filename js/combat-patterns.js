(function () {
    'use strict';

    const BOSS_PATTERN_NAMES = Object.freeze({
        burst: '연속 참격',
        slam: '파쇄 강타',
        ramp: '격앙',
        cosmos: '성좌 순환'
    });
    const BOSS_PATTERN_DESCRIPTIONS = Object.freeze({
        burst: '4번째 공격마다 연속 참격으로 피해가 30% 증가합니다.',
        slam: '3번째 공격마다 파쇄 강타로 피해가 55% 증가합니다.',
        ramp: '생명력이 낮아질수록 최대 3단계까지 격앙하여 공격 피해가 증가합니다.',
        cosmos: '연속 참격·파쇄 강타·격앙을 차례로 순환합니다.'
    });
    const BOSS_SPECIAL_TELEGRAPH_MIN_MS = 360;

    function normalizeAttackCount(enemy) {
        return Math.max(0, Math.floor(Number(enemy && enemy.patternAttackCount) || 0));
    }

    function getRampStage(enemy) {
        let maxHp = Math.max(1, Number(enemy && enemy.maxHp) || 1);
        let hp = Math.max(0, Math.min(maxHp, Number(enemy && enemy.hp) || 0));
        let missingRatio = 1 - (hp / maxHp);
        if (missingRatio >= 0.72) return 3;
        if (missingRatio >= 0.42) return 2;
        if (missingRatio >= 0.18) return 1;
        return 0;
    }

    function buildPatternState(mode, enemy, attackNumber, cosmosPattern) {
        if (mode === 'burst') {
            let special = cosmosPattern || attackNumber % 4 === 0;
            return {
                mode,
                label: special ? '연속 참격' : '빠른 베기',
                damageMul: special ? (cosmosPattern ? 1.18 : 1.30) : 1,
                isSpecial: special,
                telegraphKind: 'fan',
                attackNumber
            };
        }
        if (mode === 'slam') {
            let special = cosmosPattern || attackNumber % 3 === 0;
            return {
                mode,
                label: special ? '파쇄 강타' : '무거운 일격',
                damageMul: special ? (cosmosPattern ? 1.34 : 1.55) : 1,
                isSpecial: special,
                telegraphKind: 'ring',
                attackNumber
            };
        }
        if (mode === 'ramp') {
            let stage = getRampStage(enemy);
            let cosmosStage = cosmosPattern ? Math.max(1, stage) : stage;
            return {
                mode,
                label: cosmosStage > 0 ? `격앙 ${'ⅠⅡⅢ'[Math.min(2, cosmosStage - 1)]}` : '격앙 전조',
                damageMul: cosmosPattern ? 1.12 : (1 + stage * 0.07),
                isSpecial: cosmosPattern || stage >= 2,
                telegraphKind: 'pulse',
                stage,
                attackNumber
            };
        }
        return null;
    }

    function getBossPatternPreview(enemy) {
        if (!enemy || !enemy.isBoss || !enemy.patternMode) return null;
        let attackNumber = normalizeAttackCount(enemy) + 1;
        let mode = String(enemy.patternMode);
        if (mode === 'cosmos') {
            let cycle = ['burst', 'slam', 'ramp'];
            let resolvedMode = cycle[(attackNumber - 1) % cycle.length];
            let state = buildPatternState(resolvedMode, enemy, attackNumber, true);
            if (!state) return null;
            state.patternMode = 'cosmos';
            state.label = `성좌 순환 · ${state.label}`;
            return state;
        }
        let state = buildPatternState(mode, enemy, attackNumber, false);
        if (state) state.patternMode = mode;
        return state;
    }

    function consumeBossPatternAttack(enemy) {
        let state = getBossPatternPreview(enemy);
        if (!state) return null;
        enemy.patternAttackCount = normalizeAttackCount(enemy) + 1;
        enemy.lastPatternState = state;
        enemy.nextPatternState = getBossPatternPreview(enemy);
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        return state;
    }

    function refreshBossPatternPreview(enemy) {
        if (!enemy) return null;
        enemy.nextPatternState = getBossPatternPreview(enemy);
        return enemy.nextPatternState;
    }

    function getBossPatternModeLabel(mode) {
        return BOSS_PATTERN_NAMES[String(mode || '')] || '';
    }

    function getBossPatternDescription(mode) {
        return BOSS_PATTERN_DESCRIPTIONS[String(mode || '')] || '';
    }

    function updateBossPatternTelegraph(enemy, now) {
        if (!enemy || !enemy.isBoss) return true;
        let state = enemy.nextPatternState || getBossPatternPreview(enemy);
        if (!state || !state.isSpecial) {
            enemy.patternTelegraphKey = null;
            enemy.patternTelegraphStartedAt = 0;
            return true;
        }
        let charge = Math.max(0, Number(enemy.attackTimer) || 0);
        let key = `${state.patternMode || state.mode}:${state.attackNumber}:${state.label}`;
        if (charge < 0.5) {
            if (enemy.patternTelegraphKey !== key) {
                enemy.patternTelegraphKey = null;
                enemy.patternTelegraphStartedAt = 0;
            }
            return false;
        }
        let timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
        if (enemy.patternTelegraphKey !== key) {
            enemy.patternTelegraphKey = key;
            enemy.patternTelegraphStartedAt = timestamp;
        }
        return charge >= 1 && timestamp - Math.max(0, Number(enemy.patternTelegraphStartedAt) || 0) >= BOSS_SPECIAL_TELEGRAPH_MIN_MS;
    }

    safeExposeGlobals({
        getBossPatternPreview,
        consumeBossPatternAttack,
        refreshBossPatternPreview,
        getBossPatternModeLabel,
        getBossPatternDescription,
        updateBossPatternTelegraph
    });
}());
