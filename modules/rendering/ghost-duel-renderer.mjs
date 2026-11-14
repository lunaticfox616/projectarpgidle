import { SPOT, WORDS, SUDDEN_DEATH_MS, SUDDEN_DEATH_DAMAGE, FLOAT_MS, FLOAT_LINE_PX, ROOM } from '../data/ghost-duel-stage.mjs';

export class GhostDuelRenderer {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
    }

    otherSide(side) { return (side === 'left' ? 'right' : 'left'); }

    /** 그 사람의 c(ms) 발 자리(화면): 방 왼쪽 끝에서 x칸, 정해 둔 줄. */
    spotOf(scene, place, side, c) {
        const at = place.cells.cellToScreen(this.links.timeline.placeOf(scene, c)[side] - 0.5, SPOT.row);
        return { x: at.x, y: at.y + place.cells.actorGroundOffsetY };
    }

    drawFighter(scene, ctx, f, c, place) {
        const pose = this.links.timeline.poseOf(scene, f, c), sheet = this.links.pictures.sheetOf(scene, pose.clip.file);
        if (!sheet.ready) return;
        const spot = this.spotOf(scene, place, f.side, c), scale = this.deps.stageActors.scaleFor(place.cells.tileW), west = pose.west;
        const look = this.links.timeline.hurtOf(scene, f.side, c), axis = spot.x + (look ? look.back * scale * (west ? 1 : -1) : 0);
        this.deps.stageRings.shadow(ctx, { x: spot.x, y: spot.y, dot: scale }, 15, 0.42);
        ctx.save();
        try {
            if (west) { ctx.translate(axis * 2, 0); ctx.scale(-1, 1); }
            const dest = { x: Math.round(axis - (pose.clip.ax + 0.5) * scale), y: Math.round(spot.y - pose.clip.ay * scale), scale };
            if (look && look.outline) {
                const rim = this.links.pictures.rimOf(sheet, pose.clip, pose.frame, look.outline), step = this.deps.STAGE_CHARACTERS.hit.outlinePx * scale;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.deps.stageDots.blit(ctx, rim, { x: 0, y: 0, w: pose.clip.w, h: pose.clip.h }, { ...dest, x: Math.round(dest.x + dx * step), y: Math.round(dest.y + dy * step) });
            }
            this.deps.stageDots.blit(ctx, sheet.source, { x: pose.frame * pose.clip.w, y: 0, w: pose.clip.w, h: pose.clip.h }, dest);
        } finally { ctx.restore(); }
    }

    /** 활과 주문의 빛줄기: 쏜 때부터 서버가 적은 때까지 손 높이에서 상대의 가슴으로. */
    drawShots(scene, ctx, c, place) {
        const scale = this.deps.stageActors.scaleFor(place.cells.tileW);
        for (const strike of scene.strikes) {
            const f = scene.fighters[strike.side];
            if (!f.ranged || c < strike.at - strike.flight || c >= strike.at) continue;
            const from = this.spotOf(scene, place, strike.side, c), to = this.spotOf(scene, place, this.otherSide(strike.side), c), toward = Math.sign(to.x - from.x);
            const t = (c - (strike.at - strike.flight)) / strike.flight, x = from.x + toward * 24 * scale + (to.x - from.x - toward * 34 * scale) * t;
            const y = from.y - 62 * scale + (6 * scale) * t;
            ctx.fillStyle = f.colour;
            ctx.fillRect(Math.round(x - 3 * scale), Math.round(y - scale), Math.round(6 * scale), Math.round(2 * scale));
            ctx.globalAlpha = 0.45;
            ctx.fillRect(Math.round(x - toward * 9 * scale - 3 * scale), Math.round(y - scale), Math.round(5 * scale), Math.round(2 * scale));
            ctx.globalAlpha = 1;
        }
    }

    floatLabel(scene, strike) {
        if (WORDS[strike.outcome]) return WORDS[strike.outcome];
        const scale = scene.scale * (strike.at >= SUDDEN_DEATH_MS ? SUDDEN_DEATH_DAMAGE : 1);
        const shown = scale > 0 ? (0, this.deps.formatNumberKR)(Math.round(strike.damage / scale)) : '';
        return strike.outcome === 'deflect' ? (0, this.deps._t)('비껴냄 {shown}', { shown }) : shown;
    }

    /** 떠오른 글의 모습: 끝의 40% 동안 사라지고, 회피와 막기는 푸른빛, 치명타는 금빛으로 처음에 조금 더 튄다. */
    floatLook(strike, age) {
        const fade = FLOAT_MS * 0.6, alpha = age > fade ? 1 - (age - fade) / (FLOAT_MS - fade) : 1;
        const colour = WORDS[strike.outcome] ? '#a9d4ff' : strike.crit ? '#ffd24a' : '#ffffff';
        return { alpha, colour, lift: age / FLOAT_MS * 28 + (strike.crit && age < 160 ? 6 : 0) };
    }

    /** 떠오른 글의 자리: 맞은 쪽 머리 위. 화면 밖으로 나가지 않게 가로를 당기고, 두 사람이 글 폭보다 가까이 서면 방 오른쪽에 선 사람의
     * 글을 한 줄 올린다(휴대폰에서 붙어 싸우면 두 숫자가 겹쳤다). */
    floatAt(ctx, label, target, other, width) {
        const w = ctx.measureText(label).width + 8;
        const x = (0, this.deps.clampNumber)(target.x, w / 2, Math.max(w / 2, width - w / 2));
        return { x: Math.round(x), lift: target.x > other.x && target.x - other.x < w ? FLOAT_LINE_PX : 0 };
    }

    /** 맞은 쪽 머리 위로 떠오르는 피해 숫자와 회피, 막기. */
    drawFloats(scene, ctx, c, place, width) {
        const scale = this.deps.stageActors.scaleFor(place.cells.tileW), head = (scene.fighters.left.clips.idle.ay + 8) * scale;
        ctx.font = `bold 24px ${(0, this.deps.battlePixelFont)()}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        for (const strike of scene.strikes) {
            const age = c - strike.at, label = age >= 0 && age < FLOAT_MS ? this.floatLabel(scene, strike) : '';
            if (!label) continue;
            const target = this.spotOf(scene, place, this.otherSide(strike.side), c), look = this.floatLook(strike, age);
            const at = this.floatAt(ctx, label, target, this.spotOf(scene, place, strike.side, c), width), y = Math.round(target.y - head - look.lift - at.lift);
            ctx.globalAlpha = look.alpha;
            ctx.fillStyle = look.colour;
            (0, this.deps.drawCrispCanvasText)(ctx, label, at.x, y, 'strokeText');
            (0, this.deps.drawCrispCanvasText)(ctx, label, at.x, y);
        }
        ctx.globalAlpha = 1;
    }

    fitCanvas(canvas) {
        const ratio = this.deps.uiDisplay.battleRenderScale, width = canvas.clientWidth, height = canvas.clientHeight;
        const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.imageSmoothingEnabled = false;
        return { ctx, width, height };
    }

    drawScene(scene, c) {
        const { ctx, width, height } = this.fitCanvas(scene.canvas), place = this.deps.stageBoard.place(width, height, ROOM.columns, ROOM.rows);
        const p = { ...place.cells, mapX: place.left, mapY: place.top, mapWidth: ROOM.columns * place.cells.tileW, mapHeight: ROOM.rows * place.cells.tileH,
            stageBoard: this.deps.stageBoard.room(scene.region, ROOM.columns, ROOM.rows) };
        ctx.clearRect(0, 0, width, height);
        if (!this.deps.stageBoard.background(ctx, p, { width, height })) { ctx.fillStyle = '#0b090c'; ctx.fillRect(0, 0, width, height); }
        for (const side of ['left', 'right']) this.drawFighter(scene, ctx, scene.fighters[side], c, place);
        this.drawShots(scene, ctx, c, place);
        this.drawFloats(scene, ctx, c, place, width);
    }
}
