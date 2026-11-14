import { createStageSkillBrush } from './stage-skill-brush.mjs';
import { createStageProjectileBodies } from './stage-projectile-bodies.mjs';
import { visualRandom } from './pixel-effect-math.mjs';

class StageSkillDraws {
    constructor(deps, brush) {
        this.deps = deps;
        this.needle = null;
        this.ECHO = Object.freeze({ life: 420, pop: 70, hold: 0.2, back: 6, near: 3, bright: 0.5, faint: 0.18, lift: 128, rise: 10, ahead: 18, font: 12, rim: '#0b0a10' });
        this.brush = brush;
    }

    /** 프레임마다 다시 계산한 난수열(같은 씨앗이면 같은 값). */
    drawRandom(seed) { return visualRandom(seed); }

    /** 바늘의 한 줄(x)의 반 두께: 앞으로 갈수록 가늘고, 뒤쪽 꼬리와 걷히는 뒤끝은 둥글게 줄어든다. */
    needleHalf(x, shape) {
        const along = Math.max(0, x) / shape.length, back = x < 0 ? 1 - Math.pow(x / shape.tail, 1.4) : 1;
        const rear = (x - shape.start) / 7, half = Math.max(0.5, 5 * (1 - along) ** 1.15 + 0.2) * back;
        return rear < 1 ? half * Math.sqrt(Math.max(0.08, rear)) : half;
    }

    needleBody(put, shape, tip, ink) {
        for (let x = shape.start; x <= tip; x++) {
            const w = this.needleHalf(x, shape);
            if (w < 0.5) continue;
            for (let y = -Math.ceil(w); y <= Math.ceil(w); y++) {
                const ay = Math.abs(y);
                if (ay <= w + 0.5) put(x, y, ay > w - 0.5 ? ink.dark : y === 0 ? ink.white : ay < w * 0.5 ? ink.lit : ink.mid);
            }
        }
    }

    /** 속도선 둘(끝 조금 뒤, 위아래)과 끝의 십자 번쩍임. */
    needleMarks(g, t, tip, tailEnd, ink) {
        if (t < 130) {
            const x1 = tip - 10, x0 = Math.max(x1 - 26 - Math.round(Math.min(1, t / 80) * 10), tailEnd);
            g.globalAlpha = 0.7; g.fillStyle = ink.dark;
            if (x1 > tailEnd + 4) for (const dy of [-7, 7]) g.fillRect(x0, dy, x1 - x0, 1);
            g.globalAlpha = 1;
        }
        if (t <= 50 || t >= 130) return;
        const r = t < 90 ? 2 + Math.round((t - 50) / 10) : 6 - Math.round((t - 90) / 10);
        g.fillStyle = ink.white; g.fillRect(tip + 1 - r, 0, r * 2 + 1, 1); g.fillRect(tip + 1, -r, 1, r * 2 + 1);
        g.fillStyle = ink.lit; g.fillRect(tip, -1, 3, 3);
    }

    /** @param {number} face 1 오른쪽, -1 왼쪽 @param {string} rampName 색 램프 @returns {{life:number, paint:Function}} 손 앞(앞으로 14, 위로 42도트)에 걸 연출 */
    piercePaint(face, rampName) {
        const closureView = this;
        const C = this.deps.STAGE_SKILL_VFX.ramps[rampName] || this.deps.STAGE_SKILL_VFX.ramps.phys, ink = { dark: C[1], mid: C[3], lit: C[4], white: C[5] };
        const length = 107, tailX = -22, pad = 10, width = length - tailX + 12, height = pad * 2 + 1;
        return { life: 230, paint(ctx, t, dot) {
            const tip = Math.round(length * (1 - (1 - Math.min(1, t / 80)) ** 2)), gone = t < 140 ? 0 : length * Math.min(1, (t - 140) / 90);
            if (tip - gone < 2) return;
            closureView.needle = closureView.needle || closureView.brush.drawCanvas(width, height);
            const g = closureView.needle.ctx, start = Math.round(tailX + (gone / length) * (length - tailX));
            g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, width, height); g.setTransform(1, 0, 0, 1, -tailX, pad);
            closureView.needleBody((x, y, colour) => { g.fillStyle = colour; g.fillRect(x, y, 1, 1); }, { length, tail: tailX, start }, tip, ink);
            closureView.needleMarks(g, t, tip, Math.round(gone), ink);
            ctx.globalAlpha *= t > 170 ? Math.max(0, 1 - (t - 170) / 60) : 1;
            if (face < 0) ctx.scale(-1, 1);
            closureView.deps.stageDots.blit(ctx, closureView.needle.canvas, { x: 0, y: 0, w: width, h: height }, { x: Math.round(tailX * dot), y: Math.round(-pad * dot), scale: dot });
        } };
    }

    // ---------------------------------------------------------------- void gash (공허 가르기)
    lensPath(g, length, w) {
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(length * 0.5, -w * 2, length, 0); g.quadraticCurveTo(length * 0.5, w * 2, 0, 0); g.closePath();
    }

    /** 벌어진 틈: 보라 테두리 두 겹, 검은 속, 그 안의 성운과 반짝이는 별. */
    gashOpening(g, sky, t, w) {
        const ink = this.brush.drawInk('chaos');
        g.save();
        g.globalAlpha = 0.55; g.fillStyle = ink.c2; this.lensPath(g, sky.length, w + 3); g.fill();
        g.globalAlpha = 0.9; g.fillStyle = ink.c1; this.lensPath(g, sky.length, w + 1.5); g.fill();
        g.globalAlpha = 1; g.fillStyle = '#07040f'; this.lensPath(g, sky.length, w); g.fill();
        this.lensPath(g, sky.length, w); g.clip();
        for (const [x, y, r, colour] of sky.clouds) { g.globalAlpha = 0.5; g.fillStyle = colour; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, 6.29); g.fill(); }
        for (const [x, y, size, phase, bright] of sky.stars) {
            g.globalAlpha = (0.55 + 0.45 * Math.sin(t / 110 + phase)) * bright;
            g.fillStyle = size > 1 ? '#fff6ff' : '#d9c8ff';
            g.fillRect(Math.round(x + Math.sin(t / 400 + phase) * 2), Math.round(y), size, size);
        }
        g.restore();
    }

    /** 베는 선(흰 심과 보라 테, 다 긋고 나면 옅어진다)과 선에서 튀는 보라 불티. */
    gashCut(g, sky, t) {
        const ink = this.brush.drawInk('chaos'), tip = Math.round(sky.length * (1 - (1 - Math.min(1, t / 80)) ** 2));
        if (t < 150) {
            const alpha = t < 80 ? 1 : 1 - (t - 80) / 70;
            g.globalAlpha = alpha * 0.8; g.fillStyle = ink.c2; g.fillRect(0, -2, tip, 5);
            g.globalAlpha = alpha; g.fillStyle = '#ffffff'; g.fillRect(0, -1, tip, 2);
            g.fillStyle = ink.c1; g.fillRect(Math.max(0, tip - 18), -1, 18, 2);
        }
        for (const [x, side, far, life] of sky.sparks) {
            const age = t - x / sky.length * 80, k = age / life;
            if (age < 0 || age > life) continue;
            g.globalAlpha = 1 - k; g.fillStyle = k < 0.4 ? '#f3eaff' : ink.c2;
            g.fillRect(Math.round(x + k * 6), Math.round((side < 0 ? -1 : 1) * (2 + Math.abs(far) * k)), 2, 2);
        }
    }

    /** 틈 하나의 별, 성운, 불티, 끌려 드는 티끌 자리(씨앗으로 정해 프레임마다 같다). */
    gashSky(length, seed, rift) {
        const r = this.drawRandom(777 + seed), stars = [], clouds = [], sparks = [], span = 1 + ((rift && rift.rows) || 0) * 0.7;   // 띠가 벌린 만큼 별과 성운도 위아래로 퍼진다
        for (let i = 0; i < 70; i++) stars.push([r() * length, (r() - 0.5) * 30 * span, r() < 0.35 ? 2 : 1, r() * 6.28, 0.6 + r() * 0.4]);
        for (let i = 0; i < 8; i++) clouds.push([length * (0.1 + 0.8 * r()), (r() - 0.5) * 12 * span, (10 + r() * 16) * span, ['#7a3fd0', '#3b2a9c', '#b04aa0', '#2a6fb0'][i % 4]]);
        for (let i = 0; i < 14; i++) sparks.push([r() * length, r() - 0.5, (r() - 0.5) * 40, 60 + r() * 120]);
        // 티끌: [선 위치, 시작 거리(위아래), 시작 지연, 걸리는 시간, 크기]
        const motes = rift ? [...Array(46)].map(() => [length * (-0.1 + 1.2 * r()), (r() < 0.5 ? -1 : 1) * (26 + r() * 70), r() * 260, 220 + r() * 120, r() < 0.3 ? 2 : 1]) : [];
        return { length, stars, clouds, sparks, motes, rift };
    }

    /** 끌려 드는 티끌: 틈이 열린 동안 둘레에서 틈 쪽으로 가속하며 빨려 들고, 가는 쪽 반대로 짧은 꼬리를 끈다. 닫히면 없다. */
    gashMotes(g, sky, t) {
        const ink = this.brush.drawInk('chaos');
        for (const [x, d0, wait, ms, size] of sky.motes) {
            const age = t - sky.rift.at + 40 - wait;
            if (age < 0 || age > ms || t > sky.rift.close) continue;
            const k = age / ms, ease = k * k, y = d0 * (1 - ease), xx = x + (sky.length * 0.5 - x) * 0.12 * ease;
            g.globalAlpha = Math.min(1, k * 4) * (1 - k * 0.3) * 0.85; g.fillStyle = k > 0.7 ? '#f3eaff' : (size > 1 ? ink.c1 : ink.c2);
            g.fillRect(Math.round(xx), Math.round(y), size, size);
            g.globalAlpha *= 0.5; g.fillRect(Math.round(xx), Math.round(y + Math.sign(d0) * (2 + 6 * k)), 1, Math.round(2 + 5 * k));
        }
        g.globalAlpha = 1;
    }

    /** @param {number} face 1 오른쪽, -1 왼쪽 @param {number} reach 베는 길이(도트) @param {{at:number, close:number, rows?:number}} rift 틈이 끌어당기기
     * 시작하는 때와 닫히는 때(ms, 2026-10-17 스킬룬 인계 v32), 옆으로 치는 띠의 위아래 줄 수(2026-10-17: 줄마다 틈이 10도트 더 벌어지고
     * 끝이 그만큼 낮아져 앞줄까지 닿는다) @returns {{life:number, paint:Function}} 주인공의 발 자리에 걸 연출:
     * 머리 높이 앞에서 시작해 reach 앞의 무릎 높이까지 비스듬히 벤다. 열린 동안 둘레의 티끌이 틈 쪽으로 가속하며 빨려 든다. */
    gashPaint(face, reach, seed, rift) {
        const closureView = this;
        const rows = (rift && rift.rows) || 0, from = [14, -92], to = [reach + 26, -18 + rows * 10], width = 14 + rows * 10;
        const sky = this.gashSky(Math.hypot(to[0] - from[0], to[1] - from[1]), seed, rift), angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
        return { life: 780, paint(ctx, t, dot) {
            const open = t < 60 ? 0 : t < 200 ? (t - 60) / 140 : t < 560 ? 1 : Math.max(0, 1 - (t - 560) / 220), w = width * Math.sin(open * Math.PI / 2);
            ctx.scale(face * dot, dot);
            ctx.translate(from[0], from[1]);
            ctx.rotate(angle);
            if (w >= 0.5) closureView.gashOpening(ctx, sky, t, w);
            closureView.gashCut(ctx, sky, t);
            if (sky.rift) closureView.gashMotes(ctx, sky, t);
        } };
    }

    /** @param {{face:number, count:number, ink:{c1:string,c2:string}, bright:?Function, faint:?Function}} look bright, faint: stageActors.afterimage가 준
     * 그리기(그린 적이 없으면 null) @returns {{life:number, paint:Function}} paint의 붓은 주인공의 발 자리에 놓인다 */
    echoPaint(look) {
        return { life: this.ECHO.life, paint: (ctx, t, dot) => {
            const u = t / this.ECHO.life, pop = Math.min(1, t / this.ECHO.pop), fade = u < this.ECHO.hold ? 1 : Math.max(0, 1 - (u - this.ECHO.hold) / (1 - this.ECHO.hold));
            this.echoGhost(ctx, look.bright, { dx: -look.face * this.ECHO.back * (1 + u) * dot, alpha: this.ECHO.bright * fade * pop, dot });
            this.echoGhost(ctx, look.faint, { dx: -look.face * this.ECHO.near * dot, alpha: this.ECHO.faint * fade, dot });
            this.echoMark(ctx, look, { x: look.face * this.ECHO.ahead * dot, y: -(this.ECHO.lift + this.ECHO.rise * u) * dot, alpha: fade, dot });
        } };
    }

    echoGhost(ctx, ghost, at) {
        if (!ghost) return;
        ctx.save();
        ctx.translate(Math.round(at.dx), 0);
        ghost(ctx, at.dot, at.alpha);
        ctx.restore();
    }

    /** 머리 위 ×n: 갈무리11의 제 크기(12px, 도트가 크면 그 배수)로 정수 화소에 찍는다. */
    echoMark(ctx, look, at) {
        const size = this.ECHO.font * Math.max(1, Math.round(at.dot)), label = `×${look.count}`;
        ctx.save();
        ctx.globalAlpha *= at.alpha;
        ctx.font = `${size}px ${this.deps.i18n.fontFamily("'Galmuri11'")}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = Math.round(size / 4);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.ECHO.rim;
        ctx.fillStyle = look.ink.c1;
        this.deps.drawCrispCanvasText(ctx, label, at.x, at.y, 'strokeText');
        this.deps.drawCrispCanvasText(ctx, label, at.x, at.y);
        ctx.restore();
    }
}

export function createStageSkillDraws(deps) {
    const brush = createStageSkillBrush(deps);
    const bodies = createStageProjectileBodies(deps, brush);
    const instance = new StageSkillDraws(deps, brush);
    return Object.freeze({ ...bodies, pierce: instance.piercePaint.bind(instance), gash: instance.gashPaint.bind(instance), echo: instance.echoPaint.bind(instance) });
}
