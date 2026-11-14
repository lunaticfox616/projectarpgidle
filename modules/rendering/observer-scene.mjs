import { sceneEase } from './observer-scene-ease.mjs';

class ObserverScene {
    constructor(deps) {
        this.deps = deps;

        this.sceneEase = sceneEase;
    }

    observerScene(now = this.deps.performance.now()) {
        const active = this.deps.bossMoves.observer.sceneActive();
        return active ? { ...active, age: Math.max(0, now - active.started), cue: this.deps.bossMoves.observer.divisionCue } : null;
    }

    observerCamera(ctx, scene, width, height, projection) {
        if (!scene || !projection || scene.age >= scene.cue.reveal || this.deps.uiDisplay.reducedEffects()) return;
        const cell = this.deps.getGridUnitCenter(scene.enemy);
        const anchor = projection.cellToScreen(cell.gx,cell.gy);
        const body = this.deps.stageRoster.bodySize(scene.enemy,projection.tileW);
        const focusY = anchor.y + (projection.actorGroundOffsetY || 0) - (body?.h || projection.tileW*1.5)*.56;
        const zoom = 1 + (width < 600 ? .42 : .72) * this.sceneEase(scene.age / scene.cue.close);
        const x = this.deps.clampNumber(width * .51 - anchor.x * zoom, width * (1-zoom), 0);
        const y = this.deps.clampNumber(height * .43 - focusY * zoom, height * (1-zoom), 0);
        ctx.translate(x,y);
        ctx.scale(zoom,zoom);
    }

    drawObserverTransition(ctx, scene, width, height) {
        if (!scene) return;
        const { age, cue } = scene, reduced = this.deps.uiDisplay.reducedEffects();
        ctx.save();
        if (age < cue.reveal) this.paintObserverDialogue(ctx,width,height,age,cue);
        const darkness = age < cue.reveal ? this.sceneEase((age-cue.shade)/(cue.black-cue.shade))
            : 1 - this.sceneEase((age-cue.reveal)/450);
        ctx.globalAlpha = darkness * (reduced ? .77 : 1);
        ctx.fillStyle = '#0a0711';
        ctx.fillRect(0,0,width,height);
        ctx.restore();
    }

    paintObserverDialogue(ctx, width, height, age, cue) {
        const bar = Math.round(Math.min(60,height * .072) * this.sceneEase(age / cue.close));
        const panelY = Math.round(Math.min(height * .69, height - 84));
        ctx.fillStyle = '#100c18';
        ctx.fillRect(0,0,width,bar);
        ctx.fillRect(0,height-bar,width,bar);
        const fade = this.sceneEase((age-270)/200);
        if (fade <= 0) return;
        ctx.globalAlpha = fade;
        const panel = ctx.createLinearGradient(0,panelY-16,0,panelY+98);
        panel.addColorStop(0,'#100c1800');
        panel.addColorStop(.2,'#100c18f0');
        panel.addColorStop(.82,'#100c18f0');
        panel.addColorStop(1,'#100c1800');
        ctx.fillStyle = panel;
        ctx.fillRect(0,panelY-16,width,114);
        ctx.textAlign = 'center';
        ctx.font = `bold 13px ${this.deps.battlePixelFont()}`;
        ctx.fillStyle = '#e5c68c';
        ctx.fillText(this.deps._t('경계의 관측자 베일라'),width/2,panelY+12,width-28);
        ctx.fillRect(width/2-36,panelY+19,72,1);
        ctx.font = `${width < 600 ? 16 : 19}px ${this.deps.battlePixelFont()}`;
        ctx.fillStyle = '#fff3e6';
        ctx.fillText(this.deps._t('경계를 가르겠습니다.'),width/2,panelY+38,width-28);
        ctx.fillText(this.deps._t('이제, 설 자리를 고르십시오.'),width/2,panelY+61,width-28);
    }
}

export function createObserverScene(deps) {
    const view=new ObserverScene(deps);
    return Object.freeze({ observerScene:view.observerScene.bind(view), observerCamera:view.observerCamera.bind(view), drawObserverTransition:view.drawObserverTransition.bind(view) });
}
