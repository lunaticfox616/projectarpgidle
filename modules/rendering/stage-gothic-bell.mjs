class StageGothicBell {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.DEG = Math.PI / 180;
        this.CHAIN_SEGMENTS = 6;
        this.CHAIN_STEP = 52 / this.CHAIN_SEGMENTS;
        this.CAVITY_ROWS = Object.freeze([[57, 27, 10], [58, 20, 24], [59, 14, 36], [60, 9, 46], [61, 5, 54], [62, 4, 56],
            [63, 4, 56], [64, 5, 54], [65, 7, 50], [66, 10, 44], [67, 14, 36], [68, 20, 24]]);
        this.bellRig = null;
    }

    bellChainLink(edge) {
        const c = this.shared.canvas(5, 7), g = c.getContext('2d');
        g.fillStyle = '#3c2b20'; g.fillRect(edge ? 1 : 0, 0, edge ? 3 : 5, 7);
        g.fillStyle = '#b28b4d'; g.fillRect(edge ? 2 : 1, 0, edge ? 1 : 3, 7);
        if (!edge) { g.fillStyle = '#211b20'; g.fillRect(2, 2, 1, 3); }
        g.fillStyle = edge ? '#e8c982' : '#efcf8a'; g.fillRect(edge ? 2 : 1, 1, 1, 4);
        return c;
    }

    openBellRig() {
        if (this.bellRig || !this.shared.BELL_PARTS.every(name => this.shared.pictures[name].ready)) return this.bellRig;
        const image = this.shared.canvas(128, 144), cavity = new this.deps.Path2D();
        for (const [y, x, w] of this.CAVITY_ROWS) cavity.rect(x - 32, y - 7, w, 1);
        this.bellRig = { image, ctx: image.getContext('2d'), cavity, links: [this.bellChainLink(false), this.bellChainLink(true)],
            points: Array.from({ length: this.CHAIN_SEGMENTS + 1 }, () => ({ x: 0, y: 0, angle: 0 })) };
        return this.bellRig;
    }

    /** V3.14.7: 사슬 마디마다 흔들림이 조금 늦게 전해진다. 끝 마디를 종의 축으로 함께 쓴다. */
    bellChainPose(t, plan, sky, rig) {
        const first = plan.tolls[0], period = Math.max(180, plan.tolls.length > 1 ? plan.tolls[1] - first : 450);
        const entrance = this.shared.clamp(t / plan.drop), phase = (t - first) * Math.PI / period, age = Math.max(0, t - plan.T1);
        const body = 17 * Math.cos(phase) * entrance * Math.exp(-age / 370) * this.DEG;
        const raw = -54 * Math.cos(phase - 0.18) / Math.cos(0.18);
        const relative = Math.max(-54, Math.min(54, raw)) * entrance * Math.exp(-age / 470) * this.DEG;
        const envelope = entrance * Math.exp(-age / 520);
        let x = 0, y = Math.max(sky - 10, -258) - (1 - entrance) ** 2 * 30, angle = 0;
        for (let i = 0; i < this.CHAIN_SEGMENTS; i++) {
            const q = i / (this.CHAIN_SEGMENTS - 1);
            angle = (17 * Math.cos(phase - 0.22 - q * 0.55) + 2.4 * Math.sin(phase * 2 - q * 0.65)) * envelope * this.DEG;
            const point = rig.points[i];
            point.x = x; point.y = y; point.angle = angle;
            x -= Math.sin(angle) * this.CHAIN_STEP;
            y += Math.cos(angle) * this.CHAIN_STEP;
        }
        const last = rig.points[this.CHAIN_SEGMENTS];
        last.x = x; last.y = y; last.angle = angle;
        return { x, y, body, relative };
    }

    drawBellChain(ctx, rig, pose) {
        const g = rig.ctx;
        g.clearRect(0, 0, rig.image.width, rig.image.height);
        g.save(); g.imageSmoothingEnabled = false;
        rig.points.forEach((point, i) => {
            g.save();
            g.translate(Math.round(64 + (point.x - pose.x) / 2), Math.round(44 + (point.y - pose.y) / 2));
            g.rotate(point.angle); g.drawImage(rig.links[i % 2], -2, -3);
            g.restore();
        });
        g.translate(64, 44); g.rotate(pose.body); g.drawImage(this.shared.image('bell-body'), -32, -7);
        g.clip(rig.cavity); g.translate(0, 43); g.rotate(pose.relative);
        g.drawImage(this.shared.image('bell-clapper'), -8, 0, 16, 20);
        g.restore();
        ctx.drawImage(rig.image, this.shared.snap(pose.x - 128), this.shared.snap(pose.y - 88), 256, 288);
        return { x: pose.x - Math.sin(pose.body) * 112, y: pose.y + Math.cos(pose.body) * 112 };
    }

    /** plan: js/canvas-stage-runes-v313-b.js bellPlan({ A, B, tolls, T1, drop, wave }). */
    bellGround(ctx, t, plan) {
        const entrance = this.shared.clamp(t / plan.drop), out = 1 - this.shared.clamp((t - plan.T1 - plan.wave - 80) / 300);
        this.shared.oval(ctx, this.shared.built.shadow, 42, 13, 0.6 * entrance * out);
        for (const tt of plan.tolls) {
            const u = (t - tt) / plan.wave;
            if (u < 0 || u > 1.25) continue;
            // 앞 고리는 피해가 퍼지는 거리와 같은 비율로 커진다.
            this.shared.oval(ctx, this.shared.built.gold, plan.A * Math.min(1, u), plan.B * Math.min(1, u), 0.86 * (1 - this.shared.clamp((u - 0.8) / 0.45)));
            const tail = u - 0.15;
            if (tail > 0 && tail < 1) this.shared.oval(ctx, this.shared.built.gold, plan.A * tail, plan.B * tail, 0.27 * (1 - tail));
        }
    }

    bellSwing(t, plan) {
        let swing = 0;
        plan.tolls.forEach((tt, i) => {
            const age = t - tt;
            if (age >= -100 && age < 470) swing += (i ? -1 : 1) * Math.sin((age + 100) / 570 * this.shared.TAU) * 11 * (1 - this.shared.clamp(Math.max(0, age) / 600));
        });
        return swing;
    }

    /** 새 부품이 준비되기 전에는 기존 고딕 종을 그린다. */
    drawLegacyGothicBell(ctx, t, plan, sky, entrance) {
        const pivot = Math.max(sky + 12, -230) - (1 - entrance) ** 2 * 38;
        const pose = this.shared.built.bell[Math.max(0, Math.min(6, Math.round(this.bellSwing(t, plan) / 4) + 3))];
        const rope = Math.max(0, this.shared.snap(pivot + 5 - sky));
        ctx.fillStyle = '#3d3029'; ctx.fillRect(-2, Math.floor(sky), 4, rope);
        ctx.fillStyle = '#bd955d'; ctx.fillRect(0, Math.floor(sky), 2, rope);
        ctx.drawImage(pose, -112, this.shared.snap(pivot - 20), 224, 192);
        return { x: 0, y: pivot + 105 };
    }

    /** 사슬에 매달려 내려와 울릴 때마다 흔들리는 종과 입 옆의 소리 결. */
    bellSky(ctx, t, plan) {
        const entrance = this.shared.clamp(t / plan.drop), out = 1 - this.shared.clamp((t - plan.T1 - plan.wave - 80) / 300);
        if (out <= 0) return;
        const sky = this.shared.screenTop(ctx), rig = this.openBellRig();
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = entrance * out;
        const mouth = rig ? this.drawBellChain(ctx, rig, this.bellChainPose(t, plan, sky, rig)) : this.drawLegacyGothicBell(ctx, t, plan, sky, entrance);
        for (const tt of plan.tolls) {
            const u = (t - tt) / 340;
            if (u < 0 || u > 1) continue;
            ctx.globalAlpha = 0.75 * (1 - u) * out; ctx.fillStyle = '#dfbf82';
            for (const side of [-1, 1]) for (let j = -5; j <= 5; j++) {
                const a = j * 0.11, rx = 62 + u * 32;
                ctx.fillRect(this.shared.snap(mouth.x + side * Math.cos(a) * rx), this.shared.snap(mouth.y + Math.sin(a) * rx * 0.65), 2, 4);
            }
        }
        ctx.restore();
    }
}

export function createStageGothicBell(deps, shared) {
    return new StageGothicBell(deps, shared);
}
