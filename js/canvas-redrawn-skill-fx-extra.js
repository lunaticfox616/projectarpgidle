/** 새로 그린 스킬 이펙트 — 2026-09-30 변경분의 그리는 쪽 (js/canvas-redrawn-skill-fx.js가 이벤트를 모아 넘겨 준다).
 * 17 혈기 폭쇄 · 29 화염 폭풍핵 · 30 빙결 파열창 · 37 룬 지뢰 · 48 과냉각 혼합물, 그리고 이동 스킬 칸의 이동기 4종
 * (54 차원찢기 · 55 향로구름 · 56 작살화살 · 57 공중강타 — 원본 그림이 없어 새 그림만 있다)과 그 동안의 캐릭터 움직임.
 * Pure drawing from combat snapshots: nothing here schedules, resolves or applies damage.
 */
const redrawnSkillFxExtra = (() => {
    const { art, extra, cellDot, hitCell, eventsOf, firstOf, unitToward, grownBy, feetY, feetDots } = redrawnSkillFx.kit;

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

    // ------------------------------------------------------------------ 54~57 이동기 (Mobility4, 인계 ui_player.js drawMob4)
    const moves = () => redrawnSkillArtMoves.Mobility4;
    /** The whole choreography of a movement cast (skill-gem-casts.js c.move), carried on its one 'move' event. */
    function moveOf(cast) { const e = cast.events.find(v => v.move); return e ? e.move : null; }
    const footAt = (c, view) => ({ x: c.gx * 16 + 8, foot: feetY(c, view) });
    const moveEvent = cast => cast.events.find(v => v.move);
    function drawRiftGround(dot, cast, ft, view) {            // 54 차원찢기: the entry tear half a cell ahead, the exit half a cell short
        const M = moveOf(cast);
        if (!M) return;
        const L = Math.hypot(M.to.gx - M.from.gx, M.to.gy - M.from.gy) || 1;
        const ox = Math.round((M.to.gx - M.from.gx) / L * 8), oy = Math.round((M.to.gy - M.from.gy) / L * 8);
        const A = footAt(M.from, view), B = footAt(M.to, view);
        moves().rift(dot, A.x + ox, A.foot - 1 + oy, ft - M.tear, { closeAt: M.close - M.tear });
        moves().rift(dot, B.x - ox, B.foot - 1 - oy, ft - M.openB, { closeAt: M.close - M.openB });
    }
    function drawRift(dot, cast, ft, view) {                  // both tears snap shut in a burst of shards; a star on each struck cell
        const M = moveOf(cast);
        if (!M) return;
        const B = footAt(M.to, view), MB = moves().colors.MB;
        moves().riftBurst(dot, B.x, B.foot - 9, ft - (M.close + 60), grownBy(cast, moveEvent(cast)));
        moveStars(dot, cast, ft, 0, { W: '#ffffff', H: MB.H, L: MB.L });
    }
    /** A strike star on every struck cell (delay: after the hit, ms). */
    function moveStars(dot, cast, ft, delay, pal) {
        for (const e of eventsOf(cast, 'hit')) { const tc = hitCell(e); if (tc) moves().strikeStar(dot, tc.gx * 16 + 8, tc.gy * 16 + 6, ft - e.at - delay, pal); }
    }
    function drawSmoke(dot, cast, ft, view) {                 // 55 향로구름: a smoke cloud where the caster was, one beside the target
        const M = moveOf(cast);
        if (!M) return;
        moves().smoke(dot, footAt(M.from, view), ft - M.puff, M.lifeA, { seed: 55 });
        moves().smoke(dot, footAt(M.to, view), ft - M.puffB, M.lifeB, { seed: 56 });
    }
    /** 56: where the archer stands this frame — gliding along the rope during the pull (same easing as the caster). */
    function archerAt(M, ft, view) {
        const k = pullEase(M, ft), x = M.from.gx + (M.to.gx - M.from.gx) * k, y = M.from.gy + (M.to.gy - M.from.gy) * k;
        return { x: Math.round(x * 16 + 8), foot: Math.round(y * 16 + 8 + feetDots(view)) };
    }
    function pullEase(M, ft) {
        if (!M.moved || ft < M.pull0) return 0;
        const u = Math.min(1, (ft - M.pull0) / Math.max(1, M.pull1 - M.pull0));
        return 1 - (1 - u) * (1 - u);
    }
    function harpoonFlight(dot, H, T, u) {
        const ang = Math.atan2(T.y - H.y, T.x - H.x), px = H.x + (T.x - H.x) * u, py = H.y + (T.y - H.y) * u - 6 * u * (1 - u);
        moves().rope(dot, H, { x: px - Math.cos(ang) * 7, y: py - Math.sin(ang) * 7 }, { sag: 3 * u, wob: 0 });
        moves().harpoon(dot, px, py, ang);
    }
    function harpoonRope(dot, H, T, M, ft) {                  // slack, then taut and trembling until the pull; reeled in at the end
        const end = M.moved ? M.pull1 : M.hitAt, ang = Math.atan2(T.y - H.y, T.x - H.x), tight = ft >= M.hitAt + 60;
        const retract = ft >= end ? Math.min(1, (ft - end) / 140) : 0, ex = T.x - Math.cos(ang) * 7, ey = T.y - Math.sin(ang) * 7;
        if (retract < 1) {
            const wob = tight && ft < (M.moved ? M.pull0 : end) ? ((ft >> 5) & 1) : 0;
            moves().rope(dot, H, { x: ex + (H.x - ex) * retract, y: ey + (H.y - ey) * retract }, { sag: tight ? 0 : 2, wob });
        }
        if (!retract) moves().harpoon(dot, T.x, T.y, ang);
    }
    function pullStreaks(dot, C, ang) {                       // three pairs of speed lines behind the archer being pulled
        const DU = moves().colors.DU;
        for (let k = 1; k <= 3; k++) {
            const bx = Math.round(C.x - Math.cos(ang) * (5 + k * 3)), by = Math.round(C.foot - 5 - k * 2 + k);
            dot(bx, by, DU.L);
            dot(bx - Math.round(Math.cos(ang) * 2), by, DU.M);
        }
    }
    function drawHarpoon(dot, cast, ft, view) {               // 56 작살화살: the harpoon flies on its rope, bites, pulls the archer in
        const M = moveOf(cast);
        if (!M) return;
        const T = { x: M.foe.gx * 16 + 8, y: M.foe.gy * 16 + 7 }, C = archerAt(M, ft, view);
        const H = { x: C.x + (Math.sign(T.x - C.x) || 1) * 3, y: C.foot - 9 };
        harpoonLine(dot, H, T, M, ft);
        if (M.moved && ft >= M.pull0 && ft < M.pull1) pullStreaks(dot, C, Math.atan2(T.y - H.y, T.x - H.x));
        moveStars(dot, cast, ft, 0);
    }
    /** In flight on its rope, then biting and pulling until it is reeled in. */
    function harpoonLine(dot, H, T, M, ft) {
        const end = M.moved ? M.pull1 : M.hitAt;
        if (ft >= M.release && ft < M.hitAt) harpoonFlight(dot, H, T, (ft - M.release) / Math.max(1, M.hitAt - M.release));
        else if (ft >= M.hitAt && ft < end + 140) harpoonRope(dot, H, T, M, ft);
    }
    function drawSlamGround(dot, cast, ft, view) {            // 57 공중강타: shock ring, cracks and the dent where the greatsword lands
        const M = moveOf(cast);
        if (!M) return;
        const B = footAt(M.to, view);
        moves().slamGround(dot, B.x, B.foot - 1, ft - M.slam, { seed: M.to.gx * 7 + M.to.gy, dr: grownBy(cast, moveEvent(cast)) });
    }
    function drawSlam(dot, cast, ft, view) {
        const M = moveOf(cast);
        if (!M) return;
        const A = footAt(M.from, view), B = footAt(M.to, view);
        moves().dustPuff(dot, A.x, A.foot, ft - M.jump);
        moves().slamFore(dot, B.x, B.foot - 1, ft - M.slam);
        moveStars(dot, cast, ft, 30);
    }

    // ------------------------------------------------------------------ the caster during a movement cast
    function vanish(M, now) {                                 // 54·55: fades out over the first 42% of the window, back in over the last
        const u = (now - M.vanish[0]) / Math.max(1, M.vanish[1] - M.vanish[0]);
        if (u < 0 || u >= 1) return null;
        return { u, alpha: u < 0.42 ? 1 - u / 0.42 : (u < 0.58 ? 0 : (u - 0.58) / 0.42) };
    }
    function riftSlide(M, v) {                                // 54 slides half a cell into the tear, then out of the exit into its cell
        const L = Math.hypot(M.to.gx - M.from.gx, M.to.gy - M.from.gy) || 1, dx = (M.to.gx - M.from.gx) / L, dy = (M.to.gy - M.from.gy) / L;
        const k = v.u < 0.5 ? Math.min(1, v.u / 0.42) * 0.45 : -Math.min(1, (1 - v.u) / 0.42) * 0.45;
        return { dx: dx * k * 16, dy: dy * k * 16 };
    }
    function glide(M, now) {                                  // 56: pulled along the rope (fast, then slowing), still in the shot pose
        if (!M.moved || now < M.pull0 || now >= M.pull1) return null;
        const k = pullEase(M, now);
        return { alpha: 1, dx: (M.to.gx - M.from.gx) * k * 16, dy: (M.to.gy - M.from.gy) * k * 16, lift: 0 };
    }
    function leap(M, now) {                                   // 57: a parabola, `peak` dots high at the middle
        if (now < M.jump || now >= M.slam) return null;
        const u = (now - M.jump) / Math.max(1, M.slam - M.jump);
        return { alpha: 1, dx: (M.to.gx - M.from.gx) * u * 16, dy: (M.to.gy - M.from.gy) * u * 16, lift: Math.round(4 * M.peak * u * (1 - u)) };
    }
    /** After the pull or the slam, until combat has moved the caster into its new cell (up to one tick): stay there. */
    function arrived(M, now) {
        const end = M.slam ?? M.pull1;
        return now >= end && now < end + 300 ? { alpha: 1, lift: 0, dx: (M.to.gx - M.from.gx) * 16, dy: (M.to.gy - M.from.gy) * 16 } : null;
    }
    /** Where the caster is drawn during a movement cast, relative to the cell it occupies (board dots) — null otherwise.
     * waiting: combat has not moved the caster out of M.from yet (the visual clock runs up to a tick ahead). */
    function moveCaster(id, M, now, waiting) {
        if (id === 56 || id === 57) return (id === 56 ? glide(M, now) : leap(M, now)) || (waiting ? arrived(M, now) : null);
        const v = vanish(M, now);
        if (!v) return null;
        if (waiting && v.u >= 0.5) return { alpha: 0, lift: 0, dx: 0, dy: 0 };   // out of sight until it steps out of the other side
        return { alpha: v.alpha, lift: 0, ...(id === 54 ? riftSlide(M, v) : { dx: 0, dy: 0 }) };
    }

    redrawnSkillFx.registerDrawers({
        17: { ground: drawBurstGround, fore: drawBurst }, 29: { ground: drawVortexGround, fore: drawVortex },
        30: { ground: drawFrostMistGround, fore: drawFrostMist }, 37: { ground: drawMineGround, fore: drawMine },
        48: { ground: drawCoolGround, fore: drawCool },
        54: { ground: drawRiftGround, fore: drawRift }, 55: { fore: drawSmoke }, 56: { fore: drawHarpoon },
        57: { ground: drawSlamGround, fore: drawSlam }
    });
    return Object.freeze({ moveCaster });
})();
safeExposeGlobals({ redrawnSkillFxExtra });
