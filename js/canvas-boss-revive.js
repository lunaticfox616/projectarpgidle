/** A boss the story raises again where it fell (data/stage-view.js STAGE_BOSS_REVIVAL; act 2's deaconess, whose fall line says the
 * golden sap stands her up again, docs/story-bible.md section 9): while that line is told, a pillar of golden sap pours down on the
 * spot and the boss's life bar fills again at the top of the battlefield. Effects and a bar only: the boss's picture is gone with
 * its death and nothing is made to move (no code-made motion). Drawn by js/canvas-act-title-card.js under the line's text.
 */
const bossRevive = (() => {
    const GOLD = '#f0cd73', FADE_MS = 450, MOTES = 16;
    /** info: { gx, gy, name } where the boss fell; age and showMs: the line's time on screen (ms). */
    function draw(ctx, scene, info, age, showMs) {
        const fade = Math.max(0, Math.min(1, age / FADE_MS, (showMs - age) / FADE_MS));
        if (!fade || !scene.projection) return;
        const ground = scene.projection.cellToScreen(info.gx, info.gy);
        ctx.save();
        ctx.globalAlpha = fade;
        pillar(ctx, { x: ground.x, y: ground.y + (scene.projection.actorGroundOffsetY || 0) }, scene.tileW || 64, age);
        lifeBar(ctx, scene.width, info.name, Math.min(1, age / STAGE_BOSS_REVIVAL.fillMs));
        ctx.restore();
    }
    /** The sap pours from the top of the view to the floor: a soft wide glow, a bright core and motes rising along it. */
    function pillar(ctx, ground, tile, age) {
        const half = tile * 1.15, pulse = 0.82 + 0.18 * Math.sin(age / 140);
        ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createLinearGradient(ground.x - half, 0, ground.x + half, 0);
        glow.addColorStop(0, 'rgba(240,205,115,0)');
        glow.addColorStop(0.5, `rgba(240,205,115,${0.62 * pulse})`);
        glow.addColorStop(1, 'rgba(240,205,115,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(ground.x - half, 0, half * 2, ground.y);
        ctx.fillStyle = `rgba(255,240,196,${0.7 * pulse})`;
        ctx.fillRect(Math.round(ground.x - tile * 0.12), 0, Math.max(3, Math.round(tile * 0.24)), ground.y);
        const pool = ctx.createRadialGradient(ground.x, ground.y, 0, ground.x, ground.y, half * 1.6);
        pool.addColorStop(0, `rgba(240,205,115,${0.55 * pulse})`);
        pool.addColorStop(1, 'rgba(240,205,115,0)');
        ctx.fillStyle = pool;
        ctx.fillRect(ground.x - half * 1.6, ground.y - half * 0.6, half * 3.2, half * 1.2);
        motes(ctx, ground, tile, age);
        ctx.globalCompositeOperation = 'source-over';
    }
    function motes(ctx, ground, tile, age) {
        const size = Math.max(2, Math.round(tile / 22)), base = ctx.globalAlpha;
        for (let i = 0; i < MOTES; i++) {
            const rise = ((age / 1600 + i / MOTES) % 1), x = ground.x + Math.sin(i * 2.4) * tile * 0.45;
            ctx.fillStyle = i % 3 ? GOLD : '#fff4d6';
            ctx.globalAlpha = base * (1 - rise);
            ctx.fillRect(Math.round(x), Math.round(ground.y - rise * ground.y * 0.8), size, size);
        }
        ctx.globalAlpha = base;
    }
    /** The boss's name over a life bar filling back up, where the boss bar stands during the fight. */
    function lifeBar(ctx, width, name, share) {
        const barW = Math.round(Math.min(440, width * 0.46)), x = Math.round((width - barW) / 2), y = 70;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(8,6,5,0.82)';
        ctx.fillRect(x - 2, y - 2, barW + 4, 14);
        ctx.fillStyle = '#b8892f';
        ctx.fillRect(x, y, Math.round(barW * share), 10);
        ctx.fillStyle = 'rgba(255,240,196,0.55)';
        ctx.fillRect(x, y, Math.round(barW * share), 3);
        ctx.font = "13px 'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = GOLD;
        ctx.strokeText(name, width / 2, y - 6);
        ctx.fillText(name, width / 2, y - 6);
    }
    return Object.freeze({ draw });
})();
safeExposeGlobals({ bossRevive });
