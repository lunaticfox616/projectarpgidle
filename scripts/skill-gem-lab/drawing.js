// Original atlas layout is evaluated once per frame, shared by the two battle layers.
(() => {
    const lab = newSkillLab;
    let samples = [], projection = null;
    let tick = null, anchor = 0, shownAt = 0;
    // Render between confirmed 100 ms combat steps; never advance combat from drawing.
    lab.sampleEffects = wallNow => {
        const clock = getCombatTime();
        if(tick !== clock) {
            if(tick === null || clock < tick) shownAt = clock;
            tick = clock; anchor = wallNow;
        }
        if(game.combatHalted || document.hidden) anchor = wallNow;
        let at = Math.max(shownAt, clock + Math.max(0, Math.min(100, wallNow-anchor)));
        // Keep the bottle at its landing until the controller confirms the impact.
        // Splash events still originate exclusively from the confirmed combat callback.
        for(const effect of lab.renderer.effects) {
            const end = effect.at + effect.duration;
            if(effect.flaskPhase === 'flight' && effect.at <= clock && clock < end) {
                at = Math.min(at, end-.001);
            }
        }
        shownAt = at;
        lab.visualTime = at;
        const rows = [];
        lab.renderer.layout(at, (...row) => rows.push(row));
        return rows;
    };
    function paint(ctx, ground) {
        const image = getSkillGemVfxImage('skillFxWorldTree');
        if(!projection || !image) return;
        const origin = projection.cellToScreen(0,0), sx = projection.tileW/48, sy = projection.tileH/48;
        for(const row of samples) {
            const [,x,y,scale,angle,fx,fy,w,h,,scaleY,alpha,,isGround] = row;
            if(!!isGround !== ground) continue;
            ctx.save(); ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.imageSmoothingEnabled = false;
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .85 * alpha;
            ctx.translate(origin.x+(x-24)*sx, origin.y+(y-24)*sy); ctx.scale(sx,sy); ctx.rotate(angle);
            if(scaleY < 0) ctx.scale(1,-1);
            ctx.drawImage(image, fx,fy,w,h, -w*scale/2,-h*Math.abs(scaleY)/2,w*scale,h*Math.abs(scaleY));
            ctx.restore();
        }
    }
    const originalGround = drawBattleGroundLayer, originalFront = drawSkillGemVfxLayer;
    drawBattleGroundLayer = (ctx, effects, view) => {
        originalGround(ctx, effects, view); projection = view.gridProj;
        lab.projection = projection;
        samples = lab.sampleEffects(performance.now()); paint(ctx, true);
    };
    drawSkillGemVfxLayer = (ctx, now) => {originalFront(ctx, now); paint(ctx, false);};
})();
