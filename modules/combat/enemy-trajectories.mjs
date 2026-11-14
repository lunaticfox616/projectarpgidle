import { clampNumber } from '../common/numbers.mjs';
import { attackImpactTargets } from '../combat/enemy-targets.mjs';

export function attackFlightEnd(env, source, target, toEdge) {
        const dx = target.gx-source.gx, dy = target.gy-source.gy;
        if (!toEdge || (!dx && !dy)) return {...target};
        const size = env.deps.getCombatGridSize(), xLimit = dx > 0 ? size.columns-1 : 0;
        const yLimit = dy > 0 ? size.rows-1 : 0;
        const scale = Math.min(dx ? (xLimit-source.gx)/dx : Infinity,
            dy ? (yLimit-source.gy)/dy : Infinity);
        return {gx:source.gx+dx*scale,gy:source.gy+dy*scale};
    }

/** Segment/whole-tile intersection; touching only a corner is not a hit. */
    export function attackCellProgress(source, end, cell) {
        let enter = 0, leave = 1, projection = 0, lengthSq = 0;
        for (const axis of ['gx','gy']) {
            const delta = end[axis]-source[axis], relative = cell[axis]-source[axis];
            if (!delta && Math.abs(relative) > .5) return null;
            if (!delta) continue;
            const a = (relative-.5)/delta, b = (relative+.5)/delta;
            enter = Math.max(enter,Math.min(a,b));
            leave = Math.min(leave,Math.max(a,b));
            projection += relative*delta; lengthSq += delta*delta;
        }
        if (leave-enter <= 1e-9) return null;
        return lengthSq ? clampNumber(projection/lengthSq,enter,leave) : 1;
    }

/** Only the few cells between a long melee strike's endpoints; corner-only contacts follow projectile geometry. */
    export function attackOpenMeleeLine(source, end, terrain) {
        for (let gy = Math.min(source.gy,end.gy); gy <= Math.max(source.gy,end.gy); gy++) {
            for (let gx = Math.min(source.gx,end.gx); gx <= Math.max(source.gx,end.gx); gx++) {
                if (terrain.mask[gy*terrain.map.columns+gx]) continue;
                if (attackCellProgress(source,end,{gx,gy}) !== null) return false;
            }
        }
        return true;
    }

/** Long melee cannot reach through a wall or sealed gate; any in-range pair of occupied body cells may connect. */
    export function attackMeleeReach(env, enemy, target) {
        if (enemy.attackKind !== 'melee' || enemy.attackRange <= 1) return true;
        const terrain = env.deps.getGridPlacementTerrain();
        if (!terrain.map.tiles) return true;
        terrain.mask = env.deps.gridWalkMask(terrain.map,terrain.sealed);
        const targets = env.deps.getGridUnitCells(target);
        return env.deps.getGridUnitCells(enemy).some(source => targets.some(end =>
            env.deps.gridChebyshevDist(source.gx,source.gy,end.gx,end.gy) <= enemy.attackRange && attackOpenMeleeLine(source,end,terrain)));
    }

export function attackFlightCells(env, source, end) {
        const cells = [], size = env.deps.getCombatGridSize();
        for (let gy=0;gy<size.rows;gy++) {
            for (let gx=0;gx<size.columns;gx++) {
                if (gx === source.gx && gy === source.gy) continue;
                const progress = attackCellProgress(source,end,{gx,gy});
                if (progress !== null) cells.push({gx,gy,progress});
            }
        }
        return cells.sort((a,b) => a.progress-b.progress);
    }

export function attackConfigureFlight(attack, cells, duration) {
        attack.launchedAt = attack.at - duration;
        attack.endsAt = attack.at;
        attack.path = cells.map(cell => ({gx:cell.gx,gy:cell.gy,offsetMs:duration*cell.progress}));
        attack.pathIndex = 0;
        attack.at = attack.launchedAt + attack.path[0].offsetMs;
        return [{...attack.sourceCell,offsetMs:0}, {...attack.targetCell,offsetMs:duration}];
    }

export function attackTrajectory(env, attack, enemy, duration) {
        if (Number.isFinite(attack.bossPattern?.castStartedAt)) attack.castStartAt = attack.bossPattern.castStartedAt;
        enemy.attackCast = attack.delivery === 'patternArea' ? {startAt:attack.castStartAt,finishAt:attack.at,
            isSpecial:attack.bossPattern.isSpecial !== false,label:attack.bossPattern.label} : null;
        if (attack.delivery !== 'projectileCell') {
            const role = env.deps.MONSTER_COMBAT_ROLES.of(enemy);
            if (attack.delivery === 'magicCell' && role?.flightMs) {
                duration = Math.max(duration, role.flightMs);
                attack.at = env.deps.getCombatTime() + duration;
                attack.groundCell = true; // Transient rendering marker: this authored shot warns exactly its one impact tile.
            }
            return {duration};
        }
        attack.targetCell = attackFlightEnd(env, attack.sourceCell,attack.targetCell,enemy.projectileToEdge);
        let cells = attackFlightCells(env, attack.sourceCell,attack.targetCell);
        if (!cells.length) cells = [{...attack.targetCell,progress:1}];
        duration = env.deps.getCombatTravelMs(attack.sourceCell,attack.targetCell);
        attack.at = env.deps.getCombatTime() + duration;
        return {duration,path:attackConfigureFlight(attack,cells,duration)};
    }

export function attackAdvanceFlight(env, attack, state, now) {
        while (attack.pathIndex < attack.path.length) {
            const cell = attack.path[attack.pathIndex];
            attack.at = attack.launchedAt + cell.offsetMs;
            if (attack.at > now) return false;
            attack.pathIndex++;
            attack.impactCells = [cell];
            if (attackImpactTargets(env, attack,state).length) { attack.finished = true; return true; }
        }
        attack.impactCells = [];
        attack.at = attack.endsAt;
        if (now < attack.endsAt) return false;
        attack.finished = true;
        return true;
    }
