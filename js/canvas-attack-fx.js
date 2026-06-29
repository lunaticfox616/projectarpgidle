/*
 * Stateful elemental attack-impact effect engine for the battlefield canvas.
 * Ported and adapted from the "Attack FX — Steam Quality" reference: it owns a
 * particle list keyed by attack element (gem element) and is driven entirely by
 * the battlefield render loop.
 *
 * Public API (exposed via safeExposeGlobals):
 *   attackFxSpawn(element, x, y, opts)  // element: phys|fire|cold|light|chaos (example ids also accepted)
 *   attackFxUpdate(dtMs)                // advance particles by elapsed ms
 *   attackFxDraw(ctx)                   // render active effects (call above enemy sprites)
 *
 * Self-contained: depends only on Math + safeExposeGlobals. Effects are anchored
 * at their spawn point (impacts are momentary), matching the reference behaviour.
 */
(function () {
    const TAU = Math.PI * 2;

    // 공격 이펙트 전체 불투명도 배수(1=원본, 낮을수록 더 투명). window.__attackFxOpacity로 조정 가능.
    const FX_GLOBAL_ALPHA = (typeof window !== 'undefined' && Number.isFinite(Number(window.__attackFxOpacity)))
        ? Math.max(0.2, Math.min(1, Number(window.__attackFxOpacity)))
        : 0.85;
    // 종류별 크기 배수(번개 이펙트는 절반 크기).
    const FX_KIND_SIZE_MUL = { lightning: 0.5 };

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

    function softGlow(g, x, y, r, inner, outer, alpha) {
        if (alpha <= 0 || r <= 0) return;
        g.save();
        g.globalAlpha = alpha * FX_GLOBAL_ALPHA;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, inner);
        grd.addColorStop(1, outer);
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
        g.restore();
    }

    /* ===================== particle ===================== */
    function makeParticle(o) {
        return {
            x: o.x, y: o.y,
            vx: o.vx || 0, vy: o.vy || 0,
            grav: o.grav || 0,
            drag: o.drag || 0,
            size: o.size || 2,
            grow: o.grow || 0,
            life: o.life || 0.5,
            age: 0,
            rot: o.rot || 0,
            vrot: o.vrot || 0,
            shape: o.shape || 'circle',
            c0: o.c0 || [255, 255, 255],
            c1: o.c1 || null,
            fade: o.fade || 'out',
            twinkle: o.twinkle || 0,
            seed: rand(0, TAU),
            trail: o.trail || 0,
            hist: o.trail ? [] : null
        };
    }

    function stepParticle(p, dt) {
        p.age += dt;
        p.vy += p.grav * dt;
        if (p.drag) {
            const f = Math.max(0, 1 - p.drag * dt);
            p.vx *= f; p.vy *= f;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        if (p.trail) {
            p.hist.push(p.x, p.y);
            const max = p.trail * 2;
            if (p.hist.length > max) p.hist.splice(0, p.hist.length - max);
        }
    }

    function particleAlpha(p) {
        const k = clamp01(p.age / p.life);
        let a = p.fade === 'inout' ? Math.sin(k * Math.PI) : 1 - k;
        if (p.twinkle) a *= 0.55 + 0.45 * Math.sin(p.age * p.twinkle * TAU + p.seed);
        return clamp01(a);
    }

    function drawSparkParticle(g, p, col, a, size) {
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

    // 입자용 방사형 그라디언트 캐시.
    // 기존에는 입자마다 매 프레임 createRadialGradient를 호출했는데(특히 화염
    // glowdot 다수), 이것이 전장 렌더의 가장 큰 프레임 비용이자 공격 순간 렉의
    // 주원인이었다. 원점·단위 반지름으로 만든 그라디언트는 위치/크기와 무관하므로
    // (변환으로 재배치) 색/투명도 버킷 단위로 캐시해 재사용한다.
    const GLOW_UNIT = 64;
    const RADIAL_STOPS = {
        glowdot: { radiusMul: 2.4, list: [[0, 1], [0.4, 0.6], [1, 0]] },
        smoke: { radiusMul: 1, list: [[0, 0.5], [0.6, 0.22], [1, 0]] }
    };
    const __radialGradCache = new Map();
    let __radialGradCtx = null;
    function getCachedRadialGradient(g, stopsId, stops, col, a) {
        // 컨텍스트(캔버스)가 교체되면 캐시한 그라디언트는 더 이상 유효하지 않을 수 있다.
        if (g !== __radialGradCtx) { __radialGradCache.clear(); __radialGradCtx = g; }
        let ab = Math.round(clamp01(a) * 24);
        let cr = col[0] & ~7, cg = col[1] & ~7, cb = col[2] & ~7;
        let key = stopsId + (((cr << 16) | (cg << 8) | cb) * 32 + ab);
        let cached = __radialGradCache.get(key);
        if (cached) return cached;
        let aa = ab / 24;
        let grd = g.createRadialGradient(0, 0, 0, 0, 0, GLOW_UNIT);
        for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], `rgba(${cr},${cg},${cb},${(aa * stops[i][1]).toFixed(3)})`);
        if (__radialGradCache.size > 4096) __radialGradCache.clear();
        __radialGradCache.set(key, grd);
        return grd;
    }

    function drawRadialParticle(g, p, col, a, size, stops, stopsId) {
        const r = size * stops.radiusMul;
        if (r <= 0) return;
        const grd = getCachedRadialGradient(g, stopsId, stops.list, col, a);
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

    function drawPolyParticle(g, p, col, a, pts, fillMul) {
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

    function drawParticle(g, p) {
        const a = particleAlpha(p);
        if (a <= 0.004) return;
        const k = clamp01(p.age / p.life);
        const size = Math.max(0.1, p.size * (1 + p.grow * k));
        const col = p.c1 ? mix(p.c0, p.c1, k) : p.c0;
        switch (p.shape) {
            case 'spark': drawSparkParticle(g, p, col, a, size); break;
            case 'glowdot': drawRadialParticle(g, p, col, a, size, RADIAL_STOPS.glowdot, 'glowdot'); break;
            case 'smoke': drawRadialParticle(g, p, col, a, size, RADIAL_STOPS.smoke, 'smoke'); break;
            case 'shard': drawPolyParticle(g, p, col, a, [[0, -size * 1.6], [size * 0.7, 0], [0, size * 1.2], [-size * 0.7, 0]], 0.9); break;
            case 'debris': drawPolyParticle(g, p, col, a, [[-size, -size * 0.6], [size, -size], [size * 0.7, size], [-size * 0.8, size * 0.7]], 1); break;
            default:
                g.fillStyle = rgba(col, a);
                g.beginPath();
                g.arc(p.x, p.y, size, 0, TAU);
                g.fill();
        }
    }

    /* ===================== BUILDERS ===================== */
    // q = quality/density factor (0.4..1.3). Loop counts scale with it so a busy
    // battlefield spawns fewer particles per impact.
    // FX_PARTICLE_SCALE 은 입자 개수 전반을 한 번에 줄여 다중 타겟/고공속 빌드에서의
    // 입자 렌더(특히 방사형 그라디언트) 부하를 낮춘다. window 전역으로 조정 가능.
    const FX_PARTICLE_SCALE = (typeof window !== 'undefined' && Number.isFinite(Number(window.__attackFxParticleScale)))
        ? Math.max(0.3, Math.min(1, Number(window.__attackFxParticleScale)))
        : 0.72;
    const qn = (base, q) => Math.max(1, Math.round(base * q * FX_PARTICLE_SCALE));

    function buildPhysical(fx, q) {
        const { x, y } = fx;
        fx.st.crack = [];
        for (let i = 0; i < 6; i++) fx.st.crack.push({ a: rand(0, TAU), len: rand(26, 52), seg: rand(0.4, 0.7) });
        for (let i = 0; i < qn(10, q); i++) {
            const a = rand(0, TAU); const sp = rand(40, 130);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(10, 40), grav: 120, drag: 3.2, size: rand(10, 20), grow: 1.6, life: rand(0.45, 0.7), shape: 'smoke', c0: [120, 112, 100], c1: [70, 66, 60] }));
        }
        for (let i = 0; i < qn(9, q); i++) {
            const a = rand(-Math.PI, 0.2); const sp = rand(160, 320);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 700, drag: 0.6, size: rand(2.5, 5), rot: rand(0, TAU), vrot: rand(-12, 12), life: rand(0.4, 0.65), shape: 'debris', c0: [150, 146, 138], c1: [70, 66, 60] }));
        }
        for (let i = 0; i < qn(13, q); i++) {
            const a = rand(0, TAU); const sp = rand(260, 520);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, grav: 300, drag: 1.0, size: rand(1.4, 2.6), life: rand(0.18, 0.34), shape: 'spark', trail: 5, c0: [255, 246, 210], c1: [255, 150, 60] }));
        }
    }

    function buildFire(fx, q) {
        const { x, y } = fx;
        fx.st.flame = [];
        for (let i = 0; i < 9; i++) {
            fx.st.flame.push({ a: rand(-Math.PI * 0.92, -Math.PI * 0.08), len: rand(58, 116), w: rand(14, 26), bend: rand(-22, 22), lift: rand(10, 28), phase: rand(0, TAU), wave: rand(0.85, 1.3), inner: i < 5 });
        }
        for (let i = 0; i < qn(18, q); i++) {
            const a = rand(-Math.PI * 1.1, Math.PI * 0.1); const sp = rand(30, 110);
            fx.pFront.push(makeParticle({ x: x + rand(-10, 10), y: y + rand(-4, 8), vx: Math.cos(a) * sp * 0.5, vy: -rand(60, 150), grav: -40, drag: 0.8, size: rand(1.4, 3.2), life: rand(0.5, 0.95), shape: 'glowdot', twinkle: rand(4, 8), c0: [255, 224, 120], c1: [200, 40, 10] }));
        }
        for (let i = 0; i < qn(7, q); i++) {
            const a = rand(-Math.PI, 0); const sp = rand(180, 340);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 260, drag: 1.0, size: rand(1.4, 2.4), life: rand(0.25, 0.45), shape: 'spark', trail: 4, c0: [255, 240, 180], c1: [255, 90, 30] }));
        }
        for (let i = 0; i < qn(6, q); i++) {
            const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
            fx.pBack.push(makeParticle({ x: x + rand(-12, 12), y: y - rand(0, 14), vx: Math.cos(a) * rand(10, 35), vy: -rand(30, 70), drag: 1.2, size: rand(14, 26), grow: 1.8, life: rand(0.7, 1.05), shape: 'smoke', c0: [60, 38, 30], c1: [25, 20, 22] }));
        }
    }

    function buildIce(fx, q) {
        const { x, y } = fx;
        fx.st.crystal = [];
        for (let i = 0; i < 9; i++) fx.st.crystal.push({ a: rand(0, TAU), d: rand(40, 90), s: rand(8, 15), long: rand(2.1, 3.0), shatter: rand(0.55, 0.72) });
        for (let i = 0; i < qn(11, q); i++) {
            const a = rand(0, TAU); const sp = rand(120, 280);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 480, drag: 0.8, size: rand(2, 4), rot: rand(0, TAU), vrot: rand(-10, 10), life: rand(0.45, 0.7), shape: 'shard', c0: [220, 248, 255], c1: [120, 190, 240] }));
        }
        for (let i = 0; i < qn(14, q); i++) {
            const a = rand(0, TAU); const sp = rand(20, 90);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.4, size: rand(1, 2.2), life: rand(0.5, 0.95), shape: 'glowdot', twinkle: rand(5, 9), c0: [235, 252, 255], c1: [150, 210, 255] }));
        }
        for (let i = 0; i < qn(5, q); i++) {
            const a = rand(0, TAU);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * rand(20, 50), vy: Math.sin(a) * rand(10, 30) + 20, drag: 1.6, size: rand(16, 28), grow: 1.4, life: rand(0.7, 1.0), shape: 'smoke', c0: [150, 200, 235], c1: [110, 150, 190] }));
        }
    }

    function buildLightning(fx, q) {
        const { x, y } = fx;
        fx.st.bolts = [];
        for (let i = 0; i < 5; i++) fx.st.bolts.push({ angle: rand(0, TAU), len: rand(80, 150), seed: rand(0, 1000) });
        fx.st.arcs = [];
        for (let i = 0; i < 5; i++) fx.st.arcs.push({ a: rand(0, TAU), r: rand(14, 30), span: rand(0.5, 1.4) });
        for (let i = 0; i < qn(14, q); i++) {
            const a = rand(0, TAU); const sp = rand(220, 460);
            fx.pFront.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2.0, size: rand(1.2, 2.4), life: rand(0.12, 0.28), shape: 'spark', trail: 4, c0: [255, 255, 255], c1: [90, 170, 255] }));
        }
    }

    function buildChaos(fx, q) {
        const { x, y } = fx;
        fx.st.tendril = [];
        for (let i = 0; i < 6; i++) fx.st.tendril.push({ a: rand(0, TAU), len: rand(46, 92), phase: rand(0, TAU), wave: rand(2, 4) });
        for (let i = 0; i < qn(18, q); i++) {
            const inward = Math.random() < 0.45;
            const a = rand(0, TAU);
            const sp = inward ? -rand(60, 130) : rand(70, 160);
            fx.pFront.push(makeParticle({ x: x + Math.cos(a) * (inward ? rand(50, 90) : 6), y: y + Math.sin(a) * (inward ? rand(50, 90) : 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: inward ? 0.4 : 1.3, size: rand(1.6, 3.4), life: rand(0.5, 0.95), shape: 'glowdot', twinkle: rand(3, 6), c0: Math.random() < 0.18 ? [150, 255, 130] : [220, 110, 255], c1: [90, 20, 150] }));
        }
        for (let i = 0; i < qn(8, q); i++) {
            const a = rand(0, TAU); const sp = rand(90, 200);
            fx.pBack.push(makeParticle({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.0, size: rand(2, 4), rot: rand(0, TAU), vrot: rand(-8, 8), life: rand(0.45, 0.75), shape: 'debris', c0: [120, 50, 170], c1: [30, 8, 55] }));
        }
    }

    /* ===================== DRAWERS ===================== */
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

    function drawPhysicalUnder(g, fx, t) {
        const { x, y } = fx;
        const a = 1 - t;
        softGlow(g, x, y, 70 * easeOutQuart(t), 'rgba(255,255,255,0.30)', 'rgba(180,180,180,0)', a * 0.6);
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
        const grd = g.createRadialGradient(x, y, 0, x, y, 34);
        grd.addColorStop(0, `rgba(255,255,255,${fa})`);
        grd.addColorStop(0.5, `rgba(220,220,220,${fa * 0.5})`);
        grd.addColorStop(1, 'rgba(160,160,160,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill();
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = `rgba(255,255,255,${fa})`;
        g.lineWidth = 3;
        g.lineCap = 'round';
        const r = 26 + 30 * (1 - fa);
        for (let i = 0; i < 4; i++) {
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
        g.strokeStyle = `rgba(245,245,245,${a * 0.7})`;
        g.lineWidth = 3 * (1 - t * 0.6);
        g.beginPath(); g.arc(x, y, 14 + 58 * p, 0, TAU); g.stroke();
        g.strokeStyle = `rgba(110,110,118,${a * 0.4})`;
        g.lineWidth = 8 * (1 - t);
        g.beginPath(); g.arc(x, y, 10 + 38 * p, 0, TAU); g.stroke();
    }

    function drawFireUnder(g, fx, t) {
        const { x, y } = fx;
        const a = 1 - t;
        const burn = 0.92 + Math.sin(t * Math.PI * 6) * 0.08;
        softGlow(g, x, y, 92 * easeOutCubic(t) * burn, 'rgba(255,110,28,0.5)', 'rgba(255,40,0,0)', a);
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
        const { x, y } = fx;
        const a = 1 - t;
        const p = easeOutCubic(t);
        const burn = 0.92 + Math.sin(t * Math.PI * 5) * 0.08;
        g.save();
        g.globalCompositeOperation = 'lighter';
        const cr = 56 * p * burn;
        const core = g.createRadialGradient(x, y + 4, 0, x, y + 4, cr);
        core.addColorStop(0, `rgba(255,252,205,${a * 0.95})`);
        core.addColorStop(0.28, `rgba(255,190,66,${a * 0.8})`);
        core.addColorStop(0.62, `rgba(255,74,16,${a * 0.5})`);
        core.addColorStop(1, 'rgba(140,20,0,0)');
        g.fillStyle = core;
        g.beginPath(); g.arc(x, y + 4, cr, 0, TAU); g.fill();
        for (const f of fx.st.flame) drawFireTongue(g, fx, f, t, p);
        g.strokeStyle = `rgba(255,142,46,${a * 0.5})`;
        g.lineWidth = 2.5 * (1 - t * 0.5);
        g.beginPath(); g.arc(x, y + 6, 22 + 56 * p * burn, 0, TAU); g.stroke();
        g.restore();
    }

    function drawIceUnder(g, fx, t) {
        const { x, y } = fx;
        softGlow(g, x, y, 86 * easeOutQuart(t), 'rgba(150,225,255,0.42)', 'rgba(90,170,255,0)', 1 - t);
    }

    function drawIceCrystal(g, fx, c, t, p, a) {
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

    function drawIceLattice(g, x, y, t, p, a) {
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
        const cr = 30 * p;
        const core = g.createRadialGradient(x, y, 0, x, y, cr);
        core.addColorStop(0, `rgba(248,255,255,${a * 0.92})`);
        core.addColorStop(0.45, `rgba(150,222,255,${a * 0.62})`);
        core.addColorStop(1, 'rgba(70,155,255,0)');
        g.fillStyle = core;
        g.beginPath(); g.arc(x, y, cr, 0, TAU); g.fill();
        g.strokeStyle = `rgba(205,245,255,${a * 0.8})`;
        g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 20 + 58 * p, 0, TAU); g.stroke();
        drawIceLattice(g, x, y, t, p, a);
        for (const c of fx.st.crystal) drawIceCrystal(g, fx, c, t, p, a);
    }

    function drawLightningUnder(g, fx, t) {
        softGlow(g, fx.x, fx.y, 88, 'rgba(120,190,255,0.6)', 'rgba(50,100,255,0)', 1 - t);
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
        g.fillStyle = `rgba(255,255,255,${0.85 * a})`;
        g.beginPath(); g.arc(x, y, 7 + 12 * pulse, 0, TAU); g.fill();
        for (const b of fx.st.bolts) drawLightningBolt(g, fx, b, a, tick);
        g.strokeStyle = `rgba(180,215,255,${a * 0.7})`;
        g.lineWidth = 1.4;
        for (const arc of fx.st.arcs) {
            const r = arc.r + 18 * easeOutExpo(t);
            const s = arc.a + tick * 0.6;
            g.beginPath();
            g.arc(x, y, r, s, s + arc.span);
            g.stroke();
        }
        g.strokeStyle = `rgba(120,180,255,${a * 0.5})`;
        g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, 22 + 40 * t, 0, TAU); g.stroke();
        g.restore();
    }

    function drawChaosUnder(g, fx, t) {
        softGlow(g, fx.x, fx.y, 84, 'rgba(150,40,230,0.5)', 'rgba(20,0,40,0)', 1 - t * 0.85);
    }

    function drawChaosTendrils(g, fx, jx, jy, t, a) {
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
        drawChaosTendrils(g, fx, jx, jy, t, a);
        g.strokeStyle = `rgba(210,110,255,${a * 0.5})`;
        g.lineWidth = 2;
        g.beginPath(); g.arc(jx, jy, 26 + 52 * p, 0, TAU); g.stroke();
        g.restore();
    }

    const KIND = {
        physical: { dur: 0.70, build: buildPhysical, under: drawPhysicalUnder, body: drawPhysicalBody },
        fire: { dur: 1.10, build: buildFire, under: drawFireUnder, body: drawFireBody },
        ice: { dur: 1.00, build: buildIce, under: drawIceUnder, body: drawIceBody },
        lightning: { dur: 0.50, build: buildLightning, under: drawLightningUnder, body: drawLightningBody },
        chaos: { dur: 1.00, build: buildChaos, under: drawChaosUnder, body: drawChaosBody }
    };

    // Map the game's element ids (and example ids) onto the effect kinds.
    function normalizeKind(element) {
        const id = String(element || 'phys').toLowerCase();
        if (id === 'fire') return 'fire';
        if (id === 'cold' || id === 'ice' || id === 'frost') return 'ice';
        if (id === 'light' || id === 'lightning' || id === 'thunder') return 'lightning';
        if (id === 'chaos' || id === 'void') return 'chaos';
        return 'physical';
    }

    /* ===================== engine ===================== */
    // 동시 임팩트 이펙트 상한. 각 이펙트가 수십 개의 입자(상당수가 매 프레임
    // createRadialGradient를 호출)를 그리므로, 상한을 낮춰 최악의 경우 부하를 제한한다.
    const engine = { list: [], maxEffects: 14 };

    function attackFxSpawn(element, x, y, opts) {
        if (typeof window !== 'undefined' && window.__attackFxEnabled === false) return;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const kindId = normalizeKind(element);
        const kind = KIND[kindId];
        if (!kind) return;
        const options = opts || {};
        const scale = Number.isFinite(options.scale) ? options.scale : 0.78;
        const crit = !!options.crit;
        // Lower particle density as the field gets busy; crit nudges it up.
        const density = clamp01(1 - engine.list.length / engine.maxEffects * 0.55) * (crit ? 1.2 : 0.92);
        if (engine.list.length >= engine.maxEffects) engine.list.shift();
        const fx = { kind, kindId, x, y, age: 0, dur: kind.dur, scale: crit ? scale * 1.18 : scale, pBack: [], pFront: [], st: {} };
        kind.build(fx, Math.max(0.4, density));
        engine.list.push(fx);
    }

    function attackFxUpdate(dtMs) {
        const dt = Math.min(Number(dtMs) || 0, 50) / 1000;
        if (dt <= 0) return;
        for (let i = engine.list.length - 1; i >= 0; i--) {
            const fx = engine.list[i];
            fx.age += dt;
            for (const p of fx.pBack) stepParticle(p, dt);
            for (const p of fx.pFront) stepParticle(p, dt);
            if (fx.age >= fx.dur) engine.list.splice(i, 1);
        }
    }

    function drawEffect(g, fx) {
        const t = clamp01(fx.age / fx.dur);
        g.save();
        // 전체 불투명도를 한 단계 낮춘다. globalAlpha는 fillStyle/strokeStyle의 알파와
        // 곱해지므로 이펙트 전반이 비례적으로 살짝 투명해진다.
        g.globalAlpha = FX_GLOBAL_ALPHA;
        const sizeMul = FX_KIND_SIZE_MUL[fx.kindId] || 1;
        const drawScale = fx.scale * sizeMul;
        g.translate(fx.x, fx.y);
        g.scale(drawScale, drawScale);
        g.translate(-fx.x, -fx.y);
        fx.kind.under(g, fx, t);
        for (const p of fx.pBack) drawParticle(g, p);
        fx.kind.body(g, fx, t);
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (const p of fx.pFront) drawParticle(g, p);
        g.restore();
        g.restore();
    }

    function attackFxDraw(g) {
        if (!g || engine.list.length === 0) return;
        for (const fx of engine.list) drawEffect(g, fx);
    }

    if (typeof safeExposeGlobals === 'function') {
        safeExposeGlobals({ attackFxSpawn, attackFxUpdate, attackFxDraw });
    } else if (typeof window !== 'undefined') {
        window.attackFxSpawn = attackFxSpawn;
        window.attackFxUpdate = attackFxUpdate;
        window.attackFxDraw = attackFxDraw;
    }
})();
