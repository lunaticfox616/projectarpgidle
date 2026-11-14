import { woodContains, woodPoint, woodBounds, woodCellsIn } from './woodsman-geometry.mjs';
import { stumpPatternCells } from './stump-occupancy.mjs';
import { stumpWarning } from './stump-installation.mjs';
import { woodShelter } from './woodsman-shelter.mjs';
import { woodCoverEvents, woodEvents, woodMirrorEvent } from './woodsman-events.mjs';
import { woodElement } from './woodsman-state.mjs';

export function woodStagesFor(event, box, all, id) {
        const moving = ['annulus', 'front', 'sidefront'].includes(event.kind);
        const samples = moving ? Array.from({ length: Math.ceil((event.duration - 120) / 100) }, (_, i) => 120 + i * 100) : [160];
        return samples.map(age => ({ ms: event.at + age, eventId: id,
            cells: all.filter(c => woodContains(event, woodPoint(c, box), age)).map(c => ({ ...c, lane: id })) })).filter(s => s.cells.length);
    }

export function woodWarning(env, enemy, state, target, now) {
        const box = woodBounds(env, enemy), excluded = stumpPatternCells(env), variant = Math.floor(Math.random() * 18);
        const keysBlocked = new Set(excluded.map(c => env.deps.gridCellKey(c.gx, c.gy)));
        let all = woodCellsIn(env, box).filter(c => !keysBlocked.has(env.deps.gridCellKey(c.gx, c.gy)));
        if (state.woodsmanType === 'stump') return stumpWarning(env, enemy, state, now, box);
        const cover = woodShelter(enemy, state.woodsmanType, variant, all, box);
        if (cover) {
            const safe = new Set(cover.cells.map(c => env.deps.gridCellKey(c.gx, c.gy)));
            all = all.filter(c => !safe.has(env.deps.gridCellKey(c.gx, c.gy)));
        }
        const rows = cover ? woodCoverEvents(state.woodsmanType, cover) : woodEvents(state.woodsmanType, woodPoint(target, box), variant);
        if (variant % 2 && ['spire', 'nova', 'cleave'].includes(state.woodsmanType)) rows.forEach(woodMirrorEvent);
        const groups = new Map();
        for (const row of rows.flatMap((e, id) => woodStagesFor(e, box, all, id))) {
            if (!groups.has(row.ms)) groups.set(row.ms, { ms: row.ms, cells: [] });
            groups.get(row.ms).cells.push(...row.cells);
        }
        const stages = [...groups.values()].sort((a, b) => a.ms - b.ms);
        const keys = new Map(stages.flatMap(s => s.cells).map(c => [env.deps.gridCellKey(c.gx, c.gy), c]));
        const cast = { type: state.woodsmanType, motion: state.motion, element: woodElement(env, enemy),
            startedAt: now, warningMs: state.warningMs, attackNumber: state.attackNumber, box, events: rows, stages, variant, excluded, cover };
        return { kind: 'woodsman', cells: [...keys.values()], source: { gx: enemy.gx, gy: enemy.gy }, woodsman: cast };
    }

export function woodPlan(state) {
        const cast = state.area.woodsman;
        state.attackElement = cast.element;
        state.move = { kind: 'woodsman', source: state.area.source, stages: cast.stages, next: 0, spent: [], hits: [], releasedAt: 0, cast };
        return state.move;
    }

/** Called once by the combat resolver, after its normal occupant query. Each wave/burst hits each target only once. */
    export function woodTakeTargets(env, attack, targets) {
        const move = attack.bossPattern?.move;
        if (move?.kind !== 'woodsman') return targets;
        if (move.cast.type === 'stump') return [];
        const stage = move.stages[move.next - 1];
        const blocked = new Set(stumpPatternCells(env).map(c => env.deps.gridCellKey(c.gx, c.gy)));
        return targets.filter(unit => {
            const cells = env.deps.getGridUnitCells(unit);
            const hit = stage.cells.find(c => !blocked.has(env.deps.gridCellKey(c.gx, c.gy))
                && cells.some(p => p.gx === c.gx && p.gy === c.gy));
            if (!hit) return false;
            const eventId = hit.lane;
            const key = `${eventId}:${unit === env.owner.gridPlayer ? 'player' : unit.id}`;
            if (move.hits.includes(key)) return false;
            move.hits.push(key);
            return true;
        });
    }

export function woodWarningCells(cast, now, release) {
        const elapsed = now - (release ?? cast.startedAt + cast.warningMs);
        const next = cast.stages.find(row => row.ms >= elapsed);
        if (!next) return [];
        return cast.stages.filter(row => row.ms >= elapsed && row.ms <= Math.max(0, elapsed) + 500)
            .flatMap(row => row.cells);
    }
