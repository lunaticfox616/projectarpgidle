// 보스 입장 연출: 플레이어가 보스방 관문에 이르면(js/act-exploration-state.js bossAwake) 주변이 어두워지고,
// 보스 자리의 균열이 빛나며 빛기둥 속에서 보스가 떠오른다. 섬광·충격파와 함께 이름이 뜨고, 어둠이 걷히며 전투가 시작된다.
// 그림만 그린다: 입장 동안 보스가 싸우지 않는 것과 그 길이는 탐험 진행(bossEntrance 효과의 holdMs)이 정한다.
// 옆에서 보는 무대의 입장은 다르다 (2026-10-14 사용자: "보스 몬스터 등장할때 연출이 너무 구림. 어울리게 개선"): 빛기둥 속에서 그림을
// 46%에서 키우며 띄우면 도트 그림이 뭉개지고 무대와 따로 놀았다. 무대에서는 보스가 제 크기 그대로 어둠 속의 검은 형체로 서 있다가
// (stageLook의 shade), 속성 색 테가 차오르고(rim), 한 번 하얗게 번쩍이며(flash) 제 모습을 드러낸다. 발밑에는 빛이 고이고, 드러나는
// 순간 먼지가 바닥을 따라 퍼진다. 때는 입장 길이(holdMs: 처음 2.6초, 다시 만나면 1.2초)의 몫이라 짧은 입장도 같은 차례로 흐른다.
const bossEntranceView = (() => {
    const RISE_AT = 700;    // 균열이 먼저 빛나고
    const RISE_MS = 900;    // 보스가 빛기둥 속에서 떠오르고
    const BURST_AT = 1550;  // 섬광·충격파와 함께 이름이 뜬다
    const BOSS_TILES = 2.6; // 보스 그림 높이(칸): 이름 띠가 떠오른 보스를 가리지 않게 피할 범위
    /** 무대의 입장: fadeIn, rimFrom, burstAt은 입장 길이의 몫(형체가 다 보이는 때, 테가 차오르기 시작하는 때, 드러나는 때).
     * flashMs 드러나며 하얗게 번쩍이는 시간, dim 방이 어두워지는 정도, light 발밑에 고이는 빛의 반지름(도트)과 세기. */
    const STAGE = Object.freeze({ fadeIn: 0.1, rimFrom: 0.14, burstAt: 0.5, flashMs: 340, dim: 0.6, light: Object.freeze({ dots: 120, alpha: 0.5 }) });
    let spot = null;        // 입장 중인 보스가 선 화면 자리 { id, top, feet }

    function active(now) {
        let found = null;
        for (const fx of battleFx) if (fx && fx.type === 'bossEntrance' && now >= fx.start && now - fx.start <= fx.duration) found = fx;
        return found;
    }
    function bossOf(fx) { return fx.enemies.find(enemy => enemy.isBoss) || fx.enemies[0] || null; }
    function ease(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
    const share = (value, from, until) => Math.max(0, Math.min(1, (value - from) / (until - from)));
    const onStage = () => typeof stageView === 'object' && stageView.enabled();
    const holdOf = fx => fx.holdMs || 2600;
    /** 섬광과 함께 이름이 뜨는 때(입장이 시작된 뒤 ms). */
    const burstOf = fx => (onStage() ? holdOf(fx) * STAGE.burstAt : BURST_AT);

    /** 무대에서 입장 중인 적의 모습: alpha 보이는 정도, shade 검은 형체인 정도, rim 속성 색 테의 세기, flash 하얗게 번쩍이는 정도.
     * 무대가 아니거나 입장 중이 아니면 null(그리는 쪽은 평소대로 그린다). 그림의 크기와 자리는 바꾸지 않는다. */
    function stageLook(enemy, now) {
        const fx = onStage() ? active(now) : null;
        if (!fx || !fx.enemyIds.includes(enemy.id)) return null;
        const hold = holdOf(fx), t = now - fx.start, burst = burstOf(fx), color = getElementColor(enemy.ele) || '#9ed6ff';
        if (t >= burst) return { alpha: 1, shade: 0, rim: 0, flash: 1 - share(t, burst, burst + STAGE.flashMs), color };
        return { alpha: ease(t / (hold * STAGE.fadeIn)), shade: 1, rim: share(t, hold * STAGE.rimFrom, burst), flash: 0, color };
    }

    /** 0 → 1 while an entering enemy rises (alpha, lift and scale follow it); null when it is not entering. */
    function enemyAge(enemy, now) {
        const fx = active(now);
        if (!fx || !fx.enemyIds.includes(enemy.id)) return null;
        return Math.max(0, Math.min(1, (now - fx.start - RISE_AT) / RISE_MS));
    }
    /** The boss whose name banner already shows (from the burst on), before it has joined the fight. */
    function revealedBoss(now) {
        const fx = active(now);
        return fx && now - fx.start >= burstOf(fx) ? bossOf(fx) : null;
    }
    /** Camera shake amplitude (CSS px): a low rumble while it rises, a jolt at the burst. */
    function shake(now) {
        const fx = active(now);
        if (!fx) return 0;
        const t = now - fx.start, burst = burstOf(fx);
        if (t < burst) return 0.5 + t / burst * 1.5;
        return Math.max(0, 7 * (1 - (t - burst) / 420));
    }

    /** Under the actors: the room dims (the rising boss and the player stay lit above it), the waking rift ring,
     * the light pillar the boss rises in, the burst ring and flying debris. */
    function drawGround(ctx, state) {
        const fx = active(state.now), boss = fx && bossOf(fx);
        if (!boss) return;
        const at = getBattleLayout([boss], 0, 0, state.gridProj)[0];
        if (!at) return;
        const t = state.now - fx.start, dot = Math.max(2, state.gridProj.tileW / 16), color = getElementColor(boss.ele) || '#9ed6ff';
        spot = { id: boss.id, top: at.y - state.gridProj.tileW * BOSS_TILES, feet: at.y };
        const hold = holdOf(fx), dim = t < hold ? ease(t / 350) : Math.max(0, 1 - (t - hold) / 500);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = dim * (onStage() ? STAGE.dim : 0.5);
        ctx.fillStyle = '#040302';
        ctx.fillRect(-4000, -4000, 8000, 8000);
        if (onStage()) stageGround(ctx, at, { t, hold, dim, dot: state.gridProj.tileW / 64, color, seed: boss.id });
        else {
            wakingRing(ctx, at, { t, dot, color });
            if (t >= RISE_AT - 200) pillar(ctx, at, { t, dot, color });
            if (t >= BURST_AT) burst(ctx, at, { t: t - BURST_AT, dot, color, seed: boss.id });
        }
        ctx.restore();
    }
    /** 무대의 바닥: 테가 차오르는 만큼 발밑에 속성 색 빛이 고이고 그 위로 빛 알갱이가 오른다. 드러나는 순간 먼지가 좌우로 퍼진다.
     * o.dot: 무대 그림의 도트 하나(화면 px). */
    function stageGround(ctx, at, o) {
        const burst = o.hold * STAGE.burstAt, lit = o.t < burst ? share(o.t, o.hold * STAGE.rimFrom, burst) : 1;
        floorLight(ctx, at, { dot: o.dot, color: o.color, strength: lit * o.dim });
        if (o.t < burst) motes(ctx, at, { t: o.t, dot: Math.max(1, Math.round(o.dot * 2)), mote: o.color }, o.dot * 26, lit);
        else floorDust(ctx, at, { t: o.t - burst, dot: Math.max(1, Math.round(o.dot * 2)), seed: o.seed });
    }
    /** 발밑에 고인 빛: 바닥에 누운 둥근 빛을 더해 그린다(어두워진 방에서 보스가 선 자리만 밝다). */
    function floorLight(ctx, at, o) {
        if (!(o.strength > 0)) return;
        const rx = o.dot * STAGE.light.dots, glow = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        glow.addColorStop(0, o.color);
        glow.addColorStop(1, '#000000');
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.scale(1, 0.3);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = STAGE.light.alpha * o.strength;
        ctx.fillStyle = glow;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
    }
    /** 드러나는 순간의 먼지: 발밑에서 좌우로 바닥을 따라 퍼지며 조금 떠올랐다 가라앉는 네모 도트들. */
    function floorDust(ctx, at, o) {
        if (o.t > 760) return;
        const k = o.t / 760, out = ease(k);
        ctx.fillStyle = '#9a8a78';
        for (let i = 0; i < 22; i++) {
            const side = i % 2 ? 1 : -1, far = 6 + ((i * 7 + o.seed) % 11) * 4.2, lift = Math.sin(k * Math.PI) * (2 + (i % 4) * 2.5);
            ctx.globalAlpha = (1 - k) * (0.5 + (i % 3) * 0.2);
            const size = o.dot * (i % 3 === 0 ? 2 : 1);
            ctx.fillRect(Math.round(at.x + side * out * far * o.dot), Math.round(at.y - lift * o.dot - (i % 5) * o.dot), size, size);
        }
    }
    function wakingRing(ctx, at, o) {
        const grow = ease(o.t / RISE_AT), fade = o.t < BURST_AT ? 1 : Math.max(0, 1 - (o.t - BURST_AT) / 500);
        const r = o.dot * (6 + grow * 10) + Math.sin(o.t / 90) * o.dot * 0.6;
        ctx.globalAlpha = 0.75 * fade;
        ctx.fillStyle = o.color;
        pixelEllipse(ctx, at, { rx: r, ry: r * 0.42, dot: o.dot });
        ctx.globalAlpha = 0.18 * fade;
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, r, r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    function pillar(ctx, at, o) {
        const open = ease((o.t - (RISE_AT - 200)) / 400), fade = o.t < BURST_AT ? 1 : Math.max(0, 1 - (o.t - BURST_AT) / 260);
        const half = Math.round(o.dot * 7 * open), top = at.y - o.dot * 90;
        ctx.globalCompositeOperation = 'lighter';
        for (let band = 0; band < 3; band++) {
            const w = half - band * Math.round(o.dot * 2);
            if (w <= 0) continue;
            ctx.globalAlpha = (0.16 + band * 0.12) * fade;
            ctx.fillStyle = band === 2 ? '#ffffff' : o.color;
            ctx.fillRect(Math.round(at.x - w), top, w * 2, at.y - top);
        }
        ctx.globalCompositeOperation = 'source-over';
        motes(ctx, at, o, half, fade);
    }
    /** Square motes drifting up the pillar (one dot each), fixed per index so they read as a stream. */
    function motes(ctx, at, o, half, fade) {
        ctx.fillStyle = o.mote || '#ffffff';
        for (let i = 0; i < 10; i++) {
            const rise = ((o.t * 0.12 + i * 37) % 120) / 120, x = at.x + Math.sin(i * 2.1) * half * 0.8;
            ctx.globalAlpha = fade * (1 - rise) * 0.8;
            ctx.fillRect(Math.round(x), Math.round(at.y - rise * o.dot * 60), o.dot, o.dot);
        }
    }
    function burst(ctx, at, o) {
        if (o.t > 700) return;
        const k = o.t / 700;
        ctx.strokeStyle = o.color;
        for (const [delay, reach] of [[0, 26], [90, 18]]) {
            const p = Math.max(0, Math.min(1, (o.t - delay) / 420));
            if (p <= 0 || p >= 1) continue;
            ctx.globalAlpha = 1 - p;
            ctx.lineWidth = o.dot;
            ctx.beginPath();
            ctx.ellipse(at.x, at.y, o.dot * (4 + p * reach), o.dot * (4 + p * reach) * 0.42, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = '#2a211a';
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2 + (o.seed % 7) * 0.3, d = o.dot * (3 + ease(k) * (9 + (i % 3) * 4));
            ctx.globalAlpha = 1 - k;
            ctx.fillRect(Math.round(at.x + Math.cos(a) * d), Math.round(at.y + Math.sin(a) * d * 0.5 - Math.sin(k * Math.PI) * o.dot * 4), o.dot, o.dot);
        }
    }
    /** An ellipse outline of square dots (no anti-aliased stroke) around at = { x, y }. */
    function pixelEllipse(ctx, at, o) {
        const steps = Math.max(16, Math.round((o.rx + o.ry) / o.dot * 2));
        for (let s = 0; s < steps; s++) {
            const a = s / steps * Math.PI * 2;
            ctx.fillRect(Math.round((at.x + Math.cos(a) * o.rx) / o.dot) * o.dot, Math.round((at.y + Math.sin(a) * o.ry) / o.dot) * o.dot, o.dot, o.dot);
        }
    }

    /** Centre line for the boss name band (band = { up, down } px around it) that keeps the rising boss and the hero in
     * view: the usual spot when it is clear, else below both (the top holds the HUD and the minimap), else above both.
     * null when this boss is not entering. */
    function bannerY(area, boss, band) {
        if (!spot || !boss || spot.id !== boss.id) return null;
        const spans = [[spot.top, spot.feet + 8], heroSpan(area.now)].filter(Boolean);
        const clear = y => spans.every(([top, bottom]) => y + band.down < top || y - band.up > bottom);
        const usual = Math.round(area.height * 0.3), below = Math.max(...spans.map(s => s[1])) + band.up + 8;
        const above = Math.min(...spans.map(s => s[0])) - band.down - 8;
        if (clear(usual)) return usual;
        if (below + band.down <= area.height * 0.86) return Math.round(below);
        return above - band.up >= area.height * 0.12 ? Math.round(above) : usual;
    }
    /** The hero's drawn span on screen: overhead bar to feet. */
    function heroSpan(now) {
        const feet = battleVisualState.playerPos, head = getHeroHeadY(now);
        return feet ? [head === null ? feet.y - 96 : head - 16, feet.y + 8] : null;
    }

    /** Over everything, in screen space: the flash of the burst. area = { width, height, now }. */
    function drawScreen(ctx, area) {
        const fx = active(area.now), burst = fx ? burstOf(fx) : 0, t = fx ? area.now - fx.start : -1;
        if (t < burst || t >= burst + 240) return;
        ctx.save();
        ctx.globalAlpha = (onStage() ? 0.24 : 0.38) * (1 - (t - burst) / 240);
        ctx.fillStyle = '#fff6e6';
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.restore();
    }

    return { enemyAge, stageLook, revealedBoss, shake, drawGround, drawScreen, bannerY };
})();
safeExposeGlobals({ bossEntranceView });
