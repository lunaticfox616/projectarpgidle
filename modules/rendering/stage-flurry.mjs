/** 야만스러운 난격(99, 2026-11-26 스킬 전달본 V3.25 barbaric-flurry.js, 주먹 가시성 개선판): 붕대를 감은 PixelLab 주먹이 맞는 자리에서 또렷이 보인다.
 * 한 번 칠 때마다(전투의 'punch' 사건) 줄을 바꿔 가며 주먹 하나가 대상에 닿고, 간격이 길면(0.1초 이상) 다른 줄로 작은 주먹이 하나 더 나간다.
 * 셋째마다 묵직한 타격(접촉 섬광과 바닥 먼지가 크다). 물리면 붕대와 살색 그대로, 속성이 바뀌면 그 속성 색 넷으로 다시 칠한다(전달본과 같은 규칙).
 * 게임의 규칙으로 바꾼 것: 주먹은 정수 배율 2배(작은 주먹 1배)로 그리고, 닿을 때 눌리고 늘어나는 모양은 뺐다(전달본 1.9배, 눌림 ±8%). */
const LANES = Object.freeze([0, -1, 1, -1, 0, 1]);
const INK = '#21191c';
const FIST = Object.freeze({ file: 'assets/stage-vfx/flurry/bandaged-fist.png', width: 48, height: 32, anchor: Object.freeze({ x: 32, y: 15 }) });
const PHYS_LOOK = Object.freeze({ shadow: '#776460', edge: '#c0a489', light: '#e8ccb0', grit: '#88766d', faceShade: '#4b3535' });
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const hex = colour => [1, 3, 5].map(at => Number.parseInt(colour.slice(at, at + 2), 16));
const blend = (a, b, t) => { const from = hex(a), to = hex(b); return '#' + from.map((v, i) => Math.round(mix(v, to[i], t)).toString(16).padStart(2, '0')).join(''); };

class StageFlurry {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.picture = null;
        this.arts = new Map();
    }

    open() { if (!this.picture) this.picture = this.deps.stagePictures.openPicture(FIST.file); return this.picture; }

    ready() { return this.open().ready; }

    looksOf(element) {
        if (!element || element === 'phys') return PHYS_LOOK;
        const E = this.shared.ink(element);
        return { shadow: E.c3, edge: E.c2, light: blend(E.c2, E.c1, 0.63), grit: blend(INK, E.c3, 0.85), faceShade: blend(INK, E.c3, 0.64) };
    }

    /** 어두운 주름은 두고 붕대의 중간 밝기를 올린다. 둘레 한 도트를 어둡게 둘러 적과 떼어 낸다. 속성 색이면 네 색 띠로 다시 칠한다. */
    grade(pixels, element) {
        const original = pixels.slice(), E = element && element !== 'phys' ? this.shared.ink(element) : null;
        const ramp = E ? [INK, E.c3, E.c2, E.c1].map(hex) : null;
        for (let i = 0; i < pixels.length; i += 4) {
            if (!original[i + 3]) { if (this.besideFist(original, i)) pixels.set([31, 22, 29, 240], i); continue; }
            this.gradePixel(pixels, original, i, ramp);
        }
    }

    /** 빈 칸이 주먹(불투명한 칸)과 맞닿았는가. */
    besideFist(original, i) {
        const stride = FIST.width * 4, x = (i / 4) % FIST.width, y = Math.floor(i / stride);
        return (x > 0 && original[i - 1] > 160) || (x + 1 < FIST.width && original[i + 7] > 160) || (y > 0 && original[i - stride + 3] > 160) || (y + 1 < FIST.height && original[i + stride + 3] > 160);
    }

    gradePixel(pixels, original, i, ramp) {
        const tone = original[i] * 0.23 + original[i + 1] * 0.62 + original[i + 2] * 0.15, lift = 22 * Math.sin(Math.PI * clamp((tone - 48) / 157));
        if (!ramp) { for (let c = 0; c < 3; c++) pixels[i + c] = original[i + c] + lift; return; }
        const level = Math.min(2.88, (tone + lift) / 255 * 3), step = Math.floor(level);
        for (let c = 0; c < 3; c++) pixels[i + c] = mix(ramp[step][c], ramp[step + 1][c], level - step);
    }

    artOf(element) {
        const key = element || 'phys';
        if (this.arts.has(key)) return this.arts.get(key);
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = FIST.width; canvas.height = FIST.height;
        const g = canvas.getContext('2d', { willReadFrequently: true });
        g.drawImage(this.picture.source, 0, 0);
        const image = g.getImageData(0, 0, FIST.width, FIST.height);
        this.grade(image.data, element);
        g.putImageData(image, 0, 0);
        const art = { sprite: canvas, looks: this.looksOf(element) };
        this.arts.set(key, art);
        return art;
    }

    pickTarget(targets, laneY, x, skip) {
        let picked = null, best = Infinity;
        for (const foe of targets) {
            if (foe === skip) continue;
            const score = Math.abs(foe.y - laneY) + Math.abs(foe.x - x) * 0.13;
            if (score < best) { picked = foe; best = score; }
        }
        return picked;
    }

    /** 한 주먹의 길: 어깨 높이에서 나와 대상(없으면 그 줄의 앞)에 닿는다. 기울기는 ±0.48 라디안 안. */
    flight(plan, index, lane, target, accent) {
        const { face, depth } = plan, originX = face * 15, originY = -(index % 2 ? 54 : 42), reach = depth * (accent ? 0.59 : 0.79);
        const hitX = target ? target.x - face * 6 : face * reach, hitY = (target ? target.y : this.shared.DEEP * lane) - (accent ? 51 : 56);
        const dx = hitX - originX, dy = hitY - originY, angle = Math.atan2(dy, Math.max(22, dx * face));
        return { originX, originY, hitX, hitY, distance: Math.hypot(dx, dy), target: Boolean(target), angle: Math.min(0.48, Math.max(-0.48, angle)) };
    }

    brush(g, colour, alpha, [x, y, w, h]) { g.globalAlpha = alpha; g.fillStyle = colour; g.fillRect(Math.round(x), Math.round(y), w, h); }

    trail(g, shot, [x, y], plan, opacity) {
        const over = Math.min(1, (plan.accent ? 30 : 67) / (shot.distance || 1)), L = plan.art.looks;
        for (let i = 0; i < 6; i++) {
            const along = (i + 1) * over / 6, px = mix(x, shot.originX, along), py = mix(y, shot.originY, along) + (i % 3 - 1) * 4, width = Math.max(3, 13 - i);
            this.brush(g, i < 2 ? L.edge : L.shadow, opacity * (1 - i * 0.12) * 0.52, [plan.face > 0 ? px - width : px, py, width, i % 2 ? 1 : 2]);
            if (i < 3) this.brush(g, L.faceShade, opacity * 0.55, [plan.face > 0 ? px - width + 3 : px - 3, py + 3, width, 2]);
        }
    }

    punch(g, shot, t, plan, accent) {
        const hold = accent ? 12 : 26, opacity = (1 - clamp((t - hold) / (accent ? 54 : 60))) ** 1.32 * (accent ? 0.43 : 0.99);
        if (!opacity) return;
        const recoil = clamp((t - hold) / (82 - hold)) ** 0.78, x = mix(shot.hitX, shot.originX, recoil * 0.25), y = mix(shot.hitY, shot.originY, recoil * 0.25), art = plan.art;
        this.trail(g, shot, [x, y], { ...plan, accent }, opacity);
        const scale = accent ? 1 : 2;
        g.save();
        g.globalAlpha = opacity;
        g.translate(Math.round(x), Math.round(y)); g.scale(plan.face, 1); g.rotate(shot.angle);
        g.drawImage(art.sprite, -FIST.anchor.x * scale, -FIST.anchor.y * scale, FIST.width * scale, FIST.height * scale);
        g.restore();
    }

    contact(g, [x, y], t, plan, heavy) {
        const progress = clamp(t / (heavy ? 82 : 62)), opacity = (1 - progress) ** 1.65 * (heavy ? 0.8 : 0.61), L = plan.art.looks, face = plan.face;
        if (opacity < 0.016) return;
        const head = x + face * (3 + 19 * progress), bias = plan.index % 3;
        this.brush(g, L.shadow, opacity, [head - 2, y - 6, 4, 13]); this.brush(g, L.edge, opacity, [head - 1, y - 4, 3, 9]);
        this.brush(g, L.light, opacity * 0.87, [head - (face < 0 ? 7 : 0), y - 1, 7, 2]);
        for (let i = 0; i < 5; i++) {
            const side = i % 2 ? -1 : 1, dx = (7 + i * 3) * (0.56 + progress * 1.4), dy = side * (4 + i * 2 + bias) * (0.58 + progress * 1.3);
            this.brush(g, i % 2 ? L.edge : L.light, opacity * (0.78 - i * 0.043), [x + face * dx, y + dy, i % 2 ? 3 : 2, 2]);
        }
    }

    dust(g, [x, y], t, plan) {
        const progress = clamp(t / 95), opacity = (1 - progress) * (plan.heavy ? 0.34 : 0.22), L = plan.art.looks;
        if (opacity < 0.02) return;
        for (let i = 0; i < 5; i++) {
            const side = i % 2 ? -1 : 1, radius = 6 + i * 5 + progress * 17;
            this.brush(g, i % 3 ? L.grit : L.shadow, opacity, [x + plan.face * (radius * side + progress * 8), y - 1 + side * i - 8 * Math.sin(Math.PI * progress), 3 + (i % 3) * 2, 2 + (i % 2)]);
        }
    }

    /** 친 순서(sequence, 1부터), 줄, 대상(주인공 발 자리 기준 도트)으로 그 주먹들의 계획을 세운다. */
    plan(event, element) {
        const index = (Number(event.flurryIndex) || 1) - 1, face = Number(event.flurryFace) || 1, slow = (Number(event.flurryEvery) || 120) >= 100, src = event.sourceCell;
        const targets = (event.targetCells || []).map(cell => ({ x: (cell.gx - src.gx) * this.shared.WIDE, y: (cell.gy - src.gy) * this.shared.DEEP }));
        const plan = { index, face, slow, heavy: (index + 1) % 3 === 0, depth: 2 * this.shared.WIDE, art: this.artOf(element) };
        const lane = LANES[index % LANES.length], primary = this.pickTarget(targets, this.shared.DEEP * lane, 0);
        const secondLane = LANES[(index + 2) % LANES.length], secondary = slow ? this.pickTarget(targets, this.shared.DEEP * secondLane, 0, primary) : null;
        plan.lead = this.flight(plan, index, lane, primary, false);
        plan.echo = slow ? this.flight(plan, index + 1, secondLane, secondary || primary, true) : null;
        plan.secondary = secondary;
        plan.others = targets.filter(foe => foe !== primary && foe !== secondary).slice(0, 3).map((foe, i) => ({ x: foe.x - face * 3, y: foe.y - 56 + i * 3 }));
        plan.life = slow ? 121 : 88;
        return plan;
    }

    top(g, t, plan) {
        g.imageSmoothingEnabled = false;
        if (plan.echo && t >= 35) {
            if (plan.secondary) this.contact(g, [plan.echo.hitX, plan.echo.hitY], t - 35, { ...plan, index: plan.index + 1 }, false);
            this.punch(g, plan.echo, t - 35, plan, true);
        }
        if (plan.lead.target) this.contact(g, [plan.lead.hitX, plan.lead.hitY], t, plan, plan.heavy);
        for (const other of plan.others) {
            const faded = 0.38 * (1 - clamp(t / 54));
            this.brush(g, plan.art.looks.edge, faded, [other.x - 2, other.y, 6, 2]); this.brush(g, plan.art.looks.light, faded, [other.x + plan.face * (4 + t * 0.17), other.y - 3, 2, 2]);
        }
        this.punch(g, plan.lead, t, plan, false);
        g.globalAlpha = 1;
    }

    ground(g, t, plan) {
        if (!plan.lead.target || !(plan.heavy || plan.slow)) return;
        this.dust(g, [plan.lead.hitX, plan.lead.hitY + 55], t, plan);
        g.globalAlpha = 1;
    }

    /** 한 번 친 자리(전투의 'punch' 사건). 그림이 아직 없으면 그리지 않는다(첫 시전 전에 warm이 연다). */
    flurry(c) {
        if (!c.first || !this.ready()) return true;
        const plan = this.plan(c.event, c.element);
        this.shared.hangPair(c.event.sourceCell, plan.life, (g, t) => this.ground(g, t, plan), (g, t) => this.top(g, t, plan));
        return true;
    }
}

export function createStageFlurry(deps, shared) {
    return new StageFlurry(deps, shared);
}
