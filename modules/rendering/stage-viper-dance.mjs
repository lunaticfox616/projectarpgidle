/** 독사의 춤(94, V3.24 시뮬레이터 doViper와 리메이크 V3.16.7 viper-dance-remake.js): 제자리에서 돌며 사복검을 푼다. 쇠줄에 이어진 칼날 마디 열넷이
 * 나선으로 멀리 벌어져(펼침) 둘레를 한 바퀴 훑고(회전) 다시 모인다. 끝 칼날(14번)과 안쪽 칼날(10번)이 지나간 자리에 두 갈래 녹빛 잔상이 그 자리에
 * 고정되어 0.5초 동안 꼬리 끝부터 가늘어지며 사라지고, 칼날 실루엣 셋이 뒤따른다. 맞은 적마다 베임과 독 안개.
 * 그림: 칼날 마디와 송곳니 끝은 전달본의 blades-sheet(32×32 두 장, 2배로). 잔상의 질감, 베임, 독 안개는 구입한 이펙트 그림(vfx.png, vfx2.png)의
 * rogue2 4번 칸, x_cut, x_poison을 전달본의 색으로 다시 칠해 처음 쓸 때 한 번 담는다(전달본과 같다: 파생 그림을 따로 두지 않는다). 잔상 질감은
 * 원본 칸의 열마다 가장 두꺼운 불투명 구간을 펴서 128×12로 만든 띠다.
 * 게임의 규칙으로 바꾼 것: 칼날의 64자세는 칼날 그림이 오면 한 번 돌려 담는다(전달본과 같은 도트 대응). 오래된 잔상에서 흩어지는 조각은 원본 칸을
 * 0.22배로 줄이는 대신 1~2도트 점으로 그리고, 베임과 독 안개는 1배로 그린다. 효과 줄이기에서는 칼날 실루엣과 흩어지는 조각을 뺀다.
 * 피해의 때는 전투가 정한다(modules/combat/gem-extension-v324.mjs). 그리기만 한다.
 */
const TAU = Math.PI * 2, N = 14, POSES = 64, SIZE = 32;
const BLADES = Object.freeze({ file: 'assets/stage-vfx/viper-dance/blades-sheet.png', scale: 2 });
const C = Object.freeze({ ink: '#20262d', steel: '#83949a', edge: '#c9d5cc', deep: '#4d7151', venom: '#92b76b', violet: '#7d718a', trail: '#86c278', trailLight: '#c1e69b' });
const MOTION = Object.freeze({ spread: 3.1, innerLag: 32, cableLag: 28, cableBend: 20, trailMs: 280, linger: 500, ghostAges: Object.freeze([40, 90, 150]), height: 34 });
const GHOST = Object.freeze([145, 204, 120]);
const TRAIL_RAMP = Object.freeze([[20, 43, 27], [42, 93, 48], [70, 143, 60], [113, 198, 78], [163, 231, 111], [211, 248, 170]]);
const POISON_RAMP = Object.freeze([[22, 38, 25], [43, 73, 43], [70, 108, 54], [103, 151, 68], [153, 194, 103], [202, 226, 157]]);
const NATIVE = Object.freeze({ arc: { asset: 'rogue2', frames: [4], ramp: TRAIL_RAMP }, cut: { asset: 'x_cut', frames: [0, 1, 2, 3, 4, 5], ramp: null },
    poison: { asset: 'x_poison', frames: [0, 1, 2, 3, 4, 5, 6], ramp: POISON_RAMP } });
const LIMIT = Object.freeze({ swirls: 4, bites: 16 });
const BITE_LAYERS = Object.freeze([
    { role: 'poison', life: 340, alpha: 0.65 },
    { role: 'cut', life: 220, alpha: 0.85 }
]);
const clamp = value => Math.max(0, Math.min(1, value));
const snap = Math.round;

class StageViperDance {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.picture = null;
        this.poses = null;
        this.ghosts = null;
        this.native = null;
        this.nativeFailed = false;
        this.errors = [];
        this.swirls = [];
        this.bites = [];
    }

    open() { if (!this.picture) this.picture = this.deps.stagePictures.openPicture(BLADES.file); return this.picture; }

    canvas(w, h) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        return canvas;
    }

    /** 칼날 두 장의 64자세와 녹빛 실루엣(칼날이 오면 한 번), 구입한 이펙트 칸들(그 그림이 아직 없으면 다음 시전에 다시 본다. 없으면 잔상과 베임만 빠진다). */
    ready() {
        if (!this.open().ready) return false;
        if (!this.poses) this.bakeBlades();
        if (!this.native && !this.nativeFailed) this.native = this.bakeNative();
        return true;
    }

    bakeBlades() {
        this.poses = []; this.ghosts = [];
        for (let kind = 0; kind < 2; kind++) {
            const base = this.canvas(SIZE, SIZE), g = base.getContext('2d', { willReadFrequently: true });
            g.drawImage(this.picture.source, kind * SIZE, 0, SIZE, SIZE, 0, 0, SIZE, SIZE);
            const source = g.getImageData(0, 0, SIZE, SIZE).data, bank = Array.from({ length: POSES }, (_, k) => this.rotated(source, k / POSES * TAU));
            this.poses.push(bank);
            this.ghosts.push(bank.map(pose => this.tinted(pose)));
        }
    }

    /** 도트 그대로 돌린 칼날 한 자세(전달본: 칸마다 원본의 한 칸을 고른다). */
    rotated(source, angle) {
        const co = Math.cos(angle), si = Math.sin(angle), canvas = this.canvas(SIZE, SIZE), g = canvas.getContext('2d'), image = g.createImageData(SIZE, SIZE);
        for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
            const sx = snap(16 + (x - 16) * co + (y - 16) * si), sy = snap(16 - (x - 16) * si + (y - 16) * co);
            if (sx < 0 || sy < 0 || sx >= SIZE || sy >= SIZE) continue;
            const at = (sy * SIZE + sx) * 4;
            image.data.set(source.subarray(at, at + 4), (y * SIZE + x) * 4);
        }
        g.putImageData(image, 0, 0);
        return canvas;
    }

    tinted(pose) {
        const canvas = this.canvas(SIZE, SIZE), g = canvas.getContext('2d'), image = pose.getContext('2d').getImageData(0, 0, SIZE, SIZE);
        for (let i = 0; i < image.data.length; i += 4) if (image.data[i + 3]) image.data.set(GHOST, i);
        g.putImageData(image, 0, 0);
        return canvas;
    }

    bakeNative() {
        const banks = {};
        try {
            for (const [role, spec] of Object.entries(NATIVE)) {
                const row = this.deps.STAGE_SKILL_VFX.atlas[spec.asset], picture = row && this.deps.stageSkillVfx.picture(row.im || 0);
                if (!picture) return null;
                banks[role] = { w: row.w, h: row.h, frames: spec.frames.map(frame => this.nativeFrame(picture, row, frame, spec.ramp)) };
            }
            banks.trail = this.unwrap(banks.arc.frames[0], banks.arc.w, banks.arc.h);
            return banks;
        } catch (error) {   // 그림을 읽을 수 없는 판(원래 색으로 그리는 판): 칼날과 쇠줄만 그리고 잔상, 베임, 독 안개는 빠진다(까닭은 errors)
            this.nativeFailed = true;
            this.errors.push(String(error && error.message));
            return null;
        }
    }

    /** 원본 한 칸: ramp가 있으면 밝기를 여섯 색 가운데 위 다섯으로 다시 칠한다(전달본 prepareNative). */
    nativeFrame(picture, row, frame, ramp) {
        const [x, y] = row.fx[frame], canvas = this.canvas(row.w, row.h), g = canvas.getContext('2d', { willReadFrequently: true });
        g.drawImage(picture, x, y, row.w, row.h, 0, 0, row.w, row.h);
        if (!ramp) return canvas;
        const image = g.getImageData(0, 0, row.w, row.h), d = image.data, low = row.p?.[0] || 0, span = Math.max(1, (row.p?.[1] || 255) - low);
        for (let i = 0; i < d.length; i += 4) {
            if (!d[i + 3]) continue;
            const v = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] - low) / span;
            d.set(ramp[v < 0 ? 0 : 1 + Math.floor(clamp(v) * 4.999)], i);
        }
        g.putImageData(image, 0, 0);
        return canvas;
    }

    /** 잔상 질감: 열마다 가장 두꺼운 불투명 구간을 12도트 높이로 펴고, 위아래 끝을 옅게 한다(128×12). */
    unwrap(frame, w, h) {
        const d = frame.getContext('2d').getImageData(0, 0, w, h).data;
        /** @type {Array<[number, number, number]>} */
        const columns = [];
        for (let x = 0; x < w; x++) { const run = this.thickestRun(d, w, h, x); if (run) columns.push([x, run[0], run[1]]); }
        const canvas = this.canvas(128, 12), g = canvas.getContext('2d'), image = g.createImageData(128, 12);
        for (let x = 0; x < 128 && columns.length; x++) this.stretchColumn(image.data, d, w, x, columns[Math.min(columns.length - 1, Math.floor(x * columns.length / 128))]);
        g.putImageData(image, 0, 0);
        return canvas;
    }

    /** 한 열에서 가장 두꺼운 불투명 구간 [위, 아래], 없으면 null. */
    thickestRun(d, w, h, x) {
        let lo = h, hi = -1, start = -1;
        for (let y = 0; y <= h; y++) {
            const solid = y < h && d[(y * w + x) * 4 + 3] > 8;
            if (solid && start < 0) start = y;
            if (solid || start < 0) continue;
            if (y - start > hi - lo + 1) { lo = start; hi = y - 1; }
            start = -1;
        }
        return hi >= lo ? [lo, hi] : null;
    }

    /** 띠의 한 열: 원본 구간을 12도트로 펴고 위아래 세 도트를 옅게 한다. */
    stretchColumn(out, d, w, x, [column, lo, hi]) {
        for (let y = 0; y < 12; y++) {
            const at = (snap(lo + (hi - lo) * y / 11) * w + column) * 4, to = (y * 128 + x) * 4;
            out.set(d.subarray(at, at + 4), to);
            out[to + 3] = snap(out[to + 3] * Math.min(1, Math.min(y, 11 - y) / 3));
        }
    }

    shown(list, row, limit) {
        const now = this.deps.stageSkillVfx.now();
        for (let i = list.length - 1; i >= 0; i--) if (now - list[i].born >= list[i].life) list.splice(i, 1);
        return list.indexOf(row) >= list.length - limit;
    }

    keep(list, row) { row.born = this.deps.stageSkillVfx.now(); list.push(row); return row; }

    /** 시전 하나의 계획: 둘레(타원 반지름, 도트), 때(펼침, 회전, 동작), 고정된 잔상 자취(칼날 14번과 10번이 실제로 지난 자리). */
    plan(event) {
        const [A, B] = this.shared.semi(Number(event.viperRadius) || 3), W = { ext: Number(event.viperSpread) || 110, sweep: Number(event.viperSpin) || 430, dur: Number(event.viperAct) || 700 };
        const plan = { face: event.viperFace || 1, A, B, W, end: W.ext + W.sweep, life: W.dur + MOTION.linger, reduced: this.deps.reduced(), pts: new Float32Array((N + 1) * 3) };
        plan.steps = Math.max(12, Math.min(64, Math.ceil(W.sweep / 10)));
        plan.stepMs = W.sweep / plan.steps;
        plan.tracks = [14 / N, 10 / N];
        const out = new Float32Array(3);
        plan.history = plan.tracks.map(u => {
            const h = new Float32Array((plan.steps + 1) * 2);
            for (let j = 0; j <= plan.steps; j++) { this.at(plan, W.ext + j * plan.stepMs, u, out); h[j * 2] = out[0]; h[j * 2 + 1] = out[1] - MOTION.height; }
            return h;
        });
        return plan;
    }

    angle(t, W) { const end = W.ext + W.sweep; return TAU * clamp((t - W.ext) / W.sweep) + (t > end ? (t - end) / (W.dur - end) * 0.9 : 0) - (t < W.ext ? (1 - t / W.ext) * 0.8 : 0); }

    extension(t, W) { return t < W.ext ? 0.25 + 0.75 * (1 - (1 - t / W.ext) ** 2) : t < W.ext + W.sweep ? 1 : Math.max(0, 1 - (t - W.ext - W.sweep) / (W.dur - W.ext - W.sweep)); }

    /** 칼날 마디 하나(u: 0 손잡이 ~ 1 끝)의 땅 위 자리(시전한 자리의 발에서 도트)와 각. */
    at(plan, t, u, out) {
        const e = this.extension(t, plan.W), delayed = Math.max(0, t - (1 - u) * MOTION.innerLag * e), a = this.angle(delayed, plan.W) - (1 - u) * MOTION.spread * (0.35 + 0.65 * e), r = e * u ** 0.85;
        out[0] = plan.face * plan.A * r * Math.cos(a); out[1] = plan.B * r * Math.sin(a); out[2] = a;
        return out;
    }

    bladeOffset(plan, t, i) {
        const amp = (0.38 + (i * 7 % 9) * 0.045) * (i === N ? 0.65 : 1), phase = i * 2.399963;
        const wave = Math.sin(t / (69 + (i * 17 % 57)) + phase) + 0.3 * Math.sin(t / (43 + (i * 11 % 37)) + phase * 0.63);
        return plan.face * amp * wave * Math.min(1, t / 90) * (0.55 + 0.45 * this.extension(t, plan.W));
    }

    poseIndex(plan, [x0, y0, x1, y1], i, t) {
        const a = Math.atan2(y1 - y0, x1 - x0) + (i === N ? 0.28 : 1.02) * (plan.face > 0 ? 1 : -1) + this.bladeOffset(plan, t, i);
        return ((snap(a / TAU * POSES) % POSES) + POSES) % POSES;
    }

    trailOpacity(age) { return age < 0 || age >= MOTION.linger ? 0 : (1 - age / MOTION.linger) ** 1.2; }

    /** 고정된 자취를 따라 붙이는 녹빛 질감(오래된 구간일수록 가늘고 끊긴다). back: 시전자 뒤쪽 반(바닥 층)만 그리는가. */
    trails(g, t, plan, back) {
        const until = Math.min(t, plan.end), out = new Float32Array(3);
        for (let track = 1; track >= 0; track--) {
            const h = plan.history[track];
            for (let j = 0; j < plan.steps; j++) {
                const start = plan.W.ext + j * plan.stepMs, born = start + plan.stepMs;
                if (start >= until) break;
                const age = Math.max(0, t - born), opacity = this.trailOpacity(age);
                if (opacity <= 0) continue;
                let x1 = h[(j + 1) * 2], y1 = h[(j + 1) * 2 + 1];
                if (born > until) { this.at(plan, until, plan.tracks[track], out); x1 = out[0]; y1 = out[1] - MOTION.height; }
                const x0 = h[j * 2], y0 = h[j * 2 + 1];
                if (((y0 + y1) / 2 < -MOTION.height) !== back) continue;
                this.trailSection(g, { x0, y0, x1, y1, j, track, age, opacity }, plan);
            }
        }
    }

    trailSection(g, s, plan) {
        const dx = s.x1 - s.x0, dy = s.y1 - s.y0, len = Math.hypot(dx, dy), fray = clamp((s.age - 210) / 290);
        if (len < 0.01) return;
        const width = (s.track ? 6 : 10) * (0.18 + 0.82 * Math.sqrt(s.opacity)), breakup = clamp((1 - fray - ((s.j * 13 + s.track * 7) % 19) / 19 * 0.38) / 0.25);
        g.save();
        g.translate(s.x0, s.y0); g.rotate(Math.atan2(dy, dx));
        g.globalAlpha = (s.track ? 0.31 : 0.64) * s.opacity * breakup;
        g.drawImage(this.native.trail, s.j / plan.steps * 128, 0, 128 / plan.steps, 12, 0, -width / 2, len + 0.6, width);
        if (fray > 0 && s.j % 3 === 0 && !plan.reduced) {
            const side = (s.j + s.track) % 2 ? 1 : -1, drift = side * (1 + fray * 7);
            g.globalAlpha = (s.track ? 0.2 : 0.44) * Math.sin(Math.PI * fray) * (1 - fray); g.fillStyle = C.trail;
            g.fillRect(snap(len * 0.1), snap(drift), 2, 1);
            g.globalAlpha = (s.track ? 0.12 : 0.28) * (1 - fray); g.fillStyle = C.trailLight;
            g.fillRect(snap(len * 0.6 + fray * 3), snap(drift * 1.4), 1, 1);
        }
        g.restore();
    }

    /** 칼날 실루엣 셋: 지나간 자세가 저마다 생긴 때부터 옅어진다. */
    echoes(g, t, plan, back) {
        if (plan.reduced) return;
        const until = Math.min(t, plan.end), a = new Float32Array(3), b = new Float32Array(3), size = SIZE * BLADES.scale;
        for (let k = MOTION.ghostAges.length - 1; k >= 0; k--) {
            const past = until - MOTION.ghostAges[k];
            if (past < plan.W.ext || past > plan.end) continue;
            for (let i = 4; i <= N; i += 2) {
                this.at(plan, past, (i - 1) / N, b); this.at(plan, past, i / N, a);
                if ((a[1] < 0) !== back) continue;
                g.globalAlpha = 0.28 * (1 - k * 0.32) * this.trailOpacity(t - past);
                g.drawImage(this.ghosts[i === N ? 1 : 0][this.poseIndex(plan, [b[0], b[1], a[0], a[1]], i, past)], snap(a[0]) - size / 2, snap(a[1] - MOTION.height) - size / 2, size, size);
            }
        }
    }

    /** 쇠줄: 마디 사이를 지난 자리 쪽으로 조금 휜 곡선(끝은 칼날에 붙어 있다). */
    cable(g, t, plan, back, e) {
        const p = plan.pts, a = new Float32Array(3), b = new Float32Array(3), fade = this.fade(t, plan), lag = Math.max(0, t - MOTION.cableLag);
        for (let i = 0; i < N; i++) {
            const x0 = p[i * 3], y0 = p[i * 3 + 1], x1 = p[(i + 1) * 3], y1 = p[(i + 1) * 3 + 1], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
            const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
            this.at(plan, lag, i / N, a); this.at(plan, lag, (i + 1) / N, b);
            const limit = Math.min(MOTION.cableBend, len * 0.52), bend = Math.max(-limit, Math.min(limit, (((a[0] + b[0]) / 2 - mx) * nx + ((a[1] + b[1]) / 2 - my) * ny) * 0.8)) * e;
            this.curve(g, [x0, y0, mx + nx * bend, my + ny * bend + e * 2, x1, y1], back, fade);
        }
    }

    curve(g, [x0, y0, cx, cy, x1, y1], back, fade) {
        let ax = x0, ay = y0;
        for (let j = 1; j <= 7; j++) {
            const u = j / 7, v = 1 - u, bx = v * v * x0 + 2 * v * u * cx + u * u * x1, by = v * v * y0 + 2 * v * u * cy + u * u * y1;
            if (((ay + by) / 2 < 0) === back) {
                g.globalAlpha = fade; this.line(g, [ax, ay - MOTION.height, bx, by - MOTION.height], C.ink, 2);
                g.globalAlpha = 0.96 * fade; this.line(g, [ax, ay - MOTION.height - 1, bx, by - MOTION.height - 1], j % 3 ? C.steel : C.edge, 1);
            }
            ax = bx; ay = by;
        }
    }

    /** 도트 선(브레즌햄, 전달본 line). */
    line(g, [x0, y0, x1, y1], colour, w) {
        x0 = snap(x0); y0 = snap(y0); x1 = snap(x1); y1 = snap(y1);
        g.fillStyle = colour;
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (let n = 0; n < 1800; n++) {
            g.fillRect(x0, y0, w, w);
            if (x0 === x1 && y0 === y1) break;
            const e2 = err * 2;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    }

    blades(g, t, plan, back) {
        const p = plan.pts, fade = this.fade(t, plan), size = SIZE * BLADES.scale;
        g.globalAlpha = fade;
        for (let i = 1; i <= N; i++) {
            const x = p[i * 3], y = p[i * 3 + 1];
            if ((y < 0) !== back) continue;
            g.drawImage(this.poses[i === N ? 1 : 0][this.poseIndex(plan, [p[i * 3 - 3], p[i * 3 - 2], x, y], i, t)], snap(x) - size / 2, snap(y - MOTION.height) - size / 2, size, size);
        }
    }

    /** 가장 최근 호를 따라 떨어지는 독 방울 열. */
    venom(g, t, plan, back) {
        const out = new Float32Array(3), fade = this.fade(t, plan);
        for (let i = 0; i < 10; i++) {
            const born = plan.W.ext + (i + 0.5) / 10 * plan.W.sweep, age = t - born;
            if (age < 0 || age > 160) continue;
            this.at(plan, born, 1, out);
            if ((out[1] < 0) !== back) continue;
            const u = age / 160;
            g.globalAlpha = 0.55 * (1 - u) * fade; g.fillStyle = i % 3 ? C.venom : C.violet;
            g.fillRect(snap(out[0] + plan.face * Math.cos(out[2]) * u * 10), snap(out[1] - 33 + u * u * 17), 2, 3);
        }
    }

    fade(t, plan) { return t > plan.end ? clamp((plan.W.dur - t) / 90) : Math.min(1, t / 45); }

    /** 한 층(back: 시전자 뒤쪽 반, 바닥 층): 잔상, 실루엣, 그다음 쇠줄과 칼날(본체가 잔상에 묻히지 않게). */
    layer(g, t, plan, back) {
        if (!this.shown(this.swirls, plan, LIMIT.swirls)) return;
        g.imageSmoothingEnabled = false;
        if (this.native && t >= plan.W.ext && t < plan.end + MOTION.linger) this.trails(g, t, plan, back);
        if (t >= plan.W.ext) this.echoes(g, t, plan, back);
        if (t < plan.W.dur) this.body(g, t, plan, back);
        g.globalAlpha = 1;
    }

    body(g, t, plan, back) {
        const e = this.extension(t, plan.W), out = new Float32Array(3);
        for (let i = 0; i <= N; i++) { this.at(plan, t, i / N, out); plan.pts.set(out, i * 3); }
        if (back) { g.fillStyle = '#0e1116'; g.globalAlpha = 0.2 * this.fade(t, plan); for (let i = 2; i <= N; i++) g.fillRect(snap(plan.pts[i * 3] - 7), snap(plan.pts[i * 3 + 1] - 1), 14, 3); }
        this.cable(g, t, plan, back, e);
        this.blades(g, t, plan, back);
        this.venom(g, t, plan, back);
    }

    /** 휘두르기 사건 하나(시전 하나, 이중 발동의 둘째 바퀴 하나). 그림이 아직 없으면 그리지 않는다(첫 시전 전에 warm이 연다). */
    swirl(c) {
        if (!c.first || !this.ready()) return true;
        const plan = this.keep(this.swirls, this.plan(c.event));
        this.shared.hangPair(c.event.landingCell, plan.life, (g, t) => this.layer(g, t, plan, true), (g, t) => this.layer(g, t, plan, false));
        return true;
    }

    /** 맞은 적: 베임(x_cut 여섯 칸, 0.22초)과 독 안개(x_poison 일곱 칸, 0.34초)를 1배로. */
    bite(c) {
        if (!c.first || !this.ready() || !this.native || !c.event.targetCells?.length) return true;
        const row = this.keep(this.bites, { life: 340, face: c.event.viperFace || 1 });
        this.shared.ST.hang({ ...this.shared.K.at(c.event.targetCells[0]), dy: -40 }, { life: row.life, top: (g, t) => this.biteFrame(g, t, row) });
        return true;
    }

    biteFrame(g, t, row) {
        if (!this.shown(this.bites, row, LIMIT.bites)) return;
        g.save();
        g.imageSmoothingEnabled = false;
        g.scale(row.face, 1);
        for (const { role, life, alpha } of BITE_LAYERS) {
            const bank = this.native[role], u = t / life;
            if (u >= 1) continue;
            g.globalAlpha = alpha * Math.pow(1 - u, 0.5);
            g.drawImage(bank.frames[Math.min(bank.frames.length - 1, Math.floor(u * bank.frames.length))], -bank.w / 2, -bank.h / 2);
        }
        g.restore();
    }
}

export function createStageViperDance(deps, shared) {
    return new StageViperDance(deps, shared);
}
