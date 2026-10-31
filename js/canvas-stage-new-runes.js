/** 새 룬 넷의 무대 연출 (2026-11-01 사용자가 준 "스킬 전체 디렉터 전달" V3.6의 78 추적 사격, 79 석화 혼합물, 80 시간의 사선, 81 정화의 집행).
 * 시뮬레이터(time-slash-homage.js, time-buff-vfx.js, censer-fire-detail.js, index.html의 censerWhirlFx, petrifyMob, stoneBits)의 그림과 시간을 게임의 사건에 옮겼다.
 * 칸의 크기만 시뮬레이터의 72×36에서 게임의 64×32로 옮기고 길이는 도트 그대로다. 원래 색을 지켜야 하는 띠(Fire Mage, Buff n Debuff, 사선 칼날)는 다시 칠하지 않고
 * assets/stage-vfx/vfx3.png에서 바로 그린다(STAGE_SKILL_VFX.raw). 그 그림이 없는 판에서는 띠만 빠지고 코드로 그리는 부분은 그대로 나온다.
 * 전투 계산에는 닿지 않는다: 사건과 적의 상태를 읽기만 한다. 판정은 js/skill-gem-casts.js 78, 79, 80과 js/combat.js가 맡는다.
 * 시뮬레이터와 다른 점: 시간의 사선의 잿빛은 화면 전체가 아니라 바닥과, 둔화된 적의 그림에 입힌다(주인공만 다시 그리는 길이 게임에는 없다).
 */
const stageNewRunes = (() => {
    const K = stageSkillKit, ST = stageSkillStrokes, TAU = Math.PI * 2;
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
    /** 발밑 시계의 금빛(시뮬레이터 time-buff-vfx.js goldCache): 원본의 다섯 색만 정확히 바꾸고 알파와 자리는 그대로 둔다. 원본 그림은 고치지 않는다. */
    const GOLD_FROM = Object.freeze(['32,58,158', '34,101,188', '0,183,255', '0,255,249', '255,249,252']);
    const GOLD_TO = Object.freeze([[107, 74, 36], [162, 115, 55], [209, 166, 78], [239, 202, 118], [255, 240, 186]]);
    let goldClock = null;
    function goldFloor() {
        if (goldClock) return goldClock;
        const image = stageSkillVfx.picture(RAW_SHEET), row = STAGE_SKILL_VFX.raw.clock;
        if (!image || !row) return null;
        const canvas = document.createElement('canvas');
        canvas.width = row.w * row.n; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, row.x, row.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), lookup = new Map(GOLD_FROM.map((key, i) => [key, GOLD_TO[i]]));
        for (let i = 0; i < pixels.data.length; i += 4) {
            const colour = pixels.data[i + 3] ? lookup.get(`${pixels.data[i]},${pixels.data[i + 1]},${pixels.data[i + 2]}`) : null;
            if (colour) pixels.data.set(colour, i);
        }
        ctx.putImageData(pixels, 0, 0);
        goldClock = canvas;
        return goldClock;
    }

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
    const BLADES = Object.freeze({ lift: -42, wide: [86, 59], tall: [69, 45], scale: [1, 0.72], appear: 5, appearMs: 24, ghosts: [[24, 0.14], [12, 0.3]], easing: 1.8,
        first: [-2.35619449, -1.42, -0.55, 0.35, 1.25, 2.12, 2.94], again: [-2.35619449, -0.3, 1.45] });
    const IMPACT = Object.freeze({ flash: 90, trail: 200, fade: 150, ring: 170, spark: 180 });
    /** 대상 몸 둘레에 칼날이 서고(첫 타는 일곱, 이어 치는 타는 셋), 맞는 순간으로 날아가 모인다. 칼날은 그림이고 피해는 한 번이다. */
    function timeBlades(c) {
        if (!c.first) return true;
        const event = c.event, role = event.timeShot ? 1 : 0, angles = event.timeShot ? BLADES.again : BLADES.first, speed = Number(event.timeSpeed) || 1;
        const center = { x: 0, y: BLADES.lift }, enemy = K.enemy(event.timeFoe), anchor = event.timeCell;
        const swords = angles.map((a, i) => { const x = Math.cos(a) * BLADES.wide[role], y = center.y + Math.sin(a) * BLADES.tall[role]; return { x, y, angle: Math.atan2(center.y - y, -x), i }; });
        const arrive = event.timeArrive - event.at, flyFrom = arrive - event.timeFly, plan = { swords, role, speed, arrive, flyFrom, anchor, enemy };
        stageSkillVfx.paint(K.at(anchor), { life: arrive + IMPACT.trail / speed + 40 }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const live = bladeTarget(plan);
            if (t < arrive) bladeFormation(ctx, t, plan, live);
            else bladeImpact(ctx, t, plan, live);
        });
        return true;
    }
    /** 맞는 자리: 대상이 움직이면 따라간다(맞은 뒤에는 그 자리에 남는다). */
    function bladeTarget(plan) {
        const alive = plan.enemy && K.enemy(plan.enemy.id) === plan.enemy && plan.enemy.hp > 0, spot = alive ? K.enemySpot(plan.enemy) : plan.anchor;
        if (alive) plan.seen = spot;
        const at = plan.seen || plan.anchor;
        return { x: (at.gx - plan.anchor.gx) * K.WIDE, y: (at.gy - plan.anchor.gy) * K.DEEP + BLADES.lift };
    }
    function bladeSpot(sword, t, plan, live) {
        const u = clamp((t - plan.flyFrom) / Math.max(1, plan.arrive - plan.flyFrom), 0, 1), k = Math.pow(u, BLADES.easing);
        return { x: sword.x + (live.x - sword.x) * k, y: sword.y + (live.y - sword.y) * k, flying: t >= plan.flyFrom };
    }
    /** 날아가는 칼날의 잔상 둘. */
    function bladeGhosts(ctx, sword, spot, z) {
        for (const [lag, alpha] of BLADES.ghosts) {
            const back = bladeSpot(sword, Math.max(z.plan.flyFrom, z.t - lag / z.plan.speed), z.plan, z.live);
            if (Math.hypot(spot.x - back.x, spot.y - back.y) > 1) blade(ctx, { x: back.x, y: back.y, angle: sword.angle, alpha, scale: BLADES.scale[z.plan.role] });
        }
    }
    function bladeFormation(ctx, t, plan, live) {
        for (const sword of plan.swords) {
            const spot = bladeSpot(sword, t, plan, live), alpha = spot.flying ? 1 : clamp((t - sword.i * BLADES.appear / plan.speed) / (BLADES.appearMs / plan.speed), 0, 1);
            if (spot.flying) bladeGhosts(ctx, sword, spot, { t, plan, live });
            blade(ctx, { x: spot.x, y: spot.y, angle: sword.angle, alpha, scale: BLADES.scale[plan.role] });
        }
    }
    /** 맞는 순간: 칼날이 모인 자리의 빛줄기, 흰 심지, 바닥 고리, 불티 여섯. 화면을 번쩍이지 않고 멈추지도 않는다. */
    function bladeImpact(ctx, t, plan, live) {
        const age = (t - plan.arrive) * plan.speed, cx = live.x, cy = live.y;
        bladeStreaks(ctx, plan, live, age);
        bladeFlash(ctx, plan, cx, cy, clamp(1 - age / IMPACT.flash, 0, 1));
        bladeRing(ctx, cx, cy, age);
        bladeSparks(ctx, cx, cy, age);
        ctx.globalAlpha = 1;
    }
    function bladeStreaks(ctx, plan, at, age) {
        const scale = BLADES.scale[plan.role], width = plan.role ? [1, 3] : [4, 8], fade = clamp(1 - age / IMPACT.trail, 0, 1);
        for (const sword of plan.swords) {
            const length = Math.hypot(sword.x, sword.y - BLADES.lift), main = sword.i === 0;
            ctx.save();
            ctx.translate(at.x, at.y); ctx.rotate(sword.angle);
            const grad = ctx.createLinearGradient(-length, 0, 14, 0);
            grad.addColorStop(0, 'rgba(206,153,65,0)'); grad.addColorStop(0.65, 'rgba(245,205,116,.65)'); grad.addColorStop(1, 'rgba(255,245,197,1)');
            ctx.globalAlpha = fade * (main ? 1 : 0.62);
            ctx.fillStyle = grad;
            ctx.fillRect(-length, main ? -width[0] : -1, length + 18, main ? width[1] : 3);
            ctx.restore();
            blade(ctx, { x: at.x, y: at.y, angle: sword.angle, alpha: clamp(1 - age / IMPACT.fade, 0, 1) * (main ? 1 : 0.42), scale });
        }
    }
    function bladeFlash(ctx, plan, cx, cy, flash) {
        if (flash <= 0) return;
        const x = Math.round(cx), y = Math.round(cy);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(plan.swords[0].angle);
        ctx.globalAlpha = flash * 0.92;
        ctx.fillStyle = '#dca849'; ctx.fillRect(-31, -5, 57, 10);
        ctx.fillStyle = '#fff2be'; ctx.fillRect(-25, -2, 49, 4);
        ctx.fillStyle = '#fffbe4'; ctx.fillRect(-10, -1, 24, 2);
        ctx.restore();
        ctx.globalAlpha = flash;
        ctx.fillStyle = '#f6d47d'; ctx.fillRect(x - 10, y - 4, 21, 9); ctx.fillRect(x - 4, y - 12, 9, 25);
        ctx.fillStyle = '#fff7d2'; ctx.fillRect(x - 6, y - 3, 13, 7); ctx.fillRect(x - 3, y - 7, 7, 15);
        ctx.fillStyle = '#fffde8'; ctx.fillRect(x - 3, y - 3, 7, 7);
    }
    function bladeRing(ctx, cx, cy, age) {
        const ring = clamp(1 - age / IMPACT.ring, 0, 1);
        if (ring <= 0) return;
        const p = age / IMPACT.ring, rx = 14 + 34 * Math.pow(p, 0.55), ry = 3 + 6 * p, ground = cy + 40;
        ctx.globalAlpha = ring * 0.86; ctx.strokeStyle = '#d4a344'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, ground, rx, ry, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = ring * 0.9; ctx.strokeStyle = '#fff0b2'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, ground - 1, Math.max(6, rx - 3), Math.max(2, ry - 1), 0, 0, TAU); ctx.stroke();
    }
    function bladeSparks(ctx, cx, cy, age) {
        const sparks = clamp(1 - age / IMPACT.spark, 0, 1);
        if (sparks <= 0) return;
        for (let i = 0; i < 6; i++) {
            const a = -0.35 + i * Math.PI / 3, r = 9 + age * (0.13 + (i % 2) * 0.045), x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.72);
            ctx.globalAlpha = sparks * 0.95;
            ctx.fillStyle = i % 2 ? '#f5c96a' : '#fff1bd'; ctx.fillRect(x - 1, y - 1, i % 2 ? 4 : 3, 2);
            ctx.fillStyle = '#c58b36'; ctx.fillRect(x - 2, y + 1, 3, 1);
        }
    }
    /** 튕김: 작은 칼날이 맞은 적에게서 다음 적으로 날아가 작은 빛 십자로 끝난다. */
    function timeBounce(c) {
        if (!c.first) return true;
        const event = c.event, from = event.sourceCell, to = event.landingCell, dx = (to.gx - from.gx) * K.WIDE, dy = (to.gy - from.gy) * K.DEEP, fly = Math.max(1, event.timeArrive - event.at);
        stageSkillVfx.paint(K.at(from, 0, BLADES.lift), { life: event.duration }, (ctx, t, dot) => {
            const u = clamp(t / fly, 0, 1), k = Math.pow(u, 1.25), x = dx * k, y = dy * k, angle = Math.atan2(dy, dx);
            ctx.scale(dot, dot);
            if (t < fly) {
                blade(ctx, { x, y, angle, alpha: 0.92, scale: 0.35 });
                ctx.globalAlpha = 0.45; ctx.strokeStyle = '#efc86f'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x - Math.cos(angle) * 12, y - Math.sin(angle) * 12); ctx.lineTo(x, y); ctx.stroke();
            } else {
                ctx.globalAlpha = clamp(1 - (t - fly) / 110, 0, 1);
                ctx.fillStyle = '#fff2c0';
                ctx.fillRect(Math.round(x) - 5, Math.round(y) - 1, 11, 3); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 5, 3, 11);
            }
            ctx.globalAlpha = 1;
        });
        return true;
    }

    // ---------------------------------------------------------------- 81 정화의 집행
    const ORBIT = Object.freeze({ radius: 146, up: 46, period: 560, trail: 160, tail: 60 });
    /** 3차원 궤도: 몸 허리 높이를 가운데로 한 원. 기울기(15도~75도)와 방향이 돌면서 바뀌어 납작한 고리, 비스듬한 고리, 머리 위 세로 고리가 겹친다. */
    function orbitAt(t, dir) {
        const th = dir * t / ORBIT.period * TAU + Math.PI * 0.5, phi = (45 + 30 * Math.sin(t / ORBIT.period * Math.PI * 0.85 + 0.6)) * Math.PI / 180, psi = dir * t / ORBIT.period * 0.42 * Math.PI;
        const X0 = Math.cos(th) * ORBIT.radius, Z0 = Math.sin(th) * ORBIT.radius, Y = Z0 * Math.sin(phi), Z1 = Z0 * Math.cos(phi);
        const X = X0 * Math.cos(psi) - Z1 * Math.sin(psi), Z = X0 * Math.sin(psi) + Z1 * Math.cos(psi);
        return { x: X, y: -ORBIT.up - Y + Z * 0.5, Y, Z, front: Z >= 0 };
    }
    function orbitPose(t, dir) {
        const p = orbitAt(t, dir), a = orbitAt(t + 10, dir), b = orbitAt(t - 10, dir);
        p.tan = Math.atan2(a.y - b.y, a.x - b.x);
        return p;
    }
    /** 그 때에 태어난 것의 흔들림(같은 때면 늘 같은 값). */
    const orbitNoise = (birth, salt) => { const x = Math.sin(birth * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); };
    const TONGUE = Object.freeze({ every: 40, life: 120, frames: [0, 1, 2, 4], ms: 30, scale: 0.27, alpha: 0.72 });
    const PUFF = Object.freeze({ every: 48, life: 308, ms: 22, scale: 0.26, alpha: 0.38 });
    const EMBER = Object.freeze({ every: 26, life: 580 });
    const FIRE_INK = () => STAGE_SKILL_VFX.ramps.fire;
    /** 한 층(side: 뒤 또는 앞)에서 그 쪽에 있는 불꽃 혀와 불똥. 지나간 자리에 짧게 남는다. */
    function orbitTrail(ctx, t, o, side) {
        for (let birth = Math.max(0, Math.ceil((t - PUFF.life) / PUFF.every)) * PUFF.every; birth <= Math.min(t, o.total); birth += PUFF.every) {
            const p = orbitPose(birth, o.dir), age = t - birth;
            if (p.front !== side) continue;
            drawRaw(ctx, 'fire4', Math.min(13, Math.floor(age / PUFF.ms)), { x: p.x + (orbitNoise(birth, 1) - 0.5) * 6, y: p.y + (orbitNoise(birth, 2) - 0.5) * 6, scale: PUFF.scale * (0.9 + orbitNoise(birth, 3) * 0.4), alpha: PUFF.alpha * (0.38 + orbitNoise(birth, 4) * 0.12) });
        }
        for (let birth = Math.max(0, Math.ceil((t - TONGUE.life) / TONGUE.every)) * TONGUE.every; birth <= Math.min(t, o.total); birth += TONGUE.every) {
            const p = orbitPose(birth, o.dir), age = t - birth;
            if (p.front !== side) continue;
            const fade = Math.min(1, (TONGUE.life - age) / 95), wave = 0.82 + 0.22 * (0.5 + 0.5 * Math.sin(birth * 0.037));
            drawRaw(ctx, 'fire10', TONGUE.frames[Math.min(3, Math.floor(age / TONGUE.ms))], { x: p.x, y: p.y, rot: p.tan - Math.PI * 0.5, scale: TONGUE.scale * wave, alpha: TONGUE.alpha * fade });
        }
    }
    /** 사슬과 향로(시뮬레이터 censer-fire-detail.js metal): 어두운 사슬 위에 번갈아 빛나는 고리, 금빛 뚜껑과 숨구멍의 불빛. */
    const CENSER_ROWS = Object.freeze(['.....oo......', '....oHGo.....', '...ooGGSoo...', '..oHHGGSSSo..', '.oHGGGGGSSSo.', 'oHHGGGGGSSSSo', '.oGGGGGGSSSo.', '.oGvEvEvSSSo.', '.oGvCvCvSSSo.', '.oGvEvEvSSSo.', '.oGGGGGGSSSo.', '..oGGGGSSSo..', '...oGGSSSo...', '....oSSSo....', '.....ooo.....']);
    function censerChain(ctx, p, hand) {
        const lidX = Math.round(p.x), lidY = Math.round(p.y - 14), dx = lidX - hand.x, dy = lidY - hand.y, length = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(length));
        for (let i = 0; i <= n; i++) { ctx.fillStyle = '#251913'; ctx.fillRect(Math.round(hand.x + dx * i / n) - 1, Math.round(hand.y + dy * i / n) - 1, 3, 3); }
        for (let i = 0; i <= n; i++) { ctx.fillStyle = (Math.floor(i / 4) % 2) ? '#a37434' : '#e6b85e'; ctx.fillRect(Math.round(hand.x + dx * i / n), Math.round(hand.y + dy * i / n), 1, 1); }
        for (let d = 4; d < length - 5; d += 7) {
            const x = Math.round(hand.x + dx * d / length), y = Math.round(hand.y + dy * d / length);
            ctx.fillStyle = '#d5a74c'; ctx.fillRect(x - 1, y - 1, 3, 1); ctx.fillRect(x - 1, y + 1, 3, 1);
            ctx.fillStyle = '#5e411e'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1);
        }
    }
    function censerBody(ctx, p, t) {
        const glow = Math.floor(t / 72) % 3, x0 = Math.round(p.x) - 13, y0 = Math.round(p.y) - 15;
        const ink = { o: '#24170f', S: '#8f5726', G: '#bc843b', H: '#f2cb77', v: '#351b10', E: glow === 0 ? '#ffb442' : '#e66d1b', C: glow === 1 ? '#fff1ab' : '#ffca5d' };
        CENSER_ROWS.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { ctx.fillStyle = ink[row[x]]; ctx.fillRect(x0 + x * 2, y0 + y * 2, 2, 2); } });
        ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x0 + 7, y0 + 10, 9, 1); ctx.fillRect(x0 + 5, y0 + 12, 2, 3);
        ctx.fillStyle = '#6a3b1d'; ctx.fillRect(x0 + 20, y0 + 15, 1, 7);
    }
    /** 향로 머리: 뒤로 말리는 불덩이, 둘레의 작은 불꽃, 그 위에 사슬과 금빛 그릇. */
    function censerHead(ctx, t, o) {
        const p = orbitPose(Math.min(t, o.total), o.dir);
        drawRaw(ctx, 'fire8', Math.floor(t / 65) % 4, { x: p.x, y: p.y, rot: p.tan, scale: 0.7, anchor: [98, 64], alpha: 0.95 });
        drawRaw(ctx, 'fire3', Math.floor(t / 47) % 12, { x: p.x, y: p.y - 5, rot: p.tan * 0.34, scale: 0.53, alpha: 0.82 });
        censerChain(ctx, p, { x: o.face * 6, y: -62 });
        censerBody(ctx, p, t);
    }
    /** 튀어 올랐다 떨어지는 불티(코드, 위층). */
    function censerEmbers(ctx, t, o) {
        const ink = FIRE_INK();
        for (let birth = Math.max(0, Math.ceil((t - EMBER.life) / EMBER.every)) * EMBER.every; birth <= Math.min(t, o.total); birth += EMBER.every) {
            const age = t - birth, life = 260 + orbitNoise(birth, 5) * 320;
            if (age > life) continue;
            const p = orbitAt(birth, o.dir), a = orbitNoise(birth, 6) * TAU, speed = 30 + orbitNoise(birth, 7) * 80, s = age / 1000, k = age / life;
            ctx.globalAlpha = 1 - k * k;
            ctx.fillStyle = k < 0.35 ? ink[5] : k < 0.7 ? ink[4] : ink[3];
            const size = orbitNoise(birth, 8) < 0.3 ? 2 : 1;
            ctx.fillRect(Math.round(p.x + Math.cos(a) * speed * s), Math.round(p.y + (-20 - orbitNoise(birth, 9) * 80) * s + 160 * s * s), size, size);
        }
        ctx.globalAlpha = 1;
    }
    /** 불씨 클립과, 궤도가 낮게 지날 때의 바닥 불꽃(시간이 된 만큼 그 자리에 튼다). */
    function censerClips(t, o, map) {
        while (o.nextEmber <= Math.min(t, o.total)) {
            const birth = o.nextEmber, p = orbitAt(birth, o.dir);
            o.nextEmber += EMBER.every;
            if (orbitNoise(birth, 10) < 0.3) stageSkillVfx.play(map.ember, K.at(K.heroDrawn(), p.x, p.y - 6), { face: orbitNoise(birth, 11) < 0.5 ? 1 : -1, scale: 0.6 + orbitNoise(birth, 12) * 0.5, alpha: 0.85 });
        }
        while (o.nextGround <= Math.min(t, o.total)) {
            const birth = o.nextGround, p = orbitAt(birth, o.dir);
            o.nextGround += 95;
            if (p.Y < 2) stageSkillVfx.play(map.ground, K.at(K.heroDrawn(), p.x, p.Z * 0.5 + 2), { face: orbitNoise(birth, 13) < 0.5 ? 1 : -1, layer: 'ground', scale: 0.55 + orbitNoise(birth, 14) * 0.35, alpha: 0.7, life: 420 });
        }
    }
    /** 정화의 집행: 몸을 따라다니는 불의 고리. 궤도의 뒤쪽은 몸 뒤 층에, 앞쪽은 몸 앞 층에 그린다. 도는 동안 다시 쓰면 새 향로를 띄우지 않고 그 고리가 더 돈다
     * (시뮬레이터는 회전이 끝나야 다음 공격이 나간다. 게임은 공격 속도대로 나가 회전이 겹칠 수 있다). */
    let censerRun = null;
    const censerLife = o => o.total + TONGUE.life + PUFF.life;
    function censerWhirl(gem, total) {
        const o = { total, dir: K.heroFace() > 0 ? 1 : -1, face: K.heroFace(), nextEmber: 0, nextGround: 0, rows: [] }, follow = () => K.heroDrawn();
        const pass = (side, layer) => stageSkillVfx.paint(K.at(K.heroDrawn()), { life: censerLife(o), layer, follow }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            orbitTrail(ctx, t, o, side);
            if (t < o.total + ORBIT.tail && orbitPose(Math.min(t, o.total), o.dir).front === side) censerHead(ctx, t, o);
            if (side) { censerEmbers(ctx, t, o); censerClips(t, o, gem.map.censer); }
        });
        o.rows = [pass(false, 'ground'), pass(true, 'top')].filter(Boolean);
        censerRun = o;
    }
    /** 시전 시작(js/canvas-stage-skill-runes.js runeWindup): 도는 시간은 회전 수 × 간격 + 0.14초. */
    function censerStart(gem) {
        const def = SKILL_DB[gem.meta.name] || {}, total = (Number(def.targets) || 7) * (Number(def.whirlIntervalMs) || 120) + 140, row = censerRun && censerRun.rows[0];
        const age = row ? stageSkillVfx.now() - row.start : Infinity;
        if (!row || age >= censerRun.total) { censerWhirl(gem, total); return; }
        censerRun.total = age + total;
        for (const pass of censerRun.rows) pass.life = censerLife(censerRun);
    }
    const fieldBusy = () => stageSkillVfx.now() < fieldUntil;
    return Object.freeze({ raw: drawRaw, homingFly, petrifyBurst, timeField, fieldBusy, timeBlades, timeBounce, censerStart, glazeOf, heldAt });
})();
safeExposeGlobals({ stageNewRunes });
