import { AWAY_HUNT } from '../data/away-hunt.mjs';

const TINTS_KEPT = 16;
const OUTLINE = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

/** 방치 정산 창의 사냥 장면 한 장을 그린다(modules/ui/away-hunt-scene.mjs가 고른 장과 자리). 그림 도트 하나 = 캔버스 화소 하나이고
 * 자리는 정수로 맞춘다. 그림은 장 그대로 찍고(왼쪽을 보는 몬스터는 좌우만 뒤집는다), 늘이거나 기울이지 않는다. 하늘은 비워 두어
 * 창의 바탕이 비치고, 바닥은 지역의 땅 색 띠다. 게임 상태를 읽거나 바꾸지 않는다. */
export class AwayHuntPainter {
    constructor(deps) {
        this.deps = deps;
        this.tints = new Map();
        this.labels = new Map();
        this.floor = null;
        this.edge = null;
    }

    release() {
        this.tints.clear();
        this.labels.clear();
        this.floor = null;
        this.edge = null;
    }

    /** @param {CanvasRenderingContext2D} ctx @param {object} frame modules/ui/away-hunt-scene.mjs framePoses의 모양 */
    paint(ctx, frame) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, frame.width, frame.height);
        this.drawFloor(ctx, frame);
        for (const prop of frame.props) this.drawProp(ctx, prop, frame.feetY);
        if (frame.monster) this.drawMonster(ctx, frame.monster, frame.feetY);
        if (frame.hero) this.drawHero(ctx, frame.hero, frame.feetY);
        if (frame.effect) this.drawEffects(ctx, frame.effect);
        if (frame.floats) this.drawFloats(ctx, frame.floats);
        this.fadeEdges(ctx, frame);
    }

    /** 땅 색 띠(floorTile 도트마다 되풀이하는 무늬, 캔버스보다 한 무늬 넓다): 위로 갈수록 옅어지고, 밝고 어두운 자갈 도트가 흩어진다.
     * 색이나 캔버스 너비가 바뀔 때만 다시 만들어 프레임마다 한 번 찍는다. */
    floorStrip(palette, span) {
        const tile = AWAY_HUNT.floorTile, width = (Math.ceil(span / tile) + 1) * tile, key = palette.earth + palette.sky + width;
        if (this.floor && this.floor.key === key) return this.floor.canvas;
        const canvas = this.deps.document.createElement('canvas'), rows = AWAY_HUNT.floorRows;
        canvas.width = width;
        canvas.height = rows;
        const ctx = canvas.getContext('2d');
        for (let y = 0; y < rows; y++) {
            ctx.globalAlpha = 0.12 + 0.6 * (y / (rows - 1));
            ctx.fillStyle = palette.earth;
            ctx.fillRect(0, y, width, 1);
        }
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 26; i++) {
            const x = (i * 37 + 11) % tile, y = 3 + ((i * 7) % (rows - 4));
            ctx.fillStyle = i % 3 === 0 ? palette.sky : '#0c0a0d';
            for (let from = 0; from < width; from += tile) ctx.fillRect(from + x, y, i % 4 === 0 ? 2 : 1, 1);
        }
        this.floor = { key, canvas };
        return canvas;
    }

    drawFloor(ctx, frame) {
        const strip = this.floorStrip(frame.palette, frame.width), shift = Math.floor(frame.scroll) % AWAY_HUNT.floorTile;
        ctx.drawImage(strip, -shift, frame.height - AWAY_HUNT.floorRows);
    }

    /** 지역 소품: 발을 바닥 줄보다 두 도트 뒤에 두고 조금 옅게(멀리 있다). */
    drawProp(ctx, prop, feetY) {
        if (!prop.picture.ready) return;
        const [w, h, footX, footY] = prop.size;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(prop.picture.source, 0, 0, w, h, Math.round(prop.x - footX), feetY - 2 - footY, w, h);
        ctx.globalAlpha = 1;
    }

    /** 발밑 그림자: 세 줄의 납작한 타원 도트. */
    drawShadow(ctx, x, feetY, half) {
        const alpha = ctx.globalAlpha;
        ctx.fillStyle = '#000';
        ctx.globalAlpha = alpha * 0.32;
        ctx.fillRect(Math.round(x - half), feetY + 1, half * 2, 1);
        ctx.fillRect(Math.round(x - half + 3), feetY + 2, Math.max(2, half * 2 - 6), 1);
        ctx.globalAlpha = alpha;
    }

    /** 한 장을 한 색으로 칠한 그림(몬스터가 맞았을 때의 번쩍임, 주인공이 맞았을 때의 테). 가장 최근 TINTS_KEPT장만 들고 있는다. */
    tinted(source, cell, colour) {
        const key = `${cell.url}|${cell.x}|${cell.y}|${colour}`;
        let canvas = this.tints.get(key);
        if (canvas) return canvas;
        canvas = this.deps.document.createElement('canvas');
        canvas.width = cell.w;
        canvas.height = cell.h;
        const c = canvas.getContext('2d');
        c.drawImage(source, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, cell.w, cell.h);
        this.tints.set(key, canvas);
        if (this.tints.size > TINTS_KEPT) this.tints.delete(this.tints.keys().next().value);
        return canvas;
    }

    /** 몬스터: 왼쪽을 보도록 발을 축으로 좌우만 뒤집어 찍는다. 맞은 순간은 흰 번쩍임을 덧찍고, 쓰러지면 옅어진다. */
    drawMonster(ctx, monster, feetY) {
        const { picture, cell, footX, footY, x, alpha, flash, half } = monster;
        if (!picture.ready || alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        this.drawShadow(ctx, x, feetY, half);
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        const left = -footX, top = feetY - footY;
        ctx.drawImage(picture.source, cell.x, cell.y, cell.w, cell.h, left, top, cell.w, cell.h);
        if (flash) {
            ctx.globalAlpha = alpha * 0.85;
            ctx.drawImage(this.tinted(picture.source, cell, AWAY_HUNT.flash), left, top);
        }
        ctx.restore();
    }

    /** 주인공: 오른쪽을 본다. 맞았을 때는 붉은 테를 두르고 몇 도트 뒤로 밀린다(무대와 같은 규칙, data/stage-characters.js hit). */
    drawHero(ctx, hero, feetY) {
        const { picture, clip, frame, hurt } = hero;
        if (!picture.ready) return;
        const x = Math.round(hero.x - (hurt ? hurt.back : 0)), left = x - clip.ax, top = feetY - clip.ay;
        const cell = { url: picture.url, x: frame * clip.w, y: 0, w: clip.w, h: clip.h };
        this.drawShadow(ctx, x, feetY, 12);
        if (hurt && hurt.outline) {
            const rim = this.tinted(picture.source, cell, hurt.outline);
            for (const [dx, dy] of OUTLINE) ctx.drawImage(rim, left + dx, top + dy);
        }
        ctx.drawImage(picture.source, cell.x, 0, clip.w, clip.h, left, top, clip.w, clip.h);
    }

    /** 타격 이펙트: 잘라 둔 띠(장 하나가 effectSize 정사각형)에서 그 장을 몸 가운데에. */
    drawEffects(ctx, effect) {
        const size = AWAY_HUNT.effectSize, left = Math.round(effect.x - size / 2), top = Math.round(effect.y - size / 2);
        for (const index of effect.indices) ctx.drawImage(effect.strip, index * size, 0, size, size, left, top, size, size);
    }

    /** 피해 숫자 하나를 그려 둔 작은 캔버스(갈무리 도트 글꼴, 검은 테). 글을 프레임마다 그리면 휴대폰 속도에서 한 번에 1ms가 넘어
     * 숫자마다 한 번만 그리고 찍는다. 숫자는 장면마다 몇 가지뿐이다. */
    label(text, font) {
        const key = font + '|' + text;
        let canvas = this.labels.get(key);
        if (canvas) return canvas;
        canvas = this.deps.document.createElement('canvas');
        const c = canvas.getContext('2d'), size = AWAY_HUNT.fontPx, pad = 2, face = `${size}px ${font}`;
        c.font = face;
        canvas.width = Math.ceil(c.measureText(text).width) + pad * 2;
        canvas.height = size + pad * 2 + 2;
        c.font = face;
        c.textBaseline = 'alphabetic';
        c.lineWidth = 3;
        c.lineJoin = 'round';
        c.strokeStyle = AWAY_HUNT.numberInk;
        c.fillStyle = '#fff';
        c.strokeText(text, pad, size + pad);
        c.fillText(text, pad, size + pad);
        this.labels.set(key, canvas);
        return canvas;
    }

    /** 피해 숫자: 그려 둔 숫자를 머리 위 자리에 정수로 찍는다(아래쪽 끝이 그 줄, 키 큰 몬스터면 캔버스 위 끝에 멈춘다). */
    drawFloats(ctx, floats) {
        for (const row of floats.rows) {
            const image = this.label(row.label, floats.font), top = Math.max(0, Math.round(floats.y - row.lift - image.height));
            ctx.globalAlpha = row.alpha;
            ctx.drawImage(image, Math.round(floats.x + row.shift - image.width / 2), top);
        }
        ctx.globalAlpha = 1;
    }

    /** 양 끝을 투명하게 하는 가로 그라디언트(캔버스 너비가 바뀔 때만 다시 만든다). 너비가 너무 좁으면 null. */
    edgeMask(ctx, width) {
        if (this.edge && this.edge.ctx === ctx && this.edge.width === width) return this.edge.mask;
        const edge = AWAY_HUNT.edgeFade / Math.max(1, width);
        if (edge >= 0.5) return null;
        const mask = ctx.createLinearGradient(0, 0, width, 0);
        mask.addColorStop(0, 'rgba(0,0,0,0)');
        mask.addColorStop(edge, '#000');
        mask.addColorStop(1 - edge, '#000');
        mask.addColorStop(1, 'rgba(0,0,0,0)');
        this.edge = { ctx, width, mask };
        return mask;
    }

    /** 양 끝을 edgeFade 도트에 걸쳐 투명하게: 들어오는 몬스터와 흐르는 바닥이 창 안에서 끊기지 않고 스며든다. */
    fadeEdges(ctx, frame) {
        const mask = this.edgeMask(ctx, frame.width);
        if (!mask) return;
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = mask;
        ctx.fillRect(0, 0, frame.width, frame.height);
        ctx.globalCompositeOperation = 'source-over';
    }
}
