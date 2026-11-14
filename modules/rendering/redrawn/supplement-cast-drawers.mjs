import { pullEase } from './caster-motion.mjs';
import { redrawnSkillArt } from './art.mjs';
import { redrawnSkillArtExtra } from './art-extra.mjs';
import { redrawnSkillArtMoves } from './art-moves.mjs';
import { cellDot, hitCell, eventsOf, firstOf, unitToward, grownBy, feetY, feetDots } from './cast-geometry.mjs';
const art = () => redrawnSkillArt;
const extra = () => redrawnSkillArtExtra;
const moves = () => redrawnSkillArtMoves.Mobility4;
const footAt = (c, view) => ({ x: c.gx * 16 + 8, foot: feetY(c, view) });
const moveEvent = cast => cast.events.find(v => v.move);

/** Additional drawers are returned to composition; importing this file registers nothing. */
class SupplementCastDrawers {
    constructor(deps) {
        this.deps = deps;
        for (const name of ["drawBurstGround","drawBurst","drawVortexGround","drawVortex","drawFrostMistGround","drawFrostMist","drawMineGround","drawMine","drawCoolGround","drawCool","drawRiftGround","drawRift","drawSmoke","drawHarpoon","drawRockRope"]) this[name] = this[name].bind(this);
    }

    burstPull(cast) { return this.deps.skillDb[cast.skillName]?.combatPattern?.stages?.[1]?.delayMs || 160; }


    burstInfo(cast) {                                // 17 혈기 폭쇄: condense (stage 0), then the burst (stage 1)
        const st = eventsOf(cast, 'stage'), s0 = st.find(e => !e.stageIndex);
        if (!s0) return null;
        const s1 = st.find(e => e.stageIndex === 1), c = s1?.footprint?.center || s0.targetCells[0];
        return { s0, s1, c, x: c.gx * 16 + 8, y: c.gy * 16 + 7, dur: s1 ? s1.at - s0.at : this.burstPull(cast) };
    }

    drawBurstGround(dot, cast, ft) {
        const I = this.burstInfo(cast);
        if (I && I.s1) extra().BloodBurst.stains(dot, I.x, I.y + 2, ft - I.s1.at);
    }

    /** The lance that would point back at an orthogonally adjacent caster is left out. */
    burstSkip(src, c) { return Math.abs(src.gx - c.gx) + Math.abs(src.gy - c.gy) === 1 ? [src.gx - c.gx, src.gy - c.gy] : null; }

    drawBurst(dot, cast, ft) {
        const I = this.burstInfo(cast);
        if (!I) return;
        const src = I.s0.sourceCell || I.c, at = { x: I.x, y: I.y };
        art().BloodDrain.splash(dot, at, unitToward(cellDot(src), at), ft - I.s0.at);
        extra().BloodBurst.condense(dot, I.x, I.y, ft - I.s0.at, { dur: I.dur });
        if (I.s1) extra().BloodBurst.burst(dot, I.x, I.y, ft - I.s1.at, { skip: this.burstSkip(src, I.c), dr: grownBy(cast, I.s1, this.deps.skillGrid) });
    }

    vortexInfo(cast) {                               // 29 화염 폭풍핵: one field stage; its ticks are the hits
        const st = firstOf(cast, 'stage');
        if (!st) return null;
        const c = (st.footprint && st.footprint.center) || st.targetCells[0];
        const ticks = [...new Set(eventsOf(cast, 'hit').map(e => e.at))].sort((a, b) => a - b);
        return { st, c, x: c.gx * 16 + 8, y: c.gy * 16 + 8, ticks };
    }

    drawVortexGround(dot, cast, ft) {
        const I = this.vortexInfo(cast);
        if (I) extra().FireVortex.ground(dot, I.x, I.y, ft, { start: I.st.at, end: I.st.at + I.st.duration, ticks: I.ticks, R: 22 + 16 * grownBy(cast, I.st, this.deps.skillGrid) });
    }

    drawVortex(dot, cast, ft) {                      // a small flame on each struck cell off the core
        const I = this.vortexInfo(cast);
        if (!I) return;
        eventsOf(cast, 'hit').forEach((e, i) => {
            const tc = hitCell(e);
            if (tc && (tc.gx !== I.c.gx || tc.gy !== I.c.gy)) art().TriWave.spark(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at - 20, { el: 'fire', seed: i + 3 });
        });
    }

    drawFrostMistGround(dot, cast, ft) {             // 30 빙결 파열창: mist under each pierced target, drifting on
        eventsOf(cast, 'hit').filter(hitCell).forEach((e, i) => {
            const tc = hitCell(e), fr = e.sourceCell || tc, L = Math.hypot(tc.gx - fr.gx, tc.gy - fr.gy) || 1;
            const o = { seed: 31 + i * 17 + tc.gx * 5 + tc.gy * 3, dx: (tc.gx - fr.gx) / L, dy: (tc.gy - fr.gy) / L, spin: i % 2 ? -1 : 1 };
            extra().FrostMist.mist(dot, tc.gx * 16 + 8, tc.gy * 16 + 10, ft - e.at, o);
        });
    }

    drawFrostMist(dot, cast, ft) {
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) extra().FrostMist.burst(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at); }
    }

    mineArm(cast) { return this.deps.skillDb[cast.skillName]?.combatPattern?.armDelayMs || 460; }


    mineInfo(cast) {                                 // 37 번개 각인: windup = throw + arming, stage = the blast
        const w = firstOf(cast, 'windup'), st = firstOf(cast, 'stage'), ev = st || w;
        if (!ev) return null;
        const fp = ev.footprint || {}, c = fp.center || ev.targetCells[0], arm = this.mineArm(cast), T = w ? w.at + w.duration : st.at;
        return { st, c, src: ev.sourceCell || c, cells: fp.cells || [c], arm, land: T - arm, radius: Math.max(1, Number(fp.radius) || 2) };
    }

    drawMineGround(dot, cast, ft) {
        const I = this.mineInfo(cast);
        if (I) extra().RuneMine.sigil(dot, I.c.gx * 16 + 8, I.c.gy * 16 + 8, ft - I.land, I.arm);
    }

    drawMine(dot, cast, ft) {
        const I = this.mineInfo(cast);
        if (!I) return;
        const sx = Math.sign(I.c.gx - I.src.gx) || 1, from = { x: I.src.gx * 16 + 8 + sx * 5, y: I.src.gy * 16 + 3 };
        extra().RuneMine.toss(dot, from, { x: I.c.gx * 16 + 8, y: I.c.gy * 16 + 8 }, ft - (I.land - 160), 160);
        if (I.st) extra().RuneMine.blast(dot, { gx: I.c.gx, gy: I.c.gy }, I.cells, ft - I.st.at, { arm: I.radius });
    }

    coolInfo(cast) {                                 // 48 과냉각 혼합물: the wave stage (landing + ring times)
        const st = eventsOf(cast, 'stage').find(e => e.supercooledPhase === 'wave');
        if (!st) return null;
        const L = st.landingCell || st.targetCells[0], step = st.ringInterval || 260, rings = [0, 1, 2].map(k => st.at + k * step);
        return { x: L.gx * 16 + 8, y: L.gy * 16 + 8, land: st.at, rings, end: rings[2] + 250 };
    }

    drawCoolGround(dot, cast, ft) {                  // a frost star, then one thin ring per ring hit (radius 1, 2, 3)
        const I = this.coolInfo(cast);
        if (!I) return;
        extra().SuperCool.star(dot, I.x, I.y, ft - I.land, I.end - I.land);
        I.rings.forEach((rt, k) => extra().SuperCool.ring(dot, I.x, I.y, ft - rt, (k + 1) * 16));
    }

    drawCool(dot, cast, ft) {
        const I = this.coolInfo(cast);
        if (I) extra().FrostMist.burst(dot, I.x, I.y - 2, ft - I.land);
    }

    /** The whole choreography of a movement cast (skill-gem-casts.js c.move), carried on its one 'move' event. */
    moveOf(cast) { const e = cast.events.find(v => v.move); return e ? e.move : null; }

    drawRiftGround(dot, cast, ft, view) {            // 54 차원찢기: the entry tear half a cell ahead, the exit half a cell short
        const M = this.moveOf(cast);
        if (!M) return;
        const L = Math.hypot(M.to.gx - M.from.gx, M.to.gy - M.from.gy) || 1;
        const ox = Math.round((M.to.gx - M.from.gx) / L * 8), oy = Math.round((M.to.gy - M.from.gy) / L * 8);
        const A = footAt(M.from, view), B = footAt(M.to, view);
        moves().rift(dot, A.x + ox, A.foot - 1 + oy, ft - M.tear, { closeAt: M.close - M.tear });
        moves().rift(dot, B.x - ox, B.foot - 1 - oy, ft - M.openB, { closeAt: M.close - M.openB });
    }

    drawRift(dot, cast, ft, view) {                  // both tears snap shut in a burst of shards; a star on each struck cell
        const M = this.moveOf(cast);
        if (!M) return;
        const B = footAt(M.to, view), MB = moves().colors.MB;
        moves().riftBurst(dot, B.x, B.foot - 9, ft - (M.close + 60), grownBy(cast, moveEvent(cast), this.deps.skillGrid));
        this.moveStars(dot, cast, ft, 0, { W: '#ffffff', H: MB.H, L: MB.L });
    }

    /** A strike star on every struck cell (delay: after the hit, ms). */
    moveStars(dot, cast, ft, delay, pal) {
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) moves().strikeStar(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at - delay, pal); }
    }

    drawSmoke(dot, cast, ft, view) {                 // 55 향로구름: a smoke cloud where the caster was, one beside the target
        const M = this.moveOf(cast);
        if (!M) return;
        moves().smoke(dot, footAt(M.from, view), ft - M.puff, M.lifeA, { seed: 55 });
        moves().smoke(dot, footAt(M.to, view), ft - M.puffB, M.lifeB, { seed: 56 });
    }

    /** 56: where the archer stands this frame — gliding along the rope during the pull (same easing as the caster). */
    archerAt(M, ft, view) {
        const k = pullEase(M, ft), x = M.from.gx + (M.to.gx - M.from.gx) * k, y = M.from.gy + (M.to.gy - M.from.gy) * k;
        return { x: Math.round(x * 16 + 8), foot: Math.round(y * 16 + 8 + feetDots(view)) };
    }

    harpoonFlight(dot, H, T, u) {
        const ang = Math.atan2(T.y - H.y, T.x - H.x), px = H.x + (T.x - H.x) * u, py = H.y + (T.y - H.y) * u - 6 * u * (1 - u);
        moves().rope(dot, H, { x: px - Math.cos(ang) * 7, y: py - Math.sin(ang) * 7 }, { sag: 3 * u, wob: 0 });
        moves().harpoon(dot, px, py, ang);
    }

    harpoonRope(dot, H, T, M, ft) {                  // slack, then taut and trembling until the pull; reeled in at the end
        const end = M.moved ? M.pull1 : M.hitAt, ang = Math.atan2(T.y - H.y, T.x - H.x), tight = ft >= M.hitAt + 60;
        const retract = ft >= end ? Math.min(1, (ft - end) / 140) : 0, ex = T.x - Math.cos(ang) * 7, ey = T.y - Math.sin(ang) * 7;
        if (retract < 1) {
            const wob = tight && ft < (M.moved ? M.pull0 : end) ? ((ft >> 5) & 1) : 0;
            moves().rope(dot, H, { x: ex + (H.x - ex) * retract, y: ey + (H.y - ey) * retract }, { sag: tight ? 0 : 2, wob });
        }
        if (!retract) moves().harpoon(dot, T.x, T.y, ang);
    }

    pullStreaks(dot, C, ang) {                       // three pairs of speed lines behind the archer being pulled
        const DU = moves().colors.DU;
        for (let k = 1; k <= 3; k++) {
            const bx = Math.round(C.x - Math.cos(ang) * (5 + k * 3)), by = Math.round(C.foot - 5 - k * 2 + k);
            dot(bx, by, DU.L);
            dot(bx - Math.round(Math.cos(ang) * 2), by, DU.M);
        }
    }

    drawHarpoon(dot, cast, ft, view) {               // 56 작살화살: the harpoon flies on its rope, bites, pulls the archer in
        const M = this.moveOf(cast);
        if (!M) return;
        const T = { x: M.foe.gx * 16 + 8, y: M.foe.gy * 16 + 7 }, C = this.archerAt(M, ft, view);
        const H = { x: C.x + (Math.sign(T.x - C.x) || 1) * 3, y: C.foot - 9 };
        this.harpoonLine(dot, H, T, M, ft);
        if (M.moved && ft >= M.pull0 && ft < M.pull1) this.pullStreaks(dot, C, Math.atan2(T.y - H.y, T.x - H.x));
        this.moveStars(dot, cast, ft, 0);
    }

    /** 77 바위 플라스크 on the top-down field (the stage draws its own, js/canvas-stage-skill-casts.js): the rock flies on its rope,
     * breaks around where it lands, then the rope pulls the caster in. */
    drawRockRope(dot, cast, ft, view) {
        const M = this.moveOf(cast);
        if (!M) return;
        const T = { x: M.foe.gx * 16 + 8, y: M.foe.gy * 16 + 7 }, C = this.archerAt(M, ft, view), H = { x: C.x + (Math.sign(T.x - C.x) || 1) * 3, y: C.foot - 9 };
        this.rockLine(dot, M, H, T, ft);
        if (M.moved && ft >= M.pull0 && ft < M.pull1) this.pullStreaks(dot, C, Math.atan2(T.y - H.y, T.x - H.x));
        this.moveStars(dot, cast, ft, 0);
    }

    /** In flight on its rope, then from the hand to where it broke until the pull ends (a short tug when the caster did not move). */
    rockLine(dot, M, H, T, ft) {
        if (ft >= M.release && ft < M.hitAt) this.rockFlight(dot, H, T, (ft - M.release) / Math.max(1, M.hitAt - M.release));
        else if (ft >= M.hitAt && ft < (M.moved ? M.pull1 : M.pull0 + 120)) moves().rope(dot, H, T, { sag: ft >= M.pull0 ? 0 : 2, wob: 0 });
    }

    /** The rock on its rope, u of the way from the hand to where it lands (a low arc). */
    rockFlight(dot, H, T, u) {
        const at = { x: H.x + (T.x - H.x) * u, y: H.y + (T.y - H.y) * u - 24 * u * (1 - u) };
        moves().rope(dot, H, at, { sag: 3 * u, wob: 0 });
        for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) dot(Math.round(at.x) + x, Math.round(at.y) + y, y < 0 || x < 0 ? '#968a76' : '#6e6456');
    }

    /** In flight on its rope, then biting and pulling until it is reeled in. */
    harpoonLine(dot, H, T, M, ft) {
        const end = M.moved ? M.pull1 : M.hitAt;
        if (ft >= M.release && ft < M.hitAt) this.harpoonFlight(dot, H, T, (ft - M.release) / Math.max(1, M.hitAt - M.release));
        else if (ft >= M.hitAt && ft < end + 140) this.harpoonRope(dot, H, T, M, ft);
    }

    api() { return {
        17: { ground: this.drawBurstGround, fore: this.drawBurst }, 29: { ground: this.drawVortexGround, fore: this.drawVortex },
        30: { ground: this.drawFrostMistGround, fore: this.drawFrostMist }, 37: { ground: this.drawMineGround, fore: this.drawMine },
        48: { ground: this.drawCoolGround, fore: this.drawCool },
        54: { ground: this.drawRiftGround, fore: this.drawRift }, 55: { fore: this.drawSmoke }, 56: { fore: this.drawHarpoon }, 77: { fore: this.drawRockRope }
    }; }
}

export function createSupplementCastDrawers(deps) {
    return new SupplementCastDrawers(deps).api();
}
