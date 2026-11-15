/** 2026-11-13 전달본 리메이크 세 가지(부싯돌 베기 V3.18.1, 강타 V3.19.2, 일섬 피격 V3.20.3)의 그림. 이펙트 그림(assets/stage-vfx/)의 원본 칸을
 * 전달본의 색으로 다시 칠해 처음 쓸 때 한 번만 담아 두고, 자리와 시간은 코드로 정해 그린다. 수치는 시뮬레이터의 곁다리 모듈
 * (flint-ground-wave-remake.js, heavy-slam-remake.js, issen-hit-remake.js) 그대로다. 길이는 캐릭터 도트이고 자리는 연출을 건 곳(발 자리)에서 잰다.
 * 원본 그림을 아직 못 읽었거나 읽을 수 없으면 ready가 거짓이고, 부르는 쪽이 예전 연출을 그린다(읽지 못한 까닭은 state().errors).
 * 그리기만 한다: 피해, 대상, 시간은 전투 쪽이 정한다.
 */
const FLAME = [[62, 32, 31], [105, 45, 29], [172, 65, 26], [224, 106, 31], [251, 169, 62], [255, 217, 136]];
const EARTH = [[34, 29, 29], [57, 48, 44], [84, 68, 56], [123, 102, 77], [164, 143, 105], [203, 181, 137]];
const STEEL = [[42, 45, 49], [66, 73, 79], [98, 108, 114], [140, 150, 153], [186, 194, 188], [225, 222, 201]];
const DARK = [[20, 18, 22], [28, 25, 29], [40, 33, 32], [65, 51, 43], [90, 72, 51], [113, 93, 65]];
const SIX = [0, 1, 2, 3, 4, 5];
/** 담아 둘 칸들: asset 원본 클립, frames 그 칸 번호, 색은 ramp(밝기를 여섯 색 가운데 위 다섯으로), solid(한 색), steps(밝기 문턱마다 한 색) 가운데 하나. */
const BANKS = Object.freeze({
    flame: { asset: 'n_flame', frames: [...SIX, 6, 7, 8, 9, 10, 11], ramp: FLAME },
    fireGround: { asset: 'n_gfire', frames: [...SIX, 6, 8, 9, 10], ramp: FLAME },
    slamCut: { asset: 'x_cut', frames: SIX, ramp: STEEL },
    slamBurst: { asset: 'n_ground', frames: [...SIX, 6, 7, 8, 9], ramp: EARTH },
    slamDust: { asset: 'n_dust', frames: [...SIX, 6, 7], ramp: EARTH },
    slamCrack: { asset: 'x_hcrack', frames: [0], ramp: DARK },
    slamHit: { asset: 'x_hit', frames: [0, 1, 2, 3, 4], ramp: STEEL },
    issenMain: { asset: 'x_cut', frames: SIX, solid: [255, 227, 214] },
    issenEcho: { asset: 'x_cut', frames: SIX, solid: [218, 58, 84] },
    issenImpact: { asset: 'x_hit', frames: [0, 1, 2, 3, 4], steps: [[0.8, [246, 216, 180]], [0.5, [207, 132, 105]], [-1, [112, 45, 61]]] },
    issenBits: { asset: 'n_sl2b', frames: [3, 4, 5, 6], steps: [[0.75, [239, 122, 134]], [0.4, [208, 58, 88]], [-1, [113, 30, 57]]] }
});
const KINDS = Object.freeze({ flint: ['flame', 'fireGround'], slam: ['slamCut', 'slamBurst', 'slamDust', 'slamCrack', 'slamHit'], issen: ['issenMain', 'issenEcho', 'issenImpact', 'issenBits'] });
/** 강타의 바닥: 본 타격과 여진(작고 짧게). spread 균열 폭, brightMs 밝은 테를 보이는 동안, burst 첫 파쇄, dust 흙먼지. */
const SLAM_MAIN = Object.freeze({ spread: 104, crackAlpha: 0.98, brightMs: 85, burstEnd: 100, burstW: 110, burstH: 32, burstAlpha: 0.9, dustDelay: 30, dustStep: 52, dustW: 130, dustH: 33, dustAlpha: 0.72 });
const SLAM_AFTER = Object.freeze({ spread: 78, crackAlpha: 0.85, brightMs: 55, burstEnd: 65, burstW: 76, burstH: 23, burstAlpha: 0.52, dustDelay: 0, dustStep: 40, dustW: 92, dustH: 26, dustAlpha: 0.58 });
const clamp = value => Math.max(0, Math.min(1, value));
const snap = Math.round;

class StageNativeRemakes {
    constructor(deps) {
        this.deps = deps;
        this.banks = {};
        this.failed = new Set();
        this.errors = [];
        this.extra = { slamStrokes: [], slamCracks: [] };
        this.lives = { wave: { clock: -1, count: 0 }, slam: [], issen: [] };
        this.LIMIT = Object.freeze({ wave: 12, slam: 8, issen: 12 });
    }

    /** 바닥 층(ground)과 위 층(top)에 코드로 그리는 연출을 건다. 붓은 도트 단위로 맞춰 두고 draw(붓, t, dot)를 부른다. */
    hang(at, fx) {
        for (const layer of ['ground', 'top']) {
            const draw = fx[layer];
            if (draw) this.deps.stageSkillVfx.paint(at, { life: fx.life, layer, follow: fx.follow || null }, (ctx, t, dot) => { ctx.scale(dot, dot); draw(ctx, t, dot); });
        }
    }

    /** 그 갈래의 칸이 다 담겼는가. 처음 부를 때 담고, 원본 그림이 아직 안 왔으면 다음에 다시 본다. */
    ready(kind) {
        const names = KINDS[kind];
        if (!names || names.some(name => this.failed.has(name))) return false;
        for (const name of names) if (!this.banks[name] && !this.fill(name)) return false;
        if (kind === 'slam' && !this.extra.slamStrokes.length) this.bakeSlam();
        return true;
    }

    fill(name) {
        const spec = BANKS[name], row = this.deps.STAGE_SKILL_VFX.atlas[spec.asset], picture = row && this.deps.stageSkillVfx.picture(row.im || 0);
        if (!picture) return false;
        try {
            this.banks[name] = { w: row.w, h: row.h, frames: spec.frames.map(frame => this.paintFrame(picture, row, frame, spec)) };
            return true;
        } catch (error) {   // 그림을 읽을 수 없는 환경(원래 색으로 그리는 판): 그 갈래는 예전 연출로 돌아간다
            this.failed.add(name);
            this.errors.push(`${name}: ${error && error.message}`);
            return false;
        }
    }

    canvas(w, h) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        return canvas;
    }

    paintFrame(picture, row, frame, spec) {
        const canvas = this.canvas(row.w, row.h), g = canvas.getContext('2d', { willReadFrequently: true });
        g.imageSmoothingEnabled = false;
        g.drawImage(picture, row.fx[frame][0], row.fx[frame][1], row.w, row.h, 0, 0, row.w, row.h);
        const image = g.getImageData(0, 0, row.w, row.h), d = image.data, colour = this.colourOf(spec, row);
        for (let i = 0; i < d.length; i += 4) if (d[i + 3]) [d[i], d[i + 1], d[i + 2]] = colour(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        g.putImageData(image, 0, 0);
        return canvas;
    }

    /** 밝기(0~255) → 새 색. ramp는 원본 클립의 밝기 폭(p)으로 나눠 위 다섯 색 가운데 하나를 고른다. */
    colourOf(spec, row) {
        if (spec.solid) return () => spec.solid;
        if (spec.steps) return light => spec.steps.find(([edge]) => light / 255 > edge)[1];
        const lo = row.p && row.p[1] - row.p[0] >= 1 ? row.p[0] : 0, span = Math.max(1, ((row.p && row.p[1]) || 255) - lo);
        return light => spec.ramp[1 + Math.floor(clamp((light - lo) / span) * 4.999)];
    }

    /** 강타의 굵은 수직 타격(베기 칸을 135도 돌려 2.2배로) 여섯 장과, 균열 그림의 어두운 틈과 한 도트 밝은 돌 테를 미리 합성한 두 장(어두운 것, 밝은 것). */
    bakeSlam() {
        for (const source of this.banks.slamCut.frames) {
            const canvas = this.canvas(64, 112), g = canvas.getContext('2d'), box = this.alphaBox(source);
            g.imageSmoothingEnabled = false;
            g.translate(32, 56); g.rotate(Math.PI * 3 / 4);
            g.drawImage(source, box.x, box.y, box.w, box.h, -box.w * 1.1, -box.h * 1.1, box.w * 2.2, box.h * 2.2);
            this.extra.slamStrokes.push(canvas);
        }
        const mask = this.canvas(128, 44), mg = mask.getContext('2d', { willReadFrequently: true });
        mg.imageSmoothingEnabled = false;
        mg.drawImage(this.banks.slamCrack.frames[0], 4, 5, 120, 33);
        const d = mg.getImageData(0, 0, 128, 44).data, on = (x, y) => d[(y * 128 + x) * 4 + 3] > 95;
        this.extra.slamCracks = [false, true].map(bright => this.bakeCrack(on, bright));
    }

    bakeCrack(on, bright) {
        const canvas = this.canvas(128, 44), g = canvas.getContext('2d');
        g.fillStyle = '#19171e';
        for (let y = 1; y < 43; y++) for (let x = 1; x < 127; x++) if (on(x, y)) g.fillRect(x - 1, y, 3, 2);
        for (let y = 1; y < 43; y++) for (let x = 1; x < 127; x++) {
            if (!on(x, y)) continue;
            g.fillStyle = bright ? '#ddbd8a' : '#b39873'; g.fillRect(x, y - 1, 1, 1);
            g.fillStyle = '#3b3030'; g.fillRect(x, y, 1, 1);
        }
        return canvas;
    }

    alphaBox(source) {
        const d = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
        let x0 = source.width, y0 = source.height, x1 = 0, y1 = 0;
        for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
            if (!d[(y * source.width + x) * 4 + 3]) continue;
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
        return { x: x0, y: y0, w: Math.max(1, x1 - x0 + 1), h: Math.max(1, y1 - y0 + 1) };
    }

    /** 담아 둔 칸 하나를 발 기준(아래 가운데)으로 그린다. */
    frame(g, name, index, at) {
        const bank = this.banks[name], i = Math.max(0, Math.min(bank.frames.length - 1, index));
        g.save(); g.globalAlpha = at.alpha; g.translate(snap(at.x), snap(at.y)); g.scale(at.face || 1, 1);
        g.drawImage(bank.frames[i], snap(-at.w / 2), -snap(at.h), snap(at.w), snap(at.h));
        g.restore();
    }

    /** 돌아가며 그리는 칸(55ms마다 한 장). */
    loopFrame(g, name, t, at) {
        const n = this.banks[name].frames.length;
        this.frame(g, name, ((Math.floor(t / 55) % n) + n) % n, at);
    }

    /** 두 점 사이를 2도트 간격의 네모로 잇는다(width는 높이). */
    streak(g, a, b, look) {
        const dx = b.x - a.x, dy = b.y - a.y, step = 2 * (look.dot || 1), steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / step));
        g.fillStyle = look.colour; g.globalAlpha = look.alpha;
        for (let i = 0; i <= steps; i++) g.fillRect(snap(a.x + dx * i / steps), snap(a.y + dy * i / steps), step, (look.width || 1) * (look.dot || 1));
    }

    // ---------------------------------------------------------------- 부싯돌 베기
    /** 이번 프레임의 화염파가 동시 상한 안인가(넘으면 그리지 않고 예전 그림도 내지 않는다). */
    waveRoom() {
        const now = this.deps.stageSkillVfx.now(), w = this.lives.wave;
        if (w.clock !== now) { w.clock = now; w.count = 0; }
        return ++w.count <= this.LIMIT.wave;
    }

    /** 날아가는 화염파: 30, 65, 105ms 전 실제 자리에 뒤따르는 불꽃, 앞 불꽃 최대 77도트, 머리의 바닥 불, 뒤로 튀는 불티. 화면 좌표의 붓에 그린다.
     * o: t 떠난 뒤 ms, face, dot 도트 하나의 화면 크기, ago(ms) 그만큼 전의 화면 자리(발). */
    flintWave(ctx, o) {
        if (!this.waveRoom()) return;
        const d = o.dot, fade = clamp((o.t + 15) / 75), head = o.ago(0), tail = o.ago(125);
        ctx.save(); ctx.imageSmoothingEnabled = false;
        this.streak(ctx, tail, head, { colour: '#a14e25', alpha: 0.65 * fade, width: 3, dot: d });
        this.streak(ctx, { x: tail.x, y: tail.y - d }, { x: head.x, y: head.y - d }, { colour: '#f5a340', alpha: 0.7 * fade, dot: d });
        [[105, 36, 23, 0.38], [65, 31, 37, 0.64], [30, 32, 55, 0.84], [0, 37, 77, 0.94]].forEach(([age, w, h, a], i) => {
            if (age > o.t + 12) return;
            const pt = o.ago(age);
            this.loopFrame(ctx, 'flame', o.t + i * 115, { x: pt.x, y: pt.y + d, w: w * d, h: h * d, alpha: fade * a, face: o.face });
        });
        this.loopFrame(ctx, 'fireGround', o.t + 110, { x: head.x, y: head.y + 3 * d, w: 55 * d, h: 26 * d, alpha: 0.85 * fade, face: o.face });
        for (let i = 0; i < 5; i++) {
            const u = ((o.t + i * 37) % 230) / 230, back = o.ago(u * 100);
            ctx.globalAlpha = (1 - u) * 0.66 * fade; ctx.fillStyle = i % 2 ? '#e68c39' : '#ffcf79';
            ctx.fillRect(snap(back.x + (i % 2 ? 1 : -1) * u * 5 * d), snap(back.y - (5 + u * 27) * d), (i % 2 ? 1 : 2) * d, d);
        }
        ctx.restore();
    }

    /** 지나간 실제 길의 잿불: 최근 스물네 점(16ms 간격)을 열기에 따라 붉게, 식으면 어둡게. 다 날아간 뒤 0.52초에 걸쳐 식고 끝자리에 낮은 불이 남는다.
     * o: flight 나는 시간(ms), face, path(ms) 그때의 자리(연출을 건 곳에서의 도트). */
    flintScorch(at, o) {
        this.hang(at, { life: o.flight + 520, ground: (g, t) => {
            const end = Math.min(t, o.flight), fade = t < o.flight ? 1 : clamp(1 - (t - o.flight) / 520);
            let prev = null;
            for (let i = 23; i >= 0; i--) {
                const s = end - i * 16;
                if (s < 0) continue;
                const q = o.path(s), heat = clamp(1 - (end - s) / 330);
                if (prev) this.streak(g, prev, q, { colour: heat > 0.55 ? '#b65a2c' : '#3e2c29', alpha: fade * (0.25 + heat * 0.3), width: 2 });
                prev = q;
            }
            if (t < o.flight) return;
            const u = (t - o.flight) / 520, last = o.path(o.flight);
            this.loopFrame(g, 'fireGround', t, { x: last.x, y: last.y + 2, w: 44, h: 20 * (1 - u * 0.5), alpha: fade * 0.45, face: o.face });
            g.globalAlpha = 1;
        } });
    }

    /** 예비 동작: 칼끝이 바닥을 긁어 나가는 낮은 홈(바닥 층)과 뒤로 튀는 불티 열 개, 칼끝의 작은 빛(위 층). wind ms 동안, 그 뒤 0.22초에 옅어진다. */
    flintDrag(at, face, wind) {
        const fadeAt = t => (t < wind ? 1 : clamp(1 - (t - wind) / 220)), tipAt = t => face * (17 + 24 * clamp(t / wind));
        this.hang(at, { life: wind + 220,
            ground: (g, t) => {
                const x = tipAt(t);
                this.streak(g, { x: face * 17, y: 0 }, { x, y: 0 }, { colour: '#281e22', alpha: 0.8 * fadeAt(t), width: 3 });
                this.streak(g, { x: face * 17, y: -1 }, { x, y: -1 }, { colour: '#c37a3c', alpha: 0.65 * fadeAt(t) });
                g.globalAlpha = 1;
            },
            top: (g, t) => this.flintSparks(g, t, { x: tipAt(t), face, wind, fade: fadeAt(t) }) });
    }

    flintSparks(g, t, o) {
        for (let i = 0; i < 10; i++) {
            const age = (t - i * 23) % 250;
            if (age < 0 || t - age > o.wind) continue;
            const k = age / 250;
            g.globalAlpha = o.fade * (1 - k) * 0.85; g.fillStyle = i % 3 === 0 ? '#ffda8c' : '#df893c';
            g.fillRect(snap(o.x - o.face * (6 + 26 * k) + (i % 3 - 1) * 3), snap(-2 - 23 * k + 18 * k * k), i % 3 === 0 ? 2 : 1, 1);
        }
        g.globalAlpha = o.fade * 0.75; g.fillStyle = '#f6bf66'; g.fillRect(snap(o.x - 2), -2, 4, 2);
        g.globalAlpha = 1;
    }

    /** 올려 벨 때 발사 지점(몸 앞 34도트)에서 0.22초 솟는 작은 불길. 몸을 가리던 발사 초승달 대신이다. */
    flintLaunch(at, face) {
        this.hang(at, { life: 220, top: (g, t) => {
            this.loopFrame(g, 'fireGround', t + 100, { x: face * 34, y: 2, w: 43, h: 24, alpha: Math.sin(Math.PI * clamp(t / 220)) * 0.76, face });
        } });
    }

    // ---------------------------------------------------------------- 몸 보호(강타, 일섬)
    /** 연출을 건 자리에서 본 몸들의 자리(도트). o.anchor() 지금의 기준 칸, o.actors() [{gx, gy, player}]. */
    actorsAround(o, dot) {
        const p = this.deps.stageSkillVfx.projection(), base = p && o.anchor();
        if (!base) return [];
        const from = p.cellToScreen(base.gx, base.gy);
        return o.actors().map(a => { const s = p.cellToScreen(a.gx, a.gy); return { x: (s.x - from.x) / dot, y: (s.y - from.y) / dot, player: !!a.player }; });
    }

    /** 몸마다 따로 구멍을 낸다(겹쳐도 구멍이 서로 지워지지 않게): 주인공은 반폭 36, 높이 154, 몬스터는 반폭 21, 높이 102. 가까운 몸만 본다. */
    protectBodies(g, bodies) {
        for (const a of bodies) {
            if (Math.abs(a.x) > 180 || Math.abs(a.y) > 160) continue;
            const rx = a.player ? 36 : 21, h = a.player ? 154 : 102;
            g.beginPath(); g.rect(-4096, -4096, 8192, 8192); g.rect(snap(a.x - rx), snap(a.y - h), rx * 2, h + 4); g.clip('evenodd');
        }
    }

    /** 같은 갈래가 동시에 limit개를 넘으면 오래된 것을 그리지 않는다(새것부터 limit개). */
    crowded(list, row, limit) {
        const now = this.deps.stageSkillVfx.now();
        for (let i = list.length - 1; i >= 0; i--) if (now >= list[i].start + list[i].life) list.splice(i, 1);
        return list.filter(other => other.start > row.start).length >= limit;
    }

    track(kind, life) {
        const row = { start: this.deps.stageSkillVfx.now(), life };
        this.lives[kind].push(row);
        return row;
    }

    // ---------------------------------------------------------------- 강타
    /** 본 타격: 바닥(균열, 첫 0.1초 파쇄, 고리 먼지, 흙먼지)과 위 층(굵은 수직 타격 0.115초, 돌 파편, 낮은 먼지). o: face, hit 맞혔는가, anchor, actors. */
    slam(at, o) {
        const power = o.hit ? 1 : 0.45, row = this.track('slam', 620);
        this.hang(at, { life: 620,
            ground: (g, t) => { if (!this.crowded(this.lives.slam, row, this.LIMIT.slam)) this.slamGround(g, t, { life: 620, power, face: o.face }); },
            top: (g, t, dot) => {
                if (t >= 420 || this.crowded(this.lives.slam, row, this.LIMIT.slam)) return;
                g.save(); this.protectBodies(g, this.actorsAround(o, dot));
                this.slamStroke(g, t, o.hit);
                this.slamDebris(g, t, { life: 420, power });
                this.frame(g, 'slamDust', Math.min(7, Math.floor(t / 52)), { x: 0, y: 8, w: 120, h: 24, alpha: 0.4 * clamp((420 - t) / 180), face: o.face });
                g.restore();
            } });
    }

    slamStroke(g, t, hit) {
        if (t >= 115) return;
        const u = clamp(t / 115), index = t < 45 ? 2 : t < 78 ? 1 : t < 100 ? 3 : 5;
        g.globalAlpha = (1 - u * 0.65) * (hit ? 0.9 : 0.5);
        g.drawImage(this.extra.slamStrokes[index], -42, snap(-100 + u * 10), 84, 108);
        g.globalAlpha = 1;
    }

    /** 맞은 자리의 바닥: 어두운 균열(첫 순간 밝은 테), 파쇄 클립, 퍼지는 고리 먼지, 흙먼지. o: life, power, face, after(여진이면 작고 짧게). */
    slamGround(g, t, o) {
        if (t < 0 || t >= o.life) return;
        const k = o.after ? SLAM_AFTER : SLAM_MAIN, fade = Math.min(1, clamp((o.life - t) / 200)), power = o.power;
        g.globalAlpha = fade * k.crackAlpha * power;
        g.drawImage(this.extra.slamCracks[t < k.brightMs ? 1 : 0], snap(-k.spread * 0.62), -20, snap(k.spread * 1.24), 44);
        if (t < k.burstEnd) this.frame(g, 'slamBurst', Math.min(4, 1 + Math.floor(t / 25)), { x: 0, y: 5, w: k.burstW, h: k.burstH, alpha: k.burstAlpha * power * (1 - clamp(t / k.burstEnd) * 0.7), face: o.face });
        this.slamRing(g, t, { spread: k.spread, alpha: fade * (1 - clamp(t / 245)) * 0.65 * power });
        this.frame(g, 'slamDust', Math.min(7, Math.floor(Math.max(0, t - k.dustDelay) / k.dustStep)), { x: 0, y: 10, w: k.dustW, h: k.dustH, alpha: fade * k.dustAlpha * power, face: o.face });
        g.globalAlpha = 1;
    }

    /** 바닥에 납작하게 퍼지는 흙 고리(열여덟 점). */
    slamRing(g, t, o) {
        const radius = 12 + o.spread * 0.5 * (1 - Math.pow(1 - clamp(t / 155), 3));
        g.globalAlpha = o.alpha;
        for (let j = 0; j < 18; j++) {
            const an = j / 18 * Math.PI * 2, rr = radius + (j % 3 - 1) * 2;
            g.fillStyle = j % 3 ? '#73604b' : '#a18965'; g.fillRect(snap(Math.cos(an) * rr), snap(Math.sin(an) * rr * 0.28), j % 3 ? 3 : 4, 1);
        }
    }

    /** 돌 파편 여덟 개: 몸 바깥 23도트에서 짧은 포물선으로 솟았다(최대 21도트) 떨어진다. 밝은 윗면과 짙은 외곽선. */
    slamDebris(g, t, o) {
        if (t < 0 || t >= o.life) return;
        const u = clamp(t / o.life);
        g.globalAlpha = Math.pow(1 - u, 1.1) * o.power;
        for (let j = 0; j < 8; j++) {
            const side = j % 2 ? 1 : -1, k = Math.floor(j / 2), x = side * (23 + (22 + k * 8) * u), y = -(12 + k * 3) * 4 * u * (1 - u) + (k % 2 ? 6 : 0), size = k % 2 ? 4 : 6;
            g.fillStyle = '#17161c'; g.fillRect(snap(x - 1), snap(y - 1), size + 2, size + 2);
            g.fillStyle = j % 3 ? '#ab8b63' : '#c2a77d'; g.fillRect(snap(x), snap(y), size, size);
            g.fillStyle = '#e0c594'; g.fillRect(snap(x), snap(y), size - 1, 1);
            g.fillStyle = '#59483b'; g.fillRect(snap(x), snap(y + size - 1), size, 1);
        }
        g.globalAlpha = 1;
    }

    /** 맞은 적마다의 짧은 접촉 불꽃(0.145초, 폭 88도트, 몸 윤곽 바깥만). o: face, after(여진이면 옅게), anchor, actors. */
    slamContact(at, o) {
        this.hang(at, { life: 145, top: (g, t, dot) => {
            g.save(); this.protectBodies(g, this.actorsAround(o, dot));
            this.frame(g, 'slamHit', Math.min(4, Math.floor(t / 29)), { x: 0, y: -26, w: 88, h: 38, alpha: (1 - clamp(t / 145)) * (o.after ? 0.65 : 0.98), face: o.face });
            g.restore();
        } });
    }

    /** 0.42초 뒤의 여진: 균열과 낮은 먼지가 다시 들썩이고(0.36초) 작은 파편이 튄다(0.3초). */
    slamAfter(at, o) {
        this.hang(at, { life: 360,
            ground: (g, t) => this.slamGround(g, t, { life: 360, power: 1, face: o.face, after: true }),
            top: (g, t, dot) => { g.save(); this.protectBodies(g, this.actorsAround(o, dot)); this.slamDebris(g, t, { life: 300, power: 1 }); g.restore(); } });
    }

    // ---------------------------------------------------------------- 일섬
    /** 맞은 몬스터의 몸통을 가르는 베임: 원본 베기 칸 0~5번이 한쪽 끝에서 펼쳐져 지나가고(0.16초), 접촉 불꽃(0.145초), 검격 조각(0.14~0.55초),
     * 붉은 잔상이 0.64초 남아 양 끝부터 옅어진다. 넉백 중에도 몸을 따라가고, 얼굴과 발끝, 주인공은 가리지 않는다. o: face, follow, anchor, actors. */
    issenHit(at, o) {
        const row = this.track('issen', 640);
        this.hang(at, { life: 640, follow: o.follow, top: (g, t, dot) => {
            if (this.crowded(this.lives.issen, row, this.LIMIT.issen)) return;
            g.save(); this.issenGuard(g, this.actorsAround(o, dot));
            this.issenStrokes(g, t, o.face);
            g.restore();
        } });
    }

    /** 몸통 안쪽(가로 112, 세로 64)만 남기고, 주인공과 가까운 몬스터의 얼굴(36×31)과 발끝(40×12)은 뺀다. */
    issenGuard(g, bodies) {
        g.beginPath(); g.rect(-56, -73, 112, 64); g.clip();
        for (const a of bodies) {
            if (a.player) { g.beginPath(); g.rect(-4096, -4096, 8192, 8192); g.rect(snap(a.x - 31), snap(a.y - 145), 62, 149); g.clip('evenodd'); continue; }
            if (Math.abs(a.x) > 110 || Math.abs(a.y) > 120) continue;
            const top = a.y - 74;
            g.beginPath(); g.rect(-4096, -4096, 8192, 8192); g.rect(snap(a.x - 18), snap(top), 36, 31); g.rect(snap(a.x - 20), snap(top + 66), 40, 12); g.clip('evenodd');
        }
    }

    issenStrokes(g, t, face) {
        const y = -28, strength = 0.82, tail = Math.pow(clamp((640 - t) / 500), 0.85), cut = t < 16 ? 0 : t < 38 ? 1 : t < 80 ? 2 : t < 108 ? 3 : t < 134 ? 4 : 5;
        const erode = clamp((t - 280) / 360);
        g.save(); g.beginPath(); g.rect(-36, snap(y - 41 + erode * 20), 72, snap(82 - erode * 40)); g.clip();
        this.issenStamp(g, 'issenEcho', 2, { y, face, alpha: tail * 0.75 * strength * clamp(t / 38) });
        g.restore();
        if (t < 160) this.issenStamp(g, 'issenMain', cut, { y, face, alpha: (1 - clamp((t - 60) / 100)) * 0.98 * strength });
        if (t < 145) this.issenStamp(g, 'issenImpact', Math.min(4, Math.floor(t / 29)), { y: y - 1, face, alpha: 0.72 * strength * (1 - t / 145) });
        if (t >= 140 && t < 550) this.issenStamp(g, 'issenBits', Math.min(3, Math.floor((t - 140) / 103)), { x: face * 9, y: y + 5, face, alpha: 0.58 * strength * (1 - (t - 140) / 410) });
    }

    /** 가운데 기준으로 그린다: 베기 58×82, 접촉 42×31, 조각 60×57. 베기는 보는 쪽과 반대로 뒤집어 55도로 내려 긋는다. */
    issenStamp(g, name, index, o) {
        const cutting = name === 'issenMain' || name === 'issenEcho', w = cutting ? 58 : name === 'issenImpact' ? 42 : 60, h = cutting ? 82 : name === 'issenImpact' ? 31 : 57;
        g.save(); g.globalAlpha = o.alpha; g.translate(snap(o.x || 0), snap(o.y)); g.scale(cutting ? -o.face : o.face, 1);
        g.drawImage(this.banks[name].frames[index], snap(-w / 2), snap(-h / 2), w, h);
        g.restore();
    }

    state() {
        return { ready: Object.keys(KINDS).filter(kind => KINDS[kind].every(name => this.banks[name])), errors: this.errors.slice(), slamStrokes: this.extra.slamStrokes.length };
    }
}

export function createStageNativeRemakes(deps) {
    const instance = new StageNativeRemakes(deps);
    return Object.freeze({ ready: instance.ready.bind(instance), state: instance.state.bind(instance),
        flintWave: instance.flintWave.bind(instance), flintScorch: instance.flintScorch.bind(instance), flintDrag: instance.flintDrag.bind(instance), flintLaunch: instance.flintLaunch.bind(instance),
        slam: instance.slam.bind(instance), slamContact: instance.slamContact.bind(instance), slamAfter: instance.slamAfter.bind(instance), issenHit: instance.issenHit.bind(instance) });
}
