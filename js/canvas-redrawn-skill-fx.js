/** 새로 그린 스킬 이펙트 22종을 실제 전투 이벤트에 연결한다 (인계 ui_player.js의 젬별 draw 함수를 게임용으로 옮김, 09-30 변경분 포함).
 * The world-tree renderer offers every event it is about to draw to claim(). Events a redrawn gem replaces (the handoff's
 * customSkip) are collected per cast — one attack's stage/travel/hit events, keyed by its damage group or channel — and
 * that gem's drawer paints the whole cast into the remake pass once per frame (ground layer under the actors, the rest in
 * the foreground). Times are combat snapshots already on the visual clock (native gems: the combat clock); nothing here
 * schedules, resolves or applies damage.
 */
const redrawnSkillFx = (() => {
    const IDS = new Set([3, 5, 10, 16, 17, 18, 21, 28, 29, 30, 32, 33, 37, 38, 41, 42, 43, 45, 46, 48, 50, 51]);
    const REPLACED = { 3: ['windup', 'stage', 'hit'], 33: ['windup', 'stage', 'hit'], 21: ['travel', 'hit'],
        45: ['travel', 'stage', 'hit'], 38: ['travel', 'stage', 'hit'], 51: ['stage'], 16: ['windup', 'stage', 'hit'], 37: ['windup', 'stage', 'hit'],
        // 빙결 파열창 keeps its redrawn spear (fxRemake.projectile) and only its hits turn to frost mist; 과냉각 혼합물 keeps
        // its flask flight and hit sparks and only its heavy cloud ring (the wave stage) becomes thin frost rings.
        30: ['hit'], 48: ['stage'] };
    const CAST_LIMIT = 48;
    const TAIL_MS = 1400;
    const SPIN = ['east', 'south', 'west', 'north'];
    // Art wrapped around the caster's own body (the blade wind, the slam's falling streaks) always stays in front of it.
    const AROUND_BODY = new Set([5, 18]);
    const casts = new Map();

    const art = () => redrawnSkillArt;
    const extra = () => redrawnSkillArtExtra;
    const cellDot = g => ({ x: g.gx * 16 + 8, y: g.gy * 16 + 8 });
    const hitCell = e => e.targetCells && e.targetCells[0];
    const eventsOf = (cast, kind) => cast.events.filter(e => e.kind === kind);
    const firstOf = (cast, kind) => cast.events.find(e => e.kind === kind);

    function replaces(id, e) {
        if (id === 50) return e.kind === 'stage' && e.holyMistPhase === 'mist';
        return (REPLACED[id] || ['stage', 'hit']).includes(e.kind);
    }
    function isActive(spec) { return !!spec && IDS.has(spec.id) && fxRemake.isEnabled(); }
    function castKey(event, spec) {
        const group = event.groupId != null && event.groupId !== '' ? String(event.groupId).split(':')[0] : '';
        return `${spec.id}|${event.channelId || group || event.at}`;
    }
    function trim() {
        while (casts.size > CAST_LIMIT) casts.delete(casts.keys().next().value);
    }
    function register(event, spec, clock) {
        const key = castKey(event, spec);
        let cast = casts.get(key);
        if (!cast) {
            cast = { key, id: spec.id, skillName: event.skillName, clock, events: [], end: 0 };
            casts.set(key, cast);
            trim();
        }
        if (cast.events.includes(event)) return;
        cast.events.push(event);
        cast.end = Math.max(cast.end, event.at + (event.duration || 0));
    }
    // Phases where a gem's own art holds the prop the character carries: 신성한 안개·파문심판 swing their censer and
    // 암살 draws its dagger. While one is on screen the character's weapon layer is left out (the hands stay).
    const WEAPON_PHASES = {
        50: e => e.holyMistPhase === 'censer', 51: e => e.judgmentPhase === 'censer',
        52: e => e.assassinationPhase === 'dagger' || e.assassinationPhase === 'slash'
    };
    const weaponWindows = [];
    function noteWeaponWindow(event, spec, clock) {
        const phase = spec && WEAPON_PHASES[spec.id];
        if (!phase || !phase(event) || weaponWindows.some(w => w.event === event)) return;
        weaponWindows.push({ event, clock, from: event.at, to: event.at + (event.duration || 0) });
        if (weaponWindows.length > 8) weaponWindows.shift();
    }
    /** True while a gem's own censer or dagger is on screen (see WEAPON_PHASES). */
    function weaponHidden(visualNow) {
        return weaponWindows.some(w => {
            const now = w.clock === 'combat' ? worldTreeSkillFx.castClock() : visualNow;
            return now >= w.from && now < w.to;
        });
    }
    /** Called by the world-tree renderer before it draws an event. True = a redrawn gem owns it; skip the native sprite. */
    function claim(event, spec, clock = 'visual') {
        noteWeaponWindow(event, spec, clock);
        if (!isActive(spec) || !replaces(spec.id, event)) return false;
        register(event, spec, clock);
        return true;
    }
    // Staged gem contacts carry no per-victim sprite (the skill image owns the contact), so the drawers read the victims
    // from the combat's own hit records — the ones that also place the damage numbers (cell, time, group, repeat).
    const hitEvents = new WeakMap();
    function hitEvent(fx) {
        let event = hitEvents.get(fx);
        if (!event) {
            event = { kind: 'hit', skillName: fx.skillName, at: fx.start, duration: fx.duration || 320, targetCells: fx.targetCell ? [fx.targetCell] : [],
                sourceCell: fx.sourceCell, element: fx.element, stageIndex: fx.stageIndex || 0, repeatIndex: fx.repeatIndex,
                channelId: fx.channelId, groupId: fx.damageTextGroupId };
            hitEvents.set(fx, event);
        }
        return event;
    }
    function collectHits() {
        for (const fx of battleFx) {
            if (!fx || fx.type !== 'hit' || fx.dot || !fx.targetCell) continue;
            const spec = SKILL_FX_ATLAS[fx.skillName];
            if (isActive(spec)) register(hitEvent(fx), spec, 'visual');
        }
    }

    // ------------------------------------------------------------------ geometry shared with the character
    /** Board dots below a cell centre where the characters' feet stand (8px in exploration, 22% of a tile on the fixed board). */
    function feetDots(view) {
        const p = view.projection;
        return p && p.tileW ? (Number(p.actorGroundOffsetY) || 0) * 48 / p.tileW : 8;
    }
    function feetY(cell, view) { return Math.round((cell.gy * 48 + 24 + feetDots(view)) / 3); }
    function farthestCell(source, cells) {
        const distance = c => Math.hypot(c.gx - source.gx, c.gy - source.gy);
        return (cells || []).reduce((best, c) => (!best || distance(c) > distance(best) ? c : best), null);
    }
    function unitToward(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        return { x: dx / L, y: dy / L };
    }
    /** Cells an event's footprint grew by (effect expansion) over the gem's own radius; fixed-size art grows 16 dots a cell. */
    function grownBy(cast, st) {
        const r = Number(st && st.footprint && st.footprint.radius), base = Number(SKILL_GRID_DB[cast.skillName]?.radius) || 0;
        return Number.isFinite(r) ? Math.max(0, r - base) : 0;
    }

    // ------------------------------------------------------------------ drawers (handoff ui_player.js, per cast)
    function drawVoid(dot, cast, ft) {                        // 43 공허 절삭광
        const st = firstOf(cast, 'stage');
        const age = st ? ft - st.at : -1;
        if (!st || age < 0 || age >= st.duration) return;
        const S = cellDot(st.sourceCell), B = cellDot(st.targetCells[0]), d = unitToward(S, B), A = { x: S.x + d.x * 4, y: S.y + d.y * 4 - 2 };
        const surge = cast.events.some(e => e.kind === 'hit' && ft >= e.at && ft < e.at + 70) ? 1 : 0;
        art().VoidBolt.beam(dot, A, B, { age, dur: st.duration, variant: Math.floor(age / 70) % 4, surge, grow: age / 90 });
        cast.events.forEach((e, i) => { const tc = e.kind === 'hit' && hitCell(e); if (tc) art().VoidBolt.impact(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at, i + 1); });
    }
    function drawCrescent(dot, cast, ft) {                    // 16 공허 베기
        const st = firstOf(cast, 'stage');
        if (!st) return;
        const S = cellDot(st.sourceCell), d = unitToward(S, cellDot(st.targetCells.at(-1)));
        // (09-30) the crescent only — the rift before the swing and the X marks on the struck cells were taken out
        art().VoidCrescent.crescent(dot, { x: S.x + d.x * 9, y: S.y + d.y * 9 - 2 }, d, ft - st.at, { dur: Math.max(260, st.duration + 40), R: 13, travel: 30 });
    }
    function frostReach(st, ctr, hits) {
        const radius = Number(st.footprint?.radius) || 0;
        return Math.max(24, radius * 16 + 6, ...hits.map(e => Math.hypot(hitCell(e).gx - ctr.gx, hitCell(e).gy - ctr.gy) * 16 + 6));
    }
    function drawFrost(dot, cast, ft) {                       // 10 서리 폭발
        const st = firstOf(cast, 'stage');
        if (!st) return;
        const ctr = st.footprint?.center || st.targetCells[0], c = cellDot(ctr), hits = eventsOf(cast, 'hit').filter(hitCell);
        const msPerCell = SKILL_DB[cast.skillName]?.combatPattern?.waveMsPerCell || 90;
        art().FrostRing.ring(dot, c.x, c.y, ft - st.at, { msPerCell, maxR: frostReach(st, ctr, hits) });
        for (const e of hits) {
            const t = hitCell(e);
            if (t.gx !== ctr.gx || t.gy !== ctr.gy) art().FrostRing.flake(dot, t.gx * 16 + 8, t.gy * 16 + 6, ft - e.at);
        }
    }
    function drawWave(dot, cast, ft) {                        // 41 집중 광선
        const st = firstOf(cast, 'stage');
        const age = st ? ft - st.at : -1;
        if (!st || age < 0 || age >= st.duration) return;
        const S = cellDot(st.sourceCell), B = cellDot(farthestCell(st.sourceCell, st.footprint?.cells) || st.targetCells[0]), d = unitToward(S, B);
        const A = { x: S.x + d.x * 4, y: S.y + d.y * 4 - 2 }, B2 = { x: B.x + d.x * 6, y: B.y + d.y * 6 - 2 };
        const surge = cast.events.some(e => e.kind === 'hit' && ft >= e.at && ft < e.at + 80) ? 1 : 0;
        art().EnergyWave.wave(dot, A, B2, { age, dur: st.duration, surge });
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) art().EnergyWave.hit(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at); }
    }
    function triGeometry(st) {
        const cn = st.footprint && st.footprint.cone, src = st.sourceCell, t = st.targetCells[0];
        const d = cn ? { x: cn.dx, y: cn.dy } : unitToward({ x: src.gx, y: src.gy }, { x: t.gx, y: t.gy });
        const len = cn ? cn.length : (st.stageIndex + 1) * 1.2;
        return { O: { x: src.gx * 16 + 8 + d.x * 4, y: src.gy * 16 + 8 + d.y * 4 - 2 }, d, Rmax: Math.max(12, len * 16 - 2), T: st.duration + 60, start: st.at - 20 };
    }
    function triSpark(dot, e, stage, ft) {
        const tc = hitCell(e);
        if (!tc) return;
        const g = stage.geo, x = tc.gx * 16 + 8, y = tc.gy * 16 + 6, dist = Math.hypot(x - g.O.x, y - g.O.y);
        const f = Math.min(1, Math.max(0, (dist - 4) / (g.Rmax - 4))), arrive = g.start + g.T * (1 - Math.sqrt(1 - f));
        art().TriWave.spark(dot, x, y, ft - arrive, { el: e.element || stage.element, seed: stage.seed });
    }
    function drawTri(dot, cast, ft) {                         // 32 삼원 파동
        const stages = eventsOf(cast, 'stage').map(st => ({ st, geo: triGeometry(st) }));
        stages.forEach(({ st, geo }) => art().TriWave.wave(dot, geo.O, geo.d, ft - geo.start, { T: geo.T, Rmax: geo.Rmax, half: .7, el: st.element, R0: 4 }));
        cast.events.forEach((e, i) => {
            const stage = e.kind === 'hit' && stages.find(s => s.st.stageIndex === e.stageIndex);
            if (stage) triSpark(dot, e, { geo: stage.geo, element: stage.st.element, seed: i + 1 }, ft);
        });
    }
    function breathFlames(dot, b, t0, i) {
        const dir = i % 2 ? -1 : 1;
        for (const cl of b.cells) {
            const cx = cl.gx * 16 + 8, cy = cl.gy * 16 + 8;
            let phi = Math.atan2(cy - b.O.y, cx - b.O.x) - b.base;
            phi = Math.atan2(Math.sin(phi), Math.cos(phi));
            const f = Math.min(1, Math.max(0, (phi * dir + 1.4) / (2 * 1.4))), at = t0 + 200 * (1 - Math.sqrt(1 - f)), sd = (cl.gx * 7 + cl.gy * 13) % 5;
            art().DragonSweep.flame(dot, cx + (sd % 3) - 1, cy + 5, b.ft - at, { life: 560, big: 1, seed: sd + i });
            art().DragonSweep.flame(dot, cx + (sd % 2 ? 4 : -4), cy + 7, b.ft - at - 40, { life: 440, big: 0, seed: sd + i + 2 });
        }
    }
    function breathDirection(st) {
        const cone = st.footprint?.cone;
        return cone ? { x: cone.dx, y: cone.dy } : unitToward(cellDot(st.sourceCell), cellDot(st.targetCells[0]));
    }
    function breathMouth(dot, O, hot) {                       // a small steady knot at the hand while channelling
        const x = Math.round(O.x), y = Math.round(O.y);
        dot(x, y, hot ? '#ffffff' : '#fff1b8');
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(x + ox, y + oy, hot ? '#fff1b8' : '#ff963e');
    }
    function drawBreath(dot, cast, ft) {                      // 42 용화 숨결
        const st = firstOf(cast, 'stage');
        if (!st) return;
        const src = st.sourceCell, d = breathDirection(st), O = { x: src.gx * 16 + 8 + d.x * 3, y: src.gy * 16 + 8 + d.y * 3 - 2 };
        const b = { O, base: Math.atan2(d.y, d.x), cells: st.footprint?.cells || [], ft };
        const ticks = [...new Set(eventsOf(cast, 'hit').map(e => e.at))].sort((p, q) => p - q);
        ticks.forEach((t0, i) => breathFlames(dot, b, t0, i));
        ticks.forEach((t0, i) => art().DragonSweep.swing(dot, O, d, ft - t0, { T: 200, life: 170, sweep: 1.4, dir: i % 2 ? -1 : 1, R: 28 }));
        if (ft >= st.at && ft < st.at + st.duration) breathMouth(dot, O, ticks.some(t => ft >= t && ft < t + 50));
    }
    function drawMist(dot, cast, ft) {                        // 50 신성한 안개 (ground)
        for (const st of cast.events) {
            if (st.kind !== 'stage' || st.holyMistPhase !== 'mist') continue;
            const src = st.holySource || st.sourceCell;
            art().HolyMist.mist(dot, src.gx * 16 + 8, src.gy * 16 + 9, ft - st.at, { dur: st.duration, R: 17, N: 12 });
        }
    }
    function whirlSpan(hits) {
        const times = hits.map(e => e.at);
        return { t0: Math.min(...times), t1: Math.max(...times) + 140 };
    }
    function drawWhirl(dot, cast, ft, view) {                 // 5 회오리바람: the blade wind stays on the caster as they move
        const hits = eventsOf(cast, 'hit').filter(hitCell);
        if (!hits.length) return;
        const src = hits[0].sourceCell || hitCell(hits[0]), span = whirlSpan(hits), c = view.playerDot || cellDot(src);
        const R = 19 + 16 * grownBy(cast, firstOf(cast, 'stage'));
        art().Whirlwind.whirl(dot, c.x, c.y, ft - span.t0, { T: span.t1 - span.t0, F: 160, period: 360, R, start: 0 });
        for (const e of hits) {                               // each cut points away from where the caster stood at that spin
            const tc = hitCell(e), x = tc.gx * 16 + 8, y = tc.gy * 16 + 6, h = e.sourceCell ? cellDot(e.sourceCell) : c;
            art().Whirlwind.cut(dot, x, y, ft - e.at, Math.atan2(y - h.y, x - h.x));
        }
    }
    function frostWaveCells(nodes) {                          // cells crossed, each with every time the front passed inside it
        const groups = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
            for (let k = 0; k <= n; k++) {
                const u = k / n, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, key = Math.floor(x / 16) + ',' + Math.floor(y / 16), g = groups.at(-1);
                if (g && g.key === key) g.ts.push(a.t + (b.t - a.t) * u);
                else groups.push({ key, gx: Math.floor(x / 16), gy: Math.floor(y / 16), ts: [a.t + (b.t - a.t) * u] });
            }
        }
        return groups;
    }
    function frostWaveFront(dot, tr, nodes, ft) {
        const age = ft - tr.at;
        if (age < 0 || age >= tr.duration) return;
        let i = 0;
        while (i < nodes.length - 2 && nodes[i + 1].t <= ft) i++;
        const a = nodes[i], b = nodes[i + 1], u = Math.max(0, Math.min(1, (ft - a.t) / Math.max(1, b.t - a.t))), d = unitToward(a, b);
        art().FrostWave.front(dot, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, age, { d, fade: Math.max(0, (age - (tr.duration - 140)) / 140) });
    }
    function drawFrostWave(dot, cast, ft) {                   // 21 서리 파동
        const tr = firstOf(cast, 'travel');
        if (!tr || !tr.travelPath || tr.travelPath.length < 2) return;
        const nodes = tr.travelPath.map(p => ({ x: p.gx * 16 + 8, y: p.gy * 16 + 7, t: tr.at + p.offsetMs }));
        const struck = new Set(eventsOf(cast, 'hit').filter(hitCell).map(e => Math.round(hitCell(e).gx) + ',' + Math.round(hitCell(e).gy)));
        frostWaveCells(nodes).forEach((g, i) => {
            if (i === 0 || (g.ts.length < 6 && !struck.has(g.key))) return;
            art().FrostWave.pulse(dot, g.gx * 16 + 8, g.gy * 16 + 7, ft - g.ts[g.ts.length >> 1], struck.has(g.key));
        });
        frostWaveFront(dot, tr, nodes, ft);
    }
    function drawCollapse(dot, cast, ft) {                    // 28 중력 붕괴
        const st = eventsOf(cast, 'stage').sort((a, b) => a.at - b.at);
        if (!st.length) return;
        const ctr = st[0].footprint?.center || st[0].targetCells[0];
        const pull = SKILL_DB[cast.skillName]?.combatPattern?.stages?.[1]?.delayMs || 320, t1 = (st[1] ? st[1].at : st[0].at + pull) - st[0].at;
        art().GravityCollapse.collapse(dot, ctr.gx * 16 + 8, ctr.gy * 16 + 8, ft - st[0].at, { t1, R1: 27 });
    }
    function drawTriple(dot, cast, ft) {                      // 33 뇌격 삼연타 (the charge before the first hit is drawn from the swing)
        eventsOf(cast, 'hit').filter(hitCell).forEach((e, i) => {
            const tc = hitCell(e), k = e.repeatIndex != null ? e.repeatIndex : i;
            art().TripleBolt.strike(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at - k * 90, k % 3);
        });
    }
    function drawLance(dot, cast, ft) {                       // 45 광창 강림
        const tr = firstOf(cast, 'travel');
        if (!tr) return;
        for (const tc of tr.targetCells || []) art().RadiantLance.lance(dot, tc.gx * 16 + 8, tc.gy * 16 + 11, ft - tr.at, { fall: tr.duration, H0: 44 });
    }
    function judgmentSwing(t) {                               // the censer: wound back (0–300ms), swung across the front (–480), let go
        const E = u => u * u * (3 - 2 * u);
        if (t < 300) { const u = t / 300; return { rel: 90 + 110 * E(u), len: 8 + 6 * u }; }
        if (t < 480) { const u = (t - 300) / 180; return { rel: 200 * (1 - u * u), len: 14 + 16 * u }; }
        const u = Math.min(1, (t - 480) / 140);
        return { rel: -70 * (1 - (1 - u) * (1 - u)), len: 30 - 6 * u };
    }
    function judgmentPos(j, t) {
        const q = judgmentSwing(t), a = j.base + j.side * q.rel * Math.PI / 180;
        return { x: j.H.x + Math.cos(a) * q.len, y: j.H.y + Math.sin(a) * q.len };
    }
    function judgmentBolt(dot, j, cl, i) {                    // discharge when the swing angle passes the cell's angle
        const cx = cl.gx * 16 + 8, cy = cl.gy * 16 + 8;
        let rc = (Math.atan2(cy - j.H.y, cx - j.H.x) - j.base) * 180 / Math.PI * j.side;
        rc = ((rc + 540) % 360) - 180;
        let bt = 480, bd = 1e9;
        for (let k = 300; k <= 620; k += 2) { const v = Math.abs(judgmentSwing(k).rel - rc); if (v < bd) { bd = v; bt = k; } }
        art().RippleSwing.bolt(dot, judgmentPos(j, bt), { x: cx, y: cy }, j.t - bt, i + 1);
        art().RippleSwing.spark(dot, cx, cy + 2, j.t - bt, i);
    }
    function judgmentTrail(dot, j) {
        const pts = [];
        for (let k = 0; k <= 14; k++) { const tt = Math.min(620, j.t) - k * 9; if (tt < 300) break; pts.push(judgmentPos(j, tt)); }
        if (pts.length > 1) art().RippleSwing.trail(dot, pts);
    }
    function judgmentPlan(st, ft, hand) {                     // the censer swings from the caster's hand toward the landing cell
        const src = st.sourceCell, land = st.landingCell || st.targetCells[0], d = { x: Math.sign(land.gx - src.gx), y: Math.sign(land.gy - src.gy) };
        const H = hand || { x: src.gx * 16 + 8 + d.x * 4, y: src.gy * 16 + 6 + d.y * 4 };
        return { base: Math.atan2(d.y, d.x), side: d.x < 0 ? -1 : 1, H, t: ft - st.at };
    }
    function judgmentCells(cast, st) {
        const cr = cast.events.find(e => e.kind === 'stage' && e.judgmentPhase === 'cross');
        return (cr && cr.footprint?.cells) || st.footprint?.cells || [];
    }
    function drawJudgment(dot, cast, ft, view) {              // 51 파문심판
        const st = cast.events.find(e => e.kind === 'stage' && e.judgmentPhase === 'censer');
        if (!st) return;
        const j = judgmentPlan(st, ft, view.hand);
        judgmentCells(cast, st).forEach((cl, i) => judgmentBolt(dot, j, cl, i));
        if (j.t >= 300 && j.t < 680) judgmentTrail(dot, j);
        if (j.t >= 0 && j.t < st.duration) art().RippleSwing.censer(dot, j.H, judgmentPos(j, j.t), j.t >= 300);
    }
    function drainChest(src, view) { return { x: src.gx * 16 + 8, y: feetY(src, view) - 9 }; }
    function drawDrain(dot, cast, ft, view) {                 // 3 흡혈 타격
        for (const e of eventsOf(cast, 'hit')) {
            const tc = hitCell(e);
            if (!tc || !e.sourceCell) continue;
            const C = drainChest(e.sourceCell, view), W = { x: tc.gx * 16 + 8, y: tc.gy * 16 + 7 }, d = unitToward(C, W);
            art().BloodDrain.slash(dot, W.x, W.y, ft - e.at, { d, len: 8 });
            art().BloodDrain.splash(dot, W, d, ft - e.at);
            art().BloodDrain.drain(view.front || dot, W, C, ft - e.at);   // the stream stays readable across the caster's back
        }
    }
    function quakeSource(cast) { const st = firstOf(cast, 'stage'); return st ? { st, src: st.sourceCell } : null; }
    function drawQuakeGround(dot, cast, ft) {                 // 18 불멸의 진동 (ground)
        const q = quakeSource(cast);
        if (!q) return;
        const ms = SKILL_DB[cast.skillName]?.combatPattern?.waveMsPerCell || 110, radius = SKILL_GRID_DB[cast.skillName]?.radius || 2;
        art().GoldQuake.ground(dot, q.src.gx * 16 + 8, q.src.gy * 16 + 8, ft - q.st.at, { msPerCell: ms, maxR: radius * 16 + 8 });
    }
    function drawQuake(dot, cast, ft, view) {                 // 18 불멸의 진동 (foreground)
        const q = quakeSource(cast);
        if (!q) return;
        art().GoldQuake.fore(dot, q.src.gx * 16 + 8, feetY(q.src, view), ft - q.st.at);
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) art().GoldQuake.hit(dot, tc.gx * 16 + 8, tc.gy * 16 + 7, ft - e.at); }
    }
    function potionPulses(cast, land) {                       // field ticks seen so far; before the first, the pattern's schedule
        const pattern = SKILL_DB[cast.skillName]?.combatPattern || {}, ticks = [...new Set(eventsOf(cast, 'hit').map(e => e.at - land))].sort((a, b) => a - b);
        return ticks.length ? ticks : Array.from({ length: pattern.hits || 3 }, (_, i) => i * (pattern.intervalMs || 240));
    }
    function potionInfo(cast) {                               // 38 원소 포션 투척: lob, landing, one pool pulsing on each field hit
        const tr = firstOf(cast, 'travel'), st = eventsOf(cast, 'stage').sort((a, b) => a.at - b.at);
        if (!tr || !st.length) return null;
        const ctr = st[0].footprint?.center || tr.targetCells[0], land = st[0].at, last = st.at(-1);
        const el = tr.element || SKILL_DB[cast.skillName]?.ele || 'fire';
        return { tr, land, el, C: cellDot(ctr), pulses: potionPulses(cast, land), end: last.at + last.duration - land };
    }
    function drawPotionGround(dot, cast, ft) {
        const I = potionInfo(cast);
        if (!I) return;
        const radius = SKILL_GRID_DB[cast.skillName]?.radius || 1;
        art().PotionThrow.pool(dot, I.C.x, I.C.y, ft - I.land, { el: I.el, pulses: I.pulses, end: I.end, R: radius * 16 + 3 });
    }
    function drawPotion(dot, cast, ft) {
        const I = potionInfo(cast);
        if (!I) return;
        const src = I.tr.sourceCell, sx = Math.sign(I.C.x - (src.gx * 16 + 8)) || 1, A = { x: src.gx * 16 + 8 + sx * 5, y: src.gy * 16 + 3 };
        art().PotionThrow.flight(dot, A, I.C, ft - I.tr.at, { dur: I.tr.duration, el: I.el });
        art().PotionThrow.shatter(dot, I.C.x, I.C.y, ft - I.land, I.el);
        cast.events.forEach((e, i) => { const tc = e.kind === 'hit' && hitCell(e); if (tc) art().TriWave.spark(dot, tc.gx * 16 + 8, tc.gy * 16 + 7, ft - e.at, { el: I.el, seed: i + 1 }); });
    }
    function clockEvent(cast) { return cast.events.find(e => e.timePhase === 'clock'); }
    function drawTimeClock(dot, cast, ft, view) {            // 46 시간 가속 (ground): centred on the drawn character, gliding with the walk
        const st = clockEvent(cast);
        if (!st) return;
        const c = view.playerDot || cellDot(st.timeCenter || st.sourceCell);
        art().CelticClock.clock(dot, c.x, c.y, ft - st.at, { T: (st.duration || 5200) - 200, F: 200, ticks: (st.timeTickTimes || []).map(x => x - st.at) });
    }
    function drawTimeMarks(dot, cast, ft) {
        const st = clockEvent(cast);
        if (!st) return;
        for (const b of st.timeTickTargets || []) for (const p of b.cells) art().CelticClock.mark(dot, p.gx * 16 + 8, p.gy * 16 + 8, ft - b.at);
    }

    // ------------------------------------------------------------------ 09-30 변경분
    function burstPull(cast) { return SKILL_DB[cast.skillName]?.combatPattern?.stages?.[1]?.delayMs || 160; }
    function burstInfo(cast) {                                // 17 혈기 폭쇄: condense (stage 0), then the burst (stage 1)
        const st = eventsOf(cast, 'stage'), s0 = st.find(e => !e.stageIndex);
        if (!s0) return null;
        const s1 = st.find(e => e.stageIndex === 1), c = s1?.footprint?.center || s0.targetCells[0];
        return { s0, s1, c, x: c.gx * 16 + 8, y: c.gy * 16 + 7, dur: s1 ? s1.at - s0.at : burstPull(cast) };
    }
    function drawBurstGround(dot, cast, ft) {
        const I = burstInfo(cast);
        if (I && I.s1) extra().BloodBurst.stains(dot, I.x, I.y + 2, ft - I.s1.at);
    }
    /** The lance that would point back at an orthogonally adjacent caster is left out. */
    function burstSkip(src, c) { return Math.abs(src.gx - c.gx) + Math.abs(src.gy - c.gy) === 1 ? [src.gx - c.gx, src.gy - c.gy] : null; }
    function drawBurst(dot, cast, ft) {
        const I = burstInfo(cast);
        if (!I) return;
        const src = I.s0.sourceCell || I.c, at = { x: I.x, y: I.y };
        art().BloodDrain.splash(dot, at, unitToward(cellDot(src), at), ft - I.s0.at);
        extra().BloodBurst.condense(dot, I.x, I.y, ft - I.s0.at, { dur: I.dur });
        if (I.s1) extra().BloodBurst.burst(dot, I.x, I.y, ft - I.s1.at, { skip: burstSkip(src, I.c), dr: grownBy(cast, I.s1) });
    }
    function vortexInfo(cast) {                               // 29 화염 폭풍핵: one field stage; its ticks are the hits
        const st = firstOf(cast, 'stage');
        if (!st) return null;
        const c = (st.footprint && st.footprint.center) || st.targetCells[0];
        const ticks = [...new Set(eventsOf(cast, 'hit').map(e => e.at))].sort((a, b) => a - b);
        return { st, c, x: c.gx * 16 + 8, y: c.gy * 16 + 8, ticks };
    }
    function drawVortexGround(dot, cast, ft) {
        const I = vortexInfo(cast);
        if (I) extra().FireVortex.ground(dot, I.x, I.y, ft, { start: I.st.at, end: I.st.at + I.st.duration, ticks: I.ticks, R: 22 + 16 * grownBy(cast, I.st) });
    }
    function drawVortex(dot, cast, ft) {                      // a small flame on each struck cell off the core
        const I = vortexInfo(cast);
        if (!I) return;
        eventsOf(cast, 'hit').forEach((e, i) => {
            const tc = hitCell(e);
            if (tc && (tc.gx !== I.c.gx || tc.gy !== I.c.gy)) art().TriWave.spark(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at - 20, { el: 'fire', seed: i + 3 });
        });
    }
    function drawFrostMistGround(dot, cast, ft) {             // 30 빙결 파열창: mist under each pierced target, drifting on
        eventsOf(cast, 'hit').filter(hitCell).forEach((e, i) => {
            const tc = hitCell(e), fr = e.sourceCell || tc, L = Math.hypot(tc.gx - fr.gx, tc.gy - fr.gy) || 1;
            const o = { seed: 31 + i * 17 + tc.gx * 5 + tc.gy * 3, dx: (tc.gx - fr.gx) / L, dy: (tc.gy - fr.gy) / L, spin: i % 2 ? -1 : 1 };
            extra().FrostMist.mist(dot, tc.gx * 16 + 8, tc.gy * 16 + 10, ft - e.at, o);
        });
    }
    function drawFrostMist(dot, cast, ft) {
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) extra().FrostMist.burst(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at); }
    }
    function mineArm(cast) { return SKILL_DB[cast.skillName]?.combatPattern?.armDelayMs || 460; }
    function mineInfo(cast) {                                 // 37 룬 지뢰: windup = throw + arming, stage = the blast
        const w = firstOf(cast, 'windup'), st = firstOf(cast, 'stage'), ev = st || w;
        if (!ev) return null;
        const fp = ev.footprint || {}, c = fp.center || ev.targetCells[0], arm = mineArm(cast), T = w ? w.at + w.duration : st.at;
        return { st, c, src: ev.sourceCell || c, cells: fp.cells || [c], arm, land: T - arm, radius: Math.max(1, Number(fp.radius) || 2) };
    }
    function drawMineGround(dot, cast, ft) {
        const I = mineInfo(cast);
        if (I) extra().RuneMine.sigil(dot, I.c.gx * 16 + 8, I.c.gy * 16 + 8, ft - I.land, I.arm);
    }
    function drawMine(dot, cast, ft) {
        const I = mineInfo(cast);
        if (!I) return;
        const sx = Math.sign(I.c.gx - I.src.gx) || 1, from = { x: I.src.gx * 16 + 8 + sx * 5, y: I.src.gy * 16 + 3 };
        extra().RuneMine.toss(dot, from, { x: I.c.gx * 16 + 8, y: I.c.gy * 16 + 8 }, ft - (I.land - 160), 160);
        if (I.st) extra().RuneMine.blast(dot, { gx: I.c.gx, gy: I.c.gy }, I.cells, ft - I.st.at, { arm: I.radius });
    }
    function coolInfo(cast) {                                 // 48 과냉각 혼합물: the wave stage (landing + ring times)
        const st = eventsOf(cast, 'stage').find(e => e.supercooledPhase === 'wave');
        if (!st) return null;
        const L = st.landingCell || st.targetCells[0], step = st.ringInterval || 260, rings = [0, 1, 2].map(k => st.at + k * step);
        return { x: L.gx * 16 + 8, y: L.gy * 16 + 8, land: st.at, rings, end: rings[2] + 250 };
    }
    function drawCoolGround(dot, cast, ft) {                  // a frost star, then one thin ring per ring hit (radius 1, 2, 3)
        const I = coolInfo(cast);
        if (!I) return;
        extra().SuperCool.star(dot, I.x, I.y, ft - I.land, I.end - I.land);
        I.rings.forEach((rt, k) => extra().SuperCool.ring(dot, I.x, I.y, ft - rt, (k + 1) * 16));
    }
    function drawCool(dot, cast, ft) {
        const I = coolInfo(cast);
        if (I) extra().FrostMist.burst(dot, I.x, I.y - 2, ft - I.land);
    }

    const DRAWERS = {
        3: { fore: drawDrain }, 5: { fore: drawWhirl }, 10: { fore: drawFrost }, 16: { fore: drawCrescent },
        18: { ground: drawQuakeGround, fore: drawQuake }, 21: { fore: drawFrostWave }, 28: { fore: drawCollapse },
        32: { fore: drawTri }, 33: { fore: drawTriple }, 38: { ground: drawPotionGround, fore: drawPotion },
        41: { fore: drawWave }, 42: { fore: drawBreath }, 43: { fore: drawVoid }, 45: { fore: drawLance },
        46: { ground: drawTimeClock, fore: drawTimeMarks }, 50: { ground: drawMist }, 51: { fore: drawJudgment },
        17: { ground: drawBurstGround, fore: drawBurst }, 29: { ground: drawVortexGround, fore: drawVortex },
        30: { ground: drawFrostMistGround, fore: drawFrostMist }, 37: { ground: drawMineGround, fore: drawMine },
        48: { ground: drawCoolGround, fore: drawCool }
    };

    // ------------------------------------------------------------------ per frame
    function playerDot(view) {
        const p = view.projection, pos = typeof battleVisualState === 'object' ? battleVisualState.playerPos : null;
        if (!p || !pos) return null;
        const origin = p.cellToScreen(0, 0), s = p.tileW / 48;
        return { x: Math.round(((pos.x - origin.x) / s + 24) / 3), y: Math.round(((pos.y - (Number(p.actorGroundOffsetY) || 0) - origin.y) / s + 24) / 3) };
    }
    /** The caster's hand in board dots, from the sprite drawn this frame (hanaActors); null before it is drawn. */
    function handDot(visualNow) {
        const hand = typeof hanaActors === 'object' ? hanaActors.handBoard(visualNow) : null;
        return hand ? { x: Math.round(hand.x / 3), y: Math.round(hand.y / 3) } : null;
    }
    function castNow(cast, visualNow) { return cast.clock === 'combat' ? worldTreeSkillFx.castClock() : visualNow; }
    /** 33's charge before the first strike: from the swing, since its hits are not known yet. */
    function drawCharges(dot, visualNow) {
        for (let i = battleFx.length - 1; i >= 0; i--) {
            const fx = battleFx[i];
            if (!fx || fx.type !== 'playerSwing' || SKILL_FX_ATLAS[fx.skillName]?.id !== 33 || !fx.sourceCell) continue;
            const age = visualNow - (fx.impactAt - 220);
            if (age < 0 || age >= 220) continue;
            art().TripleBolt.charge(dot, fx.sourceCell.gx * 16 + 8 + 6, fx.sourceCell.gy * 16 + 6, age);
        }
    }
    /** With the caster's back to the camera (facing north), what they send forward and the ground behind their feet
     * are hidden by the body: true for a dot under an opaque pixel of the sprite drawn this frame. Null otherwise. */
    function backMask(view, visualNow) {
        const body = typeof hanaActors === 'object' ? hanaActors.drawnBody(visualNow) : null;
        if (!body || body.dir !== 'north') return null;
        const origin = view.projection.cellToScreen(0, 0), s = view.projection.tileW / 48;
        return (x, y) => body.covers(origin.x + (Math.round(x) * 3 + 1.5 - 24) * s, origin.y + (Math.round(y) * 3 + 1.5 - 24) * s);
    }
    function behindBody(dot, hidden) {
        return hidden ? (x, y, colour) => { if (!hidden(x, y)) dot(x, y, colour); } : dot;
    }
    function drawCasts(layer, visualNow, view, pens) {
        for (const [key, cast] of casts) {
            const now = castNow(cast, visualNow), draw = DRAWERS[cast.id] && DRAWERS[cast.id][layer];
            if (now > cast.end + TAIL_MS) { casts.delete(key); continue; }
            if (draw) draw(AROUND_BODY.has(cast.id) ? pens.front : pens.behind, cast, now, view);
        }
    }
    /** Draws every live cast's layer into the open remake pass. layer: 'ground' | 'fore'. */
    function drawLayer(layer, visualNow) {
        const projection = fxRemake.projection();
        if (!fxRemake.isOpen() || !projection) return;
        if (layer === 'ground') collectHits();
        const view = { projection, playerDot: null, hand: handDot(visualNow) };
        view.playerDot = playerDot(view);
        const hidden = layer === 'fore' ? backMask(view, visualNow) : null;
        fxRemake.drawDots(dot => {
            const pens = { front: dot, behind: behindBody(dot, hidden) };
            view.front = dot;
            drawCasts(layer, visualNow, view, pens);
            if (layer === 'fore') drawCharges(pens.behind, visualNow);
        });
    }

    // ------------------------------------------------------------------ what the character does meanwhile
    function latestCast(id, now) {
        let found = null;
        for (const cast of casts.values()) if (cast.id === id && cast.clock === 'visual' && (!found || cast.end > found.end) && now <= cast.end + TAIL_MS) found = cast;
        return found;
    }
    /** 흡혈 타격: crimson pulse strength (0..0.35) over the caster as the drained blood sinks in. */
    function playerTint(now) {
        if (!fxRemake.isEnabled()) return 0;
        const cast = latestCast(3, now), hit = cast && firstOf(cast, 'hit');
        return hit ? art().BloodDrain.tint(now - hit.at) : 0;
    }
    /** 회오리바람: the body turns with the blade wind (one facing per 90ms, clockwise) and holds its strike pose. */
    function playerSpin(now) {
        const cast = fxRemake.isEnabled() ? latestCast(5, now) : null, hits = cast ? eventsOf(cast, 'hit') : [];
        if (!hits.length) return null;
        const span = whirlSpan(hits);
        if (now < span.t0 || now >= span.t1) return null;
        return { facing: SPIN[Math.floor((now - span.t0) / 90) % 4], holdUntil: span.t1 };
    }
    function reset() { casts.clear(); weaponWindows.length = 0; }
    function eventBrief(e) {
        const fp = e.footprint;
        return { kind: e.kind, at: Math.round(e.at), duration: e.duration, stageIndex: e.stageIndex, sourceCell: e.sourceCell, targetCells: e.targetCells,
            phase: Object.keys(e).find(k => k.endsWith('Phase')), footprint: fp && { center: fp.center, radius: fp.radius, cells: (fp.cells || []).length } };
    }
    /** Test panel / diagnostics: the casts being drawn right now (with each event's timing and cells). */
    function snapshot() {
        return [...casts.values()].map(c => ({ key: c.key, id: c.id, clock: c.clock, end: Math.round(c.end), kinds: c.events.map(e => e.kind), events: c.events.map(eventBrief) }));
    }

    return Object.freeze({ claim, drawLayer, playerTint, playerSpin, weaponHidden, reset, snapshot, ids: IDS, replaces });
})();
safeExposeGlobals({ redrawnSkillFx });
