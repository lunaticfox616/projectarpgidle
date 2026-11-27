/** 강림(95, V3.24 시뮬레이터 startDescend, descendFx, quakeFx와 'descend' 착지): 웅크렸다가 박찬 자리에 먼지가 일고, 몸이 화면 밖으로 솟구치며 세로 빛줄이
 * 남는다. 안 보이는 동안 떨어질 자리에 그림자가 커지고, 화면 위에서 몸까지 이어지는 줄과 함께 내리꽂힌다. 착지하면 충격, 돌 물결, 먼지, 돌조각 클립이
 * 차례로 터지고(전달본 VFX 표, 구입한 이펙트 그림), 땅이 갈라지는 금이 물결을 따라 자라며 지진 물결마다 돌 띠와 튀는 돌조각, 먼지가 퍼진다.
 * 몸의 높이는 주인공 그림이 맡는다(modules/rendering/stage-rune-air.mjs descendPose). 피해의 때는 전투가 정한다(modules/combat/gem-extension-v324.mjs).
 * 게임의 규칙으로 바꾼 것: 착지 클립의 1.25배와 지진 먼지의 0.8배는 빼고 클립의 배율 그대로 튼다. 화면 흔들림은 넣지 않는다. 효과 줄이기에서는 튀는 돌조각과
 * 지진 먼지를 뺀다. 칸으로 잰 길이는 게임의 칸(64×32 도트)으로 옮겼다.
 */
const STONE = Object.freeze(['#c2a77d', '#ab8b63', '#73604b', '#59483b']);
const DARK = '#17161c';
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const snap = Math.round;

class StageDescent {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
    }

    ramp() { return this.deps.STAGE_SKILL_VFX.ramps.phys; }

    /** 발에서 화면 위 끝까지(도트)에 170도트를 더한 높이: 몸이 화면 밖으로 다 사라지는 높이(주인공 그림과 같은 규칙). */
    sky(g) { return -this.shared.screenTop(g) + 170; }

    /** 주인공의 지금 높이 몫(0~1, stage-rune-air.mjs descendSky와 같은 곡선). */
    liftShare(d, t) {
        const top = d.wind + d.up, drop = top + d.hang;
        if (t < d.wind) return 0;
        if (t < top) { const u = (t - d.wind) / d.up; return u * (2 - u) * 0.35 + u * u * 0.65; }
        if (t < drop) return 1;
        return 1 - clamp((t - drop) / d.fall) ** 2;
    }

    /** 솟구침: 박찬 자리에서 위로 뻗는 세 줄(가운데가 밝다). 위로 갈수록 옅어진다. */
    rise(g, t, d) {
        const tt = t - d.wind;
        if (tt < 0 || tt >= d.up + 90) return;
        const C = this.ramp(), top0 = this.shared.screenTop(g), a = tt < d.up ? 1 : Math.max(0, 1 - (tt - d.up) / 90);
        const top = Math.max(top0 - 4, -40 - (tt < d.up ? this.liftShare(d, t) : 1) * this.sky(g));
        for (let y = -36; y > top; y -= 2) {
            const k = (-36 - y) / Math.max(1, -36 - top);
            g.globalAlpha = a * (0.55 - 0.4 * k); g.fillStyle = C[4]; g.fillRect(-1, y, 2, 2);
            g.globalAlpha = a * (0.3 - 0.22 * k); g.fillStyle = C[3]; g.fillRect(-7, y, 1, 2); g.fillRect(6, y, 1, 2);
        }
        g.globalAlpha = 1;
    }

    /** 내리꽂힘: 화면 위에서 몸까지 이어지는 줄. 착지 뒤 0.11초에 사라진다. */
    fall(g, t, d) {
        const tf = t - d.wind - d.up - d.hang;
        if (tf < 0 || tf >= d.fall + 110) return;
        const C = this.ramp(), top = this.shared.screenTop(g) - 2, a = tf < d.fall ? 1 : Math.max(0, 1 - (tf - d.fall) / 110);
        const bottom = snap(-44 - (tf < d.fall ? this.liftShare(d, t) * this.sky(g) : 0));
        for (let y = snap(top); y < bottom; y += 2) {
            const k = (y - top) / Math.max(1, bottom - top);
            g.globalAlpha = a * (0.15 + 0.55 * k); g.fillStyle = k > 0.75 ? C[5] : C[4]; g.fillRect(-1, y, 3, 2);
            g.globalAlpha = a * (0.08 + 0.28 * k); g.fillStyle = C[3]; g.fillRect(-9, y, 1, 2); g.fillRect(8, y, 1, 2);
        }
        g.globalAlpha = 1;
    }

    /** 떨어질 자리의 그림자: 몸이 안 보이는 동안 커진다(바닥 층). */
    shadow(g, t, d) {
        const tt = t - d.wind, tf = tt - d.up - d.hang;
        if (tt < d.up * 0.6 || tf >= d.fall) return;
        const k = Math.min(1, (tt - d.up * 0.6) / (d.hang + d.fall + d.up * 0.4));
        g.globalAlpha = 0.18 + 0.32 * k; g.fillStyle = '#0b0a10';
        g.beginPath(); g.ellipse(0, 0, 8 + 22 * k, 3 + 7 * k, 0, 0, TAU); g.fill();
        g.globalAlpha = 1;
    }

    /** 뛰어오르는 사건: 박차는 먼지(웅크림이 끝날 때)와 두 자리의 빛줄, 그림자. */
    leap(c) {
        if (!c.first) return true;
        const e = c.event, d = e.descend;
        if (!d) return true;
        const face = e.descentFace || 1, life = d.wind + d.up + d.hang + d.fall + 160;
        if (c.gem.map.takeoff) this.deps.stageSkillVfx.play(c.gem.map.takeoff, this.shared.K.at(e.sourceCell, 0, 1), { face, layer: 'ground', alpha: 0.8, delay: d.wind });
        this.shared.ST.hang(this.shared.K.at(e.sourceCell), { life, top: (g, t) => this.rise(g, t, d) });
        this.shared.hangPair(e.landingCell, life, (g, t) => this.shadow(g, t, d), (g, t) => this.fall(g, t, d));
        return true;
    }

    /** 지진 하나의 계획(시뮬레이터 quakeFx): 금 아홉 줄, 물결마다 튀는 돌조각. 같은 자리는 늘 같은 모양이다. */
    plan(event) {
        const waves = event.quakeWaves || [{ at: 0, radius: 2 }], last = waves[waves.length - 1], spot = event.landingCell, W = this.shared.WIDE, D = this.shared.DEEP;
        const random = this.shared.ST.random(9500 + Math.floor(spot.gx * 7) + Math.floor(spot.gy * 3)), reach = last.radius + 0.5;
        const cracks = Array.from({ length: 9 }, (_, i) => {
            const a = i / 9 * TAU + (random() - 0.5) * 0.5, length = (0.55 + random() * 0.4) * reach, n = 5 + Math.floor(random() * 3), points = [[0, 0]];
            let x = 0, y = 0;
            for (let j = 1; j <= n; j++) { const turn = a + (random() - 0.5) * 0.9; x += Math.cos(turn) * length * W / n; y += Math.sin(turn) * length * D / n; points.push([x, y]); }
            return points;
        });
        const chunks = waves.map((_, wi) => Array.from({ length: 10 + wi * 4 }, (_, i) => ({ a: (i + random()) / (10 + wi * 4) * TAU, k: 0.82 + random() * 0.3,
            h: 10 + random() * 14, s: 2 + Math.floor(random() * 3), d: random() * 60 })));
        return { waves, last, cracks, chunks, life: last.at + 620, reduced: this.deps.reduced() };
    }

    /** 도트 선 위의 칸마다 dot(x, y)를 부른다(브레즌햄). */
    each([x0, y0, x1, y1], dot) {
        const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (let n = 0; n < 1200; n++) {
            dot(x0, y0);
            if (x0 === x1 && y0 === y1) return;
            const e2 = err * 2;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    }

    /** 금: 물결을 따라 바깥으로 자란다(가운데 가까이는 굵다). */
    cracks(g, plan, tt, fade) {
        const grow = Math.min(1, tt / (plan.last.at + 140));
        for (const points of plan.cracks) {
            for (let j = 1; j < points.length; j++) {
                const k0 = (j - 1) / (points.length - 1), k1 = j / (points.length - 1);
                if (k0 >= grow) break;
                const kk = Math.min(1, (grow - k0) / (k1 - k0)), [ax, ay] = points[j - 1], x = ax + (points[j][0] - ax) * kk, y = ay + (points[j][1] - ay) * kk;
                /** @type {[number, number, number, number]} */
                const ends = [snap(ax), snap(ay), snap(x), snap(y)];
                const wide = k0 < 0.4;
                g.globalAlpha = fade * 0.9; g.fillStyle = DARK;
                this.each(ends, (px, py) => g.fillRect(px, py, wide ? 3 : 2, wide ? 2 : 1));
                g.globalAlpha = fade * 0.5; g.fillStyle = STONE[3];
                this.each([ends[0], ends[1] - 1, ends[2], ends[3] - 1], (px, py) => { if ((px + py) % 3 === 0) g.fillRect(px, py, 1, 1); });
            }
        }
    }

    /** 물결마다 둘레로 퍼지는 돌 띠(0.3초). */
    rings(g, plan, tt, fade) {
        plan.waves.forEach((w, wi) => {
            const u = (tt - w.at) / 300;
            if (u < 0 || u > 1) return;
            const k = 1 - (1 - u) ** 2, [a, b] = this.shared.semi(w.radius), rx = a * (0.25 + 0.75 * k), ry = b * (0.25 + 0.75 * k), n = Math.round(40 + w.radius * 18);
            for (let i = 0; i < n; i++) {
                const angle = i / n * TAU, jit = ((i * 7 + wi * 3) % 5 - 2) * 1.2, x = snap(Math.cos(angle) * (rx + jit)), y = snap(Math.sin(angle) * (ry + jit * 0.5));
                g.globalAlpha = fade * (1 - u) * 0.85;
                g.fillStyle = DARK; g.fillRect(x - 1, y, 5, 2);
                g.fillStyle = STONE[(i + wi) % 3]; g.fillRect(x, y - 1, 3, 1);
                if (i % 3 === 0) { g.fillStyle = STONE[1]; g.fillRect(x, y - 3 - snap(4 * (1 - u)), 2, 2); }
            }
        });
    }

    /** 위: 물결마다 튀어 오르는 돌조각. */
    chunks(g, plan, tt) {
        plan.waves.forEach((w, wi) => {
            const [a, b] = this.shared.semi(w.radius);
            for (const c of plan.chunks[wi]) {
                const u = (tt - w.at - c.d) / 360;
                if (u < 0 || u > 1) continue;
                const x = snap(Math.cos(c.a) * a * c.k * (0.5 + 0.5 * u)), y = snap(Math.sin(c.a) * b * c.k * (0.5 + 0.5 * u) - c.h * 4 * u * (1 - u));
                g.globalAlpha = 1 - u * u;
                g.fillStyle = DARK; g.fillRect(x - 1, y - 1, c.s + 2, c.s + 2);
                g.fillStyle = STONE[(c.s + wi) % 3]; g.fillRect(x, y, c.s, c.s);
                g.fillStyle = STONE[3]; g.fillRect(x, y + c.s - 1, c.s, 1);
            }
        });
    }

    quakeGround(g, t, plan) {
        const fade = t > plan.life - 260 ? Math.max(0, (plan.life - t) / 260) : 1;
        this.cracks(g, plan, t, fade);
        this.rings(g, plan, t, fade);
        g.globalAlpha = 1;
    }

    quakeTop(g, t, plan) {
        if (plan.reduced) return;
        this.chunks(g, plan, t);
        g.globalAlpha = 1;
    }

    /** 착지: 충격 클립 넷(30ms씩, 첫째는 바닥 층)과 지진. 첫 물결 뒤의 물결마다 둘레 넷에 먼지가 인다. */
    quake(c) {
        if (!c.first) return true;
        const e = c.event, spot = e.landingCell, face = e.descentFace || 1, map = c.gem.map, plan = this.plan(e);
        [].concat(map.landing || []).forEach((ref, k) => this.deps.stageSkillVfx.play(ref, this.shared.K.at(spot, k === 3 ? face * 18 : 0, this.shared.K.onGround(ref) ? 1 : -30),
            { face, delay: k * 30, layer: k === 0 ? 'ground' : 'top' }));
        if (map.quake && !plan.reduced) this.quakeDust(map.quake, spot, plan.waves.slice(1));
        this.shared.hangPair(spot, plan.life, (g, t) => this.quakeGround(g, t, plan), (g, t) => this.quakeTop(g, t, plan));
        return true;
    }

    quakeDust(ref, spot, waves) {
        waves.forEach((w, i) => {
            const [a, b] = this.shared.semi(w.radius - 0.3);
            for (let k = 0; k < 4; k++) {
                const angle = (k + 0.5 + i * 0.5) / 4 * TAU;
                this.deps.stageSkillVfx.play(ref, this.shared.K.at(spot, snap(Math.cos(angle) * a), snap(Math.sin(angle) * b) + 1), { face: Math.cos(angle) >= 0 ? 1 : -1, layer: 'top', alpha: 0.7, delay: w.at });
            }
        });
    }
}

export function createStageDescent(deps, shared) {
    return new StageDescent(deps, shared);
}
