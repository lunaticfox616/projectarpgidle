// GENERATED from modules/canvas-stage-rune-remakes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-rune-remakes.mjs
  var StageRuneRemakes = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.clamp = (value, low, high) => Math.min(high, Math.max(low, value));
      this.raw = (ctx, name, frame, o) => this.deps.stageNewRunes.raw(ctx, name, frame, o);
      this.CLOUD = Object.freeze([
        ["cc55_core", 0, -24, 0, 0.9, false, 0, -5],
        ["cc55_sidepuff", -23, -21, 14, 0.64, false, -17, -3],
        ["cc55_sidepuff", 23, -21, 24, 0.6, false, 17, -3],
        ["cc55_cloud", -35, -29, 45, 0.43, false, -23, -12],
        ["cc55_cloud", 0, -36, 52, 0.36, false, 0, -16],
        ["cc55_cloud", 35, -28, 65, 0.4, false, 23, -11],
        ["cc55_front", -48, -15, 60, 0.29, true, -23, -5],
        ["cc55_front", 48, -15, 72, 0.27, true, 23, -5],
        ["cc55_arc", 0, -13, 35, 0.58, true, 0, 0]
      ]);
      this.MIST = Object.freeze({ waist: -34, sweepFrom: 3, sweepTo: 8, sweepAlpha: 0.52, emitFrom: 3, emitTo: 7, spacing: 44, plumeAlpha: 0.48, ventAlpha: 0.68, tail: 190, pocket: [14, 16], lift: 0.025, drift: 0.019 });
      this.framesLength = (clip, from, to) => clip.ms.slice(from, to + 1).reduce((sum, ms) => sum + ms, 0);
      this.GOTHIC_MIST = Object.freeze({ fieldFrom: 4, emitFrom: 3, emitTo: 7, spacing: 70, radius: 1, face: [-13, -108, 26, 35], head: [-10, -11, 20, 24] });
      this.SLAM_REACH = Object.freeze({ wanderer: 50, warrior: 60, archer: 70, occultist: 64, alchemist: 90, cleric: 82 });
      this.SLAM_GAP = 45;
      this.METEOR = Object.freeze({ ease: 2.3, endDrop: 18, trail: 4, trailStep: 28, trailAlpha: 0.33, headMs: 55, headScale: 1.15, headAnchor: [98, 64] });
      this.IMPACT = Object.freeze({ life: 650, burstMs: 46, burstFrames: 7, groundMs: 38, groundFrames: [3, 4, 5, 6, 7], emberMs: 27, emberFrames: 14, embers: [[-36, -18, 35], [38, -11, 80], [0, -44, 120]] });
      this.hasRaw = () => !!this.deps.stageSkillVfx.picture(2);
      this.WARLOCK_LIFT = -44;
      this.followEnemy = (id) => {
        const enemy = this.K.enemy(id);
        return () => enemy && this.K.enemy(id) === enemy && enemy.hp > 0 ? this.K.enemySpot(enemy) : null;
      };
      this.CLOCK = Object.freeze({ scale: 3.4, flat: 0.5, anchor: [24, 40], frame: 3, intervals: [1e3, 800, 600, 400], whole: 3e3, tail: 600, tailRate: 2.5, tailGrow: 0.12, fadeIn: 110, fadeOut: 200, alpha: 0.86 });
      this.CLOCK_PURPLE = /* @__PURE__ */ new Map([["0,255,249", [201, 162, 255]], ["0,183,255", [154, 95, 224]], ["255,249,252", [243, 234, 255]], ["34,101,188", [106, 63, 176]], ["32,58,158", [59, 31, 102]]]);
      this.MARK = Object.freeze({ life: 200, white: "#f3eaff", lit: "#c9a2ff", mid: "#9a5fe0", dark: "#6a3fb0", lift: -40 });
      this.latestClock = null;
    }
    /** @param {{gx:number,gy:number}} spot 닿는 칸 @param {number} delay 늦춤(ms) */
    cloudBurst(spot, delay) {
      for (const [name, x, y, wait, alpha, front, dx, dy] of this.CLOUD) {
        const ref = name + "@phys";
        this.deps.stageSkillVfx.play(ref, this.K.at(spot, x, y), { delay: delay + wait, alpha, layer: front ? "top" : "ground", tail: 100, move: { dx, dy, ms: this.deps.stageSkillVfx.clipLength(ref) } });
      }
    }
    /** 주인공 그림이 이번 프레임에 그 동작이면 그 장. 아니면 -1. */
    heroFrame(clip) {
      const drawn = this.deps.stageActors.pose();
      return drawn && drawn.pose.clip === clip ? drawn.pose.frame : -1;
    }
    /** 향로 머리의 자리(발에서 도트): 왼쪽을 보면 시뮬레이터처럼 1-x. 향로가 보이지 않는 장이면 null. */
    censerHead(heads, frame) {
      const row = heads[frame], left = this.deps.stageActors.facing() < 0;
      return row ? { x: left ? 1 - row[0] : row[0], y: row[1], rear: !!row[2] } : null;
    }
    /** 앞쪽 연기에 뚫는 작은 구멍: 쇠 향로 머리가 연기에 묻히지 않게 한다. */
    mistPocket(m) {
      const frame = this.heroFrame(m.clip), head = frame < 0 ? null : this.censerHead(m.heads, frame);
      if (!head) return null;
      return { spot: this.K.heroDrawn(), x: head.x - this.MIST.pocket[0] / 2, y: head.y - this.MIST.pocket[1] / 2, w: this.MIST.pocket[0], h: this.MIST.pocket[1] };
    }
    /** 향로 머리에서 나는 연기 둘: 그 자리에 남아 조금 떠오르고 흐른다(새 손을 따라가지 않는다). */
    mistPuff(m, head) {
      const spot = this.K.heroDrawn(), dir = Math.sign(head.x) || this.K.heroFace(), layer = head.rear ? "ground" : "top", pocket = head.rear ? null : () => this.mistPocket(m);
      const plume = this.deps.stageSkillVfx.clipLength(m.map.plume), vent = this.deps.stageSkillVfx.clipLength(m.map.vent);
      this.deps.stageSkillVfx.play(m.map.plume, this.K.at(spot, head.x + dir * 3, head.y - 9), { face: dir, alpha: this.MIST.plumeAlpha, layer, tail: this.MIST.tail, pocket, move: { dx: dir * this.MIST.drift * plume, dy: -this.MIST.lift * plume, ms: plume } });
      this.deps.stageSkillVfx.play(m.map.vent, this.K.at(spot, head.x, head.y - 6), { face: dir, alpha: this.MIST.ventAlpha, layer, tail: this.MIST.tail, pocket, move: { dx: dir * this.MIST.drift * 0.3 * vent, dy: -this.MIST.lift * 0.4 * vent, ms: vent } });
    }
    /** 몸 둘레의 연기 흐름 한 장: 허리를 경계로 위쪽은 몸 뒤, 아래쪽은 몸 앞에 그린다. */
    mistSweepHalf(m, rear, life) {
      const face = this.K.heroFace(), span = 4096, length = this.deps.stageSkillVfx.clipLength(m.map.sweep);
      this.deps.stageSkillVfx.paint(this.K.at(this.K.heroDrawn()), { life, layer: rear ? "ground" : "top", follow: this.K.heroDrawn }, (ctx, t, dot) => {
        const k = this.clamp(t / life, 0, 1), waist = this.MIST.waist * dot;
        ctx.beginPath();
        ctx.rect(-span, rear ? -span : waist, span * 2, rear ? span + waist : span);
        ctx.clip();
        this.deps.stageSkillVfx.stamp(ctx, m.map.sweep, k * length, { x: 0, y: waist, dot, face, alpha: this.MIST.sweepAlpha * Math.min(1, k * 5, (1 - k) * 5 + 0.2) });
      });
    }
    gothicPocket(m, spot) {
      return (ox, oy) => {
        if (!m.head) return null;
        const now = this.K.heroDrawn(), dx = (now.gx - spot.gx) * this.WIDE - ox, dy = (now.gy - spot.gy) * this.DEEP - oy, [fx, fy, fw, fh] = this.GOTHIC_MIST.face, [hx, hy, hw, hh] = this.GOTHIC_MIST.head;
        return [[dx + fx, dy + fy, fw, fh], [dx + m.head.x + hx, dy + m.head.y + hy, hw, hh]];
      };
    }
    gothicMistWatch(m, frame, time) {
      const G = this.deps.stageGothicRemakes, spot = this.K.heroDrawn();
      m.head = this.censerHead(m.heads, frame);
      if (frame >= this.GOTHIC_MIST.fieldFrom && !m.field) {
        m.field = true;
        G.incenseField(spot, this.GOTHIC_MIST.radius);
      }
      if (m.head && frame >= this.GOTHIC_MIST.emitFrom && frame <= this.GOTHIC_MIST.emitTo && time - m.emitted >= this.GOTHIC_MIST.spacing / m.rate) {
        m.emitted = time;
        G.incensePuff(spot, m.head, this.gothicPocket(m, spot));
      }
      return true;
    }
    /** 프레임마다: 동작이 3장에 닿으면 연기 흐름을 걸고, 3~7장 동안 도트 시간 44ms마다 연기를 낸다. 동작이 끝나면 그만 본다. */
    mistWatch(m, time) {
      const frame = this.heroFrame(m.clip);
      if (frame < 0) {
        m.head = null;
        return time - m.started < 200 && !m.seen;
      }
      m.seen = true;
      if (m.gothic) return this.gothicMistWatch(m, frame, time);
      if (frame >= this.MIST.sweepFrom && !m.swept) {
        m.swept = true;
        const life = this.framesLength(m.clip, this.MIST.sweepFrom, this.MIST.sweepTo) / m.rate;
        this.mistSweepHalf(m, true, life);
        this.mistSweepHalf(m, false, life);
      }
      const head = frame >= this.MIST.emitFrom && frame <= this.MIST.emitTo && time - m.emitted >= this.MIST.spacing / m.rate ? this.censerHead(m.heads, frame) : null;
      if (head) {
        m.emitted = time;
        this.mistPuff(m, head);
      }
      return true;
    }
    /** 향로를 휘두르기 시작할 때(사건의 censer 단계). 그 직업과 자세의 향로 회전 동작이 없으면(시험용 저장) 연기를 내지 않는다. */
    mistStart(c) {
      if (!c.first) return true;
      const classId = this.deps.getHeroAppearanceId(), heads = this.deps.STAGE_SKILL_VFX.censerHeads[classId], motion = this.deps.stageActors.motionFor(c.gem.meta.name, classId, this.deps.getStageHeroStance());
      const clip = this.deps.stageActors.clipOf(classId, this.deps.getStageHeroStance(), motion);
      if (!heads || !clip) return true;
      const m = {
        map: c.gem.map,
        heads,
        clip,
        rate: Number(c.event.holyRate) || 1,
        started: this.deps.stageSkillVfx.now(),
        emitted: -1e9,
        seen: false,
        swept: false,
        gothic: this.deps.stageGothicRemakes.ready(),
        head: null,
        field: false
      };
      const drawnHead = () => {
        const frame = this.heroFrame(clip);
        return frame < 0 ? null : this.censerHead(heads, frame);
      };
      if (m.gothic) this.deps.stageGothicRemakes.dressCenser(drawnHead, this.framesLength(clip, 0, clip.ms.length - 1) / m.rate + 200);
      this.deps.stageSkillVfx.watch((time) => this.mistWatch(m, time));
      return true;
    }
    /** 닿는 순간: 바닥 먼지, 고리, 앞으로 퍼지는 물결, 그리고 십자의 칸마다 가까운 곳부터 낙뢰(피해와 같은 때: js/skill-gem-casts.js stepJudgment). */
    slam(c) {
      if (!c.first) return true;
      const kit = c.gem.map.slam, event = c.event, rate = Number(event.judgmentRate) || 1, hero = this.K.heroSpot(), aim = event.landingCell, face = Math.sign(aim.gx - hero.gx) || this.K.heroFace();
      const x = face * (this.SLAM_REACH[this.deps.getHeroAppearanceId()] || 60), far = (aim.gx - hero.gx) * this.WIDE - x, deep = (aim.gy - hero.gy) * this.DEEP;
      const G = this.deps.stageGothicRemakes, gothic = G.ready();
      this.deps.stageSkillVfx.play(kit.dust, this.K.at(hero, x, 0), { face, layer: "ground", alpha: 0.65 });
      if (gothic) return this.gothicSlam(c, this.K.at(hero, x, 0), { face, far, deep, rate });
      this.deps.stageSkillVfx.play(kit.ring, this.K.at(hero, x, 0), { face, layer: "ground", alpha: 0.78 });
      this.deps.stageSkillVfx.play(kit.wave, this.K.at(hero, x, 0), { face, layer: "ground", alpha: 0.4, move: { dx: far, dy: deep, ms: Math.max(30, 90 / rate) } });
      (event.judgmentCells || []).forEach((cell, i) => {
        const delay = i * this.SLAM_GAP / rate;
        this.deps.stageSkillVfx.play(kit.bolt, this.K.at(cell, 0, 1), { delay, alpha: i ? 0.92 : 1 });
        if (!i) this.deps.stageSkillVfx.play(kit.core, this.K.at(cell, 0, 1), { delay, face: -1, alpha: 0.42 });
        this.deps.stageSkillVfx.play(kit.impact, this.K.at(cell, 0, 0), { delay, layer: "ground", alpha: i ? 0.58 : 0.8 });
      });
      return true;
    }
    /** 리메이크 V3.14.2(2026-11-10): 향로가 닿은 자리의 상아색 고리, 옅은 물결, 십자 칸마다 가는 금빛 낙뢰(피해와 같은 때)와 작은 고리, 십자를 잇는 바닥 선.
     * 밝은 가운데 빛(core)은 뺐다. */
    gothicSlam(c, contact, o) {
      const G = this.deps.stageGothicRemakes, kit = c.gem.map.slam, cells = c.event.judgmentCells || [];
      G.judgmentRing(contact, 0, 240);
      this.deps.stageSkillVfx.play(kit.wave, contact, { face: o.face, layer: "ground", alpha: 0.22, move: { dx: o.far, dy: o.deep, ms: Math.max(30, 90 / o.rate) } });
      if (cells.length) G.judgmentCross(c.event.landingCell, cells);
      cells.forEach((cell, i) => {
        const delay = i * this.SLAM_GAP / o.rate;
        G.judgmentBolt(this.K.at(cell, 0, 1), delay, !i);
        G.judgmentRing(this.K.at(cell, 0, 0), delay, 168);
      });
      return true;
    }
    meteorPose(f, t) {
      const q = Math.pow(this.clamp(t / f.ms, 0, 1), this.METEOR.ease);
      return { x: f.x0 + (f.x1 - f.x0) * q, y: f.y0 + (f.y1 - f.y0) * q };
    }
    /** 유성의 머리와 짧은 꼬리: 닿는 때는 그대로이고 화면의 머리만 가속해 떨어진다. */
    meteorFlight(centre, face, ms) {
      const f = { ms, x0: face * 150, y0: -360, x1: 0, y1: -40 + this.METEOR.endDrop }, angle = Math.atan2(f.y1 - f.y0, f.x1 - f.x0);
      const head = (ctx, t, alpha, scale) => {
        const p = this.meteorPose(f, t);
        this.raw(ctx, "fire8", Math.floor(t / this.METEOR.headMs) % 4, { x: p.x, y: p.y, rot: angle, alpha, scale: this.METEOR.headScale * scale, anchor: this.METEOR.headAnchor });
      };
      this.deps.stageSkillVfx.paint(this.K.at(centre), { life: ms }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        for (let i = this.METEOR.trail; i >= 1; i--) if (t - i * this.METEOR.trailStep >= 0) head(ctx, t - i * this.METEOR.trailStep, this.METEOR.trailAlpha * (1 - i / (this.METEOR.trail + 1)), 0.7 + 0.25 * (1 - i / this.METEOR.trail));
        head(ctx, t, 0.98, 1);
      });
    }
    /** 착탄: 작은 지면 화염, 큰 불 핵, 흩어지는 불티 셋. */
    meteorImpact(s) {
      if (!s.first) return;
      const groundEnd = this.IMPACT.groundFrames.length * this.IMPACT.groundMs, burstEnd = this.IMPACT.burstFrames * this.IMPACT.burstMs, emberEnd = this.IMPACT.emberFrames * this.IMPACT.emberMs;
      this.deps.stageSkillVfx.paint(this.K.at(s.area.centre), { life: this.IMPACT.life }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        if (t < groundEnd) this.raw(ctx, "fire6", this.IMPACT.groundFrames[Math.floor(t / this.IMPACT.groundMs)], { y: 2, alpha: 0.8 * Math.min(1, (groundEnd - t) / 65), scale: 1.05, anchor: [64, 112] });
        if (t < burstEnd) this.raw(ctx, "fire1", Math.floor(t / this.IMPACT.burstMs), { y: -42, alpha: 0.97 * Math.min(1, (burstEnd - t) / 90), scale: 1.65 });
        const fade = this.clamp((this.IMPACT.life - t) / 180, 0, 1);
        for (const [x, y, delay] of this.IMPACT.embers) {
          const age = t - delay;
          if (age >= 0 && age < emberEnd) this.raw(ctx, "fire4", Math.floor(age / this.IMPACT.emberMs), { x, y: y - age * 0.04, alpha: 0.75 * fade, scale: 0.42 });
        }
      });
    }
    /** 암흑 파열의 준비: 연무가 줄어들며 모이고 중심에 조짐이 맺힌다. */
    ruptureBrew(enemy, ms) {
      this.deps.stageSkillVfx.paint(this.K.at(this.K.enemySpot(enemy), 0, this.WARLOCK_LIFT), { life: ms, follow: this.followEnemy(enemy.id) }, (ctx, t, dot) => {
        const u = this.clamp(t / ms, 0, 1);
        ctx.scale(dot, dot);
        this.raw(ctx, "wl3", Math.min(7, Math.floor(u * 8)), { scale: 1.1 + (0.36 - 1.1) * u, alpha: 0.32 * Math.min(1, u * 5) });
        this.raw(ctx, "wl7", Math.min(2, Math.floor(u * 3)), { scale: 0.7, alpha: 0.65 * Math.min(1, u * 4) });
      });
    }
    /** 암흑 파열이 맞는 순간: 터짐 네 장, 낮게 남는 연무. */
    ruptureBurst(spot, id) {
      const burst = [3, 4, 5, 6], step = 45, cloud = 38, wait = 65, life = Math.max(burst.length * step, wait + 8 * cloud);
      this.deps.stageSkillVfx.paint(this.K.at(spot, 0, this.WARLOCK_LIFT), { life, follow: this.followEnemy(id) }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        if (t < burst.length * step) this.raw(ctx, "wl7", burst[Math.floor(t / step)], { scale: 0.83, alpha: 0.92 * Math.min(1, (life - t) / 60) });
        const q = t - wait;
        if (q >= 0 && q < 8 * cloud) this.raw(ctx, "wl3", Math.floor(q / cloud), { scale: 0.66, alpha: 0.25 * Math.min(1, (8 * cloud - q) / 90) });
      });
    }
    /** 심연 전염이 든 적: 작은 표식과 짧은 잔향. */
    infectionMark(spot, id, delay) {
      const mark = 36, cloud = 32;
      this.deps.stageSkillVfx.paint(this.K.at(spot, 0, this.WARLOCK_LIFT), { life: 8 * cloud, delay, follow: this.followEnemy(id) }, (ctx, t, dot) => {
        ctx.scale(dot, dot);
        if (t < 5 * mark) this.raw(ctx, "wl9", Math.floor(t / mark), { scale: 0.37, alpha: 0.82 * Math.min(1, (5 * mark - t) / 55) });
        if (t < 8 * cloud) this.raw(ctx, "wl3", Math.floor(t / cloud), { scale: 0.39, alpha: 0.23 * Math.min(1, (8 * cloud - t) / 70) });
      });
    }
    /** 다음 적으로 건너가는 덩어리와 꼬리(0.1초). */
    infectionHop(from, to) {
      const ms = 100, dx = (to.gx - from.gx) * this.WIDE, dy = (to.gy - from.gy) * this.DEEP, rot = Math.atan2(dy, dx);
      this.deps.stageSkillVfx.paint(this.K.at(from, 0, this.WARLOCK_LIFT), { life: ms }, (ctx, t, dot) => {
        const u = this.clamp(t / ms, 0, 1), frame = Math.min(4, Math.floor(u * 5)), back = Math.max(0, u - 0.18);
        ctx.scale(dot, dot);
        this.raw(ctx, "wl10", frame, { x: dx * back, y: dy * back, rot, scale: 0.53, alpha: 0.63 });
        this.raw(ctx, "wl9", frame, { x: dx * u, y: dy * u, rot, scale: 0.4, alpha: 0.92 });
      });
    }
    /** 맞은 적마다(js/canvas-stage-skill-rules.js). hit: { fx, victim, ... } */
    warlockHit(kind, hit) {
      const id = hit.fx.enemyId;
      if (kind === "rupture") {
        this.ruptureBurst(hit.victim, id);
        return;
      }
      const before = hit.fx.chainFromEnemyId == null ? null : this.K.enemy(hit.fx.chainFromEnemyId);
      if (before) this.infectionHop(this.K.enemySpot(before), hit.victim);
      this.infectionMark(hit.victim, id, before ? 60 : 0);
    }
    /** 시전 시작(js/canvas-stage-skill-rules.js): 암흑 파열은 대상에 조짐을 건다. fx.impactDelayMs가 준비 시간이다. */
    warlockWindup(owner, kind, fx) {
      if (kind !== "rupture") return;
      const spot = this.K.heroSpot(), live = (owner.enemies || []).filter((enemy) => enemy.hp > 0 && this.deps.hasGridCell(enemy));
      const near = live.sort((a, b) => this.deps.getGridUnitDistance(spot, a) - this.deps.getGridUnitDistance(spot, b))[0];
      if (near) this.ruptureBrew(near, Math.max(120, Number(fx.impactDelayMs) || 0));
    }
    /** 시계의 돈 각(라디안)과 크기: 게임의 지속 시간에 맞춰 네 구간을 늘리고, 마지막 구간은 꼬리까지 이어 돈다. */
    clockTurn(t, total) {
      const tailStart = Math.max(0, total - this.CLOCK.tail), stretch = total / this.CLOCK.whole, last = this.CLOCK.intervals.length - 1;
      let at = 0, weighted = 0;
      this.CLOCK.intervals.forEach((interval, i) => {
        const span = i === last ? Infinity : interval * stretch;
        weighted += this.clamp(Math.min(t, tailStart) - at, 0, span) * 1e3 / interval;
        at += span;
      });
      const tail = Math.max(0, t - tailStart);
      return { angle: (weighted + tail * this.CLOCK.tailRate) / 1300, grow: 1 + this.CLOCK.tailGrow * this.clamp(tail / this.CLOCK.tail, 0, 1) };
    }
    /** 맞은 자리의 틱 표시(0.2초): 가운데 십자(굵기 2, 길이 12도트), 반지름 5의 고리 점 열여섯, 0.09초까지 네 방향 8도트의 점. 흰빛에서 보라로 식는다. */
    clockMark(ctx, t, dot) {
      const [cross, ring] = t < 60 ? [this.MARK.white, this.MARK.white] : t < 130 ? [this.MARK.lit, this.MARK.white] : [this.MARK.dark, this.MARK.mid];
      ctx.scale(dot, dot);
      ctx.globalAlpha *= 1 - Math.max(0, t - 130) / 70 * 0.6;
      ctx.fillStyle = cross;
      ctx.fillRect(-1, -6, 2, 12);
      ctx.fillRect(-6, -1, 12, 2);
      ctx.fillStyle = ring;
      for (let q = 0; q < 16; q++) ctx.fillRect(Math.round(Math.cos(q / 8 * Math.PI) * 5) - 1, Math.round(Math.sin(q / 8 * Math.PI) * 5) - 1, 2, 2);
      if (t >= 90) return;
      ctx.fillStyle = this.MARK.mid;
      for (const [x, y] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    // 시계는 가장 최근의 것 하나만 보인다
    clockTicks(event, shown) {
      const rows = event.timeTickTargets || [];
      for (; shown.count < rows.length; shown.count++) for (const cell of rows[shown.count].cells || []) this.deps.stageSkillVfx.paint(this.K.at(cell, 0, this.MARK.lift), { life: this.MARK.life }, this.clockMark.bind(this));
    }
    /** 시간 가속: 발밑에 눕힌 보라 시계 한 장이 주인공을 따라가며 점점 빨리 돌고, 틱마다 맞은 자리에 보라 십자 매듭이 든다. 시간의 사선의 시계가 떠 있으면 그쪽을 먼저 보인다. */
    clock(c) {
      if (!c.first) return true;
      const event = c.event, total = Math.max(1, event.duration), token = this.latestClock = {}, shown = { count: 0 };
      this.deps.stageSkillVfx.paint(this.K.at(this.K.heroDrawn(), 0, 2), { life: total, layer: "ground", follow: this.K.heroDrawn }, (ctx, t, dot) => {
        this.clockTicks(event, shown);
        const fade = this.clamp(Math.min(t / this.CLOCK.fadeIn, (total - t) / this.CLOCK.fadeOut), 0, 1);
        if (this.latestClock !== token || !fade || this.deps.stageNewRunes.fieldBusy()) return;
        const turn = this.clockTurn(t, total);
        ctx.scale(dot, dot * this.CLOCK.flat);
        this.raw(ctx, "clock46", this.CLOCK.frame, { source: this.deps.stageNewRunes.tint("clock46", this.CLOCK_PURPLE), rot: turn.angle, scale: this.CLOCK.scale * turn.grow, anchor: this.CLOCK.anchor, alpha: this.CLOCK.alpha * fade });
      });
      return true;
    }
  };
  function createStageRuneRemakes(deps) {
    const instance = new StageRuneRemakes(deps);
    return Object.freeze({ cloudBurst: instance.cloudBurst.bind(instance), mistStart: instance.mistStart.bind(instance), slam: instance.slam.bind(instance), hasRaw: instance.hasRaw, meteorFlight: instance.meteorFlight.bind(instance), meteorImpact: instance.meteorImpact.bind(instance), warlockHit: instance.warlockHit.bind(instance), warlockWindup: instance.warlockWindup.bind(instance), clock: instance.clock.bind(instance) });
  }

  // modules/canvas-stage-rune-remakes-classic.mjs
  var native = createStageRuneRemakes({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stageNewRunes() {
      return stageNewRunes;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get stageActors() {
      return stageActors;
    },
    get stageGothicRemakes() {
      return stageGothicRemakes;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    },
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get getStageHeroStance() {
      return getStageHeroStance;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    }
  });
  var stageRuneRemakes = Object.freeze({
    cloudBurst: native.cloudBurst,
    mistStart: native.mistStart,
    slam: native.slam,
    hasRaw: native.hasRaw,
    meteorFlight: native.meteorFlight,
    meteorImpact: native.meteorImpact,
    warlockHit: native.warlockHit,
    warlockWindup: (kind, fx) => native.warlockWindup(game, kind, fx),
    clock: native.clock
  });
  safeExposeGlobals({ stageRuneRemakes });
})();
