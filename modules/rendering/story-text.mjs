import { FADE_IN_MS, FADE_OUT_MS, LINE } from './story-presentation-values.mjs';

class StoryText {
    constructor(deps) {
        this.deps = deps;
        this.FADE_IN_MS = FADE_IN_MS;
        this.FADE_OUT_MS = FADE_OUT_MS;
        this.LINE = LINE;
        this.storyFont = () => this.deps.i18n.fontFamily("'Galmuri14', 'Galmuri11'");
    }
    opacity(age, showMs) {
        return Math.max(0, Math.min(1, age / this.FADE_IN_MS, (showMs - age) / this.FADE_OUT_MS));
    }

    band(ctx, view) {
        const shade = ctx.createLinearGradient(0, view.top - view.size * 1.4, 0, view.top + view.size * 1.8);
        shade.addColorStop(0, 'rgba(6,8,10,0)');
        shade.addColorStop(0.5, 'rgba(6,8,10,0.62)');
        shade.addColorStop(1, 'rgba(6,8,10,0)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, view.top - view.size * 1.4, view.width, view.size * 3.2);
    }

    kicker(card, ctx, view) {
        const half = view.size * 2.4;
        ctx.font = `${this.deps.pixelFontSize(view.size * 0.5, 15)}px ${this.storyFont()}`;
        ctx.fillStyle = card.style.kickerColour;
        this.deps.drawCrispCanvasText(ctx, card.kicker, view.x, view.top - view.size * 0.55);
        const gap = ctx.measureText(card.kicker).width / 2 + view.size * 0.5;
        ctx.fillRect(Math.round(view.x - gap - half), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
        ctx.fillRect(Math.round(view.x + gap), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
    }

    title(card, ctx, view) {
        // 글은 갈무리14의 제 크기(15px의 정수배), 테는 짝수 폭: 사이 크기와 홀수 폭 테는 도트가 번졌다(2026-10-21).
        ctx.font = `${this.deps.pixelFontSize(view.size, 15)}px ${this.storyFont()}`;
        ctx.lineWidth = 2 * Math.max(2, Math.round(view.size * 0.08));
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        this.deps.drawCrispCanvasText(ctx, this.deps._t(card.title), view.x, view.top + view.size * 0.5, 'strokeText');
        ctx.fillStyle = card.style.titleColour;
        this.deps.drawCrispCanvasText(ctx, this.deps._t(card.title), view.x, view.top + view.size * 0.5);
    }

    drawTitleCard(card, ctx, width, height, now) {
        const size = Math.round(Math.max(20, Math.min(34, Math.min(width, height) * 0.04)));
        const view = { x: Math.round(width / 2), top: Math.round(height * 0.2), size, width };
        ctx.save();
        ctx.globalAlpha = this.opacity(now - card.startAt, card.style.showMs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.band(ctx, view);
        this.kicker(card, ctx, view);
        this.title(card, ctx, view);
        ctx.restore();
    }

    storyLineRows(ctx, text, width) {
        const rows = [];
        for (const word of text.split(' ')) {
            const last = rows.length ? `${rows[rows.length - 1]} ${word}` : null;
            if (last !== null && ctx.measureText(last).width <= width) rows[rows.length - 1] = last;
            else rows.push(word);
        }
        return rows;
    }

    storyLineLayout(speech, ctx, width) {
        if (speech.line.layoutFor !== width) {
            const rows = this.storyLineRows(ctx, speech.line.text, width);
            speech.line.layout = { rows, widest: Math.ceil(Math.max(...rows.map(row => ctx.measureText(row).width))) };
            speech.line.layoutFor = width;
        }
        return speech.line.layout;
    }

    storyAnchor(speech, scene) {
        if (speech.line.woodsman) return this.deps.woodsmanView.speechAnchor(speech.line.woodsman);
        if (speech.line.who === 'hero') return { x: scene.light.x, y: (this.deps.getHeroHeadY(scene.now) ?? scene.light.y - 82 * this.deps.HERO_SIZE_SCALE) - 18 };
        if (speech.line.who === 'npc') return speech.npcHead;
        if (speech.line.who !== 'boss') return null;
        const entry = scene.layout.find(row => row.drawn && row.enemy.id === speech.line.bossId);
        return entry ? { x: entry.x, y: entry.y - this.deps.getEnemyFieldBarLift(entry.enemy) - 10 } : null;
    }

    storyBubbleFrame(speech, ctx, box, tipX) {
        ctx.fillStyle = 'rgba(12,10,12,0.92)';
        ctx.strokeStyle = speech.line.colour;
        ctx.lineWidth = 1;
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
        ctx.beginPath();
        ctx.moveTo(tipX - 6, box.y + box.h - 0.5);
        ctx.lineTo(tipX, box.y + box.h + 7);
        ctx.lineTo(tipX + 6, box.y + box.h - 0.5);
        ctx.fill();
        ctx.stroke();
    }

    drawStoryBubble(speech, ctx, view, anchor) {
        const pad = Math.round(view.size * 0.6), rowH = Math.round(view.size * 1.45);
        const { rows, widest } = this.storyLineLayout(speech, ctx, Math.min(view.width - 32, view.size * this.LINE.bubbleChars));
        const w = widest + pad * 2, h = rows.length * rowH + pad * 2;
        const x = Math.round(Math.min(Math.max(8, anchor.x - w / 2), view.width - w - 8)), y = Math.round(Math.max(8, anchor.y - h - 7));
        this.storyBubbleFrame(speech, ctx, { x, y, w, h }, Math.round(Math.min(Math.max(x + 12, anchor.x), x + w - 12)));
        ctx.fillStyle = '#efe7d6';
        rows.forEach((row, index) => this.deps.drawCrispCanvasText(ctx, row, x + w / 2, y + pad + rowH * (index + 0.5)));
    }

    drawStoryBand(speech, ctx, view) {
        const rows = this.storyLineLayout(speech, ctx, Math.min(view.width - view.size * 3, view.size * 34)).rows.slice(0, this.LINE.maxRows);
        const top = view.top - view.size * 2, height = view.size * (rows.length * 1.5 + 3);
        const shade = ctx.createLinearGradient(0, top, 0, top + height);
        [[0, 0], [0.25, 0.66], [0.75, 0.66], [1, 0]].forEach(([at, alpha]) => shade.addColorStop(at, `rgba(6,8,10,${alpha})`));
        ctx.fillStyle = shade;
        ctx.fillRect(0, top, view.width, height);
        if (speech.line.who !== 'narration') this.storyBandSpeaker(speech, ctx, view);
        ctx.font = `${this.deps.pixelFontSize(view.size, 15)}px ${this.storyFont()}`;
        ctx.lineWidth = 2 * Math.max(2, Math.round(view.size * 0.1));
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = speech.line.who === 'narration' ? '#d9cdb0' : '#efe7d6';
        rows.forEach((row, index) => {
            const y = view.top + view.size * (0.9 + index * 1.5);
            this.deps.drawCrispCanvasText(ctx, row, view.x, y, 'strokeText');
            this.deps.drawCrispCanvasText(ctx, row, view.x, y);
        });
    }

    storyBandSpeaker(speech, ctx, view) {
        ctx.font = `${this.deps.pixelFontSize(view.size * 0.8, 12)}px ${this.deps.i18n.fontFamily("'Galmuri11'")}`;
        ctx.fillStyle = speech.line.colour;
        this.deps.drawCrispCanvasText(ctx, speech.line.speaker, view.x, view.top - view.size * 0.6);
    }

    drawStoryLine(speech, ctx, scene) {
        if (speech.line.revive) this.deps.bossRevive.draw(ctx, scene, speech.line.revive, scene.now - speech.line.startAt, speech.line.showMs);
        const size = Math.round(Math.max(13, Math.min(18, Math.min(scene.width, scene.height) * 0.022)));
        const view = { x: Math.round(scene.width / 2), top: Math.round(scene.height * 0.2), size, width: scene.width };
        const anchor = this.storyAnchor(speech, scene);
        ctx.save();
        ctx.globalAlpha = this.opacity(scene.now - speech.line.startAt, speech.line.showMs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${this.deps.pixelFontSize(size, 15)}px ${this.storyFont()}`;
        if (anchor) this.drawStoryBubble(speech, ctx, view, anchor);
        else this.drawStoryBand(speech, ctx, view);
        ctx.restore();
    }
}
export function createStoryText(deps) {
    const view=new StoryText(deps);
    return Object.freeze({ drawTitleCard:view.drawTitleCard.bind(view), drawStoryLine:view.drawStoryLine.bind(view) });
}
