/** 스킬룬 이펙트 가운데 코드로 그리는 근접 연출 (2026-10-17 사용자가 준 "스킬룬 디렉터 전달" v32의 그리기 코드를 옮긴 것이다. 모양과 수치는
 * 인계 그대로이고, 게임의 붓과 시계에 맞게 나눠 적었다). 이중 베기의 X자, 번개 타격의 세로 베기, 올려 베기의 휘두름과 베임 선,
 * 참격파의 칼바람, 서리베기의 얼음 안개, 불사르기의 불길 앞면, 부싯돌 베기의 불티와 화염 검기, 폭발성 타격의 불씨, 피뢰침의 정전기,
 * 얼어붙은 고리, 혹한의 지진의 얼음 기둥, 전도성 난격의 휘두름과 방전, 돌진의 공기 활, 섬머솔트 슬래시의 궤적.
 * 도트 하나가 캐릭터 도트 하나이고, 자리는 그 연출을 건 곳(주인공이나 적의 발 자리)에서의 도트다. 인계의 한 칸은 72×36px이고 게임의 한
 * 칸은 64×32도트라, 칸으로 잰 길이는 게임의 칸(stageSkillKit.WIDE, DEEP)으로 옮긴다. 그리기만 한다: 언제 어디에 걸지는
 * js/canvas-stage-skill-rules.js와 js/canvas-stage-skill-casts.js가 정한다. 주인공 그림을 기울이거나 띄우지 않는다(코드로 만든 동작 금지).
 */
const stageSkillStrokes = (() => {
    const WIDE = 64, DEEP = 32;
    const strokeRamp = name => STAGE_SKILL_VFX.ramps[name] || STAGE_SKILL_VFX.ramps.phys;
    const strokeInk = element => STAGE_SKILL_VFX.elements[element] || STAGE_SKILL_VFX.elements.phys;
    /** 같은 씨앗이면 같은 난수열. */
    function strokeRandom(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
    /** 두 점 사이의 도트 선(브레젠험). */
    function strokeLine(x0, y0, x1, y1, put) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let e = dx + dy;
        for (let guard = 0; guard < 2000; guard++) {
            put(x0, y0);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * e;
            if (e2 >= dy) { e += dy; x0 += sx; }
            if (e2 <= dx) { e += dx; y0 += sy; }
        }
    }
    const dotAt = g => (x, y) => g.fillRect(x, y, 1, 1);
    /** 연출 하나를 건다: 바닥 층(ground)과 캐릭터 위 층(top)을 따로 그리는 함수, 길이(ms), 늦춤, 따라갈 몸. 붓은 자리로 옮겨져 도트 배율이다. */
    function strokeHang(at, fx) {
        for (const layer of ['ground', 'top']) {
            const draw = fx[layer];
            if (!draw) continue;
            stageSkillVfx.paint(at, { life: fx.life, delay: fx.delay || 0, layer, follow: fx.follow || null }, (ctx, t, dot) => { ctx.scale(dot, dot); draw(ctx, t); });
        }
    }

    // ---------------------------------------------------------------- cut lines
    /** 렌즈꼴 베기 선 하나(가운데 굵고 양 끝 뾰족, 흰 심, 밝은 속, 어두운 테). ext 그어진 몫, fade 투명도. */
    function strokeLens(g, at, look, ramp) {
        const { ang, len, wMax, ext, fade } = look;
        if (fade <= 0 || ext <= 0) return;
        g.save(); g.translate(Math.round(at[0]), Math.round(at[1])); g.rotate(ang); g.globalAlpha *= fade;
        const L = Math.round(len * ext);
        for (let x = 0; x <= L; x++) {
            const w = wMax * Math.sin(Math.PI * Math.min(1, x / len)) ** 0.8 * (x > L - 6 ? (L - x) / 6 + 0.2 : 1);
            if (w >= 0.4) strokeLensColumn(g, x - Math.round(len / 2), w, ramp);
        }
        g.restore();
    }
    /** 렌즈 선의 한 세로줄: 테는 어둡게, 가운데 한 줄은 흰 심, 그 둘레는 밝게. */
    function strokeLensColumn(g, x, w, ramp) {
        for (let y = -Math.ceil(w); y <= Math.ceil(w); y++) {
            const ay = Math.abs(y);
            if (ay > w + 0.3) continue;
            g.fillStyle = ay > w - 0.7 ? ramp[1] : (y === 0 ? ramp[5] : (ay < w * 0.5 ? ramp[4] : ramp[3]));
            g.fillRect(x, y, 1, 1);
        }
    }
    /** 이중 베기: 타격마다 대각선 베기 선 하나(첫째는 위뒤에서 아래앞, 둘째는 아래뒤에서 위앞, 둘이 겹쳐 X자). 0.07초에 그어지고 0.26초에 걷힌다.
     * 두 타격은 0.11초 사이를 두고 그어진다(index번째 타격). */
    function strokeCrossCut(at, face, reach, index) {
        const C = strokeRamp('phys'), cx = Math.max(50, reach * 0.55), ang = (index % 2 ? -1 : 1) * 0.62, r = strokeRandom(77 + index * 31);
        const sparks = [...Array(5)].map(() => [r() * 2 - 1, r() * 2 - 1, 0.5 + r()]);
        strokeHang(at, { life: 340, delay: index * 110, top(g, t) {
            const fade = t < 150 ? 1 : Math.max(0, 1 - (t - 150) / 190);
            g.save(); g.scale(face, 1);
            strokeLens(g, [cx, -48], { ang, len: 132, wMax: 4.5, ext: Math.min(1, t / 70), fade }, C);
            if (t > 40 && t < 200) for (const [sx, sy, sp] of sparks) { const k = (t - 40) / 160; g.globalAlpha = 1 - k; g.fillStyle = C[5]; g.fillRect(Math.round(cx + sx * 40 * k * sp), Math.round(-48 + sy * 26 * k * sp), 2, 1); }
            g.restore();
        } });
    }
    /** 번개 타격: 몸 앞에 위에서 아래로 그어지는 번개빛 세로 베기 선과, 선 둘레로 튀는 짧은 번개 가지(40ms마다 바뀐다). */
    function strokeVCut(at, face, reach) {
        const C = strokeRamp('light'), cx = Math.max(48, reach * 0.5), len = 128;
        strokeHang(at, { life: 320, top(g, t) {
            const ext = Math.min(1, t / 60), fade = t < 140 ? 1 : Math.max(0, 1 - (t - 140) / 180);
            g.save(); g.scale(face, 1);
            strokeLens(g, [cx, -52], { ang: Math.PI / 2 - 0.12, len, wMax: 4, ext, fade }, C);
            if (t > 20 && t < 260) strokeVCutBranches(g, t, { cx, len, ext, fade }, C);
            g.restore();
        } });
    }
    function strokeVCutBranches(g, t, o, C) {
        const r = strokeRandom(55 + Math.floor(t / 40));
        g.globalAlpha = o.fade * 0.9;
        for (let b = 0; b < 4; b++) {
            let y = -52 - o.len / 2 + r() * o.len * o.ext, x = o.cx + (y + 52) * 0.12;
            g.fillStyle = b ? C[3] : C[4];
            const dir = r() < 0.5 ? -1 : 1;
            for (let s = 0; s < 3; s++) { const x2 = x + dir * (4 + r() * 8), y2 = y + (r() - 0.5) * 10; strokeLine(x, y, x2, y2, dotAt(g)); x = x2; y = y2; }
        }
    }
    /** 올려 베기: 맞은 적 몸을 따라 아래에서 위로 그어지는 세로 베임 선(발에서 머리 위로). at은 그 적의 발 자리. */
    function strokeUpCut(at, face, follow) {
        const C = strokeRamp('phys');
        strokeHang(at, { life: 300, follow, top(g, t) {
            strokeLens(g, [face * 4, -50], { ang: -Math.PI / 2 + face * 0.18, len: 112, wMax: 3.5, ext: Math.min(1, t / 60), fade: t < 120 ? 1 : Math.max(0, 1 - (t - 120) / 180) }, C);
        } });
    }

    // ---------------------------------------------------------------- the rising swing (올려 베기)
    const SWING_FRAMES = 8, swingSheets = new Map();
    /** 휘두름 띠의 한 점: 0 빈칸, 1~3 어둡게에서 밝게, 4 휘두른 자리를 옅게 덮는 점. 아래(조금 뒤)에서 앞을 지나 위로 도는 호. */
    function strokeRisePixel(R, dx, dy, k) {
        const a0 = 112 * Math.PI / 180, a1 = -104 * Math.PI / 180, r = Math.hypot(dx, dy), sp = (Math.atan2(dy, dx) - a0) / (a1 - a0);
        const sh = Math.min(1, k / 0.4), stt = Math.max(0, (k - 0.4) / 0.6);
        if (sp < 0 || sp > 1 || sp > sh || sp < stt) return 0;
        const u = (sp - stt) / Math.max(1e-3, sh - stt), w = (2 + 24 * Math.pow(u, 1.3)) * (R / 70) * (k > 0.45 ? 1 - (k - 0.45) * 0.9 : 1);
        return strokeRiseShade({ R, r, k, u, w });
    }
    /** 호 안의 한 점이 띠의 어디인가: 바깥 테(밝게), 안(어둡게에서 밝게), 안쪽 깊이 휘두른 자리(옅게), 밖. */
    function strokeRiseShade(o) {
        const d = o.r - o.R;
        if (d > o.w * 0.35) return 0;
        if (d < -o.w * 0.65) return (o.k < 0.62 && o.u > 0.25 && o.r > o.R * 0.42) ? 4 : 0;
        return d > o.w * 0.35 - 2 ? 3 : (o.u < 0.22 ? 1 : 2);
    }
    /** 띠의 한 칸(f째)을 칠한다. */
    function strokeRiseFrame(data, o) {
        for (let y = 0; y < o.S; y++) for (let x = 0; x < o.S; x++) {
            const v = strokeRisePixel(o.R, x - o.half, y - o.half, (o.f + 0.5) / SWING_FRAMES);
            if (!v) continue;
            const i = (y * o.S * SWING_FRAMES + o.f * o.S + x) * 4, c = o.cols[v];
            data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = v === 4 ? 80 : 255;
        }
    }
    /** 휘두름 띠(여덟 칸)를 한 번 만들어 둔다. */
    function strokeRiseSheet(R) {
        const key = Math.round(R);
        if (swingSheets.has(key)) return swingSheets.get(key);
        const half = Math.ceil(R * 1.25) + 16, S = half * 2, canvas = document.createElement('canvas');
        canvas.width = S * SWING_FRAMES; canvas.height = S;
        const g = canvas.getContext('2d'), image = g.createImageData(S * SWING_FRAMES, S), ink = strokeInk('phys');
        const cols = [null, ink.c3, ink.c2, ink.c1, ink.c2].map(h => h && [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
        for (let f = 0; f < SWING_FRAMES; f++) strokeRiseFrame(image.data, { R: key, S, half, f, cols });
        g.putImageData(image, 0, 0);
        const sheet = { canvas, S, half };
        swingSheets.set(key, sheet);
        return sheet;
    }
    /** 올려 베기의 휘두름: 몸 앞(앞으로 14, 위로 50)에서 0.28초 동안 여덟 칸으로 돈다. R은 베는 길이에 맞춘 반지름. */
    function strokeRiseSwing(at, face, R, follow) {
        const sheet = strokeRiseSheet(Math.max(56, Math.min(120, R)));
        strokeHang(at, { life: 280, follow, top(g, t) {
            const frame = Math.min(SWING_FRAMES - 1, Math.floor(t / 280 * SWING_FRAMES));
            g.save(); g.globalAlpha *= 0.92; g.translate(face * 14, -50); if (face < 0) g.scale(-1, 1);
            g.imageSmoothingEnabled = false;
            g.drawImage(sheet.canvas, frame * sheet.S, 0, sheet.S, sheet.S, -sheet.half, -sheet.half, sheet.S, sheet.S);
            g.restore();
        } });
    }

    // ---------------------------------------------------------------- sword wave (참격파)
    /** 참격파: 처음 0.08초 몸 앞 세로 큰 베기 선, 세운 칼바람(높이 70, 앞으로 볼록, 앞으로 기욺)이 바닥을 긁으며 나아간다. 지나간 바닥에 긁힌 자국 두 줄과 먼지.
     * rows: 옆으로 치는 띠의 위아래 줄 수(2026-10-17). 칼바람이 그 줄들의 몸까지 덮게 위아래로 한 줄(32도트)씩 높아지고, 줄마다 바닥을 긁는다. */
    function strokeSlashWave(at, face, L, dur, rows) {
        const C = strokeRamp('phys'), o = { face, L, dur, rows: rows || 0 };
        strokeHang(at, { life: dur + 260,
            ground: (g, t) => strokeSlashScratches(g, t, o, C),
            top: (g, t) => strokeSlashBlade(g, t, o, C) });
    }
    function strokeSlashScratches(g, t, o, C) {
        for (let lane = -o.rows; lane <= o.rows; lane++) {
            g.save(); g.translate(0, lane * DEEP); strokeSlashScratchLane(g, t, o, C); g.restore();
        }
    }
    /** 한 줄의 긁힌 자국 두 줄과 먼지(붓의 자리가 그 줄의 바닥). */
    function strokeSlashScratchLane(g, t, o, C) {
        const front = Math.min(o.L, o.L * t / o.dur);
        for (let d = 18; d < front; d += 2) {
            const a = Math.max(0, 1 - (t - (d / o.L) * o.dur) / 420) * 0.7;
            if (a <= 0) continue;
            g.globalAlpha = a; g.fillStyle = C[1]; g.fillRect(Math.round(o.face * d), -3, 2, 1); g.fillStyle = C[3]; g.fillRect(Math.round(o.face * d), 3, 2, 1);
        }
        for (let i = 1; i * 36 <= front; i++) {
            const k = (t - (i * 36 / o.L) * o.dur) / 300;
            if (k < 0 || k > 1) continue;
            g.globalAlpha = 0.45 * (1 - k); g.fillStyle = '#b0aca6';
            for (let q = 0; q < 3; q++) g.fillRect(Math.round(o.face * i * 36 - o.face * q * 4 - o.face * k * 8), Math.round(-2 - q * 2 - k * 6), 3, 2);
        }
        g.globalAlpha = 1;
    }
    function strokeSlashBlade(g, t, o, C) {
        const front = Math.min(o.L, o.L * t / o.dur), fade = t > o.dur ? Math.max(0, 1 - (t - o.dur) / 260) : 1;
        g.save(); g.scale(o.face, 1);
        if (t < 170) strokeLens(g, [30, -50], { ang: -Math.PI / 2 + 0.3, len: 116, wMax: 4, ext: Math.min(1, t / 60), fade: t < 90 ? 1 : 1 - (t - 90) / 80 }, C);
        if (fade > 0) { g.translate(Math.round(front + 18), -38); strokeSlashFront(g, t, fade, C, 36 + o.rows * DEEP); }
        g.restore();
    }
    /** 세운 칼바람: 가운데가 앞으로 볼록, 위쪽이 앞으로 기욺, 폭 가운데 7도트. 뒤로 끌리는 바람줄기 세 가닥. H: 위아래 반 높이(기본 36도트).
     * 높아지면 볼록함과 폭도 조금(높이 비의 제곱근만큼) 커진다. */
    function strokeSlashFront(g, t, fade, C, H) {
        const grow = Math.sqrt(H / 36);
        for (let yy = -H; yy <= H; yy++) {
            const k = yy / H, bow = ((1 - k * k) * 9 - k * 7) * grow, w = 1 + 6 * grow * (1 - k * k) ** 1.2;
            for (let xx = -Math.ceil(w); xx <= 0; xx++) { const a = -xx / w; g.fillStyle = xx === 0 ? C[5] : a < 0.35 ? C[4] : a < 0.75 ? C[3] : C[2]; g.globalAlpha = fade * (a < 0.75 ? 1 : 0.6); g.fillRect(Math.round(bow + xx), yy, 1, 1); }
        }
        g.globalAlpha = fade * 0.55; g.fillStyle = C[4];
        for (const [yy, len] of [[-22, 34], [-2, 48], [18, 30]]) { const y = Math.round(yy * H / 36), l = Math.round(len * (0.7 + 0.3 * Math.sin(t / 50 + yy))); g.fillRect(-l - 4, y, l, 1); }
    }

    // ---------------------------------------------------------------- frost mist (서리베기)
    /** 서리베기: 베기 궤적(몸 앞 위에서 앞 아래로 도는 호)을 따라 옅은 얼음 안개 덩이가 남아 천천히 퍼지며 0.7초에 걸쳐 사라진다. */
    function strokeFrostMist(at, face, reach, seed) {
        const C = strokeRamp('frost'), R0 = Math.max(60, reach * 0.62), r = strokeRandom(3301 + seed);
        const blobs = [...Array(9)].map((_, i) => { const a = -1.25 + 2.3 * i / 8; return { x: 16 + R0 * Math.cos(a), y: -46 + R0 * 0.8 * Math.sin(a), d: i * 14, sz: 7 + r() * 6, dx: 4 + r() * 10, dy: -2 - r() * 6 }; });
        strokeHang(at, { life: 760, top(g, t) {
            g.save(); g.scale(face, 1);
            for (const b of blobs) {
                const k = (t - b.d) / 700, a = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * 0.32;
                if (k < 0 || a <= 0) continue;
                const rr = b.sz * (1 + k * 0.8);
                g.globalAlpha = a; g.fillStyle = C[3]; g.beginPath(); g.ellipse(b.x + b.dx * k, b.y + b.dy * k, rr, rr * 0.7, 0, 0, 6.283); g.fill();
                g.globalAlpha = a * 0.8; g.fillStyle = C[5]; g.fillRect(Math.round(b.x + b.dx * k), Math.round(b.y + b.dy * k - rr * 0.3), 1, 1);
            }
            g.restore();
        } });
    }

    // ---------------------------------------------------------------- fire (불사르기, 부싯돌 베기, 폭발성 타격)
    /** 불사르기: 칠 자리에서 부채꼴(쐐기) 끝까지 0.24초에 번지는 불길 앞면(바닥)과 앞면을 따라 솟는 불혀. 지나간 자리는 붉은 불씨로 식는다.
     * rows: 옆으로 치는 띠의 위아래 줄 수(2026-10-17). 있으면 불길이 몸 앞에서 이미 그 줄들의 가운데까지 덮고(바로 위나 아래의 적도
     * 맞는다) 반 칸 안에 다 번져 끝까지 같은 폭으로 나아간다. */
    function strokeFlameFan(at, face, cells, seed, rows) {
        const C = strokeRamp('fire'), Lp = cells * WIDE, dur = 240, r0 = strokeRandom(901 + seed);
        const tongues = [...Array(14)].map((_, i) => [i / 13 * 2 - 1, r0() * 6.28, 0.7 + r0() * 0.6]);
        const half = rows ? x => (0.5 + Math.min(1, (x + WIDE / 2) / WIDE) * rows) * DEEP : x => (0.5 + Math.min(1, x / Lp) * (cells / 2 - 0.5)) * DEEP;
        const reachAt = t => Math.min(Lp, 12 + (Lp - 12) * Math.min(1, t / dur)), fadeAt = t => (t > dur ? Math.max(0, 1 - (t - dur) / 260) : 1);
        strokeHang(at, { life: dur + 260,
            ground(g, t) {
                const r = reachAt(t), fade = fadeAt(t);
                for (let x = 8; x < r; x += 3) {
                    const h = half(x), back = r - x, a = fade * Math.max(0, 1 - back / 90) * 0.7;
                    if (a <= 0.02) continue;
                    for (let y = -h; y <= h; y += 3) { const q = (Math.sin(x * 0.7 + y * 1.3 + t / 40) + 1) / 2; g.globalAlpha = a * (0.4 + 0.6 * q); g.fillStyle = back < 10 ? C[4] : back < 30 ? C[3] : C[2]; g.fillRect(Math.round(face * x), Math.round(y), 2, 2); }
                }
                g.globalAlpha = 1;
            },
            top: (g, t) => strokeFlameTongues(g, t, { tongues, face, r: reachAt(t), fade: fadeAt(t), h: half(reachAt(t)) }, C) });
    }
    function strokeFlameTongues(g, t, o, C) {
        for (const [k, ph, sz] of o.tongues) {
            const x = Math.round(o.face * (o.r - (k * k) * 10)), y = Math.round(o.h * k), ht = Math.round((10 + 14 * sz) * o.fade * (0.7 + 0.3 * Math.sin(t / 45 + ph)));
            for (let j = 0; j < ht; j++) {
                const u = j / ht, w = u < 0.3 ? 3 : u < 0.7 ? 2 : 1;
                g.globalAlpha = o.fade * (1 - u * 0.6); g.fillStyle = u < 0.25 ? C[4] : u < 0.6 ? C[3] : C[2];
                g.fillRect(x - (w >> 1) + Math.round(Math.sin(ph + j * 0.4 + t / 60) * 1.5), y - j, w, 1);
            }
        }
        g.globalAlpha = 1;
    }
    /** 부싯돌 베기 예비 동작: 무기 끝이 바닥을 긁어 뒤로 튀는 불티와 바닥의 붉은 홈(wind ms 동안). */
    function strokeDragSpark(at, face, wind, seed) {
        const r = strokeRandom(4711 + seed), colours = ['#fff1c4', '#ffc35a', '#f0843c'];
        const sparks = [...Array(40)].map((_, i) => ({ t0: i * 14, x: face * (26 + r() * 8), vx: -face * (40 + r() * 110), vy: -(50 + r() * 110), c: colours[i % 3] })).filter(s => s.t0 < wind);
        strokeHang(at, { life: wind + 260,
            ground(g, t) { g.globalAlpha = t < wind ? 0.7 : Math.max(0, 0.7 - (t - wind) / 260); g.fillStyle = '#c4521f'; g.fillRect(Math.round(face * 10 - (face < 0 ? 26 : 0)), 0, 26, 1); g.globalAlpha = 1; },
            top(g, t) {
                for (const s of sparks) {
                    const tt = (t - s.t0) / 1000;
                    if (tt < 0 || tt > 0.26) continue;
                    g.globalAlpha = 1 - tt / 0.26; g.fillStyle = s.c; g.fillRect(Math.round(s.x + s.vx * tt), Math.round(-1 + s.vy * tt + 300 * tt * tt), tt < 0.08 ? 2 : 1, 1);
                }
                g.globalAlpha = 1;
            } });
    }
    /** 화염 검기(부싯돌 베기의 투사체): 바닥에 선 초승달 모양 불길(높이 60, 앞으로 볼록)과 뒤로 날리는 불혀. 붓의 자리가 바닥이고 오른쪽을 본다. */
    function strokeFlameWave(g, t) {
        const C = strokeRamp('fire'), r = strokeRandom(31 + Math.floor(t / 60));
        for (let yy = 0; yy >= -60; yy--) {
            const k = (yy + 30) / 30, bow = (1 - k * k) * 13, w = 2 + 7 * (1 - k * k);
            for (let xx = -Math.ceil(w); xx <= 0; xx++) { const a = -xx / w; g.fillStyle = a < 0.3 ? C[5] : a < 0.6 ? C[4] : a < 0.85 ? C[3] : C[2]; g.globalAlpha = a < 0.85 ? 1 : 0.7; g.fillRect(Math.round(bow + xx), yy, 1, 1); }
        }
        for (let i = 0; i < 9; i++) {
            const yy = -Math.round(r() * 58), len = 6 + Math.round(r() * 18), x0 = Math.round((1 - ((yy + 30) / 30) ** 2) * 13) - 9;
            for (let j = 0; j < len; j++) { g.globalAlpha = 0.8 * (1 - j / len); g.fillStyle = j < len * 0.3 ? C[4] : C[3]; g.fillRect(x0 - j, yy - Math.round(j * 0.25), 1, 1); }
        }
        g.globalAlpha = 1;
    }
    /** 화염 검기가 지나간 바닥: 그을린 줄과 불씨. 검기가 사라진 뒤 0.52초에 걸쳐 식는다. length(t): 그때까지 나아간 도트. */
    function strokeScorch(at, face, flight, length) {
        const C = strokeRamp('fire');
        strokeHang(at, { life: flight + 520, ground(g, t) {
            const a = t < flight ? 1 : Math.max(0, 1 - (t - flight) / 520), L = length(Math.min(t, flight));
            for (let d = 0; d < L; d += 2) {
                const x = Math.round(face * d), fresh = L - d < 40 && t < flight;
                g.globalAlpha = a * (fresh ? 0.8 : 0.45); g.fillStyle = fresh ? C[3] : '#3a2a22'; g.fillRect(x, 0, 2, 1);
                if (d % 10 === 0) { g.fillStyle = C[fresh ? 4 : 2]; g.fillRect(x, -1 - ((d / 10 + Math.floor(t / 80)) % 2), 1, 1); }
            }
            g.globalAlpha = 1;
        } });
    }
    /** 폭발성 타격: 맞은 적 몸 가운데 불씨가 점점 부풀며 빨리 깜빡이다가(ms 동안) 터진다(폭발은 클립). at은 그 적의 발 자리. */
    function strokeFuse(at, ms, follow) {
        const C = strokeRamp('fire');
        strokeHang(at, { life: ms, follow, top(g, t) {
            const u = Math.min(1, t / ms), rr = 2 + Math.round(u * 5), blink = Math.floor(t / Math.max(30, 110 - u * 80)) % 2;
            g.fillStyle = blink ? C[4] : C[3]; g.globalAlpha = 0.9;
            g.fillRect(-rr, -44 - rr + 1, rr * 2 + 1, rr * 2 - 1); g.fillRect(-rr + 1, -44 - rr, rr * 2 - 1, rr * 2 + 1);
            g.fillStyle = C[5]; g.fillRect(-1, -45, 3, 3);
            for (let i = 0; i < 4; i++) { const a = t / 90 + i * Math.PI / 2, d = rr + 5; g.fillStyle = C[4]; g.fillRect(Math.round(Math.cos(a) * d), Math.round(-44 + Math.sin(a) * d * 0.8), 1, 1); }
            g.globalAlpha = 1;
        } });
    }

    return Object.freeze({ hang: strokeHang, random: strokeRandom, line: strokeLine, lens: strokeLens, ramp: strokeRamp, ink: strokeInk,
        crossCut: strokeCrossCut, vCut: strokeVCut, upCut: strokeUpCut, riseSwing: strokeRiseSwing, slashWave: strokeSlashWave, frostMist: strokeFrostMist,
        flameFan: strokeFlameFan, dragSpark: strokeDragSpark, flameWave: strokeFlameWave, scorch: strokeScorch, fuse: strokeFuse });
})();
safeExposeGlobals({ stageSkillStrokes });
