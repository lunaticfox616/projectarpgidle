import { scaleForStageArt } from '../common/stage-art-scale.mjs';

class StageVoidPossession {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.VOID = Object.freeze({ shrink: 320, fade: 100, life: 420, motes: 18, mote: 300, rise: 30, spiritLift: -60, bodyLift: -50, spiritScale: 0.6, spiritAlpha: 0.85, ringScale: 0.8, ringGrow: 0.12 });
        this.voidMotes = new WeakMap();
        this.voidSize = event => ({ A: (event.voidRadius + 0.5) * this.shared.K.WIDE, B: (event.voidRadius + 0.5) * this.shared.K.DEEP });
        this.voidAlpha = t => (t < this.VOID.shrink ? 0.8 : Math.max(0, 0.8 - (t - this.VOID.shrink) / this.VOID.fade * 0.8));
        this.WEAK = Object.freeze({ fadeIn: 150, fadeOut: 800, head: 104, over: 26, breath: 160, smoke: 6, smokeRise: 78, smokeMs: 900, souls: 3, soulSpin: 3.2 });
        this.weakAlpha = (row, now) => Math.min(1, (row.expiresAt - now) / this.WEAK.fadeOut) * Math.min(1, (now - row.appliedAt) / this.WEAK.fadeIn);
    }

    voidMotesOf(event) {
        if (!this.voidMotes.has(event)) {
            const r = this.deps.stageSkillStrokes.random(Math.floor(event.voidCenter.gx * this.shared.K.WIDE + event.voidCenter.gy * this.shared.K.DEEP) + 4099);
            this.voidMotes.set(event, Array.from({ length: this.VOID.motes }, () => ({ a: r() * this.shared.TAU, k: 0.7 + r() * 0.3, t0: r() * 120 })));
        }
        return this.voidMotes.get(event);
    }

    /** 바닥: 둘레에서 몸 쪽으로 오그라드는 점선 고리와 옅은 그늘(바닥 층). */
    voidDots(ctx, p, now, event) {
        const t = now - event.at;
        if (t < 0 || t > this.VOID.life) return;
        const u = Math.min(1, t / this.VOID.shrink), size = this.voidSize(event), A = size.A * (1 - u * 0.8), B = size.B * (1 - u * 0.8), a = this.voidAlpha(t), ink = this.shared.inkOf(event.element, 'chaos');
        this.shared.inDots(ctx, this.shared.K.screen(p, event.voidCenter), () => {
            ctx.globalAlpha = a * 0.7; ctx.fillStyle = ink.c2;
            for (let i = 0; i < 40; i += 2) { const q = i / 40 * this.shared.TAU + u * 0.8; ctx.fillRect(Math.round(Math.cos(q) * A), Math.round(Math.sin(q) * B), 2, 1); }
            ctx.globalAlpha = a * 0.18; ctx.fillStyle = ink.c3;
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, A), Math.max(1, B), 0, 0, this.shared.TAU); ctx.fill();
        });
    }

    /** 둘레의 조각이 몸 쪽으로 빨려 들며 떠오른다. */
    voidPullMotes(ctx, t, z, ink) {
        for (const m of z.motes) {
            const v = this.shared.clamp((t - m.t0) / this.VOID.mote, 0, 1);
            if (v <= 0 || v >= 1) continue;
            const d = (1 - v) * m.k;
            ctx.globalAlpha = 0.85 * (1 - v * 0.5); ctx.fillStyle = v > 0.6 ? ink.c1 : ink.c2;
            ctx.fillRect(Math.round(Math.cos(m.a) * z.A * d), Math.round(Math.sin(m.a) * z.B * d - this.VOID.rise * v), 2, 2);
        }
    }

    /** 외침: 발밑의 공허 고리 클립(시뮬레이터처럼 몸 높이, 바닥 층), 오그라드는 점선 고리, 빨려 드는 조각. */
    voidPull(c) {
        const event = c.event, t = c.view.now - event.at, map = c.gem.map;
        if (c.first && map.ring) this.deps.stageSkillVfx.play(map.ring, this.shared.K.at(event.voidCenter, 0, this.shared.standDy(map.ring)), { face: c.look.face, layer: 'ground', scale: this.VOID.ringScale + event.voidRadius * this.VOID.ringGrow, ramp: c.look.ramp });
        this.shared.groundLayer(c, this.voidDots.bind(this));
        if (t < 0 || t > this.VOID.life) return true;
        const ctx = c.view.ctx, size = this.voidSize(event);
        this.shared.inDots(ctx, this.shared.K.screen(c.view.projection, event.voidCenter), () => this.voidPullMotes(ctx, t, { motes: this.voidMotesOf(event), A: size.A, B: size.B }, this.shared.inkOf(c.element, 'chaos')));
        return true;
    }

    /** 공허의 혼: 쓴 사람의 머리 위에서 그 적의 몸까지 사건의 시간 동안 날아간다. */
    voidSpirit(c) {
        if (!c.first || !c.gem.map.spirit) return true;
        const from = c.event.sourceCell, to = c.event.landingCell, face = Math.sign(to.gx - from.gx) || 1;
        this.deps.stageSkillVfx.play(c.gem.map.spirit, this.shared.K.at(from, 0, this.VOID.spiritLift), { face, scale: this.VOID.spiritScale, alpha: this.VOID.spiritAlpha, ramp: c.look.ramp,
            move: { dx: (to.gx - from.gx) * this.shared.K.WIDE, dy: (to.gy - from.gy) * this.shared.K.DEEP + this.VOID.bodyLift - this.VOID.spiritLift, ms: Math.max(1, c.event.duration) } });
        return true;
    }

    /** 약화된 적마다(살아 있고 아직 풀리지 않은 적만, 프레임마다 id로 찾는다) draw(적, 줄). */
    weakEach(event, now, draw) {
        for (const row of event.voidTargets || []) {
            const enemy = this.shared.K.enemy(row.id);
            if (enemy && enemy.hp > 0 && now >= row.appliedAt && now < row.expiresAt) draw(enemy, row);
        }
    }

    /** 혼 세 점의 높이(발에서 도트): 시뮬레이터의 104, 그보다 큰 적은 체력 막대 위로(몸 위 26도트). */
    weakHead(enemy) {
        const size = this.deps.stageRoster.bodySize(enemy, 64);
        return Math.max(this.WEAK.head, size ? size.h / scaleForStageArt(64, this.deps.STAGE_VIEW.heroTile) + this.WEAK.over : 0);
    }

    /** 몸을 타고 오르는 공허 연기, 머리 위를 도는 혼 세 점, 아래로 향한 작은 화살표. */
    weakMark(ctx, z, ink) {
        const Yh = -z.head, rot = z.t / 1000 * this.WEAK.soulSpin;
        for (let k = 0; k < this.WEAK.smoke; k++) {
            const u = (z.t / this.WEAK.smokeMs + k / this.WEAK.smoke) % 1;
            ctx.globalAlpha = 0.5 * z.a * Math.sin(u * Math.PI); ctx.fillStyle = k % 2 ? ink.c2 : ink.c3;
            ctx.fillRect(Math.round(Math.sin(u * 9 + k) * 7) - 1, Math.round(-8 - u * this.WEAK.smokeRise), 3, 4);
        }
        for (let i = 0; i < this.WEAK.souls; i++) {
            const q = rot + i * 2.094;
            ctx.globalAlpha = (Math.sin(q) > 0 ? 0.95 : 0.55) * z.a; ctx.fillStyle = i ? ink.c2 : ink.c1;
            ctx.fillRect(Math.round(Math.cos(q) * 10) - 2, Math.round(Yh + Math.sin(q) * 4) - 2, 4, 4);
        }
        ctx.globalAlpha = 0.7 * z.a; ctx.fillStyle = ink.c2;
        ctx.fillRect(-2, Yh + 6, 5, 1); ctx.fillRect(-1, Yh + 7, 3, 1); ctx.fillRect(0, Yh + 8, 1, 1);
    }

    /** 바닥: 약화된 적의 발밑에 숨 쉬듯 짙어졌다 옅어지는 보라 그늘(바닥 층). */
    weakShadows(ctx, p, now, event) {
        const ink = this.shared.inkOf(event.element, 'chaos');
        this.weakEach(event, now, (enemy, row) => this.shared.inDots(ctx, this.shared.K.screen(p, this.shared.K.enemySpot(enemy)), () => {
            ctx.globalAlpha = (0.22 + 0.08 * Math.sin((now - row.appliedAt) / this.WEAK.breath)) * this.weakAlpha(row, now); ctx.fillStyle = ink.c3;
            ctx.beginPath(); ctx.ellipse(0, 1, 15, 5, 0, 0, this.shared.TAU); ctx.fill();
        }));
    }

    /** 약화(빙의) 표시의 긴 사건: 끝나기 0.8초 전부터 옅어진다. */
    voidWeak(c) {
        const ctx = c.view.ctx, p = c.view.projection, now = c.view.now, ink = this.shared.inkOf(c.element, 'chaos');
        this.shared.groundLayer(c, this.weakShadows.bind(this));
        this.weakEach(c.event, now, (enemy, row) => this.shared.inDots(ctx, this.shared.K.screen(p, this.shared.K.enemySpot(enemy)), () => this.weakMark(ctx, { t: now - row.appliedAt, a: this.weakAlpha(row, now), head: this.weakHead(enemy) }, ink)));
        return true;
    }
}

export function createStageVoidPossession(deps, shared) {
    return new StageVoidPossession(deps, shared);
}
