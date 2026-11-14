// GENERATED from modules/canvas-stage-skill-rules*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-skill-areas.mjs
  var StageSkillAreas = class {
    constructor(deps) {
      this.deps = deps;
      this.K = this.deps.stageSkillKit;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.ZONE_DELAY = 330;
      this.rulePlayArea = (s) => this.ruleFillArea(s.map.area, s.area, { face: s.look.face, ramp: s.look.ramp, delay: s.map.swing ? 40 : 0, life: s.long, nextLife: Math.max(300, s.long - 700) });
      this.rulePlayRing = (s) => this.ruleFillArea(s.map.ring, { ...s.area, radius: 0 }, { face: s.look.face, ramp: s.look.ramp });
      this.rulePlayLand = (s) => this.deps.stageSkillVfx.play(s.map.land, this.K.at(s.area.centre, 0, this.K.onGround(s.map.land) ? 1 : -30), { face: s.look.face, ramp: s.look.ramp });
      this.rulePlayMeteor = (s) => this.deps.stageRuneRemakes.hasRaw() ? this.deps.stageRuneRemakes.meteorImpact(s) : this.deps.stageSkillVfx.play("mush@fire", this.K.at(s.area.centre, 0, 1), { face: s.look.face, ramp: s.look.ramp });
      this.STAGE_PLAYS = Object.freeze([["suck", this.rulePlaySuck.bind(this)], ["area", this.rulePlayArea], ["ring", this.rulePlayRing], ["area2", this.rulePlayRocks.bind(this)], ["land", this.rulePlayLand], ["seep", this.ruleSeepMist.bind(this)], ["drop", this.rulePlayDrops.bind(this)], ["meteor", this.rulePlayMeteor], ["zone", this.rulePlayZone.bind(this)]]);
    }
    /** 범위 가장자리의 안개가 가운데로 천천히 흘러들고(절반은 몸 앞으로), 바닥에 낮게 깔린다. */
    ruleSeepMist(s) {
      const ref = s.map.seep, a = (s.area.radius + 0.5) * this.WIDE, b = (s.area.radius + 0.5) * this.DEEP, ms = Math.max(700, s.long - 250);
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * Math.PI * 2 + i % 2 * 0.31, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
        this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, x * 1.05, y * 1.05 - 12), {
          face: x < 0 ? -1 : 1,
          ramp: s.look.ramp,
          delay: i * 40,
          alpha: i % 2 ? 0.22 : 0.32,
          layer: i % 2 ? "top" : "ground",
          move: { dx: -x * 0.75, dy: -y * 0.75, ms }
        });
      }
      for (let j = 0; j < 3; j++) this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, (j - 1) * 26, -8), { face: j % 2 ? -1 : 1, ramp: s.look.ramp, delay: 260 + j * 150, alpha: 0.22, layer: "ground" });
    }
    /** 범위의 가운데와 반지름(칸). */
    ruleAreaOf(event) {
      const fp = event.footprint || {}, centre = fp.center || event.targetCells[0] || event.sourceCell;
      return { centre: { gx: centre.gx, gy: centre.gy }, radius: Number(fp.radius) || 0 };
    }
    /** 범위를 채울 자리들(도트): 가운데 하나, 범위가 클립보다 넓으면 둘레에 넷, 훨씬 넓으면 모서리에 넷 더(시간차로). 큰 클립은 가운데 하나만. */
    ruleFillSpots(clip, area, width) {
      const a = (area.radius + 0.5) * this.WIDE, b = (area.radius + 0.5) * this.DEEP, spots = [[0, 0, 0]];
      if (clip.one) return spots;
      if (a > width * 0.65) [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].forEach(([x, y], i) => spots.push([a * x, b * y, 60 + i * 20]));
      if (a > width * 1.4) [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, y], i) => spots.push([a * 0.62 * x, b * 0.62 * y, 130 + i * 20]));
      return spots;
    }
    ruleFillArea(ref, area, o) {
      const clip = this.deps.stageSkillVfx.clipOf(ref);
      if (!clip) return;
      const lift = clip.an === "bottom" ? 0 : -30;
      this.ruleFillSpots(clip, area, this.deps.stageSkillVfx.clipWidth(ref)).forEach(([dx, dy, delay], index) => this.deps.stageSkillVfx.play(
        ref,
        this.K.at(area.centre, dx, dy + lift),
        { face: o.face, ramp: o.ramp, delay: (o.delay || 0) + delay, alpha: index ? 0.85 : 1, life: o.life, nextLife: o.nextLife, layer: o.layer }
      ));
    }
    /** 대지의 함성: 몸에서 퍼지는 고리 셋, 바닥의 파문 둘, 좌우로 터지는 바람. */
    rulePlayShout(shout, look) {
      const hero = this.K.heroSpot();
      [0.6, 0.95, 1.3].forEach((scale, index) => this.deps.stageSkillVfx.play(shout.ring, this.K.at(hero, 0, -48), { ramp: look.ramp, delay: index * 110, scale, alpha: 1 - index * 0.22 }));
      [0, 160].forEach((delay, index) => this.deps.stageSkillVfx.play(shout.ground, this.K.at(hero, 0, 1), { ramp: look.ramp, delay, scale: 1 + index * 0.5, alpha: 0.9 - index * 0.3, layer: "ground" }));
      for (const side of [1, -1]) this.deps.stageSkillVfx.play(shout.burst, this.K.at(hero, side * 30, -50), { ramp: look.ramp, face: side, delay: 40, scale: 0.8, alpha: 0.8 });
    }
    /** 중력 붕괴: 둘레의 먼지가 가운데로 빨려 든다. */
    rulePlaySuck(s) {
      const a = (s.area.radius + 0.5) * this.WIDE * 0.9, b = (s.area.radius + 0.5) * this.DEEP * 0.9;
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * Math.PI * 2 + 0.4, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
        this.deps.stageSkillVfx.play(s.map.suck, this.K.at(s.area.centre, x, y + 1), { face: x < 0 ? 1 : -1, ramp: s.look.ramp, delay: i * 20, alpha: 0.85, layer: "ground", move: { dx: -x * 0.85, dy: -y * 0.85, ms: 300 } });
      }
    }
    /** 난타 눈보라: 범위 안의 여기저기에 고드름이 떨어지고 닿은 자리에서 얼음이 터진다. */
    rulePlayDrops(s) {
      const rng = this.deps.createSeededRng(`drops:${Math.round(this.deps.stageSkillVfx.now())}`), count = Math.max(4, Math.round(s.long / 240)), reach = s.area.radius + 0.4;
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2, far = Math.sqrt(rng()), x = Math.cos(angle) * far * reach * this.WIDE, y = Math.sin(angle) * far * reach * this.DEEP, delay = i * (s.long / count);
        this.deps.stageSkillVfx.play(s.map.drop, this.K.at(s.area.centre, x, y - 6), { ramp: s.look.ramp, delay, life: 140, fall: { from: -90 - rng() * 30, to: 0, ms: 140 } });
        if (s.map.tick) this.deps.stageSkillVfx.play(s.map.tick, this.K.at(s.area.centre, x, y + 20), { ramp: s.look.ramp, delay: delay + 140, scale: 0.8 });
      }
    }
    rulePlayRocks(s) {
      [].concat(s.map.area2).forEach((ref, index) => this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, 0, this.K.onGround(ref) ? 1 : -46), { face: s.look.face, ramp: s.look.ramp, delay: 320 + index * 40 }));
    }
    /** 유성 낙화의 불타는 지대: 첫 단계(충돌)에 한 번, 땅 불길 틱(data/skills.js combatPattern groundHits × groundIntervalMs)이 끝날 때까지 남는다. */
    rulePlayZone(s) {
      if (!s.first) return;
      const pattern = (this.deps.SKILL_DB[s.gem.meta.name] || {}).combatPattern || {};
      const ticksMs = Math.max(1, Number(pattern.groundHits) || 1) * Math.max(0, Number(pattern.groundIntervalMs) || 0);
      this.deps.stageSkillSpells.fireZone({ at: this.K.at(s.area.centre), radius: s.area.radius, delay: this.ZONE_DELAY, life: Math.max(400, ticksMs + 200 - this.ZONE_DELAY) });
    }
    /** 닿는 순간의 범위 연출. 여진(강타의 둘째 단계)은 그 범위에 여진 클립을 깐다. */
    rulePlayStage(gem, event, look) {
      const s = { gem, map: gem.map, area: this.ruleAreaOf(event), look, long: Math.max(400, event.duration || 0), first: !Number(event.stageIndex) };
      if (gem.map.shout) {
        this.rulePlayShout(gem.map.shout, look);
        return;
      }
      if (gem.map.after && Number(event.stageIndex) > 0) {
        this.rulePlayAfter(gem, s, look);
        return;
      }
      for (const [hook, play] of this.STAGE_PLAYS) if (gem.map[hook]) play(s);
    }
    /** 여진(뒤 단계): 그 범위에 여진 클립을 깐다. afterOne이면 가운데 하나만 afterScale 크기로(폭발성 타격의 불씨 폭발). */
    rulePlayAfter(gem, s, look) {
      const ref = gem.map.after;
      if (gem.map.afterCore) {
        this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, 0, -gem.map.afterHeight), { face: look.face, alpha: 0.78 });
        this.deps.stageSkillVfx.play(gem.map.afterCore, this.K.at(s.area.centre, 0, -gem.map.afterHeight), { face: look.face });
        return;
      }
      if (!gem.map.afterOne) {
        this.ruleFillArea(ref, s.area, { face: look.face, ramp: look.ramp });
        return;
      }
      this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, 0, this.K.onGround(ref) ? 1 : -30), { face: look.face, ramp: look.ramp, scale: gem.map.afterScale || 1 });
    }
    /** 예비 동작(windup)의 연출: 유성은 높고 먼 곳에서 범위 가운데로 떨어진다. */
    rulePlayWindup(gem, event, look) {
      if (!gem.map.fall) return;
      const area = this.ruleAreaOf(event), ms = Math.max(200, event.duration || 360);
      if (gem.map.meteor && this.deps.stageRuneRemakes.hasRaw()) {
        this.deps.stageRuneRemakes.meteorFlight(area.centre, look.face, ms);
        return;
      }
      this.deps.stageSkillVfx.play(gem.map.fall, this.K.at(area.centre, look.face * 150, -360), { face: look.face, ramp: look.ramp, life: ms, move: { dx: -look.face * 150, dy: 320, ms } });
    }
  };
  function createStageSkillAreas(deps) {
    const instance = new StageSkillAreas(deps);
    return Object.freeze({ ruleFillArea: instance.ruleFillArea.bind(instance), rulePlayStage: instance.rulePlayStage.bind(instance), rulePlayWindup: instance.rulePlayWindup.bind(instance) });
  }

  // modules/rendering/stage-skill-rules.mjs
  var StageSkillRules = class {
    constructor(deps, areas) {
      this.deps = deps;
      this.areas = areas;
      this.K = this.deps.stageSkillKit;
      this.WIDE = this.K.WIDE;
      this.DEEP = this.K.DEEP;
      this.BODY = this.K.BODY;
      this.REACH = 80;
      this.ROT_MS = 2e3;
      this.WAVE_FRONT = 10;
      this.WAVE_DRIFT = 0.35;
      this.WAVE_BASE = -51;
      this.handled = /* @__PURE__ */ new WeakSet();
      this.swung = /* @__PURE__ */ new Map();
      this.struck = /* @__PURE__ */ new Map();
      this.rots = /* @__PURE__ */ new Map();
      this.rotWatch = { on: false, seen: -1e9 };
      this.PLAIN_SWING = "crescent";
      this.CAST_SWING = /* @__PURE__ */ new Set([52]);
      this.STAGE_HOOKS = Object.freeze(["shout", "suck", "area", "ring", "area2", "land", "seep", "drop", "orb", "zone", "warlock"]);
      this.ruleBandRows = (fx) => fx.attackFootprint && fx.attackFootprint.band ? fx.attackFootprint.band.rows : 0;
      this.ruleLeadHit = (fx) => !fx.stageKind || fx.stageKind === "primary" || !Number(fx.stageIndex);
      this.ruleFirstHit = (fx) => !Number(fx.stageIndex) && !Number(fx.repeatIndex) && !/tick/i.test(String(fx.stageKind));
      this.ECHO_SIGIL_MS = 220;
      this.ECHO_AURA_MS = 140;
      this.ECHO_SPACING = 140;
      this.echoed = /* @__PURE__ */ new Map();
      this.ruleCastsAtHand = (gem, fx) => gem.meta.cast && !this.K.firedFromBow(fx.skillName);
      this.TAKES = Object.freeze({
        windup: (gem) => this.ruleSwings(gem) || !!gem.map.fall || !!gem.map.drop,
        stage: (gem) => this.ruleSwings(gem) || gem.meta.kind === "chain" || this.STAGE_HOOKS.some((hook) => gem.map[hook]),
        travel: (gem) => !!gem.map.wave && gem.map.wave !== "none"
      });
      this.ruleTakes = (gem, kind) => !gem.map.old && !!this.TAKES[kind] && this.TAKES[kind](gem);
      this.EVENT_PLAYS = Object.freeze({ windup: this.areas.rulePlayWindup.bind(this), stage: this.areas.rulePlayStage.bind(this), travel: this.rulePlayMuzzle.bind(this) });
      this.RUNE_HOOKS = Object.freeze({ swing: (owner, gem, look) => this.ruleSwingClip(owner, gem, { repeatIndex: 0 }, look) });
      this.PRISM = Object.freeze(["fire", "cold", "light"]);
      this.ruleOwns = (skillName) => this.deps.stageSkillVfx.ready() && !!this.K.gemOf(skillName);
    }
    ruleForget(map, now, age) {
      for (const [key, time] of map) if (now - time > age || time > now) map.delete(key);
    }
    /** 휘두름 클립이 몸에서 놓이는 자리: 가운데 기준 클립은 몸 높이 앞쪽, 왼쪽 기준은 몸 바로 앞, 바닥 기준은 발 앞. */
    ruleSwingOffset(ref) {
      const clip = this.deps.stageSkillVfx.clipOf(ref), half = this.deps.stageSkillVfx.clipWidth(ref) / 2;
      if (clip.an === "left") return [6, this.BODY];
      return clip.an === "bottom" ? [Math.max(this.REACH * 0.55, half - 20), 4] : [Math.max(this.REACH * 0.42, half - 26), this.BODY];
    }
    /** 내려찍기: 클립을 돌려 머리 위에서 가속하며 떨어뜨리고, 닿는 자리에 바닥 클립을 차례로 튼다. */
    rulePlayChop(gem, ref, look) {
      const hero = this.K.heroSpot(), chop = gem.map.chop, half = this.deps.stageSkillVfx.clipWidth(ref) / 2, ms = Math.min(110, Math.max(80, this.deps.stageSkillVfx.clipLength(ref) * 0.4));
      this.deps.stageSkillVfx.play(
        ref,
        this.K.at(hero, look.face * (Math.max(this.REACH * 0.5, half - 10) + (chop.dx || 0)), 0),
        { face: look.face, ramp: look.ramp, rot: chop.rot * Math.PI / 180, fall: { from: chop.from, to: chop.to, ms } }
      );
      const reach = look.face * Math.max(this.REACH * 0.6, 50);
      [].concat(gem.map.impact || []).forEach((impact, index) => {
        const nudge = index === 1 && chop.ground ? look.face * 14 : 0;
        this.deps.stageSkillVfx.play(
          impact,
          this.K.at(hero, reach + nudge, this.K.onGround(impact) ? 1 : -30),
          { face: look.face, ramp: look.ramp, delay: ms + index * 30, layer: index ? "top" : "ground", rot: impact.startsWith("lavaw") ? -1.15 : 0 }
        );
      });
    }
    /** 베는 길이(도트): 그 공격의 범위가 주인공에게서 가로로 뻗은 칸 수. */
    ruleReachOf(owner, fx) {
      const cells = fx.attackFootprint && fx.attackFootprint.cells || [], hero = owner.gridPlayer;
      return Math.max(2, ...cells.map((cell) => Math.abs(cell.gx - hero.gx))) * this.WIDE;
    }
    /** 공허 가르기의 틈이 닫히는 때(ms): 끌어당겨 한 번 더 베는 둘째 단계가 늦는 만큼. */
    ruleRiftClose(gem) {
      const stages = ((this.deps.SKILL_DB[gem.meta.name] || {}).combatPattern || {}).stages || [];
      return stages.length > 1 ? stages[1].delayMs - stages[0].delayMs : 560;
    }
    /** 코드로 그리는 휘두름: 공허 가르기의 우주 틈(열린 동안 둘레의 티끌이 빨려 든다), 흡혈 관통의 바늘 찌르기. 옆으로 치는 띠(js/combat-grid.js band)면
     * 틈이 위아래 줄까지 벌어지고, 바늘은 줄마다 하나씩 찌른다. @returns {boolean} 그렸는지 */
    rulePlayDrawn(owner, gem, fx, look) {
      const hero = this.K.heroSpot(), rows = this.ruleBandRows(fx);
      if (gem.map.gash) {
        const gash = this.deps.stageSkillDraws.gash(look.face, this.ruleReachOf(owner, fx), hero.gx * 31 + hero.gy, { at: 140, close: this.ruleRiftClose(gem), rows });
        this.deps.stageSkillVfx.paint(this.K.at(hero), { life: gash.life }, gash.paint);
      } else if (gem.map.swing === "pierce") {
        this.rulePlayNeedles(look, rows);
      } else return false;
      return true;
    }
    /** 흡혈 관통의 바늘: 손 앞에서 하나, 옆으로 치는 띠면 위아래 줄에도 하나씩(조금 늦고 옅게). */
    rulePlayNeedles(look, rows) {
      for (let lane = -rows; lane <= rows; lane++) {
        const pierce = this.deps.stageSkillDraws.pierce(look.face, look.ramp), alpha = lane ? 0.8 : 1;
        this.deps.stageSkillVfx.paint(
          this.K.at(this.K.heroSpot(), look.face * 14, -42 + lane * this.DEEP),
          { life: pierce.life, delay: Math.abs(lane) * 40 },
          (ctx, t, dot) => {
            ctx.globalAlpha = alpha;
            pierce.paint(ctx, t, dot);
          }
        );
      }
    }
    /** 한 번의 공격에 한 번: 코드로 그리는 v32의 휘두름(js/canvas-stage-skill-runes.js)이 아니면 그 룬의 휘두름 클립. */
    rulePlaySwing(owner, gem, fx, look) {
      if (!this.deps.stageSkillRunes.swing(gem, fx, look)) this.ruleSwingClip(owner, gem, fx, look);
    }
    /** 그 룬의 휘두름(여러 개면 반복마다 번갈아), 회전, 내려찍기, 코드로 그리는 틈과 찌르기. 둘째 타격은 조금 늦게 나간다. */
    ruleSwingClip(owner, gem, fx, look) {
      const hero = this.K.heroSpot(), repeat = Number(fx.repeatIndex) || 0;
      if (this.rulePlayDrawn(owner, gem, fx, look)) return;
      if (gem.map.spin) {
        this.deps.stageSkillVfx.play(gem.map.spin, this.K.at(hero, 0, -42), { face: look.face, ramp: look.ramp, life: 420 });
        return;
      }
      const ref = gem.map.swing ? this.K.ref(gem.map.swing, repeat) : this.PLAIN_SWING;
      if (gem.map.chop) {
        this.rulePlayChop(gem, ref, look);
        return;
      }
      const [dx, dy] = this.ruleSwingOffset(ref);
      this.deps.stageSkillVfx.play(ref, this.K.at(hero, look.face * dx, dy), { face: look.face, ramp: look.ramp, delay: repeat * 110, scale: gem.map.swingScale });
    }
    /** 휘두름을 새 연출로 그리는 룬인가: 휘두름, 회전, 우주 틈, 찌르기가 정해졌거나, 정해지지 않은 근접 룬(기본 클립). 휘두름을 끈 룬과
     * 휘두름 없는 이동기, 제 단계에서 휘두름을 내는 룬은 아니다. */
    ruleSwings(gem) {
      const swing = gem.map.swing;
      if (this.CAST_SWING.has(gem.id)) return false;
      if (gem.map.gash || gem.map.spin || this.deps.stageSkillRunes.drawsSwing(gem)) return true;
      if (swing) return swing !== "none";
      return gem.meta.melee && gem.meta.kind !== "move";
    }
    /** @returns {boolean} 이 타격이 그 공격의 휘두름을 냈는지(묶음의 첫 타격) */
    ruleSwingOnce(owner, gem, fx, look, now) {
      if (!this.ruleSwings(gem) || !this.ruleLeadHit(fx)) return false;
      const key = `${fx.skillName}:${String(fx.damageTextGroupId).split(":")[0]}:${Number(fx.repeatIndex) || 0}`;
      if (this.swung.has(key)) return false;
      this.swung.set(key, now);
      this.rulePlaySwing(owner, gem, fx, { ...look, face: this.K.heroFace() });
      return true;
    }
    /** 공용 물리 접촉 섬광만 몸 안쪽 크기로 맞춘다. 큰 휘두름과 보스·속성 클립은 유지한다.
     * 재생 승인 뒤 크기만 바꾸므로 클립 추첨, 간격, 동시 수 제한은 그대로다. 단위는 캐릭터 그림의 도트. */
    ruleFitContact(played, fx) {
      if (!played || played.ramp !== "phys" || !/^(h_x|h_xs|m_hit)$/.test(played.name)) return;
      const enemy = this.K.enemy(fx.enemyId);
      if (enemy && enemy.isBoss) return;
      const width = played.box.w * (played.clip.sc || 1), limit = fx.crit ? 64 : 48;
      played.scale = Math.min(played.scale, limit / width);
    }
    /** 룬이 정한 타격의 모습(전달본 V3.6): alpha와 scale은 곱한다(과냉각 혼합물), most는 긴 변의 도트(부싯돌 베기, 1.2배까지만 키운다). */
    ruleHitLook(played, look) {
      if (!played || !look) return;
      if (look.most) {
        played.scale *= Math.min(1.2, look.most / Math.max(1, Math.max(played.box.w, played.box.h) * (played.clip.sc || 1) * played.scale));
        played.alpha = look.alpha;
        return;
      }
      played.alpha *= look.alpha;
      played.scale *= look.scale;
    }
    /** 맞은 적의 타격 클립: 같은 적에게는 간격을 두고 붙인다(연타에 화면이 덮이지 않게). 클립은 룬이 정한 것, 없으면 속성의 묶음에서
     * 맞을 때마다 하나, 활로 쏜 화살 룬이면 마법 화살의 터짐(js/canvas-stage-skill-runes.js hitRef). */
    rulePlayHit(gem, hit) {
      const ref = this.deps.stageSkillRunes.hitRef(gem, hit.fx.element), last = this.struck.has(hit.fx.enemyId) ? this.struck.get(hit.fx.enemyId) : -1e9;
      if (!ref || hit.now - last < this.deps.stageSkillVfx.HIT.gap) return;
      const played = this.deps.stageSkillVfx.play(ref, this.K.at(hit.victim, -hit.look.face * 8, this.K.onGround(ref) ? 2 : this.BODY), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
      this.ruleFitContact(played, hit.fx);
      this.ruleHitLook(played, gem.map.hitLook);
      if (played) this.struck.set(hit.fx.enemyId, hit.now);
    }
    /** 두 자리 사이를 클립으로 잇는다(연쇄 번개): 길이에 맞춰 몇 개를 돌려 늘어놓는다. */
    rulePlayLink(ref, from, to, ramp) {
      const dx = (to.gx - from.gx) * this.WIDE, dy = (to.gy - from.gy) * this.DEEP, length = Math.hypot(dx, dy), width = this.deps.stageSkillVfx.clipWidth(ref);
      if (length < 8 || !width) return;
      const count = Math.max(1, Math.round(length / width)), angle = Math.atan2(dy, dx), scale = length / (count * width);
      for (let i = 0; i < count; i++) this.deps.stageSkillVfx.play(ref, this.K.at(from, dx * i / count, this.BODY + dy * i / count), { ramp, rot: angle, scale, delay: i * 40 });
    }
    /** 연쇄: 첫 대상은 주인공에게서, 다음부터는 앞서 맞은 적에게서 번개가 건너온다. */
    ruleChainLink(gem, hit) {
      if (!gem.map.zap || !hit.fx.chain) return;
      if (gem.map.vcut && hit.fx.chainFromEnemyId == null) return;
      const before = hit.fx.chainFromEnemyId == null ? null : this.K.enemy(hit.fx.chainFromEnemyId);
      const from = hit.fx.chainFromEnemyId == null ? this.K.heroSpot() : before ? this.K.enemySpot(before) : hit.fx.sourceCell;
      this.rulePlayLink(gem.map.zap, from, hit.victim, hit.look.ramp);
    }
    /** 흡혈: 피 혼령 둘이 적에게서 주인공에게 날아와 흡수 고리가 된다. */
    rulePlayDrain(gem, hit) {
      const hero = this.K.heroSpot(), dx = (hero.gx - hit.victim.gx) * this.WIDE, dy = (hero.gy - hit.victim.gy) * this.DEEP;
      [0, 130].forEach((delay, index) => this.deps.stageSkillVfx.play(
        gem.map.drain,
        this.K.at(hit.victim, 0, -52 + index * 8),
        { face: Math.sign(dx) || 1, ramp: hit.look.ramp, scale: 0.55, alpha: 0.9, life: 380, delay: 110 + delay, move: { dx, dy: dy - 4, ms: 380 } }
      ));
      if (gem.map.absorb) this.deps.stageSkillVfx.play(gem.map.absorb, this.K.at(hero, 0, -52), { ramp: hit.look.ramp, scale: 0.8, alpha: 0.9, delay: 620 });
    }
    /** 구슬이 붙은 적이 죽은 자리의 폭발: 몸 높이의 폭발과 둘레 바닥에 남는 불. */
    ruleRotBurst(rot) {
      const spot = rot.row.at, map = rot.gem.map;
      if (map.boom) this.deps.stageSkillVfx.play(map.boom, this.K.at(spot, 0, this.K.onGround(map.boom) ? 1 : -46), { ramp: rot.ramp, scale: 0.72, alpha: 0.9 });
      if (map.boom2) this.areas.ruleFillArea(map.boom2, { centre: spot, radius: 1.5 }, { ramp: rot.ramp, life: 700, layer: "ground" });
    }
    /** 다시 맞혀 터뜨렸다(js/combat-skill-effects.js detonateFlameDecay): 그 자리의 폭발, 옮겨 붙은 적마다 불길 줄기와 새 구슬. */
    ruleRotDetonated(rot) {
      this.ruleRotBurst(rot);
      for (const id of rot.unit.flameDecaySpread || []) {
        const other = this.K.enemy(id);
        if (!other) continue;
        const spot = this.K.enemySpot(other);
        if (rot.gem.map.stream) this.rulePlayLink(rot.gem.map.stream, rot.follow() || rot.row.at, { gx: spot.gx, gy: spot.gy }, rot.ramp);
        this.ruleStartRot(rot.gem, { fx: { enemyId: id }, victim: spot, look: { ramp: rot.ramp }, now: this.deps.stageSkillVfx.now() });
      }
    }
    /** 프레임마다 구슬 하나: 적이 살아 있으면 남고, 다시 맞혀 터뜨리면 터지고, 시간이 다하면 걷히고(흩어지는 클립), 그 전에 죽으면 터진다. */
    ruleWatchRot(id, time) {
      const rot = this.rots.get(id), enemy = this.K.enemy(id), detonated = (rot.unit.flameDecayBurstAt || 0) !== rot.burstSeen && rot.unit.hp > 0;
      if (enemy === rot.unit && enemy.hp > 0 && time < rot.until && !detonated) return;
      rot.row.life = Math.min(rot.row.life, time - rot.row.start);
      this.rots.delete(id);
      this.ruleEndRot(rot, enemy, detonated);
    }
    /** 구슬이 끝나는 모습: 다시 맞혀 터뜨렸으면 터짐과 옮겨 붙음, 죽었으면 터짐, 시간이 다했으면 흩어짐. */
    ruleEndRot(rot, enemy, detonated) {
      if (detonated) this.ruleRotDetonated(rot);
      else if (rot.unit.hp <= 0) this.ruleRotBurst(rot);
      else if (enemy === rot.unit && rot.gem.map.orbEnd) this.deps.stageSkillVfx.play(rot.gem.map.orbEnd, this.K.at(rot.follow(), 0, -42), { ramp: rot.ramp });
    }
    /** 모든 구슬을 살피는 하나의 일(재생기가 프레임마다 부른다). @returns {boolean} 더 볼지 */
    ruleWatchRots(time) {
      this.rotWatch.seen = time;
      for (const id of [...this.rots.keys()]) this.ruleWatchRot(id, time);
      this.rotWatch.on = this.rots.size > 0;
      return this.rotWatch.on;
    }
    /** 구슬을 살피는 일이 돌게 한다(돌고 있으면 그대로). */
    ruleKeepRotWatch() {
      if (this.rotWatch.on && this.deps.stageSkillVfx.now() - this.rotWatch.seen < 200) return;
      this.rotWatch.on = true;
      this.rotWatch.seen = this.deps.stageSkillVfx.now();
      this.deps.stageSkillVfx.watch(this.ruleWatchRots.bind(this));
    }
    /** 화염 부패: 대상의 몸 가운데에 용암 구슬이 붙어 따라다닌다. 다시 걸리면 시간이 늘어난다. */
    ruleStartRot(gem, hit) {
      const id = hit.fx.enemyId, known = this.rots.get(id);
      if (known && known.until > hit.now) {
        known.until = hit.now + this.ROT_MS;
        known.row.life = known.until - known.row.start;
        return;
      }
      const unit = this.K.enemy(id), follow = () => unit && this.K.enemy(id) === unit && unit.hp > 0 ? this.K.enemySpot(unit) : null;
      const row = unit ? this.deps.stageSkillVfx.play(gem.map.orb, this.K.at(hit.victim, 0, -42), { ramp: hit.look.ramp, scale: 0.8, life: this.ROT_MS, follow }) : null;
      if (!row) return;
      this.rots.set(id, { row, until: hit.now + this.ROT_MS, gem, ramp: hit.look.ramp, unit, follow, burstSeen: unit.flameDecayBurstAt || 0 });
      this.ruleKeepRotWatch();
    }
    /** 틱마다 표적 몸 둘레의 안개가 몸 안으로 감겨 들어가고, 옅은 냉기가 몸에 남았다 흩어진다. */
    ruleSeepInto(gem, hit) {
      const ref = gem.map.seep, last = this.struck.has(hit.fx.enemyId) ? this.struck.get(hit.fx.enemyId) : -1e9;
      if (hit.now - last < this.deps.stageSkillVfx.HIT.gap) return;
      this.struck.set(hit.fx.enemyId, hit.now);
      for (let k = 0; k < 5; k++) {
        const angle = k / 5 * Math.PI * 2 + 0.6, x = Math.cos(angle) * 30, y = Math.sin(angle) * 20;
        this.deps.stageSkillVfx.play(ref, this.K.at(hit.victim, x, y - 34), { face: x < 0 ? -1 : 1, ramp: hit.look.ramp, delay: k * 45, alpha: 0.38, scale: 0.5, ms: 26, cut: 380, move: { dx: -x, dy: -y + 4, ms: 340 } });
      }
      this.deps.stageSkillVfx.play(ref, this.K.at(hit.victim, 0, -28), { ramp: hit.look.ramp, delay: 200, alpha: 0.22, scale: 0.8, ms: 40, cut: 520 });
    }
    /** 첫 타격에 한 번 붙는 것: 흡혈의 흐름, 착탄 폭발, 화염 부패의 구슬. */
    ruleFirstExtras(gem, hit) {
      const map = gem.map, look = hit.look;
      if (map.drain) this.rulePlayDrain(gem, hit);
      if (map.blast) this.deps.stageSkillVfx.play(map.blast, this.K.at(hit.victim, 0, this.BODY), { face: look.face, ramp: look.ramp, scale: 0.8 });
      if (map.orb) this.ruleStartRot(gem, hit);
    }
    /** 지속 타격: 둘째부터의 타격과 장판의 틱에는 그 룬의 틱 클립이 붙는다. */
    ruleTickExtras(gem, hit) {
      const tick = gem.map.tick;
      if (tick) this.deps.stageSkillVfx.play(tick, this.K.at(hit.victim, 0, this.K.onGround(tick) ? 0 : -40), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
    }
    /** 타격 하나의 자리와 방향: 연쇄가 건너온 타격은 앞서 맞은 적 쪽에서, 그 밖에는 주인공 쪽에서 본다. */
    ruleHitOf(owner, gem, fx) {
      const enemy = this.K.enemy(fx.enemyId), victim = enemy ? this.K.enemySpot(enemy) : { gx: fx.targetCell.gx, gy: fx.targetCell.gy }, chained = fx.chainFromEnemyId != null;
      const face = Math.sign(victim.gx - (chained ? fx.sourceCell.gx : owner.gridPlayer.gx)) || this.K.heroFace();
      if (!chained) this.K.noteFace(face);
      return { fx, victim, look: { face, ramp: this.K.ramp(gem, fx.element) }, now: this.deps.stageSkillVfx.now() };
    }
    /** 맞은 적마다 한 번 불린다. */
    ruleNoteHit(owner, fx) {
      const gem = fx.targetCell && fx.sourceCell && this.deps.stageSkillVfx.ready() ? this.K.gemOf(fx.skillName) : null;
      if (!gem) return;
      const hit = this.ruleHitOf(owner, gem, fx);
      this.ruleForget(this.swung, hit.now, 4e3);
      this.ruleForget(this.struck, hit.now, 2e3);
      const lead = this.ruleSwingOnce(owner, gem, fx, hit.look, hit.now);
      this.ruleChainLink(gem, hit);
      if (gem.map.warlock) this.deps.stageRuneRemakes.warlockHit(gem.map.warlock, hit);
      if (gem.map.seep) this.ruleSeepInto(gem, hit);
      else this.rulePlayHit(gem, hit);
      this.deps.stageProjectileImpact.note(gem, hit);
      if (this.ruleFirstHit(fx)) this.ruleFirstExtras(gem, hit);
      else this.ruleTickExtras(gem, hit);
      this.deps.stageSkillRunes.victim(gem, hit, lead);
    }
    /** 반복 단계가 나가는 때: 반복이 제 때를 맞았다는 알림(supportEcho, js/combat-support-runes.js repeatReleased)은 그 순간, 날아가는 기록은
     * 떠나는 순간(자리에 서는 것은 닿는 순간). 다른 기록은 알리지 않는다. */
    ruleRepeatAt(fx) {
      if (fx.type === "supportEcho") return fx.start;
      if (fx.type !== "combatTravel") return Infinity;
      const flies = String(fx.delivery).startsWith("projectile") || fx.delivery === "magicMoving";
      return fx.start + Math.max(0, Number(flies ? fx.releaseDelayMs : fx.flightMs) || 0);
    }
    /** 이 공격의 첫 반복인가: 같은 공격(묶음)의 반복 단계가 여럿이거나 같은 룬의 잔상이 막 나갔으면 아니다. 맞으면 적어 둔다. */
    ruleEchoDue(fx) {
      const now = this.deps.stageSkillVfx.now(), key = `${fx.skillName}:${String(fx.damageTextGroupId).split(":")[0]}`;
      this.ruleForget(this.echoed, now, 4e3);
      const last = this.echoed.get(fx.skillName);
      if (this.echoed.has(key) || last !== void 0 && now - last < this.ECHO_SPACING) return false;
      this.echoed.set(key, now).set(fx.skillName, now);
      return true;
    }
    /** 전투 기록을 볼 때마다 불린다: 처음 볼 때(js/canvas-combat-feedback.js observe)와 날아가는 기록을 그리는 프레임마다(js/canvas-battlefield.js
     * drawCombatTravelFx). now는 그 기록의 시계다. 반복 단계(stageKind supportRepeat)면 그 공격의 첫 반복이 나가는 순간에 한 번 연출을 낸다. */
    ruleNoteRepeat(owner, fx, now) {
      if (fx.stageKind !== "supportRepeat" || now < this.ruleRepeatAt(fx)) return;
      const gem = this.deps.stageSkillVfx.ready() ? this.K.gemOf(fx.skillName) : null;
      if (gem && this.ruleEchoDue(fx)) this.rulePlayEcho(owner, gem, fx);
    }
    rulePlayEcho(owner, gem, fx) {
      const element = fx.element || gem.meta.el, ink = this.deps.STAGE_SKILL_VFX.elements[element === "prism" ? "light" : element] || this.deps.STAGE_SKILL_VFX.elements.phys;
      const look = { face: this.K.heroFace(), element }, ago = this.deps.supports.repeatGapMs;
      const echo = this.deps.stageSkillDraws.echo({ face: look.face, count: 2, ink, bright: this.deps.stageActors.afterimage(ink.c2, ago), faint: this.deps.stageActors.afterimage(ink.c1, ago) });
      this.deps.stageSkillVfx.paint(this.K.at(this.K.heroDrawn()), { life: echo.life }, echo.paint);
      if (this.ruleCastsAtHand(gem, fx)) this.ruleEchoCast(gem, look);
      else this.ruleEchoStrike(owner, gem, fx, look);
    }
    /** 주문: 손 마법진(그 룬이 손 마법진을 쓰면)과 외곽선 오라가 0.22초, 발밑 고리를 쓰는 룬은 그 고리가 한 번 더. */
    ruleEchoCast(gem, look) {
      this.deps.stageSkillSigil.cast({ spot: this.K.heroSpot(), face: look.face, element: look.element, ms: this.ECHO_SIGIL_MS, hand: this.deps.stageSkillPolish.handSigil(gem) });
      this.deps.stageSkillPolish.recast(gem, this.ECHO_SIGIL_MS);
    }
    /** 공격: 외곽선 오라만 0.14초, 휘두르는 룬은 휘두름 자국이 한 번 더. */
    ruleEchoStrike(owner, gem, fx, look) {
      this.deps.stageSkillSigil.cast({ spot: this.K.heroSpot(), face: look.face, element: look.element, ms: this.ECHO_AURA_MS, hand: false });
      if (this.ruleSwings(gem)) this.rulePlaySwing(owner, gem, { ...fx, repeatIndex: 0 }, { face: look.face, ramp: this.K.ramp(gem, look.element) });
    }
    /** 시전 시작에 룬마다 더 거는 것: 부싯돌 베기의 불티와 향로 고리, 준비와 놓음의 빛(전달본 V3.6), 암흑 파열의 조짐. */
    ruleWindupExtras(gem, fx) {
      this.deps.stageSkillRunes.windup(gem, fx);
      this.deps.stageSkillPolish.cast(gem, { wind: Number(fx.impactDelayMs) || 0, end: Number(fx.duration) || 0, mode: this.K.firedFromBow(fx.skillName) ? "bow" : null });
      if (gem.map.warlock) this.deps.stageRuneRemakes.warlockWindup(gem.map.warlock, fx);
    }
    /** 시전 시작: 주문, 위습, 시전과 집중 슬롯의 룬은 손 앞에 그 속성의 마법진이 서고 몸에 외곽선 오라가 돈다(예비 동작 동안).
     * 위습 소환은 예비 동작이 끝날 때 등 뒤에서 그 속성의 소환 클립이 튄다. */
    ruleNoteWindup(fx) {
      const gem = fx.sourceCell && !this.handled.has(fx) && this.deps.stageSkillVfx.ready() ? this.K.gemOf(fx.skillName) : null;
      if (!gem) return;
      this.handled.add(fx);
      this.ruleWindupExtras(gem, fx);
      if (!this.ruleCastsAtHand(gem, fx)) return;
      const hero = this.K.heroSpot(), face = this.K.heroFace(), wind = Math.max(200, Number(fx.impactDelayMs) || 0);
      this.deps.stageSkillSigil.cast({ spot: hero, face, element: gem.meta.el, ms: wind + 60, hand: this.deps.stageSkillPolish.handSigil(gem) });
      const summon = gem.meta.kind === "wisp" ? gem.map.cast : null;
      if (summon) this.deps.stageSkillVfx.play(summon, this.K.at(hero, -face * 34, this.K.onGround(summon) ? -29 : -76), { face, ramp: this.K.ramp(gem, fx.element), delay: wind });
    }
    /** 날아가는 것(travel): 발사 섬광을 손 앞에 한 번 튼다. */
    rulePlayMuzzle(gem, event, look) {
      if (gem.map.muzzle) this.deps.stageSkillVfx.play(gem.map.muzzle, this.K.at(this.K.heroSpot(), look.face * 26, -52), { face: look.face, ramp: look.ramp });
    }
    /** 나아가는 파동: 파동 클립이 바닥에 붙어 조금 출렁이며 앞으로 나아간다(매 프레임 그 자리에 찍는다). 쓴 자리의 몸 앞면보다
     * 뒤쪽은 그리지 않는다(K.emerge): 파동이 몸 앞에서 자라 나와 나아간다.
     * 게임의 판정은 대상이 선 칸까지의 줄이라 대상이 다른 줄에 있으면 비스듬하다. 그림을 그 줄대로 옮기면 화면에서는 위로 떠올라,
     * 제 줄에 선 적들의 머리 위를 지나 허공에서 끝났다(2026-10-13 사용자: 높이를 "조절해줘"). 인계의 연출처럼 쓴 줄의 바닥을 따라
     * 가로로 쓸고 가되, 대상의 줄 쪽으로는 WAVE_DRIFT만큼만 따라간다(그림의 키가 세 줄 높이라 다른 줄의 적도 덮는다). */
    ruleDrawWave(gem, event, view) {
      const elapsed = view.now - event.at;
      if (elapsed < 0 || elapsed > event.duration + 200) return;
      const spot = this.K.along(event, Math.min(elapsed, event.duration)), at = this.K.screen(view.projection, spot), from = this.K.screen(view.projection, this.K.along(event, 0));
      const ground = from.y + (at.y - from.y) * this.WAVE_DRIFT;
      view.ctx.save();
      this.K.emerge(view.ctx, view.projection, event);
      view.ctx.globalAlpha *= elapsed > event.duration ? 1 - (elapsed - event.duration) / 200 : 1;
      this.deps.stageSkillVfx.stamp(view.ctx, gem.map.wave, elapsed, {
        x: at.x + spot.face * this.WAVE_FRONT * at.dot,
        y: ground + (this.WAVE_BASE + Math.round(Math.sin(elapsed / 70) * 2)) * at.dot,
        face: spot.face,
        dot: at.dot,
        ramp: this.K.ramp(gem, event.element)
      });
      view.ctx.restore();
    }
    /** 제 때가 된 사건을 처음 보면 그때의 클립을 튼다. 게임은 닿는 사건(stage)을 날아가는 동안부터 알려 주므로(at이 앞날이다)
     * 때가 되기 전에는 틀지 않는다: 처음 본 프레임에 틀던 때에는 유성이 떨어지기도 전에 버섯구름이 먼저 터졌다. */
    rulePlayEvent(gem, event, now) {
      if (now < event.at || this.handled.has(event) || !this.EVENT_PLAYS[event.kind]) return;
      this.handled.add(event);
      const target = event.targetCells && event.targetCells[0], source = event.sourceCell || this.K.heroSpot();
      this.EVENT_PLAYS[event.kind](gem, event, { face: target && Math.sign(target.gx - source.gx) || this.K.heroFace(), ramp: this.K.ramp(gem, event.element) });
    }
    ruleClaimEvent(event, view) {
      const gem = this.deps.stageSkillVfx.ready() ? this.K.gemOf(event.skillName) : null;
      if (!gem) return false;
      const cast = this.deps.stageSkillCasts.claim(gem, event, view);
      if (cast !== null) return cast;
      const rune = this.deps.stageSkillRunes.claim(gem, event, view, this.RUNE_HOOKS);
      if (rune !== null) return rune;
      this.rulePlayEvent(gem, event, view.now);
      const mine = this.ruleTakes(gem, event.kind);
      if (mine && event.kind === "travel") this.ruleDrawWave(gem, event, view);
      return mine;
    }
    /** 연결표 안의 클립 이름을 모두 든다(값이 목록이나 표면 그 안까지). 클립이 아닌 글자(램프 이름, 'none', 'pierce')는 거른다. */
    ruleClipNames(table) {
      const out = [], open = [table];
      while (open.length) {
        const value = open.pop();
        if (typeof value === "string") {
          if (this.deps.stageSkillVfx.clipOf(value)) out.push(value);
        } else if (value && typeof value === "object") open.push(...Object.values(value));
      }
      return out;
    }
    /** 클립 하나와, 그 클립이 끝나면 이어지는 클립들(같은 램프)을 out에 넣는다. */
    ruleFollowClips(ref, out) {
      for (let at = ref, steps = 0; at && steps < 6; steps++) {
        out.push(at);
        const clip = this.deps.stageSkillVfx.clipOf(at);
        at = clip && clip.next ? clip.next + "@" + at.split("@")[1] : null;
      }
    }
    /** 그 룬이 한 속성으로 틀 수 있는 클립 이름: 연결표의 것, 정해지지 않은 근접 룬의 기본 휘두름, 타격 묶음, 활의 발사 섬광,
     * 위습이면 위습의 타격. */
    ruleGemClips(gem, element) {
      const names = this.ruleClipNames(gem.map);
      if (this.ruleSwings(gem) && !gem.map.swing) names.push(this.PLAIN_SWING);
      names.push(...this.deps.stageSkillRunes.hitRefs(gem, element), ...this.deps.stageProjectileImpact.refs(gem, element), ...this.deps.stageSkillPolish.refs(gem), gem.map.bow ? this.deps.stageSkillRunes.bowFlash(gem, element) : "", gem.meta.kind === "wisp" ? this.deps.stageSkillCasts.wispHit(element) : "");
      return names.filter(Boolean);
    }
    /** 그 룬이 틀 수 있는 클립('이름@램프')을 모두 든다: 낀 룬의 띠를 미리 만들어 두려고 묻는다(js/canvas-stage-warmup.js).
     * elements: 그 룬의 타격이 띨 수 있는 속성(룬의 속성은 언제나 넣는다). 실제로 트는 것보다 조금 넉넉하다(램프를 정하는 값이
     * 타격마다 달라질 수 있어, 있을 수 있는 램프를 모두 든다). 인계에 없는 룬이면 빈 목록. */
    ruleClipsOf(skillName, elements) {
      const gem = this.K.gemOf(skillName), refs = [];
      if (!gem) return refs;
      const kinds = new Set([gem.meta.el].concat(elements).flatMap((element) => element === "prism" ? this.PRISM : [element]).filter(Boolean));
      for (const element of kinds) {
        const ramps = /* @__PURE__ */ new Set([this.K.ramp(gem, element), this.deps.STAGE_SKILL_VFX.elementRamp[element] || "phys"]);
        for (const name of this.ruleGemClips(gem, element)) {
          if (name.includes("@")) this.ruleFollowClips(name, refs);
          else ramps.forEach((ramp) => this.ruleFollowClips(name + "@" + ramp, refs));
        }
      }
      return refs;
    }
  };
  function createStageSkillRules(deps) {
    const areas = createStageSkillAreas(deps);
    const instance = new StageSkillRules(deps, areas);
    return Object.freeze({ claim: instance.ruleClaimEvent.bind(instance), hit: instance.ruleNoteHit.bind(instance), windup: instance.ruleNoteWindup.bind(instance), repeat: instance.ruleNoteRepeat.bind(instance), clipsOf: instance.ruleClipsOf.bind(instance), owns: instance.ruleOwns });
  }

  // modules/canvas-stage-skill-rules-classic.mjs
  var native = createStageSkillRules({
    get stageSkillKit() {
      return stageSkillKit;
    },
    get stageSkillVfx() {
      return stageSkillVfx;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get stageSkillDraws() {
      return stageSkillDraws;
    },
    get stageSkillRunes() {
      return stageSkillRunes;
    },
    get stageRuneRemakes() {
      return stageRuneRemakes;
    },
    get stageProjectileImpact() {
      return stageProjectileImpact;
    },
    get STAGE_SKILL_VFX() {
      return STAGE_SKILL_VFX;
    },
    get supports() {
      return window.GameModules.combat.supports;
    },
    get stageActors() {
      return stageActors;
    },
    get stageSkillSigil() {
      return stageSkillSigil;
    },
    get stageSkillPolish() {
      return stageSkillPolish;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get stageSkillSpells() {
      return stageSkillSpells;
    },
    get stageSkillCasts() {
      return stageSkillCasts;
    }
  });
  var stageSkillRules = Object.freeze({
    claim: native.claim,
    hit: (fx) => native.hit(game, fx),
    windup: native.windup,
    repeat: (fx, now) => native.repeat(game, fx, now),
    clipsOf: native.clipsOf,
    owns: native.owns
  });
  safeExposeGlobals({ stageSkillRules });
})();
