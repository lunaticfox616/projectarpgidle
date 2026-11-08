// 기습 정예의 순간이동(js/enemy-ambush.js, battleFx 'ambushBlink'): 떠난 자리에 사라짐, 닿은 자리에 나타남 효과를 그리고(Codex 그림
// assets/stage-vfx/ambush, 192칸 6장, 발 자리 96, 168, 투명도 두 단계에 30색 안팎), 그사이 몸을 숨겼다가 나타남 효과와 함께 드러낸다. 칸은 이미 옮겨져 있다.
const enemyAmbushView = (() => {
    const RULE = ELITE_AMBUSH, CELL = 192, FRAMES = 6, FEET = Object.freeze([96, 168]), FX_SCALE = 1.2;
    const sheets = new Map();
    /** 효과 그림(처음 부를 때 불러 둔다). 다 불러오기 전에는 null이라 그 프레임은 건너뛴다. */
    function sheet(name) {
        if (!sheets.has(name)) { const img = new Image(); img.src = `assets/stage-vfx/ambush/${name}.png?v=20261108-2`; sheets.set(name, img); }
        const img = sheets.get(name);
        return img.complete && img.naturalWidth ? img : null;
    }
    /** 이 몬스터의 가장 최근 순간이동 효과, 없으면 null(기습 외형이 아니면 찾지도 않는다). */
    function blinkOf(enemy) {
        if (!enemyAmbush.eligible(enemy)) return null;
        for (let i = battleFx.length - 1; i >= 0; i--) {
            const fx = battleFx[i];
            if (fx && fx.type === 'ambushBlink' && fx.enemyId === enemy.id) return fx;
        }
        return null;
    }
    /** 몸의 불투명도(0~1): 사라짐 효과가 시작되면 숨고, 나타남 효과 동안 드러난다. */
    function alphaOf(enemy, now) {
        const fx = blinkOf(enemy);
        if (!fx || now < fx.start) return 1;
        const shown = now - fx.start - RULE.vanishMs - RULE.hiddenMs;
        return clampNumber(shown / RULE.appearMs, 0, 1);
    }
    function feetOf(cell, footprint, gridProj) {
        return gridProj.cellToScreen(cell.gx + (footprint.columns - 1) / 2, cell.gy + (footprint.rows - 1) / 2);
    }
    function drawSheet(ctx, name, at, frame, dot) {
        const img = sheet(name);
        if (!img) return;
        const size = Math.round(CELL * dot);
        ctx.drawImage(img, frame * CELL, 0, CELL, CELL, Math.round(at.x - FEET[0] * dot), Math.round(at.y - FEET[1] * dot), size, size);
    }
    /** 사라짐(떠난 자리)과 나타남(닿은 자리) 효과 한 프레임. */
    function draw(ctx, fx, now, gridProj) {
        if (!gridProj || !fx.from || !fx.to) return;
        const footprint = fx.footprint || { columns: 1, rows: 1 }, dot = stageActors.scaleFor(gridProj.tileW) * FX_SCALE;
        const t = now - fx.start, appearAt = RULE.vanishMs + RULE.hiddenMs;
        const frameAt = (age, span) => Math.min(FRAMES - 1, Math.floor(age / span * FRAMES));
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (t < RULE.vanishMs) drawSheet(ctx, 'vanish', feetOf(fx.from, footprint, gridProj), frameAt(t, RULE.vanishMs), dot);
        if (t >= appearAt && t < appearAt + RULE.appearMs) drawSheet(ctx, 'appear', feetOf(fx.to, footprint, gridProj), frameAt(t - appearAt, RULE.appearMs), dot);
        ctx.restore();
    }
    return Object.freeze({ alphaOf, draw });
})();
safeExposeGlobals({ enemyAmbushView });
