/** Eight small static sprites; no additional particles, filters or animation timers. A boss shot (fx.screenShotScale, set by
 * prepareBossShot in js/canvas-battlefield.js) is drawn larger with two fading copies behind it, one shot at a time. */
const enemyProjectileSprites = (() => {
    const sizes = [48,42,48,44,36,34,48,36];
    function variant(fx) {
        if (fx.enemyFlight?.source.monsterArchetype === 'wisp') return 7;
        const alternate = Math.abs(Number(fx.sourceId) || 0)%2;
        const element = normalizeSkillGemVfxElement(fx.element);
        if (element === 'chaos') return alternate ? 5 : 4;
        return {fire:1,cold:2,light:3,blood:6}[element] ?? (alternate ? 6 : 0);
    }

    /** Returns false while the existing asset loader is still loading the atlas. */
    function draw(ctx, fx, source, targets, progress) {
        if (fx.owner !== 'enemy') return false;
        const image = getSkillGemVfxImage('skillFxEnemyProjectiles');
        if (!image) return false;
        const index = variant(fx), width = sizes[index]*(fx.screenShotScale || 1), height = width/2;
        const copies = fx.screenShotScale ? [[.14,.28],[.07,.5],[0,.94]] : [[0,.94]];
        for (const target of targets) {
            for (const [lag, alpha] of copies) {
                const at = Math.max(0, progress-lag);
                ctx.save();
                ctx.translate(source.x+(target.x-source.x)*at,source.y+(target.y-source.y)*at);
                ctx.rotate(Math.atan2(target.y-source.y,target.x-source.x));
                ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.globalAlpha = alpha;
                ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
                ctx.drawImage(image,(index%2)*64,Math.floor(index/2)*32,64,32,-width/2,-height/2,width,height);
                ctx.restore();
            }
        }
        return true;
    }
    /** Only authored normal bombardments move to the floor; legacy spells and boss effects retain their layers. */
    const isGround = fx => fx.enemyFlight?.groundCell === true;
    function groundArea(fx) {
        if (!isGround(fx)) return fx.attackFootprint;
        const cell = fx.enemyFlight.targetCell;
        return { cells: [cell], center: cell };
    }
    /** A normal bombardment charges only its actual cell. Fixed danger edges stay readable on brown floors;
     * the centre fills to those edges at arrival, without another ring, particle or clock. */
    function drawGround(ctx, fx, footprint, view) {
        const share = clampNumber((view.now - fx.start) / Math.max(1, view.arriveAt - fx.start), 0, 1);
        const fade = clampNumber((fx.start + fx.duration - view.now) / 180, 0, 1);
        const { x, y, width, height } = footprint;
        const edge = Math.min(2, width / 8, height / 6), inset = edge / 2;
        const left = x - width / 2 + inset, top = y - height / 2 + inset;
        const right = x + width / 2 - inset, bottom = y + height / 2 - inset;
        ctx.save();
        clipSkillFootprintTerrain(ctx, footprint);
        clipSkillFootprint(ctx, footprint);
        ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff684f'; ctx.globalAlpha = 0.12 * fade;
        ctx.fillRect(x - width / 2, y - height / 2, width, height);
        ctx.globalAlpha = (0.18 + share * 0.14) * fade;
        ctx.fillRect(x - width * share / 2, y - height * share / 2, width * share, height * share);
        ctx.globalAlpha = 0.8 * fade; ctx.strokeStyle = '#29110f'; ctx.lineWidth = edge * 2.5;
        ctx.strokeRect(left, top, right - left, bottom - top);
        ctx.globalAlpha = 0.95 * fade; ctx.strokeStyle = '#ff684f'; ctx.lineWidth = edge;
        ctx.strokeRect(left, top, right - left, bottom - top);
        ctx.globalAlpha = (0.7 + share * 0.3) * fade; ctx.strokeStyle = '#ffe2c4';
        ctx.beginPath();
        for (const [cx, cy, dx, dy] of [[left, top, 1, 1], [right, top, -1, 1],
            [right, bottom, -1, -1], [left, bottom, 1, -1]]) {
            ctx.moveTo(cx + dx * width * 0.16, cy); ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * height * 0.24);
        }
        ctx.stroke();
        ctx.restore();
    }
    return {draw,isGround,groundArea,drawGround};
})();
safeExposeGlobals({enemyProjectileSprites});
