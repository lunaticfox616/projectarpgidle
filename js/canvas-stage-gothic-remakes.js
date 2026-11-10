/** 스킬이펙트 리메이크 V3.14.2~V3.14.4(2026-11-10 전달본): 향로 다섯 스킬의 고딕 금빛 그림. 89 거둬 가는 종(고딕 종), 90 탐욕 파문(고딕 샹들리에와 그 조각),
 * 91 판결-유죄(저울 문양 판결봉과 유죄의 낙뢰), 51 파문심판(가는 금빛 낙뢰와 바닥 십자), 50 신성한 안개(금색 향로와 향연).
 * 시뮬레이터 cathedral-remake.js, verdict-remake.js, gothic-holy-mist.js의 그림과 시간을 옮겼다. 길이는 도트 그대로(시뮬레이터의 화소 = 게임의 도트)다.
 * 그림은 assets/stage-vfx/gothic의 작은 PNG 여섯 장(이진 알파, 제한 팔레트)이고, 자세(종 7, 판결봉 12, 향로 7)와 고리 모양은 그림이 온 뒤 한 번 만들어 둔다.
 * 그림이 아직 오지 않았거나 받지 못하면 ready()가 거짓이라 부르는 쪽(js/canvas-stage-runes-v313-b.js, js/canvas-stage-rune-remakes.js)이 예전 그림을 쓴다.
 * 전투 계산에는 닿지 않는다: 사건에 적힌 시간(울림, 떨어짐, 내리찍기, 낙뢰)을 읽기만 한다.
 */
const stageGothicRemakes = (() => {
    const K = stageSkillKit, TAU = Math.PI * 2, WIDE = K.WIDE, DEEP = K.DEEP;
    const clamp = v => Math.max(0, Math.min(1, v)), snap = v => Math.round(v / 2) * 2;
    const NAMES = Object.freeze(['bell', 'chandelier', 'bolt', 'gavel', 'censer', 'incense']);
    const pictures = {};
    let built = null;
    /** 그림 여섯 장을 연다(처음 부를 때 한 번). */
    function openGothicPictures() {
        if (pictures.bell) return;
        for (const name of NAMES) pictures[name] = stagePictures.openPicture(`assets/stage-vfx/gothic/${name}.png`);
    }
    const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    /** 납작한 고리 모양(바깥 테, 중간, 안쪽 빛 세 색). */
    function ringMask(colours) {
        const c = canvas(128, 64), g = c.getContext('2d');
        for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
            const d = Math.hypot((x - 63.5) / 62, (y - 31.5) / 30);
            if (d > 1 || d < 0.89) continue;
            g.fillStyle = colours[d > 0.975 ? 0 : d > 0.94 ? 1 : 2];
            g.fillRect(x, y, 1, 1);
        }
        return c;
    }
    function shadowMask() {
        const c = canvas(64, 24), g = c.getContext('2d');
        g.fillStyle = '#15111c';
        for (let y = 0; y < 24; y++) { const w = Math.floor(30 * Math.sqrt(Math.max(0, 1 - ((y - 11.5) / 11.5) ** 2))); g.fillRect(32 - w, y, w * 2, 1); }
        return c;
    }
    /** 그림 한 장을 기울인 자세 하나. frame: { size: 캔버스 [w, h], pivot: 축 자리, at: 축에서 그릴 자리, w, h: 그릴 크기 }. */
    function tilted(image, frame, angle) {
        const c = canvas(frame.size[0], frame.size[1]), g = c.getContext('2d');
        g.imageSmoothingEnabled = false; g.translate(frame.pivot[0], frame.pivot[1]); g.rotate(angle * Math.PI / 180);
        g.drawImage(image, frame.at[0], frame.at[1], frame.w || image.width, frame.h || image.height);
        return c;
    }
    function buildGothicSprites() {
        const src = name => pictures[name].source, chandelier = src('chandelier');
        built = {
            gold: ringMask(['#4c392b', '#d2aa65', '#f2d69c']), fire: ringMask(['#613a2c', '#cb743b', '#edb45c']), ivory: ringMask(['#554636', '#c5a06b', '#ead8a4']),
            shadow: shadowMask(),
            bell: [-12, -8, -4, 0, 4, 8, 12].map(a => tilted(src('bell'), { size: [112, 96], pivot: [56, 10], at: [-32, -4], w: 64, h: 72 }, a)),
            // 부서진 샹들리에의 여섯 조각: 그림 그대로를 겹치지 않게 자른 것.
            pieces: [[0, 20, 32, 30], [32, 0, 32, 38], [64, 20, 32, 30], [0, 50, 32, 30], [32, 38, 32, 42], [64, 50, 32, 30]].map(r => {
                const c = canvas(r[2], r[3]);
                c.getContext('2d').drawImage(chandelier, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
                return { image: c, rect: r };
            }),
            censer: [-60, -40, -20, 0, 20, 40, 60].map(a => tilted(src('censer'), { size: [64, 64], pivot: [32, 32], at: [-16, -22], w: 32, h: 40 }, a)),
            gavels: new Map()
        };
    }
    /** 그림이 다 왔는가(처음 부르면 열기 시작한다). */
    function gothicReady() {
        openGothicPictures();
        if (built) return true;
        if (!NAMES.every(name => pictures[name].ready)) return false;
        buildGothicSprites();
        return true;
    }
    const image = name => pictures[name].source;

    // ---------------------------------------------------------------- 붓
    /** 원점 가운데의 납작한 고리나 그림자(a, b: 가로, 세로 반지름). */
    function oval(ctx, mask, a, b, alpha) {
        if (a < 2 || b < 1 || alpha <= 0) return;
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= alpha;
        ctx.drawImage(mask, snap(-a), snap(-b), Math.max(2, snap(a * 2)), Math.max(2, snap(b * 2)));
        ctx.restore();
    }
    /** from [x, y]에서 move [dx, dy]만큼 늘어선 점 여섯. */
    function streak(ctx, from, move, colour, alpha) {
        ctx.globalAlpha = alpha; ctx.fillStyle = colour;
        for (let j = 0; j < 6; j++) { const q = j / 5; ctx.fillRect(snap(from[0] + move[0] * q), snap(from[1] + move[1] * q), 2, 2); }
    }
    function pixelLine(ctx, [x0, y0], [x1, y1], colour, thick = 2) {
        ctx.fillStyle = colour;
        const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2);
        for (let i = 0; i <= n; i++) { const u = n ? i / n : 0; ctx.fillRect(snap(x0 + (x1 - x0) * u), snap(y0 + (y1 - y0) * u), thick, thick); }
    }
    /** (x, 0) 가운데의 점 고리(a, b: 가로, 세로 반지름). */
    function dotRing(ctx, x, a, b, alpha) {
        if (alpha <= 0) return;
        ctx.globalAlpha = alpha; ctx.fillStyle = '#d4b784';
        for (let j = 0; j < 48; j++) { const q = j / 48 * TAU; ctx.fillRect(snap(x + Math.cos(q) * a), snap(Math.sin(q) * b), 4, 2); }
    }
    /** 붓(도트 배율)의 원점에서 캔버스 위 끝까지(도트, 음수). */
    function screenTop(ctx) { const m = ctx.getTransform(); return -m.f / m.d; }

    // ---------------------------------------------------------------- 89 거둬 가는 종
    /** plan: js/canvas-stage-runes-v313-b.js bellPlan({ A, B, tolls, T1, drop, wave }). */
    function bellGround(ctx, t, plan) {
        const entrance = clamp(t / plan.drop), out = 1 - clamp((t - plan.T1 - plan.wave - 80) / 300);
        oval(ctx, built.shadow, 42, 13, 0.6 * entrance * out);
        for (const tt of plan.tolls) {
            const u = (t - tt) / plan.wave;
            if (u < 0 || u > 1.25) continue;
            // 앞 고리는 피해가 퍼지는 거리와 같은 비율로 커진다.
            oval(ctx, built.gold, plan.A * Math.min(1, u), plan.B * Math.min(1, u), 0.86 * (1 - clamp((u - 0.8) / 0.45)));
            const tail = u - 0.15;
            if (tail > 0 && tail < 1) oval(ctx, built.gold, plan.A * tail, plan.B * tail, 0.27 * (1 - tail));
        }
    }
    function bellSwing(t, plan) {
        let swing = 0;
        plan.tolls.forEach((tt, i) => {
            const age = t - tt;
            if (age >= -100 && age < 470) swing += (i ? -1 : 1) * Math.sin((age + 100) / 570 * TAU) * 11 * (1 - clamp(Math.max(0, age) / 600));
        });
        return swing;
    }
    /** 줄에 매달려 내려와 울릴 때마다 흔들리는 종과 입 옆의 소리 결(화면 전체 빛은 없다). */
    function bellSky(ctx, t, plan) {
        const entrance = clamp(t / plan.drop), out = 1 - clamp((t - plan.T1 - plan.wave - 80) / 300);
        if (out <= 0) return;
        const sky = screenTop(ctx), pivot = Math.max(sky + 12, -230) - (1 - entrance) ** 2 * 38;
        const pose = built.bell[Math.max(0, Math.min(6, Math.round(bellSwing(t, plan) / 4) + 3))];
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = entrance * out;
        const rope = Math.max(0, snap(pivot + 5 - sky));
        ctx.fillStyle = '#3d3029'; ctx.fillRect(-2, Math.floor(sky), 4, rope);
        ctx.fillStyle = '#bd955d'; ctx.fillRect(0, Math.floor(sky), 2, rope);
        ctx.drawImage(pose, -112, snap(pivot - 20), 224, 192);
        for (const tt of plan.tolls) {
            const u = (t - tt) / 340;
            if (u < 0 || u > 1) continue;
            ctx.globalAlpha = 0.75 * (1 - u) * out; ctx.fillStyle = '#dfbf82';
            for (const side of [-1, 1]) for (let j = -5; j <= 5; j++) {
                const a = j * 0.11, rx = 62 + u * 32;
                ctx.fillRect(snap(side * Math.cos(a) * rx), snap(pivot + 105 + Math.sin(a) * rx * 0.65), 2, 4);
            }
        }
        ctx.restore();
    }

    // ---------------------------------------------------------------- 90 탐욕 파문
    /** plan: chandPlan({ A, B, T0 매달림, T1 부딪힘, fall, face, fireLag }). */
    function chandGround(ctx, t, plan) {
        const age = t - plan.T1, fall = clamp((t - plan.T0) / plan.fall);
        if (age < 0) { oval(ctx, built.shadow, 30 + fall * 37, 10 + fall * 12, 0.3 + fall * 0.35); return; }
        oval(ctx, built.shadow, 72, 25, 0.6 * (1 - clamp(age / 1000)));
        const u = age / 350;
        if (u < 1.2) oval(ctx, built.gold, plan.A * Math.min(1, u), plan.B * Math.min(1, u), 0.84 * (1 - clamp((u - 0.55) / 0.65)));
        const v = (age - plan.fireLag) / 440;
        if (v > 0 && v < 1.15) oval(ctx, built.fire, plan.A * Math.min(1, v), plan.B * Math.min(1, v), 0.6 * (1 - clamp((v - 0.5) / 0.65)));
    }
    /** 매달림 → 가속하며 떨어짐 → 샹들리에 제 조각 여섯이 짧은 포물선으로 흩어져 내려앉는다. */
    function chandSky(ctx, t, plan) {
        const age = t - plan.T1, fall = clamp((t - plan.T0) / plan.fall), sky = screenTop(ctx);
        ctx.save(); ctx.imageSmoothingEnabled = false;
        if (age < 0) {
            const top = sky - 34 + (-154 - (sky - 34)) * fall * fall, sway = fall ? plan.face * 4 * fall : Math.sin(t / 120) * 4;
            ctx.globalAlpha = clamp(t / 55);
            if (t < plan.T0) { ctx.fillStyle = '#4b3829'; ctx.fillRect(-2, Math.floor(sky), 4, Math.max(0, snap(top + 18 - sky))); }
            ctx.drawImage(image('chandelier'), snap(-96 + sway), snap(top), 192, 160);
            if (fall > 0.2) for (let i = -1; i <= 1; i++) streak(ctx, [i * 48, top + 18], [0, -20 * fall], '#a68857', 0.32 * fall);
        } else {
            const u = clamp(age / 360), fade = 1 - clamp((age - 400) / 400);
            built.pieces.forEach(({ image: piece, rect: r }, i) => {
                const side = (i % 3) - 1, depth = i < 3 ? -1 : 1;
                const dx = side * (30 + Math.abs(side) * 38) * u, dy = depth * plan.B * 0.34 * u - Math.sin(u * Math.PI) * (26 + (i % 2) * 17);
                const x = -96 + r[0] * 2 + dx, y = -154 + r[1] * 2 + dy + u * (144 - r[1] * 2 - r[3] * 0.6);
                ctx.globalAlpha = fade;
                ctx.drawImage(piece, snap(x), snap(y), r[2] * 2, Math.max(2, snap(r[3] * 2 * (1 - 0.7 * u))));
            });
            if (age < 300) for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4, u2 = age / 300;
                streak(ctx, [Math.cos(a) * 18, -8 + Math.sin(a) * 6], [Math.cos(a) * (22 + u2 * 52), Math.sin(a) * (10 + u2 * 22) - 12 * (1 - u2)], '#d4b776', 0.65 * (1 - u2));
            }
        }
        ctx.restore();
    }

    // ---------------------------------------------------------------- 91 판결-유죄
    const GAVEL_ANGLES = Object.freeze([-100, -94, -90, -82, -70, -55, -38, -22, -10, -3, 0, 3]);
    /** 판결봉 길이(도트)에 맞춘 자세 열둘: 크기마다 한 묶음, 둘까지 둔다. */
    function gavelPoses(L) {
        const len = Math.max(50, Math.min(220, Math.round(L / 2)));
        if (built.gavels.has(len)) return built.gavels.get(len);
        const factor = (len - 15) / 74, w = Math.ceil(96 * factor), px = Math.ceil(w * 0.25) + 12, py = w + 18, W = px + w + 12, H = py + Math.ceil(24 * factor) + 12;
        const list = GAVEL_ANGLES.map(a => tilted(image('gavel'), { size: [W, H], pivot: [px, py], at: [Math.round(-4 * factor), Math.round(-24 * factor)], w, h: Math.round(48 * factor) }, a));
        const set = { list, px, py, w: W, h: H, factor };
        if (built.gavels.size >= 2) built.gavels.delete(built.gavels.keys().next().value);
        built.gavels.set(len, set);
        return set;
    }
    function nearestAngle(a) {
        let n = 0, d = 1e9;
        GAVEL_ANGLES.forEach((angle, i) => { if (Math.abs(angle - a) < d) { n = i; d = Math.abs(angle - a); } });
        return n;
    }
    /** 서서 살짝 뒤로 → 빨라지며 앞으로 넘어짐 → 닿고 살짝 튐(도). */
    function gavelDegrees(t, plan) {
        if (t < plan.T0) return -90 - 10 * clamp(t / plan.T0);
        if (t < plan.T1) return -100 * (1 - clamp((t - plan.T0) / plan.swing) ** 2);
        return 3 * Math.sin(clamp((t - plan.T1) / 110) * Math.PI);
    }
    function gavelBody(ctx, t, alpha, plan) {
        const set = gavelPoses(plan.L);
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(snap(plan.px), snap(-44 * set.factor)); ctx.scale(plan.f, 1); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(set.list[nearestAngle(gavelDegrees(t, plan))], -set.px * 2, -set.py * 2, set.w * 2, set.h * 2);
        ctx.restore();
    }
    const gavelHead = plan => plan.px + plan.f * (plan.L - 30);
    /** 땅: 판정 상자의 네 모서리(효과 확장 깊이까지), 닿으면 칸마다 짧은 바닥 균열과 머리 자리의 고리. */
    function gavelGround(ctx, t, plan, cells) {
        const age = t - plan.T1, xa = plan.f * 0.5 * WIDE, xb = plan.f * 3.5 * WIDE, left = Math.min(xa, xb), right = Math.max(xa, xb);
        const top = -plan.depth * DEEP, bottom = plan.depth * DEEP;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = age < 0 ? 0.2 * clamp(t / 100) : 0.6 * (1 - clamp(age / 480));
        for (const x of [left, right]) for (const y of [top, bottom]) {
            const dx = x === left ? 1 : -1, dy = y === top ? 1 : -1;
            pixelLine(ctx, [x, y], [x + dx * 16, y], '#bf9c66');
            pixelLine(ctx, [x, y], [x, y + dy * 9], '#bf9c66');
        }
        if (age >= 0) {
            ctx.globalAlpha = 0.62 * (1 - clamp((age - 90) / 380));
            cells.forEach(([x, y], i) => {
                const side = i % 2 ? 1 : -1;
                pixelLine(ctx, [x - 10, y + 4], [x, y], '#65503d', 4);
                pixelLine(ctx, [x, y], [x + side * 14, y - 4], '#c9ad7b', 2);
                pixelLine(ctx, [x + side * 14, y - 4], [x + side * 22, y - 2], '#a58457', 2);
            });
            const u = clamp(age / 280);
            dotRing(ctx, gavelHead(plan), 18 + u * 55, 7 + u * 23, 0.72 * (1 - u));
        }
        ctx.restore();
    }
    /** 위: 판결봉(내리찍는 동안 옅은 잔상 하나)과 닿을 때 흩어지는 금빛 조각 열둘. */
    function gavelSky(ctx, t, plan) {
        const age = t - plan.T1, fade = 1 - clamp((age - 160) / 260), entrance = clamp(t / 70);
        if (t > plan.T0 && t < plan.T1) gavelBody(ctx, t - 30, 0.15 * entrance, plan);
        if (fade > 0) gavelBody(ctx, t, entrance * fade, plan);
        if (age < 0 || age >= 350) return;
        const u = age / 350, head = gavelHead(plan);
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU, rad = 15 + u * (30 + (i % 3) * 9);
            ctx.globalAlpha = 0.75 * (1 - u); ctx.fillStyle = i % 3 === 0 ? '#e8d2a1' : '#a48659';
            ctx.fillRect(snap(head + Math.cos(a) * rad), snap(Math.sin(a) * rad * 0.4 - Math.sin(u * Math.PI) * (16 + (i % 2) * 9)), i % 2 ? 2 : 4, 2);
        }
        ctx.globalAlpha = 1;
    }
    /** 유죄의 낙뢰: 내려오는 줄기가 발에 닿는 때가 피해의 때(만든 뒤 0.05초)이고, 그 뒤 위쪽부터 걷힌다. 발밑에 작은 고리와 불티. */
    function verdictBolt(cell) {
        const impact = 50;
        stageSkillStrokes.hang(K.at(cell), { life: 340,
            ground: (ctx, age) => { if (age >= impact) { const u = clamp((age - impact) / 240); dotRing(ctx, 0, 10 + u * 20, 4 + u * 8, 0.65 * (1 - u)); } },
            top: (ctx, age) => {
                const fade = 1 - clamp((age - 110) / 220), reveal = Math.floor(128 * clamp(age / impact)), crop = Math.floor(96 * clamp((age - 160) / 170)), h = reveal - crop;
                ctx.save(); ctx.imageSmoothingEnabled = false;
                if (h > 0) { ctx.globalAlpha = 0.95 * fade; ctx.drawImage(image('bolt'), 0, crop, 40, h, -28, snap(-256 + crop * 2), 56, h * 2); }
                if (age >= impact && age < impact + 150) {
                    const u = (age - impact) / 150;
                    ctx.globalAlpha = 0.8 * (1 - u);
                    for (const side of [-1, 1]) pixelLine(ctx, [side * 5, -7], [side * (12 + u * 20), -12 - u * 12], '#dfc797', 2);
                }
                ctx.restore();
            } });
    }

    // ---------------------------------------------------------------- 51 파문심판
    /** 칸 하나의 가는 금빛 낙뢰(at: 그 칸의 발 자리): 닿는 때는 그 칸의 피해와 같고, 그 뒤 위쪽부터 사라져 접촉부만 남는다. wide: 첫 칸은 조금 굵다. */
    function judgmentBolt(at, delay, wide) {
        stageSkillVfx.paint(at, { life: 260, delay, layer: 'top' }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const fade = 1 - clamp((t - 65) / 195), crop = Math.floor(clamp((t - 85) / 175) * 105), h = 128 - crop, width = wide ? 64 : 48;
            ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = (wide ? 1 : 0.92) * fade;
            ctx.drawImage(image('bolt'), 0, crop, 40, h, snap(-width / 2), snap(-256 + crop * 2), width, h * 2);
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2, travel = clamp(t / 180);
                streak(ctx, [Math.cos(a) * 7, Math.sin(a) * 4], [Math.cos(a) * (12 + 22 * travel), Math.sin(a) * (7 + 10 * travel)], '#c9ad75', 0.6 * fade);
            }
            ctx.restore();
        });
    }
    /** 닿은 자리(at)의 상아색 납작한 고리(예전의 밝은 고리와 충격 대신). */
    function judgmentRing(at, delay, life) {
        stageSkillVfx.paint(at, { life, delay, layer: 'ground' }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const u = clamp(t / life);
            oval(ctx, built.ivory, 14 + u * 30, 6 + u * 12, 0.7 * (1 - u));
        });
    }
    /** 십자의 가로, 세로 칸을 잇는 금빛 바닥 선(0.44초에 옅어진다). centre: 십자 가운데 칸, cells: 십자 칸들. */
    function judgmentCross(centre, cells) {
        const xs = cells.map(cell => (cell.gx - centre.gx) * WIDE), ys = cells.map(cell => (cell.gy - centre.gy) * DEEP);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        stageSkillVfx.paint(K.at(centre), { life: 440, layer: 'ground' }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            ctx.globalAlpha = 0.48 * (1 - clamp((t - 160) / 280));
            ctx.fillStyle = '#ba935e'; ctx.fillRect(snap(x0), -2, snap(x1 - x0), 4); ctx.fillRect(-2, snap(y0), 4, snap(y1 - y0));
            ctx.fillStyle = '#e5cd98'; ctx.fillRect(snap(x0), 0, snap(x1 - x0), 2); ctx.fillRect(0, snap(y0), 2, snap(y1 - y0));
        });
    }

    // ---------------------------------------------------------------- 50 신성한 안개
    /** 향로를 쥔 손 대신 쓰는 축(발에서 도트): 사슬이 그 축에서 향로 머리로 늘어진 기울기로 향로를 기울인다. */
    const MIST_PIVOT = Object.freeze([0, -60]);
    function censerTilt(head) {
        const a = -Math.atan2(head.x - MIST_PIVOT[0], head.y - MIST_PIVOT[1]) * 180 / Math.PI;
        return Math.max(0, Math.min(6, Math.round((Math.max(-60, Math.min(60, a)) + 60) / 20)));
    }
    /** 동작이 그리는 향로 머리 자리에 금색 고딕 향로를 겹친다(두 번째 향로를 따로 돌리지 않는다). head(): 지금 장의 머리(발에서 도트) 또는 null.
     * 시뮬레이터처럼 뒤쪽 장에서도 몸 위에 그린다(몸 뒤에 두면 동작 그림의 은빛 향로가 보인다). */
    function dressCenser(head, life) {
        stageSkillVfx.paint(K.at(K.heroDrawn()), { life, layer: 'top', follow: K.heroDrawn }, (ctx, t, dot) => {
            const h = head();
            if (!h) return;
            ctx.scale(dot, dot); ctx.imageSmoothingEnabled = false;
            ctx.drawImage(built.censer[censerTilt(h)], Math.round(h.x - 32), Math.round(h.y - 32));
        });
    }
    /** 향연 한 줄기: 향로 머리에서 나와 바깥쪽으로 조금 흐르며 떠올라 한 번 커졌다 사라진다(0.65초). pocket(): 얼굴, 가슴과 향로 머리의 빈칸(도트, 이 자리 기준). */
    function incensePuff(spot, head, pocket) {
        const length = Math.max(20, Math.hypot(head.x, head.y + 34)), vx = head.x / length, vy = (head.y + 34) / length, face = head.x >= 0 ? 1 : -1;
        stageSkillVfx.paint(K.at(spot, head.x, head.y - 7), { life: 650, layer: head.rear ? 'ground' : 'top' }, (ctx, age, dot) => {
            const u = clamp(age / 650), alpha = 0.46 * Math.min(1, age / 80) * (1 - clamp((age - 270) / 380));
            if (alpha <= 0) return;
            ctx.scale(dot, dot);
            const w = Math.round(52 + u * 24), h = Math.round(w * 0.8), holes = head.rear ? null : pocket(head.x, head.y - 7);
            if (holes) { ctx.beginPath(); ctx.rect(-4096, -4096, 8192, 8192); holes.forEach(r => ctx.rect(...r)); ctx.clip('evenodd'); }
            ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
            ctx.translate(Math.round(vx * age * 0.057), Math.round(-11 - age * 0.025 + vy * age * 0.008)); ctx.scale(face, 1);
            ctx.drawImage(image('incense'), -Math.round(w / 2), -Math.round(h / 2), w, h);
        });
    }
    /** 둘레에 낮게 퍼지는 향연 여섯(앞쪽 셋은 몸 앞, 뒤쪽 셋은 몸 뒤, 0.79초). radius: 둘레 칸. */
    function incenseField(spot, radius) {
        const rx = (radius + 0.5) * WIDE * 0.7, ry = (radius + 0.5) * DEEP * 0.65;
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3, front = Math.sin(a) >= 0;
            stageSkillVfx.paint(K.at(spot), { life: 790, layer: front ? 'top' : 'ground' }, (ctx, age, dot) => {
                const fade = clamp(age / 140) * (1 - clamp((age - 430) / 360)), grow = 0.65 + 0.35 * clamp(age / 280);
                if (fade <= 0) return;
                ctx.scale(dot, dot); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.25 * fade;
                ctx.translate(Math.round(Math.cos(a) * rx * grow), Math.round(-24 + Math.sin(a) * ry * grow - age * 0.007)); ctx.scale(i % 2 ? 1 : -1, 1);
                ctx.drawImage(image('incense'), -36, -28, 72, 56);
            });
        }
    }

    return Object.freeze({ ready: gothicReady, bellGround, bellSky, chandGround, chandSky, gavelGround, gavelSky, verdictBolt, judgmentBolt, judgmentRing, judgmentCross,
        dressCenser, incensePuff, incenseField });
})();
safeExposeGlobals({ stageGothicRemakes });
