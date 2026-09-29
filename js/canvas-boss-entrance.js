// 보스 입장 연출: 플레이어가 보스방 관문에 이르면(js/act-exploration-state.js bossAwake) 주변이 어두워지고,
// 보스 자리의 균열이 빛나며 빛기둥 속에서 보스가 떠오른다. 섬광·충격파와 함께 이름이 뜨고, 어둠이 걷히며 전투가 시작된다.
// 그림만 그린다: 입장 동안 보스가 싸우지 않는 것과 그 길이는 탐험 진행(bossEntrance 효과의 holdMs)이 정한다.
const bossEntranceView = (() => {
    const RISE_AT = 700;    // 균열이 먼저 빛나고
    const RISE_MS = 900;    // 보스가 빛기둥 속에서 떠오르고
    const BURST_AT = 1550;  // 섬광·충격파와 함께 이름이 뜬다
    const BOSS_TILES = 2.6; // 보스 그림 높이(칸): 이름 띠가 떠오른 보스를 가리지 않게 피할 범위
    let spot = null;        // 입장 중인 보스가 선 화면 자리 { id, top, feet }

    function active(now) {
        let found = null;
        for (const fx of battleFx) if (fx && fx.type === 'bossEntrance' && now >= fx.start && now - fx.start <= fx.duration) found = fx;
        return found;
    }
    function bossOf(fx) { return fx.enemies.find(enemy => enemy.isBoss) || fx.enemies[0] || null; }
    function ease(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }

    /** 0 → 1 while an entering enemy rises (alpha, lift and scale follow it); null when it is not entering. */
    function enemyAge(enemy, now) {
        const fx = active(now);
        if (!fx || !fx.enemyIds.includes(enemy.id)) return null;
        return Math.max(0, Math.min(1, (now - fx.start - RISE_AT) / RISE_MS));
    }
    /** The boss whose name banner already shows (from the burst on), before it has joined the fight. */
    function revealedBoss(now) {
        const fx = active(now);
        return fx && now - fx.start >= BURST_AT ? bossOf(fx) : null;
    }
    /** Camera shake amplitude (CSS px): a low rumble while it rises, a jolt at the burst. */
    function shake(now) {
        const fx = active(now);
        if (!fx) return 0;
        const t = now - fx.start;
        if (t < BURST_AT) return 0.5 + t / BURST_AT * 1.5;
        return Math.max(0, 7 * (1 - (t - BURST_AT) / 420));
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
        const hold = fx.holdMs || 2600, dim = t < hold ? ease(t / 350) : Math.max(0, 1 - (t - hold) / 500);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = dim * 0.5;
        ctx.fillStyle = '#040302';
        ctx.fillRect(-4000, -4000, 8000, 8000);
        wakingRing(ctx, at, { t, dot, color });
        if (t >= RISE_AT - 200) pillar(ctx, at, { t, dot, color });
        if (t >= BURST_AT) burst(ctx, at, { t: t - BURST_AT, dot, color, seed: boss.id });
        ctx.restore();
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
        ctx.fillStyle = '#ffffff';
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
        const feet = battleVisualState.playerPos, head = hanaActors.headY(now);
        return feet ? [head === null ? feet.y - 96 : head - 16, feet.y + 8] : null;
    }

    /** Over everything, in screen space: the flash of the burst. area = { width, height, now }. */
    function drawScreen(ctx, area) {
        const fx = active(area.now), t = fx ? area.now - fx.start : -1;
        if (t < BURST_AT || t >= BURST_AT + 240) return;
        ctx.save();
        ctx.globalAlpha = 0.38 * (1 - (t - BURST_AT) / 240);
        ctx.fillStyle = '#fff6e6';
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.restore();
    }

    return { enemyAge, revealedBoss, shake, drawGround, drawScreen, bannerY };
})();
safeExposeGlobals({ bossEntranceView });
