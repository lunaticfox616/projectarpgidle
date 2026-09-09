/** Eight small static sprites; no additional particles, filters or animation timers. */
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
        const index = variant(fx), width = sizes[index], height = width/2;
        for (const target of targets) {
            ctx.save();
            ctx.translate(source.x+(target.x-source.x)*progress,source.y+(target.y-source.y)*progress);
            ctx.rotate(Math.atan2(target.y-source.y,target.x-source.x));
            ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.globalAlpha = .94;
            ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image,(index%2)*64,Math.floor(index/2)*32,64,32,-width/2,-height/2,width,height);
            ctx.restore();
        }
        return true;
    }
    return {draw};
})();
safeExposeGlobals({enemyProjectileSprites});
