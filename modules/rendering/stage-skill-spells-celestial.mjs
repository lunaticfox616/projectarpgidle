class StageCelestialSpells {
    constructor(deps) {
        this.deps = deps;
        this.S = this.deps.stageSkillStrokes;
        this.WIDE = 64;
        this.DEEP = 32;
        this.TAU = Math.PI * 2;
        this.dot = g => (x, y) => g.fillRect(x, y, 1, 1);
        this.GOLD_LOW = Object.freeze(['#2a2116', '#4e3f26', '#6f5b34', '#8f7845', '#ad9459']);
        this.gothicFrame = null;
        this.archAt = (x, y, x0, x1) => this.inArch(x + 0.5, y + 0.5, { x0, x1, ys: 54 });
        this.NEBULA = Object.freeze(['#7a3fd0', '#3b2a9c', '#b04aa0', '#2a6fb0']);
    }

    /** 정삼각 뾰족 아치 안쪽인지(폭 x0..x1, 받침 높이 ys). */
    inArch(x, y, o) { const R = o.x1 - o.x0; if (y >= o.ys) return x >= o.x0 && x <= o.x1; return (x - o.x1) ** 2 + (y - o.ys) ** 2 <= R * R && (x - o.x0) ** 2 + (y - o.ys) ** 2 <= R * R; }

    /** 창틀: 바깥 테 어둡게, 가운데 밝게, 안쪽 그늘. */
    gothicRim(px) {
        for (let y = 0; y < 142; y++) for (let x = 0; x < 64; x++) {
            if (!this.archAt(x, y, 6, 58) || this.archAt(x, y, 11, 53)) continue;
            px(x, y, !this.archAt(x, y, 7, 57) ? this.GOLD_LOW[0] : this.archAt(x, y, 10, 54) ? this.GOLD_LOW[1] : this.archAt(x, y, 9, 55) ? this.GOLD_LOW[2] : (x < 32 ? this.GOLD_LOW[3] : this.GOLD_LOW[2]));
        }
    }

    /** 아치 머리 유리(옅은 호박빛), 장미창(네 잎), 작은 뾰족 아치 둘. */
    gothicGlass(g, px) {
        const G = this.GOLD_LOW;
        g.globalAlpha = 0.45;
        for (let y = 10; y < 56; y++) for (let x = 11; x < 54; x++) if (this.archAt(x, y, 11, 53)) px(x, y, (x + y) % 7 ? '#3b2e1c' : '#5e4626');
        g.globalAlpha = 1;
        const ring = (cx, cy, r, c) => { for (let a = 0; a < this.TAU; a += 0.06) px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c); };
        ring(32, 27, 7, G[3]); ring(32, 27, 8, G[0]);
        for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) ring(32 + dx, 27 + dy, 2.5, G[4]);
        px(32, 27, G[4]);
        for (const [x0, x1] of [[12, 31], [33, 52]]) this.gothicSmallArch(px, x0, x1);
    }

    /** 아치 머리 아래의 작은 뾰족 아치 테 하나. */
    gothicSmallArch(px, x0, x1) {
        for (let y = 36; y < 56; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (this.archAt(x, y, x0 - 1, x1 + 1) && !this.archAt(x, y, x0 + 1, x1 - 1)) px(x, y, this.GOLD_LOW[2]);
    }

    /** 기둥 금띠, 아치 받침, 창살, 칸막이, 목 받침(반달 홈), 계단 창턱, 꼭대기 십자. */
    gothicParts(g, px) {
        const G = this.GOLD_LOW, rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        for (let y = 66; y < 140; y += 18) { rect(7, y, 4, 1, G[4]); rect(54, y, 4, 1, G[4]); }
        rect(4, 52, 9, 3, G[0]); rect(5, 52, 7, 1, G[4]); rect(52, 52, 9, 3, G[0]); rect(53, 52, 7, 1, G[4]);
        rect(31, 40, 3, 16, G[0]); rect(32, 40, 1, 16, G[3]);
        rect(10, 56, 45, 4, G[0]); rect(10, 57, 45, 2, G[2]); rect(10, 57, 45, 1, G[4]);
        rect(10, 101, 45, 9, G[0]); rect(10, 102, 45, 7, G[1]); rect(10, 102, 45, 1, G[3]);
        g.clearRect(27, 102, 11, 4);
        for (let a = 0; a <= Math.PI; a += 0.05) px(Math.round(32 + Math.cos(a) * 6), Math.round(102 + Math.sin(a) * 5), G[0]);
        rect(3, 140, 58, 4, G[0]); rect(4, 140, 56, 1, G[3]); rect(4, 141, 56, 2, G[1]); rect(1, 144, 62, 6, G[0]); rect(2, 144, 60, 1, G[3]); rect(2, 145, 60, 4, G[1]);
        rect(31, 0, 3, 11, G[0]); rect(32, 1, 1, 9, G[4]); rect(28, 3, 9, 3, G[0]); rect(29, 4, 7, 1, G[4]);
    }

    /** 고딕 창문 모양 단두대 틀(64×152, 가운데 x32, 바닥 y150, 목 받침 y102): 한 번 그려 둔다. */
    guillotineFrame() {
        if (this.gothicFrame) return this.gothicFrame;
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = 64; canvas.height = 152;
        const g = canvas.getContext('2d'), px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
        this.gothicRim(px);
        this.gothicParts(g, px);
        this.gothicGlass(g, px);
        this.gothicFrame = canvas;
        return canvas;
    }

    /** 칼날(40×24): 등의 금띠와 네 잎 무늬, 두 단의 몸, 비스듬한 날과 날 끝 옅은 금. */
    guillotineBlade(g, by) {
        const G = this.GOLD_LOW;
        for (let i = 0; i < 40; i++) {
            const xx = -20 + i, edge = Math.round(14 + i * 0.3);
            g.fillStyle = G[0]; g.fillRect(xx, by - 1, 1, edge + 2);
            g.fillStyle = G[2]; g.fillRect(xx, by + 4, 1, edge - 4); g.fillStyle = G[3]; g.fillRect(xx, by + 5, 1, Math.max(1, edge - 9));
            g.fillStyle = G[1]; g.fillRect(xx, by, 1, 4); g.fillStyle = G[4]; g.fillRect(xx, by + 1, 1, 1); g.fillRect(xx, by + edge - 3, 1, 2); g.fillStyle = '#c7b27a'; g.fillRect(xx, by + edge - 1, 1, 1);
        }
        g.fillStyle = '#c7b27a';
        for (const [dx, dy] of [[0, 1], [-1, 2], [1, 2], [0, 3]]) g.fillRect(dx, by + dy, 1, 1);
        g.fillStyle = G[2]; g.fillRect(-12, by + 2, 1, 1); g.fillRect(12, by + 2, 1, 1);
    }

    guillotineSparks(g, t, by, fade) {
        const r = this.S.random(13 + Math.floor(t / 40)), L = this.S.ramp('light');
        g.globalAlpha = fade * 0.85;
        for (let b = 0; b < 3; b++) {
            let bx = r() < 0.5 ? -19 : 19, byy = by + r() * 22;
            const dir = bx < 0 ? -1 : 1;
            g.fillStyle = b ? L[3] : L[5];
            for (let s = 0; s < 3; s++) { const x2 = bx + dir * (3 + r() * 6), y2 = byy + (r() - 0.5) * 8; this.S.line(bx, byy, x2, y2, this.dot(g)); bx = x2; byy = y2; }
        }
    }

    /** 신성한 단두대 하나: 대상 위에 고딕 창문 모양의 틀이 내려와 서고, 번개를 두른 칼날이 가속하며 떨어져 0.15초에 목 받침에 닿는다. */
    spellGuillotine(at, delay) {
        const closureView = this;
        const DROP = 150, STAY = 140, FADE = 160, H = this.S.ramp('holy');
        this.S.hang(at, { life: DROP + STAY + FADE, delay, top(g, t) {
            const down = Math.min(1, t / 90), fade = t < DROP + STAY ? 1 : Math.max(0, 1 - (t - DROP - STAY) / FADE), top = -150 + Math.round((1 - down) * -30);
            g.save(); g.globalAlpha = fade * Math.min(1, t / 60);
            g.drawImage(closureView.guillotineFrame(), -32, top);
            const u = Math.min(1, Math.max(0, (t - 70) / (DROP - 70))), by = Math.round(top + 61 + 19 * u * u);
            closureView.guillotineBlade(g, by);
            if (t > 50 && t < DROP + STAY) closureView.guillotineSparks(g, t, by, fade);
            if (t >= DROP && t < DROP + 80) { const k = (t - DROP) / 80; g.globalAlpha = (1 - k) * 0.8; g.fillStyle = H[5]; g.fillRect(-22, -38, 44, 2); g.fillRect(-1, -50 - k * 10, 2, 14 + k * 20); }
            g.restore();
        } });
    }

    /** 빛의 창: 높은 하늘에서 창끝을 앞으로 둔 채 빨라지며 떨어져 기운 그대로 꽂히고, 지나온 길에 빛 꼬리, 창대를 따라 번개 가지. 꽂히는 순간 타격 클립.
     * 2026-11-05 전달본 V3.9.2: 창마다 기울기(수직에서 tilt 라디안), 출발 높이(height 도트), 떨어지는 시간(fall ms)이 다르다. 없으면 예전처럼 수직 180도트, 0.17초.
     * @param {{at:object, delay:number, element:string, hit:?string, ramp:string, tilt?:number, height?:number, fall?:number}} o */
    spellFallSpear(o) {
        const closureView = this;
        const FALL = o.fall || 170, STAY = 300, C = this.S.ramp('light'), tilt = o.tilt || 0, height = o.height || 180;
        const x0 = Math.sin(tilt) * height, y0 = -2 - Math.cos(tilt) * height, rot = Math.atan2(-2 - y0, -x0), ux = Math.cos(rot), uy = Math.sin(rot);
        const fadeOf = t => (t < FALL + STAY ? 1 : Math.max(0, 1 - (t - FALL - STAY) / 160));
        if (o.hit) this.deps.stageSkillVfx.play(o.hit, { ...o.at, dy: 0 }, { delay: o.delay + FALL, ramp: o.ramp });
        this.S.hang(o.at, { life: FALL + STAY + 160, delay: o.delay,
            ground(g, t) { if (t > FALL) { g.globalAlpha = 0.5 * fadeOf(t); g.fillStyle = C[3]; g.beginPath(); g.ellipse(0, 0, 14, 5, 0, 0, closureView.TAU); g.fill(); g.globalAlpha = 1; } },
            top(g, t) {
                const e = Math.min(1, t / FALL) ** 2, x = x0 * (1 - e), y = y0 + (-2 - y0) * e, fade = fadeOf(t);
                g.save(); g.globalAlpha *= fade; closureView.deps.stageSkillDraws.body(g, 'spear', { x: x - ux * 4, y: y - uy * 4, dot: 1, face: 1, angle: rot, t, element: o.element }); g.restore();
                if (t < FALL) {   // 지나온 길에 남는 빛 꼬리
                    const tail = 60 * Math.min(1, t / FALL) + 20;
                    g.globalAlpha = 0.5; g.fillStyle = C[4];
                    closureView.S.line(Math.round(x - ux * (40 + tail)), Math.round(y - uy * (40 + tail)), Math.round(x - ux * 40), Math.round(y - uy * 40), closureView.dot(g));
                }
                g.globalAlpha = fade * 0.85;
                closureView.spearBranches(g, { x, y, ux, uy }, closureView.S.random(91 + Math.floor(t / 45)), C);
                g.globalAlpha = 1;
            } });
    }

    /** 창대를 따라 튀는 번개 가지 셋(기운 창도 창대를 따른다). */
    spearBranches(g, shaft, r, C) {
        for (let b = 0; b < 3; b++) {
            const back = 20 + r() * 50, side = (r() - 0.5) * 6, dir = r() < 0.5 ? -1 : 1;
            let bx = shaft.x - shaft.ux * back - shaft.uy * side, by = shaft.y - shaft.uy * back + shaft.ux * side;
            g.fillStyle = b ? C[3] : C[5];
            for (let s = 0; s < 3; s++) { const x2 = bx + dir * (3 + r() * 7), y2 = by + (r() - 0.5) * 8; this.S.line(bx, by, x2, y2, this.dot(g)); bx = x2; by = y2; }
        }
    }

    /** 화살 하나(나무 살, 강철 촉, 흰 깃): a는 날아가는 쪽. streak이면 뒤로 옅은 줄. */
    rainArrow(g, o) {
        const c = Math.cos(o.a), s = Math.sin(o.a), put = (d, w, col) => { g.fillStyle = col; g.fillRect(Math.round(o.x - c * d), Math.round(o.y - s * d), w, w); };
        if (o.streak) for (let d = 26; d < 46; d += 2) { g.globalAlpha = o.alpha * 0.35 * (1 - (d - 26) / 20); put(d, 1, '#e8e2d6'); }
        g.globalAlpha = o.alpha;
        for (let d = 2; d < 22; d++) put(d, 1, d % 5 ? '#b08858' : '#8a6b48');
        put(0, 2, '#cfd3dc'); put(-1, 1, '#f1ece2'); put(1, 2, '#9aa1ad');
        g.fillStyle = '#e8e2d6';
        for (const off of [-1, 1]) { g.fillRect(Math.round(o.x - c * 21 - s * off * 2), Math.round(o.y - s * 21 + c * off * 2), 1, 1); g.fillRect(Math.round(o.x - c * 19 - s * off * 2), Math.round(o.y - s * 19 + c * off * 2), 1, 1); }
        g.globalAlpha = 1;
    }

    /** 화살비의 쏘아 올림: 활에서 화살 다섯 발이 하늘로 솟아 화면 위로 사라진다. */
    spellVolleyUp(at, face, delay) {
        const closureView = this;
        this.S.hang(at, { life: 300, delay, top(g, t) {
            const k = t / 300;
            for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + face * (0.18 + i * 0.07), d = 30 + k * 420 + i * 12; closureView.rainArrow(g, { x: face * 22 + Math.cos(a) * d, y: -62 + Math.sin(a) * d, a, alpha: 1 - k * 0.6, streak: true }); }
        } });
    }

    /** 화살비: 범위 타원 안의 무작위 자리로 화살이 위 뒤쪽에서 비스듬히 0.13초에 떨어져 꽂히고, 0.35초 꽂혀 있다 옅어진다. 꽂힐 때 작은 흙먼지.
     * @param {{at:object, face:number, radius:number, ms:number}} o 범위 가운데, 반지름(칸), 비가 내리는 시간 */
    spellArrowRain(o) {
        const closureView = this;
        const A = (o.radius + 0.5) * this.WIDE, B = (o.radius + 0.5) * this.DEEP, r = this.S.random(2468), N = 26, FALL = 130, STICK = 350;
        const arrows = [...Array(N)].map((_, i) => { const a = r() * this.TAU, d = Math.sqrt(r()) * 0.95; return { x: Math.cos(a) * A * d, y: Math.sin(a) * B * d, t0: (i / N) * (o.ms - FALL - 60) + r() * 40, ang: Math.PI / 2 - o.face * (0.32 + r() * 0.12) }; });
        arrows.sort((p, q) => p.y - q.y);
        this.S.hang(o.at, { life: o.ms + STICK + 200,
            ground(g, t) {
                for (const a of arrows) {
                    const k = (t - a.t0 - FALL) / 160;
                    if (k < 0 || k >= 1) continue;
                    g.globalAlpha = 0.6 * (1 - k); g.fillStyle = '#a69886';
                    for (let q = 0; q < 4; q++) g.fillRect(Math.round(a.x + (q - 1.5) * (3 + k * 6)), Math.round(a.y - 1 - k * 3 * (q % 2)), 1, 1);
                }
                g.globalAlpha = 1;
            },
            top(g, t) { for (const a of arrows) closureView.rainArrowAt(g, a, t - a.t0, { FALL, STICK }); } });
    }

    rainArrowAt(g, a, lt, o) {
        if (lt < 0) return;
        const c = Math.cos(a.ang), s = Math.sin(a.ang);
        if (lt < o.FALL) { const d = (1 - lt / o.FALL) * 170; this.rainArrow(g, { x: a.x - c * d, y: a.y - s * d, a: a.ang, alpha: 0.95, streak: true }); }
        else if (lt < o.FALL + o.STICK + 160) this.rainArrow(g, { x: a.x - c * 6, y: a.y - s * 6, a: a.ang, alpha: lt < o.FALL + o.STICK ? 1 : 1 - (lt - o.FALL - o.STICK) / 160, streak: false });   // 촉이 바닥에 박힌 채 남는다
    }

    cosmosInside(g, c, t, o) {
        g.globalAlpha = o.inner; g.fillStyle = '#07040f'; g.beginPath(); g.arc(0, 0, o.rr, 0, this.TAU); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, o.rr, 0, this.TAU); g.clip();
        for (const [a, d, s, col] of c.neb) { const aa = a + t / 1400; g.globalAlpha = 0.45 * o.inner; g.fillStyle = col; g.beginPath(); g.ellipse(Math.cos(aa) * o.rr * d, Math.sin(aa) * o.rr * d * 0.8, o.rr * s, o.rr * s * 0.55, aa, 0, this.TAU); g.fill(); }
        for (const [a, d, s, ph] of c.stars) { const aa = a + t / 1800; g.globalAlpha = o.inner * (0.5 + 0.5 * Math.sin(t / 110 + ph)); g.fillStyle = s > 1 ? '#fff6ff' : '#d9c8ff'; g.fillRect(Math.round(Math.cos(aa) * o.rr * d), Math.round(Math.sin(aa) * o.rr * d), s, s); }
        g.restore();
        g.globalAlpha = o.inner * 0.95; g.strokeStyle = c.E.c1; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, o.rr, 0, this.TAU); g.stroke();   // 보라 테두리
        g.globalAlpha = o.inner * 0.6; g.strokeStyle = c.E.c2; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, o.rr + 2, -0.6 + t / 300, 1.6 + t / 300); g.stroke();
    }

    cosmosRadius(o, t) {
        const grow = Math.min(1, t / 120);
        if (o.mode === 'burst') return o.R * (0.35 + 0.65 * (1 - (1 - grow) * (1 - grow))) * (1 + Math.max(0, t - 160) / 900);
        return o.R * (1 - (1 - grow) * (1 - grow)) * Math.max(0, Math.min(1, (o.life - t) / 140));
    }

    /** 차원찢기의 우주 구체: 검은 구 안에 성운 네 덩이가 천천히 돌고 별이 반짝인다. close는 커졌다 오그라들며 닫히고, open은 열렸다 닫히고,
     * burst는 크게 부풀며 테두리가 흩어지고 별이 바깥으로 튄다. @param {{at:object, R:number, delay:number, life:number, mode:string}} o */
    spellCosmos(o) {
        const closureView = this;
        const r = this.S.random(4242 + Math.round(o.R)), c = { E: this.S.ink('chaos'),
            stars: [...Array(46)].map(() => [r() * this.TAU, Math.sqrt(r()), r() < 0.3 ? 2 : 1, r() * this.TAU]), neb: this.NEBULA.map(col => [r() * this.TAU, 0.25 + r() * 0.45, 0.35 + r() * 0.3, col]) };
        this.S.hang({ ...o.at, dy: -46 }, { life: o.life, delay: o.delay, top(g, t) {
            const rr = closureView.cosmosRadius(o, t), inner = o.mode === 'burst' ? Math.max(0, 1 - Math.max(0, t - 140) / 260) : 1;
            if (rr < 1) return;
            g.globalAlpha = 0.35 * inner; g.fillStyle = c.E.c2; g.beginPath(); g.arc(0, 0, rr + 4, 0, closureView.TAU); g.fill();   // 빛무리
            if (inner > 0.02) closureView.cosmosInside(g, c, t, { rr, inner });
            if (o.mode === 'burst' && t > 140) {
                const k = Math.min(1, (t - 140) / (o.life - 140));
                for (const [a, d, s] of c.stars) { const dd = rr * (0.6 + d * 0.9) * (1 + k * 1.2); g.globalAlpha = 1 - k; g.fillStyle = s > 1 ? '#fff6ff' : c.E.c1; g.fillRect(Math.round(Math.cos(a) * dd), Math.round(Math.sin(a) * dd * 0.6), s, s); }
            }
            g.globalAlpha = 1;
        } });
    }
}

export function createStageCelestialSpells(deps) {
    const instance = new StageCelestialSpells(deps);
    return Object.freeze({ guillotine: instance.spellGuillotine.bind(instance), fallSpear: instance.spellFallSpear.bind(instance), volleyUp: instance.spellVolleyUp.bind(instance), arrowRain: instance.spellArrowRain.bind(instance), cosmos: instance.spellCosmos.bind(instance) });
}
