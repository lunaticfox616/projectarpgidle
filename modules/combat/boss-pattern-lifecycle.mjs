import { bossNormalizeAttackCount, bossRecoveryOf } from './boss-pattern-rules.mjs';
import { OWN_PATTERN_MODES, BOSS_PATTERN_NAMES } from './boss-pattern-values.mjs';
import { bossBuildPatternState } from './boss-pattern-states.mjs';
import { bossNoteBossSpecial } from './boss-special-plan.mjs';
import { BOSS_ATTACK_IMPACT_DELAY_MS } from './core-values.mjs';

export function bossGetOwnPatternState(env, mode, enemy, attackNumber) {
        if (mode === 'rootGrinder') return env.deps.roomInvaders.patternState(attackNumber);
        if (mode === 'cosmosBoss') {
            return typeof env.deps.cosmosBossPattern === 'function' ? env.deps.cosmosBossPattern(enemy.cosmosBossId, attackNumber) : null;
        }
        return env.deps.authoredAtlas ? env.deps.authoredAtlas.patternState(enemy.apexMechanic, attackNumber) : null;
    }

export function bossAuthoredBossPattern(env, enemy, attackNumber) { return env.deps.bossMoves.observer.pattern(enemy, attackNumber) || env.deps.bossMoves.shiftPattern(enemy, attackNumber); }

export function bossGetBossPatternPreview(env, enemy) {
        if (env.deps.woodsmanBattle.owns(enemy)) return env.deps.woodsmanBattle.preview(enemy);
        if (!enemy || !enemy.isBoss || !enemy.patternMode) return null;
        let attackNumber = bossNormalizeAttackCount(enemy) + 1;
        return bossAuthoredBossPattern(env, enemy, attackNumber) || bossModePatternState(env, enemy, attackNumber);
    }

/** The boss's own pattern mode when no authored cast (Veila, the woodsman's blink) takes this attack. */
    export function bossModePatternState(env, enemy, attackNumber) {
        let mode = String(enemy.patternMode);
        if (OWN_PATTERN_MODES.has(mode)) return bossGetOwnPatternState(env, mode, enemy, attackNumber);
        // 성좌 순환(우주계 보스)과 핵 폭주(운석 핵의 체력 절반 뒤): 같은 순환. 핵 폭주는 특수기 뒤 숨 고르기(recoveryOf)가 있다.
        if (mode === 'cosmos' || mode === 'coreFrenzy') {
            let cycle = ['burst', 'slam', 'ramp'];
            let resolvedMode = cycle[(attackNumber - 1) % cycle.length];
            let state = bossBuildPatternState(env, resolvedMode, enemy, attackNumber, true);
            if (!state) return null;
            state.patternMode = mode;
            state.label = `${BOSS_PATTERN_NAMES[mode]}, ${state.label}`;
            return state;
        }
        let state = bossBuildPatternState(env, mode, enemy, attackNumber, false);
        if (state) state.patternMode = mode;
        return state;
    }

export function bossConsumeBossPatternAttack(env, enemy) {
        let state = bossGetBossPatternPreview(env, enemy);
        if (!state) return null;
        if (enemy.patternArea) state.area = enemy.patternArea;
        bossNoteBossSpecial(enemy, state);
        env.deps.enemyAttackRules.cerberusAttack(enemy, state);
        env.deps.bossMoves.plan(state, enemy); // the special lands over time: shots, a beam, bursts one after another (js/boss-moves.js)
        const recovery = bossRecoveryOf(state);
        if (recovery) {
            const impactDelay = state.move ? state.move.stages.at(-1).ms : BOSS_ATTACK_IMPACT_DELAY_MS;
            enemy.apexRecoveryUntil = env.deps.getCombatTime() + impactDelay + recovery;
        }
        state.castStartedAt = enemy.patternTelegraphStartedAt;
        enemy.patternAttackCount = bossNormalizeAttackCount(enemy) + 1;
        enemy.nextPatternState = bossGetBossPatternPreview(env, enemy);
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        enemy.patternArea = null;
        return state;
    }

export function bossRefreshBossPatternPreview(env, enemy) {
        if (!enemy) return null;
        enemy.nextPatternState = bossGetBossPatternPreview(env, enemy);
        return enemy.nextPatternState;
    }
