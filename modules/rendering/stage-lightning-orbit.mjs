class StageLightningOrbit {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.ORBIT = Object.freeze({ spin: 2.3, rx: 38, perOrb: 1.6, most: 10, ry: 15, high: 56, bob: 7, grow: 160, blink: 1200, blinkStep: 110, hot: 140 });
        this.orbitKnown = new WeakSet();
        this.orbitBorn = new WeakMap();
        this.orbitEvent = null;
        this.orbitInk = element => this.shared.inkOf(element === 'prism' ? 'light' : element, 'light');
        this.ZAP = Object.freeze({ body: 50, step: 40, glow: 170, glowR: 12, knot: 0.7, knotAlpha: 0.9, back: 4 });
    }

    /** 지금 보이는 구체들(배열 차례 그대로). */
    orbitShown(event, now) {
        const shown = (event.orbitOrbs || []).filter(orb => now < orb.until && (orb.born <= now || this.orbitKnown.has(orb)));
        shown.forEach(orb => { if (orb.born <= now) this.orbitKnown.add(orb); });
        return shown;
    }

    /** n개 가운데 j번째 구체의 자리(주인공 발에서 도트), 높이, 각. 개수가 늘면 둘레가 조금 넓어진다. */
    orbitPlace(n, j, orb, now) {
        const a = now / 1000 * this.ORBIT.spin + j / n * this.shared.TAU, rx = this.ORBIT.rx + Math.min(n, this.ORBIT.most) * this.ORBIT.perOrb;
        return { x: Math.cos(a) * rx, y: Math.sin(a) * this.ORBIT.ry, h: this.ORBIT.high + Math.sin(a * 2 + orb.seed) * this.ORBIT.bob, a };
    }

    /** 한 층의 구체들: 주인공보다 깊은 쪽 반은 바닥 층에(몸 뒤로 돈다), 앞쪽 반은 위 층에. 그려진 주인공을 따라간다. */
    orbitPass(ctx, p, now, event, front) {
        const shown = this.orbitShown(event, now), hero = this.shared.K.screen(p, this.shared.K.heroDrawn()), ink = this.orbitInk(event.element);
        shown.forEach((orb, j) => {
            const place = this.orbitPlace(shown.length, j, orb, now);
            if ((Math.sin(place.a) >= 0) !== front) return;
            this.shared.inDots(ctx, { x: hero.x + place.x * hero.dot, y: hero.y + (place.y - place.h) * hero.dot, dot: hero.dot }, () => this.orbitBall(ctx, orb, now, { ink, back: !front }));
        });
    }

    /** 구체: 빛 테(막 쏜 0.14초는 크게), 속, 흰 심, 둘레의 정전기. 생길 때 0.16초에 자라고 끝나기 1.2초 전부터 깜빡인다. 뒤쪽은 조금 어둡다. */
    orbitBall(ctx, orb, now, z) {
        const left = orb.until - now, age = now - orb.born;
        if (left < this.ORBIT.blink && Math.floor(left / this.ORBIT.blinkStep) % 2) return;
        const s = age < 0 ? 1 : Math.min(1, age / this.ORBIT.grow), hot = now - orb.flashAt < this.ORBIT.hot, ink = z.ink;
        ctx.globalAlpha = (z.back ? 0.55 : 0.8) * s; this.shared.disc(ctx, 0, 0, (hot ? 8 : 6) * s, ink.c3);
        ctx.globalAlpha = (z.back ? 0.7 : 1) * s; this.shared.disc(ctx, 0, 0, 4 * s, ink.c2);
        ctx.fillStyle = ink.c1; ctx.fillRect(-1, -2, 2, 3); ctx.fillRect(-2, -1, 4, 1);
        this.orbitStatic(ctx, orb, now, (hot ? 0.95 : 0.6) * s, ink.c1);
        ctx.globalAlpha = 1;
    }

    /** 둘레에서 튀는 짧은 정전기 두 가닥(0.08초마다 바뀐다). */
    orbitStatic(ctx, orb, now, alpha, colour) {
        const r = this.deps.stageSkillStrokes.random(Math.floor(now / 80) + Math.floor(orb.seed * 13));
        ctx.strokeStyle = colour; ctx.lineWidth = 1; ctx.globalAlpha = alpha;
        for (let k = 0; k < 2; k++) {
            const a = r() * this.shared.TAU;
            let x = Math.cos(a) * 4, y = Math.sin(a) * 4;
            ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
            for (let j = 0; j < 3; j++) { x += Math.cos(a) * 3 + (r() - 0.5) * 4; y += Math.sin(a) * 3 + (r() - 0.5) * 4; ctx.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); }
            ctx.stroke();
        }
    }

    /** 시전마다(구체가 새로 생기거나 가장 오래된 구체를 다시 채울 때) 손 앞의 작은 번개 불꽃(시뮬레이터 doOrbit의 spark). */
    orbitSpark(c, now) {
        const last = this.orbitBorn.has(c.event) ? this.orbitBorn.get(c.event) : -Infinity;
        const born = (c.event.orbitOrbs || []).map(orb => orb.born).filter(at => at <= now && at > last);
        if (!born.length) return;
        this.orbitBorn.set(c.event, Math.max(...born));
        const face = this.shared.K.heroFace(), ink = this.orbitInk(c.element);
        this.deps.stageSkillVfx.paint(this.shared.K.at(this.shared.K.heroDrawn(), face * 22, -66), { life: 260 }, (ctx, t, dot) => this.castSpark(ctx, t / 260, dot, ink));
    }

    /** 커지며 옅어지는 빛 십자, 네 귀의 점, 가운데 네모. */
    castSpark(ctx, k, dot, ink) {
        const r = 4 + Math.round(k * 7), q = Math.round(r * 0.6);
        ctx.scale(dot, dot);
        ctx.globalAlpha = 1 - k; ctx.fillStyle = ink.c1;
        ctx.fillRect(-r, 0, 2 * r + 1, 1); ctx.fillRect(0, -r, 1, 2 * r + 1);
        [[-q, -q], [q, -q], [-q, q], [q, q]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
        ctx.fillStyle = ink.c2; ctx.fillRect(-2, -2, 5, 5);
    }

    /** 도는 구체들의 긴 사건: 앞쪽 구체는 여기서, 뒤쪽 구체는 바닥 층에 그린다. */
    orbit(c) {
        const event = c.event, now = c.view.now;
        this.orbitEvent = event;
        this.shared.groundLayer(c, (ctx, p, time) => this.orbitPass(ctx, p, time, event, false));
        if (now < event.at) return true;
        this.orbitSpark(c, now);
        c.view.ctx.save();
        this.orbitPass(c.view.ctx, c.view.projection, now, event, true);
        c.view.ctx.restore();
        return true;
    }

    /** 그 구체가 지금 그려진 화면 자리(사라졌으면 null). */
    orbitAt(p, seed, now) {
        const shown = this.orbitEvent ? this.orbitShown(this.orbitEvent, now) : [], j = shown.findIndex(orb => orb.seed === seed);
        if (j < 0) return null;
        const place = this.orbitPlace(shown.length, j, shown[j], now), hero = this.shared.K.screen(p, this.shared.K.heroDrawn());
        return { x: hero.x + place.x * hero.dot, y: hero.y + (place.y - place.h) * hero.dot };
    }

    /** 번개 클립을 두 점 사이에 이어 붙인다(시뮬레이터 vfxSeg): 마디마다 0.04초씩 앞선 장, 끝에서 클립의 옅어짐. */
    zapClip(ctx, ref, z) {
        const dot = z.to.dot, w = this.deps.stageSkillVfx.clipWidth(ref) * dot, dx = z.to.x - z.from.x, dy = z.to.y - z.from.y, length = Math.hypot(dx, dy), n = Math.max(1, Math.round(length / w));
        const tail = (this.deps.stageSkillVfx.clipOf(ref) || {}).fadeOut || 0;
        ctx.globalAlpha *= tail ? this.shared.clamp((z.life - z.t) / tail, 0, 1) : 1;
        ctx.translate(z.from.x, z.from.y);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.scale(length / (n * w), 1);
        for (let i = 0; i < n; i++) this.deps.stageSkillVfx.stamp(ctx, ref, z.t + i * this.ZAP.step, { x: i * w, y: 0, dot, face: 1 });
    }

    /** 맞은 자리(시뮬레이터 projImpact의 연쇄 타격): pixelfx 전기 매듭 클립과 0.17초의 옅은 빛. */
    zapHit(c, target, side) {
        const element = c.element === 'prism' ? 'light' : c.element, ink = this.orbitInk(element), at = this.shared.K.at(target, -side * this.ZAP.back, -this.ZAP.body);
        this.deps.stageSkillVfx.play(`pfx_zaphit@${element === 'light' ? '=' : c.look.ramp}`, at, { face: side, scale: this.ZAP.knot, alpha: this.ZAP.knotAlpha });
        this.deps.stageSkillVfx.paint(at, { life: this.ZAP.glow }, (ctx, t, dot) => {
            const r = this.ZAP.glowR * dot, glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            glow.addColorStop(0, ink.c2); glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.34 * (1 - t / this.ZAP.glow);
            ctx.fillStyle = glow; ctx.fillRect(-r, -r, r * 2, r * 2);
        });
    }

    /** 정전기: 쏜 구체가 지금 그려진 자리에서 맞은 적의 몸까지 번개 클립. 구체가 도는 동안 시작점이 따라간다. */
    zap(c) {
        if (!c.first) return true;
        const event = c.event, target = event.targetCells[0], ref = c.gem.map.zap, offset = c.view.now - this.deps.stageSkillVfx.now();
        const first = this.orbitAt(c.view.projection, event.orbSeed, c.view.now), aim = this.shared.K.screen(c.view.projection, target);
        let from = first;
        if (ref) {
            const life = this.deps.stageSkillVfx.clipLength(ref);
            this.shared.screenRow({ life, layer: 'top' }, (ctx, p, t) => {
                from = this.orbitAt(p, event.orbSeed, this.deps.stageSkillVfx.now() + offset) || from;
                const to = this.shared.K.screen(p, target);
                to.y -= this.ZAP.body * to.dot;
                if (from) this.zapClip(ctx, ref, { from, to, t, life });
            });
        }
        this.zapHit(c, target, (first && Math.sign(aim.x - first.x)) || c.look.face);
        return true;
    }
}

export function createStageLightningOrbit(deps, shared) {
    return new StageLightningOrbit(deps, shared);
}
