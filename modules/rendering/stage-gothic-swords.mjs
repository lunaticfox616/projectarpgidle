class StageGothicSwords {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.swordPoses = null;
    }

    swordReady() {
        this.shared.openGothicPictures();
        if (this.swordPoses) return true;
        if (!this.shared.pictures['time-sword'].ready) return false;
        this.swordPoses = Array.from({ length: 72 }, (_, i) => {
            const a = i * this.shared.TAU / 72, c = this.shared.canvas(96, 96), g = c.getContext('2d');
            g.imageSmoothingEnabled = false; g.translate(48, 48); g.rotate(a + Math.PI / 2); g.drawImage(this.shared.image('time-sword'), -10, -36);
            return { image: c, tipX: 48 + 34 * Math.cos(a), tipY: 48 + 34 * Math.sin(a) };
        });
        return true;
    }

    /** 장검 하나(o: x, y 칼끝, angle 날아가는 쪽, alpha, scale). */
    timeSword(ctx, o) {
        if (o.alpha <= 0) return;
        const pose = this.swordPoses[((Math.round(o.angle / this.shared.TAU * 72) % 72) + 72) % 72], s = o.scale;
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= o.alpha;
        ctx.drawImage(pose.image, Math.round(o.x - pose.tipX * s), Math.round(o.y - pose.tipY * s), Math.round(96 * s), Math.round(96 * s));
        ctx.restore();
    }

    /** 칼끝 뒤로 남는 놋빛 점선(o: x, y 칼끝, angle, length 도트, alpha). */
    swordStroke(ctx, o) {
        if (o.alpha <= 0) return;
        ctx.save(); ctx.globalAlpha *= o.alpha; ctx.fillStyle = '#bd934e';
        const n = Math.min(12, Math.ceil(o.length / 4));
        for (let i = 1; i <= n; i++) { const d = i * o.length / n; ctx.fillRect(Math.round(o.x - Math.cos(o.angle) * d), Math.round(o.y - Math.sin(o.angle) * d), 2, 2); }
        ctx.restore();
    }

    /** 닿은 자리: 작은 놋빛 베임과 바깥으로 튀는 조각 둘(o: x, y, angle, t 닿은 뒤 시간에 공격 속도를 곱한 값, extra 추가 발). 밝은 십자나 넓은 번쩍임은 없다. */
    swordContact(ctx, o) {
        const { x, y, angle, t, extra } = o, fade = 1 - this.shared.clamp(t / 150);
        if (fade <= 0) return;
        ctx.save(); ctx.fillStyle = '#d6b774'; ctx.globalAlpha *= fade * 0.7;
        for (const side of [-1, 1]) { const q = angle + side * Math.PI / 2, d = 5 + this.shared.clamp(t / 120) * 12; ctx.fillRect(Math.round(x + Math.cos(q) * d), Math.round(y + Math.sin(q) * d), extra ? 3 : 4, 2); }
        ctx.restore();
        this.swordStroke(ctx, { x: x + Math.cos(angle) * 7, y: y + Math.sin(angle) * 7, angle, length: extra ? 14 : 21, alpha: fade * 0.65 });
    }
}

export function createStageGothicSwords(deps, shared) {
    return new StageGothicSwords(deps, shared);
}
