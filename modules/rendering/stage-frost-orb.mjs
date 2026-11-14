class StageFrostOrb {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.ORB = Object.freeze({ lift: 50, fadeIn: 80, fadeOut: 140, muzzle: Object.freeze([26, -52]), nova: 0.9, spin: 6.5, boltSink: 26, boltLow: 20, boltIn: 40 });
        this.orbLength = event => event.orbReach / event.orbSpeed * 1000;
        this.orbFade = (t, length) => (t >= length ? Math.max(0, 1 - (t - length) / this.ORB.fadeOut) : Math.min(1, t / this.ORB.fadeIn));
    }

    /** 구체가 그때 있는 칸: 떠난 칸에서 그 방향으로 초당 orbSpeed칸, orbReach칸까지. */
    orbSpot(event, now) {
        const k = this.shared.clamp(now - event.at, 0, this.orbLength(event)) / 1000 * event.orbSpeed;
        return { gx: event.orbFrom.gx + Math.cos(event.orbAngle) * k, gy: event.orbFrom.gy + Math.sin(event.orbAngle) * k };
    }

    /** 쏘는 순간 손 앞의 섬광(첫 구체만: 시전 한 번에 하나)과 끝자리에서 터지는 서리 고리. */
    orbStart(c) {
        const event = c.event, map = c.gem.map;
        if (!event.orbSeed && map.muzzle) {
            const face = Math.sign(Math.cos(event.orbAngle)) || c.look.face;
            this.deps.stageSkillVfx.play(map.muzzle, this.shared.K.at(event.orbFrom, face * this.ORB.muzzle[0], this.ORB.muzzle[1]), { face, ramp: c.look.ramp });
        }
        if (map.nova) this.deps.stageSkillVfx.play(map.nova, this.shared.K.at(this.orbSpot(event, event.at + this.orbLength(event)), 0, -this.ORB.lift), { face: 1, scale: this.ORB.nova, ramp: c.look.ramp, delay: Math.max(0, event.orbNovaAt - c.view.now) });
    }

    /** 바닥 그림자(바닥 층). */
    orbShadow(ctx, p, now, event) {
        const t = now - event.at, fade = this.orbFade(t, this.orbLength(event));
        if (t < 0 || fade <= 0) return;
        this.shared.inDots(ctx, this.shared.K.screen(p, this.orbSpot(event, now)), () => {
            ctx.globalAlpha = 0.3 * fade; ctx.fillStyle = '#0a0810';
            ctx.beginPath(); ctx.ellipse(0, 1, 9, 3, 0, 0, this.shared.TAU); ctx.fill();
        });
    }

    /** 구체: 옅은 빛 두 겹, 돌아가는 서리 가시 여섯(긴 것과 짧은 것 번갈아), 세 겹 속과 흰 반짝임. */
    orbBody(ctx, t, fade, ink) {
        const Y = -this.ORB.lift, rot = t / 1000 * this.ORB.spin, put = (x, y, colour) => { ctx.fillStyle = colour; ctx.fillRect(x, Y + y, 1, 1); };
        ctx.globalAlpha = 0.26 * fade; this.shared.disc(ctx, 0, Y, 17, ink.c3);
        ctx.globalAlpha = 0.42 * fade; this.shared.disc(ctx, 0, Y, 11, ink.c2);
        ctx.globalAlpha = fade;
        for (let i = 0; i < 6; i++) this.orbSpike(rot + i * Math.PI / 3, i % 2 ? 15 : 21, ink, put);
        this.shared.disc(ctx, 0, Y, 7, ink.c3);
        this.shared.disc(ctx, 0, Y, 6, ink.c2);
        this.shared.disc(ctx, -1, Y - 1, 4, ink.c1);
        ctx.fillStyle = '#f6fcff'; ctx.fillRect(-3, Y - 3, 3, 2);
        ctx.globalAlpha = 1;
    }

    orbSpike(a, r1, ink, put) {
        for (let s = 6; s <= r1; s++) put(Math.round(Math.cos(a) * s), Math.round(Math.sin(a) * s), s >= r1 - 1 ? ink.c1 : ink.c2);
        const bx = Math.round(Math.cos(a) * (r1 - 4)), by = Math.round(Math.sin(a) * (r1 - 4)), nx = Math.round(Math.cos(a + Math.PI / 2) * 2), ny = Math.round(Math.sin(a + Math.PI / 2) * 2);
        put(bx + nx, by + ny, ink.c2); put(bx - nx, by - ny, ink.c2);
    }

    /** 서리 화살: 구체가 쏜 화살마다 쏜 자리에서 그 방향으로 사거리 끝이나 맞힌 때까지 난다. 날며 조금씩 낮아진다. */
    orbBolts(ctx, p, event, now, ink) {
        for (const bolt of event.orbBolts || []) {
            const t = now - bolt.at;
            if (t < 0 || now >= Math.min(bolt.until, bolt.at + event.boltLife)) continue;
            const k = t / 1000 * event.boltSpeed, spot = { gx: bolt.gx + Math.cos(bolt.angle) * k, gy: bolt.gy + Math.sin(bolt.angle) * k };
            this.shared.inDots(ctx, this.shared.K.screen(p, spot), () => this.orbStreak(ctx, bolt.angle, { h: Math.max(this.ORB.boltLow, this.ORB.lift - this.ORB.boltSink * t / 1000), alpha: Math.min(1, t / this.ORB.boltIn) }, ink));
        }
    }

    orbStreak(ctx, angle, z, ink) {
        const ux = Math.cos(angle), uy = Math.sin(angle) * 0.5, n = Math.hypot(ux, uy) || 1, Y = -z.h;
        const line = (back, width, colour, alpha) => {
            ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = width;
            ctx.beginPath(); ctx.moveTo(Math.round(-ux / n * back) + 0.5, Math.round(Y - uy / n * back) + 0.5); ctx.lineTo(0.5, Math.round(Y) + 0.5); ctx.stroke();
        };
        line(14, 3, ink.c3, 0.55 * z.alpha);
        line(10, 2, ink.c2, z.alpha);
        ctx.fillStyle = ink.c1; ctx.fillRect(-1, Math.round(Y) - 1, 3, 3);
        ctx.globalAlpha = 1;
    }

    /** 구체 하나의 사건: 떠난 때부터 끝에서 옅어질 때까지 구체를, 그동안 쏜 서리 화살을 그린다. */
    frozenOrb(c) {
        const event = c.event, now = c.view.now, t = now - event.at;
        if (c.first) this.orbStart(c);
        this.shared.groundLayer(c, this.orbShadow.bind(this));
        if (t < 0) return true;
        const ctx = c.view.ctx, p = c.view.projection, ink = this.shared.inkOf(c.element, 'cold'), fade = this.orbFade(t, this.orbLength(event));
        ctx.save();
        if (fade > 0) this.shared.inDots(ctx, this.shared.K.screen(p, this.orbSpot(event, now)), () => this.orbBody(ctx, t, fade, ink));
        this.orbBolts(ctx, p, event, now, ink);
        ctx.restore();
        return true;
    }
}

export function createStageFrostOrb(deps, shared) {
    return new StageFrostOrb(deps, shared);
}
