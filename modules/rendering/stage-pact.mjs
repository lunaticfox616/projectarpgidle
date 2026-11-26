/** 계약(96)의 보라색 고딕 건틀릿(2026-11-26 스킬 전달본 V3.24 후속 pact-gothic-vfx.js, 그림은 PixelLab의 건틀릿과 바닥 충격파 그대로).
 * 문양이 새겨지고 화면 위쪽 틈에서 쥔 주먹이 비스듬히 떨어져 바닥을 찍는다. 찍는 순간 충격파와 파편이 퍼진다. 피해의 때는 전투가 정한다
 * (modules/combat/gem-extension-v325.mjs: 문양 seal 뒤 낙하 fall, 0.34초). 주먹은 시전마다 왼쪽과 오른쪽을 번갈아(네 가지 각도) 떨어진다:
 * 이중 시전의 둘째 주먹도 이 순서에 든다.
 * 게임의 규칙으로 바꾼 것: 건틀릿은 정수 배율 2배로 그리고(전달본 약 1.67배), 떨어지며 눌리고 늘어나는 모양은 빼고, 기울기는 접근 쪽마다 하나로
 * 고정한다(전달본은 낙하 중 기울기가 줄어든다). 충격파 그림도 범위에 맞춘 정수 배율이고, 가운데 고리는 1배부터 그 배율까지 정수로 커진다.
 * 화면 흔들림은 넣지 않는다(게임은 투사체 적중에서만 흔든다). */
const TAU = Math.PI * 2, INK = '#17101f', GOLD = '#c6a478';
const ENTRY_ANGLES = Object.freeze([-0.30, -0.16, 0.16, 0.30]);
/** 시전 순서의 접근(왼쪽, 오른쪽을 번갈아 각도를 바꾼다): ENTRY_ANGLES의 칸. */
const APPROACHES = Object.freeze([0, 2, 1, 3]);
const FIST = Object.freeze({ file: 'assets/stage-vfx/pact/gauntlet-poses.png', frameWidth: 128, frameHeight: 160, frame: 0, pressureX: 65, pressureY: 109, scale: 2, tilt: 0.5 });
const SHOCK = Object.freeze({ file: 'assets/stage-vfx/pact/ground-shock.png', cellWidth: 152, cellHeight: 92, frames: 8, duration: 330 });
const clamp = value => Math.max(0, Math.min(1, value));

class StagePact {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.pictures = null;
        this.turn = 0;
    }

    /** 그림을 연다(처음 부를 때 한 번). */
    open() {
        if (!this.pictures) this.pictures = { fist: this.deps.stagePictures.openPicture(FIST.file), shock: this.deps.stagePictures.openPicture(SHOCK.file) };
        return this.pictures;
    }

    ready() { const p = this.open(); return p.fist.ready; }

    pixelLine(g, colour, [x0, y0, x1, y1], size = 1) {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / size));
        g.fillStyle = colour;
        for (let i = 0; i <= steps; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / steps), Math.round(y0 + (y1 - y0) * i / steps), size, size);
    }

    ovalMarks(g, [rx, ry], colour, count) {
        g.fillStyle = colour;
        for (let i = 0; i < count; i++) {
            if (i % 9 >= 6) continue;
            const angle = TAU * i / count;
            g.fillRect(Math.round(Math.cos(angle) * rx), Math.round(Math.sin(angle) * ry), 3, 1);
        }
    }

    /** 화면 왼쪽과 오른쪽 끝(도트, 붓의 원점 기준). */
    screenSides(g) { const m = g.getTransform(); return [-m.e / m.a, (g.canvas.width - m.e) / m.a]; }

    /** 사건 하나의 계획: 범위, 접근 쪽, 빛살과 파편. */
    plan(event, element) {
        const radius = Number(event.pactRadius) || 3, [a, b] = this.shared.semi(radius), random = this.shared.ST.random(Math.floor(event.landingCell.gx * 7 + event.landingCell.gy * 3) + this.turn);
        const lean = ENTRY_ANGLES[APPROACHES[this.turn++ % APPROACHES.length]];
        const plan = { a, b, radius, lean, side: Math.sign(lean), E: this.shared.ink(element), seal: Number(event.pactSeal) || 200, fall: Number(event.pactFall) || 140,
            scale: Math.min(1.95, 1.42 + radius * 0.12), portalY: null, startX: 0, startY: 0 };
        plan.impact = plan.seal + plan.fall; plan.fallStart = Math.max(0, plan.seal - 40); plan.release = plan.impact + 160; plan.life = plan.release + 470;
        plan.shockScale = Math.max(1, Math.round(a * 2 / 140));
        plan.rays = Array.from({ length: 8 }, (_, index) => {
            const angle = (index + 0.48 + (random() - 0.5) * 0.47) * TAU / 8, length = 0.55 + random() * 0.38;
            return Array.from({ length: 5 }, (_, step) => { const spread = 0.12 + step * 0.22, direction = angle + (random() - 0.5) * 0.2; return [Math.cos(direction) * a * length * spread, Math.sin(direction) * b * length * spread]; });
        });
        plan.shards = Array.from({ length: 13 }, (_, index) => {
            const angle = (index + 0.3) * TAU / 13, distance = 0.37 + random() * 0.48;
            return { x: Math.cos(angle) * a * distance, y: Math.sin(angle) * b * distance, height: 8 + random() * 23, life: 270 + random() * 175, width: 2 + index % 4 };
        });
        return plan;
    }

    /** 틈과 주먹이 떨어지기 시작하는 자리(화면 위 끝과 양옆 안). */
    place(g, plan) {
        if (plan.portalY !== null) return;
        const [left, right] = this.screenSides(g);
        plan.portalY = Math.max(this.shared.screenTop(g) + 12, -310);
        plan.startY = plan.portalY + 58;
        plan.startX = Math.max(left + 8, Math.min(right - 8, Math.round(-plan.startY * Math.tan(plan.lean) * 1.3)));
    }

    pose(t, plan) {
        const age = t - plan.impact, drop = clamp((t - plan.fallStart) / (plan.impact - plan.fallStart)), retrieve = clamp((t - plan.release) / 320);
        const altitude = age < 0 ? 1 - drop ** 2.1 : retrieve ** 1.5;
        return { t, age, drop, retrieve, x: plan.startX * altitude, y: plan.startY * altitude, alpha: clamp((t - plan.fallStart + 44) / 45) * (1 - retrieve),
            shock: age >= 0 && age < SHOCK.duration ? 0.13 + 0.99 * (1 - (1 - age / SHOCK.duration) ** 3.2) : 0 };
    }

    /** 충격파 그림 한 칸을 정수 배율로 가운데에 그린다. */
    waveFrame(g, frame, scale) {
        const image = this.pictures.shock.source, w = SHOCK.cellWidth * scale, h = SHOCK.cellHeight * scale;
        g.drawImage(image, frame * SHOCK.cellWidth, 0, SHOCK.cellWidth, SHOCK.cellHeight, -Math.round(w / 2), -Math.round(h / 2), w, h);
    }

    shock(g, p, plan) {
        if (!p.shock || !this.pictures.shock.ready) return;
        g.globalAlpha = 0.7;
        this.waveFrame(g, Math.min(SHOCK.frames - 1, 1 + Math.floor(p.age / 43)), plan.shockScale);
        const fade = 1 - clamp((p.age - 33) / 205);
        g.globalAlpha = 0.93 * fade ** 1.35;
        this.waveFrame(g, 0, Math.max(1, Math.min(plan.shockScale, Math.ceil(p.shock * plan.shockScale))));
    }

    /** 바닥의 문양: 점선 고리 둘과 여덟 십자, 떨어지는 주먹의 그림자. */
    seal(g, p, plan) {
        const { a, b, E } = plan, call = clamp(p.t / 126), fade = p.age < 0 ? call : 1 - clamp(p.age / 380), mark = 0.43 + 0.57 * call;
        g.globalAlpha = 0.58 * fade; this.ovalMarks(g, [a * mark * 0.92, b * mark * 0.92], E.c2, 144);
        g.globalAlpha *= 0.5; this.ovalMarks(g, [a * mark * 0.71, b * mark * 0.71], GOLD, 98);
        g.globalAlpha = 0.64 * fade;
        for (let i = 0; i < 8; i++) {
            const angle = (i + 0.5) * TAU / 8, x = Math.cos(angle) * a * mark * 0.88, y = Math.sin(angle) * b * mark * 0.88;
            this.pixelLine(g, E.c1, [x - 3, y, x + 3, y], 2); this.pixelLine(g, E.c2, [x, y - 3, x, y + 3], 2);
        }
        g.globalAlpha = (0.28 + p.alpha * 0.38) * call * (1 - clamp((p.t - plan.release) / 260));
        g.fillStyle = '#100a17'; g.beginPath(); g.ellipse(0, 5, 28 + 46 * p.drop, 10 + p.drop * 12, 0, 0, TAU); g.fill();
        if (p.age >= 0) return false;
        g.globalAlpha = 0.55 * fade; this.pixelLine(g, E.c1, [-8 * mark, 0, 8 * mark, 0]); this.pixelLine(g, E.c2, [0, -5 * mark, 0, 5 * mark]);
        return true;
    }

    /** 찍은 뒤의 바닥: 움푹한 그림자, 양옆으로 튀는 입술, 빛살 금, 충격파, 가로 섬광. */
    crater(g, p, plan) {
        const { age } = p, { E, scale } = plan;
        if (age < 390) { g.globalAlpha = 0.86 * (1 - clamp((age - 160) / 230)); g.fillStyle = INK; g.beginPath(); g.ellipse(2, 9, 31 + scale * 8, 5 + scale, 0, 0, TAU); g.fill(); }
        if (age < 110) {
            const u = age / 110;
            g.globalAlpha = 0.88 * (1 - u);
            for (const side of [-1, 1]) {
                const lip = (27 + 11 * u) * scale;
                this.pixelLine(g, E.c2, [side * lip, 7 + u * 4, side * (lip + 13 + u * 8), 4 + u * 3], 2);
                this.pixelLine(g, E.c1, [side * (lip + 3), 7 + u * 4, side * (lip + 11), 5 + u * 3]);
            }
        }
        for (const points of plan.rays) {
            let fromX = 0, fromY = 0;
            for (let i = 0; i < Math.ceil(clamp(age / 124) * points.length); i++) {
                const [dx, dy] = points[i];
                g.globalAlpha = 0.83 * (1 - clamp(age / 660)); this.pixelLine(g, INK, [fromX, fromY + 1, dx, dy + 1], 3);
                g.globalAlpha *= 0.8 - i * 0.08; this.pixelLine(g, age < 178 ? E.c2 : E.c3, [fromX, fromY, dx, dy], 2);
                fromX = dx; fromY = dy;
            }
        }
        this.shock(g, p, plan);
        if (age < 95) {
            const width = (22 + age * 0.22) * scale;
            g.globalAlpha = 0.82 * (1 - age / 95);
            this.pixelLine(g, E.c2, [-width, 6, width, 6], 3); this.pixelLine(g, E.c1, [-width * 0.49, 5, width * 0.49, 5], 2);
        }
    }

    ground(g, t, plan) {
        const p = this.pose(t, plan);
        g.imageSmoothingEnabled = false;
        if (!this.seal(g, p, plan)) this.crater(g, p, plan);
        g.globalAlpha = 1;
    }

    /** 위: 틈의 검은 띠, 틈 아래로만 보이는 주먹, 튀는 파편. */
    above(g, t, plan) {
        this.place(g, plan);
        const p = this.pose(t, plan), opening = clamp(t / 96) * (1 - clamp((t - plan.release - 120) / 260)), E = plan.E;
        if (!opening) return;
        g.imageSmoothingEnabled = false;
        g.globalAlpha = 0.78 * opening; g.fillStyle = INK; g.fillRect(Math.round(plan.startX - 51 * opening), plan.portalY - 4, Math.round(102 * opening), 9);
        g.globalAlpha = 0.72 * opening; this.pixelLine(g, E.c3, [plan.startX - 48 * opening, plan.portalY + 1, plan.startX + 48 * opening, plan.portalY + 1], 2);
        if (p.alpha > 0) this.fist(g, p, plan);
        for (const shard of plan.shards) {
            const u = p.age / shard.life;
            if (u < 0 || u >= 1) continue;
            const x = Math.round(shard.x * (0.28 + u * 0.72)), y = Math.round(shard.y * u - Math.sin(u * Math.PI) * shard.height);
            g.globalAlpha = 1 - u; g.fillStyle = INK; g.fillRect(x - 1, y - 1, shard.width + 2, 4);
            g.fillStyle = shard.width > 3 ? GOLD : E.c2; g.fillRect(x, y, shard.width, 2);
        }
        g.globalAlpha = 1;
    }

    /** 주먹: 누르는 점(pressure)이 그 자리에 오게 2배로, 접근 쪽으로 뒤집고 한 각도로 기울인다. */
    fist(g, p, plan) {
        const image = this.pictures.fist.source, big = g.canvas.width + g.canvas.height;
        g.save();
        g.globalAlpha = p.alpha;
        g.beginPath(); g.rect(-big, plan.portalY + 2, big * 2, big); g.clip();
        g.translate(Math.round(p.x), Math.round(p.y));
        g.rotate(plan.lean * FIST.tilt);
        g.scale(-plan.side, 1);
        g.drawImage(image, FIST.frame * FIST.frameWidth, 0, FIST.frameWidth, FIST.frameHeight, -FIST.pressureX * FIST.scale, -FIST.pressureY * FIST.scale, FIST.frameWidth * FIST.scale, FIST.frameHeight * FIST.scale);
        g.restore();
    }

    /** 사건 하나(시전 하나, 이중 시전의 둘째 주먹 하나). 그림이 아직 없으면 그리지 않고 다시 묻지 않는다(첫 시전 전에 warm이 연다). */
    pact(c) {
        if (!c.first) return true;
        if (!this.ready()) return true;
        const plan = this.plan(c.event, c.element);
        this.shared.hangPair(c.event.landingCell, plan.life, (g, t) => this.ground(g, t, plan), (g, t) => this.above(g, t, plan));
        return true;
    }
}

export function createStagePact(deps, shared) {
    return new StagePact(deps, shared);
}
