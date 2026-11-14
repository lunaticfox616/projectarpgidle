import { LIVE_MS, TONES } from './story-presentation-values.mjs';

class StageNpcs {
    constructor(deps) {
        this.deps = deps;
        this.LIVE_MS = LIVE_MS;
        this.TONES = TONES;
        this.npcSheets = new Map();
        this.npcHit = null;
        this.npcFlashes = new Map();
        this.NPC_HOVER_RIM = '#fff8e6';
        this.hoveredNpc = null;
    }
    npcSheet(id) {
        if (!this.npcSheets.has(id)) this.npcSheets.set(id, this.deps.stagePictures.openPicture(`${this.deps.STAGE_NPC_ART.path}${id}-idle.png?v=${this.deps.STAGE_NPC_ART.version}`));
        return this.npcSheets.get(id);
    }

    npcFrame(now) {
        const times = this.deps.STAGE_NPC_ART.frameMs;
        let left = now % times.reduce((sum, ms) => sum + ms, 0), index = 0;
        while (left >= times[index]) left -= times[index++];
        return index;
    }

    npcLabel(ctx, npc, x, y) {
        ctx.font = `12px ${this.deps.i18n.fontFamily("'Galmuri11'")}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = this.TONES[npc.tone] || this.TONES.gold;
        this.deps.drawCrispCanvasText(ctx, this.deps._t(npc.name), x, y, 'strokeText');
        this.deps.drawCrispCanvasText(ctx, this.deps._t(npc.name), x, y);
    }

    npcOfferMark(ctx, x, y) {
        const colour = '#d9cfb8';
        ctx.fillStyle = 'rgba(12,10,12,0.92)';
        ctx.fillRect(x - 8, y - 9, 16, 18);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 7.5, y - 8.5, 15, 17);
        ctx.fillStyle = colour;
        for (let dot = -1; dot <= 1; dot++) ctx.fillRect(x + dot * 4 - 1, y + 2, 2, 2);
    }

    npcStruck(now) {
        let share = 0;
        for (const fx of this.deps.battleFx) {
            if (!fx || fx.type !== 'npcStruck' || !(now - fx.start < fx.duration) || now < fx.start) continue;
            share = Math.max(share, 1 - (now - fx.start) / fx.duration);
        }
        return share;
    }

    npcFlashFrame(id, source, frame, colour = '#fff4df') {
        const key = `${id}:${frame}:${colour}`, cell = this.deps.STAGE_NPC_ART.cell;
        if (!this.npcFlashes.has(key)) {
            const canvas = this.deps.document.createElement('canvas'), c = canvas.getContext('2d');
            canvas.width = canvas.height = cell;
            c.drawImage(source, frame * cell, 0, cell, cell, 0, 0, cell, cell);
            c.globalCompositeOperation = 'source-in';
            c.fillStyle = colour;
            c.fillRect(0, 0, cell, cell);
            this.npcFlashes.set(key, canvas);
        }
        return this.npcFlashes.get(key);
    }

    hover(npc) { this.hoveredNpc = npc ? npc.id : null; }

    npcHoverRim(ctx, actor, source, frame, at) {
        if (!actor.talkable || this.hoveredNpc !== actor.npc.id) return;
        const cell = this.deps.STAGE_NPC_ART.cell, rim = Math.max(1, Math.round(at.scale / this.deps.STAGE_NPC_ART.scale));
        const painted = this.npcFlashFrame(actor.npc.id, source, frame, this.NPC_HOVER_RIM);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            this.deps.stageDots.blit(ctx, painted, { x: 0, y: 0, w: cell, h: cell }, { x: at.x + dx * rim, y: at.y + dy * rim, scale: at.scale });
        }
    }

    npcSparks(ctx, x, y, dot, struck) {
        const spread = (1 - struck) * 14 * dot + 4 * dot, size = Math.max(2, Math.round(dot * 2));
        ctx.save();
        ctx.globalAlpha = struck;
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 + 0.4;
            ctx.fillStyle = i % 2 ? '#ffd27a' : '#fff4df';
            ctx.fillRect(Math.round(x + Math.cos(angle) * spread), Math.round(y + Math.sin(angle) * spread), size, size);
        }
        ctx.restore();
    }

    drawNpc(ctx, actor, state, marked) {
        const art = this.deps.STAGE_NPC_ART, sheet = this.npcSheet(actor.npc.id);
        if (!sheet.ready) return;
        const dot = this.deps.stageActors.scaleFor(state.gridProj.tileW) * art.scale, cell = art.cell, top = Math.round(actor.y - (art.feet[1] - art.head) * dot);
        const frame = this.npcFrame(state.now), struck = this.npcStruck(state.now);
        this.deps.stageRings.shadow(ctx, { x: actor.x, y: actor.y, dot }, 18, 0.34);
        ctx.save();
        // 거울 축도 정수 px에 둔다: 축이 화소 사이에 있으면 뒤집은 그림 전체가 화소 사이에 찍혀 번진다.
        const axis = Math.round(actor.x);
        if (state.playerPos.x < actor.x) { ctx.translate(axis * 2, 0); ctx.scale(-1, 1); }
        const at = { x: Math.round(axis - art.feet[0] * dot), y: Math.round(actor.y - art.feet[1] * dot), scale: dot };
        this.npcHoverRim(ctx, actor, sheet.source, frame, at);
        this.deps.stageDots.blit(ctx, sheet.source, { x: frame * cell, y: 0, w: cell, h: cell }, at);
        if (struck > 0) {
            ctx.globalAlpha = 0.6 * struck;
            this.deps.stageDots.blit(ctx, this.npcFlashFrame(actor.npc.id, sheet.source, frame), { x: 0, y: 0, w: cell, h: cell }, at);
        }
        ctx.restore();
        if (struck > 0) this.npcSparks(ctx, actor.x, Math.round((top + actor.y) / 2), dot, struck);
        ctx.save();
        this.npcLabel(ctx, actor.npc, actor.x, top);
        if (marked) this.npcOfferMark(ctx, actor.x, top - 20, marked);
        ctx.restore();
        const head = { x: actor.x, y: top - (marked ? 32 : 12) };
        this.npcHit = actor.talkable ? { npc: actor.npc, at: this.deps.Date.now(), x0: actor.x - 30 * dot, x1: actor.x + 30 * dot, y0: top - 30, y1: actor.y } : null;
        return head;
    }

    npcAt(point) {
        const hit = this.npcHit && this.deps.Date.now() - this.npcHit.at < this.LIVE_MS ? this.npcHit : null;
        return hit && point && point.x >= hit.x0 && point.x <= hit.x1 && point.y >= hit.y0 && point.y <= hit.y1 ? hit.npc : null;
    }
}
export function createStageNpcs(deps) {
    const view=new StageNpcs(deps);
    return Object.freeze({
        ready:id=>view.npcSheet(id).ready,
        draw:view.drawNpc.bind(view), npcAt:view.npcAt.bind(view), hover:view.hover.bind(view)
    });
}
