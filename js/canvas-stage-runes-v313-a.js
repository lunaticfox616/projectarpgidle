/** 스킬 전체 전달본 V3.13(2026-11-08)의 새 룬 무대 연출 a: 82 절대영도, 83 전도성 형상체, 84 특이점 분리, 85 일섬, 86 공허의 빙의.
 * 시뮬레이터(index.html의 doFrozenOrb, frozenOrbFx, frostBoltFx, doOrbit, updateOrbs, drawOrbit, zap, doSingularity, riftLineFx, doIssen, issenFx,
 * buildNoStarSlash, doVoidPossess, voidPullRingFx, weakMarkFx)의 그림과 시간을 게임의 사건(js/skill-gem-casts-v313.js)에 옮겼다.
 * 칸의 크기만 시뮬레이터의 72×36에서 게임의 64×32로 옮기고 길이는 도트 그대로다. 바닥에 닿는 그림(그림자, 그늘, 점선 고리, 뒤쪽 구체)은 바닥 층에,
 * 나머지는 캐릭터 위에 그린다. 전투 계산에는 닿지 않는다: 사건과 적의 상태를 읽기만 한다.
 * 시뮬레이터와 다른 점: 특이점 붕괴의 화면 흔들림(shakeKick)은 룬이 무대의 흔들림을 걸 길이 없어 뺐다. 서리 구체는 판정처럼 주인공의 칸에서 떠난다.
 * 약화 표시의 혼 세 점은 큰 적이면 그 머리 위로 올린다.
 */
const stageRunesV313A = (() => {
    const K = stageSkillKit, TAU = Math.PI * 2, ORIGIN = Object.freeze({ gx: 0, gy: 0 });
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const inkOf = (element, fallback) => STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements[fallback];
    /** 클립을 세우는 높이(시뮬레이터 vfxBody): 바닥 기준 클립은 발 자리, 가운데 기준 클립은 몸 높이. */
    const standDy = ref => (K.onGround(ref) ? 1 : -46);
    const bar = (ctx, x, y, w, h) => ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    function disc(ctx, x, y, r, colour) {
        ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill();
    }
    /** 도트 붓: 그 자리(발, K.screen)로 옮겨 도트 단위로 draw를 부른다. */
    function inDots(ctx, at, draw) {
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.y));
        ctx.scale(at.dot, at.dot);
        draw();
        ctx.restore();
    }

    // ---------------------------------------------------------------- layers
    /** 화면 좌표로 그리는 연출 하나: 붓을 칸 0,0에서 화면 원점으로 되돌리고 draw(ctx, 투영, t)를 부른다. */
    function screenRow(o, draw) {
        return stageSkillVfx.paint(K.at(ORIGIN), o, (ctx, t) => {
            const p = stageSkillVfx.projection();
            if (!p) return;
            const at = K.screen(p, ORIGIN);
            ctx.translate(-Math.round(at.x), -Math.round(at.y));
            draw(ctx, p, t);
        });
    }
    const grounds = new WeakMap();                // 사건 → 바닥 층 줄, 마지막으로 그린 때, 전투 시계와 무대 시계의 차
    /** 사건이 불리는 동안 바닥 층(캐릭터 뒤)에 draw(ctx, 투영, 전투 시각, 사건)를 그린다. 사건이 그치면 0.15초 뒤에 걷힌다. */
    function groundLayer(c, draw) {
        const clock = stageSkillVfx.now();
        let run = grounds.get(c.event);
        if (!run) { run = { row: null, drawnAt: 0, offset: 0 }; grounds.set(c.event, run); }
        run.offset = c.view.now - clock;
        if (!run.row || clock - run.drawnAt > 200) {   // 처음이거나, 방을 옮겨 걷힌 줄
            run.drawnAt = clock;
            run.row = screenRow({ life: 150, layer: 'ground' }, (ctx, p) => { run.drawnAt = stageSkillVfx.now(); draw(ctx, p, run.drawnAt + run.offset, c.event); });
        }
        if (run.row) run.row.life = clock - run.row.start + 150;
    }

    // ---------------------------------------------------------------- 82 절대영도
    const ORB = Object.freeze({ lift: 50, fadeIn: 80, fadeOut: 140, muzzle: Object.freeze([26, -52]), nova: 0.9, spin: 6.5, boltSink: 26, boltLow: 20, boltIn: 40 });
    const orbLength = event => event.orbReach / event.orbSpeed * 1000;
    /** 구체가 그때 있는 칸: 떠난 칸에서 그 방향으로 초당 orbSpeed칸, orbReach칸까지. */
    function orbSpot(event, now) {
        const k = clamp(now - event.at, 0, orbLength(event)) / 1000 * event.orbSpeed;
        return { gx: event.orbFrom.gx + Math.cos(event.orbAngle) * k, gy: event.orbFrom.gy + Math.sin(event.orbAngle) * k };
    }
    const orbFade = (t, length) => (t >= length ? Math.max(0, 1 - (t - length) / ORB.fadeOut) : Math.min(1, t / ORB.fadeIn));
    /** 쏘는 순간 손 앞의 섬광(첫 구체만: 시전 한 번에 하나)과 끝자리에서 터지는 서리 고리. */
    function orbStart(c) {
        const event = c.event, map = c.gem.map;
        if (!event.orbSeed && map.muzzle) {
            const face = Math.sign(Math.cos(event.orbAngle)) || c.look.face;
            stageSkillVfx.play(map.muzzle, K.at(event.orbFrom, face * ORB.muzzle[0], ORB.muzzle[1]), { face, ramp: c.look.ramp });
        }
        if (map.nova) stageSkillVfx.play(map.nova, K.at(orbSpot(event, event.at + orbLength(event)), 0, -ORB.lift), { face: 1, scale: ORB.nova, ramp: c.look.ramp, delay: Math.max(0, event.orbNovaAt - c.view.now) });
    }
    /** 바닥 그림자(바닥 층). */
    function orbShadow(ctx, p, now, event) {
        const t = now - event.at, fade = orbFade(t, orbLength(event));
        if (t < 0 || fade <= 0) return;
        inDots(ctx, K.screen(p, orbSpot(event, now)), () => {
            ctx.globalAlpha = 0.3 * fade; ctx.fillStyle = '#0a0810';
            ctx.beginPath(); ctx.ellipse(0, 1, 9, 3, 0, 0, TAU); ctx.fill();
        });
    }
    /** 구체: 옅은 빛 두 겹, 돌아가는 서리 가시 여섯(긴 것과 짧은 것 번갈아), 세 겹 속과 흰 반짝임. */
    function orbBody(ctx, t, fade, ink) {
        const Y = -ORB.lift, rot = t / 1000 * ORB.spin, put = (x, y, colour) => { ctx.fillStyle = colour; ctx.fillRect(x, Y + y, 1, 1); };
        ctx.globalAlpha = 0.26 * fade; disc(ctx, 0, Y, 17, ink.c3);
        ctx.globalAlpha = 0.42 * fade; disc(ctx, 0, Y, 11, ink.c2);
        ctx.globalAlpha = fade;
        for (let i = 0; i < 6; i++) orbSpike(rot + i * Math.PI / 3, i % 2 ? 15 : 21, ink, put);
        disc(ctx, 0, Y, 7, ink.c3);
        disc(ctx, 0, Y, 6, ink.c2);
        disc(ctx, -1, Y - 1, 4, ink.c1);
        ctx.fillStyle = '#f6fcff'; ctx.fillRect(-3, Y - 3, 3, 2);
        ctx.globalAlpha = 1;
    }
    function orbSpike(a, r1, ink, put) {
        for (let s = 6; s <= r1; s++) put(Math.round(Math.cos(a) * s), Math.round(Math.sin(a) * s), s >= r1 - 1 ? ink.c1 : ink.c2);
        const bx = Math.round(Math.cos(a) * (r1 - 4)), by = Math.round(Math.sin(a) * (r1 - 4)), nx = Math.round(Math.cos(a + Math.PI / 2) * 2), ny = Math.round(Math.sin(a + Math.PI / 2) * 2);
        put(bx + nx, by + ny, ink.c2); put(bx - nx, by - ny, ink.c2);
    }
    /** 서리 화살: 구체가 쏜 화살마다 쏜 자리에서 그 방향으로 사거리 끝이나 맞힌 때까지 난다. 날며 조금씩 낮아진다. */
    function orbBolts(ctx, p, event, now, ink) {
        for (const bolt of event.orbBolts || []) {
            const t = now - bolt.at;
            if (t < 0 || now >= Math.min(bolt.until, bolt.at + event.boltLife)) continue;
            const k = t / 1000 * event.boltSpeed, spot = { gx: bolt.gx + Math.cos(bolt.angle) * k, gy: bolt.gy + Math.sin(bolt.angle) * k };
            inDots(ctx, K.screen(p, spot), () => orbStreak(ctx, bolt.angle, { h: Math.max(ORB.boltLow, ORB.lift - ORB.boltSink * t / 1000), alpha: Math.min(1, t / ORB.boltIn) }, ink));
        }
    }
    function orbStreak(ctx, angle, z, ink) {
        const ux = Math.cos(angle), uy = Math.sin(angle) * 0.5, n = Math.hypot(ux, uy) || 1, Y = -z.h;
        const line = (back, width, colour, alpha) => {
            ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = width;
            ctx.beginPath(); ctx.moveTo(Math.round(-ux / n * back) + 0.5, Math.round(Y - uy / n * back) + 0.5); ctx.lineTo(0.5, Math.round(Y) + 0.5); ctx.stroke();
        };
        line(14, 3, ink.c3, 0.55 * z.alpha);
        line(10, 2, ink.c2, z.alpha);
        ctx.fillStyle = ink.c1; ctx.fillRect(-1, Math.round(Y) - 1, 3, 3);
        ctx.globalAlpha = 1;
    }
    /** 구체 하나의 사건: 떠난 때부터 끝에서 옅어질 때까지 구체를, 그동안 쏜 서리 화살을 그린다. */
    function frozenOrb(c) {
        const event = c.event, now = c.view.now, t = now - event.at;
        if (c.first) orbStart(c);
        groundLayer(c, orbShadow);
        if (t < 0) return true;
        const ctx = c.view.ctx, p = c.view.projection, ink = inkOf(c.element, 'cold'), fade = orbFade(t, orbLength(event));
        ctx.save();
        if (fade > 0) inDots(ctx, K.screen(p, orbSpot(event, now)), () => orbBody(ctx, t, fade, ink));
        orbBolts(ctx, p, event, now, ink);
        ctx.restore();
        return true;
    }

    // ---------------------------------------------------------------- 83 전도성 형상체
    const ORBIT = Object.freeze({ spin: 2.3, rx: 38, perOrb: 1.6, most: 10, ry: 15, high: 56, bob: 7, grow: 160, blink: 1200, blinkStep: 110, hot: 140 });
    const orbitKnown = new WeakSet();             // 한 번 보인 구체(가장 오래된 구체를 다시 채우면 태어난 때가 앞날로 옮겨 가도 그대로 보인다)
    const orbitBorn = new WeakMap();              // 사건 → 불꽃을 낸 마지막 시전의 때
    let orbitEvent = null;                        // 지금 도는 구체들의 사건(정전기가 쏜 구체를 찾는다)
    const orbitInk = element => inkOf(element === 'prism' ? 'light' : element, 'light');
    /** 지금 보이는 구체들(배열 차례 그대로). */
    function orbitShown(event, now) {
        const shown = (event.orbitOrbs || []).filter(orb => now < orb.until && (orb.born <= now || orbitKnown.has(orb)));
        shown.forEach(orb => { if (orb.born <= now) orbitKnown.add(orb); });
        return shown;
    }
    /** n개 가운데 j번째 구체의 자리(주인공 발에서 도트), 높이, 각. 개수가 늘면 둘레가 조금 넓어진다. */
    function orbitPlace(n, j, orb, now) {
        const a = now / 1000 * ORBIT.spin + j / n * TAU, rx = ORBIT.rx + Math.min(n, ORBIT.most) * ORBIT.perOrb;
        return { x: Math.cos(a) * rx, y: Math.sin(a) * ORBIT.ry, h: ORBIT.high + Math.sin(a * 2 + orb.seed) * ORBIT.bob, a };
    }
    /** 한 층의 구체들: 주인공보다 깊은 쪽 반은 바닥 층에(몸 뒤로 돈다), 앞쪽 반은 위 층에. 그려진 주인공을 따라간다. */
    function orbitPass(ctx, p, now, event, front) {
        const shown = orbitShown(event, now), hero = K.screen(p, K.heroDrawn()), ink = orbitInk(event.element);
        shown.forEach((orb, j) => {
            const place = orbitPlace(shown.length, j, orb, now);
            if ((Math.sin(place.a) >= 0) !== front) return;
            inDots(ctx, { x: hero.x + place.x * hero.dot, y: hero.y + (place.y - place.h) * hero.dot, dot: hero.dot }, () => orbitBall(ctx, orb, now, { ink, back: !front }));
        });
    }
    /** 구체: 빛 테(막 쏜 0.14초는 크게), 속, 흰 심, 둘레의 정전기. 생길 때 0.16초에 자라고 끝나기 1.2초 전부터 깜빡인다. 뒤쪽은 조금 어둡다. */
    function orbitBall(ctx, orb, now, z) {
        const left = orb.until - now, age = now - orb.born;
        if (left < ORBIT.blink && Math.floor(left / ORBIT.blinkStep) % 2) return;
        const s = age < 0 ? 1 : Math.min(1, age / ORBIT.grow), hot = now - orb.flashAt < ORBIT.hot, ink = z.ink;
        ctx.globalAlpha = (z.back ? 0.55 : 0.8) * s; disc(ctx, 0, 0, (hot ? 8 : 6) * s, ink.c3);
        ctx.globalAlpha = (z.back ? 0.7 : 1) * s; disc(ctx, 0, 0, 4 * s, ink.c2);
        ctx.fillStyle = ink.c1; ctx.fillRect(-1, -2, 2, 3); ctx.fillRect(-2, -1, 4, 1);
        orbitStatic(ctx, orb, now, (hot ? 0.95 : 0.6) * s, ink.c1);
        ctx.globalAlpha = 1;
    }
    /** 둘레에서 튀는 짧은 정전기 두 가닥(0.08초마다 바뀐다). */
    function orbitStatic(ctx, orb, now, alpha, colour) {
        const r = stageSkillStrokes.random(Math.floor(now / 80) + Math.floor(orb.seed * 13));
        ctx.strokeStyle = colour; ctx.lineWidth = 1; ctx.globalAlpha = alpha;
        for (let k = 0; k < 2; k++) {
            const a = r() * TAU;
            let x = Math.cos(a) * 4, y = Math.sin(a) * 4;
            ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
            for (let j = 0; j < 3; j++) { x += Math.cos(a) * 3 + (r() - 0.5) * 4; y += Math.sin(a) * 3 + (r() - 0.5) * 4; ctx.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); }
            ctx.stroke();
        }
    }
    /** 시전마다(구체가 새로 생기거나 가장 오래된 구체를 다시 채울 때) 손 앞의 작은 번개 불꽃(시뮬레이터 doOrbit의 spark). */
    function orbitSpark(c, now) {
        const last = orbitBorn.has(c.event) ? orbitBorn.get(c.event) : -Infinity;
        const born = (c.event.orbitOrbs || []).map(orb => orb.born).filter(at => at <= now && at > last);
        if (!born.length) return;
        orbitBorn.set(c.event, Math.max(...born));
        const face = K.heroFace(), ink = orbitInk(c.element);
        stageSkillVfx.paint(K.at(K.heroDrawn(), face * 22, -66), { life: 260 }, (ctx, t, dot) => castSpark(ctx, t / 260, dot, ink));
    }
    /** 커지며 옅어지는 빛 십자, 네 귀의 점, 가운데 네모. */
    function castSpark(ctx, k, dot, ink) {
        const r = 4 + Math.round(k * 7), q = Math.round(r * 0.6);
        ctx.scale(dot, dot);
        ctx.globalAlpha = 1 - k; ctx.fillStyle = ink.c1;
        ctx.fillRect(-r, 0, 2 * r + 1, 1); ctx.fillRect(0, -r, 1, 2 * r + 1);
        [[-q, -q], [q, -q], [-q, q], [q, q]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
        ctx.fillStyle = ink.c2; ctx.fillRect(-2, -2, 5, 5);
    }
    /** 도는 구체들의 긴 사건: 앞쪽 구체는 여기서, 뒤쪽 구체는 바닥 층에 그린다. */
    function orbit(c) {
        const event = c.event, now = c.view.now;
        orbitEvent = event;
        groundLayer(c, (ctx, p, time) => orbitPass(ctx, p, time, event, false));
        if (now < event.at) return true;
        orbitSpark(c, now);
        c.view.ctx.save();
        orbitPass(c.view.ctx, c.view.projection, now, event, true);
        c.view.ctx.restore();
        return true;
    }
    const ZAP = Object.freeze({ body: 50, step: 40, glow: 170, glowR: 12, knot: 0.7, knotAlpha: 0.9, back: 4 });
    /** 그 구체가 지금 그려진 화면 자리(사라졌으면 null). */
    function orbitAt(p, seed, now) {
        const shown = orbitEvent ? orbitShown(orbitEvent, now) : [], j = shown.findIndex(orb => orb.seed === seed);
        if (j < 0) return null;
        const place = orbitPlace(shown.length, j, shown[j], now), hero = K.screen(p, K.heroDrawn());
        return { x: hero.x + place.x * hero.dot, y: hero.y + (place.y - place.h) * hero.dot };
    }
    /** 번개 클립을 두 점 사이에 이어 붙인다(시뮬레이터 vfxSeg): 마디마다 0.04초씩 앞선 장, 끝에서 클립의 옅어짐. */
    function zapClip(ctx, ref, z) {
        const dot = z.to.dot, w = stageSkillVfx.clipWidth(ref) * dot, dx = z.to.x - z.from.x, dy = z.to.y - z.from.y, length = Math.hypot(dx, dy), n = Math.max(1, Math.round(length / w));
        const tail = (stageSkillVfx.clipOf(ref) || {}).fadeOut || 0;
        ctx.globalAlpha *= tail ? clamp((z.life - z.t) / tail, 0, 1) : 1;
        ctx.translate(z.from.x, z.from.y);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.scale(length / (n * w), 1);
        for (let i = 0; i < n; i++) stageSkillVfx.stamp(ctx, ref, z.t + i * ZAP.step, { x: i * w, y: 0, dot, face: 1 });
    }
    /** 맞은 자리(시뮬레이터 projImpact의 연쇄 타격): pixelfx 전기 매듭 클립과 0.17초의 옅은 빛. */
    function zapHit(c, target, side) {
        const element = c.element === 'prism' ? 'light' : c.element, ink = orbitInk(element), at = K.at(target, -side * ZAP.back, -ZAP.body);
        stageSkillVfx.play(`pfx_zaphit@${element === 'light' ? '=' : c.look.ramp}`, at, { face: side, scale: ZAP.knot, alpha: ZAP.knotAlpha });
        stageSkillVfx.paint(at, { life: ZAP.glow }, (ctx, t, dot) => {
            const r = ZAP.glowR * dot, glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            glow.addColorStop(0, ink.c2); glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.34 * (1 - t / ZAP.glow);
            ctx.fillStyle = glow; ctx.fillRect(-r, -r, r * 2, r * 2);
        });
    }
    /** 정전기: 쏜 구체가 지금 그려진 자리에서 맞은 적의 몸까지 번개 클립. 구체가 도는 동안 시작점이 따라간다. */
    function zap(c) {
        if (!c.first) return true;
        const event = c.event, target = event.targetCells[0], ref = c.gem.map.zap, offset = c.view.now - stageSkillVfx.now();
        const first = orbitAt(c.view.projection, event.orbSeed, c.view.now), aim = K.screen(c.view.projection, target);
        let from = first;
        if (ref) {
            const life = stageSkillVfx.clipLength(ref);
            screenRow({ life, layer: 'top' }, (ctx, p, t) => {
                from = orbitAt(p, event.orbSeed, stageSkillVfx.now() + offset) || from;
                const to = K.screen(p, target);
                to.y -= ZAP.body * to.dot;
                if (from) zapClip(ctx, ref, { from, to, t, life });
            });
        }
        zapHit(c, target, (first && Math.sign(aim.x - first.x)) || c.look.face);
        return true;
    }

    // ---------------------------------------------------------------- 84 특이점 분리
    const RIFT = Object.freeze({ air: 120, open: 110, grow: 90, shut: 200, motes: 26, pull: 420, spike: 1.1, spikeDy: 10, spikeSide: 6, spikeStep: 25, spikeScale: 0.75, collapseDy: -40, collapseScale: 0.85 });
    const riftFaces = new Map();                  // 시전 → 틈을 연 쪽(붕괴 클립이 그쪽을 본다)
    const riftMotes = new WeakMap();              // 사건 → 틈으로 빨려 드는 조각
    /** 틈이 선 칸: 가운데 줄, 위아래 끝(바닥 밖으로는 나가지 않는다: 시뮬레이터의 FT + 2, FB - 2). */
    function riftSpan(event) {
        const rows = Number(getCombatGridSize().rows) || 1e3, edge = 2 / K.DEEP, top = Math.max(edge - 0.5, event.riftTop);
        return { column: event.riftColumn, top, bottom: Math.max(top, Math.min(rows - 0.5 - edge, event.riftBottom)) };
    }
    const riftWidth = (t, close) => Math.min(1, t / RIFT.open) * (t < close ? 1 : Math.max(0, 1 - (t - close) / RIFT.shut));
    /** 틈의 세로 범위(위 끝 칸의 발에서 도트): 바닥 위 120도트 허공부터 아래 끝까지, 가운데에서 0.09초에 위아래로 갈라진다. */
    function riftZone(t, span, w) {
        const bottom = (span.bottom - span.top) * K.DEEP, mid = (bottom - RIFT.air) / 2, half = (bottom + RIFT.air) / 2 * Math.min(1, t / RIFT.grow);
        return { w, mid, ya: mid - half, yb: mid + half, bottom };
    }
    function riftMotesOf(event, bottom) {
        if (!riftMotes.has(event)) {
            const r = stageSkillStrokes.random(Math.floor(event.riftColumn * 7 * K.WIDE + event.riftTop * K.DEEP) + 7919), close = event.riftClose;
            riftMotes.set(event, Array.from({ length: RIFT.motes }, () => ({ y: -RIFT.air + r() * (bottom + RIFT.air), side: r() < 0.5 ? -1 : 1, d0: 26 + r() * 44, t0: r() * close * 0.8, sp: 0.6 + r() * 0.6 })));
        }
        return riftMotes.get(event);
    }
    /** 흔들리는 검은 속, 보라 테두리, 바깥 그늘(두 도트 줄마다). 닫힐 때 가늘어진다. */
    function riftCore(ctx, t, z, ink) {
        for (let y = Math.round(z.ya); y <= z.yb; y += 2) {
            const j = Math.sin(y * 0.21 + t * 0.012) * 1.6 + Math.sin(y * 0.07 - t * 0.006) * 2.2, X = Math.round(j * z.w), core = Math.max(1, Math.round(4 * z.w)), edge = core + 2;
            ctx.globalAlpha = 0.35 * z.w; ctx.fillStyle = ink.c3; ctx.fillRect(X - edge - 5, y, (edge + 5) * 2, 2);
            ctx.globalAlpha = 0.95 * z.w; ctx.fillStyle = ink.c2; ctx.fillRect(X - edge, y, edge * 2, 2);
            ctx.fillStyle = '#07040d'; ctx.fillRect(X - core + 1, y, Math.max(1, core * 2 - 2), 2);
        }
    }
    /** 둘레의 조각이 틈으로 빨려 든다. */
    function riftPull(ctx, t, motes, z, ink) {
        for (const m of motes) {
            const u = (t - m.t0) / (RIFT.pull * m.sp);
            if (u < 0 || u > 1 || m.y < z.ya || m.y > z.yb) continue;
            ctx.globalAlpha = 0.8 * z.w * (1 - u * 0.4); ctx.fillStyle = u > 0.7 ? ink.c1 : ink.c2;
            ctx.fillRect(Math.round(m.side * m.d0 * (1 - u) * (1 - u)), Math.round(m.y + Math.sin(u * 3) * 3), 2, 1);
        }
    }
    /** 닫히는 순간 가운데의 빛 십자. */
    function riftGlint(ctx, t, close, z, ink) {
        if (t <= close - 60 || t >= close + 120) return;
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(t - close - 30) / 90) * 0.9; ctx.fillStyle = ink.c1;
        ctx.fillRect(-1, Math.round(z.mid) - 6, 3, 12); ctx.fillRect(-5, Math.round(z.mid) - 1, 11, 3);
    }
    /** 바닥: 틈 아래의 옅은 그늘(바닥 층). */
    function riftShade(ctx, p, now, event) {
        const t = now - event.at, w = t < 0 ? 0 : riftWidth(t, event.riftClose);
        if (w <= 0) return;
        const span = riftSpan(event), z = riftZone(t, span, w), from = Math.max(z.ya, 0);
        inDots(ctx, K.screen(p, { gx: span.column, gy: span.top }), () => {
            ctx.globalAlpha = 0.25 * w; ctx.fillStyle = inkOf(event.element, 'chaos').c3;
            ctx.fillRect(-10, Math.round(from), 20, Math.max(0, Math.round(z.yb - from)));
        });
    }
    /** 세로로 갈라진 틈: 열리고(0.11초), 빨아들이고, riftClose에 닫히며 0.2초에 가늘어진다. */
    function rift(c) {
        const event = c.event, t = c.view.now - event.at;
        if (c.first) { riftFaces.set(event.channelId, event.riftFace); if (riftFaces.size > 32) riftFaces.delete(riftFaces.keys().next().value); }
        groundLayer(c, riftShade);
        const w = t < 0 ? 0 : riftWidth(t, event.riftClose);
        if (w <= 0) return true;
        const span = riftSpan(event), z = riftZone(t, span, w), ctx = c.view.ctx, ink = inkOf(c.element, 'chaos');
        inDots(ctx, K.screen(c.view.projection, { gx: span.column, gy: span.top }), () => {
            riftCore(ctx, t, z, ink);
            riftPull(ctx, t, riftMotesOf(event, z.bottom), z, ink);
            riftGlint(ctx, t, event.riftClose, z, ink);
        });
        return true;
    }
    /** 특이점 붕괴: 틈 가운데의 붕괴 클립과, 틈을 따라 1.1칸마다 좌우로 엇갈려 솟는 클립. */
    function collapse(c) {
        if (!c.first) return true;
        const span = riftSpan(c.event), map = c.gem.map, face = riftFaces.get(c.event.channelId) || c.look.face, ramp = c.look.ramp;
        riftFaces.delete(c.event.channelId);
        if (map.collapse) stageSkillVfx.play(map.collapse, K.at({ gx: span.column, gy: (span.top + span.bottom) / 2 }, 0, RIFT.collapseDy), { face, scale: RIFT.collapseScale, ramp });
        for (let k = 0; map.spike && span.top + k * RIFT.spike + RIFT.spikeDy / K.DEEP <= span.bottom; k++) {
            const side = k % 2 ? 1 : -1;
            stageSkillVfx.play(map.spike, K.at({ gx: span.column, gy: span.top + k * RIFT.spike }, side * RIFT.spikeSide, RIFT.spikeDy + standDy(map.spike)), { face: side, delay: k * RIFT.spikeStep, scale: RIFT.spikeScale, ramp });
        }
        return true;
    }

    // ---------------------------------------------------------------- 85 일섬
    const ISSEN = Object.freeze({ reach: 70, lift: 50, tail: 260, shade: 200, bits: 40, cuts: 6, cutLift: -48, cutScale: 0.8, cutAlpha: 0.8, cutLag: 120, cutPace: 8 });
    /** 그 줄의 화면 자리: 쓴 자리의 x, 줄의 발 y와 선의 y, 지금 보이는 화면의 왼쪽과 오른쪽(붓의 좌표로). */
    function issenFrame(ctx, p, event) {
        const at = K.screen(p, { gx: event.sourceCell.gx, gy: event.issenRow }), m = ctx.getTransform(), scale = m.a || 1;
        const left = -m.e / scale, right = (ctx.canvas.width - m.e) / scale;
        return { x0: at.x, y: at.y, Y: Math.round(at.y - ISSEN.lift * at.dot), dot: at.dot, left, right, width: right - left };
    }
    /** 뻗는 선의 양 끝: 0.07초에 화면 끝까지. */
    function issenEnds(f, t) {
        const reach = Math.min(1, t / ISSEN.reach);
        return { reach, L: Math.max(f.left, f.x0 - f.width * reach), R: Math.min(f.right, f.x0 + f.width * reach) };
    }
    /** 그은 선: 넓고 옅은 바람 띠, 옅은 테, 흰 심 한 도트, 뻗어 가는 끝의 빛. */
    function issenStroke(ctx, f, z, ink) {
        const a = 1 - (z.t / z.delay) * 0.45, e = issenEnds(f, z.t), d = f.dot, w = e.R - e.L;
        ctx.globalAlpha = 0.16 * a; ctx.fillStyle = ink.c1; bar(ctx, e.L, f.Y - 5 * d, w, 10 * d);
        ctx.globalAlpha = 0.55 * a; ctx.fillStyle = ink.c2; bar(ctx, e.L, f.Y - d, w, 3 * d);
        ctx.globalAlpha = 0.95 * a; ctx.fillStyle = '#fbf8f0'; bar(ctx, e.L, f.Y, w, d);
        ctx.globalAlpha = 0.9 * (1 - e.reach * 0.6); bar(ctx, f.x0 + z.face * f.width * e.reach - 3 * d, f.Y - 2 * d, 6 * d, 5 * d);
    }
    /** 베인 뒤: 선이 위아래로 갈라져 흩어진다. */
    function issenSplit(ctx, f, z, ink) {
        const a = Math.max(0, 0.55 - z.u), d = f.dot, sp = Math.round(2 + z.u * 9) * d, r = stageSkillStrokes.random(z.seed);
        ctx.globalAlpha = a; ctx.fillStyle = ink.c1; bar(ctx, f.left, f.Y - sp, f.width, d); bar(ctx, f.left, f.Y + sp, f.width, d);
        ctx.globalAlpha = a * 0.5; ctx.fillStyle = ink.c2;
        for (let i = 0; i < ISSEN.bits; i++) bar(ctx, f.left + r() * f.width, f.Y + (r() - 0.5) * 2 * (sp + 4 * d), 3 * d, d);
    }
    /** 바닥: 그 줄의 깊이(±issenDepth칸)에 옅은 띠가 선을 따라 펴졌다가 옅어진다(바닥 층). */
    function issenBand(ctx, p, now, event) {
        const t = now - event.at, life = event.issenDelay + ISSEN.shade;
        if (t < 0 || t >= life) return;
        const f = issenFrame(ctx, p, event), e = issenEnds(f, t), deep = event.issenDepth * K.DEEP * f.dot;
        ctx.globalAlpha = 0.18 * (1 - t / life); ctx.fillStyle = inkOf(event.element, 'phys').c2;
        bar(ctx, e.L, f.y - deep, e.R - e.L, deep * 2);
    }
    /** 흰 선이 화면 끝에서 끝까지 뻗고, issenDelay 뒤 위아래로 갈라져 흩어진다. 베기 자국은 그동안 준비해 둔다. */
    function issenLine(c) {
        const event = c.event, t = c.view.now - event.at;
        cutStrip(c.gem.map.cut, c.view.now);
        groundLayer(c, issenBand);
        if (t < 0 || t > event.issenDelay + ISSEN.tail) return true;
        const ctx = c.view.ctx, f = issenFrame(ctx, c.view.projection, event), ink = inkOf(c.element, 'phys');
        ctx.save();
        if (t < event.issenDelay) issenStroke(ctx, f, { t, face: event.issenFace || c.look.face, delay: event.issenDelay }, ink);
        else issenSplit(ctx, f, { u: (t - event.issenDelay) / ISSEN.tail, seed: Math.floor(event.sourceCell.gx * K.WIDE) + 7 }, ink);
        ctx.restore();
        return true;
    }
    /** 베인 적마다(가까운 6명까지) 별을 지운 큰 베기 자국: 쓴 자리에서 먼 적일수록 늦게(도트/8 ms, 0.12초까지). */
    function issenCut(c) {
        const strip = c.first ? cutStrip(c.gem.map.cut, c.view.now) : null;
        if (!strip) return true;   // 별을 지운 베기 자국을 만들 수 없으면 그 자국만 빠진다
        const from = c.event.sourceCell, face = c.event.issenFace || c.look.face;
        c.event.targetCells.slice(0, ISSEN.cuts).forEach(spot => cutPlay(strip, K.at(spot, 0, ISSEN.cutLift), { face, delay: Math.min(ISSEN.cutLag, Math.abs(spot.gx - from.gx) * K.WIDE / ISSEN.cutPace) }));
        return true;
    }

    // 베기 자국(시뮬레이터 buildNoStarSlash, 11-08 사용자 "일섬은 왕관모양 타격이펙트 제거 바랍니다"): slash_h 원본의 2, 3번째 장에 붙은 별(왕관) 조각을 지운 사본을
    // 실행 중에 캔버스로 만든다. 지울 점은 원본 아틀라스(메인 스레드 밖에서 풀고 다 고르면 바로 놓는다)의 색으로 고르고, 색은 게임의 띠(램프와 옅게)에서 찍어 온다.
    // 파일은 쓰지 않는다. 만들 수 없는 판에서는 일섬의 베기 자국만 빠진다.
    const STAR = Object.freeze({ frames: Object.freeze([2, 3]), edge: 90, green: 20, retry: 250 });
    const cut = { picture: null, mask: null, strip: null, failed: false, triedAt: -Infinity };
    function cutStrip(ref, now) {
        if (cut.strip || cut.failed || !ref || !stageSkillVfx.clipOf(ref)) return cut.strip;
        if (!cut.mask) cut.mask = cutMask(ref);
        if (!cut.mask || now - cut.triedAt < STAR.retry) return cut.strip;
        cut.triedAt = now;
        try { cut.strip = cutPaint(ref, cut.mask); } catch { cut.failed = true; }   // 띠를 읽을 수 없는 환경(원래 색으로 그리는 판)
        return cut.strip;
    }
    /** 원본 아틀라스에서 장마다 지울 점. 원본이 아직 풀리지 않았으면 null(그동안 풀어 둔다). */
    function cutMask(ref) {
        const row = STAGE_SKILL_VFX.atlas[stageSkillVfx.clipOf(ref).a];
        if (!cut.picture) cut.picture = stagePictures.openPicture(STAGE_SKILL_VFX.path + STAGE_SKILL_VFX.files[row.im || 0] + '?v=' + STAGE_SKILL_VFX.version);
        if (cut.picture.failed) cut.failed = true;
        if (!cut.picture.ready) return null;
        const masks = cutRead(cut.picture.source, row);
        stagePictures.closePicture(cut.picture);
        if (!masks) cut.failed = true;
        return masks;
    }
    function cutRead(source, row) {
        const canvas = document.createElement('canvas');
        canvas.width = row.w; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        try {
            return new Map(STAR.frames.map(frame => {
                ctx.clearRect(0, 0, row.w, row.h);
                ctx.drawImage(source, row.fx[frame][0], row.fx[frame][1], row.w, row.h, 0, 0, row.w, row.h);
                return [frame, starMask(ctx.getImageData(0, 0, row.w, row.h).data, row.w, row.h)];
            }));
        } catch { return null; }   // 그림을 읽을 수 없는 환경
    }
    /** 빨강이 더 센 점(별의 테)을 지우고, 그 뒤 초록이 하나도 없는 오른쪽(x ≥ 90) 덩어리(별의 속)를 지운다. 초승달은 초록 계열이라 남는다. @returns {Uint8Array} 지울 점이 1 */
    function starMask(data, w, h) {
        const gone = new Uint8Array(w * h), seen = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] && data[i * 4] > data[i * 4 + 1]) gone[i] = 1;
        const z = { w, h, seen, data, on: i => data[i * 4 + 3] > 0 && !gone[i] };
        for (let i = 0; i < w * h; i++) {
            if (seen[i] || !z.on(i)) continue;
            const blob = starBlob(i, z);
            if (blob.left >= STAR.edge && !blob.green) blob.points.forEach(q => { gone[q] = 1; });
        }
        return gone;
    }
    /** 한 점에서 이어진(여덟 이웃) 덩어리: 점들, 가장 왼쪽 x, 초록 점의 수. */
    function starBlob(start, z) {
        const points = [], stack = [start];
        let left = z.w, green = 0;
        z.seen[start] = 1;
        while (stack.length) {
            const q = stack.pop(), x = q % z.w;
            points.push(q); left = Math.min(left, x);
            if (z.data[q * 4 + 1] > z.data[q * 4] + STAR.green) green++;
            for (const next of starNear(x, (q - x) / z.w, z)) if (!z.seen[next] && z.on(next)) { z.seen[next] = 1; stack.push(next); }
        }
        return { points, left, green };
    }
    function starNear(x, y, z) {
        const out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const u = x + dx, v = y + dy;
            if (u >= 0 && v >= 0 && u < z.w && v < z.h) out.push(v * z.w + u);
        }
        return out;
    }
    /** 클립의 기준점(js/canvas-stage-skill-vfx.js vfxClipBox와 같은 셈). */
    function cutBox(row, clip, f0, f1) {
        if (clip.pivot) return { ax: clip.pivot[0], ay: clip.pivot[1] };
        const boxes = row.fb.slice(f0, f1 + 1).filter(Boolean);
        const b = boxes.length ? [0, 1, 2, 3].map(k => (k < 2 ? Math.min : Math.max)(...boxes.map(q => q[k]))) : [0, 0, row.w, row.h];
        return { ax: { left: b[0], right: b[2] }[clip.an] ?? (b[0] + b[2]) / 2, ay: clip.an === 'bottom' ? b[3] : (b[1] + b[3]) / 2 };
    }
    /** 게임의 띠에서 그 클립의 장들을 한 도트 그대로 찍어 온 사본에서 별 조각을 지운다. 띠가 아직 없으면 null(조금 뒤에 다시). */
    function cutPaint(ref, masks) {
        const clip = stageSkillVfx.clipOf(ref), row = STAGE_SKILL_VFX.atlas[clip.a], [f0, f1] = clip.f || [0, row.n - 1], frames = f1 - f0 + 1;
        const box = cutBox(row, clip, f0, f1), ms = clip.ms || 70, sc = clip.sc || 1, canvas = document.createElement('canvas');
        canvas.width = row.w * frames; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        for (let i = 0; i < frames; i++) stageSkillVfx.stamp(ctx, ref, i * ms, { x: i * row.w - Math.round(-box.ax), y: -Math.round(-box.ay), dot: 1 / sc });
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!pixels.data.some((value, i) => i % 4 === 3 && value > 0)) return null;
        masks.forEach((gone, frame) => cutErase(pixels.data, gone, { left: (frame - f0) * row.w, w: row.w, stride: canvas.width }));
        ctx.putImageData(pixels, 0, 0);
        return { canvas, w: row.w, h: row.h, frames, ms, sc, ax: box.ax, ay: box.ay, tail: clip.fadeOut || 0 };
    }
    function cutErase(data, gone, z) {
        if (z.left < 0 || z.left >= z.stride) return;
        for (let i = 0; i < gone.length; i++) if (gone[i]) data[(Math.floor(i / z.w) * z.stride + z.left + i % z.w) * 4 + 3] = 0;
    }
    /** 별을 지운 베기 자국 하나(play처럼 장을 넘기고 끝에서 옅어진다. 줄인 클립이라 부드럽게 그린다). */
    function cutPlay(strip, at, o) {
        const life = strip.frames * strip.ms;
        stageSkillVfx.paint(at, { life, delay: o.delay }, (ctx, t, dot) => {
            const i = Math.min(strip.frames - 1, Math.floor(t / strip.ms)), size = strip.sc * ISSEN.cutScale * dot;
            ctx.globalAlpha *= ISSEN.cutAlpha * (strip.tail ? clamp((life - t) / strip.tail, 0, 1) : 1);
            if (o.face < 0) ctx.scale(-1, 1);
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(strip.canvas, i * strip.w, 0, strip.w, strip.h, Math.round(-strip.ax * size), Math.round(-strip.ay * size), Math.round(strip.w * size), Math.round(strip.h * size));
        });
    }

    // ---------------------------------------------------------------- 86 공허의 빙의
    const VOID = Object.freeze({ shrink: 320, fade: 100, life: 420, motes: 18, mote: 300, rise: 30, spiritLift: -60, bodyLift: -50, spiritScale: 0.6, spiritAlpha: 0.85, ringScale: 0.8, ringGrow: 0.12 });
    const voidMotes = new WeakMap();              // 사건 → 빨려 드는 조각
    const voidSize = event => ({ A: (event.voidRadius + 0.5) * K.WIDE, B: (event.voidRadius + 0.5) * K.DEEP });
    const voidAlpha = t => (t < VOID.shrink ? 0.8 : Math.max(0, 0.8 - (t - VOID.shrink) / VOID.fade * 0.8));
    function voidMotesOf(event) {
        if (!voidMotes.has(event)) {
            const r = stageSkillStrokes.random(Math.floor(event.voidCenter.gx * K.WIDE + event.voidCenter.gy * K.DEEP) + 4099);
            voidMotes.set(event, Array.from({ length: VOID.motes }, () => ({ a: r() * TAU, k: 0.7 + r() * 0.3, t0: r() * 120 })));
        }
        return voidMotes.get(event);
    }
    /** 바닥: 둘레에서 몸 쪽으로 오그라드는 점선 고리와 옅은 그늘(바닥 층). */
    function voidDots(ctx, p, now, event) {
        const t = now - event.at;
        if (t < 0 || t > VOID.life) return;
        const u = Math.min(1, t / VOID.shrink), size = voidSize(event), A = size.A * (1 - u * 0.8), B = size.B * (1 - u * 0.8), a = voidAlpha(t), ink = inkOf(event.element, 'chaos');
        inDots(ctx, K.screen(p, event.voidCenter), () => {
            ctx.globalAlpha = a * 0.7; ctx.fillStyle = ink.c2;
            for (let i = 0; i < 40; i += 2) { const q = i / 40 * TAU + u * 0.8; ctx.fillRect(Math.round(Math.cos(q) * A), Math.round(Math.sin(q) * B), 2, 1); }
            ctx.globalAlpha = a * 0.18; ctx.fillStyle = ink.c3;
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, A), Math.max(1, B), 0, 0, TAU); ctx.fill();
        });
    }
    /** 둘레의 조각이 몸 쪽으로 빨려 들며 떠오른다. */
    function voidPullMotes(ctx, t, z, ink) {
        for (const m of z.motes) {
            const v = clamp((t - m.t0) / VOID.mote, 0, 1);
            if (v <= 0 || v >= 1) continue;
            const d = (1 - v) * m.k;
            ctx.globalAlpha = 0.85 * (1 - v * 0.5); ctx.fillStyle = v > 0.6 ? ink.c1 : ink.c2;
            ctx.fillRect(Math.round(Math.cos(m.a) * z.A * d), Math.round(Math.sin(m.a) * z.B * d - VOID.rise * v), 2, 2);
        }
    }
    /** 외침: 발밑의 공허 고리 클립(시뮬레이터처럼 몸 높이, 바닥 층), 오그라드는 점선 고리, 빨려 드는 조각. */
    function voidPull(c) {
        const event = c.event, t = c.view.now - event.at, map = c.gem.map;
        if (c.first && map.ring) stageSkillVfx.play(map.ring, K.at(event.voidCenter, 0, standDy(map.ring)), { face: c.look.face, layer: 'ground', scale: VOID.ringScale + event.voidRadius * VOID.ringGrow, ramp: c.look.ramp });
        groundLayer(c, voidDots);
        if (t < 0 || t > VOID.life) return true;
        const ctx = c.view.ctx, size = voidSize(event);
        inDots(ctx, K.screen(c.view.projection, event.voidCenter), () => voidPullMotes(ctx, t, { motes: voidMotesOf(event), A: size.A, B: size.B }, inkOf(c.element, 'chaos')));
        return true;
    }
    /** 공허의 혼: 쓴 사람의 머리 위에서 그 적의 몸까지 사건의 시간 동안 날아간다. */
    function voidSpirit(c) {
        if (!c.first || !c.gem.map.spirit) return true;
        const from = c.event.sourceCell, to = c.event.landingCell, face = Math.sign(to.gx - from.gx) || 1;
        stageSkillVfx.play(c.gem.map.spirit, K.at(from, 0, VOID.spiritLift), { face, scale: VOID.spiritScale, alpha: VOID.spiritAlpha, ramp: c.look.ramp,
            move: { dx: (to.gx - from.gx) * K.WIDE, dy: (to.gy - from.gy) * K.DEEP + VOID.bodyLift - VOID.spiritLift, ms: Math.max(1, c.event.duration) } });
        return true;
    }
    const WEAK = Object.freeze({ fadeIn: 150, fadeOut: 800, head: 104, over: 26, breath: 160, smoke: 6, smokeRise: 78, smokeMs: 900, souls: 3, soulSpin: 3.2 });
    /** 약화된 적마다(살아 있고 아직 풀리지 않은 적만, 프레임마다 id로 찾는다) draw(적, 줄). */
    function weakEach(event, now, draw) {
        for (const row of event.voidTargets || []) {
            const enemy = K.enemy(row.id);
            if (enemy && enemy.hp > 0 && now >= row.appliedAt && now < row.expiresAt) draw(enemy, row);
        }
    }
    const weakAlpha = (row, now) => Math.min(1, (row.expiresAt - now) / WEAK.fadeOut) * Math.min(1, (now - row.appliedAt) / WEAK.fadeIn);
    /** 혼 세 점의 높이(발에서 도트): 시뮬레이터의 104, 그보다 큰 적은 체력 막대 위로(몸 위 26도트). */
    function weakHead(enemy) {
        const size = stageRoster.bodySize(enemy, 64);
        return Math.max(WEAK.head, size ? size.h / stageActors.scaleFor(64) + WEAK.over : 0);
    }
    /** 몸을 타고 오르는 공허 연기, 머리 위를 도는 혼 세 점, 아래로 향한 작은 화살표. */
    function weakMark(ctx, z, ink) {
        const Yh = -z.head, rot = z.t / 1000 * WEAK.soulSpin;
        for (let k = 0; k < WEAK.smoke; k++) {
            const u = (z.t / WEAK.smokeMs + k / WEAK.smoke) % 1;
            ctx.globalAlpha = 0.5 * z.a * Math.sin(u * Math.PI); ctx.fillStyle = k % 2 ? ink.c2 : ink.c3;
            ctx.fillRect(Math.round(Math.sin(u * 9 + k) * 7) - 1, Math.round(-8 - u * WEAK.smokeRise), 3, 4);
        }
        for (let i = 0; i < WEAK.souls; i++) {
            const q = rot + i * 2.094;
            ctx.globalAlpha = (Math.sin(q) > 0 ? 0.95 : 0.55) * z.a; ctx.fillStyle = i ? ink.c2 : ink.c1;
            ctx.fillRect(Math.round(Math.cos(q) * 10) - 2, Math.round(Yh + Math.sin(q) * 4) - 2, 4, 4);
        }
        ctx.globalAlpha = 0.7 * z.a; ctx.fillStyle = ink.c2;
        ctx.fillRect(-2, Yh + 6, 5, 1); ctx.fillRect(-1, Yh + 7, 3, 1); ctx.fillRect(0, Yh + 8, 1, 1);
    }
    /** 바닥: 약화된 적의 발밑에 숨 쉬듯 짙어졌다 옅어지는 보라 그늘(바닥 층). */
    function weakShadows(ctx, p, now, event) {
        const ink = inkOf(event.element, 'chaos');
        weakEach(event, now, (enemy, row) => inDots(ctx, K.screen(p, K.enemySpot(enemy)), () => {
            ctx.globalAlpha = (0.22 + 0.08 * Math.sin((now - row.appliedAt) / WEAK.breath)) * weakAlpha(row, now); ctx.fillStyle = ink.c3;
            ctx.beginPath(); ctx.ellipse(0, 1, 15, 5, 0, 0, TAU); ctx.fill();
        }));
    }
    /** 약화(빙의) 표시의 긴 사건: 끝나기 0.8초 전부터 옅어진다. */
    function voidWeak(c) {
        const ctx = c.view.ctx, p = c.view.projection, now = c.view.now, ink = inkOf(c.element, 'chaos');
        groundLayer(c, weakShadows);
        weakEach(c.event, now, (enemy, row) => inDots(ctx, K.screen(p, K.enemySpot(enemy)), () => weakMark(ctx, { t: now - row.appliedAt, a: weakAlpha(row, now), head: weakHead(enemy) }, ink)));
        return true;
    }

    return Object.freeze({ frozenOrb, orbit, zap, rift, collapse, issenLine, issenCut, voidPull, voidSpirit, voidWeak });
})();
safeExposeGlobals({ stageRunesV313A });
