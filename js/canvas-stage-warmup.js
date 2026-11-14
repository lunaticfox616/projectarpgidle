// GENERATED from modules/canvas-stage-warmup*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-warmup.mjs
  var StageWarmup = class {
    constructor(deps) {
      this.deps = deps;
      this.CHECK_MS = 250;
      this.TOUCH_MS = 400;
      this.COMMON_SHEETS = Object.freeze(["skillFxBasicSlash", "skillFxImpactFlare", "skillFxEnemyProjectiles"]);
      this.WORLD_TREE_SHEET = "skillFxWorldTree";
      this.checkedAt = 0;
      this.buildKey = "";
      this.sheetKeys = [];
      this.touchedAt = 0;
      this.touchTurn = 0;
      this.mapKey = null;
      this.remakeDue = false;
    }
    /** 지금 낀 룬의 이름: 주 스킬, 이동기, 소환 룬. */
    wornGems(owner) {
      const summons = Array.isArray(owner.equippedSummonSkills) ? owner.equippedSummonSkills : [];
      return [owner.activeSkill || "기본 공격", this.deps.mobilitySkill.equipped(owner)].concat(summons).filter(Boolean);
    }
    /** 그 룬의 타격이 띨 수 있는 속성: 룬의 속성과, 지금 주 스킬이면 빌드가 바꾼 속성. */
    elementsOf(owner, name) {
      const def = this.deps.SKILL_DB[name] || {}, live = owner.lastCombatStats && owner.lastCombatStats.sSkill;
      return [def.ele, name === owner.activeSkill && live ? live.ele : null].filter(Boolean);
    }
    /** 빌드가 달라졌으면 그 빌드의 이펙트를 준비한다: 클립의 띠를 맡기고, 풀어 둘 시트를 정한다. */
    syncBuild(owner) {
      const worn = this.wornGems(owner), vfx = this.deps.stageSkillVfx.ready(owner);
      const key = worn.map((name) => name + ":" + this.elementsOf(owner, name).join("+")).join("|") + "|" + vfx;
      if (key === this.buildKey) return;
      this.buildKey = key;
      if (vfx) this.deps.stageSkillVfx.keepStrips(owner, worn.flatMap((name) => this.deps.stageSkillRules.clipsOf(name, this.elementsOf(owner, name))).concat(this.deps.stageBlessing.clipsOf(worn)));
      if (worn.some((name) => this.deps.stageGothicRemakes.GEMS.includes((this.deps.SKILL_DB[name] || {}).nativeCastId))) this.deps.stageGothicRemakes.ready();
      const tree = worn.some((name) => this.deps.SKILL_FX_ATLAS[name]), remade = this.deps.fxRemake.isEnabled();
      this.sheetKeys = this.COMMON_SHEETS.concat(tree && !remade ? [this.WORLD_TREE_SHEET] : []);
      this.remakeDue = tree && remade;
    }
    /** 지도가 바뀌었으면 그 지도의 몬스터 그림을 맡긴다: 서서 기다리는 무리와 이미 나와 있는 적 모두. */
    syncMap(owner) {
      const run = this.deps.actExplorationState.current(owner), key = run || owner.currentZoneId;
      if (key === this.mapKey) return;
      this.mapKey = key;
      this.deps.stageRoster.keepFor(owner, (run ? run.packs.flatMap((pack) => pack.waiting) : []).concat(owner.enemies));
    }
    /** 다음 차례의 시트 한 장을 지금 그린 전장의 구석에 한 점, 제 크기로, 거의 보이지 않게 그린다: 풀려 있지 않으면 이 프레임의
     * 끝에 풀리고(한 장에 데스크톱 10ms, 느린 기기 40ms쯤), 풀려 있으면 값이 들지 않고 풀린 채로 남는다. */
    touchNextSheet(ctx) {
      const image = (this.deps.battleAssets.images || {})[this.sheetKeys[this.touchTurn++ % this.sheetKeys.length]];
      if (!(image instanceof this.deps.HTMLImageElement) || !image.complete || !image.naturalWidth) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.01;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
      ctx.restore();
    }
    /** 전장을 끝까지 그린 뒤에 부른다(js/canvas-battlefield.js). 무대가 꺼져 있으면 아무 일도 하지 않는다. */
    afterBattleDraw(owner, ctx) {
      const now = this.deps.performance.now();
      this.syncMap(owner);
      if (now - this.checkedAt >= this.CHECK_MS) {
        this.checkedAt = now;
        this.syncBuild(owner);
      }
      if (this.remakeDue) this.remakeDue = !this.deps.fxRemake.prepareSheet((this.deps.battleAssets.images || {})[this.WORLD_TREE_SHEET]);
      if (this.sheetKeys.length && now - this.touchedAt >= this.TOUCH_MS) {
        this.touchedAt = now;
        this.touchNextSheet(ctx);
      }
    }
  };
  function createStageWarmup(deps) {
    const instance = new StageWarmup(deps);
    return Object.freeze({ afterBattleDraw: instance.afterBattleDraw.bind(instance) });
  }

  // modules/canvas-stage-warmup-classic.mjs
  var native = createStageWarmup({
    get mobilitySkill() {
      return mobilitySkill;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get stageSkillVfx() {
      return stageSkillVfx.preparation;
    },
    get stageSkillRules() {
      return stageSkillRules;
    },
    get stageBlessing() {
      return stageBlessing;
    },
    get stageGothicRemakes() {
      return stageGothicRemakes;
    },
    get SKILL_FX_ATLAS() {
      return SKILL_FX_ATLAS;
    },
    get fxRemake() {
      return fxRemake;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get stageRoster() {
      return stageRoster.preparation;
    },
    get battleAssets() {
      return battleAssets;
    },
    get HTMLImageElement() {
      return HTMLImageElement;
    },
    get performance() {
      return performance;
    }
  });
  var stageWarmup = Object.freeze({
    afterBattleDraw: (ctx) => native.afterBattleDraw(game, ctx)
  });
  safeExposeGlobals({ stageWarmup });
})();
