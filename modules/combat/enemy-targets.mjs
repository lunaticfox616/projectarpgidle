import { observerColorHits } from './boss-move-geometry.mjs';

export function attackControls(enemy) {
        const active = new Set((enemy.ailments || []).filter(ail => ail.time > 0).map(ail => ail.type));
        return {hard: active.has('freeze') || active.has('stun'), silence: active.has('silence')};
    }

export function attackDelivery(enemy, pattern) {
        if (pattern?.area) return 'patternArea';
        if (enemy.isSeveredWanderer && enemy.wandererDelivery) return enemy.wandererDelivery;
        if (enemy.attackKind !== 'ranged') return 'instantTarget';
        return enemy.attackDelivery || 'projectileTarget';
    }

/** One body, one attack clock. Only a consumed ordinary strike advances the attached head (0..2).
     * The shot owns its element: changing heads must not recolour the body or an already released shot. */
    export function attackCerberusAttack(enemy, pattern) {
        if (pattern.isSpecial || !enemy.isBoss || !Number.isInteger(enemy.cerberusHeadIndex)) return;
        pattern.cerberusHead = enemy.cerberusHeadIndex;
        pattern.attackElement = enemy.monsterVisualId === 'cerberus-head'
            ? ['fire', 'cold', 'fire'][pattern.cerberusHead] : enemy.ele;
        enemy.cerberusHeadIndex = (enemy.cerberusHeadIndex + 1) % 3;
    }

export function attackElement(enemy, pattern) { return pattern?.attackElement || enemy.ele || 'phys'; }

export function attackUnits(env, state) {
        const alive = state.playerHp > 0 ? [state.gridPlayer] : [];
        const targets=alive.concat(state.summons.filter(unit => unit.alive && !unit.isGhost && unit.hp > 0));
        if(state.currentZoneId==='colony_run' && state.colony?.inRun && state.colony.coreHp>0) {
            const core=env.deps.getCombatGridSize(state).colonyDefense?.core;
            if(core)targets.push({...core,isColonyCore:true});
        }
        return targets;
    }

export function attackImpactTargets(env, attack, state) {
        const alive = attackUnits(env, state);
        if (attack.delivery === 'projectileTarget' || attack.delivery === 'instantTarget') {
            if(attack.targetType==='colonyCore')return alive.filter(unit=>unit.isColonyCore);
            return alive.filter(unit => attack.targetType === 'player'
                ? unit === state.gridPlayer : !unit.isColonyCore && unit !== state.gridPlayer && unit.id === attack.targetId);
        }
        if (attack.delivery === 'patternArea') {
            return attackPatternTargets(env, attack.bossPattern.area, state, alive);
        }
        const cells = attack.impactCells || [attack.targetCell];
        for (const cell of cells) {
            const unit = alive.find(candidate => env.deps.hasGridCell(candidate)
                && env.deps.getGridUnitCells(candidate).some(p => p.gx === cell.gx && p.gy === cell.gy));
            if (unit) return [unit];
        }
        return [];
    }

export function attackPatternTargets(env, area, state, alive) {
        const keys = new Set(area.cells.map(cell => env.deps.gridCellKey(cell.gx, cell.gy)));
        const run = area.bands && env.deps.actExplorationState.current(state);
        return alive.filter(unit => {
            if (!env.deps.hasGridCell(unit)) return false;
            if (run && unit === state.gridPlayer) return observerColorHits(area, env.deps.actExplorationMotion.position(run, unit));
            return env.deps.isGridUnitInCellSet(unit, keys);
        });
    }
