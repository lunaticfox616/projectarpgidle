import { scaleForStageArt } from '../common/stage-art-scale.mjs';

class StageNewRuneEffects {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.K = this.deps.stageSkillKit;
        this.ST = this.deps.stageSkillStrokes;
        this.clamp = (value, low, high) => Math.min(high, Math.max(low, value));
        this.GOLD = new Map([['32,58,158', [107, 74, 36]], ['34,101,188', [162, 115, 55]], ['0,183,255', [209, 166, 78]], ['0,255,249', [239, 202, 118]], ['255,249,252', [255, 240, 186]]]);
        this.goldFloor = () => this.shared.tintRaw('clock', this.GOLD);
        this.STONE_INK = Object.freeze(['#4a4038', '#776a5c', '#a69886', '#d2c7b6']);
        this.stoneOf = enemy => (Array.isArray(enemy.ailments) ? enemy.ailments.find(ail => ail && ail.petrified && ail.time > 0) : null) || null;
        this.stones = new Map();
        this.stoneWatching = false;
        this.stoneMap = null;
        this.stoneSince = 0;
        this.STONE_GLAZE = Object.freeze({ color: '#706a76', alpha: 0.82 });
        this.SLOW_GLAZE = Object.freeze({ color: '#858585', alpha: 0.32 });
        this.latestField = null;
        this.fieldUntil = -1e9;
        this.FIELD = Object.freeze({ headFrames: 22, headMs: 34, headScale: 1.35, headAlpha: 0.96, headLift: -118, floorFrames: 25, floorMs: 28, floorScale: 3.4, floorFlat: 0.5, floorAlpha: 0.66 });
        this.shade = null;
        this.SWORDS = Object.freeze({ lift: -42, ring: [-2.35619449, -1.42, -0.55, 0.35, 1.25, 2.12, 2.94], radius: [86, 69], slots: [[-93, -54], [93, -54], [0, -93]],
            appear: 5, appearMs: 24, fade: 190, ghosts: [[32, 0.09], [16, 0.18]], trail: 20, easing: 1.8, volleyTurn: 22, castTurn: 13, jitterTurn: 16 });
        this.G = () => this.deps.stageGothicRemakes;
        this.drawSword = (ctx, o) => (this.G().swordReady() ? this.G().timeSword(ctx, o) : this.blade(ctx, o));
        this.fieldBusy = () => this.deps.stageSkillVfx.now() < this.fieldUntil;
    }

    /** 길에서 지금 자리와 방향. 아직 떠나지 않았거나 다 날았으면 null. */
    homingAt(path, now) {
        if (now < path[0].at || now > path[path.length - 1].at + 40) return null;
        let i = path.length - 1;
        while (i > 0 && path[i].at > now) i--;
        const a = path[i], b = path[Math.min(i + 1, path.length - 1)], u = b.at > a.at ? this.clamp((now - a.at) / (b.at - a.at), 0, 1) : 0;
        return { gx: a.gx + (b.gx - a.gx) * u, gy: a.gy + (b.gy - a.gy) * u, angle: b.angle };
    }

    /** 아무도 못 맞히고 사거리가 다한 화살: 그 끝에 작은 먼지(시뮬레이터 vfx-polish.js pol_miss_phys). */
    homingFizzle(c, path) {
        if (!c.event.homingMissed || c.event.homingFizzled || c.view.now < path[path.length - 1].at) return;
        c.event.homingFizzled = true;
        this.deps.stageSkillVfx.play('pol_miss_phys@smoke', this.K.at(path[path.length - 1], 0, this.K.HAND), { alpha: 0.38 });
    }

    /** 활의 섬광을 쏘는 순간에 틀고, 화살 클립이 길을 따라 나아가는 쪽을 보며 손 높이로 난다. */
    homingFly(c) {
        const path = c.event.homingPath, spot = this.homingAt(path, c.view.now);
        if (c.first) this.deps.stageSkillVfx.play(this.deps.stageSkillRunes.bowFlash(c.gem, c.element), this.K.at(c.event.sourceCell, c.look.face * 30, -54), c.look);
        if (!spot) { this.homingFizzle(c, path); return true; }
        const at = this.K.screen(c.view.projection, spot), bow = c.gem.map.bow;
        this.deps.stageSkillVfx.stamp(c.view.ctx, bow.arrow, c.view.now - path[0].at, { x: at.x, y: at.y + this.K.HAND * at.dot, dot: at.dot, face: 1, rot: spot.angle, ramp: c.look.ramp });
        return true;
    }

    /** 돌 조각: 몸에서 튀어 포물선으로 떨어진다. */
    stoneBits(spot, count, height, delay = 0) {
        const r = this.ST.random(Math.round(spot.gx * 97 + spot.gy * 31 + this.deps.stageSkillVfx.now())), bits = Array.from({ length: count }, (_, i) => ({
            vx: (r() - 0.5) * 160, vy: -(60 + r() * 120), y0: -10 - r() * height, colour: this.STONE_INK[i % 4], size: 2 + (i % 3) }));
        this.deps.stageSkillVfx.paint(this.K.at(spot), { life: 520, delay }, (ctx, t, dot) => {
            const s = t / 1000;
            ctx.scale(dot, dot);
            ctx.globalAlpha = 1 - Math.max(0, (t - 380) / 140);
            for (const bit of bits) { ctx.fillStyle = bit.colour; ctx.fillRect(Math.round(bit.vx * s), Math.round(Math.min(0, bit.y0 + bit.vy * s + 420 * s * s)), bit.size, bit.size); }
            ctx.globalAlpha = 1;
        });
    }

    /** 떨어진 자리: 돌 물결, 솟는 돌, 양옆 먼지, 돌 조각. */
    petrifyBurst(c) {
        if (!c.first) return true;
        const map = c.gem.map, spot = c.event.landingCell, face = c.look.face;
        this.deps.stageSkillVfx.play(map.area, this.K.at(spot, 0, 1), { face, ramp: c.look.ramp });
        this.deps.stageSkillVfx.play(map.burst, this.K.at(spot, 0, 1), { face, ramp: c.look.ramp, scale: 1.1 });
        [[-26, -face, 40], [26, face, 80]].forEach(([dx, side, delay]) => this.deps.stageSkillVfx.play(map.dust, this.K.at(spot, dx, 2), { face: side, alpha: 0.8, scale: 1.2, delay }));
        this.stoneBits(spot, 10, 40);
        this.stoneWatchOn(map);
        return true;
    }

    /** 굳은 적의 금: 시간이 갈수록 네 줄까지 는다(시뮬레이터 drawPetrified). 그림 안쪽 가운데에 그려 몸을 벗어나지 않게 한다. */
    stoneCracks(enemy, seed) {
        const follow = () => (this.K.enemy(enemy.id) === enemy && enemy.hp > 0 ? this.K.enemySpot(enemy) : null);
        const spot = this.K.enemySpot(enemy), size = this.deps.stageRoster.bodySize(enemy, 64), tall = size ? this.clamp(size.h / scaleForStageArt(64, this.deps.STAGE_VIEW.heroTile), 40, 200) : 90;
        return this.deps.stageSkillVfx.paint(this.K.at(spot), { life: 60000, follow }, (ctx, t, dot) => {
            const count = Math.min(4, Math.floor(t / 1800 * 5));
            ctx.scale(dot, dot);
            ctx.fillStyle = '#2a2420';
            for (let i = 0; i < count; i++) {
                let x = ((seed * (i + 3)) % 20) - 10, y = -tall * (0.25 + ((seed * (i + 7)) % 50) / 100);
                for (let s = 0; s < 7; s++) { ctx.fillRect(x, y, 2, 2); x += ((seed + i * 31 + s * 17) % 3) - 1; y += 4 + ((seed + s * 13) % 3); }
            }
        });
    }

    stoneBegin(enemy) {
        const seed = 7 + (Number(enemy.id) || 0) * 13 % 991;
        this.stones.set(enemy, { row: this.stoneCracks(enemy, seed), spot: this.K.enemySpot(enemy) });
        this.stoneBits(this.K.enemySpot(enemy), 6, 30);
    }

    /** 풀리면 돌 껍질이 부서진다(죽거나 방을 옮기면 금만 걷는다). */
    stoneEnd(enemy, row, time) {
        if (row.row) row.row.life = time - row.row.start;
        this.stones.delete(enemy);
        if (!(enemy.hp > 0) || this.K.enemy(enemy.id) !== enemy) return;
        const spot = this.K.enemySpot(enemy);
        if (this.stoneMap && this.stoneMap.shatter) this.deps.stageSkillVfx.play(this.stoneMap.shatter, this.K.at(spot, 0, 2), { face: this.K.heroFace(), scale: 0.6, alpha: 0.7 });
        this.stoneBits(spot, 10, 60);
    }

    /** 프레임마다 적의 석화를 살핀다: 막 굳은 적은 돌 조각과 금, 풀린 적은 부서짐. @returns {boolean} 더 볼지 */
    stoneWatch(time, owner) {
        for (const enemy of owner.enemies || []) if (this.stoneOf(enemy) && !this.stones.has(enemy)) this.stoneBegin(enemy);
        for (const [enemy, row] of [...this.stones]) if (!this.stoneOf(enemy)) this.stoneEnd(enemy, row, time);
        this.stoneWatching = this.stones.size > 0 || time - this.stoneSince < 300;
        return this.stoneWatching;
    }

    stoneWatchOn(map) {
        this.stoneMap = map;
        this.stoneSince = this.deps.stageSkillVfx.now();
        if (!this.stoneWatching) { this.stoneWatching = true; this.deps.stageSkillVfx.watch(this.stoneWatch.bind(this)); }
    }

    /** 그 적의 그림에 덮을 빛깔: 석화는 돌빛, 시간의 사선에 둔화되면 옅은 잿빛. 없으면 null. */
    glazeOf(enemy) {
        if (this.stoneOf(enemy)) return this.STONE_GLAZE;
        return typeof this.deps.enemyTimeSlowed === 'function' && this.deps.enemyTimeSlowed(enemy) ? this.SLOW_GLAZE : null;
    }

    /** 굳은 적은 자세가 멈춘다: 그림을 고르는 시각을 굳은 때에 묶는다. 굳지 않았으면 null. */
    heldAt(enemy) {
        const row = this.stoneOf(enemy);
        return row ? row.petrifiedAt : null;
    }

    /** 찌르기가 나가는 때: 잿빛 바닥, 발밑 금빛 시계, 머리 위 모래시계. 시계는 찌르기가 끝나면 0.12초에 옅어지고, 새 시전이나 걸음이 오면 바로 사라진다. */
    timeField(c) {
        if (!c.first) return true;
        const event = c.event, speed = Number(event.timeSpeed) || 1, spot = this.K.heroDrawn(), token = this.latestField = {};
        const clockEnd = event.timeActorEnd - event.at, fade = 120 / speed;
        this.fieldUntil = this.deps.stageSkillVfx.now() + clockEnd + fade;
        this.shadeKeep(spot, event.timeSlowUntil - event.at, speed);
        const visible = (t) => (this.latestField === token && this.K.heroSpot().gx === event.sourceCell.gx && this.K.heroSpot().gy === event.sourceCell.gy ? this.clamp(t / (45 / speed), 0, 1) * this.clamp(1 - (t - clockEnd) / fade, 0, 1) : 0);
        const follow = () => this.K.heroDrawn();
        this.deps.stageSkillVfx.paint(this.K.at(spot, 0, 1), { life: clockEnd + fade, layer: 'ground', follow }, (ctx, t, dot) => {
            const frame = Math.floor(t * speed / this.FIELD.floorMs), gold = this.goldFloor();
            if (frame >= this.FIELD.floorFrames || !gold) return;
            ctx.scale(dot, dot);
            this.shared.drawRaw(ctx, 'clock', frame, { source: gold, anchor: [24, 24], scale: this.FIELD.floorScale, flat: this.FIELD.floorFlat, alpha: this.FIELD.floorAlpha * visible(t) });
        });
        this.deps.stageSkillVfx.paint(this.K.at(spot, 0, this.FIELD.headLift), { life: clockEnd + fade, follow }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            this.shared.drawRaw(ctx, 'hourglass', Math.min(this.FIELD.headFrames - 1, Math.floor(t * speed / this.FIELD.headMs)), { anchor: [24, 28], scale: this.FIELD.headScale, alpha: this.FIELD.headAlpha * visible(t) });
        });
        return true;
    }

    shadeKeep(spot, length, speed) {
        const now = this.deps.stageSkillVfx.now();
        if (this.shade && now - this.shade.row.start < this.shade.row.life) {
            this.shade.end = now - this.shade.row.start + length;
            this.shade.speed = speed;
            this.shade.row.life = this.shade.end + 190 / speed;
            return;
        }
        const own = { end: length, speed, row: null };
        own.row = this.deps.stageSkillVfx.paint(this.K.at(spot), { life: length + 190 / speed, layer: 'ground' }, (ctx, t) => this.timeShade(ctx, t, own));
        this.shade = own;
    }

    /** 잿빛: 들어올 때 0.07초, 나갈 때 0.19초/공격 속도. 바닥 층이라 몸들은 덮지 않는다. 채도를 먼저 빼고 조금 어둡게 덮는다(시뮬레이터 slowShade). */
    timeShade(ctx, t, own) {
        const alpha = t < own.end ? this.clamp(t / 70, 0, 1) : this.clamp(1 - (t - own.end) * own.speed / 190, 0, 1);
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
    blade(ctx, o) {
        if (o.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha *= o.alpha;
        ctx.translate(Math.round(o.x), Math.round(o.y));
        ctx.rotate(o.angle - Math.PI / 4);
        if (!this.shared.drawRaw(ctx, 'blade', 0, { anchor: [60, 60], scale: o.scale })) {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#35291d'; ctx.fillRect(-72, -3, 72, 6);
            ctx.fillStyle = '#ffe49b'; ctx.fillRect(-69, -1, 69, 2);
            ctx.fillStyle = '#c79543'; ctx.fillRect(-57, -7, 3, 14);
        }
        ctx.restore();
    }

    /** 시전, 발, 검, 갈래로 정해지는 0~1(시뮬레이터 noise). 프레임마다 흔들리지 않는다. */
    swordNoise(cast, shot, sword, channel) {
        let n = (Math.imul(cast + 1, 73856093) ^ Math.imul(shot + 1, 19349663) ^ Math.imul(sword + 1, 83492791) ^ Math.imul(channel + 1, 0x9e3779b9)) >>> 0;
        n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
        n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    /** 검들이 서는 자리(대상 몸 가운데 기준, 도트)와 닿는 자리의 흩어짐(dx, dy). 일곱은 둘레에, 하나는 세 자리를 돌아가며. */
    swordOrigins(event) {
        const many = event.timeSwords > 1, cast = Number(event.timeCast) || 1, shot = event.timeShot || 0;
        return Array.from({ length: event.timeSwords }, (_, i) => {
            const base = many ? [Math.cos(this.SWORDS.ring[i]) * this.SWORDS.radius[0], Math.sin(this.SWORDS.ring[i]) * this.SWORDS.radius[1]] : this.SWORDS.slots[(shot + 2) % 3];
            const turn = ((cast - 1) * this.SWORDS.castTurn + shot * this.SWORDS.volleyTurn + (this.swordNoise(cast, shot, i, 0) - 0.5) * this.SWORDS.jitterTurn) * Math.PI / 180;
            const a = Math.atan2(base[1], base[0]) + turn, r = Math.hypot(base[0], base[1]) * (0.92 + this.swordNoise(cast, shot, i, 1) * 0.18);
            return { x: Math.cos(a) * r, y: this.SWORDS.lift + Math.sin(a) * r, i,
                dx: Math.round((this.swordNoise(cast, shot, i, 2) - 0.5) * 14), dy: Math.round((this.swordNoise(cast, shot, i, 3) - 0.5) * 20) };
        });
    }

    /** 한 발의 검 묶음: 대상 몸 둘레에 서 있다가 0.024초 간격으로 차례로 날아가 박히고, 0.19초 동안 옅어진다. 피해는 판정 쪽이 마지막 검에 한 번 준다. */
    timeBlades(c) {
        if (!c.first) return true;
        const event = c.event, speed = Number(event.timeSpeed) || 1, first = event.timeFirst - event.at, fly = Math.max(1, event.timeFly);
        const plan = { speed, first, fly, step: event.timeStep, appear: event.timeShot ? first - fly : 0, scale: event.timeSwords > 1 ? 1 : 0.88, extra: event.timeShot > 0,
            anchor: event.timeCell, enemy: this.K.enemy(event.timeFoe), origins: this.swordOrigins(event) };
        this.deps.stageSkillVfx.paint(this.K.at(event.timeCell), { life: event.timeArrive - event.at + this.SWORDS.fade / speed + 20 }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const live = this.bladeTarget(plan);
            for (const origin of plan.origins) this.volleySword(ctx, t, plan, origin, live);
        });
        return true;
    }

    /** 맞는 자리: 대상이 움직이면 따라간다(쓰러진 뒤에는 마지막에 본 자리). */
    bladeTarget(plan) {
        const alive = plan.enemy && this.K.enemy(plan.enemy.id) === plan.enemy && plan.enemy.hp > 0, spot = alive ? this.K.enemySpot(plan.enemy) : plan.anchor;
        if (alive) plan.seen = spot;
        const at = plan.seen || plan.anchor;
        return { x: (at.gx - plan.anchor.gx) * this.K.WIDE, y: (at.gy - plan.anchor.gy) * this.K.DEEP + this.SWORDS.lift };
    }

    /** 검 하나의 때: 나타남, 떠남, 닿음(도트 시간). */
    swordTimes(t, plan, origin) {
        const launch = plan.first - plan.fly + origin.i * plan.step, arrival = plan.first + origin.i * plan.step;
        const shown = this.clamp((t - plan.appear - origin.i * this.SWORDS.appear / plan.speed) / (this.SWORDS.appearMs / plan.speed), 0, 1), age = (t - arrival) * plan.speed;
        const alpha = t < launch ? shown * 0.9 : t >= arrival ? 0.62 * Math.pow(1 - this.clamp(age / this.SWORDS.fade, 0, 1), 1.2) : shown;
        return { launch, arrival, age, alpha, flying: t >= launch && t < arrival, progress: (t - launch) / plan.fly };
    }

    volleySword(ctx, t, plan, origin, live) {
        const time = this.swordTimes(t, plan, origin);
        if (time.age >= this.SWORDS.fade || time.alpha <= 0) return;
        const centre = { x: live.x + origin.dx, y: live.y + origin.dy }, angle = Math.atan2(centre.y - origin.y, centre.x - origin.x);
        const along = u => { const k = Math.pow(this.clamp(u, 0, 1), this.SWORDS.easing); return { x: origin.x + (centre.x - origin.x) * k, y: origin.y + (centre.y - origin.y) * k }; };
        const spot = along(time.progress);
        if (time.flying) this.swordFlight(ctx, { along, spot, angle, time, plan });
        this.drawSword(ctx, { x: spot.x, y: spot.y, angle, alpha: time.alpha, scale: plan.scale });
        if (time.age >= 0) this.G().swordContact(ctx, { x: spot.x, y: spot.y, angle, t: time.age, extra: plan.extra });
    }

    /** 날아가는 검의 옅은 앞선 자세 둘과 칼끝 뒤 점선: 투사체를 늘리지 않고 빽빽함만 보인다. */
    swordFlight(ctx, f) {
        for (const [lag, opacity] of this.SWORDS.ghosts) {
            const back = f.time.progress - lag / f.plan.speed / f.plan.fly;
            if (back > 0) this.drawSword(ctx, { ...f.along(back), angle: f.angle, alpha: opacity * f.time.alpha, scale: f.plan.scale });
        }
        const prior = f.along(f.time.progress - this.SWORDS.trail / f.plan.speed / f.plan.fly);
        this.G().swordStroke(ctx, { x: f.spot.x, y: f.spot.y, angle: f.angle, length: Math.min(38, Math.hypot(f.spot.x - prior.x, f.spot.y - prior.y)), alpha: 0.3 });
    }

    /** 튕김: 작은 장검이 맞은 적에게서 다음 적으로 날아가 작은 놋빛 베임으로 끝난다. */
    timeBounce(c) {
        if (!c.first) return true;
        const event = c.event, from = event.sourceCell, to = event.landingCell, dx = (to.gx - from.gx) * this.K.WIDE, dy = (to.gy - from.gy) * this.K.DEEP;
        const fly = Math.max(1, event.timeArrive - event.at), speed = Number(event.timeSpeed) || 1, angle = Math.atan2(dy, dx);
        this.deps.stageSkillVfx.paint(this.K.at(from, 0, this.SWORDS.lift), { life: event.duration }, (ctx, t, dot) => {
            const k = Math.pow(this.clamp(t / fly, 0, 1), 1.25), x = dx * k, y = dy * k;
            ctx.scale(dot, dot);
            if (t < fly) {
                this.drawSword(ctx, { x, y, angle, alpha: 0.85, scale: 0.47 });
                this.G().swordStroke(ctx, { x, y, angle, length: 14, alpha: 0.3 });
            } else this.G().swordContact(ctx, { x, y, angle, t: (t - fly) * speed, extra: true });
        });
        return true;
    }
}

export function createStageNewRuneEffects(deps, shared) {
    return new StageNewRuneEffects(deps, shared);
}
