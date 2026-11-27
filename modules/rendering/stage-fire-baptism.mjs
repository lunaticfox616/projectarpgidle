/** 불의 세례(93, V3.24 시뮬레이터 doPendulum과 리메이크 V3.15.3 fire-baptism-remake.js): 천장 밧줄에 매단 고딕 금빛 대향로가 시전자 줄을
 * 진자처럼 한 번 가로지른다(가운데가 가장 낮고 빠르다). 위아래로 엇갈리는 향 연기 52개(그림만), 뒤로 끌리는 불꽃, 떨어지는 숯불, 지나간 적마다 불꽃 타격.
 * 피해의 때는 전투가 정한다(modules/combat/gem-extension-v324.mjs: 향로의 가로 자리를 거꾸로 푼 때). 그림은 전달본의 향로(56×80, 2배로),
 * 불꽃 시트(48×64 열 장), 연기 시트(40×26 네 장) 그대로다(assets/stage-vfx/fire-baptism/).
 * 게임의 규칙으로 바꾼 것: 향로의 기울기 27자세는 그림이 오면 한 번 2배로 돌려 담아 둔다(전달본과 같다). 연기는 0.88~1.12배 크기 차이 없이 정수 배율
 * 2배에서 3배로 커지고, 불꽃은 1배로 그린다. 화면 흔들림은 넣지 않는다. 효과 줄이기에서는 연기가 절반이고 숯불이 없다.
 * 시뮬레이터의 화면 도트(칸 72)로 잰 가로 길이는 칸으로 옮겼다(진자의 반폭 8.8칸, 전투의 PENDULUM.swing). 향로와 밧줄의 길이는 그림의 도트 그대로다.
 */
const BODY = Object.freeze({ file: 'assets/stage-vfx/fire-baptism/censer.png', w: 56, h: 80, scale: 2, eye: 152 });
const FLAME = Object.freeze({ file: 'assets/stage-vfx/fire-baptism/flame-sheet.png', w: 48, h: 64, frames: 10 });
const SMOKE = Object.freeze({ file: 'assets/stage-vfx/fire-baptism/smoke-sheet.png', w: 40, h: 26, count: 52, lifeMin: 1700, lifeSpread: 300, high: 0.28, low: 0.22 });
const POSE = Object.freeze({ from: -26, to: 26, step: 2, size: 192, foot: 176 });
const SWAY = 0.4;      // 진자의 가장 큰 각(라디안, 시뮬레이터 pendulumFx TH)
const LOW = -34;       // 향로가 가장 낮을 때 받침의 높이(도트, 시전한 자리의 발에서)
const LIMIT = Object.freeze({ swings: 4, hits: 16 });
const clamp = value => Math.max(0, Math.min(1, value));
const snap = Math.round;
/** 전달본의 결정적 잡음(같은 시전은 늘 같은 연기). */
const noise = (x, y, z = 0) => {
    let n = Math.imul(x + 13, 374761393) ^ Math.imul(y + 17, 668265263) ^ Math.imul(z + 5, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

class StageFireBaptism {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.pictures = null;
        this.poses = null;
        this.swings = [];
        this.hits = [];
    }

    censerPictures() {
        if (!this.pictures) {
            const open = file => this.deps.stagePictures.openPicture(file);
            this.pictures = { body: open(BODY.file), flame: open(FLAME.file), smoke: open(SMOKE.file) };
        }
        return this.pictures;
    }

    /** 세 그림이 다 오면 향로의 기울기 자세를 한 번 담는다. */
    ready() {
        const p = this.censerPictures();
        if (!p.body.ready || !p.flame.ready || !p.smoke.ready) return false;
        if (!this.poses) this.poses = this.bakePoses(p.body.source);
        return true;
    }

    bakePoses(body) {
        const poses = [];
        for (let deg = POSE.from; deg <= POSE.to; deg += POSE.step) {
            const canvas = this.deps.document.createElement('canvas');
            canvas.width = POSE.size; canvas.height = POSE.size;
            const g = canvas.getContext('2d');
            g.imageSmoothingEnabled = false;
            g.translate(POSE.size / 2, POSE.foot); g.rotate(deg * Math.PI / 180);
            g.drawImage(body, -BODY.w, -BODY.h * BODY.scale, BODY.w * BODY.scale, BODY.h * BODY.scale);
            poses.push(canvas);
        }
        return poses;
    }

    /** 살아 있는 것 가운데 가장 새것 limit개만 그린다(전달본: 향로 4개, 타격 16개). */
    shown(list, row, limit) {
        const now = this.deps.stageSkillVfx.now();
        for (let i = list.length - 1; i >= 0; i--) if (now - list[i].born >= list[i].life) list.splice(i, 1);
        return list.indexOf(row) >= list.length - limit;
    }

    keep(list, row) { row.born = this.deps.stageSkillVfx.now(); list.push(row); return row; }

    /** 한 번 가로지르기의 계획: 진자 자리(시전한 자리의 발에서 도트), 연기와 숯불. */
    plan(event) {
        const face = event.pendulumFace || 1, wind = Number(event.pendulumWind) || 120, sweep = Number(event.pendulumSweep) || 640;
        const XM = (Number(event.pendulumSwing) || 8.8) * this.shared.WIDE, L = XM / Math.sin(SWAY), PY = LOW - L, reduced = this.deps.reduced();
        const pos = t => {
            const progress = clamp((t - wind) / sweep), dx = -face * XM * Math.cos(Math.PI * progress);
            return { x: dx, y: PY + Math.sqrt(L * L - dx * dx), rotation: -Math.asin(dx / L), progress };
        };
        const plan = { face, wind, sweep, PY, pos, life: wind + sweep + 2100 };
        plan.puffs = Array.from({ length: SMOKE.count }, (_, i) => this.puff(plan, i)).filter((_, i) => !reduced || i % 2 === 0);
        plan.embers = reduced ? [] : Array.from({ length: 24 }, (_, i) => {
            const t0 = wind + (i + 0.5) / 24 * sweep, p = pos(t0);
            return { t0, x: p.x, y: p.y - 42, life: 360 + noise(i, 7) * 220, vx: -(20 + noise(i, 8) * 35) * face, vy: 18 + noise(i, 9) * 40 };
        });
        return plan;
    }

    puff(plan, i) {
        const t0 = plan.wind + (i + 0.5) / SMOKE.count * plan.sweep, p = plan.pos(t0), lower = i % 2;
        return { t0, x: p.x + (noise(i, 0) - 0.5) * 10, y: p.y - 82 + (lower ? 11 : -9) + (noise(i, 1) - 0.5) * 8, life: SMOKE.lifeMin + noise(i, 2) * SMOKE.lifeSpread,
            drift: 40 + noise(i, 3) * 50, rise: 40 + noise(i, 4) * 36, opacity: lower ? SMOKE.low : SMOKE.high, shape: i % 4 };
    }

    /** 붓 좌표로 본 화면 네 끝. */
    bounds(g) {
        const m = g.getTransform(), a = m.a || 1, d = m.d || 1;
        return { left: -m.e / a, right: (g.canvas.width - m.e) / a, top: -m.f / d, bottom: (g.canvas.height - m.f) / d };
    }

    /** 가로 막대로 채운 도트 타원(전달본 oval). */
    oval(g, [x, y, rx, ry], colour, alpha) {
        g.fillStyle = colour; g.globalAlpha = alpha;
        for (let j = -Math.ceil(ry); j <= ry; j += 2) { const w = Math.sqrt(Math.max(0, 1 - (j / ry) ** 2)) * rx; g.fillRect(snap(x - w), snap(y + j), Math.max(0, snap(w * 2)), 2); }
    }

    /** 바닥: 향로를 따라가는 그림자와 바닥에 비치는 숯불 빛. */
    ground(g, t, plan) {
        if (t > plan.wind + plan.sweep + 40 || !this.shown(this.swings, plan, LIMIT.swings)) return;
        const p = plan.pos(t), a = 1 - Math.min(0.7, Math.max(0, LOW - p.y) / 180), fade = clamp((t - plan.wind) / 60);
        g.imageSmoothingEnabled = false;
        this.oval(g, [p.x, 2, 48 * a, 10 * a], '#100d12', 0.3 * a);
        this.oval(g, [p.x, 2, 35 * a, 5 * a], '#b9793d', 0.16 * a * fade);
        g.globalAlpha = 1;
    }

    /** 연기: 정수 배율로 커지며(2배, 3배) 위로 흩어진다. 화면 밖은 그리지 않는다. */
    smoke(g, t, plan, box) {
        const sheet = this.pictures.smoke.source;
        for (const q of plan.puffs) {
            const age = t - q.t0, u = age / q.life;
            if (u < 0 || u > 1) continue;
            const s = u < 0.5 ? 2 : 3, w = SMOKE.w * s, h = SMOKE.h * s, x = snap(q.x - plan.face * q.drift * u - w / 2), y = snap(q.y - q.rise * u - h / 2);
            if (x + w < box.left || x > box.right || y + h < box.top || y > box.bottom) continue;
            g.globalAlpha = q.opacity * Math.min(1, age / 100) * Math.pow(1 - u, 1.1);
            g.drawImage(sheet, q.shape * SMOKE.w, 0, SMOKE.w, SMOKE.h, x, y, w, h);
        }
    }

    /** 향로 뒤로 잠깐 끌리는 숯불 불꽃 여덟. */
    trailFlames(g, t, plan) {
        const sheet = this.pictures.flame.source;
        for (let i = 0; i < 8; i++) {
            const born = plan.wind + (i + 0.5) / 8 * plan.sweep, age = t - born;
            if (age < 0 || age > 240) continue;
            const q = plan.pos(born), u = age / 240, frame = Math.min(FLAME.frames - 1, Math.floor(u * FLAME.frames));
            g.globalAlpha = 0.38 * Math.sin(Math.PI * u);
            g.drawImage(sheet, frame * FLAME.w, 0, FLAME.w, FLAME.h, snap(q.x - plan.face * u * 28 - FLAME.w / 2), snap(q.y - 46 - u * 8 - FLAME.h / 2), FLAME.w, FLAME.h);
        }
    }

    /** 화면 위 끝에서 향로의 고리까지 이어지는 밧줄과, 고리 바로 위의 작은 금빛 마디 넷. */
    rope(g, eye, plan, t, top) {
        const topY = top - 8, ratio = (topY - eye.y) / (plan.PY - eye.y), from = { x: eye.x - eye.x * ratio, y: topY };
        const dx = eye.x - from.x, dy = eye.y - from.y, n = Math.min(200, Math.ceil(Math.hypot(dx, dy) / 2));
        g.globalAlpha = 1;
        for (let i = 0; i <= n; i++) {
            const x = snap(from.x + dx * i / n), y = snap(from.y + dy * i / n);
            g.fillStyle = '#473522'; g.fillRect(x - 2, y, 4, 3);
            g.fillStyle = i % 4 < 2 ? '#a28a59' : '#79613b'; g.fillRect(x + (i % 4 < 2 ? -1 : 0), y, 2, 2);
        }
        for (let i = 0; i < 4; i++) {
            const y = eye.y - 5 - i * 5, x = eye.x + Math.sin(t / 190 + i * 0.5) * plan.face * 0.7;
            g.fillStyle = '#65451f'; g.fillRect(snap(x) - 2, snap(y) - 2, 5, 5);
            g.fillStyle = '#d5b06b'; g.fillRect(snap(x) - 1, snap(y) - 2, i % 2 ? 2 : 3, 1); g.fillRect(snap(x) + 1, snap(y) - 1, 1, 3);
        }
    }

    /** 대향로: 밧줄의 기울기에 가장 가까운 담아 둔 자세. 가운데에서 빨라지는 만큼 조금 더 기운다. */
    censer(g, t, plan, top) {
        const p = plan.pos(t), tilt = p.rotation + plan.face * Math.sin(Math.PI * p.progress) * 0.025, x = snap(p.x), y = snap(p.y);
        this.rope(g, { x: x + Math.sin(tilt) * BODY.eye, y: y - Math.cos(tilt) * BODY.eye }, plan, t, top);
        const index = Math.max(0, Math.min(this.poses.length - 1, Math.round((tilt * 180 / Math.PI - POSE.from) / POSE.step)));
        g.drawImage(this.poses[index], x - POSE.size / 2, y - POSE.foot);
    }

    embers(g, t, plan) {
        for (const q of plan.embers) {
            const u = (t - q.t0) / q.life;
            if (u < 0 || u > 1) continue;
            const sec = (t - q.t0) / 1000;
            g.globalAlpha = 0.8 * (1 - u); g.fillStyle = u < 0.35 ? '#ddba72' : '#ba753a';
            g.fillRect(snap(q.x + q.vx * sec), snap(q.y + q.vy * sec + 150 * sec * sec), 2, 2);
        }
    }

    /** 위: 연기를 먼저, 그다음 불꽃과 밧줄, 향로, 숯불(향로 윤곽이 연기에 묻히지 않게). */
    above(g, t, plan) {
        if (!this.shown(this.swings, plan, LIMIT.swings)) return;
        const box = this.bounds(g);
        g.imageSmoothingEnabled = false;
        this.smoke(g, t, plan, box);
        this.trailFlames(g, t, plan);
        if (t <= plan.wind + plan.sweep + 40) this.censer(g, t, plan, box.top);
        this.embers(g, t, plan);
        g.globalAlpha = 1;
    }

    /** 가로지르기 사건 하나(시전 하나, 이중 발동의 둘째 향로 하나). 그림이 아직 없으면 그리지 않는다(첫 시전 전에 warm이 연다). */
    swing(c) {
        if (!c.first || !this.ready()) return true;
        const plan = this.keep(this.swings, this.plan(c.event));
        this.shared.hangPair(c.event.landingCell, plan.life, (g, t) => this.ground(g, t, plan), (g, t) => this.above(g, t, plan));
        return true;
    }

    /** 지나간 적의 불꽃 타격: 불꽃 시트 열 장(0.31초)과 튀는 불티 일곱, 발밑의 옅은 그을음. */
    flame(c) {
        if (!c.first || !this.ready() || !c.event.targetCells?.length) return true;
        const row = this.keep(this.hits, { life: 310, face: c.event.pendulumFace || 1 }), spot = c.event.targetCells[0];
        this.shared.ST.hang({ ...this.shared.K.at(spot), dy: -40 }, { life: row.life,
            ground: (g, t) => this.scorch(g, t, row), top: (g, t) => this.burst(g, t, row) });
        return true;
    }

    scorch(g, t, row) {
        if (!this.shown(this.hits, row, LIMIT.hits)) return;
        const u = clamp(t / row.life);
        this.oval(g, [0, 40, 18 + u * 8, 4], '#422c23', 0.2 * (1 - u));
        g.globalAlpha = 1;
    }

    burst(g, t, row) {
        if (!this.shown(this.hits, row, LIMIT.hits)) return;
        const u = clamp(t / row.life), frame = Math.min(FLAME.frames - 1, Math.floor(u * FLAME.frames));
        g.save();
        g.imageSmoothingEnabled = false;
        g.scale(row.face, 1);
        g.globalAlpha = 0.85 * Math.pow(1 - u, 0.5);
        g.drawImage(this.pictures.flame.source, frame * FLAME.w, 0, FLAME.w, FLAME.h, -FLAME.w / 2, -FLAME.h / 2, FLAME.w, FLAME.h);
        for (let i = 0; i < 7; i++) {
            const a = -Math.PI * 0.9 + i * 0.42, dist = 7 + u * (16 + i % 3 * 4);
            g.globalAlpha = 0.7 * (1 - u); g.fillStyle = i % 3 ? '#d29a55' : '#ead0a0';
            g.fillRect(snap(Math.cos(a) * dist), snap(Math.sin(a) * dist - u * 11), 2, 2);
        }
        g.restore();
    }
}

export function createStageFireBaptism(deps, shared) {
    return new StageFireBaptism(deps, shared);
}
