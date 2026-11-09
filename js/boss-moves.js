/** Boss pattern moves (2026-10-16 사용자: "지금은 땅바닥에 쏘는 패턴(장판 패턴)만 있는데, 투사체 방식으로 날리는 패턴, 빔 형식으로
 * 특정 칸에 유지되는 패턴, 장판이 순차적으로 폭발하는 패턴 등등 ... 적들의 패턴이 단조롭지 않게"). A boss special keeps the cells it
 * warned of (its area, js/combat-patterns.js) and lands on them over time instead of all at once, in the way the boss's own
 * effects fight (data/boss-fx.js kind, GPT's art):
 *   volley  갈래 사격: a shot down each ray of a fan, cell by cell from the boss; a shot stops at the first one it hits.
 *   chain   연쇄 폭발: the cells of a line (or of each ray of a fan, for bosses that fight on the ground) burst one after another,
 *           outward from the boss.
 *   beam    관통 광선: a line held for a while, hitting what stands in it at every tick (a share of the special's damage).
 *   rings   이중 파동: the inner cells of a wide diamond burst first, its outer ring a little later (step out, then back in).
 *   cross   십자 강타: the middle first, then the four arms.
 *   scatter 흩뿌리기: the cells of a square burst in three waves, in a random order.
 *   grind   회전 톱날(뿌리 절단자, js/combat-room-invader.js): the warned cells are ground again and again, a share of the damage at every tick.
 * A special left as it was (one cell, a melee boss's square) lands at once as before. A cell hits what stands in it when it
 * lands, at the special's damage multiplier (a beam's tick at tickShare of it), so standing still takes one hit as before.
 * The pending attack (js/combat.js) carries the move: each stage resolves as one hit and the rest goes back in the queue with
 * the cells still to land as its area (warnings and the hero's escape see them). Rendering: js/canvas-boss-moves.js. */
const BOSS_MOVE_RULES = Object.freeze({
    volley: Object.freeze({ firstMs: 140, stepMs: 110 }),
    chain: Object.freeze({ firstMs: 280, stepMs: 150 }),
    beam: Object.freeze({ firstMs: 320, tickMs: 450, ticks: 4, tickShare: 0.45 }),
    rings: Object.freeze({ firstMs: 500, gapMs: 650 }),
    cross: Object.freeze({ firstMs: 500, gapMs: 300 }),
    scatter: Object.freeze({ firstMs: 420, gapMs: 300, waves: 3 }),
    grind: Object.freeze({ firstMs: 120, tickMs: 190, ticks: 7, tickShare: 0.3 })
});
// The first loops' specials of each boss style (data/boss-fx.js kind): three shapes (data/constants.js bossPatternProfiles) in turn,
// the gentlest first. A boss with no style keeps the old pair (one cell, then the cross).
const BOSS_MOVE_INTRO = Object.freeze({
    melee: Object.freeze(['impact', 'lane', 'pulse']),
    ground: Object.freeze(['pulse', 'lane', 'ring']),
    projectile: Object.freeze(['impact', 'fan', 'beam']),
    wave: Object.freeze(['fan', 'wave', 'lane']),
    beam: Object.freeze(['beam', 'impact', 'fan']),
    fall: Object.freeze(['ring', 'impact', 'pulse']),
    none: Object.freeze(['impact', 'wave'])
});
// 새 전용 외형과 효과를 쓰더라도 두 정점 보스는 기존 특수기 조합과 판정 방식을 잇는다.
const BOSS_MOVE_STYLE_BY_VISUAL = Object.freeze({ cosmos_astra: null, pinnacle_leviathan: 'projectile' });
// The names those specials show (cast bar, log): by shape, and for some shapes by style.
const BOSS_MOVE_NAMES = Object.freeze({
    impact: '지면 강타', wave: '십자 강타', pulse: '이중 파동',
    beam: Object.freeze({ beam: '관통 광선', other: '집중 사격' }),
    fan: Object.freeze({ melee: '세 갈래 균열', ground: '세 갈래 분출', other: '갈래 사격' }),
    lane: Object.freeze({ ground: '뿌리 분출', other: '연쇄 폭발' }),
    ring: Object.freeze({ fall: '낙하 공격', other: '흩뿌리기' })
});

const bossMoves = (() => {
    const live = [];
    const LINGER_MS = 900;   // a move stays drawn this long after its last stage (the last burst plays out)
    // Transient casts belong to this enemy and exploration run, never to a restored save.
    const shifts = new WeakMap();
    const SHIFT_TIMING = Object.freeze({ blink: { warning: 1200, land: 600 }, ambush: { warning: 1100, land: 400 } });
    const cellOf = unit => ({ gx: unit.gx, gy: unit.gy });
    const observer = (() => {
        const OPEN_MS = 1560, FLOOR_MS = 4000, IMPACT_MS = 160;
        const divisionCue = Object.freeze({ close: 450, shade: 2090, black: 2390, reveal: 2550, end: 3310 });
        const SEAL_CAST_MS = 4200, SEAL_IMPACT_MS = 100, SEAL_LOCK_MS = 1000;
        const phases = new WeakMap(), splits = new WeakMap(), floors = new WeakMap(), seals = new WeakMap(), merged = new WeakMap();
        let division = null;
        const matches = enemy => game.currentZoneId === BEYOND_BOUNDARY_UNLOCK_BOSS_ID
            && enemy.isBoss && enemy.monsterVisualId === 'pinnacle_observer';
        const openingAt = enemy => phases.get(enemy)?.at ?? null;
        const arena = enemy => actExplorationRooms.roomAt(getCombatGridSize(), enemy);
        const boundaryX = (room, gy) => room.gx + (gy - room.gy) * .82;
        const sideOf = (room, cell) => cell.gx <= boundaryX(room, cell.gy) ? 'violet' : 'gold';

        function divide(enemy, now) {
            if (enemy.hp > enemy.maxHp * .75 || splits.has(enemy)) return;
            splits.set(enemy, now);
            addBattleFx('observerCollapse', { duration: 340 });
        }

        function boundary(enemy) {
            const started = splits.get(enemy);
            if (started === undefined || enemy.hp <= 0 || !matches(enemy)) return null;
            const room = arena(enemy);
            return room ? { room, started } : null;
        }

        function playerBoundary(run) {
            if (run?.zoneId !== BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return null;
            const enemy = game.enemies.find(matches), split = enemy && boundary(enemy);
            return split && arena(game.gridPlayer) === split.room ? split : null;
        }

        const readyToDivide = enemy => enemy && enemy.hp > 0 && enemy.hp <= enemy.maxHp * .75 && !splits.has(enemy);
        function sceneActive() {
            return division && matches(division.enemy) && division.enemy.hp > 0 && game.enemies.includes(division.enemy) ? division : null;
        }

        /** The foreground scheduler pauses combat, while the scene itself advances on its wall clock. */
        function advanceScene(now, paused) {
            const scene = sceneActive();
            if (scene) return advanceDivision(scene, now, paused);
            division = null;
            if (paused || game.currentZoneId !== BEYOND_BOUNDARY_UNLOCK_BOSS_ID || game.combatHalted) return false;
            const enemy = game.enemies.find(matches);
            if (!readyToDivide(enemy)) return false;
            const room = arena(enemy);
            if (!room || room !== arena(game.gridPlayer)) return false;
            division = { enemy, room, started: now, last: now };
            return true;
        }

        function advanceDivision(scene, now, paused) {
            if (paused) scene.started += now - scene.last;
            scene.last = now;
            if (now - scene.started < divisionCue.end) return true;
            division = null;
            divide(scene.enemy, getCombatTime());
            return false;
        }

        /** Finish the attack that has already been shown. Hold the next cast while the mantle opens. */
        function wait(enemy, now) {
            if (!matches(enemy)) return false;
            if (holdsForDivision(enemy, now)) return true;
            const phase = phases.get(enemy);
            if (phase && phase.at !== null) return now < phase.at + OPEN_MS;
            if (enemy.hp > enemy.maxHp / 2) { if (!phase) phases.set(enemy, { at: null }); return false; }
            if (enemy.patternTelegraphKey && enemy.patternArea) return false;
            phases.set(enemy, { at: phase ? now : now - OPEN_MS });
            return !!phase;
        }

        function holdsForDivision(enemy, now) {
            if (game.isBackgroundCalculation) divide(enemy, now);
            return readyToDivide(enemy) && arena(enemy) === arena(game.gridPlayer);
        }

        const BEFORE = Object.freeze([
            { kind: 'sight', label: '관측선', warningMs: 1250, damageMul: 1.12 },
            { kind: 'mark', label: '성좌 표식', warningMs: 1450, damageMul: 1.24 }
        ]);
        const LASER = { kind: 'dualLaser', label: '이중 경계 광선', warningMs: 2100, damageMul: 1.28 };
        const FLOOD = { kind: 'dualFlood', label: '경계 범람', warningMs: 3600, damageMul: 1.26 };
        const DIVIDED = Object.freeze([LASER, FLOOD, LASER]);
        const AFTER = Object.freeze([
            LASER,
            { kind: 'collapse', label: '발판 붕괴', warningMs: 2000, damageMul: 1.34 },
            FLOOD,
            { kind: 'seal', label: '영구 봉인', warningMs: SEAL_CAST_MS - SEAL_IMPACT_MS, damageMul: 1 },
            LASER
        ]);

        function pattern(enemy, attackNumber) {
            if (!matches(enemy)) return null;
            const current = enemy.nextPatternState;
            if (enemy.patternTelegraphKey && current?.attackNumber === attackNumber && current.observerMove) return current;
            const awakened = openingAt(enemy) !== null || enemy.hp <= enemy.maxHp / 2;
            const cycle = awakened ? AFTER : splits.has(enemy) ? DIVIDED : BEFORE;
            const row = cycle[(attackNumber - 1) % cycle.length];
            return { mode: 'cosmos', patternMode: enemy.patternMode, attackNumber, isSpecial: true, shapeIndex: -1,
                label: _t(row.label), observerMove: row.kind, telegraphKind: 'ring', warningMs: row.warningMs, damageMul: row.damageMul,
                recoveryMs: row.kind === 'collapse' ? 1050 : 460 };
        }

        function box(room, at, rx, ry) {
            const out = [];
            for (let gy = Math.max(room.y0, at.gy - ry); gy <= Math.min(room.y1, at.gy + ry); gy++) {
                for (let gx = Math.max(room.x0, at.gx - rx); gx <= Math.min(room.x1, at.gx + rx); gx++) out.push({ gx, gy });
            }
            return out;
        }

        function floorArea(room, center) {
            const rx = Math.min(4, Math.floor((room.x1 - room.x0) / 2));
            const ry = Math.min(2, Math.floor((room.y1 - room.y0) / 2));
            const focus = {
                gx: clampNumber(center.gx, room.x0 + rx, room.x1 - rx),
                gy: clampNumber(center.gy, room.y0 + ry, room.y1 - ry)
            };
            return box(room, focus, rx, ry);
        }

        /** Three adjacent lanes centered on the target, shifted inward at the room edge. */
        const bandStart = (value, first, last) => clampNumber(value - 1, first, last - 2);

        function groups(room, center, kind) {
            if (kind === 'collapse') return [floorArea(room, center)];
            if (kind === 'mark') {
                return [box(room, center, 3, 3).filter(cell => Math.abs(cell.gx - center.gx) + Math.abs(cell.gy - center.gy) <= 3)];
            }
            const gy = bandStart(center.gy, room.y0, room.y1);
            const horizontal = box({ ...room, y0: gy, y1: Math.min(gy + 2, room.y1) }, center, room.x1 - room.x0, 2);
            if (kind === 'sight') return [horizontal];
            const gx = bandStart(center.gx, room.x0, room.x1);
            return [horizontal, box({ ...room, x0: gx, x1: Math.min(gx + 2, room.x1) }, center, 2, room.y1 - room.y0)];
        }

        function area(enemy, state, target) {
            if (!state.observerMove) return null;
            const terrain = getGridPlacementTerrain(), room = actExplorationRooms.roomAt(terrain.map, enemy);
            if (!room) return null;
            const kind = state.observerMove, center = cellOf(kind === 'seal' ? game.gridPlayer : target);
            const source = getClosestGridUnitCell(center, enemy), bands = colorBands(room, center, state);
            const groups = bands ? [colorCells(room, center, bands)] : observerGroups(room, center, kind);
            const waves = groups.map(cells => cells.filter(cell => observerFloorMove(kind)
                ? actExplorationState.validObserverSeal(terrain.map, cell) : actExplorationMap.walkable(terrain.map, cell, terrain.sealed)));
            const cells = [...new Map(waves.flat().map(cell => [gridCellKey(cell.gx, cell.gy), cell])).values()];
            return { kind: 'blast', shape: 'cells', center, source, cells, waves, room, bands, observerMove: kind };
        }
        const observerFloorMove = kind => kind === 'collapse' || kind === 'seal';

        function observerGroups(room, center, kind) {
            if (kind === 'seal') return [box(room, center, 1, 1)];
            return groups(room, center, kind);
        }

        /** One hit stage owns both colors. Floods take a whole side and leave an escape lane around the other ray. */
        function colorBands(room, center, state) {
            const kind = state.observerMove;
            if (kind !== 'dualLaser' && kind !== 'dualFlood') return null;
            if (kind === 'dualLaser') return twinRays(room, center);
            const flood = kind === 'dualFlood' ? (state.attackNumber % 2 ? 'gold' : 'violet') : null;
            const first = bandStart(center.gy, room.y0, room.y1);
            return ['violet', 'gold'].map(color => color === flood
                ? { color, first: room.y0, last: room.y1, flood: true }
                : { color, first, last: Math.min(first + 2, room.y1), flood: false });
        }

        function twinRays(room, center) {
            const first = clampNumber(center.gy - 1, room.y0, room.y1 - 3);
            const targetHigh = center.gy < first + 2, targetViolet = sideOf(room, center) === 'violet';
            const violet = targetHigh === targetViolet ? first + 2 : first;
            const gold = violet === first ? first + 2 : first;
            return [{ color: 'violet', first: violet, last: violet + 1 }, { color: 'gold', first: gold, last: gold + 1 }];
        }

        function colorHits({ room, bands }, { gx, gy }) {
            if (gx < room.x0 - .5 || gx >= room.x1 + .5 || gy < room.y0 - .5 || gy >= room.y1 + .5) return false;
            const hit = bands[sideOf(room, { gx, gy }) === 'violet' ? 1 : 0];
            return gy >= hit.first - .5 && gy < hit.last + .5;
        }

        function colorCells(room, center, bands) {
            return box(room, center, room.x1 - room.x0, room.y1 - room.y0).filter(cell => colorHits({ room, bands }, cell));
        }

        function followSeal(enemy, state, now) {
            if (state.observerMove !== 'seal' || !hasGridCell(game.gridPlayer)) return;
            const target = game.gridPlayer, current = enemy.patternArea, elapsed = now - enemy.patternTelegraphStartedAt;
            if (elapsed >= SEAL_CAST_MS - SEAL_LOCK_MS) {
                if (current) current.sealLocked = true;
                return;
            }
            if (current && current.center.gx === target.gx && current.center.gy === target.gy) return;
            if (arena(enemy) === arena(target)) enemy.patternArea = area(enemy, state, target);
        }

        const impactMs = area => area.observerMove === 'seal' ? SEAL_IMPACT_MS : IMPACT_MS;
        const impacts = area => area.waves.map((cells, i) => ({ ms: impactMs(area) + i * 580, cells: cells.map(cell => ({ ...cell, lane: 0 })) }));

        /** Only the current room run can own missing floor. The walk mask stays immutable. */
        function floor(run, now = getCombatTime()) {
            const active = run && floors.get(run);
            if (!active || game.currentZoneId !== BEYOND_BOUNDARY_UNLOCK_BOSS_ID || active.enemy.hp <= 0
                || !game.enemies.includes(active.enemy)) return null;
            if (active.nextExpiry <= now) {
                active.patches = active.patches.filter(patch => now < patch.until);
                cacheFloor(active);
            }
            return active.cached;
        }

        function cacheFloor(active) {
            const cells = [...new Map(active.patches.flatMap(patch => patch.cells.map(cell => [gridCellKey(cell.gx, cell.gy), cell]))).values()];
            active.nextExpiry = Math.min(...active.patches.map(patch => patch.until));
            active.cached = cells.length ? { cells, keys: new Set(cells.map(cell => gridCellKey(cell.gx, cell.gy))),
                at: active.patches[0].at, until: Math.max(...active.patches.map(patch => patch.until)) } : null;
        }

        function sealedFloor(run) {
            if (!run?.observerSeals?.length) return null;
            if (!seals.has(run)) seals.set(run, groupFloor(run.observerSeals));
            return seals.get(run);
        }

        function mergedFloor(run, now) {
            const temporary = floor(run, now), permanent = sealedFloor(run);
            if (!temporary) return permanent;
            const cached = merged.get(run);
            if (cached?.temporary === temporary && cached.permanent === permanent) return cached.floor;
            const cells = (permanent?.cells || []).concat(temporary.cells.filter(cell => !permanent?.keys.has(gridCellKey(cell.gx, cell.gy))));
            const union = groupFloor(cells);
            merged.set(run, { temporary, permanent, floor: { ...union, at: temporary.at, until: temporary.until } });
            return merged.get(run).floor;
        }

        function groupFloor(cells) {
            const pending = new Map(cells.map(cell => [gridCellKey(cell.gx, cell.gy), cell]));
            const keys = new Set(pending.keys()), patches = [];
            for (const [key, first] of pending) {
                const patch = [first];
                pending.delete(key);
                for (const cell of patch) appendSealNeighbours(cell, patch, pending);
                patches.push(patch);
            }
            return { cells, keys, patches };
        }

        function appendSealNeighbours(cell, patch, pending) {
            for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]) {
                const key = gridCellKey(cell.gx + dx, cell.gy + dy);
                const next = pending.get(key);
                if (next) { pending.delete(key); patch.push(next); }
            }
        }

        function landing(unit, room, removed) {
            const blocked = getGridBlockedCells(unit), size = getGridUnitFootprint(unit);
            for (const key of removed) blocked.add(key);
            const terrain = getGridPlacementTerrain();
            return box(room, unit, room.x1 - room.x0, room.y1 - room.y0).sort((a, b) => steps(unit, a) - steps(unit, b)
                || Math.abs(a.gx - unit.gx) + Math.abs(a.gy - unit.gy) - Math.abs(b.gx - unit.gx) - Math.abs(b.gy - unit.gy))
                .find(cell => canPlaceGridFootprint(blocked, cell.gx, cell.gy, size, terrain));
        }

        function displace(unit, to, run) {
            const from = cellOf(unit);
            Object.assign(unit, to, { gridMoveTimer: 0, gridStepFrom: null });
            if (unit !== game.gridPlayer) return;
            actExplorationMotion.cancel(run);
            run.destination = null;
            addBattleFx('playerMobility', { fromCell: from, toCell: to, duration: 260 });
        }

        function collapse(attack, now) {
            const run = actExplorationState.current(game), map = getCombatGridSize();
            const enemy = attack.source, room = actExplorationRooms.roomAt(map, enemy);
            if (!run || !room) return;
            const cells = attack.bossPattern.area.cells, keys = new Set(cells.map(cell => gridCellKey(cell.gx, cell.gy)));
            const victims = enemyAttackRules.impactTargets(attack, game);
            attack.observerTargets = victims;
            for (const unit of victims) {
                const to = landing(unit, room, keys);
                if (!to && unit === game.gridPlayer) return; // No legal escape tile: keep the impact but do not remove the floor.
                if (to) displace(unit, to, run);
            }
            floor(run, now); // Discard expired patches before adding a new one.
            const previous = floors.get(run);
            const active = previous?.enemy === enemy ? previous : { enemy, patches: [] };
            active.patches.push({ cells, at: now, until: now + FLOOR_MS });
            cacheFloor(active);
            floors.set(run, active);
            addBattleFx('observerCollapse', { duration: 340 });
        }

        function seal(attack) {
            const run = actExplorationState.current(game), { cells, room } = attack.bossPattern.area;
            if (!run || !cells.length) return;
            const victims = enemyAttackRules.impactTargets(attack, game);
            attack.observerFatal = victims.includes(game.gridPlayer);
            attack.observerTargets = [];
            const removed = rememberSeal(run, cells);
            for (const unit of victims) {
                if (unit === game.gridPlayer || !isGridUnitInCellSet(unit, removed)) continue;
                const to = landing(unit, room, removed);
                if (to) displace(unit, to, run);
            }
            addBattleFx('observerCollapse', { duration: 340 });
        }

        function rememberSeal(run, cells) {
            const board = sealedFloor(run), added = new Set();
            const map = getCombatGridSize();
            const fresh = cells.filter(cell => actExplorationState.validObserverSeal(map, cell) && !board?.keys.has(gridCellKey(cell.gx, cell.gy)));
            if (fresh.length) {
                fresh.forEach(cell => added.add(gridCellKey(cell.gx, cell.gy)));
                run.observerSeals = (board?.cells || []).concat(fresh);
                seals.set(run, groupFloor(run.observerSeals));
            }
            return added;
        }

        return Object.freeze({ wait, openingAt, openMs: OPEN_MS, impactMs, pattern, area, impacts, floor, collapse,
            boundary, playerBoundary, divisionCue, advanceScene, sceneActive, boundaryX, sideOf, colorHits, sealedFloor, mergedFloor, followSeal, seal });
    })();
    function woodsmanShiftKind(enemy, attackNumber) {
        if (!enemy.isWoodsman || game.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID || attackNumber % 4) return null;
        return attackNumber % 8 ? 'blink' : 'ambush';
    }
    function shiftPattern(enemy, attackNumber) {
        const kind = woodsmanShiftKind(enemy, attackNumber);
        if (!kind) return null;
        return { mode: 'burst', patternMode: enemy.patternMode, attackNumber, isSpecial: true, shapeIndex: -1, shiftKind: kind,
            label: kind === 'blink' ? _t('공간 절단') : _t('그림자 기습'), damageMul: 1.18,
            telegraphKind: kind === 'blink' ? 'lane' : 'impact', warningMs: SHIFT_TIMING[kind].warning, recoveryMs: 800 };
    }
    /** A scheduled blink may charge out of melee range, but never across rooms. */
    function canPrepare(enemy, target) {
        if (game.currentZoneId === BEYOND_BOUNDARY_UNLOCK_BOSS_ID && enemy.monsterVisualId === 'pinnacle_observer') {
            const map = getCombatGridSize(), room = actExplorationRooms.roomAt(map, enemy);
            return room ? actExplorationRooms.roomAt(map, target) === room : canEnemyAttackFromHere(enemy, target);
        }
        if (!woodsmanShiftKind(enemy, (Number(enemy.patternAttackCount) || 0) + 1)) return canEnemyAttackFromHere(enemy, target);
        const map = getCombatGridSize(), room = actExplorationRooms.roomAt(map, enemy);
        return !!room && actExplorationRooms.roomAt(map, target)?.id === room.id;
    }
    function shiftContext(enemy) {
        const terrain = getGridPlacementTerrain();
        return { terrain, room: actExplorationRooms.roomAt(terrain.map, enemy), footprint: getGridUnitFootprint(enemy), blocked: getGridBlockedCells(enemy) };
    }
    function legalLanding(cell, context) {
        const { terrain, room, footprint, blocked } = context;
        if (!room || !canPlaceGridFootprint(blocked, cell.gx, cell.gy, footprint, terrain)) return false;
        return getGridFootprintCells(cell.gx, cell.gy, footprint, terrain.map)
            .every(at => actExplorationRooms.roomAt(terrain.map, at)?.id === room.id);
    }
    /** At most 169 nearby anchors, only when starting the cast. Never search the whole map each tick. */
    function shiftLanding(enemy, target, kind, context) {
        const candidates = [], desired = kind === 'blink' ? 4 : 1, from = getGridUnitCenter(enemy);
        for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) {
            const cell = { gx: target.gx + dx, gy: target.gy + dy };
            if (!legalLanding(cell, context) || gridChebyshevDist(cell.gx, cell.gy, enemy.gx, enemy.gy) < 2) continue;
            const body = { ...cell, isBoss: true, footprint: context.footprint }, distance = getGridUnitDistance(body, target);
            if (Math.abs(distance - desired) > 1 || distance < 1) continue;
            candidates.push({ cell, score: shiftScore(body, target, from, desired) });
        }
        candidates.sort((a, b) => a.score - b.score);
        return candidates[0]?.cell || null;
    }
    function shiftScore(body, target, from, desired) {
        const side = (getGridUnitCenter(body).gx - target.gx) * (from.gx - target.gx);
        return Math.abs(getGridUnitDistance(body, target) - desired) * 10 + (side < 0 ? 0 : 3) + Math.abs(body.gy - target.gy) * .3;
    }
    function prepareShift(enemy, state, target, now) {
        if (!state.shiftKind) { shifts.delete(enemy); return null; }
        const context = shiftContext(enemy), to = shiftLanding(enemy, target, state.shiftKind, context);
        const run = actExplorationState.current(game), key = enemy.patternTelegraphKey;
        if (!to) { shifts.set(enemy, { run, key, stationary: true }); return null; } // cast in place if no safe landing exists
        const source = getClosestGridUnitCell(target, { ...to, isBoss: true, footprint: context.footprint });
        const area = { ...getSkillStageFootprint('', {}, { aimCell: target,
            gridProfile: COMBAT_GRID_CONFIG.bossPatternProfiles[state.telegraphKind] }, source), source };
        shifts.set(enemy, { kind: state.shiftKind, key, run,
            from: cellOf(enemy), to, target: cellOf(target), startedAt: now, landAt: now + SHIFT_TIMING[state.shiftKind].land,
            element: woodsmanAttackFxElement(enemy), landed: false, cancelled: false, released: false });
        return area;
    }
    function shiftOf(enemy) {
        const shift = shifts.get(enemy);
        if (!shift || shift.stationary || shift.cancelled || enemy.hp <= 0 || game.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID) return null;
        if (shift.run !== actExplorationState.current(game)) return null;
        return shift.released || enemy.patternTelegraphKey === shift.key ? shift : null;
    }
    /** Reloaded casts have no transient destination. Restart their full warning instead of landing an old, invisible attack. */
    function needsWarning(enemy, state, key) {
        if (enemy.patternTelegraphKey !== key) return true;
        if (!state.shiftKind) return false;
        const shift = shifts.get(enemy);
        return !shift || shift.key !== key || shift.run !== actExplorationState.current(game);
    }
    /** Recheck occupancy at the actual hop; a hero stepping onto the mark cancels this cast, never gets displaced. */
    function updateShift(enemy, now) {
        const shift = shiftOf(enemy);
        if (!shift || shift.landed || now < shift.landAt) return true;
        if (!legalLanding(shift.to, shiftContext(enemy))) {
            shift.cancelled = true;
            enemy.attackTimer = 0;
            enemy.castInterruptedUntil = now + 650;
            return false;
        }
        Object.assign(enemy, shift.to, { gridMoveTimer: 0, gridStepFrom: null, gridStepAt: now });
        enemy.facingDirection = skillGemCasts.facing(enemy, shift.target);
        shift.landed = true;
        return true;
    }
    function releaseShift(enemy) {
        const shift = shiftOf(enemy);
        if (shift) { shift.released = true; shift.releasedAt = getCombatTime(); }
    }
    function cancelShift(enemy) { shifts.delete(enemy); }

    /** The boss's effect row (data/boss-fx.js): the look it shows on the stage (js/canvas-stage-roster.js actorFor), else its asset. */
    function bossFxOf(enemy) {
        if (typeof BOSS_FX !== 'object' || !enemy) return null;
        const roster = typeof MONSTER_STAGE_ROSTER === 'object' ? MONSTER_STAGE_ROSTER : null;
        const look = enemy.spriteVariantId || enemy.monsterVisualId;
        const id = (roster && roster.wears[look]) || look;
        return BOSS_FX.actors[id] ? { id, row: BOSS_FX.actors[id] }
            : (BOSS_FX.actors[enemy.bossAssetKey] ? { id: enemy.bossAssetKey, row: BOSS_FX.actors[enemy.bossAssetKey] } : null);
    }
    function styleOf(enemy) {
        const visual = enemy?.monsterVisualId;
        return Object.hasOwn(BOSS_MOVE_STYLE_BY_VISUAL, visual)
            ? BOSS_MOVE_STYLE_BY_VISUAL[visual] : bossFxOf(enemy)?.row.kind ?? null;
    }

    /** The first loops' special number n (1, 2, ...) of this boss: { label, telegraphKind }. */
    function introSpecial(enemy, n) {
        const style = styleOf(enemy), shapes = BOSS_MOVE_INTRO[style] || BOSS_MOVE_INTRO.none;
        const shape = shapes[(n - 1) % shapes.length];
        return { label: specialName(shape, style), telegraphKind: shape };
    }
    /** How many special shapes this boss takes turns with (BOSS_MOVE_INTRO by its fighting style). */
    function introCount(enemy) { return (BOSS_MOVE_INTRO[styleOf(enemy)] || BOSS_MOVE_INTRO.none).length; }
    const FAMILIES = Object.freeze({ ray: ['fan', 'lane'], area: ['ring', 'pulse', 'wave', 'impact'] });
    function familyShapes(enemy, family) {
        const shapes = BOSS_MOVE_INTRO[styleOf(enemy)] || BOSS_MOVE_INTRO.none;
        const allowed = FAMILIES[family], matched = shapes.filter(shape => allowed.includes(shape));
        return matched.length ? matched : allowed;
    }
    function shapeLook(enemy, shape) { return { label: specialName(shape, styleOf(enemy)), telegraphKind: shape }; }
    function specialName(shape, style) {
        const names = BOSS_MOVE_NAMES[shape];
        return typeof names === 'string' ? names : names[style] || names.other;
    }

    function moveKind(area, telegraph, style) {
        if (telegraph === 'grind') return 'grind';
        if (area.kind === 'fan') return ['melee', 'ground'].includes(style) ? 'chain' : 'volley';
        if (area.kind === 'line') return telegraph === 'beam' ? 'beam' : 'chain';
        return area.kind === 'blast' ? blastMove(area, style) : null;
    }
    /** First impact after release, for a cast bar that ends at the actual hit rather than a fixed half second. */
    function firstImpactMs(state, enemy) {
        const area = state.area || enemy.patternArea;
        if (area?.woodsman) return area.woodsman.stages[0].ms;
        if (!area) return BOSS_ATTACK_IMPACT_DELAY_MS;
        if (area.observerMove) return observer.impactMs(area);
        const kind = moveKind(area, state.telegraphKind, styleOf(enemy));
        return kind ? BOSS_MOVE_RULES[kind].firstMs : BOSS_ATTACK_IMPACT_DELAY_MS;
    }
    function blastMove(area, style) {
        if (area.shape === 'cross') return 'cross';
        if (area.shape === 'diamond' && area.radius >= 2) return 'rings';
        return area.radius >= 1 && style !== 'melee' ? 'scatter' : null;
    }

    const steps = (from, cell) => Math.max(Math.abs(cell.gx - from.gx), Math.abs(cell.gy - from.gy));
    /** The area's lanes from the boss outward: a fan's rays, or a line's cells; only cells the warning covered. */
    function lanesOf(area, source) {
        const keys = new Set(area.cells.map(cell => gridCellKey(cell.gx, cell.gy)));
        if (area.kind === 'fan') {
            return (area.rays || []).map(tip => gridLineCells(source.gx, source.gy, tip.gx, tip.gy, 16)
                .filter(cell => keys.has(gridCellKey(cell.gx, cell.gy))));
        }
        return [area.cells.slice().sort((a, b) => steps(source, a) - steps(source, b))];
    }
    /** Lanes advancing together: the k-th cell of every lane lands at firstMs + k × stepMs. */
    function laneStages(lanes, rule) {
        const length = Math.max(0, ...lanes.map(lane => lane.length));
        return Array.from({ length }, (_, k) => ({ ms: rule.firstMs + k * rule.stepMs,
            cells: lanes.flatMap((lane, index) => (lane[k] ? [{ gx: lane[k].gx, gy: lane[k].gy, lane: index }] : [])) }));
    }
    function beamStages(area, source) {
        const rule = BOSS_MOVE_RULES.beam, cells = lanesOf(area, source)[0].map(cell => ({ gx: cell.gx, gy: cell.gy, lane: 0 }));
        return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
    }
    const plain = cell => ({ gx: cell.gx, gy: cell.gy, lane: 0 });
    function grindStages(area) {
        const rule = BOSS_MOVE_RULES.grind, cells = area.cells.map(plain);
        return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
    }
    function ringStages(area) {
        const rule = BOSS_MOVE_RULES.rings, centre = area.center, near = cell => Math.abs(cell.gx - centre.gx) + Math.abs(cell.gy - centre.gy) <= 1;
        return [{ ms: rule.firstMs, cells: area.cells.filter(near).map(plain) },
            { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter(cell => !near(cell)).map(plain) }];
    }
    function crossStages(area) {
        const rule = BOSS_MOVE_RULES.cross, centre = area.center, middle = cell => cell.gx === centre.gx && cell.gy === centre.gy;
        return [{ ms: rule.firstMs, cells: area.cells.filter(middle).map(plain) },
            { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter(cell => !middle(cell)).map(plain) }];
    }
    function scatterStages(area) {
        const rule = BOSS_MOVE_RULES.scatter, cells = area.cells.map(plain);
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        const size = Math.ceil(cells.length / rule.waves);
        return Array.from({ length: rule.waves }, (_, k) => ({ ms: rule.firstMs + k * rule.gapMs, cells: cells.slice(k * size, (k + 1) * size) }))
            .filter(stage => stage.cells.length);
    }
    function stagesOf(kind, area, source) {
        if (kind === 'volley' || kind === 'chain') return laneStages(lanesOf(area, source), BOSS_MOVE_RULES[kind]);
        if (kind === 'beam') return beamStages(area, source);
        if (kind === 'grind') return grindStages(area);
        if (kind === 'rings') return ringStages(area);
        return kind === 'cross' ? crossStages(area) : scatterStages(area);
    }

    /** Puts a move on a special about to be released (consumeBossPatternAttack): state.move, or nothing (lands at once). */
    function planBossMove(state, enemy) {
        if (!state || !state.area || !state.isSpecial || !enemy) return null;
        if (state.area.observerMove) return planObserverMove(state);
        releaseShift(enemy);
        return state.area.woodsman ? woodsmanBattle.plan(state) : planStagedMove(state, enemy);
    }
    function planObserverMove(state) {
        const { source, observerMove, room, bands } = state.area;
        const stages = observer.impacts(state.area).filter(stage => stage.cells.length);
        if (!stages.length) return null;
        state.move = { kind: 'observer', observerMove, source, room, bands, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
        return state.move;
    }
    function planStagedMove(state, enemy) {
        const style = styleOf(enemy), kind = moveKind(state.area, state.telegraphKind, style);
        if (!kind) return null;
        const source = state.area.source || { gx: enemy.gx, gy: enemy.gy }, stages = stagesOf(kind, state.area, source).filter(stage => stage.cells.length);
        if (!stages.length) return null;
        state.move = { kind, style, source, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
        return state.move;
    }

    /** The boss lets the special go (queueEnemyCombatAttack): its first stage lands after the stage's own time. */
    function beginBossMove(attack, now) {
        const move = attack.bossPattern && attack.bossPattern.move;
        if (!move) return;
        move.releasedAt = now;
        attack.at = now + move.stages[0].ms;
        live.push({ move, source: attack.source, element: enemyAttackRules.element(attack.source, attack.bossPattern), endsAt: now + move.stages[move.stages.length - 1].ms + LINGER_MS });
    }

    /** A volley's shots that hit someone this stage stop there (their later cells drop out). */
    function spendHitLanes(move, cells, now, ms) {
        for (const cell of cells) {
            const probe = { delivery: 'patternArea', bossPattern: { area: { cells: [cell] } } };
            if (move.spent.includes(cell.lane) || !enemyAttackRules.impactTargets(probe, game).length) continue;
            move.spent.push(cell.lane);
            move.hits.push({ lane: cell.lane, gx: cell.gx, gy: cell.gy, at: now, ms });
        }
    }

    function restArea(pattern, move) {
        const cells = move.stages.slice(move.next).flatMap(stage => stage.cells).filter(cell => !move.spent.includes(cell.lane));
        const unique = new Map(cells.map(cell => [gridCellKey(cell.gx, cell.gy), { gx: cell.gx, gy: cell.gy }]));
        return { ...pattern.area, cells: [...unique.values()] };
    }

    /** The landing attack's stage (takePendingEnemyCombatAttack): its pattern becomes this stage's cells and damage, the rest goes back
     * in the queue. null when the attack has no move. { cells, burst }: burst → a ground burst (rings, cross, scatter: the slam's
     * flash, shake and sound). */
    function takeBossMoveStage(attack, queue, now) {
        const pattern = attack.bossPattern, move = pattern && pattern.move;
        if (!move || move.next >= move.stages.length) return null;
        const stage = move.stages[move.next++], cells = stage.cells.filter(cell => !move.spent.includes(cell.lane));
        if (move.kind === 'volley') spendHitLanes(move, cells, now, stage.ms);
        queueRestOfMove(attack, move, queue);
        attack.bossPattern = { ...pattern, area: { ...pattern.area, cells: cells.map(cell => ({ gx: cell.gx, gy: cell.gy })) },
            damageMul: (Number(pattern.damageMul) || 1) * (stage.share || 1), isSpecial: pattern.isSpecial && move.next === 1 };
        if (move.observerMove === 'collapse') observer.collapse(attack, now);
        if (move.observerMove === 'seal') observer.seal(attack);
        return { cells, burst: ['rings', 'cross', 'scatter'].includes(move.kind) };
    }
    /** The stages still to land go back in the queue as one attack (not a special any more: no cast bar, no second log line). A volley
     * whose every shot hit has nothing left. */
    function queueRestOfMove(attack, move, queue) {
        const rest = move.stages.slice(move.next), pattern = attack.bossPattern;
        if (!rest.length || (move.kind === 'volley' && move.spent.length >= laneCount(move))) return;
        queue.push({ ...attack, at: move.releasedAt + rest[0].ms, bossPattern: { ...pattern, isSpecial: false, area: restArea(pattern, move) } });
    }
    const laneCount = move => new Set(move.stages.flatMap(stage => stage.cells.map(cell => cell.lane))).size;

    /** Moves still to draw (js/canvas-boss-moves.js): { move, source, element, endsAt }. */
    function liveBossMoves(now) {
        for (let i = live.length - 1; i >= 0; i--) if (now > live[i].endsAt || now < live[i].move.releasedAt) live.splice(i, 1);
        return live;
    }

    /** Cancel only stages that have not landed. Already drawn impacts finish their short tail. */
    function cutBossMove(move, now) {
        if (!move) return;
        move.stages = move.stages.slice(0, move.next);
        move.cutAt = now;
        const at = live.findIndex(row => row.move === move);
        if (at < 0) return;
        if (!move.stages.length) live.splice(at, 1);
        else live[at].endsAt = Math.min(live[at].endsAt, now + LINGER_MS);
    }

    return Object.freeze({ rules: BOSS_MOVE_RULES, fxOf: bossFxOf, styleOf, intro: introSpecial, introCount, plan: planBossMove, begin: beginBossMove,
        takeStage: takeBossMoveStage, live: liveBossMoves, cut: cutBossMove, firstImpactMs, familyShapes, shapeLook,
        shiftPattern, canPrepare, prepareShift, updateShift, shiftOf, cancelShift, needsWarning, observer });
})();
safeExposeGlobals({ BOSS_MOVE_RULES, bossMoves });
