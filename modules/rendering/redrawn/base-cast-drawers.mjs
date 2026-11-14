import { redrawnSkillArt } from './art.mjs';
import { feetY, unitToward, whirlSpan, cellDot, hitCell, eventsOf, firstOf, footprintRadius, grownBy } from './cast-geometry.mjs';
const art = () => redrawnSkillArt;

/** Read-only drawers; the cast renderer owns all event lifetimes. */
class BaseCastDrawers {
    constructor(deps) {
        this.deps = deps;
        for (const name of ["drawDrain","drawWhirl","drawFrost","drawCrescent","drawQuakeGround","drawQuake","drawFrostWave","drawCollapse","drawLance","drawTimeClock","drawTimeMarks","drawMist","drawJudgment"]) this[name] = this[name].bind(this);
    }

    drawCrescent(dot, cast, ft) {
        const st = firstOf(cast, 'stage');
        if (!st) return;
        const S = cellDot(st.sourceCell), d = unitToward(S, cellDot(st.targetCells.at(-1)));
        // Approved 09-30 art: the crescent only, without the preceding rift or target X marks.
        art().VoidCrescent.crescent(dot, { x: S.x + d.x * 9, y: S.y + d.y * 9 - 2 }, d, ft - st.at, { dur: Math.max(260, st.duration + 40), R: 13, travel: 30 });
    }

    frostReach(st, ctr, hits) {
        const radius = Number(st.footprint?.radius) || 0;
        return Math.max(24, radius * 16 + 6, ...hits.map(e => Math.hypot(hitCell(e).gx - ctr.gx, hitCell(e).gy - ctr.gy) * 16 + 6));
    }

    drawFrost(dot, cast, ft) {                       // 10 서리 폭발
        const st = firstOf(cast, 'stage');
        if (!st) return;
        const ctr = st.footprint?.center || st.targetCells[0], c = cellDot(ctr), hits = eventsOf(cast, 'hit').filter(hitCell);
        const msPerCell = this.deps.skillDb[cast.skillName]?.combatPattern?.waveMsPerCell || 90;
        art().FrostRing.ring(dot, c.x, c.y, ft - st.at, { msPerCell, maxR: this.frostReach(st, ctr, hits) });
        for (const e of hits) {
            const t = hitCell(e);
            if (t.gx !== ctr.gx || t.gy !== ctr.gy) art().FrostRing.flake(dot, t.gx * 16 + 8, t.gy * 16 + 6, ft - e.at);
        }
    }

    drawMist(dot, cast, ft) {                        // 50 신성한 안개 (ground)
        for (const st of cast.events) {
            if (st.kind !== 'stage' || st.holyMistPhase !== 'mist') continue;
            const src = st.holySource || st.sourceCell;
            const grown = Math.max(0, (st.holyRadius || 1) - 1);
            art().HolyMist.mist(dot, src.gx * 16 + 8, src.gy * 16 + 9, ft - st.at, { dur: st.duration, R: 17 + 16 * grown, N: 12 + 6 * grown });
        }
    }

    drawWhirl(dot, cast, ft, view) {                 // 5 회오리: the blade wind stays on the caster as they move
        const hits = eventsOf(cast, 'hit').filter(hitCell);
        if (!hits.length) return;
        const src = hits[0].sourceCell || hitCell(hits[0]), span = whirlSpan(hits), c = view.playerDot || cellDot(src);
        const R = 19 + 16 * grownBy(cast, firstOf(cast, 'stage'), this.deps.skillGrid);
        art().Whirlwind.whirl(dot, c.x, c.y, ft - span.t0, { T: span.t1 - span.t0, F: 160, period: 360, R, start: 0 });
        for (const e of hits) {                               // each cut points away from where the caster stood at that spin
            const tc = hitCell(e), x = tc.gx * 16 + 8, y = tc.gy * 16 + 6, h = e.sourceCell ? cellDot(e.sourceCell) : c;
            art().Whirlwind.cut(dot, x, y, ft - e.at, Math.atan2(y - h.y, x - h.x));
        }
    }

    frostWaveCells(nodes) {                          // cells crossed, each with every time the front passed inside it
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

    frostWaveFront(dot, tr, nodes, ft) {
        const age = ft - tr.at;
        if (age < 0 || age >= tr.duration) return;
        let i = 0;
        while (i < nodes.length - 2 && nodes[i + 1].t <= ft) i++;
        const a = nodes[i], b = nodes[i + 1], u = Math.max(0, Math.min(1, (ft - a.t) / Math.max(1, b.t - a.t))), d = unitToward(a, b);
        art().FrostWave.front(dot, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, age, { d, fade: Math.max(0, (age - (tr.duration - 140)) / 140) });
    }

    drawFrostWave(dot, cast, ft) {                   // 21 서리 파동
        const tr = firstOf(cast, 'travel');
        if (!tr || !tr.travelPath || tr.travelPath.length < 2) return;
        const nodes = tr.travelPath.map(p => ({ x: p.gx * 16 + 8, y: p.gy * 16 + 7, t: tr.at + p.offsetMs }));
        const struck = new Set(eventsOf(cast, 'hit').filter(hitCell).map(e => Math.round(hitCell(e).gx) + ',' + Math.round(hitCell(e).gy)));
        this.frostWaveCells(nodes).forEach((g, i) => {
            if (i === 0 || (g.ts.length < 6 && !struck.has(g.key))) return;
            art().FrostWave.pulse(dot, g.gx * 16 + 8, g.gy * 16 + 7, ft - g.ts[g.ts.length >> 1], struck.has(g.key));
        });
        this.frostWaveFront(dot, tr, nodes, ft);
    }

    drawCollapse(dot, cast, ft) {                    // 28 중력 붕괴
        const st = eventsOf(cast, 'stage').sort((a, b) => a.at - b.at);
        if (!st.length) return;
        const ctr = st[0].footprint?.center || st[0].targetCells[0];
        const pull = this.deps.skillDb[cast.skillName]?.combatPattern?.stages?.[1]?.delayMs || 320, t1 = (st[1] ? st[1].at : st[0].at + pull) - st[0].at;
        art().GravityCollapse.collapse(dot, ctr.gx * 16 + 8, ctr.gy * 16 + 8, ft - st[0].at, { t1, R1: 27 + 16 * grownBy(cast, st[0], this.deps.skillGrid) });
    }

    drawLance(dot, cast, ft) {                       // 45 신성한 기도
        const tr = firstOf(cast, 'travel');
        if (!tr) return;
        for (const tc of tr.targetCells || []) art().RadiantLance.lance(dot, tc.gx * 16 + 8, tc.gy * 16 + 11, ft - tr.at, { fall: tr.duration, H0: 44 });
    }

    judgmentSwing(t) {                               // the censer: wound back (0–300ms), swung across the front (–480), let go
        const E = u => u * u * (3 - 2 * u);
        if (t < 300) { const u = t / 300; return { rel: 90 + 110 * E(u), len: 8 + 6 * u }; }
        if (t < 480) { const u = (t - 300) / 180; return { rel: 200 * (1 - u * u), len: 14 + 16 * u }; }
        const u = Math.min(1, (t - 480) / 140);
        return { rel: -70 * (1 - (1 - u) * (1 - u)), len: 30 - 6 * u };
    }

    judgmentPos(j, t) {
        const q = this.judgmentSwing(t), a = j.base + j.side * q.rel * Math.PI / 180;
        return { x: j.H.x + Math.cos(a) * q.len, y: j.H.y + Math.sin(a) * q.len };
    }

    judgmentBolt(dot, j, cl, i) {                    // discharge when the swing angle passes the cell's angle
        const cx = cl.gx * 16 + 8, cy = cl.gy * 16 + 8;
        let rc = (Math.atan2(cy - j.H.y, cx - j.H.x) - j.base) * 180 / Math.PI * j.side;
        rc = ((rc + 540) % 360) - 180;
        let bt = 480, bd = 1e9;
        for (let k = 300; k <= 620; k += 2) { const v = Math.abs(this.judgmentSwing(k).rel - rc); if (v < bd) { bd = v; bt = k; } }
        art().RippleSwing.bolt(dot, this.judgmentPos(j, bt), { x: cx, y: cy }, j.t - bt, i + 1);
        art().RippleSwing.spark(dot, cx, cy + 2, j.t - bt, i);
    }

    judgmentTrail(dot, j) {
        const pts = [];
        for (let k = 0; k <= 14; k++) { const tt = Math.min(620, j.t) - k * 9; if (tt < 300) break; pts.push(this.judgmentPos(j, tt)); }
        if (pts.length > 1) art().RippleSwing.trail(dot, pts);
    }

    judgmentPlan(st, ft, hand) {                     // the censer swings from the caster's hand toward the landing cell
        const src = st.sourceCell, land = st.landingCell || st.targetCells[0], d = { x: Math.sign(land.gx - src.gx), y: Math.sign(land.gy - src.gy) };
        const H = hand || { x: src.gx * 16 + 8 + d.x * 4, y: src.gy * 16 + 6 + d.y * 4 };
        return { base: Math.atan2(d.y, d.x), side: d.x < 0 ? -1 : 1, H, t: ft - st.at };
    }

    judgmentCells(cast, st) {
        const cr = cast.events.find(e => e.kind === 'stage' && e.judgmentPhase === 'cross');
        return (cr && cr.footprint?.cells) || st.footprint?.cells || [];
    }

    drawJudgment(dot, cast, ft, view) {              // 51 파문심판
        const st = cast.events.find(e => e.kind === 'stage' && e.judgmentPhase === 'censer');
        if (!st) return;
        const j = this.judgmentPlan(st, ft, view.hand);
        this.judgmentCells(cast, st).forEach((cl, i) => this.judgmentBolt(dot, j, cl, i));
        if (j.t >= 300 && j.t < 680) this.judgmentTrail(dot, j);
        if (j.t >= 0 && j.t < st.duration && !this.deps.heroSwingsBigCenser()) art().RippleSwing.censer(dot, j.H, this.judgmentPos(j, j.t), j.t >= 300);
    }

    drainChest(src, view) { return { x: src.gx * 16 + 8, y: feetY(src, view) - 9 }; }


    drawDrain(dot, cast, ft, view) {                 // 3 흡혈 관통
        for (const e of eventsOf(cast, 'hit')) {
            const tc = hitCell(e);
            if (!tc || !e.sourceCell) continue;
            const C = this.drainChest(e.sourceCell, view), W = { x: tc.gx * 16 + 8, y: tc.gy * 16 + 7 }, d = unitToward(C, W);
            art().BloodDrain.slash(dot, W.x, W.y, ft - e.at, { d, len: 8 });
            art().BloodDrain.splash(dot, W, d, ft - e.at);
            art().BloodDrain.drain(view.front || dot, W, C, ft - e.at);   // the stream stays readable across the caster's back
        }
    }

    quakeSource(cast) { const st = firstOf(cast, 'stage'); return st ? { st, src: st.sourceCell } : null; }


    drawQuakeGround(dot, cast, ft) {                 // 18 대지의 함성 (ground)
        const q = this.quakeSource(cast);
        if (!q) return;
        const ms = this.deps.skillDb[cast.skillName]?.combatPattern?.waveMsPerCell || 110, radius = footprintRadius(cast, q.st, 2, this.deps.skillGrid);
        art().GoldQuake.ground(dot, q.src.gx * 16 + 8, q.src.gy * 16 + 8, ft - q.st.at, { msPerCell: ms, maxR: radius * 16 + 8 });
    }

    drawQuake(dot, cast, ft, view) {                 // 18 대지의 함성 (foreground)
        const q = this.quakeSource(cast);
        if (!q) return;
        art().GoldQuake.fore(dot, q.src.gx * 16 + 8, feetY(q.src, view), ft - q.st.at);
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) art().GoldQuake.hit(dot, tc.gx * 16 + 8, tc.gy * 16 + 7, ft - e.at); }
    }

    clockEvent(cast) { return cast.events.find(e => e.timePhase === 'clock'); }


    drawTimeClock(dot, cast, ft, view) {            // 46 시간 가속 (ground): centred on the drawn character, gliding with the walk
        const st = this.clockEvent(cast);
        if (!st) return;
        const c = view.playerDot || cellDot(st.timeCenter || st.sourceCell);
        art().CelticClock.clock(dot, c.x, c.y, ft - st.at, { T: (st.duration || 5200) - 200, F: 200, ticks: (st.timeTickTimes || []).map(x => x - st.at) });
    }

    drawTimeMarks(dot, cast, ft) {
        const st = this.clockEvent(cast);
        if (!st) return;
        for (const b of st.timeTickTargets || []) for (const p of b.cells) art().CelticClock.mark(dot, p.gx * 16 + 8, p.gy * 16 + 8, ft - b.at);
    }

    api() { return {
        3: { fore: this.drawDrain }, 5: { fore: this.drawWhirl }, 10: { fore: this.drawFrost }, 16: { fore: this.drawCrescent },
        18: { ground: this.drawQuakeGround, fore: this.drawQuake }, 21: { fore: this.drawFrostWave }, 28: { fore: this.drawCollapse },
        45: { fore: this.drawLance },
        46: { ground: this.drawTimeClock, fore: this.drawTimeMarks }, 50: { ground: this.drawMist }, 51: { fore: this.drawJudgment }
    }; }
}

export function createBaseCastDrawers(deps) {
    return new BaseCastDrawers(deps).api();
}
