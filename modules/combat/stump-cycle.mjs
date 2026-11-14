import { stumpOwner, stumpLivingAdds, stumpFootprintCells, stumpStumpCellKey, stumpDistance } from './stump-occupancy.mjs';
import { woodCurrent } from './woodsman-state.mjs';
import { stumpPositions, stumpEscapeCell } from './stump-placement.mjs';
import { woodBounds, woodCellsIn } from './woodsman-geometry.mjs';

export function* stumpTick(env, enemy) {
        if (enemy !== stumpOwner(env) || env.owner.combatHalted) return;
        const now = env.deps.getCombatTime();
        for (const row of enemy.woodsmanStumps || []) {
            if (row.phase !== 'idle') { yield* stumpAdvanceCycle(env, enemy, row, now); continue; }
            stumpTickIdle(env, enemy, row, now);
        }
    }

export function stumpTickIdle(env, enemy, row, now) {
        const rule = env.deps.WOODSMAN_BATTLE.stumps, adds = stumpLivingAdds(env, enemy);
        const covering = woodCurrent(env, enemy)?.cover || enemy.nextPatternState?.woodsmanType?.startsWith('cover-');
        if (adds.length >= rule.maxAdds && now - row.lastSpawnAt >= 900 && !covering) {
            row.phase = 'rising'; row.phaseAt = now; return;
        }
        row.nextSpawnAt = Math.min(row.nextSpawnAt, now + rule.spawnMs);
        if (now < row.nextSpawnAt) return;
        row.nextSpawnAt = now + rule.spawnMs;
        if (adds.length < rule.maxAdds) stumpSpawn(env, enemy, row);
    }

/** Stages use combat time, survive saves, and never replay missed summon intervals in a burst. */
    export function* stumpAdvanceCycle(env, enemy, row, now) {
        const rule = env.deps.WOODSMAN_BATTLE.stumps, elapsed = now - row.phaseAt;
        if (row.phase === 'rising' && elapsed >= rule.riseMs) {
            yield* stumpAbsorbAdds(env, enemy, row, now); return;
        }
        if (row.phase === 'absorbing' && elapsed >= rule.absorbMs) {
            const heal = Math.round(enemy.maxHp * rule.healFraction * row.absorbedCount / rule.maxAdds);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
            row.healAt = now; row.absorbedCount = 0; row.echoes = [];
            row.phase = 'seeking'; row.phaseAt = now; row.nextSpawnAt = now;
        }
        if (row.phase === 'seeking' && now >= row.nextSpawnAt) stumpPlanRelocation(env, enemy, row, now);
        if (row.phase === 'moving' && now - row.phaseAt >= rule.moveMs) yield* stumpLandCube(env, enemy, row, now);
    }

export function* stumpAbsorbAdds(env, enemy, row, now) {
        const adds = stumpLivingAdds(env, enemy).slice(0, env.deps.WOODSMAN_BATTLE.stumps.maxAdds);
        row.echoes = adds.map(e => ({ id: e.id, gx: e.gx, gy: e.gy,
            spriteVariantId: e.spriteVariantId, hp: 1, maxHp: 1, ele: e.ele, isBoss: false }));
        row.absorbedCount = adds.length;
        for (const add of adds) {
            // Absorption also retires projectiles, unlike an ordinary monster death.
            for (let i = env.runtime.pendingEnemyCombatAttacks.length - 1; i >= 0; i--)
                if (env.runtime.pendingEnemyCombatAttacks[i].enemyId === add.id) env.deps.dropEnemyAttack(i, now);
            add.hp = 0; yield* stumpRetireAdd(env, add);
        }
        row.phase = 'absorbing'; row.phaseAt = now;
    }

export function stumpPlanRelocation(env, enemy, row, now) {
        row.nextSpawnAt = now + 1000;
        const target = stumpPositions(env, enemy, woodBounds(env, enemy), row)[0];
        if (!target) return; // Hover until a connected landing with a free push-out cell exists.
        row.target = { gx: target.gx, gy: target.gy };
        row.phase = 'moving'; row.phaseAt = now;
    }

export function* stumpLandCube(env, enemy, row, now) {
        const blocked = env.deps.getGridBlockedCells(env.owner.gridPlayer), landing = { ...row.target, footprint: row.footprint };
        const covered = new Set(stumpFootprintCells(env, landing).map((arg0) => stumpStumpCellKey(env, arg0)));
        const hit = covered.has(stumpStumpCellKey(env, env.owner.gridPlayer));
        const escape = hit ? stumpEscapeCell(env, enemy, landing, blocked) : null;
        if (!env.deps.canPlaceGridFootprint(blocked, landing.gx, landing.gy, row.footprint) || hit && !escape) {
            row.target = null; row.phase = 'seeking'; row.phaseAt = now; row.nextSpawnAt = now + 1000; return;
        }
        Object.assign(row, row.target);
        row.target = null; row.phase = 'idle'; row.phaseAt = now; row.plantedAt = now - 240;
        row.nextSpawnAt = now + env.deps.WOODSMAN_BATTLE.stumps.firstSpawnMs;
        const run = env.deps.actExplorationState.current(env.owner);
        if (run?.motion && covered.has(stumpStumpCellKey(env, run.motion.to))) env.deps.actExplorationMotion.cancel(run);
        if (hit) yield* stumpDisplacePlayer(env, enemy, escape, now);
    }

export function* stumpDisplacePlayer(env, enemy, target, now) {
        const run = env.deps.actExplorationState.current(env.owner), from = { gx: env.owner.gridPlayer.gx, gy: env.owner.gridPlayer.gy };
        env.deps.actExplorationMotion.cancel(run);
        if (run) run.destination = null;
        Object.assign(env.owner.gridPlayer, target, { gridMoveTimer: 0 });
        env.deps.markGridStep(env.owner.gridPlayer, from, true);
        env.deps.cancelCombatChannel('displaced');
        const stats = env.deps.getPlayerStats(), zone = { ...env.deps.getZone(env.owner.currentZoneId), trapName: env.deps._t('묘목의 함'),
            trapDamageMul: env.deps.WOODSMAN_BATTLE.stumps.landingDamageMul };
        const protectedPlayer = now < (env.owner.realmInvulnerableBarrierUntil || 0);
        const damage = protectedPlayer ? 0 : env.deps.calculateTrialTrapDamage(zone, stats, 'phys');
        (yield { kind: 'addBattleFx', args: ['playerHit', { enemyId: enemy.id, damage, color: '#d3b2ff', duration: 220,
            displaceFrom: from, displaceTo: { ...target }, targetMaxHp: env.deps.getPlayerHpCap(stats) }] });
        if (protectedPlayer) return;
        env.deps.dealTrialTrapDamage(zone, stats, { element: 'phys' }, damage);
    }

export function stumpSpawn(env, enemy, row) {
        const occupied = env.deps.getGridBlockedCells(), box = woodBounds(env, enemy);
        const covered = stumpFootprintCells(env, row), gap = c => Math.min(...covered.map(at => stumpDistance(c, at)));
        const target = woodCellsIn(env, box).filter(c => gap(c) === 1 && !occupied.has(stumpStumpCellKey(env, c)))[0];
        if (!target) return;
        const zone = { ...env.deps.getZone(env.owner.currentZoneId), type: 'chaosRealm', floor: 1 };
        const add = env.deps.createEnemy(zone, { boss: false, elite: false }, 0);
        const pool = env.deps.WOODSMAN_BATTLE.stumps.summons, kind = pool[row.spawnSerial % pool.length];
        Object.assign(add, { gx: target.gx, gy: target.gy, gridMove: null, footprint: { columns: 1, rows: 1 },
            woodsmanAdd: enemy.id, atkMul: .5, ele: enemy.ele, name: env.deps._t(kind.name),
            spriteVariantId: kind.look, monsterVisualId: kind.look, monsterArchetype: null });
        env.owner.enemies.push(add);
        row.spawnSerial = (row.spawnSerial + 1) % pool.length; row.lastSpawnAt = env.deps.getCombatTime();
    }

export function stumpClear(env, enemy) {
        if (!enemy.isWoodsman) return;
        enemy.woodsmanStumps = [];
        for (const add of env.owner.enemies.filter(e => e.woodsmanAdd === enemy.id)) {
            add.hp = 0; env.deps.retireDeadEnemyAttacks(add);
            env.deps.combatSupports.retire(add);
        }
        env.owner.enemies = env.owner.enemies.filter(e => e.woodsmanAdd !== enemy.id);
    }

export function* stumpRetireAdd(env, enemy) {
        if (!enemy.woodsmanAdd) return false;
        env.deps.retireDeadEnemyAttacks(enemy);
        env.owner.enemies = env.owner.enemies.filter(e => e.id !== enemy.id);
        env.deps.combatSupports.retire(enemy);
        (yield { kind: 'clearDotFxThrottleForEnemy', args: [enemy.id] });
        return true; // summoned pressure never yields XP, loot, progression or endless on-kill rewards
    }
