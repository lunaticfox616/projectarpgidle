import { bossPlanBossSpecial, bossStyleSpecialPlan } from './boss-special-plan.mjs';
import { BOSS_PATTERN_NAMES } from './boss-pattern-values.mjs';
import { bossGetBossPatternPeakDamageMultiplier, bossGetRampStage } from './boss-pattern-rules.mjs';

// 처음 루프의 보스(2026-10-06 사용자 요청 "패턴이 너무 허접"): 한 칸 강타만 되풀이하던 것을 2026-10-16부터는 보스의 싸우는 방식
    // (data/boss-fx.js kind)마다 세 모양 가운데 하나를 고른다(js/boss-moves.js intro: 근접은 강타, 연쇄 폭발, 이중 파동; 원거리는 강타,
    // 갈래 사격, 관통 광선 등). 쓰는 때와 모양은 planBossSpecial이 굴린다. 피해 배율은 그대로(1.15).
    export function bossBuildSlamPatternState(env, mode, attackNumber, cosmosPattern, enemy) {
        let plan = mode === 'intro' ? bossPlanBossSpecial(enemy, attackNumber, env.deps.bossMoves.introCount(enemy)) : bossStyleSpecialPlan(env, enemy, attackNumber, 'area');
        let special = cosmosPattern || plan.special;
        let intro = mode === 'intro' && special ? env.deps.bossMoves.intro(enemy, Math.max(0, plan.shape) + 1) : null;
        if (mode === 'slam' && !cosmosPattern && special) intro = plan;
        return { mode, ...bossSlamLook(env, mode, special, intro, cosmosPattern), isSpecial: special, shapeIndex: cosmosPattern ? -1 : plan.shape, attackNumber };
    }

/** The name, damage and warning shape of a 파쇄 강타 or first-loop attack: a plain heavy blow, or the special (the boss's own shape for intro). */
    export function bossSlamLook(env, mode, special, intro, cosmosPattern) {
        if (!special) return { label: env.deps._t('무거운 일격'), damageMul: 1, telegraphKind: 'ring' };
        return { label: intro ? intro.label : BOSS_PATTERN_NAMES[mode], damageMul: bossGetBossPatternPeakDamageMultiplier(cosmosPattern ? 'cosmos' : mode),
            telegraphKind: intro ? intro.telegraphKind : 'ring' };
    }

// 격앙(루프 6부터): 2단계(생명력 42% 잃음) 전에는 예고 공격이 없어 루프 6 보스가 루프 1 보스보다 밋밋했다(2026-10-06).
    // 그 전에도 3번째 공격마다 충격파를 낸다. 배율은 단계 그대로라 0단계 충격파는 보통 공격과 같은 피해다.
    export function bossBuildRampPatternState(env, enemy, attackNumber, cosmosPattern) {
        let stage = bossGetRampStage(enemy);
        let cosmosStage = cosmosPattern ? Math.max(1, stage) : stage;
        const plan = bossStyleSpecialPlan(env, enemy, attackNumber, 'area');
        return {
            mode: 'ramp',
            label: cosmosStage > 0 ? env.deps._t('격앙 {value}', { value: 'ⅠⅡⅢ'[Math.min(2, cosmosStage - 1)] }) : '격앙 전조',
            damageMul: cosmosPattern ? 1.12 : (1 + stage * 0.07),
            isSpecial: cosmosPattern || plan.special,
            telegraphKind: cosmosPattern ? 'pulse' : (plan.telegraphKind || 'pulse'),
            shapeIndex: cosmosPattern ? -1 : plan.shape,
            stage,
            attackNumber
        };
    }

export function bossBuildPatternState(env, mode, enemy, attackNumber, cosmosPattern) {
        if (mode === 'burst') return bossBuildBurstPatternState(env, enemy, attackNumber, cosmosPattern);
        if (mode === 'slam' || mode === 'intro') {
            return bossBuildSlamPatternState(env, mode, attackNumber, cosmosPattern, enemy);
        }
        if (mode === 'ramp') return bossBuildRampPatternState(env, enemy, attackNumber, cosmosPattern);
        return null;
    }

export function bossBuildBurstPatternState(env, enemy, attackNumber, cosmosPattern) {
        const plan = bossStyleSpecialPlan(env, enemy, attackNumber, 'ray'), special = cosmosPattern || plan.special;
        return { mode: 'burst', label: special ? plan.label || '연속 참격' : '빠른 베기',
            damageMul: special ? (cosmosPattern ? 1.18 : bossGetBossPatternPeakDamageMultiplier('burst')) : 1,
            isSpecial: special, telegraphKind: cosmosPattern ? 'fan' : (plan.telegraphKind || 'fan'),
            shapeIndex: cosmosPattern ? -1 : plan.shape, attackNumber };
    }
