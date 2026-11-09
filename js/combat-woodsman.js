/** Six field attacks use the normal pending-hit/defense pipeline. Nothing ticks outside this encounter.
 * A cast locks its element and target at warning time. Renderers read this same geometry; media never drive damage.
 * Transient states live on the existing patternArea/move. No account, reward or entry-lock state is added. */
const woodsmanBattle = (() => {
    const owns = enemy => !!enemy?.isWoodsman && !enemy.noAttack && game.currentZoneId === OUTSIDE_CHAOS_ZONE_ID;
    const phase = enemy => getWoodsmanPhaseProgress(enemy);
    const element = enemy => WOODSMAN_BATTLE.elements[Math.floor(phase(enemy) / .05) % 5];
    /** The boss remains owned by pack.waiting until this combat-clock introduction ends.
     * Views may show the body and its existing story line; target selection/HP HUD only see active enemies. */
    function introduction() {
        if (game.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID) return null;
        const run = actExplorationState.current(game), entrance = actExplorationState.entrance(run);
        if (!entrance) return null;
        const enemy = run.packs.find(pack => pack.key === entrance.key)?.waiting.find(owns);
        return enemy ? { enemy, elapsedMs: Math.max(0, run.motionTimeMs - entrance.at) } : null;
    }
    function bounds(enemy) {
        const map = getCombatGridSize(), room = map.rooms && actExplorationRooms.roomAt(map, enemy);
        return room ? { x0: room.x0, y0: room.y0, x1: room.x1, y1: room.y1 }
            : { x0: 0, y0: 0, x1: map.columns - 1, y1: map.rows - 1 };
    }
    // Reference artwork coordinate <-> grid cell centre; camera and viewport never affect the simulation.
    const point = (cell, box) => ({ x: 220 + (cell.gx - box.x0) / Math.max(1, box.x1 - box.x0) * 1232,
        y: 500 + (cell.gy - box.y0) / Math.max(1, box.y1 - box.y0) * 360 });
    const cell = (p, box) => ({ gx: box.x0 + (p.x - 220) / 1232 * (box.x1 - box.x0),
        gy: box.y0 + (p.y - 500) / 360 * (box.y1 - box.y0) });
    function prepare(enemy) {
        if (!owns(enemy)) return;
        const p = phase(enemy);
        enemy.ele = element(enemy);
        enemy.atkMul = 1 + Math.pow(p, 1.4) * 3.2;
        enemy.attackSpeedVar = (1 + Math.pow(p, 1.2) * 1.8) * 1.5;
        enemy.penetration = 8 + Math.floor(p * 28);
        enemy.dr = 10 + Math.floor(p * 40);
        if (!enemy.woodsmanStumpsPlaced && !enemy.woodsmanStumpsDue && enemy.hp <= enemy.maxHp * .6) {
            enemy.woodsmanStumpsDue = true;
            if (!enemy.patternTelegraphKey) enemy.nextPatternState = null;
        }
        woodsmanStumps.tick(enemy);
        if (enemy.patternMode === 'woodsman') return;
        enemy.patternMode = 'woodsman';
        const box = bounds(enemy);
        enemy.footprint = { columns: 3, rows: 1 };
        enemy.gx = Math.floor((box.x0 + box.x1 - 2) / 2);
        enemy.gy = box.y0;
        enemy.gridMove = null;
        enemy.nextPatternState = null;
        enemy.patternArea = null;
        enemy.patternTelegraphKey = null;
    }
    function preview(enemy) {
        const n = Math.max(0, Math.floor(enemy.patternAttackCount || 0));
        const area = enemy.patternArea?.woodsman, kept = area?.attackNumber === n + 1 ? area : null;
        const row = installationDue(enemy, kept) ? WOODSMAN_BATTLE.stumpPattern : choosePattern(enemy, n, kept);
        const cover = row.id.startsWith('cover-');
        return { mode: 'woodsman', patternMode: 'woodsman', attackNumber: n + 1,
            label: _t(row.name), isSpecial: true, damageMul: cover ? 1.7 : 1.15, telegraphKind: 'woodsman',
            warningMs: cover ? 2600 : WOODSMAN_BATTLE.motions[row.motion].release,
            attackElement: kept?.element || element(enemy), woodsmanType: row.id, motion: row.motion, recoveryMs: 900 };
    }
    function installationDue(enemy, kept) {
        return kept?.type === 'stump' || !enemy.woodsmanStumpsPlaced && (enemy.woodsmanStumpsDue || enemy.hp <= enemy.maxHp * .6);
    }
    function choosePattern(enemy, n, kept) {
        if (kept) return [...WOODSMAN_BATTLE.patterns, ...WOODSMAN_BATTLE.coverPatterns].find(row => row.id === kept.type);
        const grounded = enemy.woodsmanStumps?.some(row => row.phase === 'idle');
        if (grounded && n % 2) return WOODSMAN_BATTLE.coverPatterns[Math.floor(n / 2) % 3];
        return WOODSMAN_BATTLE.patterns[(grounded ? Math.floor(n / 2) : n) % 6];
    }
    function events(type, hero, variant) {
        if (type === 'spire') return [hero, { x: clampNumber(hero.x - 300, 320, 1350), y: clampNumber(hero.y + 70, 540, 820) },
            { x: clampNumber(hero.x + 300, 320, 1350), y: clampNumber(hero.y - 70, 540, 820) }]
            .map((p, i) => ({ ...p, at: i * 280, duration: 850, rx: 100, ry: 43, kind: 'ellipse', fx: 'spire' }));
        if (type === 'wheel') return [{ at: 0, duration: 1600, x: [620, 836, 1052][variant % 3], y: 655, kind: 'annulus', fx: 'wheel' }];
        if (type === 'lance') return (variant % 2 ? [528, 938, 1348] : [323, 733, 1143]).map((x, i) => ({ at: i * 320, duration: 820, x, y: 675,
            width: 176, top: 492, bottom: 860, kind: 'lane', fx: 'lance' }));
        if (type === 'nova') return [[836, 620], [1140, 625], [1090, 790], [580, 790], [530, 625]]
            .map(([x, y], i) => ({ x, y, at: i * 270, duration: 1000, rx: 155, ry: 66, kind: 'ellipse', fx: 'nova' }));
        if (type === 'wave') return [[510, 836, 1162][variant % 3], [510, 836, 1162][Math.floor(variant / 3) % 3]]
            .map((gap, i) => ({ at: i * 1600, duration: 1900, x: 836, y: 500,
            gap, gapWidth: 260, kind: 'front', fx: 'wave' }));
        return [{ at: 0, duration: 850, a: { x: 1100, y: 505 }, b: { x: 560, y: 850 },
            halfWidth: 100, kind: 'segment', fx: 'cleave', x: 830, y: 675 },
        ...[.2, .45, .7].map((f, i) => ({ x: 1100 - 540 * f, y: 505 + 345 * f, at: 500 + i * 200,
            duration: 700, rx: 105, ry: 46, kind: 'ellipse', fx: 'spire' }))];
    }
    function geometry(event, age) {
        if (event.kind === 'annulus') return { ...event, radius: 140 + clampNumber(age / event.duration, 0, 1) * (event.range || 530) };
        if (event.kind === 'front') return { ...event, y: 500 + clampNumber(age / event.duration, 0, 1) * 360 };
        if (event.kind === 'sidefront') return { ...event, x: event.fromX + (event.toX - event.fromX) * clampNumber(age / event.duration, 0, 1) };
        return event;
    }
    function segmentDistance(p, e) {
        const dx = e.b.x - e.a.x, dy = (e.b.y - e.a.y) / .5;
        const t = clampNumber(((p.x - e.a.x) * dx + (p.y - e.a.y) / .5 * dy) / (dx * dx + dy * dy), 0, 1);
        return Math.hypot(p.x - e.a.x - dx * t, (p.y - e.a.y) / .5 - dy * t);
    }
    function contains(event, p, age) {
        const e = geometry(event, age);
        if (e.kind === 'ellipse') return ((p.x - e.x) / e.rx) ** 2 + ((p.y - e.y) / e.ry) ** 2 <= 1;
        if (e.kind === 'lane') return Math.abs(p.x - e.x) <= e.width / 2 && p.y >= e.top && p.y <= e.bottom;
        if (e.kind === 'front') return Math.abs(p.y - e.y) <= 28 && Math.abs(p.x - e.gap) > e.gapWidth / 2;
        if (e.kind === 'sidefront') return Math.abs(p.x - e.x) <= 65;
        if (e.kind === 'segment') return segmentDistance(p, e) <= e.halfWidth;
        return Math.abs(Math.hypot(p.x - e.x, (p.y - e.y) / .38) - e.radius) <= 42;
    }
    function cellsIn(box) {
        const terrain = getGridPlacementTerrain(), result = [], blocked = new Set();
        for (let gy = box.y0; gy <= box.y1; gy++) for (let gx = box.x0; gx <= box.x1; gx++) {
            if (canPlaceGridFootprint(blocked, gx, gy, { columns: 1, rows: 1 }, terrain)) result.push({ gx, gy });
        }
        return result;
    }
    function stagesFor(event, box, all, id) {
        const moving = ['annulus', 'front', 'sidefront'].includes(event.kind);
        const samples = moving ? Array.from({ length: Math.ceil((event.duration - 120) / 100) }, (_, i) => 120 + i * 100) : [160];
        return samples.map(age => ({ ms: event.at + age, eventId: id,
            cells: all.filter(c => contains(event, point(c, box), age)).map(c => ({ ...c, lane: id })) })).filter(s => s.cells.length);
    }
    function warning(enemy, state, target, now) {
        const box = bounds(enemy), excluded = woodsmanStumps.patternCells(), variant = Math.floor(Math.random() * 18);
        const keysBlocked = new Set(excluded.map(c => gridCellKey(c.gx, c.gy)));
        let all = cellsIn(box).filter(c => !keysBlocked.has(gridCellKey(c.gx, c.gy)));
        if (state.woodsmanType === 'stump') return woodsmanStumps.warning(enemy, state, now, box);
        const cover = shelter(enemy, state.woodsmanType, variant, all, box);
        if (cover) {
            const safe = new Set(cover.cells.map(c => gridCellKey(c.gx, c.gy)));
            all = all.filter(c => !safe.has(gridCellKey(c.gx, c.gy)));
        }
        const rows = cover ? coverEvents(state.woodsmanType, cover) : events(state.woodsmanType, point(target, box), variant);
        if (variant % 2 && ['spire', 'nova', 'cleave'].includes(state.woodsmanType)) rows.forEach(mirrorEvent);
        const groups = new Map();
        for (const row of rows.flatMap((e, id) => stagesFor(e, box, all, id))) {
            if (!groups.has(row.ms)) groups.set(row.ms, { ms: row.ms, cells: [] });
            groups.get(row.ms).cells.push(...row.cells);
        }
        const stages = [...groups.values()].sort((a, b) => a.ms - b.ms);
        const keys = new Map(stages.flatMap(s => s.cells).map(c => [gridCellKey(c.gx, c.gy), c]));
        const cast = { type: state.woodsmanType, motion: state.motion, element: element(enemy),
            startedAt: now, warningMs: state.warningMs, attackNumber: state.attackNumber, box, events: rows, stages, variant, excluded, cover };
        return { kind: 'woodsman', cells: [...keys.values()], source: { gx: enemy.gx, gy: enemy.gy }, woodsman: cast };
    }
    function shelter(enemy, type, variant, all, box) {
        if (!type.startsWith('cover-')) return null;
        const cube = enemy.woodsmanStumps?.find(row => row.phase === 'idle');
        if (!cube) return null;
        const direction = type === 'cover-sweep' ? (variant % 2 ? 'west' : 'east') : type === 'cover-tide' ? 'south' : 'radial';
        const rect = { x0: cube.gx - .5, y0: cube.gy - .5, x1: cube.gx + cube.footprint.columns - .5, y1: cube.gy + cube.footprint.rows - .5 };
        const origin = { gx: (box.x0 + box.x1) / 2, gy: box.y0 - 1 };
        const cells = all.filter(c => {
            if (direction === 'south') return c.gy > rect.y1 && c.gx > rect.x0 && c.gx < rect.x1;
            if (direction === 'east') return c.gx > rect.x1 && c.gy > rect.y0 && c.gy < rect.y1;
            if (direction === 'west') return c.gx < rect.x0 && c.gy > rect.y0 && c.gy < rect.y1;
            return rayBlocked(origin, c, rect);
        });
        return { direction, cells, origin: point(origin, box) };
    }
    function rayBlocked(from, to, rect) {
        let near = 0, far = 1;
        for (const [axis, low, high] of [['gx', 'x0', 'x1'], ['gy', 'y0', 'y1']]) {
            const delta = to[axis] - from[axis];
            if (!delta) { if (from[axis] < rect[low] || from[axis] > rect[high]) return false; continue; }
            const a = (rect[low] - from[axis]) / delta, b = (rect[high] - from[axis]) / delta;
            near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        }
        return near < far && far < 1;
    }
    function coverEvents(type, cover) {
        if (type === 'cover-tide') return [0, 1500].map(at => ({ at, duration: 1800, x: 836, y: 500,
            gap: -1000, gapWidth: 0, kind: 'front', fx: 'wave' }));
        if (type === 'cover-sweep') return [{ at: 0, duration: 2200, kind: 'sidefront', fx: 'lance',
            x: cover.direction === 'east' ? 220 : 1452, y: 680, fromX: cover.direction === 'east' ? 220 : 1452, toX: cover.direction === 'east' ? 1452 : 220 }];
        return [{ at: 0, duration: 2300, ...cover.origin, kind: 'annulus', fx: 'wheel', range: 1250 }];
    }
    function mirrorEvent(row) {
        row.x = 1672 - row.x;
        row.mirrored = true;
        if (row.a) { row.a.x = 1672 - row.a.x; row.b.x = 1672 - row.b.x; }
    }
    function plan(state) {
        const cast = state.area.woodsman;
        state.attackElement = cast.element;
        state.move = { kind: 'woodsman', source: state.area.source, stages: cast.stages, next: 0, spent: [], hits: [], releasedAt: 0, cast };
        return state.move;
    }
    /** Called once by the combat resolver, after its normal occupant query. Each wave/burst hits each target only once. */
    function takeTargets(attack, targets) {
        const move = attack.bossPattern?.move;
        if (move?.kind !== 'woodsman') return targets;
        if (move.cast.type === 'stump') return [];
        const stage = move.stages[move.next - 1];
        const blocked = new Set(woodsmanStumps.patternCells().map(c => gridCellKey(c.gx, c.gy)));
        return targets.filter(unit => {
            const cells = getGridUnitCells(unit);
            const hit = stage.cells.find(c => !blocked.has(gridCellKey(c.gx, c.gy))
                && cells.some(p => p.gx === c.gx && p.gy === c.gy));
            if (!hit) return false;
            const eventId = hit.lane;
            const key = `${eventId}:${unit === game.gridPlayer ? 'player' : unit.id}`;
            if (move.hits.includes(key)) return false;
            move.hits.push(key);
            return true;
        });
    }
    function current(enemy) {
        if (!owns(enemy) || enemy.hp <= 0) return null;
        if (enemy.patternTelegraphKey && enemy.patternArea?.woodsman) return enemy.patternArea.woodsman;
        const live = bossMoves.live(getCombatTime()).find(row => row.source === enemy && row.move.kind === 'woodsman' && !row.move.cutAt);
        return live ? { ...live.move.cast, releasedAt: live.move.releasedAt } : null;
    }
    function warningCells(cast, now, release) {
        const elapsed = now - (release ?? cast.startedAt + cast.warningMs);
        const next = cast.stages.find(row => row.ms >= elapsed);
        if (!next) return [];
        return cast.stages.filter(row => row.ms >= elapsed && row.ms <= Math.max(0, elapsed) + 500)
            .flatMap(row => row.cells);
    }
    return Object.freeze({ owns, introduction, prepare, preview, warning, plan, takeTargets, current, bounds, point, cell, geometry, contains, warningCells, cellsIn });
})();
safeExposeGlobals({ woodsmanBattle });
