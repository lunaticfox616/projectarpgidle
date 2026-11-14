import { LINGER_MS } from './boss-move-values.mjs';
import { observerCollapse, observerSeal } from './observer-floor-impact.mjs';

/** The boss lets the special go (queueEnemyCombatAttack): its first stage lands after the stage's own time. */
    export function moveBeginBossMove(env, attack, now) {
        const move = attack.bossPattern && attack.bossPattern.move;
        if (!move) return;
        move.releasedAt = now;
        attack.at = now + move.stages[0].ms;
        env.memory.live.push({ move, source: attack.source, element: env.deps.enemyAttackRules.element(attack.source, attack.bossPattern), endsAt: now + move.stages[move.stages.length - 1].ms + LINGER_MS });
    }

/** A volley's shots that hit someone this stage stop there (their later cells drop out). */
    export function moveSpendHitLanes(env, move, cells, now, ms) {
        for (const cell of cells) {
            const probe = { delivery: 'patternArea', bossPattern: { area: { cells: [cell] } } };
            if (move.spent.includes(cell.lane) || !env.deps.enemyAttackRules.impactTargets(probe, env.owner).length) continue;
            move.spent.push(cell.lane);
            move.hits.push({ lane: cell.lane, gx: cell.gx, gy: cell.gy, at: now, ms });
        }
    }

export function moveRestArea(env, pattern, move) {
        const cells = move.stages.slice(move.next).flatMap(stage => stage.cells).filter(cell => !move.spent.includes(cell.lane));
        const unique = new Map(cells.map(cell => [env.deps.gridCellKey(cell.gx, cell.gy), { gx: cell.gx, gy: cell.gy }]));
        return { ...pattern.area, cells: [...unique.values()] };
    }

/** The landing attack's stage (takePendingEnemyCombatAttack): its pattern becomes this stage's cells and damage, the rest goes back
     * in the queue. null when the attack has no move. { cells, burst }: burst → a ground burst (rings, cross, scatter: the slam's
     * flash, shake and sound). */
    export function* moveTakeBossMoveStage(env, attack, queue, now) {
        const pattern = attack.bossPattern, move = pattern && pattern.move;
        if (!move || move.next >= move.stages.length) return null;
        const stage = move.stages[move.next++], cells = stage.cells.filter(cell => !move.spent.includes(cell.lane));
        if (move.kind === 'volley') moveSpendHitLanes(env, move, cells, now, stage.ms);
        moveQueueRestOfMove(env, attack, move, queue);
        attack.bossPattern = { ...pattern, area: { ...pattern.area, cells: cells.map(cell => ({ gx: cell.gx, gy: cell.gy })) },
            damageMul: (Number(pattern.damageMul) || 1) * (stage.share || 1), isSpecial: pattern.isSpecial && move.next === 1 };
        if (move.observerMove === 'collapse') (yield* observerCollapse(env, attack, now));
        if (move.observerMove === 'seal') (yield* observerSeal(env, attack));
        return { cells, burst: ['rings', 'cross', 'scatter'].includes(move.kind) };
    }

/** The stages still to land go back in the queue as one attack (not a special any more: no cast bar, no second log line). A volley
     * whose every shot hit has nothing left. */
    export function moveQueueRestOfMove(env, attack, move, queue) {
        const rest = move.stages.slice(move.next), pattern = attack.bossPattern;
        if (!rest.length || (move.kind === 'volley' && move.spent.length >= moveLaneCount(move))) return;
        queue.push({ ...attack, at: move.releasedAt + rest[0].ms, bossPattern: { ...pattern, isSpecial: false, area: moveRestArea(env, pattern, move) } });
    }

export function moveLaneCount(move) { return new Set(move.stages.flatMap(stage => stage.cells.map(cell => cell.lane))).size; }

/** Moves still to draw (js/canvas-boss-moves.js): { move, source, element, endsAt }. */
    export function moveLiveBossMoves(env, now) {
        for (let i = env.memory.live.length - 1; i >= 0; i--) if (now > env.memory.live[i].endsAt || now < env.memory.live[i].move.releasedAt) env.memory.live.splice(i, 1);
        return env.memory.live;
    }

/** Cancel only stages that have not landed. Already drawn impacts finish their short tail. */
    export function moveCutBossMove(env, move, now) {
        if (!move) return;
        move.stages = move.stages.slice(0, move.next);
        move.cutAt = now;
        const at = env.memory.live.findIndex(row => row.move === move);
        if (at < 0) return;
        if (!move.stages.length) env.memory.live.splice(at, 1);
        else env.memory.live[at].endsAt = Math.min(env.memory.live[at].endsAt, now + LINGER_MS);
    }
