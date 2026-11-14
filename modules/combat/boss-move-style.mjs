import { BOSS_MOVE_STYLE_BY_VISUAL, BOSS_MOVE_INTRO, FAMILIES, BOSS_MOVE_NAMES, BOSS_MOVE_RULES } from './boss-move-values.mjs';
import { BOSS_ATTACK_IMPACT_DELAY_MS } from './core-values.mjs';
import { observerImpactMs } from './boss-move-geometry.mjs';

/** The boss's effect row (data/boss-fx.js): the look it shows on the stage (js/canvas-stage-roster.js actorFor), else its asset. */
    export function moveBossFxOf(env, enemy) {
        if (typeof env.deps.BOSS_FX !== 'object' || !enemy) return null;
        const roster = typeof env.deps.MONSTER_STAGE_ROSTER === 'object' ? env.deps.MONSTER_STAGE_ROSTER : null;
        const look = enemy.spriteVariantId || enemy.monsterVisualId;
        const id = (roster && roster.wears[look]) || look;
        return env.deps.BOSS_FX.actors[id] ? { id, row: env.deps.BOSS_FX.actors[id] }
            : (env.deps.BOSS_FX.actors[enemy.bossAssetKey] ? { id: enemy.bossAssetKey, row: env.deps.BOSS_FX.actors[enemy.bossAssetKey] } : null);
    }

export function moveStyleOf(env, enemy) {
        const visual = enemy?.monsterVisualId;
        return Object.hasOwn(BOSS_MOVE_STYLE_BY_VISUAL, visual)
            ? BOSS_MOVE_STYLE_BY_VISUAL[visual] : moveBossFxOf(env, enemy)?.row.kind ?? null;
    }

/** The first loops' special number n (1, 2, ...) of this boss: { label, telegraphKind }. */
    export function moveIntroSpecial(env, enemy, n) {
        const style = moveStyleOf(env, enemy), shapes = BOSS_MOVE_INTRO[style] || BOSS_MOVE_INTRO.none;
        const shape = shapes[(n - 1) % shapes.length];
        return { label: moveSpecialName(shape, style), telegraphKind: shape };
    }

/** How many special shapes this boss takes turns with (BOSS_MOVE_INTRO by its fighting style). */
    export function moveIntroCount(env, enemy) { return (BOSS_MOVE_INTRO[moveStyleOf(env, enemy)] || BOSS_MOVE_INTRO.none).length; }

export function moveFamilyShapes(env, enemy, family) {
        const shapes = BOSS_MOVE_INTRO[moveStyleOf(env, enemy)] || BOSS_MOVE_INTRO.none;
        const allowed = FAMILIES[family], matched = shapes.filter(shape => allowed.includes(shape));
        return matched.length ? matched : allowed;
    }

export function moveShapeLook(env, enemy, shape) { return { label: moveSpecialName(shape, moveStyleOf(env, enemy)), telegraphKind: shape }; }

export function moveSpecialName(shape, style) {
        const names = BOSS_MOVE_NAMES[shape];
        return typeof names === 'string' ? names : names[style] || names.other;
    }

export function moveMoveKind(area, telegraph, style) {
        if (telegraph === 'grind') return 'grind';
        if (area.kind === 'fan') return ['melee', 'ground'].includes(style) ? 'chain' : 'volley';
        if (area.kind === 'line') return telegraph === 'beam' ? 'beam' : 'chain';
        return area.kind === 'blast' ? moveBlastMove(area, style) : null;
    }

/** First impact after release, for a cast bar that ends at the actual hit rather than a fixed half second. */
    export function moveFirstImpactMs(env, state, enemy) {
        const area = state.area || enemy.patternArea;
        if (area?.woodsman) return area.woodsman.stages[0].ms;
        if (!area) return BOSS_ATTACK_IMPACT_DELAY_MS;
        if (area.observerMove) return observerImpactMs(area);
        const kind = moveMoveKind(area, state.telegraphKind, moveStyleOf(env, enemy));
        return kind ? BOSS_MOVE_RULES[kind].firstMs : BOSS_ATTACK_IMPACT_DELAY_MS;
    }

export function moveBlastMove(area, style) {
        if (area.shape === 'cross') return 'cross';
        if (area.shape === 'diamond' && area.radius >= 2) return 'rings';
        return area.radius >= 1 && style !== 'melee' ? 'scatter' : null;
    }
