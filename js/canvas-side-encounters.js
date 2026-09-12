// Presentation only. Spawn coordinates and cast snapshots belong to the combat domain.
const sideEncounterCanvas = (() => {
    function portals(ctx, projection, now) {
        const run = game.voidRift && game.voidRift.grandRun;
        if (game.currentZoneId !== 'grand_breach_run' || !run?.inRun || run.phase !== 'survival') return;
        const sinceBurst = now - ((run.nextRefillAt || 0) - GRAND_BREACH_ENCOUNTER.intervalMs);
        const pulse = clampNumber(1 - sinceBurst / 550,0,1);
        ctx.save();
        ctx.lineWidth = 2;
        ctx.fillStyle = '#130e21'; ctx.strokeStyle = '#a487cf';
        for (const portal of GRAND_BREACH_ENCOUNTER.portals) {
            const point = projection.cellToScreen(portal.gx,portal.gy);
            ctx.globalAlpha = 0.6 + pulse * 0.3;
            ctx.beginPath();
            ctx.ellipse(point.x,point.y,projection.tileW*(0.3+pulse*0.08),projection.tileH*0.2,0,0,Math.PI*2);
            ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }

    function pendingWarnings(ctx, projection, attacks) {
        const meteor = getZone(game.currentZoneId).type === 'meteor';
        const now = getCombatTime();
        for (const attack of attacks) {
            if (attack.delivery !== 'patternArea') continue;
            const footprint = projectSkillFootprint(attack.bossPattern.area,projection);
            if (!footprint) continue;
            drawSkillFootprintGround(ctx,footprint,meteor ? '#ff9b52' : '#ff684f',3);
            if (!meteor) continue;
            const cast = enemyAttackRules.castBar(attack.source,now,attack);
            if (!cast || cast.cancelled) continue;
            // The rock reaches the snapshotted impact center only when the attack becomes due.
            const progress = clampNumber((now-attack.castStartAt)/(attack.at-attack.castStartAt),0,1);
            const scale = projection.tileW / 48;
            ctx.save(); ctx.translate(footprint.centerPoint.x,footprint.centerPoint.y); ctx.scale(scale,scale);
            drawMeteorDescent(ctx,{x:0,y:0},progress);
            ctx.restore();
        }
    }

    return {portals,pendingWarnings};
})();
