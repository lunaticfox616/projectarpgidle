/** 영혼 흡수(97, 2026-11-26 스킬 전달본 V3.25 soul-drain.js): 적에게서 뽑힌 영혼이 굽은 길로 시전자에게 돌아와 은빛 에너지 보호막이 된다.
 * 영혼의 머리는 게임의 카오스 위습 그림(assets/stage-vfx/wisps/chaos.png), 꼬리의 잔상은 워록 잔상 띠(구입한 그림 vfx3.png의 wl10)를 은빛으로 바꿔 쓴다
 * (전달본과 같은 색 변환). 구입한 그림이 없는 작업본에서는 잔상 없이 그린다. 보호막은 남은 동안 주인공을 따라가는 판(위)과 발밑 고리(바닥)다.
 * 위습 머리는 정수 배율 1배로 그린다(전달본은 0.47~1.3배로 키운다). 보호막의 양과 때는 전투가 정한다(modules/domain/player-soul-shield.mjs). */
const TAU = Math.PI * 2;
const SOUL = Object.freeze({ c1: '#dbe2f2', c2: '#97a9cc', c3: '#5b5686' });
const OUTLINE = '#231d36';
const PLATE = Object.freeze([[0, -1], [0.41, -0.93], [0.76, -0.71], [0.96, -0.36], [1, 0.15], [0.76, 0.62], [0.41, 0.87], [0, 1], [-0.41, 0.87], [-0.76, 0.62], [-1, 0.15], [-0.96, -0.36], [-0.76, -0.71], [-0.41, -0.93]]);
const RIBS = Object.freeze([[1, 2, 4], [2, 3, 4], [3, 4, 5], [10, 11, 12], [10, 12, 13], [9, 10, 11]]);
const WISP_FILE = 'assets/stage-vfx/wisps/chaos.png';
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, u) => a + (b - a) * u;

class StageSoulDrain {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.wisp = null;
        this.silver = new Map();
        this.shieldToken = null;
    }

    open() { if (!this.wisp) this.wisp = this.deps.stagePictures.openPicture(WISP_FILE); return this.wisp; }

    /** 룬을 낄 때(warm): 위습을 열고, 이미 받은 잔상 띠는 지금 은빛으로 바꿔 둔다(첫 시전의 한 장이 무거워지지 않게). */
    prepare() { this.open(); this.wakeStrip(); this.wispStrip(); }

    /** 그림을 은빛으로(밝기를 은청색 띠로). */
    silverOf(key, image, box) {
        if (this.silver.has(key)) return this.silver.get(key);
        if (!image) return null;
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = box.w; canvas.height = box.h;
        const g = canvas.getContext('2d', { willReadFrequently: true });
        g.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
        const frame = g.getImageData(0, 0, box.w, box.h), data = frame.data;
        for (let i = 0; i < data.length; i += 4) {
            if (!data[i + 3]) continue;
            const tone = data[i] * 0.28 + data[i + 1] * 0.5 + data[i + 2] * 0.22;
            data[i] = tone * 0.98 + 12; data[i + 1] = tone * 1.02 + 14; data[i + 2] = tone * 1.06 + 27;
        }
        g.putImageData(frame, 0, 0);
        this.silver.set(key, canvas);
        return canvas;
    }

    wispStrip() { const pic = this.open(); return pic.ready ? this.silverOf('wisp', pic.source, { x: 0, y: 0, w: 128, h: 32 }) : null; }

    wakeStrip() {
        const row = this.deps.STAGE_SKILL_VFX.raw.wl10, image = row ? this.deps.stageSkillVfx.picture(2) : null;
        return image ? this.silverOf('wake', image, { x: row.x, y: row.y, w: row.w * row.n, h: row.h }) : null;
    }

    paletteOf(element) { return !element || element === 'phys' ? SOUL : this.shared.ink(element); }

    mark(g, x, y, w = 1, h = w) { g.fillRect(Math.round(x - w * 0.5), Math.round(y - h * 0.5), w, h); }

    stepped(g, [ax, ay, bx, by], w) {
        const dx = bx - ax, dy = by - ay, steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 0.5));
        for (let i = 0; i <= steps; i++) this.mark(g, ax + dx * i / steps, ay + dy * i / steps, w, w);
    }

    shard(g, x, y, wide) {
        if (wide) { this.mark(g, x, y - 2, 2, 2); this.mark(g, x, y, 4, 2); this.mark(g, x, y + 2, 2, 2); return; }
        this.mark(g, x, y - 1, 1, 1); this.mark(g, x, y, 3, 1); this.mark(g, x, y + 1, 1, 1);
    }

    /** 영혼의 머리: 은빛 위습 한 칸(1배), 시전자 쪽을 본다. */
    head(g, at, face, age) {
        const strip = this.wispStrip();
        if (!strip) return;
        g.save();
        g.translate(Math.round(at.x), Math.round(at.y)); g.scale(face, 1);
        g.drawImage(strip, (Math.floor(age / 92) % 4) * 32, 0, 32, 32, -18, -16, 32, 32);
        g.restore();
    }

    /** 꼬리의 잔상: 지나온 쪽으로 누운 워록 잔상 띠. */
    wake(g, soul, current, age) {
        const strip = this.wakeStrip();
        if (!strip || age < soul.pull) return;
        const point = this.path(soul, Math.max(soul.pull, age - 57)), course = Math.atan2(current.y - point.y, current.x - point.x);
        g.save();
        g.translate(Math.round(point.x), Math.round(point.y)); g.rotate(course);
        g.globalAlpha *= clamp((age - soul.pull) / 84) * 0.48;
        g.drawImage(strip, (Math.floor((age - soul.pull) / 68) % 5) * 128, 0, 128, 128, -26, -24, 51, 51);
        g.restore();
    }

    /** 뽑혀 나올 때 적의 자리에서 터지는 점선과 이어진 실, 흩어지는 조각. */
    rupture(g, soul, t, current, alpha) {
        const { pull, colours, side } = soul, life = pull + 86;
        if (t >= life) return;
        const pulse = clamp(t / 38) * (1 - clamp((t - pull * 0.75) / (life - pull * 0.75))), rx = 11 + 7 * clamp(t / life), ry = rx * 0.54;
        g.globalAlpha = alpha * pulse * 0.68; g.fillStyle = colours.c2;
        for (let i = 0; i < 16; i++) { if (i % 5 > 2) continue; const a = (i + side * 0.35) * TAU / 16; this.mark(g, Math.cos(a) * rx, Math.sin(a) * ry, i % 3 ? 2 : 4, 2); }
        g.globalAlpha = alpha * pulse * 0.62; g.fillStyle = colours.c1;
        for (let i = 1; i <= 8; i++) { const bend = Math.sin(i * TAU / 8 + t * 0.047) * Math.sin(i * Math.PI / 8), u = i / 8; this.mark(g, mix(0, current.x, u) + side * 4 * bend, mix(0, current.y, u) + 2 * bend, i % 3 ? 2 : 3, 1); }
        g.globalAlpha = alpha * pulse * 0.43; g.fillStyle = colours.c2;
        for (let i = 0; i < 5; i++) { const a = i * 2.3 + side * 0.4; this.shard(g, Math.cos(a) * (10 + t * 0.03), Math.sin(a) * (6 + t * 0.024), i < 2); }
    }

    streamer(g, soul, t, alpha) {
        const start = Math.max(0, t - 164), length = t - start, { colours, side } = soul;
        if (length < 16) return;
        const segments = Math.min(14, Math.ceil(length / 12));
        let last = this.path(soul, start);
        for (let i = 1; i <= segments; i++) {
            const u = i / segments, at = this.path(soul, start + length * u);
            g.globalAlpha = alpha * u ** 1.15 * 0.62; g.fillStyle = colours.c3; this.stepped(g, [last.x, last.y, at.x, at.y], Math.max(2, Math.round(u ** 1.6 * 8)));
            if (i % 4 !== 1) { g.globalAlpha = alpha * u ** 1.8 * 0.65; g.fillStyle = i > segments - 2 ? colours.c1 : colours.c2; this.stepped(g, [last.x - side, last.y - 1, at.x - side, at.y - 1], 2); }
            if (i % 3 === 1) { g.globalAlpha = alpha * u ** 1.4 * 0.62; g.fillStyle = colours.c2; const spread = 2 + 6 * (1 - u); this.shard(g, at.x + Math.sin(t * 0.031 + i) * spread, at.y + Math.cos(i * 1.3) * spread); }
            last = at;
        }
    }

    absorb(g, soul, age, alpha) {
        const u = clamp(age / 142), rad = mix(15, 3, u), { colours, side, target } = soul;
        g.fillStyle = colours.c2; g.globalAlpha = alpha * (1 - u) * 0.64;
        for (let i = 0; i < 18; i++) { if (i % 6 === 5) continue; const a = i * TAU / 18 + side * u * 2; this.mark(g, target.x + Math.cos(a) * rad, target.y + Math.sin(a) * rad * 0.7, i % 4 ? 2 : 3, 2); }
        g.fillStyle = colours.c1; g.globalAlpha = alpha * (1 - u) * 0.48; this.shard(g, target.x, target.y, true);
    }

    /** 영혼의 자리(적의 몸 높이 원점 기준, 도트): 뽑히는 동안 솟고, 날 때는 시전자 가슴까지 위로 굽은 길. */
    path(soul, age) {
        const { pull, fly, side, target } = soul;
        if (age < pull) { const u = clamp(age / pull), rise = u * (2 - u); return { x: side * 5 * rise, y: -21 * rise }; }
        const u = clamp((age - pull) / fly), ease = u * u * (3 - 2 * u), lift = 28 + Math.min(29, Math.abs(target.x) * 0.078);
        return { x: mix(side * 5, target.x, ease) + side * 11 * Math.sin(ease * Math.PI), y: mix(-21, target.y, ease) - lift * 4 * ease * (1 - ease) };
    }

    drawSoul(g, soul, t) {
        const hero = this.deps.stageSkillKit.heroDrawn(), total = soul.pull + soul.fly, alpha = g.globalAlpha;
        soul.target = { x: (hero.gx - soul.from.gx) * this.shared.WIDE, y: (hero.gy - soul.from.gy) * this.shared.DEEP - 55 + 44 };
        if (t >= total) { this.absorb(g, soul, t - total, alpha); return; }
        const current = this.path(soul, t), rise = clamp(t / Math.max(1, soul.pull * 0.62)), approach = clamp((t - total + 100) / 100);
        this.rupture(g, soul, t, current, alpha);
        this.streamer(g, soul, t, alpha);
        this.wake(g, soul, current, t);
        g.globalAlpha = alpha * clamp(t / 32) * (0.6 + 0.4 * rise) * (1 - 0.29 * approach);
        this.head(g, current, soul.target.x < 0 ? -1 : 1, t);
    }

    /** 한 적에게서 뽑히는 영혼 하나(전투의 'soul' 사건). */
    soul(c) {
        if (!c.first) return true;
        const event = c.event, soul = { from: event.sourceCell, pull: Number(event.soulPull) || 140, fly: Number(event.soulFly) || 420, side: Number(event.soulSide) || 1,
            colours: this.paletteOf(c.element), target: { x: 0, y: 0 } };
        this.wispStrip();
        this.deps.stageSkillVfx.paint(this.deps.stageSkillKit.at(event.sourceCell, 0, -44), { life: soul.pull + soul.fly + 150 }, (g, t, dot) => {
            g.scale(dot, dot); g.imageSmoothingEnabled = false; this.drawSoul(g, soul, t); g.globalAlpha = 1;
        });
        return true;
    }

    baseRing(g, [r, depth, turn], colours, alpha) {
        for (let i = 0; i < 29; i++) {
            const rad = i * TAU / 29, near = Math.sin(rad), glint = Math.sin(rad * 2 - turn * 0.004);
            g.globalAlpha = alpha * (0.35 + near * 0.13 + Math.max(0, glint) * 0.23); g.fillStyle = glint > 0.65 ? colours.c2 : colours.c3;
            this.mark(g, Math.cos(rad) * r, 2 + near * depth, near > 0.15 ? 4 : 2, 1);
        }
    }

    facet(g, [a, b, c], colour, alpha) {
        g.globalAlpha = alpha; g.fillStyle = colour;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.closePath(); g.fill();
    }

    /** 몸을 감싼 열네 모 판: 안쪽 면, 테두리, 꼭짓점 조각. */
    plate(g, view, now, alpha) {
        const { colours, charge, flash } = view, sharp = 1.4 * Math.sin(now * 0.0042), rx = 34 + sharp + flash * 3, ry = 51 + flash * 4, cy = -48;
        const contour = PLATE.map(([a, b]) => ({ x: Math.round(a * rx), y: Math.round(cy + b * ry) }));
        for (const [a, b, c] of RIBS) this.facet(g, [contour[a], contour[b], contour[c]], b % 2 ? colours.c2 : colours.c3, alpha * (0.10 + charge * 0.09 + flash * 0.08));
        for (let i = 0; i < contour.length; i++) this.plateEdge(g, [contour[i], contour[(i + 1) % contour.length], i, cy], view, now, alpha);
        g.fillStyle = colours.c1; g.globalAlpha = alpha * (0.47 + charge * 0.14 + flash * 0.11);
        for (const vertex of [0, 2, 4, 7, 10, 12]) this.shard(g, contour[vertex].x, contour[vertex].y, vertex === 0 || vertex === 7);
    }

    /** 판의 테두리 한 변: 어두운 겉선, 반짝이는 속선, 몇 변은 안쪽 결. */
    plateEdge(g, [a, b, i, cy], view, now, alpha) {
        const { colours, charge, flash } = view, glint = Math.max(0, Math.cos(i * 0.74 - now * 0.0035));
        g.globalAlpha = alpha * (0.30 + 0.26 * charge + 0.14 * glint); g.fillStyle = OUTLINE; this.stepped(g, [a.x, a.y, b.x, b.y], 4);
        g.globalAlpha = alpha * (0.48 + 0.18 * charge + 0.22 * glint); g.fillStyle = glint > 0.81 ? colours.c1 : colours.c2; this.stepped(g, [a.x, a.y, b.x, b.y], 2);
        if (i % 3 !== 1 && i % 5 !== 0) return;
        const dx = a.x > 0 ? -4 : 4, dy = a.y > cy ? -2 : 2;
        g.globalAlpha = alpha * (0.24 + 0.13 * glint + flash * 0.16); g.fillStyle = colours.c3; this.stepped(g, [a.x + dx, a.y + dy, b.x + dx + Math.sin(i * 1.7) * 4, b.y + dy], 2);
    }

    /** 지금의 보호막(전투가 정한 양): 남은 동안만 그린다. */
    view(element) {
        const state = this.deps.soulShieldState();
        if (!state || !(state.remaining > 0)) return null;
        return { colours: this.paletteOf(element), charge: clamp(state.remaining / Math.max(1, state.cap)), flash: 1 - clamp((state.now - state.flashAt) / 220),
            remain: clamp((state.until - state.now) / 640), now: state.now };
    }

    shieldPaint(g, t, ground, element, token) {
        const view = token === this.shieldToken ? this.view(element) : null;
        if (!view) return;
        const alpha = view.remain * (0.5 + 0.5 * clamp(t / 140));
        g.imageSmoothingEnabled = false;
        if (ground) { this.baseRing(g, [32 + view.flash * 2, 10, view.now], view.colours, alpha); this.baseRing(g, [23, 7, -view.now * 0.84], view.colours, alpha * 0.49); }
        else this.plate(g, view, view.now, alpha);
        g.globalAlpha = 1;
    }

    /** 영혼이 닿아 보호막이 찼다(전투의 'shield' 사건): 주인공을 따라가는 판을 새로 건다(앞의 것은 그만 그린다). */
    shield(c) {
        if (!c.first) return true;
        const state = this.deps.soulShieldState();
        if (!state || !(state.remaining > 0)) return true;
        const token = this.shieldToken = {}, life = Math.max(300, state.until - state.now + 120), element = c.element;
        this.shared.ST.hang(this.deps.stageSkillKit.at(this.deps.stageSkillKit.heroDrawn()), { life, follow: this.deps.stageSkillKit.heroDrawn,
            ground: (g, t) => this.shieldPaint(g, t, true, element, token), top: (g, t) => this.shieldPaint(g, t, false, element, token) });
        return true;
    }
}

export function createStageSoulDrain(deps, shared) {
    return new StageSoulDrain(deps, shared);
}
