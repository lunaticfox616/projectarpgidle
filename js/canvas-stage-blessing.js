/** 사역룬 가호의 발밑 (2026-10-24 사용자가 준 스킬룬 추가본 v54: "각각 가호를 받는 동안 플레이어 캐릭터의 바닥에 해당 룬문자를 띄워주는 형태로",
 * "바닥의 룬마법진이 회전하게 해주세요 그리고 중앙에 룬이 아닌 4방향에 같은 룬을 배치해주세요", 03:12 글자 각도, 03:20~04:05 결정진 모양과 색).
 * 소환 칸의 가호가 걸려 있는 동안 주인공 발밑에:
 * - 옅은 바닥 빛(타원)과 그 속성의 결정진 클립(data/stage-skill-vfx.js bless.floors, 바닥에 눕혀 한 바퀴 약 6초로 돈다. 수액의 나무는 돌지 않는다)
 * - 결정진 둘레 네 방향에 같은 룬 글자(5×7 격자의 획). 글자 위쪽이 바깥을 향하게 바닥 평면에서 돌린 뒤 눕힌다: 앞쪽 글자는 바로 서고 양옆은 눕는다.
 *   결정진과 같은 빠르기로 돌고, 앞쪽(아래)에 올수록 또렷하다.
 * 가호가 걸리는 순간(끼거나 다시 살아났을 때) 0.36초 몸 테두리에 속성 색이 돌고(js/canvas-stage-actors.js drawAura) 발밑에 빛 조각 10개가 튄다.
 * 가호가 풀리면 0.13초에 걷힌다. 그림(구매 팩)이 없는 판이나 무대 이펙트를 끈 창에서는 그리지 않는다. 표시만 한다: 가호의 수치는
 * js/combat-support-runes.js, 어느 가호가 걸렸는지도 그쪽이 답한다(activeBlessing).
 */
const stageBlessing = (() => {
    const RING = Object.freeze({ rx: 46, ry: 23, glow: [42, 21], lift: 2 });   // 룬 글자가 도는 타원과 바닥 빛(도트), 발에서 아래로
    const GLYPH = 4.2;                            // 룬 글자 격자 한 칸(바닥 평면의 도트)
    const FADE_IN = 240, FADE_OUT = 130, AURA_MS = 360, SPARK_MS = 380;
    let current = null;                           // { name, element, rune, from, sparks } 걸린 가호
    let leaving = null;                           // 풀리는 중인 가호 { ...current, until }

    const looks = () => STAGE_SKILL_VFX.bless || null;
    function blessingLook(name) {
        const id = stageSkillKit.gemId(name), meta = id ? STAGE_SKILL_VFX.meta[id] : null;
        if (!meta || !meta.rune || !looks()) return null;
        const element = meta.el, colours = looks().colours[element] || STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements.phys;
        return { element, rune: meta.rune, colours, floor: looks().floors[element] || null };
    }
    /** 지금 걸린 가호의 이름(주인공이 쓰러져 있으면 없음). */
    function activeName() {
        if (!(game.playerHp > 0)) return null;
        const supports = window.GameModules && window.GameModules.combat && window.GameModules.combat.supports;
        return supports && supports.activeBlessing ? supports.activeBlessing(game) : null;
    }
    function sparksFor(now) {
        return Array.from({ length: 10 }, () => ({ x: Math.random() * 60 - 30, y: -4 - Math.random() * 20, at: now - Math.random() * 120 }));
    }
    /** 프레임마다: 걸린 가호가 바뀌었으면 새로 받고, 풀렸으면 걷기 시작한다. */
    function blessingFrame(now) {
        const name = activeName();
        if ((current && current.name) === name) return;
        if (current) leaving = { ...current, until: now + FADE_OUT };
        const look = name ? blessingLook(name) : null;
        current = look ? { name, ...look, from: now, sparks: sparksFor(now) } : null;
    }
    /** 받는 순간의 몸 테두리 색(없으면 null): 0.12초마다 밝은색과 중간색이 번갈아. */
    function blessingAura() {
        const age = current ? stageSkillVfx.now() - current.from : -1;
        if (!current || age < 0 || age >= AURA_MS) return null;
        return Math.floor(age / 120) % 2 ? current.colours.c1 : current.colours.c2;
    }
    /** 정수 격자의 선분(브레젠험): put(x, y). */
    function blessLine(x0, y0, x1, y1, put) {
        let x = x0, y = y0;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        for (let error = dx + dy; ; ) {
            put(x, y);
            if (x === x1 && y === y1) return;
            const twice = 2 * error;
            if (twice >= dy) { error += dy; x += sx; }
            if (twice <= dx) { error += dx; y += sy; }
        }
    }
    /** 룬 글자 하나(glyph: strokes 획, cx, cy 자리, phi 바닥 평면에서 돌리는 각, colour 심, dark 테): 격자 → 평면에서 돌림 → 세로 ½로 눕힘.
     * 어두운 테를 먼저, 밝은 심을 위에. */
    function blessGlyph(ctx, glyph, dot) {
        const c = Math.cos(glyph.phi), s = Math.sin(glyph.phi);
        const pt = (gx, gy) => { const x = (gx - 2) * GLYPH, y = (gy - 3) * GLYPH; return [Math.round(glyph.cx + x * c - y * s), Math.round(glyph.cy + (x * s + y * c) * 0.5)]; };
        const pass = (fill, put) => { ctx.fillStyle = fill; for (const [x0, y0, x1, y1] of glyph.strokes) { const [ax, ay] = pt(x0, y0), [bx, by] = pt(x1, y1); blessLine(ax, ay, bx, by, put); } };
        pass(glyph.dark, (x, y) => ctx.fillRect((x - 1) * dot, (y - 1) * dot, 4 * dot, 3 * dot));
        pass(glyph.colour, (x, y) => ctx.fillRect(x * dot, y * dot, 2 * dot, dot));
    }
    /** 결정진 클립: 바닥에 눕혀(클립의 flat) 그 평면에서 돌린다. */
    function blessFloor(ctx, look, age, alpha, dot) {
        const floor = look.floor;
        if (!floor) return;
        const clip = stageSkillVfx.clipOf(floor.floor), spin = floor.spin === undefined ? looks().spin : floor.spin;
        stageSkillVfx.stamp(ctx, floor.floor, age, { x: 0, y: RING.lift * dot, dot, scale: floor.scale || 1, smooth: (floor.scale || 1) < 1,
            flat: clip ? clip.flat : 0.5, turn: spin * age / 1000, alpha: alpha * (floor.alpha === undefined ? 0.85 : floor.alpha) });
    }
    function blessSparks(ctx, look, now, dot) {
        ctx.fillStyle = look.colours.c1;
        for (const spark of look.sparks) {
            const t = now - spark.at;
            if (t < 0 || t >= SPARK_MS) continue;
            ctx.globalAlpha = 1 - t / SPARK_MS;
            ctx.fillRect(Math.round(spark.x) * dot, Math.round(spark.y - t / 40) * dot, dot, dot);
        }
    }
    function blessDraw(ctx, look, now, fade, dot) {
        const age = now - look.from, al = Math.min(1, age / FADE_IN) * fade, pulse = 0.5 + 0.5 * Math.sin(age / 260);
        const base = ctx.globalAlpha, strokes = looks().runes[look.rune];
        ctx.globalAlpha = base * 0.26 * al;
        ctx.fillStyle = look.colours.c3;
        ctx.beginPath();
        ctx.ellipse(0, RING.lift * dot, RING.glow[0] * dot, RING.glow[1] * dot, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = base;
        blessFloor(ctx, look, age, al, dot);
        for (let k = 0; strokes && k < 4; k++) {
            const th = age / 1000 * looks().spin + k * Math.PI / 2 - Math.PI / 2;
            const depth = 0.75 + 0.25 * (Math.sin(th) + 1) / 2;
            ctx.globalAlpha = base * (0.7 + 0.3 * pulse) * al * depth;
            blessGlyph(ctx, { strokes, cx: Math.round(Math.cos(th) * RING.rx), cy: Math.round(Math.sin(th) * RING.ry) + RING.lift, phi: th + Math.PI / 2,
                colour: pulse > 0.5 ? look.colours.c1 : look.colours.c2, dark: look.colours.c3 }, dot);
        }
        ctx.globalAlpha = base;
        if (fade === 1) blessSparks(ctx, look, now, dot);
        ctx.globalAlpha = base;
    }
    /** 바닥 층(캐릭터 아래)에 그린다. p: 무대의 투영. */
    function blessingDraw(ctx, p) {
        if (!p || !stageSkillVfx.ready() || (!current && !leaving)) return;
        const now = stageSkillVfx.now(), spot = stageSkillKit.heroDrawn(), foot = p.cellToScreen(spot.gx, spot.gy), dot = stageActors.scaleFor(p.tileW);
        if (leaving && now >= leaving.until) leaving = null;
        ctx.save();
        ctx.translate(Math.round(foot.x), Math.round(foot.y + (p.actorGroundOffsetY || 0)));
        if (leaving) blessDraw(ctx, leaving, now, Math.max(0, (leaving.until - now) / FADE_OUT), dot);
        if (current) blessDraw(ctx, current, now, 1, dot);
        ctx.restore();
    }
    /** 낀 룬 가운데 가호가 쓰는 결정진 클립(띠를 미리 만들어 둔다: js/canvas-stage-warmup.js). */
    function blessingClips(names) {
        return names.map(blessingLook).filter(look => look && look.floor).map(look => look.floor.floor);
    }
    return Object.freeze({ frame: blessingFrame, draw: blessingDraw, aura: blessingAura, clipsOf: blessingClips });
})();
safeExposeGlobals({ stageBlessing });
