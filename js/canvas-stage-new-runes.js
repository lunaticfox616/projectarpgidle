/** 새 룬 셋의 무대 연출 (2026-11-01 사용자가 준 "스킬 전체 디렉터 전달" V3.6의 78 추적 사격, 79 석화 혼합물, 80 시간의 사선. 넷째 81 정화의 집행은 2026-11-08 V3.13이 지웠다).
 * 시뮬레이터(time-slash-homage.js, time-buff-vfx.js, censer-fire-detail.js, index.html의 censerWhirlFx, petrifyMob, stoneBits)의 그림과 시간을 게임의 사건에 옮겼다.
 * 칸의 크기만 시뮬레이터의 72×36에서 게임의 64×32로 옮기고 길이는 도트 그대로다. 원래 색을 지켜야 하는 띠(Fire Mage, Buff n Debuff, 사선 칼날)는 다시 칠하지 않고
 * assets/stage-vfx/vfx3.png에서 바로 그린다(STAGE_SKILL_VFX.raw). 그 그림이 없는 판에서는 띠만 빠지고 코드로 그리는 부분은 그대로 나온다.
 * 전투 계산에는 닿지 않는다: 사건과 적의 상태를 읽기만 한다. 판정은 js/skill-gem-casts.js 78, 79, 80과 js/combat.js가 맡는다.
 * 시뮬레이터와 다른 점: 시간의 사선의 잿빛은 화면 전체가 아니라 바닥과, 둔화된 적의 그림에 입힌다(주인공만 다시 그리는 길이 게임에는 없다).
 */
const stageNewRunes = (() => {
    const K = stageSkillKit, ST = stageSkillStrokes;
    const RAW_SHEET = 2;                          // STAGE_SKILL_VFX.files의 vfx3.png
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

    // ---------------------------------------------------------------- raw strips
    /** 그 칸이 든 그림과 자리: o.source(금빛으로 칠한 띠)가 있으면 그 그림에서, 아니면 vfx3.png에서. */
    function rawCell(row, frame, o) {
        return o.source ? { image: o.source, x: frame * row.w, y: 0 } : { image: stageSkillVfx.picture(RAW_SHEET), x: row.x + frame * row.w, y: row.y };
    }
    /** 띠의 한 칸을 붓의 원점에 그린다. 붓은 도트 단위다. o: x, y 자리, anchor [x, y] 칸 안의 기준점, scale, flat 눕히는 비율, rot, alpha, source 대신 쓸 그림. */
    function drawRaw(ctx, name, frame, o) {
        const row = STAGE_SKILL_VFX.raw[name], cell = row ? rawCell(row, frame, o) : null;
        if (!cell || !cell.image) return false;
        const look = { x: 0, y: 0, scale: 1, flat: 1, rot: 0, alpha: 1, anchor: [row.w / 2, row.h / 2], ...o };
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= look.alpha;
        ctx.translate(Math.round(look.x), Math.round(look.y));
        ctx.rotate(look.rot);
        ctx.drawImage(cell.image, cell.x, cell.y, row.w, row.h, Math.round(-look.anchor[0] * look.scale), Math.round(-look.anchor[1] * look.scale * look.flat), Math.round(row.w * look.scale), Math.round(row.h * look.scale * look.flat));
        ctx.restore();
        return true;
    }
    /** 띠의 원래 색 몇 가지만 정확히 바꾼 사본(시뮬레이터 time-buff-vfx.js goldCache, time-acceleration-vfx.js purpleCache): 알파와 자리는 그대로 두고
     * 원본 그림은 고치지 않는다. 띠 하나에 칠은 하나다(띠 이름으로 둔다). swaps: 'r,g,b' → [r, g, b]. 그림이 아직 없으면 null. */
    const tinted = new Map();
    function tintRaw(name, swaps) {
        if (tinted.has(name)) return tinted.get(name);
        const image = stageSkillVfx.picture(RAW_SHEET), row = STAGE_SKILL_VFX.raw[name];
        if (!image || !row) return null;
        const canvas = document.createElement('canvas');
        canvas.width = row.w * row.n; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, row.x, row.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
            const colour = pixels.data[i + 3] ? swaps.get(`${pixels.data[i]},${pixels.data[i + 1]},${pixels.data[i + 2]}`) : null;
            if (colour) pixels.data.set(colour, i);
        }
        ctx.putImageData(pixels, 0, 0);
        tinted.set(name, canvas);
        return canvas;
    }
    /** 발밑 시계의 금빛: 원본의 다섯 색. */
    const GOLD = new Map([['32,58,158', [107, 74, 36]], ['34,101,188', [162, 115, 55]], ['0,183,255', [209, 166, 78]], ['0,255,249', [239, 202, 118]], ['255,249,252', [255, 240, 186]]]);
    const goldFloor = () => tintRaw('clock', GOLD);

    // ---------------------------------------------------------------- 78 추적 사격
    /** 길에서 지금 자리와 방향. 아직 떠나지 않았거나 다 날았으면 null. */
    function homingAt(path, now) {
        if (now < path[0].at || now > path[path.length - 1].at + 40) return null;
        let i = path.length - 1;
        while (i > 0 && path[i].at > now) i--;
        const a = path[i], b = path[Math.min(i + 1, path.length - 1)], u = b.at > a.at ? clamp((now - a.at) / (b.at - a.at), 0, 1) : 0;
        return { gx: a.gx + (b.gx - a.gx) * u, gy: a.gy + (b.gy - a.gy) * u, angle: b.angle };
    }
    /** 아무도 못 맞히고 사거리가 다한 화살: 그 끝에 작은 먼지(시뮬레이터 vfx-polish.js pol_miss_phys). */
    function homingFizzle(c, path) {
        if (!c.event.homingMissed || c.event.homingFizzled || c.view.now < path[path.length - 1].at) return;
        c.event.homingFizzled = true;
        stageSkillVfx.play('pol_miss_phys@smoke', K.at(path[path.length - 1], 0, K.HAND), { alpha: 0.38 });
    }
    /** 활의 섬광을 쏘는 순간에 틀고, 화살 클립이 길을 따라 나아가는 쪽을 보며 손 높이로 난다. */
    function homingFly(c) {
        const path = c.event.homingPath, spot = homingAt(path, c.view.now);
        if (c.first) stageSkillVfx.play(stageSkillRunes.bowFlash(c.gem, c.element), K.at(c.event.sourceCell, c.look.face * 30, -54), c.look);
        if (!spot) { homingFizzle(c, path); return true; }
        const at = K.screen(c.view.projection, spot), bow = c.gem.map.bow;
        stageSkillVfx.stamp(c.view.ctx, bow.arrow, c.view.now - path[0].at, { x: at.x, y: at.y + K.HAND * at.dot, dot: at.dot, face: 1, rot: spot.angle, ramp: c.look.ramp });
        return true;
    }

    // ---------------------------------------------------------------- 79 석화 혼합물
    const STONE_INK = Object.freeze(['#4a4038', '#776a5c', '#a69886', '#d2c7b6']);
    /** 돌 조각: 몸에서 튀어 포물선으로 떨어진다. */
    function stoneBits(spot, count, height, delay = 0) {
        const r = ST.random(Math.round(spot.gx * 97 + spot.gy * 31 + stageSkillVfx.now())), bits = Array.from({ length: count }, (_, i) => ({
            vx: (r() - 0.5) * 160, vy: -(60 + r() * 120), y0: -10 - r() * height, colour: STONE_INK[i % 4], size: 2 + (i % 3) }));
        stageSkillVfx.paint(K.at(spot), { life: 520, delay }, (ctx, t, dot) => {
            const s = t / 1000;
            ctx.scale(dot, dot);
            ctx.globalAlpha = 1 - Math.max(0, (t - 380) / 140);
            for (const bit of bits) { ctx.fillStyle = bit.colour; ctx.fillRect(Math.round(bit.vx * s), Math.round(Math.min(0, bit.y0 + bit.vy * s + 420 * s * s)), bit.size, bit.size); }
            ctx.globalAlpha = 1;
        });
    }
    /** 떨어진 자리: 돌 물결, 솟는 돌, 양옆 먼지, 돌 조각. */
    function petrifyBurst(c) {
        if (!c.first) return true;
        const map = c.gem.map, spot = c.event.landingCell, face = c.look.face;
        stageSkillVfx.play(map.area, K.at(spot, 0, 1), { face, ramp: c.look.ramp });
        stageSkillVfx.play(map.burst, K.at(spot, 0, 1), { face, ramp: c.look.ramp, scale: 1.1 });
        [[-26, -face, 40], [26, face, 80]].forEach(([dx, side, delay]) => stageSkillVfx.play(map.dust, K.at(spot, dx, 2), { face: side, alpha: 0.8, scale: 1.2, delay }));
        stoneBits(spot, 10, 40);
        stoneWatchOn(map);
        return true;
    }
    const stoneOf = enemy => (Array.isArray(enemy.ailments) ? enemy.ailments.find(ail => ail && ail.petrified && ail.time > 0) : null) || null;
    /** 굳은 적의 금: 시간이 갈수록 네 줄까지 는다(시뮬레이터 drawPetrified). 그림 안쪽 가운데에 그려 몸을 벗어나지 않게 한다. */
    function stoneCracks(enemy, seed) {
        const follow = () => (K.enemy(enemy.id) === enemy && enemy.hp > 0 ? K.enemySpot(enemy) : null);
        const spot = K.enemySpot(enemy), size = stageRoster.bodySize(enemy, 64), tall = size ? clamp(size.h / stageActors.scaleFor(64), 40, 200) : 90;
        return stageSkillVfx.paint(K.at(spot), { life: 60000, follow }, (ctx, t, dot) => {
            const count = Math.min(4, Math.floor(t / 1800 * 5));
            ctx.scale(dot, dot);
            ctx.fillStyle = '#2a2420';
            for (let i = 0; i < count; i++) {
                let x = ((seed * (i + 3)) % 20) - 10, y = -tall * (0.25 + ((seed * (i + 7)) % 50) / 100);
                for (let s = 0; s < 7; s++) { ctx.fillRect(x, y, 2, 2); x += ((seed + i * 31 + s * 17) % 3) - 1; y += 4 + ((seed + s * 13) % 3); }
            }
        });
    }
    const stones = new Map();                     // 적 → { row 금 그림, spot 마지막 자리 }
    let stoneWatching = false, stoneMap = null;
    function stoneBegin(enemy) {
        const seed = 7 + (Number(enemy.id) || 0) * 13 % 991;
        stones.set(enemy, { row: stoneCracks(enemy, seed), spot: K.enemySpot(enemy) });
        stoneBits(K.enemySpot(enemy), 6, 30);
    }
    /** 풀리면 돌 껍질이 부서진다(죽거나 방을 옮기면 금만 걷는다). */
    function stoneEnd(enemy, row, time) {
        if (row.row) row.row.life = time - row.row.start;
        stones.delete(enemy);
        if (!(enemy.hp > 0) || K.enemy(enemy.id) !== enemy) return;
        const spot = K.enemySpot(enemy);
        if (stoneMap && stoneMap.shatter) stageSkillVfx.play(stoneMap.shatter, K.at(spot, 0, 2), { face: K.heroFace(), scale: 0.6, alpha: 0.7 });
        stoneBits(spot, 10, 60);
    }
    /** 프레임마다 적의 석화를 살핀다: 막 굳은 적은 돌 조각과 금, 풀린 적은 부서짐. @returns {boolean} 더 볼지 */
    function stoneWatch(time) {
        for (const enemy of game.enemies || []) if (stoneOf(enemy) && !stones.has(enemy)) stoneBegin(enemy);
        for (const [enemy, row] of [...stones]) if (!stoneOf(enemy)) stoneEnd(enemy, row, time);
        stoneWatching = stones.size > 0 || time - stoneSince < 300;
        return stoneWatching;
    }
    let stoneSince = 0;
    function stoneWatchOn(map) {
        stoneMap = map;
        stoneSince = stageSkillVfx.now();
        if (!stoneWatching) { stoneWatching = true; stageSkillVfx.watch(stoneWatch); }
    }
    const STONE_GLAZE = Object.freeze({ color: '#706a76', alpha: 0.82 }), SLOW_GLAZE = Object.freeze({ color: '#858585', alpha: 0.32 });
    /** 그 적의 그림에 덮을 빛깔: 석화는 돌빛, 시간의 사선에 둔화되면 옅은 잿빛. 없으면 null. */
    function glazeOf(enemy) {
        if (stoneOf(enemy)) return STONE_GLAZE;
        return typeof enemyTimeSlowed === 'function' && enemyTimeSlowed(enemy) ? SLOW_GLAZE : null;
    }
    /** 굳은 적은 자세가 멈춘다: 그림을 고르는 시각을 굳은 때에 묶는다. 굳지 않았으면 null. */
    function heldAt(enemy) {
        const row = stoneOf(enemy);
        return row ? row.petrifiedAt : null;
    }

    // ---------------------------------------------------------------- 80 시간의 사선
    let latestField = null;                       // 시계는 가장 최근의 것 하나만 보인다
    let fieldUntil = -1e9;                        // 시간의 사선의 시계가 떠 있는 때까지(시간 가속의 시계는 그동안 가린다)
    const FIELD = Object.freeze({ headFrames: 22, headMs: 34, headScale: 1.35, headAlpha: 0.96, headLift: -118, floorFrames: 25, floorMs: 28, floorScale: 3.4, floorFlat: 0.5, floorAlpha: 0.66 });
    /** 찌르기가 나가는 때: 잿빛 바닥, 발밑 금빛 시계, 머리 위 모래시계. 시계는 찌르기가 끝나면 0.12초에 옅어지고, 새 시전이나 걸음이 오면 바로 사라진다. */
    function timeField(c) {
        if (!c.first) return true;
        const event = c.event, speed = Number(event.timeSpeed) || 1, spot = K.heroDrawn(), token = latestField = {};
        const clockEnd = event.timeActorEnd - event.at, fade = 120 / speed;
        fieldUntil = stageSkillVfx.now() + clockEnd + fade;
        shadeKeep(spot, event.timeSlowUntil - event.at, speed);
        const visible = (t) => (latestField === token && K.heroSpot().gx === event.sourceCell.gx && K.heroSpot().gy === event.sourceCell.gy ? clamp(t / (45 / speed), 0, 1) * clamp(1 - (t - clockEnd) / fade, 0, 1) : 0);
        const follow = () => K.heroDrawn();
        stageSkillVfx.paint(K.at(spot, 0, 1), { life: clockEnd + fade, layer: 'ground', follow }, (ctx, t, dot) => {
            const frame = Math.floor(t * speed / FIELD.floorMs), gold = goldFloor();
            if (frame >= FIELD.floorFrames || !gold) return;
            ctx.scale(dot, dot);
            drawRaw(ctx, 'clock', frame, { source: gold, anchor: [24, 24], scale: FIELD.floorScale, flat: FIELD.floorFlat, alpha: FIELD.floorAlpha * visible(t) });
        });
        stageSkillVfx.paint(K.at(spot, 0, FIELD.headLift), { life: clockEnd + fade, follow }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            drawRaw(ctx, 'hourglass', Math.min(FIELD.headFrames - 1, Math.floor(t * speed / FIELD.headMs)), { anchor: [24, 28], scale: FIELD.headScale, alpha: FIELD.headAlpha * visible(t) });
        });
        return true;
    }
    /** 잿빛 층은 언제나 하나다: 앞선 잿빛이 남아 있으면 끝나는 때만 늦춘다(겹치면 화면이 까맣게 된다). */
    let shade = null;
    function shadeKeep(spot, length, speed) {
        const now = stageSkillVfx.now();
        if (shade && now - shade.row.start < shade.row.life) {
            shade.end = now - shade.row.start + length;
            shade.speed = speed;
            shade.row.life = shade.end + 190 / speed;
            return;
        }
        const own = { end: length, speed, row: null };
        own.row = stageSkillVfx.paint(K.at(spot), { life: length + 190 / speed, layer: 'ground' }, (ctx, t) => timeShade(ctx, t, own));
        shade = own;
    }
    /** 잿빛: 들어올 때 0.07초, 나갈 때 0.19초/공격 속도. 바닥 층이라 몸들은 덮지 않는다. 채도를 먼저 빼고 조금 어둡게 덮는다(시뮬레이터 slowShade). */
    function timeShade(ctx, t, own) {
        const alpha = t < own.end ? clamp(t / 70, 0, 1) : clamp(1 - (t - own.end) * own.speed / 190, 0, 1);
        if (alpha <= 0) return;
        const canvas = ctx.canvas;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = '#858585';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(20,18,27,.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    /** 칼날 하나(o: x, y, angle, alpha, scale). 원본 칼날은 45도로 누워 있고 끝이 기준점 근처에 있다. 그림이 없으면 코드로 그린 금빛 칼. */
    function blade(ctx, o) {
        if (o.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha *= o.alpha;
        ctx.translate(Math.round(o.x), Math.round(o.y));
        ctx.rotate(o.angle - Math.PI / 4);
        if (!drawRaw(ctx, 'blade', 0, { anchor: [60, 60], scale: o.scale })) {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#35291d'; ctx.fillRect(-72, -3, 72, 6);
            ctx.fillStyle = '#ffe49b'; ctx.fillRect(-69, -1, 69, 2);
            ctx.fillStyle = '#c79543'; ctx.fillRect(-57, -7, 3, 14);
        }
        ctx.restore();
    }
    // V3.14.10(2026-11-12 전달본, 시뮬레이터 time-sword-remake.js): 고딕 금빛 장검이 차례로 날아가 찌른다. 첫 발과 다시 치는 발은 일곱, 새 대상은 하나.
    // 묶음마다 진입 각도가 22도, 시전마다 13도 돌고, 검마다 작은 각도와 닿는 자리가 흩어진다(난수가 아니라 시전, 발, 검 번호로 정한다). 잔상은 검마다 둘이다.
    // 장검 그림(js/canvas-stage-gothic-remakes.js)이 아직 없으면 예전 칼날(blade)로 그린다. 피해와 시간은 js/skill-gem-casts.js의 사건(timeFirst, timeArrive, timeStep, timeFly)이 정한다.
    const SWORDS = Object.freeze({ lift: -42, ring: [-2.35619449, -1.42, -0.55, 0.35, 1.25, 2.12, 2.94], radius: [86, 69], slots: [[-93, -54], [93, -54], [0, -93]],
        appear: 5, appearMs: 24, fade: 190, ghosts: [[32, 0.09], [16, 0.18]], trail: 20, easing: 1.8, volleyTurn: 22, castTurn: 13, jitterTurn: 16 });
    const G = () => stageGothicRemakes;
    const drawSword = (ctx, o) => (G().swordReady() ? G().timeSword(ctx, o) : blade(ctx, o));
    /** 시전, 발, 검, 갈래로 정해지는 0~1(시뮬레이터 noise). 프레임마다 흔들리지 않는다. */
    function swordNoise(cast, shot, sword, channel) {
        let n = (Math.imul(cast + 1, 73856093) ^ Math.imul(shot + 1, 19349663) ^ Math.imul(sword + 1, 83492791) ^ Math.imul(channel + 1, 0x9e3779b9)) >>> 0;
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }
    /** 검들이 서는 자리(대상 몸 가운데 기준, 도트)와 닿는 자리의 흩어짐(dx, dy). 일곱은 둘레에, 하나는 세 자리를 돌아가며. */
    function swordOrigins(event) {
        const many = event.timeSwords > 1, cast = Number(event.timeCast) || 1, shot = event.timeShot || 0;
        return Array.from({ length: event.timeSwords }, (_, i) => {
            const base = many ? [Math.cos(SWORDS.ring[i]) * SWORDS.radius[0], Math.sin(SWORDS.ring[i]) * SWORDS.radius[1]] : SWORDS.slots[(shot + 2) % 3];
            const turn = ((cast - 1) * SWORDS.castTurn + shot * SWORDS.volleyTurn + (swordNoise(cast, shot, i, 0) - 0.5) * SWORDS.jitterTurn) * Math.PI / 180;
            const a = Math.atan2(base[1], base[0]) + turn, r = Math.hypot(base[0], base[1]) * (0.92 + swordNoise(cast, shot, i, 1) * 0.18);
            return { x: Math.cos(a) * r, y: SWORDS.lift + Math.sin(a) * r, i,
                dx: Math.round((swordNoise(cast, shot, i, 2) - 0.5) * 14), dy: Math.round((swordNoise(cast, shot, i, 3) - 0.5) * 20) };
        });
    }
    /** 한 발의 검 묶음: 대상 몸 둘레에 서 있다가 0.024초 간격으로 차례로 날아가 박히고, 0.19초 동안 옅어진다. 피해는 판정 쪽이 마지막 검에 한 번 준다. */
    function timeBlades(c) {
        if (!c.first) return true;
        const event = c.event, speed = Number(event.timeSpeed) || 1, first = event.timeFirst - event.at, fly = Math.max(1, event.timeFly);
        const plan = { speed, first, fly, step: event.timeStep, appear: event.timeShot ? first - fly : 0, scale: event.timeSwords > 1 ? 1 : 0.88, extra: event.timeShot > 0,
            anchor: event.timeCell, enemy: K.enemy(event.timeFoe), origins: swordOrigins(event) };
        stageSkillVfx.paint(K.at(event.timeCell), { life: event.timeArrive - event.at + SWORDS.fade / speed + 20 }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const live = bladeTarget(plan);
            for (const origin of plan.origins) volleySword(ctx, t, plan, origin, live);
        });
        return true;
    }
    /** 맞는 자리: 대상이 움직이면 따라간다(쓰러진 뒤에는 마지막에 본 자리). */
    function bladeTarget(plan) {
        const alive = plan.enemy && K.enemy(plan.enemy.id) === plan.enemy && plan.enemy.hp > 0, spot = alive ? K.enemySpot(plan.enemy) : plan.anchor;
        if (alive) plan.seen = spot;
        const at = plan.seen || plan.anchor;
        return { x: (at.gx - plan.anchor.gx) * K.WIDE, y: (at.gy - plan.anchor.gy) * K.DEEP + SWORDS.lift };
    }
    /** 검 하나의 때: 나타남, 떠남, 닿음(도트 시간). */
    function swordTimes(t, plan, origin) {
        const launch = plan.first - plan.fly + origin.i * plan.step, arrival = plan.first + origin.i * plan.step;
        const shown = clamp((t - plan.appear - origin.i * SWORDS.appear / plan.speed) / (SWORDS.appearMs / plan.speed), 0, 1), age = (t - arrival) * plan.speed;
        const alpha = t < launch ? shown * 0.9 : t >= arrival ? 0.62 * Math.pow(1 - clamp(age / SWORDS.fade, 0, 1), 1.2) : shown;
        return { launch, arrival, age, alpha, flying: t >= launch && t < arrival, progress: (t - launch) / plan.fly };
    }
    function volleySword(ctx, t, plan, origin, live) {
        const time = swordTimes(t, plan, origin);
        if (time.age >= SWORDS.fade || time.alpha <= 0) return;
        const centre = { x: live.x + origin.dx, y: live.y + origin.dy }, angle = Math.atan2(centre.y - origin.y, centre.x - origin.x);
        const along = u => { const k = Math.pow(clamp(u, 0, 1), SWORDS.easing); return { x: origin.x + (centre.x - origin.x) * k, y: origin.y + (centre.y - origin.y) * k }; };
        const spot = along(time.progress);
        if (time.flying) swordFlight(ctx, { along, spot, angle, time, plan });
        drawSword(ctx, { x: spot.x, y: spot.y, angle, alpha: time.alpha, scale: plan.scale });
        if (time.age >= 0) G().swordContact(ctx, { x: spot.x, y: spot.y, angle, t: time.age, extra: plan.extra });
    }
    /** 날아가는 검의 옅은 앞선 자세 둘과 칼끝 뒤 점선: 투사체를 늘리지 않고 빽빽함만 보인다. */
    function swordFlight(ctx, f) {
        for (const [lag, opacity] of SWORDS.ghosts) {
            const back = f.time.progress - lag / f.plan.speed / f.plan.fly;
            if (back > 0) drawSword(ctx, { ...f.along(back), angle: f.angle, alpha: opacity * f.time.alpha, scale: f.plan.scale });
        }
        const prior = f.along(f.time.progress - SWORDS.trail / f.plan.speed / f.plan.fly);
        G().swordStroke(ctx, { x: f.spot.x, y: f.spot.y, angle: f.angle, length: Math.min(38, Math.hypot(f.spot.x - prior.x, f.spot.y - prior.y)), alpha: 0.3 });
    }
    /** 튕김: 작은 장검이 맞은 적에게서 다음 적으로 날아가 작은 놋빛 베임으로 끝난다. */
    function timeBounce(c) {
        if (!c.first) return true;
        const event = c.event, from = event.sourceCell, to = event.landingCell, dx = (to.gx - from.gx) * K.WIDE, dy = (to.gy - from.gy) * K.DEEP;
        const fly = Math.max(1, event.timeArrive - event.at), speed = Number(event.timeSpeed) || 1, angle = Math.atan2(dy, dx);
        stageSkillVfx.paint(K.at(from, 0, SWORDS.lift), { life: event.duration }, (ctx, t, dot) => {
            const k = Math.pow(clamp(t / fly, 0, 1), 1.25), x = dx * k, y = dy * k;
            ctx.scale(dot, dot);
            if (t < fly) {
                drawSword(ctx, { x, y, angle, alpha: 0.85, scale: 0.47 });
                G().swordStroke(ctx, { x, y, angle, length: 14, alpha: 0.3 });
            } else G().swordContact(ctx, { x, y, angle, t: (t - fly) * speed, extra: true });
        });
        return true;
    }

    const fieldBusy = () => stageSkillVfx.now() < fieldUntil;
    return Object.freeze({ raw: drawRaw, tint: tintRaw, homingFly, petrifyBurst, timeField, fieldBusy, timeBlades, timeBounce, glazeOf, heldAt });
})();
safeExposeGlobals({ stageNewRunes });
