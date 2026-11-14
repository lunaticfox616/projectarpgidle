// Elemental impact art and timing preserved from canvas-attack-fx.js.
import { TAU, easeOutQuart, easeOutExpo, clamp01, flash3, easeOutCubic, easeOutBack, boltPath, strokePath, rand } from './math.mjs';

function softGlow(g, glow, opacity) {
    const { x, y, r, inner, outer, alpha } = glow;
    if (alpha <= 0 || r <= 0) return;
    g.save();
    g.globalAlpha = alpha * opacity;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.restore();
}

function drawPhysicalUnder(g, fx, t, opacity) {
    const { x, y } = fx;
    const a = 1 - t;
    softGlow(g, { x, y, r: 70 * easeOutQuart(t), inner: 'rgba(255,255,255,0.30)', outer: 'rgba(180,180,180,0)', alpha: a * 0.6 }, opacity);
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = `rgba(20,18,16,${a * 0.6})`;
    g.lineWidth = 2;
    const cp = easeOutExpo(clamp01(t / 0.4));
    for (const c of fx.st.crack) {
        const mx = x + Math.cos(c.a) * c.len * c.seg * cp;
        const my = y + Math.sin(c.a) * c.len * c.seg * cp + 8;
        const ex = x + Math.cos(c.a) * c.len * cp;
        const ey = y + Math.sin(c.a) * c.len * cp + 12;
        g.beginPath();
        g.moveTo(x, y + 6);
        g.lineTo(mx, my);
        g.lineTo(ex, ey);
        g.stroke();
    }
    g.restore();
}

function drawPhysicalFlash(g, x, y, fa) {
    const grd = g.createRadialGradient(x, y, 0, x, y, 26);
    grd.addColorStop(0, `rgba(255,255,255,${fa * 0.55})`);
    grd.addColorStop(0.5, `rgba(220,220,220,${fa * 0.25})`);
    grd.addColorStop(1, 'rgba(160,160,160,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, 26, 0, TAU); g.fill();
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(255,255,255,${fa * 0.24})`;
    g.lineWidth = 1.4;
    g.lineCap = 'round';
    const r = 16 + 18 * (1 - fa);
    for (let i = 0; i < 2; i++) {
        const ang = i * Math.PI / 2 + Math.PI / 4;
        g.beginPath();
        g.moveTo(x - Math.cos(ang) * r, y - Math.sin(ang) * r);
        g.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        g.stroke();
    }
    g.restore();
}

function drawPhysicalBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t;
    const p = easeOutQuart(t);
    const fa = flash3(t);
    if (fa > 0) drawPhysicalFlash(g, x, y, fa);
    g.strokeStyle = `rgba(245,245,245,${a * 0.45})`;
    g.lineWidth = 2 * (1 - t * 0.6);
    g.beginPath(); g.arc(x, y, 14 + 58 * p, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(110,110,118,${a * 0.25})`;
    g.lineWidth = 5 * (1 - t);
    g.beginPath(); g.arc(x, y, 10 + 38 * p, 0, TAU); g.stroke();
}

function drawFireUnder() {
    // 화염은 원형 광륜 대신 불꽃 혀와 직선 불티만 사용한다.
}

function drawFireTongue(g, fx, f, t, p) {
    const flAlpha = clamp01(1 - t / 0.72);
    const wave = Math.sin(t * Math.PI * 6 * f.wave + f.phase);
    const rise = Math.sin(t * Math.PI * 3 + f.phase) * 7;
    const len = f.len * (0.35 + p * 0.85) * (0.94 + wave * 0.06);
    const w = f.w * (1 - t * 0.4) * (1 + wave * 0.08) * (f.inner ? 0.6 : 1);
    const angle = f.a + wave * 0.05;
    const sx = fx.x; const sy = fx.y + (f.inner ? 14 : 18);
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len - f.lift * p - rise;
    const cx = sx + Math.cos(angle) * len * 0.45 + f.bend + wave * 9;
    const cy = sy + Math.sin(angle) * len * 0.45 - 26 * p - rise * 0.45;
    const grad = g.createLinearGradient(sx, sy, ex, ey);
    if (f.inner) {
        grad.addColorStop(0, `rgba(255,244,160,${flAlpha * 0.8})`);
        grad.addColorStop(1, 'rgba(255,150,30,0)');
    } else {
        grad.addColorStop(0, `rgba(255,238,130,${flAlpha * 0.9})`);
        grad.addColorStop(0.42, `rgba(255,116,28,${flAlpha * 0.8})`);
        grad.addColorStop(1, 'rgba(170,20,0,0)');
    }
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(cx - w, cy, ex, ey);
    g.quadraticCurveTo(cx + w * 0.72, cy + 16, sx, sy);
    g.closePath();
    g.fill();
}

function drawFireBody(g, fx, t) {
    const p = easeOutCubic(t);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const f of fx.st.flame) drawFireTongue(g, fx, f, t, p);
    g.restore();
}

function drawIceUnder() {
    // 냉기는 원형 광륜 대신 각진 결정과 파편만 사용한다.
}

function drawIceCrystal(g, fx, c, phase) {
    const { t, p, a } = phase;
    const broken = t > c.shatter;
    if (broken) return;
    const grow = easeOutBack(clamp01(t / c.shatter));
    const px = fx.x + Math.cos(c.a) * c.d * p;
    const py = fx.y + Math.sin(c.a) * c.d * p;
    const size = c.s * grow;
    g.save();
    g.translate(px, py);
    g.rotate(c.a + Math.PI / 2);
    g.fillStyle = `rgba(120,212,255,${a * 0.82})`;
    g.strokeStyle = `rgba(238,255,255,${a})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -size * c.long);
    g.lineTo(size * 0.52, 0);
    g.lineTo(0, size * c.long * 0.62);
    g.lineTo(-size * 0.52, 0);
    g.closePath();
    g.fill(); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a * 0.7})`;
    g.lineWidth = 0.75;
    g.beginPath();
    g.moveTo(0, -size * c.long * 0.7);
    g.lineTo(0, size * c.long * 0.36);
    g.stroke();
    g.restore();
}

function drawIceLattice(g, point, phase) {
    const { x, y } = point;
    const { t, p, a } = phase;
    g.save();
    g.translate(x, y);
    g.rotate(t * 0.18);
    g.strokeStyle = `rgba(230,255,255,${a * 0.6})`;
    g.lineWidth = 1.4;
    const hr = 16 + 16 * p;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3;
        const px = Math.cos(ang) * hr; const py = Math.sin(ang) * hr;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.stroke();
    for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(ang) * (24 + 20 * p), Math.sin(ang) * (24 + 20 * p));
        g.stroke();
    }
    g.restore();
}

function drawIceBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t;
    const p = easeOutQuart(t);
    drawIceLattice(g, { x, y }, { t, p, a });
    for (const c of fx.st.crystal) drawIceCrystal(g, fx, c, { t, p, a });
}

function drawLightningUnder() {
    // 번개는 원형 광륜 대신 본체의 직선 섬광과 갈라지는 전기 가지만 사용한다.
}

function drawLightningBolt(g, fx, b, a, tick) {
    const path = boltPath(fx.x, fx.y, b.angle, b.len, b.seed + tick * 13);
    strokePath(g, path, `rgba(255,255,255,${a})`, 3.6);
    strokePath(g, path, `rgba(90,170,255,${a})`, 1.8);
    strokePath(g, path, `rgba(255,225,120,${a * 0.6})`, 0.8);
    if (path.length > 2) {
        const bi = 1 + ((b.seed | 0) % (path.length - 2));
        const bp = path[bi];
        const fork = boltPath(bp.x, bp.y, b.angle + rand(-1, 1), b.len * 0.4, b.seed + tick * 7 + 5);
        strokePath(g, fork, `rgba(200,225,255,${a * 0.8})`, 1.6);
        strokePath(g, fork, `rgba(120,190,255,${a * 0.7})`, 0.8);
    }
}

function drawLightningBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t;
    const pulse = Math.sin(t * Math.PI);
    const tick = Math.floor(t * 7);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const b of fx.st.bolts) drawLightningBolt(g, fx, b, a, tick);
    g.strokeStyle = `rgba(255,248,185,${a * 0.92})`;
    g.lineWidth = 2.2;
    for (let flash = 0; flash < 3; flash++) {
        const angle = (fx.st.bolts[flash] || {}).angle || flash * TAU / 3;
        const length = 9 + pulse * (14 + flash * 3);
        g.beginPath();
        g.moveTo(x - Math.cos(angle) * length * 0.28, y - Math.sin(angle) * length * 0.28);
        g.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        g.stroke();
    }
    g.restore();
}

function drawChaosUnder(g, fx, t, opacity) {
    softGlow(g, { x: fx.x, y: fx.y, r: 84, inner: 'rgba(150,40,230,0.5)', outer: 'rgba(20,0,40,0)', alpha: 1 - t * 0.85 }, opacity);
}

function drawChaosTendrils(g, fx, phase) {
    const { jx, jy, t, a } = phase;
    g.strokeStyle = `rgba(190,80,255,${a * 0.7})`;
    g.lineWidth = 2;
    for (const td of fx.st.tendril) {
        const reach = Math.sin(clamp01(t / 0.6) * Math.PI) * td.len;
        g.beginPath();
        g.moveTo(jx, jy);
        for (let s = 1; s <= 6; s++) {
            const k = s / 6;
            const wob = Math.sin(k * td.wave * Math.PI + td.phase + t * 8) * 10 * k;
            const px = jx + Math.cos(td.a) * reach * k + Math.cos(td.a + Math.PI / 2) * wob;
            const py = jy + Math.sin(td.a) * reach * k + Math.sin(td.a + Math.PI / 2) * wob;
            g.lineTo(px, py);
        }
        g.stroke();
    }
}

function drawChaosBody(g, fx, t) {
    const { x, y } = fx;
    const a = 1 - t * 0.85;
    const p = easeOutCubic(t);
    const jx = x + Math.sin(t * 60) * 1.4 * (1 - t);
    const jy = y + Math.cos(t * 47) * 1.4 * (1 - t);
    const spin = t * Math.PI * 2.4;
    const voidR = 16 + 5 * Math.sin(t * Math.PI * 2);
    const vg = g.createRadialGradient(jx, jy, 0, jx, jy, voidR + 8);
    vg.addColorStop(0, `rgba(4,0,10,${0.92 * a})`);
    vg.addColorStop(0.7, `rgba(40,5,70,${0.7 * a})`);
    vg.addColorStop(1, 'rgba(170,60,255,0)');
    g.fillStyle = vg;
    g.beginPath(); g.arc(jx, jy, voidR + 8, 0, TAU); g.fill();
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        g.save();
        g.translate(jx, jy);
        g.rotate(spin * (i % 2 ? -1 : 1) + i * Math.PI * 0.5);
        g.strokeStyle = i % 2 ? `rgba(150,255,130,${a * 0.5})` : `rgba(200,90,255,${a * 0.85})`;
        g.lineWidth = 4.5 - i * 0.6;
        g.beginPath();
        g.arc(0, 0, 18 + i * 11 + 24 * p, 0.35, 2.2);
        g.stroke();
        g.restore();
    }
    drawChaosTendrils(g, fx, { jx, jy, t, a });
    g.strokeStyle = `rgba(210,110,255,${a * 0.5})`;
    g.lineWidth = 2;
    g.beginPath(); g.arc(jx, jy, 26 + 52 * p, 0, TAU); g.stroke();
    g.restore();
}

const KIND = {
    physical: { dur: 0.70, under: drawPhysicalUnder, body: drawPhysicalBody },
    fire: { dur: 1.10, under: drawFireUnder, body: drawFireBody },
    ice: { dur: 1.00, under: drawIceUnder, body: drawIceBody },
    lightning: { dur: 0.50, under: drawLightningUnder, body: drawLightningBody },
    chaos: { dur: 1.00, under: drawChaosUnder, body: drawChaosBody }
};

export { KIND };
