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
    return {draw};
})();
safeExposeGlobals({enemyProjectileSprites});
