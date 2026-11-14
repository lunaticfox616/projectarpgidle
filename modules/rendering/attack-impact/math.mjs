// Elemental impact art and timing preserved from canvas-attack-fx.js.


const TAU = Math.PI * 2;

const rand = (a, b) => Math.random() * (b - a) + a;

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

const lerp = (a, b, t) => a + (b - a) * t;

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const easeOutBack = t => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

const flash3 = t => Math.max(0, 1 - t * 3);

function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

function mix(c0, c1, t) {
    return [
        Math.round(lerp(c0[0], c1[0], t)),
        Math.round(lerp(c0[1], c1[1], t)),
        Math.round(lerp(c0[2], c1[2], t))
    ];
}

function boltPath(x, y, angle, len, seed) {
    const pts = [];
    const steps = 6;
    let s = seed;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const wob = (i === 0 || i === steps) ? 0 : (rnd() - 0.5) * 26;
        pts.push({ x: x + Math.cos(angle) * len * k + Math.cos(angle + Math.PI / 2) * wob, y: y + Math.sin(angle) * len * k + Math.sin(angle + Math.PI / 2) * wob });
    }
    return pts;
}

function strokePath(g, pts, color, width) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
}

export { rand, TAU, clamp01, rgba, mix, easeOutQuart, easeOutExpo, flash3, easeOutCubic, easeOutBack, boltPath, strokePath };
