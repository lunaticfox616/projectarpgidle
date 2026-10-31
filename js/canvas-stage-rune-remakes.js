/** 전달본 V3.6(2026-11-01)이 기존 룬에 준 연출: 향로구름의 아홉 겹 안개, 신성한 안개의 향로 연기, 파문심판의 접지 낙뢰, 유성 낙화의 비행과 착탄, 심연 전염과 암흑 파열의
 * Warlock 그림, 시간 가속의 시계. 시뮬레이터의 곁다리 연출(censer-cloud-burst.js, holy-mist-remake.js, judgment-slam.js, meteor-impact-tuning.js, warlock-vfx-remake.js,
 * time-acceleration-vfx.js)의 그림과 시간을 게임의 사건에 옮겼다. 길이는 도트 그대로다. 시뮬레이터는 깊이 순서로 섞어 그리지만 게임의 무대는 바닥 층과 캐릭터 위 층뿐이라,
 * 뒤쪽 조각은 바닥 층에, 앞쪽 조각은 위 층에 그린다. 원래 색 띠는 assets/stage-vfx/vfx3.png에서 그리며(stageNewRunes.raw), 그 그림이 없는 판에서는 띠만 빠진다.
 * 전투 계산에는 닿지 않는다. 판정은 js/skill-gem-casts.js가 맡는다.
 */
const stageRuneRemakes = (() => {
    const K = stageSkillKit, WIDE = K.WIDE, DEEP = K.DEEP;
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const raw = (ctx, name, frame, o) => stageNewRunes.raw(ctx, name, frame, o);

    // ---------------------------------------------------------------- 55 향로구름
    /** 도착 자리의 안개 아홉 겹: 클립, 자리, 늦춤, 진하기, 앞쪽인가, 흘러가는 만큼(censer-cloud-burst-config). */
    const CLOUD = Object.freeze([
        ['cc55_core', 0, -24, 0, 0.9, false, 0, -5], ['cc55_sidepuff', -23, -21, 14, 0.64, false, -17, -3], ['cc55_sidepuff', 23, -21, 24, 0.6, false, 17, -3],
        ['cc55_cloud', -35, -29, 45, 0.43, false, -23, -12], ['cc55_cloud', 0, -36, 52, 0.36, false, 0, -16], ['cc55_cloud', 35, -28, 65, 0.4, false, 23, -11],
        ['cc55_front', -48, -15, 60, 0.29, true, -23, -5], ['cc55_front', 48, -15, 72, 0.27, true, 23, -5], ['cc55_arc', 0, -13, 35, 0.58, true, 0, 0]]);
    /** @param {{gx:number,gy:number}} spot 닿는 칸 @param {number} delay 늦춤(ms) */
    function cloudBurst(spot, delay) {
        for (const [name, x, y, wait, alpha, front, dx, dy] of CLOUD) {
            const ref = name + '@phys';
            stageSkillVfx.play(ref, K.at(spot, x, y), { delay: delay + wait, alpha, layer: front ? 'top' : 'ground', tail: 100, move: { dx, dy, ms: stageSkillVfx.clipLength(ref) } });
        }
    }

    // ---------------------------------------------------------------- 50 신성한 안개
    const MIST = Object.freeze({ waist: -34, sweepFrom: 3, sweepTo: 8, sweepAlpha: 0.52, emitFrom: 3, emitTo: 7, spacing: 44, plumeAlpha: 0.48, ventAlpha: 0.68, tail: 190, pocket: [14, 16], lift: 0.025, drift: 0.019 });
    const framesLength = (clip, from, to) => clip.ms.slice(from, to + 1).reduce((sum, ms) => sum + ms, 0);
    /** 주인공 그림이 이번 프레임에 그 동작이면 그 장. 아니면 -1. */
    function heroFrame(clip) {
        const drawn = stageActors.pose();
        return drawn && drawn.pose.clip === clip ? drawn.pose.frame : -1;
    }
    /** 향로 머리의 자리(발에서 도트): 왼쪽을 보면 시뮬레이터처럼 1-x. 향로가 보이지 않는 장이면 null. */
    function censerHead(heads, frame) {
        const row = heads[frame], left = stageActors.facing() < 0;
        return row ? { x: left ? 1 - row[0] : row[0], y: row[1], rear: !!row[2] } : null;
    }
    /** 앞쪽 연기에 뚫는 작은 구멍: 쇠 향로 머리가 연기에 묻히지 않게 한다. */
    function mistPocket(m) {
        const frame = heroFrame(m.clip), head = frame < 0 ? null : censerHead(m.heads, frame);
        if (!head) return null;
        return { spot: K.heroDrawn(), x: head.x - MIST.pocket[0] / 2, y: head.y - MIST.pocket[1] / 2, w: MIST.pocket[0], h: MIST.pocket[1] };
    }
    /** 향로 머리에서 나는 연기 둘: 그 자리에 남아 조금 떠오르고 흐른다(새 손을 따라가지 않는다). */
    function mistPuff(m, head) {
        const spot = K.heroDrawn(), dir = Math.sign(head.x) || K.heroFace(), layer = head.rear ? 'ground' : 'top', pocket = head.rear ? null : () => mistPocket(m);
        const plume = stageSkillVfx.clipLength(m.map.plume), vent = stageSkillVfx.clipLength(m.map.vent);
        stageSkillVfx.play(m.map.plume, K.at(spot, head.x + dir * 3, head.y - 9), { face: dir, alpha: MIST.plumeAlpha, layer, tail: MIST.tail, pocket, move: { dx: dir * MIST.drift * plume, dy: -MIST.lift * plume, ms: plume } });
        stageSkillVfx.play(m.map.vent, K.at(spot, head.x, head.y - 6), { face: dir, alpha: MIST.ventAlpha, layer, tail: MIST.tail, pocket, move: { dx: dir * MIST.drift * 0.3 * vent, dy: -MIST.lift * 0.4 * vent, ms: vent } });
    }
    /** 몸 둘레의 연기 흐름 한 장: 허리를 경계로 위쪽은 몸 뒤, 아래쪽은 몸 앞에 그린다. */
    function mistSweepHalf(m, rear, life) {
        const face = K.heroFace(), span = 4096, length = stageSkillVfx.clipLength(m.map.sweep);
        stageSkillVfx.paint(K.at(K.heroDrawn()), { life, layer: rear ? 'ground' : 'top', follow: K.heroDrawn }, (ctx, t, dot) => {
            const k = clamp(t / life, 0, 1), waist = MIST.waist * dot;
            ctx.beginPath();
            ctx.rect(-span, rear ? -span : waist, span * 2, rear ? span + waist : span);
            ctx.clip();
            stageSkillVfx.stamp(ctx, m.map.sweep, k * length, { x: 0, y: waist, dot, face, alpha: MIST.sweepAlpha * Math.min(1, k * 5, (1 - k) * 5 + 0.2) });
        });
    }
    /** 프레임마다: 동작이 3장에 닿으면 연기 흐름을 걸고, 3~7장 동안 도트 시간 44ms마다 연기를 낸다. 동작이 끝나면 그만 본다. */
    function mistWatch(m, time) {
        const frame = heroFrame(m.clip);
        if (frame < 0) return time - m.started < 200 && !m.seen;
        m.seen = true;
        if (frame >= MIST.sweepFrom && !m.swept) {
            m.swept = true;
            const life = framesLength(m.clip, MIST.sweepFrom, MIST.sweepTo) / m.rate;
            mistSweepHalf(m, true, life);
            mistSweepHalf(m, false, life);
        }
        const head = frame >= MIST.emitFrom && frame <= MIST.emitTo && time - m.emitted >= MIST.spacing / m.rate ? censerHead(m.heads, frame) : null;
        if (head) { m.emitted = time; mistPuff(m, head); }
        return true;
    }
    /** 향로를 휘두르기 시작할 때(사건의 censer 단계). 그 직업과 자세의 향로 회전 동작이 없으면(시험용 저장) 연기를 내지 않는다. */
    function mistStart(c) {
        if (!c.first) return true;
        const classId = getHeroAppearanceId(), heads = STAGE_SKILL_VFX.censerHeads[classId], motion = stageActors.motionFor(c.gem.meta.name, classId, getStageHeroStance());
        const clip = stageActors.clipOf(classId, getStageHeroStance(), motion);
        if (!heads || !clip) return true;
        const m = { map: c.gem.map, heads, clip, rate: Number(c.event.holyRate) || 1, started: stageSkillVfx.now(), emitted: -1e9, seen: false, swept: false };
        stageSkillVfx.watch(time => mistWatch(m, time));
        return true;
    }

    // ---------------------------------------------------------------- 51 파문심판
    /** 향로가 바닥에 닿는 자리(주인공 앞, 직업마다 도트: judgment-slam-config). */
    const SLAM_REACH = Object.freeze({ wanderer: 50, warrior: 60, archer: 70, occultist: 64, alchemist: 90, cleric: 82 });
    const SLAM_GAP = 45;
    /** 닿는 순간: 바닥 먼지, 고리, 앞으로 퍼지는 물결, 그리고 십자의 칸마다 가까운 곳부터 낙뢰(피해와 같은 때: js/skill-gem-casts.js stepJudgment). */
    function slam(c) {
        if (!c.first) return true;
        const kit = c.gem.map.slam, event = c.event, rate = Number(event.judgmentRate) || 1, hero = K.heroSpot(), aim = event.landingCell, face = Math.sign(aim.gx - hero.gx) || K.heroFace();
        const x = face * (SLAM_REACH[getHeroAppearanceId()] || 60), far = (aim.gx - hero.gx) * WIDE - x, deep = (aim.gy - hero.gy) * DEEP;
        stageSkillVfx.play(kit.dust, K.at(hero, x, 0), { face, layer: 'ground', alpha: 0.65 });
        stageSkillVfx.play(kit.ring, K.at(hero, x, 0), { face, layer: 'ground', alpha: 0.78 });
        stageSkillVfx.play(kit.wave, K.at(hero, x, 0), { face, layer: 'ground', alpha: 0.4, move: { dx: far, dy: deep, ms: Math.max(30, 90 / rate) } });
        (event.judgmentCells || []).forEach((cell, i) => {
            const delay = i * SLAM_GAP / rate;
            stageSkillVfx.play(kit.bolt, K.at(cell, 0, 1), { delay, alpha: i ? 0.92 : 1 });
            if (!i) stageSkillVfx.play(kit.core, K.at(cell, 0, 1), { delay, face: -1, alpha: 0.42 });
            stageSkillVfx.play(kit.impact, K.at(cell, 0, 0), { delay, layer: 'ground', alpha: i ? 0.58 : 0.8 });
        });
        return true;
    }

    // ---------------------------------------------------------------- 34 유성 낙화
    const METEOR = Object.freeze({ ease: 2.3, endDrop: 18, trail: 4, trailStep: 28, trailAlpha: 0.33, headMs: 55, headScale: 1.15, headAnchor: [98, 64] });
    const IMPACT = Object.freeze({ life: 650, burstMs: 46, burstFrames: 7, groundMs: 38, groundFrames: [3, 4, 5, 6, 7], emberMs: 27, emberFrames: 14, embers: [[-36, -18, 35], [38, -11, 80], [0, -44, 120]] });
    /** 원래 색 띠가 있는가(vfx3.png가 없는 판에서는 부른 쪽이 예전 클립을 쓴다). */
    const hasRaw = () => !!stageSkillVfx.picture(2);
    function meteorPose(f, t) {
        const q = Math.pow(clamp(t / f.ms, 0, 1), METEOR.ease);
        return { x: f.x0 + (f.x1 - f.x0) * q, y: f.y0 + (f.y1 - f.y0) * q };
    }
    /** 유성의 머리와 짧은 꼬리: 닿는 때는 그대로이고 화면의 머리만 가속해 떨어진다. */
    function meteorFlight(centre, face, ms) {
        const f = { ms, x0: face * 150, y0: -360, x1: 0, y1: -40 + METEOR.endDrop }, angle = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
        const head = (ctx, t, alpha, scale) => { const p = meteorPose(f, t); raw(ctx, 'fire8', Math.floor(t / METEOR.headMs) % 4, { x: p.x, y: p.y, rot: angle, alpha, scale: METEOR.headScale * scale, anchor: METEOR.headAnchor }); };
        stageSkillVfx.paint(K.at(centre), { life: ms }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            for (let i = METEOR.trail; i >= 1; i--) if (t - i * METEOR.trailStep >= 0) head(ctx, t - i * METEOR.trailStep, METEOR.trailAlpha * (1 - i / (METEOR.trail + 1)), 0.7 + 0.25 * (1 - i / METEOR.trail));
            head(ctx, t, 0.98, 1);
        });
    }
    /** 착탄: 작은 지면 화염, 큰 불 핵, 흩어지는 불티 셋. */
    function meteorImpact(s) {
        if (!s.first) return;
        const groundEnd = IMPACT.groundFrames.length * IMPACT.groundMs, burstEnd = IMPACT.burstFrames * IMPACT.burstMs, emberEnd = IMPACT.emberFrames * IMPACT.emberMs;
        stageSkillVfx.paint(K.at(s.area.centre), { life: IMPACT.life }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            if (t < groundEnd) raw(ctx, 'fire6', IMPACT.groundFrames[Math.floor(t / IMPACT.groundMs)], { y: 2, alpha: 0.8 * Math.min(1, (groundEnd - t) / 65), scale: 1.05, anchor: [64, 112] });
            if (t < burstEnd) raw(ctx, 'fire1', Math.floor(t / IMPACT.burstMs), { y: -42, alpha: 0.97 * Math.min(1, (burstEnd - t) / 90), scale: 1.65 });
            const fade = clamp((IMPACT.life - t) / 180, 0, 1);
            for (const [x, y, delay] of IMPACT.embers) {
                const age = t - delay;
                if (age >= 0 && age < emberEnd) raw(ctx, 'fire4', Math.floor(age / IMPACT.emberMs), { x, y: y - age * 0.04, alpha: 0.75 * fade, scale: 0.42 });
            }
        });
    }

    // ---------------------------------------------------------------- 23 심연 전염, 27 암흑 파열 (Warlock)
    const WARLOCK_LIFT = -44;                     // 몸 가운데(시뮬레이터 bodyOffsetY)
    const followEnemy = id => { const enemy = K.enemy(id); return () => (enemy && K.enemy(id) === enemy && enemy.hp > 0 ? K.enemySpot(enemy) : null); };
    /** 암흑 파열의 준비: 연무가 줄어들며 모이고 중심에 조짐이 맺힌다. */
    function ruptureBrew(enemy, ms) {
        stageSkillVfx.paint(K.at(K.enemySpot(enemy), 0, WARLOCK_LIFT), { life: ms, follow: followEnemy(enemy.id) }, (ctx, t, dot) => {
            const u = clamp(t / ms, 0, 1);
            ctx.scale(dot, dot);
            raw(ctx, 'wl3', Math.min(7, Math.floor(u * 8)), { scale: 1.1 + (0.36 - 1.1) * u, alpha: 0.32 * Math.min(1, u * 5) });
            raw(ctx, 'wl7', Math.min(2, Math.floor(u * 3)), { scale: 0.7, alpha: 0.65 * Math.min(1, u * 4) });
        });
    }
    /** 암흑 파열이 맞는 순간: 터짐 네 장, 낮게 남는 연무. */
    function ruptureBurst(spot, id) {
        const burst = [3, 4, 5, 6], step = 45, cloud = 38, wait = 65, life = Math.max(burst.length * step, wait + 8 * cloud);
        stageSkillVfx.paint(K.at(spot, 0, WARLOCK_LIFT), { life, follow: followEnemy(id) }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            if (t < burst.length * step) raw(ctx, 'wl7', burst[Math.floor(t / step)], { scale: 0.83, alpha: 0.92 * Math.min(1, (life - t) / 60) });
            const q = t - wait;
            if (q >= 0 && q < 8 * cloud) raw(ctx, 'wl3', Math.floor(q / cloud), { scale: 0.66, alpha: 0.25 * Math.min(1, (8 * cloud - q) / 90) });
        });
    }
    /** 심연 전염이 든 적: 작은 표식과 짧은 잔향. */
    function infectionMark(spot, id, delay) {
        const mark = 36, cloud = 32;
        stageSkillVfx.paint(K.at(spot, 0, WARLOCK_LIFT), { life: 8 * cloud, delay, follow: followEnemy(id) }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            if (t < 5 * mark) raw(ctx, 'wl9', Math.floor(t / mark), { scale: 0.37, alpha: 0.82 * Math.min(1, (5 * mark - t) / 55) });
            if (t < 8 * cloud) raw(ctx, 'wl3', Math.floor(t / cloud), { scale: 0.39, alpha: 0.23 * Math.min(1, (8 * cloud - t) / 70) });
        });
    }
    /** 다음 적으로 건너가는 덩어리와 꼬리(0.1초). */
    function infectionHop(from, to) {
        const ms = 100, dx = (to.gx - from.gx) * WIDE, dy = (to.gy - from.gy) * DEEP, rot = Math.atan2(dy, dx);
        stageSkillVfx.paint(K.at(from, 0, WARLOCK_LIFT), { life: ms }, (ctx, t, dot) => {
            const u = clamp(t / ms, 0, 1), frame = Math.min(4, Math.floor(u * 5)), back = Math.max(0, u - 0.18);
            ctx.scale(dot, dot);
            raw(ctx, 'wl10', frame, { x: dx * back, y: dy * back, rot, scale: 0.53, alpha: 0.63 });
            raw(ctx, 'wl9', frame, { x: dx * u, y: dy * u, rot, scale: 0.4, alpha: 0.92 });
        });
    }
    /** 맞은 적마다(js/canvas-stage-skill-rules.js). hit: { fx, victim, ... } */
    function warlockHit(kind, hit) {
        const id = hit.fx.enemyId;
        if (kind === 'rupture') { ruptureBurst(hit.victim, id); return; }
        const before = hit.fx.chainFromEnemyId == null ? null : K.enemy(hit.fx.chainFromEnemyId);
        if (before) infectionHop(K.enemySpot(before), hit.victim);
        infectionMark(hit.victim, id, before ? 60 : 0);
    }
    /** 시전 시작(js/canvas-stage-skill-rules.js): 암흑 파열은 대상에 조짐을 건다. fx.impactDelayMs가 준비 시간이다. */
    function warlockWindup(kind, fx) {
        if (kind !== 'rupture') return;
        const spot = K.heroSpot(), live = (game.enemies || []).filter(enemy => enemy.hp > 0 && hasGridCell(enemy));
        const near = live.sort((a, b) => getGridUnitDistance(spot, a) - getGridUnitDistance(spot, b))[0];
        if (near) ruptureBrew(near, Math.max(120, Number(fx.impactDelayMs) || 0));
    }

    // ---------------------------------------------------------------- 46 시간 가속
    const CLOCK = Object.freeze({ scale: 3.4, flat: 0.5, anchor: [24, 40], core: 8, tailFrames: [8, 9, 10, 11, 12, 13, 14, 15, 16], frameMs: 75, intervals: [1000, 800, 600, 400], whole: 3000, tail: 600, fadeIn: 110, fadeOut: 200, alpha: 0.86 });
    /** 시계의 장: 간격이 줄수록 빨리 돌고 끝 0.6초는 흩어진다. 게임의 지속 시간에 맞춰 네 구간을 늘린다. */
    function clockPhase(t, total) {
        const tailStart = Math.max(0, total - CLOCK.tail);
        if (t >= tailStart) return { frame: CLOCK.tailFrames[Math.floor(clamp((t - tailStart) / CLOCK.tail, 0, 0.999) * CLOCK.tailFrames.length)], turned: null };
        const stretch = total / CLOCK.whole;
        let at = 0, weighted = 0;
        for (const interval of CLOCK.intervals) {
            const span = interval * stretch, elapsed = Math.min(Math.max(0, t - at), span);
            weighted += elapsed * (1000 / interval);
            at += span;
            if (t < at) break;
        }
        return { frame: Math.floor(weighted / CLOCK.frameMs) % CLOCK.core, turned: weighted / 1300 };
    }
    let latestClock = null;                       // 시계는 가장 최근의 것 하나만 보인다
    function clockTicks(event, shown) {
        const rows = event.timeTickTargets || [];
        for (; shown.count < rows.length; shown.count++) for (const cell of rows[shown.count].cells || []) stageSkillVfx.play('pol_focus@chaos', K.at(cell, 0, K.BODY), { alpha: 0.7 });
    }
    /** 시간 가속: 발밑에 눕힌 시계가 주인공을 따라가며 점점 빨리 돌고, 틱마다 맞은 자리에 작은 빛이 든다. 시간의 사선의 시계가 떠 있으면 그쪽을 먼저 보인다. */
    function clock(c) {
        if (!c.first) return true;
        const event = c.event, total = Math.max(1, event.duration), token = latestClock = {}, shown = { count: 0 };
        let angle = 0;
        stageSkillVfx.paint(K.at(K.heroDrawn(), 0, 2), { life: total, layer: 'ground', follow: K.heroDrawn }, (ctx, t, dot) => {
            clockTicks(event, shown);
            const fade = clamp(Math.min(t / CLOCK.fadeIn, (total - t) / CLOCK.fadeOut), 0, 1);
            if (latestClock !== token || !fade || stageNewRunes.fieldBusy()) return;
            const phase = clockPhase(t, total);
            if (phase.turned !== null) angle = phase.turned;
            ctx.scale(dot, dot * CLOCK.flat);
            raw(ctx, 'clock46', phase.frame, { rot: angle, scale: CLOCK.scale, anchor: CLOCK.anchor, alpha: CLOCK.alpha * fade });
        });
        return true;
    }

    return Object.freeze({ cloudBurst, mistStart, slam, hasRaw, meteorFlight, meteorImpact, warlockHit, warlockWindup, clock });
})();
safeExposeGlobals({ stageRuneRemakes });
