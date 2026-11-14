class StageSingularity {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.RIFT = Object.freeze({ air: 120, open: 110, grow: 90, shut: 200, motes: 26, pull: 420, spike: 1.1, spikeDy: 10, spikeSide: 6, spikeStep: 25, spikeScale: 0.75, collapseDy: -40, collapseScale: 0.85 });
        this.riftFaces = new Map();
        this.riftMotes = new WeakMap();
        this.riftWidth = (t, close) => Math.min(1, t / this.RIFT.open) * (t < close ? 1 : Math.max(0, 1 - (t - close) / this.RIFT.shut));
    }

    /** 틈이 선 칸: 가운데 줄, 위아래 끝(바닥 밖으로는 나가지 않는다: 시뮬레이터의 FT + 2, FB - 2). */
    riftSpan(event) {
        const rows = Number(this.deps.getCombatGridSize().rows) || 1e3, edge = 2 / this.shared.K.DEEP, top = Math.max(edge - 0.5, event.riftTop);
        return { column: event.riftColumn, top, bottom: Math.max(top, Math.min(rows - 0.5 - edge, event.riftBottom)) };
    }

    /** 틈의 세로 범위(위 끝 칸의 발에서 도트): 바닥 위 120도트 허공부터 아래 끝까지, 가운데에서 0.09초에 위아래로 갈라진다. */
    riftZone(t, span, w) {
        const bottom = (span.bottom - span.top) * this.shared.K.DEEP, mid = (bottom - this.RIFT.air) / 2, half = (bottom + this.RIFT.air) / 2 * Math.min(1, t / this.RIFT.grow);
        return { w, mid, ya: mid - half, yb: mid + half, bottom };
    }

    riftMotesOf(event, bottom) {
        if (!this.riftMotes.has(event)) {
            const r = this.deps.stageSkillStrokes.random(Math.floor(event.riftColumn * 7 * this.shared.K.WIDE + event.riftTop * this.shared.K.DEEP) + 7919), close = event.riftClose;
            this.riftMotes.set(event, Array.from({ length: this.RIFT.motes }, () => ({ y: -this.RIFT.air + r() * (bottom + this.RIFT.air), side: r() < 0.5 ? -1 : 1, d0: 26 + r() * 44, t0: r() * close * 0.8, sp: 0.6 + r() * 0.6 })));
        }
        return this.riftMotes.get(event);
    }

    /** 흔들리는 검은 속, 보라 테두리, 바깥 그늘(두 도트 줄마다). 닫힐 때 가늘어진다. */
    riftCore(ctx, t, z, ink) {
        for (let y = Math.round(z.ya); y <= z.yb; y += 2) {
            const j = Math.sin(y * 0.21 + t * 0.012) * 1.6 + Math.sin(y * 0.07 - t * 0.006) * 2.2, X = Math.round(j * z.w), core = Math.max(1, Math.round(4 * z.w)), edge = core + 2;
            ctx.globalAlpha = 0.35 * z.w; ctx.fillStyle = ink.c3; ctx.fillRect(X - edge - 5, y, (edge + 5) * 2, 2);
            ctx.globalAlpha = 0.95 * z.w; ctx.fillStyle = ink.c2; ctx.fillRect(X - edge, y, edge * 2, 2);
            ctx.fillStyle = '#07040d'; ctx.fillRect(X - core + 1, y, Math.max(1, core * 2 - 2), 2);
        }
    }

    /** 둘레의 조각이 틈으로 빨려 든다. */
    riftPull(ctx, t, motes, z, ink) {
        for (const m of motes) {
            const u = (t - m.t0) / (this.RIFT.pull * m.sp);
            if (u < 0 || u > 1 || m.y < z.ya || m.y > z.yb) continue;
            ctx.globalAlpha = 0.8 * z.w * (1 - u * 0.4); ctx.fillStyle = u > 0.7 ? ink.c1 : ink.c2;
            ctx.fillRect(Math.round(m.side * m.d0 * (1 - u) * (1 - u)), Math.round(m.y + Math.sin(u * 3) * 3), 2, 1);
        }
    }

    /** 닫히는 순간 가운데의 빛 십자. */
    riftGlint(ctx, t, close, z, ink) {
        if (t <= close - 60 || t >= close + 120) return;
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(t - close - 30) / 90) * 0.9; ctx.fillStyle = ink.c1;
        ctx.fillRect(-1, Math.round(z.mid) - 6, 3, 12); ctx.fillRect(-5, Math.round(z.mid) - 1, 11, 3);
    }

    /** 바닥: 틈 아래의 옅은 그늘(바닥 층). */
    riftShade(ctx, p, now, event) {
        const t = now - event.at, w = t < 0 ? 0 : this.riftWidth(t, event.riftClose);
        if (w <= 0) return;
        const span = this.riftSpan(event), z = this.riftZone(t, span, w), from = Math.max(z.ya, 0);
        this.shared.inDots(ctx, this.shared.K.screen(p, { gx: span.column, gy: span.top }), () => {
            ctx.globalAlpha = 0.25 * w; ctx.fillStyle = this.shared.inkOf(event.element, 'chaos').c3;
            ctx.fillRect(-10, Math.round(from), 20, Math.max(0, Math.round(z.yb - from)));
        });
    }

    /** 세로로 갈라진 틈: 열리고(0.11초), 빨아들이고, riftClose에 닫히며 0.2초에 가늘어진다. */
    rift(c) {
        const event = c.event, t = c.view.now - event.at;
        if (c.first) { this.riftFaces.set(event.channelId, event.riftFace); if (this.riftFaces.size > 32) this.riftFaces.delete(this.riftFaces.keys().next().value); }
        this.shared.groundLayer(c, this.riftShade.bind(this));
        const w = t < 0 ? 0 : this.riftWidth(t, event.riftClose);
        if (w <= 0) return true;
        const span = this.riftSpan(event), z = this.riftZone(t, span, w), ctx = c.view.ctx, ink = this.shared.inkOf(c.element, 'chaos');
        this.shared.inDots(ctx, this.shared.K.screen(c.view.projection, { gx: span.column, gy: span.top }), () => {
            this.riftCore(ctx, t, z, ink);
            this.riftPull(ctx, t, this.riftMotesOf(event, z.bottom), z, ink);
            this.riftGlint(ctx, t, event.riftClose, z, ink);
        });
        return true;
    }

    /** 특이점 붕괴: 틈 가운데의 붕괴 클립과, 틈을 따라 1.1칸마다 좌우로 엇갈려 솟는 클립. */
    collapse(c) {
        if (!c.first) return true;
        const span = this.riftSpan(c.event), map = c.gem.map, face = this.riftFaces.get(c.event.channelId) || c.look.face, ramp = c.look.ramp;
        this.riftFaces.delete(c.event.channelId);
        if (map.collapse) this.deps.stageSkillVfx.play(map.collapse, this.shared.K.at({ gx: span.column, gy: (span.top + span.bottom) / 2 }, 0, this.RIFT.collapseDy), { face, scale: this.RIFT.collapseScale, ramp });
        for (let k = 0; map.spike && span.top + k * this.RIFT.spike + this.RIFT.spikeDy / this.shared.K.DEEP <= span.bottom; k++) {
            const side = k % 2 ? 1 : -1;
            this.deps.stageSkillVfx.play(map.spike, this.shared.K.at({ gx: span.column, gy: span.top + k * this.RIFT.spike }, side * this.RIFT.spikeSide, this.RIFT.spikeDy + this.shared.standDy(map.spike)), { face: side, delay: k * this.RIFT.spikeStep, scale: this.RIFT.spikeScale, ramp });
        }
        return true;
    }
}

export function createStageSingularity(deps, shared) {
    return new StageSingularity(deps, shared);
}
