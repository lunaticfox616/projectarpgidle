import { clampNumber } from '../common/numbers.mjs';
import { drawMeteorDescent } from './meteor-spell.mjs';

/** Render-local cache and read-only scene ports; no combat rules or saved state. */
class SideEncounterRenderer {
    constructor(deps) {
        this.deps = deps;
        for (const name of ["portals","pendingWarnings"]) this[name] = this[name].bind(this);

    }

    portals(ctx, projection, now) {
        const run = this.deps.currentGrandRun();
        if (!run?.inRun || run.phase !== 'survival') return;
        const sinceBurst = now - ((run.nextRefillAt || 0) - this.deps.GRAND_BREACH_ENCOUNTER.intervalMs);
        const pulse = clampNumber(1 - sinceBurst / 550,0,1);
        ctx.save();
        ctx.lineWidth = 2;
        ctx.fillStyle = '#130e21'; ctx.strokeStyle = '#a487cf';
        for (const portal of this.deps.GRAND_BREACH_ENCOUNTER.portals) {
            const point = projection.cellToScreen(portal.gx,portal.gy);
            ctx.globalAlpha = 0.6 + pulse * 0.3;
            ctx.beginPath();
            ctx.ellipse(point.x,point.y,projection.tileW*(0.3+pulse*0.08),projection.tileH*0.2,0,0,Math.PI*2);
            ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }

    pendingWarnings(ctx, projection, attacks) {
        const meteor = this.deps.isMeteorZone();
        const now = this.deps.getCombatTime();
        for (const attack of attacks) {
            if (attack.delivery !== 'patternArea' || attack.bossPattern.area.observerMove) continue;
            const footprint = this.deps.projectSkillFootprint(attack.bossPattern.area,projection);
            if (!footprint) continue;
            this.deps.drawSkillFootprintGround(ctx,footprint,meteor ? '#ff9b52' : '#ff684f',this.deps.bossAttackView.pendingAlpha());
            if (!meteor) continue;
            const cast = this.deps.enemyAttackRules.castBar(attack.source,now,attack);
            if (!cast || cast.cancelled) continue;
            // The rock reaches the snapshotted impact center only when the attack becomes due.
            const progress = clampNumber((now-attack.castStartAt)/(attack.at-attack.castStartAt),0,1);
            const scale = projection.tileW / 48;
            ctx.save(); ctx.translate(footprint.centerPoint.x,footprint.centerPoint.y); ctx.scale(scale,scale);
            drawMeteorDescent(ctx,{x:0,y:0},progress,this.deps.image('skillFxMeteorProjectile'));
            ctx.restore();
        }
    }

    api() { return {portals: this.portals,pendingWarnings: this.pendingWarnings}; }
}

export function createSideEncounterRenderer(deps) {
    return new SideEncounterRenderer(deps).api();
}
