// GENERATED from modules/dev-test-panel-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowFetch = (...args) => globalThis.fetch(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);

  // modules/ui/dev-test-panel.mjs
  var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  var SPEEDS = [1, 2, 4, 8];
  var STAGE_STANCES = [
    ["auto", "착용 무기"],
    ["unarmed", "맨손"],
    ["greatsword", "대검"],
    ["sword", "한손검"],
    ["bow", "활"],
    ["orb", "오브"],
    ["flask", "플라스크"],
    ["censer", "향로"]
  ];
  var STYLE = `#dev-test-panel{--dtp-bottom:170px;position:fixed;left:10px;bottom:var(--dtp-bottom);z-index:30000;font:13px/1.45 'Malgun Gothic',sans-serif;color:#efe6cf}
@media (max-width:1080px){#dev-test-panel{--dtp-bottom:250px}}
#dev-test-panel button{background:#231d15;color:#f3dfae;border:1px solid #6b5431;border-radius:6px;padding:4px 8px;cursor:pointer}
#dev-test-panel button:hover,#dev-test-panel button.on{background:#4a3a1f;border-color:#d7b36f}
#dev-test-panel select{background:#15120e;color:#efe6cf;border:1px solid #6b5431;border-radius:6px;padding:3px;max-width:190px}
.dtp-toggle{font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.5)}
.dtp-panel{position:absolute;left:0;bottom:40px;width:330px;max-height:min(72vh,calc(100vh - var(--dtp-bottom) - 72px));overflow:auto;padding:10px 12px;background:rgba(13,11,9,.95);border:1px solid #b58a48;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
.dtp-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.dtp-panel h4{margin:10px 0 4px;color:#d7b36f;font-size:12px;letter-spacing:.04em}
.dtp-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:4px 0}
.dtp-status{margin:0;color:#b9d7c4;font-size:12px}.dtp-hint{margin:10px 0 0;color:#9c927c;font-size:11px}`;
  var DevTestPanel = class {
    constructor(deps) {
      this.deps = deps;
      this.root = null;
      this.godTimer = null;
      this.speed = 1;
      this.generation = 0;
      ["isEnabled", "el", "testInvader", "button", "section", "row", "note", "log", "refresh", "chooseClass", "equipGem", "fitRune", "wearTestItem", "soundRuneSelect", "nextSoundRune", "setSetting", "toggleGodMode", "setSpeed", "addLevels", "grantStumpBox", "giveStumpItems", "giveUniqueWards", "growStumpBox", "setExpansion", "setStageSight", "setStageRoomSize", "startTestBeehive", "openTestZone", "startTestCosmos", "startTestOcean", "startTestBoundary", "startTestColony", "startTestBreach", "startTestEcho", "startTestAtlas", "enterTestZone", "travelToAct", "gemLabel", "gemGroup", "gemSelect", "classRow", "characterSection", "monsterRows", "stageSection", "gemSection", "combatSection", "spawnCritter", "progressSection", "status", "weaponLabel", "mount", "init"].forEach((name) => {
        this[name] = this[name].bind(this);
      });
      this.testZones = this.createTestZones();
    }
    createTestZones() {
      return Object.freeze([
        ["혼돈 3층", () => this.deps.getAbyssZoneIdForDepth(3)],
        ["1차 전직 시련", () => "trial_1"],
        ["창공의 탑", () => this.deps.SKY_TOWER_ZONE_ID],
        ["지하계", () => this.deps.UNDERWORLD_ZONE_ID],
        ["고대 미궁", () => this.deps.LABYRINTH_ZONE_ID],
        ["혼돈계", () => this.deps.CHAOS_REALM_ZONE_ID],
        ["벌집 원정", () => "beehive_run", this.startTestBeehive],
        ["케르베로스", () => "s6_beast_cerberus"],
        // 2026-10-13 밤: 판에서 싸우다 방 단위 지도를 걷게 된 콘텐츠, 그리고 아틀라스(지도 한 장과 수호자)
        ["우주계", null, this.startTestCosmos],
        ["심해", null, () => this.startTestOcean(120)],
        ["심해 황혼층", null, () => this.startTestOcean(400)],
        ["심해 무광층", null, () => this.startTestOcean(800)],
        ["심해 가디언", null, () => this.startTestOcean(500, true)],
        ["경계 너머", null, this.startTestBoundary],
        ["군락지", null, this.startTestColony],
        ["대균열", null, this.startTestBreach],
        ["혼돈 밖", () => this.deps.OUTSIDE_CHAOS_ZONE_ID],
        ["나무꾼의 잔상", null, this.startTestEcho],
        ["아틀라스 지도", null, () => this.startTestAtlas("map")],
        ["아틀라스 수호자", null, () => this.startTestAtlas("guardian")]
      ]);
    }
    isEnabled() {
      if (typeof this.deps.location === "undefined" || !LOCAL_HOSTS.has(this.deps.location.hostname)) return false;
      return new this.deps.URLSearchParams(this.deps.location.search).get("dev") === "1";
    }
    el(tag, props = {}, children = []) {
      const { dataset, ...rest } = props;
      const node = this.deps.document.createElement(tag);
      Object.assign(node, rest);
      if (dataset) Object.assign(node.dataset, dataset);
      children.forEach((child) => node.append(child));
      return node;
    }
    testInvader(kind, label) {
      this.note(this.deps.roomInvaders.force(kind) ? label : "지금은 부를 수 없습니다(방 단위 지도의 보통 방에서)");
    }
    button(label, onClick, extra = {}) {
      return this.el("button", { type: "button", textContent: label, onclick: onClick, ...extra });
    }
    section(title, rows) {
      return this.el("section", {}, [this.el("h4", { textContent: title }), ...rows]);
    }
    row(children) {
      return this.el("div", { className: "dtp-row" }, children);
    }
    note(text) {
      this.log(text);
      this.status();
    }
    log(text) {
      if (typeof this.deps.addLog === "function") this.deps.addLog(`🧪 ${text}`, "season-up");
    }
    refresh() {
      if (typeof this.deps.updateStaticUI === "function") this.deps.updateStaticUI();
    }
    chooseClass(classId) {
      this.deps.applyHeroSelection(classId, { alignTalent: true });
      this.refresh();
      this.note(`직업: ${this.deps.PLAYER_CLASS_DEFS[classId].label}`);
    }
    equipGem(name) {
      if (!this.deps.SKILL_DB[name]) return;
      this.deps.game.skills = Array.isArray(this.deps.game.skills) ? this.deps.game.skills : [];
      if (!this.deps.game.skills.includes(name)) this.deps.game.skills.push(name);
      const summons = this.deps.game.equippedSummonSkills || [];
      if (summons.includes(name)) return this.note(`이미 소환 중: ${name}`);
      if ((this.deps.SKILL_DB[name].tags || []).includes("summon")) summons.slice().forEach(this.deps.toggleSummonAttackGem);
      this.fitRune(name);
      this.deps.changeSkill(name);
      this.note(`룬 장착: ${name}`);
    }
    fitRune(name) {
      const need = this.deps.getRuneLevelReq(name);
      if (need > this.deps.game.level) this.addLevels(need - this.deps.game.level);
      if (this.deps.SKILL_DB[name].requiresShield && !this.deps.hasEquippedShield()) this.wearTestItem("완갑", (base) => base.slot === "방패");
      const family = this.deps.SKILL_RUNE_FAMILY[name];
      if (!family || this.deps.isSkillRuneUsableWithStance(name, this.deps.getEquippedWeaponStance())) return;
      const own = this.deps.SKILL_RUNE_STANCE_BY_CATEGORY[this.deps.HANA_WEAPON_COMBOS.classWeapons[this.deps.game.selectedClassId]];
      const stance = this.deps.SKILL_RUNE_WEAPONS[family].includes(own) ? own : this.deps.SKILL_RUNE_WEAPONS[family].find((value) => value !== "unarmed");
      const category = Object.keys(this.deps.SKILL_RUNE_STANCE_BY_CATEGORY).find((id) => this.deps.SKILL_RUNE_STANCE_BY_CATEGORY[id] === stance);
      this.wearTestItem(this.deps.WEAPON_CATEGORIES[category].name, (base) => base.slot === "무기" && this.deps.getWeaponCategoryOfBase(base.id) === category);
    }
    wearTestItem(label, fits) {
      const owned = this.deps.game.inventory.find((item2) => fits(this.deps.BASE_ITEM_DB.find((row) => row.id === item2.baseId) || {}));
      const base = owned ? null : this.deps.BASE_ITEM_DB.filter((row) => fits(row) && !row.realmBase && !row.dropOnly).reduce((best, row) => !best || row.reqTier < best.reqTier ? row : best, null);
      const item = owned || base && this.deps.createItemFromBase(base, "normal", 1);
      if (!item || !owned && !this.deps.addItemToInventory(item, { ignoreFilter: true })) return;
      if (Object.values(this.deps.game.equipment).includes(item) || this.deps.equipItemById(item.id)) this.log(`시험용 ${label} 장착`);
    }
    soundRuneSelect() {
      const select = this.el("select", { id: "dtp-sound-rune" }), groups = /* @__PURE__ */ new Map();
      const generation = this.generation;
      Object.keys(this.deps.SKILL_DB).filter((name) => this.deps.SKILL_DB[name].isGem).forEach((name) => {
        const kind = this.deps.worldTreeSkillFx.feedback.skillSound({ skillName: name, element: this.deps.SKILL_DB[name].ele, damage: 1 });
        if (!groups.has(kind)) groups.set(kind, this.el("optgroup", { label: kind }));
        groups.get(kind).append(this.el("option", { value: name, textContent: name }));
      });
      [...groups.keys()].sort().forEach((kind) => select.append(groups.get(kind)));
      this.deps.fetch("assets/audio/game-sfx-v2/bank.json").then((response) => response.json()).then((bank) => {
        if (generation === this.generation) groups.forEach((group, kind) => {
          group.label = bank[kind]?.label || kind;
        });
      }).catch((error) => this.deps.console.warn("[dev-test-panel] sound labels", error));
      return select;
    }
    nextSoundRune(select) {
      select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
      this.equipGem(select.value);
    }
    setSetting(key, value, label) {
      this.deps.game.settings[key] = value;
      this.note(label);
    }
    toggleGodMode(on) {
      this.deps.setCombatTestImmortal(on);
      this.deps.clearInterval(this.godTimer);
      this.godTimer = on ? this.deps.setInterval(() => {
        if (this.deps.game.playerHp > 0) this.deps.game.playerHp = this.deps.getPlayerHpCap(this.deps.getUiPlayerStats());
      }, 200) : null;
      this.note(on ? "무적 켬" : "무적 끔");
    }
    setSpeed(value) {
      this.speed = this.deps.setTestCombatSpeed(value);
      this.root.querySelectorAll("[data-speed]").forEach((node) => node.classList.toggle("on", Number(node.dataset.speed) === this.speed));
      this.note(`배속 ×${this.speed}`);
    }
    addLevels(count) {
      for (let i = 0; i < count && this.deps.game.level < this.deps.MAX_PLAYER_LEVEL; i++) {
        this.deps.game.level++;
        this.deps.game.passivePoints++;
      }
      this.deps.game.exp = 0;
      this.deps.game.playerHp = this.deps.getPlayerHpCap(this.deps.getUiPlayerStats());
      this.deps.checkUnlocks();
      this.refresh();
      this.note(`레벨 ${this.deps.game.level}`);
    }
    grantStumpBox() {
      const box = this.deps.stumpBox.of(this.deps.game);
      if (!box.acquired) {
        box.acquired = true;
        box.via = "dev";
      }
      this.deps.contentProgression.sync(this.deps.game);
      this.deps.checkUnlocks();
      this.refresh();
      this.note("그루터기 함 지급");
    }
    giveStumpItems() {
      if (!this.deps.game.stumpBox.acquired) this.grantStumpBox();
      const colors = Object.keys(this.deps.STUMP_BOX_COLORS);
      const made = Array.from({ length: 8 }, (_, i) => this.deps.stumpBox.createItem(this.deps.game, { family: "seed", color: colors[i % colors.length], roll: 0.8 + Math.random() * 0.4 }));
      this.refresh();
      this.note(`씨앗 ${made.filter(Boolean).length}개`);
    }
    giveUniqueWards() {
      const made = this.deps.COLONY_WARD_UNIQUES.rows.filter((row) => this.deps.addItemToInventory(this.deps.colonyWards.createUnique(Math.random, 16, row.key), { ignoreFilter: true }));
      this.refresh();
      this.note(`고유 액막이 ${made.length}개`);
    }
    growStumpBox() {
      for (let i = 0; i < 100; i++) this.deps.stumpBox.grow(this.deps.game, {});
      this.refresh();
      this.note("그루터기 함 성장 +100");
    }
    setExpansion(n) {
      const level = this.deps.skillEffectExpansion.setTestLevel(n);
      this.root.querySelectorAll("[data-expand]").forEach((node) => node.classList.toggle("on", Number(node.dataset.expand) === level));
      this.refresh();
      this.note(level ? `효과 확장 +${level}${level >= 2 ? " (피해 −30%)" : ""}` : "효과 확장 없음");
    }
    setStageSight(value) {
      this.deps.game.settings.stageSight = value;
      this.refresh();
      this.note(value === "fog" ? "시야: 반경과 안개(특수 지역 방식)" : "시야: 방 전체(바탕)");
    }
    setStageRoomSize(key, value, label) {
      this.deps.game.settings[key] = value;
      if (this.deps.getZone(this.deps.game.currentZoneId)?.type === "act") this.deps.changeZone(this.deps.game.currentZoneId);
      this.refresh();
      this.note(label);
    }
    startTestBeehive() {
      if (this.deps.game.beehive && this.deps.game.beehive.inRun) return;
      this.deps.game.currencies.hiveKey = (this.deps.game.currencies.hiveKey || 0) + 1;
      this.deps.startBeehiveRun();
      this.deps.openBeehiveChoiceOverlay("시험 입장");
    }
    openTestZone(id) {
      this.deps.actExplorationProgress.depart(this.deps.game);
      this.deps.game.currentZoneId = id;
      this.deps.game.enemies = [];
      this.deps.game.encounterPlan = [];
      this.deps.game.runProgress = 0;
      this.deps.game.moveTimer = 0;
      this.deps.game.combatHalted = false;
      this.deps.ensureEncounterRun();
    }
    startTestCosmos() {
      this.deps.game.cosmosAtlas.activeChallenge = {
        nodeId: null,
        galaxy: 1,
        name: "시험 행성",
        tier: 5,
        lootTier: 1,
        gravity: 1.2,
        sizeClass: 2,
        tag: "",
        theme: "",
        mechanicId: "",
        ele: "chaos",
        directive: null
      };
      this.deps.game.killsInZone = 0;
      this.openTestZone("cosmos_challenge");
    }
    startTestOcean(depth, guardian = false) {
      const ocean = this.deps.ensureOceanState(), oxygen = Math.max(1, Math.floor(this.deps.getOceanOxygenMax()));
      const bossClearM = guardian ? Math.max(0, depth - this.deps.getOceanBossBoundaryInterval()) : Math.floor(depth / this.deps.getOceanBossBoundaryInterval()) * this.deps.getOceanBossBoundaryInterval();
      Object.assign(ocean, {
        unlocked: true,
        diving: true,
        checkpointM: depth,
        depthM: depth,
        bossClearM,
        oxygenMax: oxygen,
        oxygenCur: oxygen,
        drowning: false,
        drownSec: 0,
        lastTickAt: this.deps.getCombatTime()
      });
      this.openTestZone(this.deps.OCEAN_ZONE_ID);
    }
    startTestBoundary() {
      const boundary = this.deps.ensureBeyondBoundaryState(this.deps.game);
      boundary.activeRun = {
        tier: boundary.selectedTier,
        wave: 1,
        sealId: boundary.selectedSealId,
        rewardFocusId: boundary.selectedRewardFocusId,
        intensityId: boundary.selectedIntensityId,
        returnZoneId: Number.isInteger(this.deps.game.currentZoneId) ? this.deps.game.currentZoneId : 0
      };
      this.openTestZone(this.deps.BEYOND_BOUNDARY_ZONE_ID);
    }
    startTestColony() {
      if (this.deps.game.colony.inRun) return;
      this.deps.game.currencies.colonyTrace = (this.deps.game.currencies.colonyTrace || 0) + 1;
      this.deps.startColonyRun();
    }
    startTestBreach() {
      this.deps.game.voidRift.grandBreachUnlock = true;
      this.deps.enterGrandBreach();
    }
    startTestEcho() {
      Object.assign(this.deps.ensureWoodsmanEchoRunState(), { active: true, duration: 30, timeLeft: 30, lastTickAt: this.deps.getCombatTime(), totalDamage: 0 });
      this.openTestZone(this.deps.WOODSMAN_ECHO_ZONE_ID);
    }
    startTestAtlas(kind) {
      if (this.deps.game.atlas.run) this.deps.atlasRun.abandon();
      const node = this.deps.atlas.nodes.find((row) => row.kind === kind), map = this.deps.atlasMaps.create(node.id, node.tier, "normal");
      map.uid = this.deps.game.atlas.nextUid++;
      this.deps.game.atlas.unlocked = true;
      this.deps.game.loopProgressCurrent.chaos20Cleared = true;
      this.deps.game.atlas.stash.push(map);
      const reason = this.deps.atlasRun.open(map.uid);
      if (reason) this.note(reason);
    }
    enterTestZone(index) {
      const [name, zoneId, start] = this.testZones[index] || [];
      if (!name) return;
      const box = this.root.querySelector("#dtp-god");
      if (box && !box.checked) {
        box.checked = true;
        this.toggleGodMode(true);
      }
      if (start) {
        start();
        this.refresh();
        this.note(`${name} 시험 입장(무적 켬)`);
        return;
      }
      const id = zoneId();
      if (typeof id === "number") this.deps.game.maxZoneId = Math.max(this.deps.game.maxZoneId || 0, id);
      this.deps.game.currentZoneId = id;
      this.deps.game.enemies = [];
      this.deps.game.actExploration = null;
      this.deps.game.encounterPlan = [];
      this.deps.game.runProgress = 0;
      this.deps.ensureEncounterRun();
      this.refresh();
      this.note(`${name}에 시험 입장(무적 켬)`);
    }
    travelToAct(order) {
      const zoneId = order - 1;
      this.deps.game.maxZoneId = Math.max(this.deps.game.maxZoneId || 0, zoneId);
      this.deps.changeZone(zoneId);
      this.refresh();
      this.note(`${this.deps.withDirectionParticle(`액트 ${order}`)} 이동`);
    }
    gemLabel(name) {
      const id = this.deps.SKILL_FX_ATLAS[name]?.id;
      return id ? `${String(id).padStart(2, "0")} ${name}` : name;
    }
    gemGroup(name) {
      const tags = this.deps.SKILL_DB[name].tags || [];
      if (tags.includes("summon_attack")) return "소환";
      if (tags.includes("mobility")) return "이동 스킬(따로 장착)";
      if (this.deps.SKILL_DB[name].nativeCastId) return "전용 시전(44~51)";
      return tags.includes("spell") ? "주문" : "공격";
    }
    gemSelect() {
      const select = this.el("select", { id: "dtp-gem" });
      const groups = /* @__PURE__ */ new Map();
      Object.keys(this.deps.SKILL_DB).filter((name) => this.deps.SKILL_DB[name].isGem).forEach((name) => {
        const group = this.gemGroup(name);
        if (!groups.has(group)) groups.set(group, this.el("optgroup", { label: group }));
        groups.get(group).append(this.el("option", { value: name, textContent: this.gemLabel(name) }));
      });
      groups.forEach((group) => select.append(group));
      select.value = this.deps.SKILL_DB[this.deps.game.activeSkill]?.isGem ? this.deps.game.activeSkill : "이중 베기";
      return select;
    }
    classRow() {
      return this.row(Object.keys(this.deps.PLAYER_CLASS_DEFS).map((id) => this.button(this.deps.PLAYER_CLASS_DEFS[id].label, () => this.chooseClass(id))));
    }
    characterSection() {
      return this.section("캐릭터", [this.classRow()]);
    }
    monsterRows() {
      const look = this.el("select", { id: "dtp-monster-look" }, [
        this.el("option", { value: "", textContent: "원래 모습" }),
        ...this.deps.stageRoster.looks().map(([value, label]) => this.el("option", { value, textContent: label }))
      ]);
      look.value = this.deps.game.settings.stageMonsterLook || "";
      look.onchange = () => this.setSetting("stageMonsterLook", look.value, `몬스터 모습: ${look.selectedOptions[0].textContent}`);
      return [this.row([this.el("label", { textContent: "몬스터 모습" }), look])];
    }
    stageSection() {
      const stance = this.el("select", { id: "dtp-stance" }, STAGE_STANCES.map(([value, label]) => this.el("option", { value, textContent: label })));
      stance.value = this.deps.game.settings.stageStance || "auto";
      stance.onchange = () => this.setSetting("stageStance", stance.value, `무대 자세: ${stance.selectedOptions[0].textContent}`);
      return this.section("옆에서 보는 무대(시험판)", [
        this.row([
          this.el("label", { textContent: "아틀라스" }),
          this.button("한 장", () => {
            this.setSetting("atlasSheet", "on", "아틀라스: 한 장");
            this.deps.atlasUi.refresh();
          }),
          this.button("예전 화면", () => {
            this.setSetting("atlasSheet", "off", "아틀라스: 예전 화면");
            this.deps.atlasUi.refresh();
          })
        ]),
        this.row([
          this.el("label", { textContent: "크기" }),
          this.button("자동", () => this.setSetting("stageZoom", 0, "무대 크기: 자동")),
          ...[1, 1.5, 2].map((zoom) => this.button(`×${zoom}`, () => this.setSetting("stageZoom", zoom, `무대 크기 ×${zoom}`)))
        ]),
        this.row([this.el("label", { textContent: "자세" }), stance]),
        // 단추에는 보통 방의 가로 칸 수를 적는다(전에는 덧칸 0이 '기본'이라고 적혀, 가장 작은 크기가 기본처럼 보였다)
        this.row([this.el("label", { textContent: "방 가로" }), ...this.deps.STAGE_ROOMS.wideSteps.map((step) => this.button(
          `${this.deps.STAGE_ROOMS.slot + step}칸`,
          () => this.setStageRoomSize("stageRoomWide", step, `방 가로: ${this.deps.STAGE_ROOMS.slot + step}칸`)
        ))]),
        this.row([this.el("label", { textContent: "방 깊이" }), ...this.deps.STAGE_ROOMS.deepSteps.map((step) => this.button(
          `${this.deps.STAGE_ROOMS.depth + step}칸`,
          () => this.setStageRoomSize("stageRoomDeep", step, `방 깊이: ${this.deps.STAGE_ROOMS.depth + step}칸`)
        ))]),
        // 방 놓임새(data/stage-room-plans.js): 액트는 프리셋 넷 가운데 하나가 소프트 랜덤으로 나온다. 여기서 하나를 못박거나 준 랜덤으로 짜 볼 수 있다.
        this.row([
          this.el("label", { textContent: "놓임새" }),
          this.button("자동", () => this.setStageRoomSize("stageRoomPlan", "auto", "방 놓임새: 자동(프리셋 넷 가운데)")),
          ...[1, 2, 3, 4].map((index) => this.button(String(index), () => this.setStageRoomSize("stageRoomPlan", index, `방 놓임새: 프리셋 ${index}`))),
          this.button("준 랜덤", () => this.setStageRoomSize("stageRoomPlan", "random", "방 놓임새: 준 랜덤"))
        ]),
        this.row([this.el("label", { textContent: "시야" }), this.button("방 전체", () => this.setStageSight("room")), this.button("반경과 안개", () => this.setStageSight("fog"))]),
        // 무대의 스킬 이펙트(js/canvas-stage-skill-vfx.js): 인계 받은 새 클립과 시전 마법진. 끄면 예전 이펙트가 나온다.
        this.row([
          this.el("label", { textContent: "난입" }),
          this.button("방 난입", () => this.testInvader("room", "이 방에 다른 보스")),
          this.button("뿌리 절단자", () => this.testInvader("roomGrinder", "이 방에 뿌리 절단자")),
          this.button("보스 둘", () => this.testInvader("twin", "다음 보스 방: 보스 둘")),
          this.button("추가 보스", () => this.testInvader("extra", "다음 보스 방: 싸우는 도중 다른 보스")),
          this.button("추가 절단자", () => this.testInvader("grinder", "다음 보스 방: 싸우는 도중 뿌리 절단자"))
        ]),
        this.row([
          this.el("label", { textContent: "이펙트" }),
          this.button("새 그림", () => this.setSetting("stageSkillFx", "on", "무대 스킬 이펙트: 새 그림")),
          this.button("예전 그림", () => this.setSetting("stageSkillFx", "off", "무대 스킬 이펙트: 예전 그림"))
        ]),
        ...this.monsterRows()
      ]);
    }
    gemSection() {
      const select = this.gemSelect();
      return this.section("스킬 이펙트", [
        this.row([select, this.button("장착", () => this.equipGem(select.value))]),
        this.row([
          this.button("리메이크(16도트)", () => this.setSetting("skillFxStyle", "remake", "이펙트: 리메이크")),
          this.button("원본 v3.38", () => this.setSetting("skillFxStyle", "original", "이펙트: 원본"))
        ]),
        this.row([this.el("label", { textContent: "효과 확장" }), ...["없음", "+1", "+2"].map((label, n) => this.button(label, () => this.setExpansion(n), { dataset: { expand: String(n) } }))])
      ]);
    }
    combatSection() {
      const god = this.el("input", { type: "checkbox", id: "dtp-god", onchange: () => this.toggleGodMode(god.checked) });
      const soundRunes = this.soundRuneSelect();
      return this.section("전투", [
        this.row([this.el("label", { htmlFor: "dtp-god" }, [god, " 무적(생명력 유지)"])]),
        this.row(SPEEDS.map((value) => this.button(`×${value}`, () => this.setSpeed(value), { dataset: { speed: String(value) } }))),
        // 잔잔한 사건(js/combat-incidents.js): 지금 싸우는 무리 곁에 슬라임을 바로 세운다
        this.row([
          this.el("label", { textContent: "사건" }),
          this.button("금빛 슬라임", () => this.spawnCritter(false)),
          this.button("무지갯빛 슬라임", () => this.spawnCritter(true)),
          this.button("하품", () => this.note(this.deps.combatIncidents.testYawn() ? "세계수가 하품을 했습니다" : "지금 싸우는 몬스터가 없습니다")),
          this.button("잠든 무리", () => this.note(this.deps.combatIncidents.testSleep() ? "지금 방의 몬스터가 잠들었습니다" : "지금 싸우는 몬스터가 없습니다")),
          this.button("길 잃은 몬스터", () => this.note(this.deps.combatIncidents.testStray() ? "길 잃은 몬스터를 세웠습니다" : "바꿀 몬스터나 가 본 다른 액트가 없습니다")),
          this.button("별똥별", () => this.note(this.deps.combatIncidents.testStar() ? "별똥별을 떨어뜨렸습니다" : "방 단위 지도의 방에서만 됩니다")),
          this.button("사냥 도전", () => this.note(this.deps.combatIncidents.testChallenge() ? "사냥 도전을 열었습니다" : "방 단위 지도의 방에서만, 하나씩 됩니다")),
          this.button("세계수의 숨결", () => this.note(this.deps.combatIncidents.testBreath() ? "세계수의 숨결이 깃들었습니다" : "숨결을 부르지 못했습니다")),
          this.button("유성우", () => this.note(this.deps.combatIncidents.testShower() ? "유성우를 떨어뜨렸습니다" : "방 단위 지도의 방에서만 됩니다")),
          this.button("수액 잔치", () => this.note(this.deps.combatIncidents.testFeast() ? "황금 수액 잔치를 열었습니다" : "지금 방에 보통 몬스터가 없습니다"))
        ]),
        this.row([this.el("label", { textContent: "타격음별 룬" }), soundRunes, this.button("장착", () => this.equipGem(soundRunes.value)), this.button("다음", () => this.nextSoundRune(soundRunes))])
      ]);
    }
    spawnCritter(rainbow) {
      this.note(this.deps.combatIncidents.testSpawn(rainbow) ? "수액 슬라임을 세웠습니다" : "지금 방에서 싸우는 무리가 없습니다");
    }
    progressSection() {
      const acts = this.el("select", { id: "dtp-act" }, this.deps.STORY_ACTS.map((act) => this.el("option", { value: String(act.order), textContent: `액트 ${act.displayAct}, ${act.title}` })));
      const zones = this.el("select", { id: "dtp-zone" }, this.testZones.map(([name], index) => this.el("option", { value: String(index), textContent: name })));
      return this.section("진행", [
        this.row([this.button("레벨 +1", () => this.addLevels(1)), this.button("레벨 +5", () => this.addLevels(5)), this.button("레벨 +20", () => this.addLevels(20))]),
        this.row([acts, this.button("이동", () => this.travelToAct(Number(acts.value)))]),
        this.row([zones, this.button("시험 입장", () => this.enterTestZone(Number(zones.value)))]),
        this.row([this.button("그루터기 함 받기", this.grantStumpBox), this.button("씨앗 +8", this.giveStumpItems), this.button("함 성장 +100", this.growStumpBox)]),
        this.row([this.button("고유 액막이 셋", this.giveUniqueWards), this.button("완전한 코어", () => {
          this.deps.coreItems.keep(this.deps.coreItems.rollPerfect());
          this.refresh();
          this.note("완전한 코어 1개");
        })])
      ]);
    }
    status() {
      const line = this.root && this.root.querySelector(".dtp-status");
      if (!line) return;
      const fx = this.deps.game.settings.skillFxStyle === "original" ? "원본" : "리메이크";
      line.textContent = `${this.deps.PLAYER_CLASS_DEFS[this.deps.game.selectedClassId]?.label || "-"}, ${this.deps.game.activeSkill}${this.deps.game.mobilitySkill ? " + " + this.deps.game.mobilitySkill : ""}, ${this.weaponLabel()}, Lv.${this.deps.game.level}, 이펙트 ${fx}, ×${this.speed}`;
    }
    weaponLabel() {
      const weapon = this.deps.getWeaponCategoryId(this.deps.game.equipment["무기"]) || this.deps.HANA_WEAPON_COMBOS.classWeapons[this.deps.getHeroAppearanceId()];
      return this.deps.WEAPON_CATEGORIES[weapon]?.name || "-";
    }
    mount() {
      const panel2 = this.el("div", { className: "dtp-panel", hidden: true }, [
        this.el("header", {}, [this.el("strong", { textContent: "🧪 테스트 패널" }), this.button("닫기", () => {
          panel2.hidden = true;
        })]),
        this.el("p", { className: "dtp-status" }),
        this.characterSection(),
        this.stageSection(),
        this.gemSection(),
        this.combatSection(),
        this.progressSection(),
        this.el("p", { className: "dtp-hint", textContent: "로컬 테스트 전용, 이 세이브에 바로 반영됩니다. 새 게임은 런처 2번(임시 세이브)으로." })
      ]);
      const toggle = this.button("🧪 테스트", () => {
        panel2.hidden = !panel2.hidden;
        this.status();
      }, { className: "dtp-toggle" });
      this.root = this.el("div", { id: "dev-test-panel" }, [this.el("style", { textContent: STYLE }), toggle, panel2]);
      this.deps.document.body.append(this.root);
      this.setSpeed(1);
      this.status();
    }
    init() {
      if (this.isEnabled() && !this.root) this.mount();
    }
    dispose() {
      this.generation++;
      this.deps.document.removeEventListener("DOMContentLoaded", this.init);
      this.deps.clearInterval(this.godTimer);
      this.godTimer = null;
      this.root?.remove();
      this.root = null;
    }
  };

  // modules/dev-test-panel-ui-classic.mjs
  var panel = new DevTestPanel({
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get CHAOS_REALM_ZONE_ID() {
      return CHAOS_REALM_ZONE_ID;
    },
    get COLONY_WARD_UNIQUES() {
      return COLONY_WARD_UNIQUES;
    },
    get HANA_WEAPON_COMBOS() {
      return HANA_WEAPON_COMBOS;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get MAX_PLAYER_LEVEL() {
      return MAX_PLAYER_LEVEL;
    },
    get OCEAN_ZONE_ID() {
      return OCEAN_ZONE_ID;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get PLAYER_CLASS_DEFS() {
      return PLAYER_CLASS_DEFS;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get SKILL_FX_ATLAS() {
      return SKILL_FX_ATLAS;
    },
    get SKILL_RUNE_FAMILY() {
      return SKILL_RUNE_FAMILY;
    },
    get SKILL_RUNE_STANCE_BY_CATEGORY() {
      return SKILL_RUNE_STANCE_BY_CATEGORY;
    },
    get SKILL_RUNE_WEAPONS() {
      return SKILL_RUNE_WEAPONS;
    },
    get SKY_TOWER_ZONE_ID() {
      return SKY_TOWER_ZONE_ID;
    },
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get UNDERWORLD_ZONE_ID() {
      return UNDERWORLD_ZONE_ID;
    },
    get URLSearchParams() {
      return URLSearchParams;
    },
    get WEAPON_CATEGORIES() {
      return WEAPON_CATEGORIES;
    },
    get WOODSMAN_ECHO_ZONE_ID() {
      return WOODSMAN_ECHO_ZONE_ID;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get addItemToInventory() {
      return addItemToInventory;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get applyHeroSelection() {
      return applyHeroSelection;
    },
    get atlas() {
      return atlas;
    },
    get atlasMaps() {
      return atlasMaps;
    },
    get atlasRun() {
      return atlasRun;
    },
    get atlasUi() {
      return atlasUi;
    },
    get changeSkill() {
      return changeSkill;
    },
    get changeZone() {
      return changeZone;
    },
    get checkUnlocks() {
      return checkUnlocks;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get colonyWards() {
      return colonyWards;
    },
    get combatIncidents() {
      return combatIncidents;
    },
    get console() {
      return console;
    },
    get contentProgression() {
      return contentProgression;
    },
    get coreItems() {
      return coreItems;
    },
    get createItemFromBase() {
      return createItemFromBase;
    },
    get document() {
      return document;
    },
    get ensureBeyondBoundaryState() {
      return ensureBeyondBoundaryState;
    },
    get ensureEncounterRun() {
      return ensureEncounterRun;
    },
    get ensureOceanState() {
      return ensureOceanState;
    },
    get ensureWoodsmanEchoRunState() {
      return ensureWoodsmanEchoRunState;
    },
    get enterGrandBreach() {
      return enterGrandBreach;
    },
    get equipItemById() {
      return equipItemById;
    },
    get fetch() {
      return windowFetch;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getAbyssZoneIdForDepth() {
      return getAbyssZoneIdForDepth;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getEquippedWeaponStance() {
      return getEquippedWeaponStance;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    },
    get getOceanBossBoundaryInterval() {
      return getOceanBossBoundaryInterval;
    },
    get getOceanOxygenMax() {
      return getOceanOxygenMax;
    },
    get getPlayerHpCap() {
      return getPlayerHpCap;
    },
    get getRuneLevelReq() {
      return getRuneLevelReq;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get getWeaponCategoryOfBase() {
      return getWeaponCategoryOfBase;
    },
    get getZone() {
      return getZone;
    },
    get hasEquippedShield() {
      return hasEquippedShield;
    },
    get isSkillRuneUsableWithStance() {
      return isSkillRuneUsableWithStance;
    },
    get location() {
      return typeof location === "undefined" ? void 0 : location;
    },
    get openBeehiveChoiceOverlay() {
      return openBeehiveChoiceOverlay;
    },
    get roomInvaders() {
      return roomInvaders;
    },
    get setCombatTestImmortal() {
      return setCombatTestImmortal;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get setTestCombatSpeed() {
      return setTestCombatSpeed;
    },
    get skillEffectExpansion() {
      return skillEffectExpansion;
    },
    get stageRoster() {
      return stageRoster;
    },
    get startBeehiveRun() {
      return startBeehiveRun;
    },
    get startColonyRun() {
      return startColonyRun;
    },
    get stumpBox() {
      return stumpBox;
    },
    get toggleSummonAttackGem() {
      return toggleSummonAttackGem;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get withDirectionParticle() {
      return withDirectionParticle;
    },
    get worldTreeSkillFx() {
      return worldTreeSkillFx;
    }
  });
  window.GameModules.devTestPanel = panel;
  safeExposeGlobals({ devTestPanel: panel });
  document.addEventListener("DOMContentLoaded", panel.init, { once: true });
})();
