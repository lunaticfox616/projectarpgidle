// Elemental impact art and timing preserved from canvas-attack-fx.js.
import { rgba, clamp01, TAU, mix } from './math.mjs';
import { particleAlpha } from './particle-state.mjs';

const GLOW_UNIT = 64;

const RADIAL_STOPS = {
    glowdot: { radiusMul: 2.4, list: [[0, 1], [0.4, 0.6], [1, 0]] },
    smoke: { radiusMul: 1, list: [[0, 0.5], [0.6, 0.22], [1, 0]] }
};

// Canvas gradients belong to this painter and are dropped on context replacement.
export class AttackParticlePainter {
    constructor() { this.cache = new Map(); this.context = null; }
    dispose() { this.cache.clear(); this.context = null; }
    drawSparkParticle(g, p, col, a, size) {
        let bx;
        let by;
        if (p.hist && p.hist.length >= 4) {
            bx = p.hist[0]; by = p.hist[1];
        } else {
            const sp = Math.hypot(p.vx, p.vy) || 1;
            bx = p.x - (p.vx / sp) * size * 5;
            by = p.y - (p.vy / sp) * size * 5;
        }
        g.strokeStyle = rgba(col, a);
        g.lineWidth = size;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(p.x, p.y);
        g.stroke();
    }

    getCachedRadialGradient(g, stopsId, stops, col, a) {
        // 컨텍스트(캔버스)가 교체되면 캐시한 그라디언트는 더 이상 유효하지 않을 수 있다.
        if (g !== this.context) { this.cache.clear(); this.context = g; }
        let ab = Math.round(clamp01(a) * 24);
        let cr = col[0] & ~7, cg = col[1] & ~7, cb = col[2] & ~7;
        let key = stopsId + (((cr << 16) | (cg << 8) | cb) * 32 + ab);
        let cached = this.cache.get(key);
        if (cached) return cached;
        let aa = ab / 24;
        let grd = g.createRadialGradient(0, 0, 0, 0, 0, GLOW_UNIT);
        for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], `rgba(${cr},${cg},${cb},${(aa * stops[i][1]).toFixed(3)})`);
        if (this.cache.size > 4096) this.cache.clear();
        this.cache.set(key, grd);
        return grd;
    }

    drawRadialParticle(g, p, style, stopsId) {
        const { col, a, size } = style;
        const stops = RADIAL_STOPS[stopsId];
        const r = size * stops.radiusMul;
        if (r <= 0) return;
        const grd = this.getCachedRadialGradient(g, stopsId, stops.list, col, a);
        const s = r / GLOW_UNIT;
        g.save();
        g.translate(p.x, p.y);
        g.scale(s, s);
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, 0, GLOW_UNIT, 0, TAU);
        g.fill();
        g.restore();
    }

    drawPolyParticle(g, p, col, a, polygon) {
        const { pts, fillMul } = polygon;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = rgba(col, a * fillMul);
        g.beginPath();
        pts.forEach((pt, i) => (i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])));
        g.closePath();
        g.fill();
        g.restore();
    }

    drawParticle(g, p) {
        const a = particleAlpha(p);
        if (a <= 0.004) return;
        const k = clamp01(p.age / p.life);
        const size = Math.max(0.1, p.size * (1 + p.grow * k));
        const col = p.c1 ? mix(p.c0, p.c1, k) : p.c0;
        switch (p.shape) {
            case 'spark': this.drawSparkParticle(g, p, col, a, size); break;
            case 'glowdot': this.drawRadialParticle(g, p, { col, a, size }, 'glowdot'); break;
            case 'smoke': this.drawRadialParticle(g, p, { col, a, size }, 'smoke'); break;
            case 'shard': this.drawPolyParticle(g, p, col, a, { pts: [[0, -size * 1.6], [size * 0.7, 0], [0, size * 1.2], [-size * 0.7, 0]], fillMul: 0.9 }); break;
            case 'debris': this.drawPolyParticle(g, p, col, a, { pts: [[-size, -size * 0.6], [size, -size], [size * 0.7, size], [-size * 0.8, size * 0.7]], fillMul: 1 }); break;
            default:
                g.fillStyle = rgba(col, a);
                g.beginPath();
                g.arc(p.x, p.y, size, 0, TAU);
                g.fill();
        }
    }
}
