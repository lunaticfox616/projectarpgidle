/** Enemy attack geometry and cast state. Hit delivery never bypasses stat evasion.
 * Transient flight: path cells carry offsetMs from launch; pathIndex is the next unchecked cell.
 * Collision cells are sampled on the exact ray; canvas interpolates only its two endpoints.
 * Only the combat tick advances collision, never the renderer.
 * attackCastMs is windup timing, not attack strength. Authored non-boss specials opt in with
 * attackCastSpecial; transient attackCast.isSpecial shares the boss-pattern distinction.
 */
const enemyAttackRules = (() => {
    function controls(enemy) {
        const active = new Set((enemy.ailments || []).filter(ail => ail.time > 0).map(ail => ail.type));
        return {hard: active.has('freeze') || active.has('stun'), silence: active.has('silence')};
    }

    function delivery(enemy, pattern) {
        if (pattern?.area) return 'patternArea';
        if (enemy.isSeveredWanderer && enemy.wandererDelivery) return enemy.wandererDelivery;
        if (enemy.attackKind !== 'ranged') return 'instantTarget';
        return enemy.attackDelivery || 'projectileTarget';
    }

    function units(state) {
        const alive = state.playerHp > 0 ? [state.gridPlayer] : [];
        return alive.concat(state.summons.filter(unit => unit.alive && !unit.isGhost && unit.hp > 0));
    }

    function impactTargets(attack, state) {
        const alive = units(state);
        if (attack.delivery === 'projectileTarget' || attack.delivery === 'instantTarget') {
            return alive.filter(unit => attack.targetType === 'player'
                ? unit === state.gridPlayer : unit !== state.gridPlayer && unit.id === attack.targetId);
        }
        if (attack.delivery === 'patternArea') {
            const keys = new Set(attack.bossPattern.area.cells.map(cell => gridCellKey(cell.gx, cell.gy)));
            return alive.filter(unit => hasGridCell(unit) && isGridUnitInCellSet(unit, keys));
        }
        const cells = attack.impactCells || [attack.targetCell];
        for (const cell of cells) {
            const unit = alive.find(candidate => hasGridCell(candidate)
                && getGridUnitCells(candidate).some(p => p.gx === cell.gx && p.gy === cell.gy));
            if (unit) return [unit];
        }
        return [];
    }

    function flightEnd(source, target, toEdge) {
        const dx = target.gx-source.gx, dy = target.gy-source.gy;
        if (!toEdge || (!dx && !dy)) return {...target};
        const xLimit = dx > 0 ? COMBAT_GRID_CONFIG.columns-1 : 0;
        const yLimit = dy > 0 ? COMBAT_GRID_CONFIG.rows-1 : 0;
        const scale = Math.min(dx ? (xLimit-source.gx)/dx : Infinity,
            dy ? (yLimit-source.gy)/dy : Infinity);
        return {gx:source.gx+dx*scale,gy:source.gy+dy*scale};
    }

    /** Segment/whole-tile intersection; touching only a corner is not a hit. */
    function cellProgress(source, end, cell) {
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

    function flightCells(source, end) {
        const cells = [];
        for (let gy=0;gy<COMBAT_GRID_CONFIG.rows;gy++) {
            for (let gx=0;gx<COMBAT_GRID_CONFIG.columns;gx++) {
                if (gx === source.gx && gy === source.gy) continue;
                const progress = cellProgress(source,end,{gx,gy});
                if (progress !== null) cells.push({gx,gy,progress});
            }
        }
        return cells.sort((a,b) => a.progress-b.progress);
    }

    function configureFlight(attack, cells, duration) {
        attack.launchedAt = attack.at - duration;
        attack.endsAt = attack.at;
        attack.path = cells.map(cell => ({gx:cell.gx,gy:cell.gy,offsetMs:duration*cell.progress}));
        attack.pathIndex = 0;
        attack.at = attack.launchedAt + attack.path[0].offsetMs;
        return [{...attack.sourceCell,offsetMs:0}, {...attack.targetCell,offsetMs:duration}];
    }

    function trajectory(attack, enemy, duration) {
        if (Number.isFinite(attack.bossPattern?.castStartedAt)) attack.castStartAt = attack.bossPattern.castStartedAt;
        enemy.attackCast = attack.delivery === 'patternArea' ? {startAt:attack.castStartAt,finishAt:attack.at,
            isSpecial:attack.bossPattern.isSpecial !== false,label:attack.bossPattern.label} : null;
        if (attack.delivery !== 'projectileCell') return {duration};
        attack.targetCell = flightEnd(attack.sourceCell,attack.targetCell,enemy.projectileToEdge);
        let cells = flightCells(attack.sourceCell,attack.targetCell);
        if (!cells.length) cells = [{...attack.targetCell,progress:1}];
        duration = getCombatTravelMs(attack.sourceCell,attack.targetCell);
        attack.at = getCombatTime() + duration;
        return {duration,path:configureFlight(attack,cells,duration)};
    }

    function advanceFlight(attack, state, now) {
        while (attack.pathIndex < attack.path.length) {
            const cell = attack.path[attack.pathIndex];
            attack.at = attack.launchedAt + cell.offsetMs;
            if (attack.at > now) return false;
            attack.pathIndex++;
            attack.impactCells = [cell];
            if (impactTargets(attack,state).length) { attack.finished = true; return true; }
        }
        attack.impactCells = [];
        attack.at = attack.endsAt;
        if (now < attack.endsAt) return false;
        attack.finished = true;
        return true;
    }

    /** Freeze/stun stop actions; silence stops specials/casts. Released flights are independent. */
    function interrupt(enemy, now) {
        const cc = controls(enemy);
        const special = enemy.nextPatternState?.isSpecial || enemy.attackCast || enemy.attackCastMs > 0;
        if (!cc.hard && !(cc.silence && special)) return false;
        enemy.castInterruptedAt = now;
        clearInterruptedCast(enemy, now);
        return true;
    }

    function clearInterruptedCast(enemy, now) {
        if (enemy.patternTelegraphKey || enemy.attackCast) {
            enemy.castInterruptedUntil = enemy.nextPatternState?.isSpecial || enemy.attackCast?.isSpecial ? now + 650 : 0;
            enemy.attackTimer = 0;
        }
        enemy.attackCast = null;
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        enemy.patternArea = null;
    }

    function cancelPending(attack, now) {
        if (attack.delivery !== 'patternArea') return false;
        const cc = controls(attack.source);
        const interrupted = Number.isFinite(attack.source.castInterruptedAt) && attack.source.castInterruptedAt >= attack.castStartAt;
        if (!cc.hard && !cc.silence && !interrupted && attack.source.hp > 0) return false;
        attack.source.castInterruptedUntil = attack.bossPattern.isSpecial !== false ? now + 650 : 0;
        attack.source.attackTimer = 0;
        attack.source.attackCast = null;
        return true;
    }

    function ready(enemy, now, target) {
        if (!enemy.attackCastMs || enemy.isBoss) return true;
        if (!enemy.attackCast && enemy.attackTimer >= 1) {
            enemy.attackCast = {startAt:now, finishAt:now+enemy.attackCastMs,
                isSpecial:enemy.attackCastSpecial === true,
                targetCell:{gx:target.gx,gy:target.gy}};
        }
        return !!enemy.attackCast && now >= enemy.attackCast.finishAt;
    }

    function activeCast(enemy, pending) {
        if (pending?.delivery === 'patternArea' && pending.bossPattern.isSpecial !== false) {
            return {label:pending.bossPattern.label,startAt:pending.castStartAt,finishAt:pending.at};
        }
        if (!enemy.attackCast?.isSpecial) return null;
        return {...enemy.attackCast,label:enemy.attackCast.label || enemy.attackLabel || '강력한 공격'};
    }

    function castBar(enemy, now, pending) {
        if (enemy.hp <= 0) return null;
        if (enemy.castInterruptedUntil > now) return {label:'시전 취소',progress:0,cancelled:true};
        const cc = controls(enemy);
        if (cc.hard || cc.silence) return null;
        const cast = activeCast(enemy,pending);
        if (cast && now < cast.finishAt) return {label:cast.label,
            progress:clampNumber((now-cast.startAt)/Math.max(1,cast.finishAt-cast.startAt),0,1)};
        return warningBar(enemy,now);
    }

    function warningBar(enemy,now) {
        if (!enemy.nextPatternState?.isSpecial || !enemy.patternTelegraphKey || !enemy.patternArea) return null;
        return {label:enemy.nextPatternState?.label || '강력한 공격',
            progress:clampNumber(Math.min(enemy.attackTimer,(now-enemy.patternTelegraphStartedAt)/(COMBAT_GRID_CONFIG.bossPatternWarningMs+BOSS_ATTACK_IMPACT_DELAY_MS)),0,1)};
    }

    return {delivery,impactTargets,trajectory,advanceFlight,interrupt,cancelPending,ready,castBar};
})();
safeExposeGlobals({enemyAttackRules});
