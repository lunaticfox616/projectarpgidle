// GENERATED from modules/canvas-stage-skill-runes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-rune-air.mjs
  var StageRuneAir = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.airNow = null;
      this.airMove = null;
      this.drawnLift = (drawn) => Number(drawn.clip.lift) || 0;
      this.airLift = () => this.airNow ? this.airNow.lift : 0;
    }
    /** 몸이 뜨는 이동 룬의 공중 시간(ms, data/skills.js mobilityPattern.airMs), 포물선 높이(도트), 도는 각(인계의 startLeap, startFlip).
     * 공중제비(flip)는 높이 34도트로 한 바퀴, 도약은 거리에 따라 높이가 는다. 아니면 null. 2026-10-20 v42: 주인공 그림의 도약과 공중제비는
     * 그림이 스스로 뛰고 돌아서, 그림이 뜨는 높이(data/stage-characters.js lift)만큼 포물선을 낮추고 공중제비 그림이면 코드로 돌리지 않는다. */
    runeAir(gem, move) {
      const ms = Number(((this.deps.SKILL_DB[gem.meta.name] || {}).mobilityPattern || {}).airMs) || 0;
      if (!ms) return null;
      const drawn = this.heroMotionClip(gem.meta.name);
      return gem.map.flip ? this.flipAir(ms, drawn) : this.leapAir(ms, move, drawn);
    }
    flipAir(ms, drawn) {
      return drawn && drawn.motion === "flip" ? { ms, arc: Math.max(8, 34 - this.drawnLift(drawn)), spin: 0 } : { ms, arc: 34, spin: Math.PI * 2 };
    }
    leapAir(ms, move, drawn) {
      const arc = 38 + Math.hypot((move.to.gx - move.from.gx) * this.WIDE, (move.to.gy - move.from.gy) * this.DEEP * 2) * 0.12;
      return { ms, arc: drawn && drawn.motion === "leap" ? Math.max(12, arc - this.drawnLift(drawn)) : arc, spin: 0 };
    }
    /** 무대 주인공이 그 룬을 쓸 때 그리는 동작과 그 칸(js/canvas-stage-actors.js motionFor, clipOf). 무대가 아니거나 그 그림이 없으면 null. */
    heroMotionClip(name) {
      if (typeof this.deps.stageView !== "object" || typeof this.deps.getStageHeroStance !== "function") return null;
      const classId = this.deps.getHeroAppearanceId(), stance = this.deps.getStageHeroStance(), motion = this.deps.stageActors.motionFor(name, classId, stance), clip = this.deps.stageActors.clipOf(classId, stance, motion);
      return clip ? { motion, clip } : null;
    }
    /** 가장 최근의 이동(js/combat.js가 남긴 playerMobility). 목록에서 사라졌으면 마지막으로 본 것. 없으면 null. */
    latestMobility(now) {
      for (let i = this.deps.battleFx.length - 1; i >= 0; i--) {
        const fx = this.deps.battleFx[i];
        if (fx && fx.type === "playerMobility" && fx.start <= now) {
          this.airMove = fx;
          return fx;
        }
      }
      return this.airMove;
    }
    /** 이번 프레임 주인공의 공중 자세: 땅 위 자리(칸, 떠난 칸에서 닿는 칸으로), 높이(도트), 돈 각(라디안, 보는 쪽으로).
     * 가장 최근의 이동이 몸이 뜨는 룬이고 아직 공중이면, 아니면 null. */
    runeHeroAir(now) {
      const fx = this.latestMobility(now), gem = fx && fx.skillName && fx.fromCell && fx.toCell ? this.K.gemOf(fx.skillName) : null;
      const move = gem ? { from: fx.fromCell, to: fx.toCell } : null, air = move ? this.runeAir(gem, move) : null, k = air ? (now - fx.start) / air.ms : 1;
      this.airNow = k < 1 ? this.runeAirPose(move, air, k) : null;
      return this.airNow;
    }
    runeAirPose(move, air, k) {
      const face = Math.sign(move.to.gx - move.from.gx) || this.K.heroFace();
      return { gx: move.from.gx + (move.to.gx - move.from.gx) * k, gy: move.from.gy + (move.to.gy - move.from.gy) * k, lift: air.arc * 4 * k * (1 - k), rot: air.spin * k * face };
    }
  };
  function createStageRuneAir(deps) {
    const instance = new StageRuneAir(deps);
    return Object.freeze({ runeAir: instance.runeAir.bind(instance), runeHeroAir: instance.runeHeroAir.bind(instance), airLift: instance.airLift });
  }

  // modules/rendering/stage-skill-runes.mjs
  var StageSkillRunes = class {
    constructor(deps, motion) {
      this.deps = deps;
      this.motion = motion;
      this.K = this.deps.stageSkillKit;
      this.ST = this.deps.stageSkillStrokes;
      this.SP = this.deps.stageSkillSpells;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.seen = /* @__PURE__ */ new WeakSet();
      this.pulled = /* @__PURE__ */ new Map();
      this.POOL_OF = Object.freeze({ fire: "fire", cold: "cold", light: "light", chaos: "chaos", prism: "prism" });
      this.GENERIC_HIT = /^(star_burst|blood_burst|necro_burst|slime_burst|slash_h)(@|$)/;
      this.MELEE_KIND = /* @__PURE__ */ new Set(["strike", "whirl", "move"]);
      this.firstSight = (event, now) => now >= event.at && !this.seen.has(event) && !!this.seen.add(event);
      this.followEnemy = (id) => {
        const enemy = this.K.enemy(id);
        return () => enemy && this.K.enemy(id) === enemy && enemy.hp > 0 ? this.K.enemySpot(enemy) : null;
      };
      this.followHero = () => this.K.heroDrawn();
      this.patternOf = (gem) => this.deps.SKILL_DB[gem.meta.name] && this.deps.SKILL_DB[gem.meta.name].combatPattern || {};
      this.ringRadius = (fx) => Math.max(1, Number(fx.attackFootprint && fx.attackFootprint.radius) || 1);
      this.faceOf = (event) => {
        const band = event.footprint && event.footprint.band, target = event.targetCells && event.targetCells[0], source = event.sourceCell;
        return band && band.side || target && source && Math.sign(target.gx - source.gx) || this.K.heroFace();
      };
      this.rowsOf = (footprint) => footprint && footprint.band ? footprint.band.rows : 0;
      this.reachCellsOf = (footprint, fallback) => footprint && footprint.band ? footprint.band.reach : Math.max(1, Math.round((footprint && footprint.cone && footprint.cone.length || fallback) - 0.5));
      this.drawsSwing = (gem) => !!(gem.map.xcut || gem.map.vcut || gem.map.fan || gem.map.icering || gem.map.swing === "rise");
      this.VICTIM_PLAYS = Object.freeze([
        (gem, hit, o) => gem.map.swing === "rise" && o.first && this.ST.upCut(this.K.at(hit.victim), hit.look.face, this.followEnemy(hit.fx.enemyId)),
        (gem, hit, o) => gem.map.fuse && o.lead && this.ST.fuse(this.K.at(hit.victim), Math.max(120, this.stageGapMs(gem, 0)), this.followEnemy(hit.fx.enemyId)),
        (gem, hit, o, owner) => gem.map.frostmist && o.lead && this.ST.frostMist(this.K.at(this.K.heroSpot()), this.K.heroFace(), this.runeReach(owner, hit.fx), Number(hit.fx.enemyId) || 0),
        (gem, hit, o) => gem.map.strike && o.lead && this.deps.stageSkillVfx.play(gem.map.strike, this.K.at(hit.victim, 0, this.K.onGround(gem.map.strike) ? 1 : -46), { face: hit.look.face, ramp: hit.look.ramp, delay: 50 }),
        (gem, hit) => gem.map.rod && hit.fx.stageKind === "fieldStart" && gem.map.tick && this.runeRodTick(gem.map.tick, hit),
        (gem, hit) => gem.map.gash && this.runeGashPull(hit.fx, hit),
        (gem, hit) => gem.map.pillars && Number(hit.fx.stageIndex) > 0 && !Number(hit.fx.repeatIndex) && this.runePillarHit(gem, hit),
        (gem, hit) => gem.map.mark && gem.map.bolt && !Number(hit.fx.repeatIndex) && this.runeGuillotineBolt(gem, hit)
      ]);
      this.PFX_WAVE_ALPHA = 0.55;
      this.PFX_WAVE_FRAMES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 21, 22, 23, 25, 27, 29]);
      this.PFX_WAVE_TAIL_MS = 200;
      this.CLAIMS = Object.freeze([
        [(map) => map.slashwave, { travel: this.runeSlashWave.bind(this) }],
        [(map) => map.iceTrail, { travel: this.runeIceTrail.bind(this) }],
        [(map) => map.pfxWave, { travel: this.runePfxWave.bind(this) }],
        [(map) => map.rod, { stage: (gem, event) => Number(event.stageIndex) ? null : this.runeRod(gem, event) }],
        [(map) => map.mark && (map.bolt || map.pfxSmite), { windup: this.runeGuillotineStart.bind(this) }],
        // 타격은 victim이 맡고 단계 사건의 옛 그림은 막는다.
        [(map) => map.pillars, { stage: (gem, event) => Number(event.stageIndex) ? this.runePillars(gem, event) : null }],
        [(map) => map.ember, { stage: (gem, event) => Number(event.stageIndex) ? null : this.runeEmber(gem, event) }],
        [(map) => map.frostcone, { stage: this.runeFrostCone.bind(this) }],
        [(map) => map.rain, { windup: (gem, event, now) => Number(event.stageIndex) ? null : this.runeRainStart(gem, event, now), stage: (gem, event) => Number(event.stageIndex) ? null : this.runeRain(gem, event) }]
      ]);
      this.runeMoves = (gem) => !!(gem.map.charge || gem.map.flip || gem.map.kick || gem.map.impact) && gem.meta.kind === "move";
      this.runeBowFlash = (gem, element) => "p_bow@" + (element === "phys" ? "phys" : this.deps.STAGE_SKILL_VFX.elementRamp[element] || "phys");
    }
    /** 근접 공격이 앞으로 닿는 길이(도트): 범위 칸이 주인공에게서 가로로 뻗은 칸 수에 반 칸을 더한다(인계의 shape.b). */
    runeReach(owner, fx) {
      const cells = fx.attackFootprint && fx.attackFootprint.cells || [], hero = owner.gridPlayer;
      return (Math.max(1, ...cells.map((cell) => Math.abs(cell.gx - hero.gx))) + 0.5) * this.WIDE;
    }
    /** 그 룬의 단계 사이 시간(ms): 단계 표의 다음 단계가 늦는 만큼. */
    stageGapMs(gem, index) {
      const stages = this.deps.SKILL_DB[gem.meta.name] && this.deps.SKILL_DB[gem.meta.name].combatPattern && this.deps.SKILL_DB[gem.meta.name].combatPattern.stages || [];
      return stages[index + 1] && stages[index] ? stages[index + 1].delayMs - stages[index].delayMs : 0;
    }
    /** 같은 공격 단계의 그림 시작 시각. canvas-world-tree-fx stationaryEvents와 같은 시계이며 그 모듈을 역으로 호출하지 않는다. */
    stageArtAt(fx) {
      for (let i = this.deps.battleFx.length - 1; i >= 0 && fx.damageTextGroupId; i--) {
        const row = this.deps.battleFx[i];
        if (row && row.type === "combatTravel" && row.damageTextGroupId === fx.damageTextGroupId) return row.start + Math.max(1, row.flightMs || 1);
      }
      return null;
    }
    /** 코드로 그리는 휘두름: 그렸으면 참(그 룬의 휘두름 클립은 틀지 않는다). */
    runeSwing(owner, gem, fx, look) {
      const map = gem.map, hero = this.K.heroSpot(), repeat = Number(fx.repeatIndex) || 0, reach = this.runeReach(owner, fx);
      if (map.xcut) this.ST.crossCut(this.K.at(hero), look.face, reach, repeat);
      else if (map.vcut) this.ST.vCut(this.K.at(hero), look.face, reach);
      else if (map.swing === "rise") this.ST.riseSwing(this.K.at(hero), look.face, reach * 0.85, this.followHero);
      else if (map.fan) this.runeFan(gem, fx, look);
      else if (map.icering) this.runeIceRing(gem, fx, look);
      else return !!map.drag;
      return true;
    }
    /** 불사르기: 쐐기 끝까지 번지는 불길 앞면과, 무기 앞에서 쐐기 끝 다섯 방향으로 뿜어지는 불길 클립(가운데가 크고 멀리). 옆으로 치는 띠면
     * 불길이 첫 칸 안에 위아래 줄까지 번지고 클립도 그 줄들의 몸 높이로 뿜어진다. */
    runeFan(gem, fx, look) {
      const hero = this.K.heroSpot(), rows = this.rowsOf(fx.attackFootprint), cells = this.reachCellsOf(fx.attackFootprint, 3.5), Lp = cells * this.WIDE;
      this.ST.flameFan(this.K.at(hero), look.face, cells, hero.gx * 31 + hero.gy, rows);
      if (!gem.map.fanFlame) return;
      const sx = look.face * 30, sy = -44, spread = rows ? rows + 0.5 : cells / 2;
      [-1, -0.5, 0, 0.5, 1].forEach((k) => {
        const ex = look.face * Lp * (0.78 - Math.abs(k) * 0.12), ey = k * spread * this.DEEP * 0.75 - 30, rot = Math.atan2(ey - sy, Math.abs(ex - sx));
        this.deps.stageSkillVfx.play(gem.map.fanFlame, this.K.at(hero, sx + look.face * 20, sy), {
          face: look.face,
          ramp: look.ramp,
          delay: Math.abs(k) * 40,
          scale: 1.25 - Math.abs(k) * 0.3,
          alpha: 0.9,
          rot,
          move: { dx: ex - sx - look.face * 20, dy: ey - sy, ms: 300 }
        });
      });
    }
    /** 얼어붙은 고리: 휘두름마다 고리 하나. */
    runeIceRing(gem, fx, look) {
      this.SP.iceRing({ at: this.K.at(this.K.heroSpot()), face: look.face, radius: this.ringRadius(fx), wave: gem.map.iceWave, shard: gem.map.iceShard });
    }
    /** 맞은 적마다. lead: 이 타격이 그 공격의 휘두름을 냈다(묶음의 첫 타격). */
    runeVictim(owner, gem, hit, lead) {
      const o = { lead, first: !Number(hit.fx.stageIndex) && !Number(hit.fx.repeatIndex) };
      for (const play of this.VICTIM_PLAYS) play(gem, hit, o, owner);
    }
    /** 피뢰침의 첫 틱(장판이 서는 순간)에도 그 적에게 번개 금이 튄다(뒤 틱은 지속 타격의 규칙이 튼다). */
    runeRodTick(ref, hit) {
      this.deps.stageSkillVfx.play(ref, this.K.at(hit.victim, 0, this.K.onGround(ref) ? 0 : -40), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
    }
    /** 공허 가르기: 틈이 열릴 때 선 자리를 적어 두고, 닫히며 벨 때 끌려온 적이 있으면 그 길에 보라 꼬리 세 줄을 남긴다. */
    runeGashPull(fx, hit) {
      const id = fx.enemyId, stage = Number(fx.stageIndex) || 0;
      if (!stage) {
        if (this.pulled.size > 64) this.pulled.clear();
        this.pulled.set(id, { gx: hit.victim.gx, gy: hit.victim.gy });
        return;
      }
      const from = this.pulled.get(id);
      this.pulled.delete(id);
      if (!from || Math.hypot(hit.victim.gx - from.gx, hit.victim.gy - from.gy) < 0.3) return;
      const ink = this.ST.ink("chaos"), dx = (hit.victim.gx - from.gx) * this.WIDE, dy = (hit.victim.gy - from.gy) * this.DEEP, back = Math.sign(dx) * 8;
      this.deps.stageSkillVfx.paint(this.K.at(from), { life: 520 }, (ctx, t, dot) => {
        const a = t < 300 ? 0.7 : Math.max(0, 0.7 * (1 - (t - 300) / 220));
        ctx.scale(dot, dot);
        [[-28, ink.c2], [-46, ink.c1], [-64, ink.c2]].forEach(([h, colour], i) => {
          ctx.globalAlpha = a * (i === 1 ? 1 : 0.6);
          ctx.fillStyle = colour;
          this.ST.line(0, h, dx - back, dy + h, (x, y) => ctx.fillRect(x, y, 1, 1));
        });
      });
    }
    /** 참격파: 큰 베기 선, 바닥을 긁으며 나아가는 칼바람과 그것을 따라가는 연기 물결. 옆으로 치는 띠면 칼바람이 위아래 줄까지 덮게 높아지고
     * 줄마다 긁힌 자국과 연기 물결이 간다. */
    runeSlashWave(gem, event) {
      const from = event.sourceCell, face = this.faceOf(event), rows = this.rowsOf(event.footprint), ms = Math.max(120, event.duration), L = this.cellsAhead(event) * this.WIDE;
      this.ST.slashWave(this.K.at(from), face, L, ms, rows);
      if (!gem.map.smwave) return;
      for (let lane = -rows; lane <= rows; lane++) this.deps.stageSkillVfx.play(
        gem.map.smwave,
        this.K.at(from, face * 40, -26 + lane * this.DEEP),
        { face, delay: 40 + Math.abs(lane) * 30, alpha: lane ? 0.5 : 0.7, move: { dx: face * (L - 70), dy: 0, ms: ms + 120 } }
      );
    }
    /** 서리 파동: 파동이 지나는 칸마다 얼음 결정(바닥 앞뒤로 둘, 옆으로 치는 띠면 줄마다 하나). */
    runeIceTrail(gem, event) {
      const from = event.sourceCell, face = this.faceOf(event), rows = this.rowsOf(event.footprint), cells = this.cellsAhead(event), cellMs = event.duration / cells;
      const lanes = rows ? Array.from({ length: rows * 2 + 1 }, (_, i) => (i - rows) * 0.9) : [-0.45 * 0.75, 0.4 * 0.75];
      for (let i = 0; i < cells; i++) lanes.forEach((k, j) => this.deps.stageSkillVfx.play(
        gem.map.iceTrail,
        this.K.at(from, face * (i + 0.55 + j % 2 * 0.25) * this.WIDE, k * this.DEEP),
        { face: (i + j) % 2 ? -face : face, delay: i * cellMs + j * 50, layer: k < 0 ? "ground" : "top" }
      ));
    }
    runePfxWave(gem, event) {
      const face = this.faceOf(event), rows = this.rowsOf(event.footprint);
      for (let lane = -rows; lane <= rows; lane++) this.deps.stageSkillVfx.play(gem.map.pfxWave, this.K.at(event.sourceCell, face * 8, 1 + lane * this.DEEP), { face, delay: Math.abs(lane) * 30, alpha: this.PFX_WAVE_ALPHA * (lane ? 0.8 : 1), order: this.PFX_WAVE_FRAMES, tail: this.PFX_WAVE_TAIL_MS });
    }
    /** 나아가는 그림이 지나는 칸 수: 띠의 길이, 아니면 대상 칸까지의 가로 칸 수. */
    cellsAhead(event) {
      const band = event.footprint && event.footprint.band;
      return band ? band.reach : Math.max(1, Math.round(Math.abs(event.targetCells[0].gx - event.sourceCell.gx)));
    }
    /** 부싯돌 베기: 떠나는 순간 휘두르고, 지나간 바닥이 그을리고, 나는 동안 바닥에 선 초승달 불길이 손 높이보다 낮게 달린다. */
    runeFlint(owner, gem, event, view, hooks) {
      const elapsed = view.now - event.at, lift = event.aloft ? this.deps.PROJECTILE_FLIGHT_LIFT : 0;
      if (this.firstSight(event, view.now)) {
        const from = { gx: event.sourceCell.gx, gy: event.sourceCell.gy + lift }, face = this.faceOf(event), L = Math.hypot((event.targetCells[0].gx - event.sourceCell.gx) * this.WIDE, (event.targetCells[0].gy - event.sourceCell.gy) * this.DEEP);
        hooks.swing(owner, gem, { face, ramp: this.K.ramp(gem, event.element) });
        this.ST.scorch(this.K.at(from), face, event.duration, (t) => L * Math.min(1, t / Math.max(1, event.duration)));
      }
      if (elapsed < 0 || elapsed >= event.duration) return;
      const spot = this.K.along(event, elapsed), at = this.K.screen(view.projection, { gx: spot.gx, gy: spot.gy + lift }), ctx = view.ctx;
      ctx.save();
      ctx.translate(Math.round(at.x), Math.round(at.y));
      ctx.scale(spot.face * at.dot, at.dot);
      ctx.imageSmoothingEnabled = false;
      this.deps.stageSkillVfx.stamp(ctx, gem.map.flintTail, elapsed, { x: -25, y: -3, dot: 1, face: 1, alpha: 0.38 });
      this.deps.stageSkillVfx.stamp(ctx, gem.map.flintBlade, 0, { x: 0, y: 0, dot: 1, face: 1 });
      ctx.restore();
    }
    /** 피뢰침: 검끝에서 번개가 치고, 검끝에 구슬이 맺혀 따라다니고, 틱마다 발밑에 번개 금이 퍼진다. */
    runeRod(gem, event) {
      const rod = gem.map.rod, hero = this.K.heroSpot(), face = this.K.heroFace(), pattern = this.patternOf(gem), hits = Number(pattern.hits) || 4, every = Number(pattern.intervalMs) || 220;
      this.deps.stageSkillVfx.play(rod.bolt, this.K.at(hero, face * 8, -112), { face });
      this.deps.stageSkillVfx.play(rod.orb, this.K.at(hero, face * 8, -112), { face, life: hits * every + 120, delay: 60, follow: this.followHero });
      for (let i = 0; i < hits; i++) this.deps.stageSkillVfx.play(rod.ring, this.K.at(hero, 0, -2), { face: i % 2 ? -face : face, layer: "ground", alpha: 0.8, delay: i * every, follow: this.followHero });
      return event;
    }
    /** 신성한 단두대: 시전 때 정한 후보들의 머리 위에 표식과 단두대가 선다. 벼락은 실제 피격 사건에서 따로 낸다. */
    runeGuillotineStart(gem, event, now) {
      const face = this.K.heroFace(), wait = Math.max(0, event.duration - (now - event.at)), map = gem.map;
      if (map.wings) this.deps.stageSkillVfx.play(map.wings, this.K.at(event.sourceCell, 0, -30), { face, layer: "ground", alpha: 0.7 });
      for (const id of new Set(event.targetIds || [])) {
        const enemy = this.K.enemy(id);
        if (!enemy || !(enemy.hp > 0)) continue;
        const spot = this.K.enemySpot(enemy);
        if (map.mark) this.deps.stageSkillVfx.play(map.mark, this.K.at(spot, 0, this.K.onGround(map.mark) ? 1 : -46), { face, alpha: 0.85, delay: Math.max(0, wait - 300) });
        this.SP.guillotine(this.K.at(spot), Math.max(0, wait - 150));
        if (map.pfxSmite) this.deps.stageSkillVfx.play(map.pfxSmite, this.K.at(spot, 0, 1), { face, delay: Math.max(0, wait - 190) });
      }
    }
    /** 첫 반복의 실제 피격 위치에만 낙뢰를 낸다. 이번 타격으로 쓰러진 적도 같은 연출을 받는다. */
    runeGuillotineBolt(gem, hit) {
      const face = this.K.heroFace(), map = gem.map;
      this.deps.stageSkillVfx.play(map.bolt, this.K.at(hit.victim, 0, 1), { face });
      if (map.boltGround) this.deps.stageSkillVfx.play(map.boltGround, this.K.at(hit.victim, 0, 1), { face, layer: "ground", delay: 30 });
    }
    /** 혹한의 지진의 둘째 단계: 친 자리(몸 앞 반 칸)에서 앞 쐐기를 따라 얼음이 솟는다(옆으로 치는 띠면 줄마다). */
    runePillars(gem, event) {
      const face = this.faceOf(event), from = event.sourceCell, origin = { gx: from.gx + face * 0.5, gy: from.gy };
      this.SP.frostQuake({ at: this.K.at(origin), face, L: this.reachCellsOf(event.footprint, 3.5), rowMs: gem.map.pillars, rows: this.rowsOf(event.footprint), clips: gem.map.quake });
    }
    /** 실제 피격 대상의 얼음 더미. 전투 틱 때문에 늦게 온 타격은 줄의 시각으로 보정하고, 이미 지났으면 지금부터 온전히 그린다. */
    runePillarHit(gem, hit) {
      const from = hit.fx.sourceCell, ahead = Math.max(0, Math.abs(hit.victim.gx - from.gx) - 0.5), artAt = this.stageArtAt(hit.fx);
      const delay = Math.max(0, ahead * gem.map.pillars + 60 - (artAt === null ? 0 : hit.now - artAt));
      this.SP.frostErupt({ at: this.K.at(hit.victim), delay, clips: gem.map.quake, seed: Number(hit.fx.enemyId) || 0 });
    }
    /** 불씨의 함성: 첫 단계에 외침, 불씨 앞면, 둘레 폭발, 타는 바닥을 한 번에 건다(뒤 단계는 바닥이 타는 동안이다). */
    runeEmber(gem, event) {
      const stages = this.patternOf(gem).stages || [], total = (stages.length ? stages[stages.length - 1].delayMs : 1200) + 260;
      this.SP.emberShout({ at: this.K.at(event.sourceCell), radius: Number(event.footprint && event.footprint.radius) || 2, wave: 90, total, clips: gem.map.ember });
    }
    runeFrostCone(gem, event) {
      this.SP.frostCone({
        at: this.K.at(event.sourceCell),
        face: this.faceOf(event),
        L: this.reachCellsOf(event.footprint, 4.5),
        wave: Number(this.patternOf(gem).waveMsPerCell) || 100,
        smwave: gem.map.smwave,
        rows: this.rowsOf(event.footprint)
      });
    }
    /** 화살비: 첫 단계의 시전에 화살 다섯 발을 쏘아 올리고(떠나는 때에), 첫 단계가 닿을 때 범위에 화살비가 내린다(남은 단계 동안). */
    runeRainStart(gem, event, now) {
      const stages = this.patternOf(gem).stages || [], release = Math.max(0, event.duration - (stages[0] && stages[0].delayMs || 380) - (now - event.at));
      this.SP.volleyUp(this.K.at(event.sourceCell), this.faceOf(event), release);
    }
    runeRain(gem, event) {
      const stages = this.patternOf(gem).stages || [], span = stages.length > 1 ? stages[stages.length - 1].delayMs - stages[0].delayMs : 880, fp = event.footprint || {};
      this.SP.arrowRain({ at: this.K.at(fp.center || event.targetCells[0]), face: this.faceOf(event), radius: Number(fp.radius) || 1, ms: span + 120 });
    }
    /** @returns {?boolean} 이 룬의 그림 사건을 여기서 맡으면 참(예전 그림은 그리지 않는다), 다루지 않으면 null */
    runeClaim(owner, gem, event, view, hooks) {
      if (gem.map.drag && event.kind === "travel") {
        this.runeFlint(owner, gem, event, view, hooks);
        return true;
      }
      const row = this.CLAIMS.find(([has]) => has(gem.map));
      if (!row) return null;
      const play = row[1][event.kind];
      if (play && this.firstSight(event, view.now)) play(gem, event, view.now);
      return gem.map.pillars && event.kind === "stage" && !Number(event.stageIndex) ? null : true;
    }
    /** 시전 시작: 부싯돌 베기는 타격 전까지 무기 끝이 바닥을 긁어 불티가 튄다. */
    runeWindup(gem, fx) {
      if (!gem.map.drag) return;
      const hero = this.K.heroSpot();
      this.ST.dragSpark(this.K.at(hero), this.K.heroFace(), Math.max(200, Number(fx.impactDelayMs) || 0), hero.gx * 13 + hero.gy);
    }
    /** 이동 칸의 룬: 박차고 나가는 먼지, 달리는 동안의 공기 활(돌진)이나 무기 궤적(섬머솔트 슬래시), 착지 자리의 충격.
     * @param {{from:object, to:object, ms:?number}} move 떠난 칸, 닿는 칸, 옮겨 가는 시간 */
    runeMobility(gem, move) {
      const map = gem.map, face = Math.sign(move.to.gx - move.from.gx) || this.K.heroFace(), air = this.motion.runeAir(gem, move), ms = air ? air.ms : Math.max(120, move.ms || 280);
      const follow = this.followHero;
      if (map.kick) this.runeKick(map, move, face);
      if (map.charge) this.SP.charge({ at: this.K.at(move.from), follow, face, ms });
      if (map.flip) this.SP.flipTrail({ at: this.K.at(move.from), follow, face, ms, lift: this.motion.airLift });
      this.runeLanding(map, move.to, { face, ms });
    }
    /** 착지 자리의 충격 클립들: 도약 강타는 몸 앞 0.6칸, 섬머솔트 슬래시는 0.9칸에서 차례로(첫째는 바닥 층). */
    runeLanding(map, to, o) {
      [].concat(map.impact || []).forEach((ref, k) => this.deps.stageSkillVfx.play(
        ref,
        this.K.at(to, o.face * (map.flip ? 0.9 : 0.6) * this.WIDE + (k === 3 ? o.face * 18 : 0), this.K.onGround(ref) ? 1 : -30),
        { face: o.face, delay: o.ms + k * 30, layer: k === 0 ? "ground" : "top" }
      ));
    }
    /** 박차고 나가는 먼지: 돌진은 등 뒤로 작게, 도약은 발밑에. */
    runeKick(map, move, face) {
      const charge = !!map.charge;
      this.deps.stageSkillVfx.play(map.kick, this.K.at(move.from, charge ? -face * 10 : 0, 1), { face: charge ? -face : face, layer: "ground", scale: charge ? 0.7 : 0.8, alpha: charge ? 0.6 : 0.7 });
    }
    /** 활을 들고 쏘는 화살 룬의 마법 화살(인계: 활일 때만): { arrow, exp }. 활이 아니거나 정하지 않은 룬이면 null. */
    runeBow(gem) {
      return gem.map.bow && typeof this.deps.getEquippedWeaponStance === "function" && this.deps.getEquippedWeaponStance() === "bow" ? gem.map.bow : null;
    }
    /** 맞은 적의 타격 클립: 룬이 정한 것(공용 폭발은 빼고), 없으면 속성의 묶음에서 하나. 'none'이면 없다. kind: 근접 갈래면 물리는 근접 묶음. */
    runeHitRefs(gem, element) {
      const own = Array.isArray(gem.map.hit) ? gem.map.hit[0] : gem.map.hit, pool = this.deps.STAGE_SKILL_VFX.hitPool;
      if (own === "none") return [];
      if (own && !this.GENERIC_HIT.test(own)) return [own];
      if (gem.map.ramp === "blood") return pool.blood;
      if (element === "phys" || !this.POOL_OF[element]) return pool[this.MELEE_KIND.has(gem.meta.kind) ? "physM" : "physR"];
      return pool[this.POOL_OF[element]];
    }
    runeHitRef(gem, element) {
      const bow = this.runeBow(gem);
      if (bow) return bow.exp;
      const refs = this.runeHitRefs(gem, element);
      return refs.length ? refs[Math.floor(Math.random() * refs.length)] : null;
    }
  };
  function createStageSkillRunes(deps) {
    const motion = createStageRuneAir(deps);
    const instance = new StageSkillRunes(deps, motion);
    return Object.freeze({ heroAir: motion.runeHeroAir, swing: instance.runeSwing.bind(instance), drawsSwing: instance.drawsSwing, victim: instance.runeVictim.bind(instance), claim: instance.runeClaim.bind(instance), windup: instance.runeWindup.bind(instance), moves: instance.runeMoves, mobility: instance.runeMobility.bind(instance), bow: instance.runeBow.bind(instance), bowFlash: instance.runeBowFlash, hitRef: instance.runeHitRef.bind(instance), hitRefs: instance.runeHitRefs.bind(instance) });
  }

  // modules/canvas-stage-skill-runes-classic.mjs
  var native = createStageSkillRunes({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stageSkillStrokes() {
      return stageSkillStrokes;
    },
    get stageSkillSpells() {
      return stageSkillSpells;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get battleFx() {
      return battleFx;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get PROJECTILE_FLIGHT_LIFT() {
      return PROJECTILE_FLIGHT_LIFT;
    },
    get stageView() {
      return typeof stageView === "undefined" ? void 0 : stageView;
    },
    get getStageHeroStance() {
      return typeof getStageHeroStance === "undefined" ? void 0 : getStageHeroStance;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    },
    get stageActors() {
      return stageActors;
    },
    get getEquippedWeaponStance() {
      return typeof getEquippedWeaponStance === "undefined" ? void 0 : getEquippedWeaponStance;
    },
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    }
  });
  var stageSkillRunes = Object.freeze({
    swing: (gem, fx, look) => native.swing(game, gem, fx, look),
    drawsSwing: native.drawsSwing,
    victim: (gem, hit, lead) => native.victim(game, gem, hit, lead),
    claim: (gem, event, view, hooks) => native.claim(game, gem, event, view, hooks),
    windup: native.windup,
    moves: native.moves,
    mobility: native.mobility,
    bow: native.bow,
    bowFlash: native.bowFlash,
    hitRef: native.hitRef,
    hitRefs: native.hitRefs,
    heroAir: native.heroAir
  });
  safeExposeGlobals({ stageSkillRunes });
})();
