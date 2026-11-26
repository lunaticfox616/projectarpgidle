/** 기공파(98, 2026-11-26 스킬 전달본 V3.25 ki-wave.js): 손바닥에서 은청색 압축파가 나간다. 날아가는 몸, 손 앞의 충격 고리, 맞은 자리의 터짐은
 * 모두 나아가는 쪽(투사체의 방향)을 따른다. 물리면 은청색, 속성이 바뀌면 그 속성 색 셋에서 고른 여섯 색이다. 몸은 80×34 도트를 네 장 그려 두고 돌린다. */
const PHYSICAL = Object.freeze({ ink: '#172328', shadow: '#34575a', body: '#5f8985', streak: '#9ebdb6', edge: '#c5ded0', gleam: '#e8f0df' });
const SPOKES = Object.freeze([[30, -10], [37, -5], [40, 2], [28, 12], [15, -22], [13, 23], [-9, -15], [-12, 14]]);
const clamp = value => Math.max(0, Math.min(1, value));

class StageKiWave {
    constructor(deps) {
        this.deps = deps;
        this.frames = new Map();
        this.tones = new Map();
    }

    mix(a, b, ratio) {
        return '#' + [1, 3, 5].map(at => { const from = Number.parseInt(a.slice(at, at + 2), 16), to = Number.parseInt(b.slice(at, at + 2), 16); return Math.round(from + (to - from) * ratio).toString(16).padStart(2, '0'); }).join('');
    }

    toneOf(element) {
        if (!element || element === 'phys') return PHYSICAL;
        if (!this.tones.has(element)) {
            const { c1, c2, c3 } = this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
            this.tones.set(element, { ink: this.mix('#121822', c3, 0.38), shadow: this.mix(c3, c2, 0.28), body: this.mix(c3, c2, 0.74), streak: this.mix(c2, c1, 0.24), edge: this.mix(c2, c1, 0.62), gleam: c1 });
        }
        return this.tones.get(element);
    }

    pixel(g, x, y, w = 1, h = 1) { g.fillRect(Math.round(x), Math.round(y), w, h); }

    line(g, [x0, y0, x1, y1]) {
        const count = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
        for (let i = 0; i <= count; i++) this.pixel(g, x0 + (x1 - x0) * i / count, y0 + (y1 - y0) * i / count);
    }

    polygon(g, points, colour) {
        const ys = points.map(p => p[1]);
        g.fillStyle = colour;
        for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
            const scan = y + 0.5, cuts = [];
            for (let i = 0; i < points.length; i++) {
                const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
                if ((y0 <= scan && scan < y1) || (y1 <= scan && scan < y0)) cuts.push(x0 + (scan - y0) * (x1 - x0) / (y1 - y0));
            }
            cuts.sort((a, b) => a - b);
            for (let i = 0; i + 1 < cuts.length; i += 2) { const start = Math.ceil(cuts[i] - 0.5); g.fillRect(start, y, Math.ceil(cuts[i + 1] - 0.5) - start, 1); }
        }
    }

    /** 압축파 한 장: 부서진 뒤 결이 앞의 압력 테로 모인다. 밝은 앞이 늘 +X를 본다. */
    packet(c, phase) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = 80; canvas.height = 34;
        const g = canvas.getContext('2d'), shift = [0, 2, 1, -1][phase];
        g.translate(54, 17);
        this.polygon(g, [[-53, -6], [-30, -4], [-19, -7], [-7, -12], [2, -14], [13, -13], [20, -8], [24, -3], [24, 3], [21, 8], [14, 13], [2, 15], [-12, 11], [-24, 7], [-42, 5], [-48, 2], [-26, 3], [-18, 1], [-28, -1]], c.ink);
        this.polygon(g, [[-46, -5], [-29, -3], [-16, -8], [-6, -12], [4, -13], [13, -11], [20, -6], [23, -1], [22, 4], [18, 9], [11, 12], [2, 13], [-11, 9], [-21, 5], [-41, 4], [-22, 2], [-15, 0], [-28, -2]], c.shadow);
        this.polygon(g, [[-32, 4], [-18, 1], [-7, -7], [3, -9], [11, -8], [17, -4], [20, 0], [17, 5], [8, 9], [-2, 9], [-12, 6]], c.body);
        this.polygon(g, [[-42, -5], [-26, -4], [-14, -7], [-1, -12], [10, -12], [18, -8], [23, -2], [23, 3], [18, 9], [10, 12], [1, 13], [-9, 10], [1, 10], [9, 8], [15, 4], [17, 0], [15, -4], [9, -7], [2, -8], [-6, -7], [-18, -3]], c.streak);
        this.polygon(g, [[1, -12], [10, -11], [17, -7], [21, -3], [22, 0], [19, 5], [15, 8], [8, 10], [3, 10], [11, 7], [16, 3], [17, 0], [16, -4], [10, -8], [3, -10], [-5, -10]], c.edge);
        this.polygon(g, [[-12, 4], [-5, 1], [3, -3], [8, -3], [13, -1], [12, 2], [8, 4], [1, 5], [-5, 4], [-15, 7], [-26, 6]], c.streak);
        this.polygon(g, [[-9, 3], [-1, 1], [4, -1], [7, -1], [9, 0], [7, 2], [1, 2], [-4, 4]], c.edge);
        g.fillStyle = c.gleam;
        for (const [x, y, w] of [[13, -8, 2], [16, -5, 3], [19, -2, 2], [21, 0, 1], [19, 2, 2], [16, 5, 2], [-1, -11, 2], [7, 10, 2]]) this.pixel(g, x, y, w);
        g.fillStyle = c.body;
        for (const [x, y, w] of [[-48, -9, 6], [-34, -8, 8], [-27, -11, 4], [-19, 7, 5], [-39, 8, 8], [-31, 10, 4], [-48, 7, 3], [-11, 11, 3], [-8, -13, 4]]) this.pixel(g, x + shift, y, w);
        g.fillStyle = c.edge;
        this.pixel(g, -14 - shift, -7, 5); this.pixel(g, -26 - shift, 4, 6); this.pixel(g, -35 + shift, -5, 3);
        return canvas;
    }

    framesOf(element) {
        const tone = this.toneOf(element), key = tone.edge + tone.body;
        if (!this.frames.has(key)) this.frames.set(key, [0, 1, 2, 3].map(phase => this.packet(tone, phase)));
        return this.frames.get(key);
    }

    /** 날아가는 몸(붓은 투사체의 앞머리, 나아가는 쪽이 +X로 돌려져 있다). */
    body(g, t, element) {
        const tone = this.toneOf(element), frame = this.framesOf(element)[Math.floor(t / 46) % 4], trail = Math.floor(t / 32) % 6;
        g.save();
        g.imageSmoothingEnabled = false;
        g.fillStyle = tone.body;
        for (let i = 0; i < 7; i++) { g.globalAlpha = 0.42 - 0.05 * i; this.pixel(g, -51 - i * 5 - trail, ((i * 13 + 4) % 19) - 9, i < 2 ? 5 : 3); }
        g.globalAlpha = 1;
        g.drawImage(frame, -54, -17);
        g.restore();
    }

    arc(g, [x, y, rx, ry], [start, end, count], bright) {
        for (let i = 0; i <= count; i++) {
            if ((i + 3) % 7 === 0) continue;
            const a = start + (end - start) * i / count, size = bright && i > 2 && i < count - 3 ? 2 : 1;
            this.pixel(g, x + Math.cos(a) * rx, y + Math.sin(a) * ry, size, size);
        }
    }

    /** 손바닥 앞: 세로로 선 충격 고리가 벌어지고 뒤로 기 가닥이 흩어진다(0.192초). */
    paintMuzzle(c, angle) {
        return (g, t) => {
            const age = clamp(t / 192), push = 1 - (1 - age) ** 2;
            g.rotate(angle);
            g.globalAlpha = 0.82 * (1 - age);
            g.fillStyle = c.shadow; this.arc(g, [-1 + 9 * push, 0, 3 + 7 * push, 9 + 18 * push], [-2.2, 2.2, 15], true);
            g.fillStyle = c.streak; this.arc(g, [3 + 9 * push, 0, 3 + 7 * push, 8 + 16 * push], [-1.45, 1.45, 14], true);
            g.fillStyle = c.gleam; this.arc(g, [4 + 9 * push, 0, 4 + 7 * push, 8 + 16 * push], [-0.75, 0.54, 6], false);
            for (let i = 0; i < 8; i++) {
                const side = i % 2 ? -1 : 1, stagger = i >> 1, px = -4 - stagger * 3 - push * (11 + stagger * 4), py = side * (4 + stagger * 3 + push * 9);
                g.fillStyle = i < 4 ? c.streak : c.body; this.line(g, [px, py, px + 3 + 2 * (1 - age), py - side * 2]);
            }
        };
    }

    /** 맞은 자리: 나아가는 쪽으로 벌어지는 반원 셋, 처음의 밝은 심, 빛살 여덟(0.218초). */
    paintImpact(c, angle) {
        return (g, t) => {
            const age = clamp(t / 218), fade = 1 - age, spread = 1 - fade ** 2;
            g.rotate(angle);
            g.globalAlpha = 0.88 * fade;
            g.fillStyle = c.shadow; this.arc(g, [1 + 10 * spread, 0, 4 + 12 * spread, 7 + 24 * spread], [-1.52, 1.5, 20], true);
            g.fillStyle = c.body; this.arc(g, [3 + 9 * spread, 0, 5 + 12 * spread, 8 + 23 * spread], [-1.44, 1.42, 19], true);
            g.fillStyle = c.edge; this.arc(g, [5 + 10 * spread, 0, 5 + 12 * spread, 6 + 21 * spread], [-1.19, 0.72, 12], false);
            if (age < 0.37) {
                g.globalAlpha = 0.92 * (1 - age / 0.37);
                this.polygon(g, [[-6, 0], [0, -5], [8, -5], [16, 0], [8, 4], [1, 4]], c.edge); this.polygon(g, [[1, 0], [6, -2], [11, 0], [6, 2]], c.gleam);
            }
            g.globalAlpha = 0.76 * fade;
            SPOKES.forEach(([dx, dy], i) => {
                const start = 0.16 + 0.48 * spread, end = 0.44 + 0.61 * spread;
                g.fillStyle = i < 4 ? c.streak : c.body; this.line(g, [dx * start, dy * start, dx * end, dy * end]);
                this.pixel(g, dx * end + (dx > 0 ? 4 : -3), dy * end + (dy > 0 ? 1 : -1), 2);
                if (i < 4 && age < 0.56) { g.fillStyle = c.edge; this.pixel(g, dx * (end - 0.14), dy * (end - 0.14) - 1, 2); }
            });
        };
    }

    /** 무대의 칸 자리에 손 앞 고리를 건다. angle: 나아가는 쪽(라디안, 왼쪽이면 π). */
    muzzle(at, angle, element) {
        const paint = this.paintMuzzle(this.toneOf(element), angle);
        this.deps.stageSkillVfx.paint(at, { life: 192 }, (g, t, dot) => { g.scale(dot, dot); g.imageSmoothingEnabled = false; paint(g, t); g.globalAlpha = 1; });
    }

    impact(at, angle, element) {
        const paint = this.paintImpact(this.toneOf(element), angle);
        this.deps.stageSkillVfx.paint(at, { life: 218 }, (g, t, dot) => { g.scale(dot, dot); g.imageSmoothingEnabled = false; paint(g, t); g.globalAlpha = 1; });
    }
}

export function createStageKiWave(deps) {
    const instance = new StageKiWave(deps);
    return Object.freeze({ body: instance.body.bind(instance), muzzle: instance.muzzle.bind(instance), impact: instance.impact.bind(instance) });
}
