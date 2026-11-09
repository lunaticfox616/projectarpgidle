/** One installation per Woodsman encounter. Saved on its owner; no world terrain mutation or timer outside combat. */
const woodsmanStumps = (() => {
    const stumpCellKey = c => gridCellKey(c.gx, c.gy);
    const owner = () => game.currentZoneId === OUTSIDE_CHAOS_ZONE_ID && game.playerHp > 0
        ? game.enemies.find(e => e.hp > 0 && e.isWoodsman && !e.noAttack) : null;
    const rows = () => owner()?.woodsmanStumps || [];
    const footprintCells = row => getGridFootprintCells(row.gx, row.gy, row.footprint);
    const cells = except => rows().filter(row => row !== except && ['idle', 'rising'].includes(row.phase)).flatMap(footprintCells);
    const patternCells = () => rows().flatMap(row => footprintCells(row)
        .concat(row.target ? footprintCells({ ...row.target, footprint: row.footprint }) : []));
    const livingAdds = enemy => game.enemies.filter(e => e.hp > 0 && e.woodsmanAdd === enemy.id);
    const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
    function connected(cells, blocked) {
        const remaining = new Set(cells.map(stumpCellKey).filter(k => !blocked.has(k)));
        if (!remaining.size) return false;
        const queue = [remaining.values().next().value]; remaining.delete(queue[0]);
        for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i].split(',').map(Number);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const next = gridCellKey(x + dx, y + dy);
                if (remaining.delete(next)) queue.push(next);
            }
        }
        return !remaining.size;
    }
    function landingOccupied(enemy, except) {
        const occupied = getGridBlockedCells(except ? game.gridPlayer : null);
        const motion = actExplorationState.current(game)?.motion;
        if (!except && motion?.to) occupied.add(stumpCellKey(motion.to));
        // A landing never enters an already announced attack, nor returns to the old footprint.
        if (except) for (const stage of woodsmanBattle.current(enemy)?.stages || [])
            stage.cells.forEach(c => occupied.add(stumpCellKey(c)));
        return occupied;
    }
    function positions(enemy, box, except = null) {
        const floor = woodsmanBattle.cellsIn(box), occupied = landingOccupied(enemy, except);
        const footprint = WOODSMAN_BATTLE.stumps.footprint;
        const candidates = floor.filter(c => c.gx > box.x0 && c.gx + footprint.columns <= box.x1
            && c.gy > box.y0 && c.gy + footprint.rows <= box.y1);
        const terrain = getGridPlacementTerrain();
        const solid = actExplorationState.objects.solidCells(actExplorationState.current(game));
        while (candidates.length) {
            const row = { ...candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0], footprint };
            if (except && distance(row, except) < footprint.columns + 1) continue;
            if (!canPlaceGridFootprint(occupied, row.gx, row.gy, footprint, terrain)) continue;
            const covered = footprintCells(row);
            if (!landingHasExit(enemy, row, occupied, except)) continue;
            const barriers = new Set([...solid, ...covered.map(stumpCellKey)]);
            if (connected(floor, barriers)) return [row];
        }
        return [];
    }
    function landingHasExit(enemy, row, occupied, except) {
        if (except) return !!escapeCell(enemy, row, occupied);
        return !footprintCells(row).some(c => distance(c, game.gridPlayer) <= 1);
    }
    function warning(enemy, state, now, box) {
        const installCells = positions(enemy, box), cells = installCells.flatMap(footprintCells);
        const cast = { type: 'stump', motion: state.motion, element: enemy.ele, startedAt: now,
            warningMs: state.warningMs, box, events: [], stages: [{ ms: 160, cells }], installCells };
        return { kind: 'woodsman', cells, source: { gx: enemy.gx, gy: enemy.gy }, woodsman: cast };
    }
    function installStumps(enemy, cast, now) {
        if (enemy !== owner() || enemy.woodsmanStumpsPlaced) return;
        const occupied = getGridBlockedCells(), motion = actExplorationState.current(game)?.motion;
        if (motion?.to) occupied.add(stumpCellKey(motion.to));
        const terrain = getGridPlacementTerrain();
        enemy.woodsmanStumps = cast.installCells.slice(0, 1)
            .filter(c => canPlaceGridFootprint(occupied, c.gx, c.gy, c.footprint, terrain)).map(c => ({ ...c,
            plantedAt: now, phase: 'idle', phaseAt: now, spawnSerial: Math.floor(Math.random() * WOODSMAN_BATTLE.stumps.summons.length),
            lastSpawnAt: 0, echoes: [], absorbedCount: 0, target: null, nextSpawnAt: now + WOODSMAN_BATTLE.stumps.firstSpawnMs }));
        // A player may enter the warning. Retry with a fresh warning instead of trapping them or losing the mechanic.
        enemy.woodsmanStumpsPlaced = enemy.woodsmanStumps.length === 1;
    }
    function resolveStumps(attack, now) {
        const cast = attack.bossPattern?.move?.cast;
        if (cast?.type !== 'stump') return false;
        installStumps(attack.source, cast, now);
        return true;
    }
    function tick(enemy) {
        if (enemy !== owner() || game.combatHalted) return;
        const now = getCombatTime();
        for (const row of enemy.woodsmanStumps || []) {
            if (row.phase !== 'idle') { advanceCycle(enemy, row, now); continue; }
            tickIdle(enemy, row, now);
        }
    }
    function tickIdle(enemy, row, now) {
        const rule = WOODSMAN_BATTLE.stumps, adds = livingAdds(enemy);
        const covering = woodsmanBattle.current(enemy)?.cover || enemy.nextPatternState?.woodsmanType?.startsWith('cover-');
        if (adds.length >= rule.maxAdds && now - row.lastSpawnAt >= 900 && !covering) {
            row.phase = 'rising'; row.phaseAt = now; return;
        }
        row.nextSpawnAt = Math.min(row.nextSpawnAt, now + rule.spawnMs);
        if (now < row.nextSpawnAt) return;
        row.nextSpawnAt = now + rule.spawnMs;
        if (adds.length < rule.maxAdds) spawn(enemy, row);
    }
    /** Stages use combat time, survive saves, and never replay missed summon intervals in a burst. */
    function advanceCycle(enemy, row, now) {
        const rule = WOODSMAN_BATTLE.stumps, elapsed = now - row.phaseAt;
        if (row.phase === 'rising' && elapsed >= rule.riseMs) {
            absorbAdds(enemy, row, now); return;
        }
        if (row.phase === 'absorbing' && elapsed >= rule.absorbMs) {
            const heal = Math.round(enemy.maxHp * rule.healFraction * row.absorbedCount / rule.maxAdds);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
            row.healAt = now; row.absorbedCount = 0; row.echoes = [];
            row.phase = 'seeking'; row.phaseAt = now; row.nextSpawnAt = now;
        }
        if (row.phase === 'seeking' && now >= row.nextSpawnAt) planRelocation(enemy, row, now);
        if (row.phase === 'moving' && now - row.phaseAt >= rule.moveMs) landCube(enemy, row, now);
    }
    function absorbAdds(enemy, row, now) {
        const adds = livingAdds(enemy).slice(0, WOODSMAN_BATTLE.stumps.maxAdds);
        row.echoes = adds.map(e => ({ id: e.id, gx: e.gx, gy: e.gy,
            spriteVariantId: e.spriteVariantId, hp: 1, maxHp: 1, ele: e.ele, isBoss: false }));
        row.absorbedCount = adds.length;
        for (const add of adds) {
            // Absorption also retires projectiles, unlike an ordinary monster death.
            for (let i = pendingEnemyCombatAttacks.length - 1; i >= 0; i--)
                if (pendingEnemyCombatAttacks[i].enemyId === add.id) dropEnemyAttack(i, now);
            add.hp = 0; retireAdd(add);
        }
        row.phase = 'absorbing'; row.phaseAt = now;
    }
    function planRelocation(enemy, row, now) {
        row.nextSpawnAt = now + 1000;
        const target = positions(enemy, woodsmanBattle.bounds(enemy), row)[0];
        if (!target) return; // Hover until a connected landing with a free push-out cell exists.
        row.target = { gx: target.gx, gy: target.gy };
        row.phase = 'moving'; row.phaseAt = now;
    }
    function landCube(enemy, row, now) {
        const blocked = getGridBlockedCells(game.gridPlayer), landing = { ...row.target, footprint: row.footprint };
        const covered = new Set(footprintCells(landing).map(stumpCellKey));
        const hit = covered.has(stumpCellKey(game.gridPlayer));
        const escape = hit ? escapeCell(enemy, landing, blocked) : null;
        if (!canPlaceGridFootprint(blocked, landing.gx, landing.gy, row.footprint) || hit && !escape) {
            row.target = null; row.phase = 'seeking'; row.phaseAt = now; row.nextSpawnAt = now + 1000; return;
        }
        Object.assign(row, row.target);
        row.target = null; row.phase = 'idle'; row.phaseAt = now; row.plantedAt = now - 240;
        row.nextSpawnAt = now + WOODSMAN_BATTLE.stumps.firstSpawnMs;
        const run = actExplorationState.current(game);
        if (run?.motion && covered.has(stumpCellKey(run.motion.to))) actExplorationMotion.cancel(run);
        if (hit) displacePlayer(enemy, escape, now);
    }
    /** Search outward through the footprint, then stop at a neighbouring free tile; never push through a wall. */
    function escapeCell(enemy, landing, blocked) {
        const area = footprintCells(landing), inside = new Set(area.map(stumpCellKey));
        const box = woodsmanBattle.bounds(enemy), choices = new Map();
        for (const c of area) for (const [dx, dy] of [[0,1],[-1,0],[1,0],[0,-1]]) {
            const next = { gx: c.gx + dx, gy: c.gy + dy }, key = stumpCellKey(next);
            if (inside.has(key) || next.gx < box.x0 || next.gx > box.x1 || next.gy < box.y0 || next.gy > box.y1) continue;
            if (canPlaceGridFootprint(blocked, next.gx, next.gy, { columns: 1, rows: 1 })) choices.set(key, next);
        }
        return [...choices.values()].sort((a, b) => distance(a, game.gridPlayer) - distance(b, game.gridPlayer))[0] || null;
    }
    function displacePlayer(enemy, target, now) {
        const run = actExplorationState.current(game), from = { gx: game.gridPlayer.gx, gy: game.gridPlayer.gy };
        actExplorationMotion.cancel(run);
        if (run) run.destination = null;
        Object.assign(game.gridPlayer, target, { gridMoveTimer: 0 });
        markGridStep(game.gridPlayer, from, true);
        cancelCombatChannel('displaced');
        const stats = getPlayerStats(), zone = { ...getZone(game.currentZoneId), trapName: _t('묘목의 함'),
            trapDamageMul: WOODSMAN_BATTLE.stumps.landingDamageMul };
        const protectedPlayer = now < (game.realmInvulnerableBarrierUntil || 0);
        const damage = protectedPlayer ? 0 : calculateTrialTrapDamage(zone, stats, 'phys');
        addBattleFx('playerHit', { enemyId: enemy.id, damage, color: '#d3b2ff', duration: 220,
            displaceFrom: from, displaceTo: { ...target }, targetMaxHp: getPlayerHpCap(stats) });
        if (protectedPlayer) return;
        dealTrialTrapDamage(zone, stats, { element: 'phys' }, damage);
    }
    function spawn(enemy, row) {
        const occupied = getGridBlockedCells(), box = woodsmanBattle.bounds(enemy);
        const covered = footprintCells(row), gap = c => Math.min(...covered.map(at => distance(c, at)));
        const target = woodsmanBattle.cellsIn(box).filter(c => gap(c) === 1 && !occupied.has(stumpCellKey(c)))[0];
        if (!target) return;
        const zone = { ...getZone(game.currentZoneId), type: 'chaosRealm', floor: 1 };
        const add = createEnemy(zone, { boss: false, elite: false }, 0);
        const pool = WOODSMAN_BATTLE.stumps.summons, kind = pool[row.spawnSerial % pool.length];
        Object.assign(add, { gx: target.gx, gy: target.gy, gridMove: null, footprint: { columns: 1, rows: 1 },
            woodsmanAdd: enemy.id, atkMul: .5, ele: enemy.ele, name: _t(kind.name),
            spriteVariantId: kind.look, monsterVisualId: kind.look, monsterArchetype: null });
        game.enemies.push(add);
        row.spawnSerial = (row.spawnSerial + 1) % pool.length; row.lastSpawnAt = getCombatTime();
    }
    function clear(enemy) {
        if (!enemy.isWoodsman) return;
        enemy.woodsmanStumps = [];
        for (const add of game.enemies.filter(e => e.woodsmanAdd === enemy.id)) {
            add.hp = 0; retireDeadEnemyAttacks(add);
            window.GameModules.combat.supports.retire(add);
        }
        game.enemies = game.enemies.filter(e => e.woodsmanAdd !== enemy.id);
    }
    function retireAdd(enemy) {
        if (!enemy.woodsmanAdd) return false;
        retireDeadEnemyAttacks(enemy);
        game.enemies = game.enemies.filter(e => e.id !== enemy.id);
        window.GameModules.combat.supports.retire(enemy);
        clearDotFxThrottleForEnemy(enemy.id);
        return true; // summoned pressure never yields XP, loot, progression or endless on-kill rewards
    }
    return Object.freeze({ rows, cells, patternCells, warning, resolve: resolveStumps, tick, clear, retireAdd, connected });
})();
safeExposeGlobals({ woodsmanStumps });
