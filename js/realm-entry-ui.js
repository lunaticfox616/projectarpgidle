// GENERATED from modules/realm-entry-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/realm-progress.mjs
  function underworldEntryProgress(owner) {
    const progress = owner.underworldProgress;
    if (!progress || typeof progress !== "object") owner.underworldProgress = { highestFloor: 1, currentFloor: 1 };
    return owner.underworldProgress;
  }

  // modules/domain/realm-entry-rules.mjs
  function validRealmFloor(value, max) {
    const floor = Number(value);
    return Number.isInteger(floor) && floor >= 1 && floor <= max ? floor : null;
  }
  function selectLabyrinthLevel(owner, value) {
    const max = Math.max(1, Math.floor(owner.labyrinthUnlockedMaxFloor || owner.labyrinthFloor || 1));
    const floor = validRealmFloor(value, max);
    if (floor === null) return { reason: "floor", max };
    owner.labyrinthFloor = floor;
    return { ok: true };
  }
  function selectRealmLevel(progress, value, max) {
    const floor = validRealmFloor(value, max);
    if (floor === null) return { reason: "floor", max };
    progress.currentFloor = floor;
    return { ok: true };
  }
  function strengthenSkyStone(tower, max, cost) {
    if (!tower.unlocked) return { reason: "unlock" };
    const before = Math.max(0, Math.floor((tower.skyStone || {}).level || 0));
    if (before >= max) return { reason: "max" };
    if (Math.max(0, Math.floor(tower.condensedPower || 0)) < cost) return { reason: "cost", cost };
    tower.condensedPower -= cost;
    tower.skyStone = tower.skyStone || { crafted: false, level: 0 };
    tower.skyStone.crafted = true;
    tower.skyStone.level = before + 1;
    return { ok: true, before };
  }
  function consumeBattleTrialKey(owner) {
    if ((owner.currencies.trialKey3 || 0) <= 0) return false;
    owner.currencies.trialKey3 -= 1;
    return true;
  }
  function woodsmanEchoOpen(realm) {
    return (realm.woodsmanBestDamagePct || 0) >= 100;
  }
  function talentBloomAdmission(owner, echoOpen) {
    if (!echoOpen) return "echo";
    if (!owner.ascendClass) return "class";
    if (!((owner.currencies.chaosKey || 0) >= 1) || !((owner.currencies.coreKey || 0) >= 1)) return "keys";
    return null;
  }
  function prepareTalentBloomTrial(owner, heroId, echoOpen) {
    const reason = talentBloomAdmission(owner, echoOpen);
    if (reason) return { reason };
    owner.pendingTalentBloomHeroId = heroId;
    return { ok: true };
  }
  function unlockedDeepChaosDepths(owner) {
    return Array.isArray(owner.abyssUnlockedDepths) ? owner.abyssUnlockedDepths.map((value) => Math.floor(value || 0)).filter((value) => value >= 21) : [];
  }
  function deepChaosEntryStatus(owner, cleared) {
    if ((owner.season || 1) < 10 || !cleared) return { open: false, highestDepth: 20, currentDepth: Math.floor(owner.abyssEndlessDepth || 20) };
    const currentDepth = Math.floor(owner.abyssEndlessDepth || 21);
    const unlocked = unlockedDeepChaosDepths(owner);
    return { open: true, highestDepth: Math.max(21, unlocked.length ? Math.max(...unlocked) : currentDepth), currentDepth };
  }
  function toggleRootBossRepeat(owner) {
    owner.autoRepeatSeasonBoss = !owner.autoRepeatSeasonBoss;
    return owner.autoRepeatSeasonBoss;
  }

  // modules/ui/realm-floor-entry.mjs
  var RealmFloorEntry = class {
    constructor(deps2) {
      this.deps = deps2;
      this.active = true;
    }
    labyrinth(requestedFloor) {
      if (!this.active) return;
      const blocked = this.blockReason((0, this.deps.LABYRINTH_ZONE_ID));
      if (blocked) return (0, this.deps.addLog)(blocked, "attack-monster");
      const result = selectLabyrinthLevel(this.deps.game, requestedFloor);
      if (!result.ok) {
        return (0, this.deps.addLog)((0, this.deps._t)("1~{max} 범위의 층수를 입력하세요.", { max: result.max }), "attack-monster");
      }
      (0, this.deps.changeZone)((0, this.deps.LABYRINTH_ZONE_ID));
    }
    async confirmSky() {
      if ((0, this.deps.getSkyTowerRemainingClears)() === 0) return (0, this.deps.requestGameConfirmation)((0, this.deps._t)("등반 보상 없이 한 층을 연습합니다."), {
        title: (0, this.deps._t)("연습 전투"),
        tone: "warning",
        confirmLabel: (0, this.deps._t)("연습 입장")
      });
      if (this.deps.game.settings.mapCompleteAction !== "repeatZone") return true;
      return (0, this.deps.requestGameConfirmation)((0, this.deps._t)("현재 맵 완료 행동이 '같은 지역 반복'입니다. 돌파 후 같은 층에 머무릅니다."), {
        title: (0, this.deps._t)("반복 설정 확인"),
        tone: "warning",
        confirmLabel: (0, this.deps._t)("그대로 입장")
      });
    }
    async pickSkyFloor(tower, selectedFloor, context) {
      const max = tower.highestFloor;
      let value = selectedFloor;
      if (value === void 0 && max > 1) value = await (0, this.deps.requestGameNumber)({
        title: (0, this.deps._t)("창공의 탑 층 선택"),
        message: (0, this.deps._t)("이번 루프 남은 보상 전투: {skyTowerRemainingClears}/{skyTowerLoopClearLimit}", { skyTowerRemainingClears: (0, this.deps.getSkyTowerRemainingClears)(), skyTowerLoopClearLimit: (0, this.deps.getSkyTowerLoopClearLimit)() }),
        min: 1,
        max,
        value: tower.currentFloor,
        confirmLabel: (0, this.deps._t)("입장")
      });
      if (!this.current(context, this.deps.canEnterSkyTower)) return null;
      if (value === void 0) value = 1;
      if (value === null) return null;
      const floor = validRealmFloor(value, max);
      if (floor !== null) return floor;
      (0, this.deps.addLog)((0, this.deps._t)("1~{max} 범위의 층수를 입력하세요.", { max }), "attack-monster");
      return null;
    }
    blockReason(zoneId) {
      return (0, this.deps.getZoneTravelBlockReason)(zoneId) || (0, this.deps.getHeldRunBlockReason)();
    }
    current(context, canEnter) {
      return this.active && this.deps.game === context.owner && this.deps.game[context.field] === context.progress && this.deps.game.season === context.season && this.deps.game.loopCount === context.loop && canEnter();
    }
    async sky(selectedFloor) {
      if (!this.active) return;
      const held = this.blockReason((0, this.deps.SKY_TOWER_ZONE_ID));
      if (held) return (0, this.deps.addLog)(held, "attack-monster");
      const st = (0, this.deps.ensureSkyTowerState)();
      if (!st.unlocked) return (0, this.deps.addLog)((0, this.deps._t)("창공의 탑은 루프 15 이후 이번 루프 혼돈 20층 클리어 시 해금됩니다."), "attack-monster");
      if (!(0, this.deps.canEnterSkyTower)()) return (0, this.deps.addLog)((0, this.deps._t)("창공의 탑은 영구 해금 후 해당 루프에서 혼돈에 입성하면 입장할 수 있습니다."), "attack-monster");
      const context = { owner: this.deps.game, progress: st, field: "skyTower", season: this.deps.game.season, loop: this.deps.game.loopCount };
      if (!await this.confirmSky()) return;
      if (!this.current(context, this.deps.canEnterSkyTower)) return;
      const floor = await this.pickSkyFloor(st, selectedFloor, context);
      if (floor === null) return;
      this.finishSkyEntry(context, floor);
    }
    finishSkyEntry(context, floor) {
      if (!this.current(context, (0, this.deps.canEnterSkyTower))) return;
      const stillHeld = this.blockReason((0, this.deps.SKY_TOWER_ZONE_ID));
      if (stillHeld) return (0, this.deps.addLog)(stillHeld, "attack-monster");
      if (!selectRealmLevel(context.progress, floor, context.progress.highestFloor).ok) return;
      (0, this.deps.changeZone)((0, this.deps.SKY_TOWER_ZONE_ID));
      (0, this.deps.updateStaticUI)();
    }
    skyStone() {
      if (!this.active || !(0, this.deps.assertBuildEditable)()) return;
      const tower = this.deps.ensureSkyTowerState();
      const result = strengthenSkyStone(tower, this.deps.getSkyStoneMaxLevel(), this.deps.getSkyStoneNextCost());
      if (!result.ok) return this.skyStoneFailure(result);
      (0, this.deps.addLog)((0, this.deps._t)(result.before === 0 ? "창공석 제작 완료: 지하계 중력 패널티 감소 {pct}%" : "창공석 강화 완료: 지하계 중력 패널티 감소 {pct}%", { pct: (0, this.deps.getSkyStoneReductionPct)() }), "loot-unique");
      (0, this.deps.queueImportantSave)(200);
      (0, this.deps.updateStaticUI)();
    }
    skyStoneFailure(result) {
      const { _t: _t2, addLog: addLog2 } = this.deps;
      if (result.reason === "unlock") return addLog2(_t2("창공의 탑이 열린 뒤 창공석을 만들 수 있습니다."), "attack-monster", { toast: true });
      if (result.reason === "max") return addLog2(_t2("창공석은 이미 최종 강화 상태입니다."), "attack-monster");
      return addLog2(_t2("응축된 창공의 정수가 부족합니다. (필요: {cost})", { cost: result.cost }), "attack-monster");
    }
    async chaos() {
      if (!this.active) return;
      const held = this.blockReason((0, this.deps.CHAOS_REALM_ZONE_ID));
      if (held) return (0, this.deps.addLog)(held, "attack-monster");
      let st = (0, this.deps.ensureChaosRealmState)();
      if (!st.unlocked) return (0, this.deps.addLog)((0, this.deps._t)("혼돈계는 혼돈 밖 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투 종료 시 해금됩니다."), "attack-monster");
      if (!(0, this.deps.canEnterChaosRealm)()) return (0, this.deps.addLog)((0, this.deps._t)("혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다."), "attack-monster");
      const context = { owner: this.deps.game, progress: st, field: "chaosRealm", season: this.deps.game.season, loop: this.deps.game.loopCount };
      const max = st.highestFloor;
      let v = await (0, this.deps.requestGameNumber)({
        title: (0, this.deps._t)("혼돈계 층 선택"),
        message: (0, this.deps._t)("입장 가능한 최고 층은 {max}층입니다.", { max }),
        min: 1,
        max,
        value: max,
        confirmLabel: (0, this.deps._t)("입장")
      });
      if (v === null || !this.current(context, (0, this.deps.canEnterChaosRealm))) return;
      const blocked = this.blockReason((0, this.deps.CHAOS_REALM_ZONE_ID));
      if (blocked) return (0, this.deps.addLog)(blocked, "attack-monster");
      if (!selectRealmLevel(st, v, st.highestFloor).ok) return (0, this.deps.addLog)((0, this.deps._t)("1~{highestFloor} 범위의 층수를 입력하세요.", { highestFloor: st.highestFloor }), "attack-monster");
      (0, this.deps.changeZone)((0, this.deps.CHAOS_REALM_ZONE_ID));
      (0, this.deps.updateStaticUI)();
    }
    underworld(requestedFloor) {
      if (!this.active) return;
      const held = this.blockReason((0, this.deps.UNDERWORLD_ZONE_ID));
      if (held) return (0, this.deps.addLog)(held, "attack-monster");
      if (!(typeof (0, this.deps.canEnterUnderworld) === "function" && (0, this.deps.canEnterUnderworld)())) return (0, this.deps.addLog)((0, this.deps._t)("지하계 입장 조건: 야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층 + 이번 루프 혼돈20 클리어"), "attack-monster");
      const uw = underworldEntryProgress(this.deps.game);
      let max = Math.max(1, Math.floor(uw.highestFloor || 1));
      if (!selectRealmLevel(uw, requestedFloor, max).ok) return (0, this.deps.addLog)((0, this.deps._t)("1~{max} 범위의 층수를 입력하세요.", { max }), "attack-monster");
      (0, this.deps.changeZone)((0, this.deps.UNDERWORLD_ZONE_ID));
      (0, this.deps.updateStaticUI)();
    }
    async pickUnderworld() {
      if (!this.active) return;
      const held = this.blockReason((0, this.deps.UNDERWORLD_ZONE_ID));
      if (held) return (0, this.deps.addLog)(held, "attack-monster");
      if (!(typeof (0, this.deps.canEnterUnderworld) === "function" && (0, this.deps.canEnterUnderworld)())) return this.underworld(1);
      const uw = underworldEntryProgress(this.deps.game);
      const context = { owner: this.deps.game, progress: uw, field: "underworldProgress", season: this.deps.game.season, loop: this.deps.game.loopCount };
      let max = Math.max(1, Math.floor(uw.highestFloor || 1));
      let v = await (0, this.deps.requestGameNumber)({
        title: (0, this.deps._t)("지하계 층 선택"),
        message: (0, this.deps._t)("입장 가능한 최고 층은 {max}층입니다.", { max }),
        min: 1,
        max,
        value: max,
        confirmLabel: (0, this.deps._t)("입장")
      });
      if (v === null || !this.current(context, (0, this.deps.canEnterUnderworld))) return;
      this.underworld(v);
    }
    dispose() {
      this.active = false;
    }
  };

  // modules/ui/realm-trial-entry.mjs
  var RealmTrialEntry = class {
    constructor(deps2) {
      this.deps = deps2;
      this.active = true;
    }
    trial(trialId) {
      if (!this.active) return;
      if (!(0, this.deps.contentProgression).isUnlocked("battleTrials")) return (0, this.deps.addLog)((0, this.deps._t)("루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다."), "attack-monster");
      if (!["trial_3", "trial_4"].includes(trialId)) return (0, this.deps.changeZone)(trialId);
      const block = (0, this.deps.getContentStartBlockReason)() || (0, this.deps.getZoneTravelBlockReason)(trialId);
      if (block) return (0, this.deps.addLog)(block, "attack-monster");
      if (!consumeBattleTrialKey(this.deps.game)) return (0, this.deps.addLog)((0, this.deps._t)("시련의 증표가 부족합니다."), "attack-monster");
      (0, this.deps.addLog)((0, this.deps._t)("🗝️ 시련의 증표 1개 소모 (남은 {value})", { value: this.deps.game.currencies.trialKey3 || 0 }), "season-up");
      (0, this.deps.changeZone)(trialId);
    }
    echoOpen() {
      if (typeof (0, this.deps.ensureChaosRealmState) !== "function") return false;
      return woodsmanEchoOpen(this.deps.ensureChaosRealmState());
    }
    bloomOpen() {
      return !talentBloomAdmission(this.deps.game, this.echoOpen());
    }
    async chooseHero() {
      return (0, this.deps.getTalentBloomHeroIdForAscendancy)(this.deps.game.ascendClass) || (0, this.deps.HERO_SELECTION_ORDER)[0];
    }
    async bloom() {
      if (!this.active) return;
      const held = (0, this.deps.getHeldRunBlockReason)();
      if (held) return (0, this.deps.addLog)(held, "attack-monster");
      const reason = talentBloomAdmission(this.deps.game, this.echoOpen());
      if (reason) return this.bloomFailure(reason);
      const context = this.capture(), ascendClass = this.deps.game.ascendClass;
      let heroId = await this.chooseHero();
      if (!this.current(context) || this.deps.game.ascendClass !== ascendClass) return;
      if (!(0, this.deps.HERO_SELECTION_DEFS)[heroId]) return;
      const blocked = this.deps.getHeldRunBlockReason();
      if (blocked) return this.deps.addLog(blocked, "attack-monster");
      const result = prepareTalentBloomTrial(this.deps.game, heroId, this.echoOpen());
      if (!result.ok) return this.bloomFailure(result.reason);
      (0, this.deps.addLog)((0, this.deps._t)("개화 시련 도전: [{bloomName}] ({label} 재능 × {name})", { bloomName: (0, this.deps.getTalentCardName)(heroId, this.deps.game.ascendClass).bloomName, label: (0, this.deps.HERO_SELECTION_DEFS)[heroId].label, name: (0, this.deps.CLASS_TEMPLATES)[this.deps.game.ascendClass].name }), "season-up");
      if (typeof (0, this.deps.saveGame) === "function") (0, this.deps.saveGame)({ skipCloudSync: true });
      (0, this.deps.changeZone)("trial_5");
    }
    bloomFailure(reason) {
      const { _t: _t2, addLog: addLog2 } = this.deps;
      if (reason === "echo") return addLog2(_t2("🔒 나무꾼의 잔상이 아직 열리지 않았습니다. 혼돈 밖 나무꾼을 100% 처치하세요."), "attack-monster");
      if (reason === "class") return addLog2(_t2("🔒 재능 개화는 전직을 고른 뒤 도전할 수 있습니다."), "attack-monster");
      return addLog2(_t2("🔒 카오스 키와 코어 키가 각각 1개씩 필요합니다."), "attack-monster");
    }
    capture() {
      const owner = this.deps.game;
      return { owner, season: owner.season, loop: owner.loopCount };
    }
    current(context) {
      const owner = this.deps.game;
      return this.active && owner === context.owner && owner.season === context.season && owner.loopCount === context.loop;
    }
    async deepChaos() {
      if (!this.active) return;
      const held = (0, this.deps.getHeldRunBlockReason)();
      if (held) return (0, this.deps.addLog)(held, "attack-monster");
      const context = this.capture();
      const unlocked = unlockedDeepChaosDepths(this.deps.game);
      let max = Math.max(20, unlocked.length ? Math.max(...unlocked) : Math.floor(this.deps.game.abyssEndlessDepth || 20));
      let depth = await (0, this.deps.requestGameNumber)({
        title: (0, this.deps._t)("혼돈 심화층 선택"),
        message: unlocked.length > 0 ? (0, this.deps._t)("해금된 심화층 범위: 21 ~ {max}", { max }) : (0, this.deps._t)("입장 가능한 심화층 범위: 21 ~ {max}", { max }),
        min: 21,
        max,
        value: max,
        confirmLabel: (0, this.deps._t)("입장")
      });
      this.finishDeepEntry(context, depth);
    }
    finishDeepEntry(context, depth) {
      if (depth === null || !this.current(context)) return;
      const blocked = this.deps.getHeldRunBlockReason();
      if (blocked) return this.deps.addLog(blocked, "attack-monster");
      depth = Math.floor(Number(depth) || 0);
      const available = unlockedDeepChaosDepths(this.deps.game);
      if (available.length > 0 && !available.includes(depth)) return (0, this.deps.addLog)((0, this.deps._t)("해금된 심화 혼돈 층수만 입장 가능합니다."), "attack-monster");
      (0, this.deps.enterUnlockedEndlessDepth)(depth);
    }
    deepStatus() {
      return deepChaosEntryStatus(this.deps.game, this.deps.hasCurrentLoopChaos20Clear());
    }
    deepHtml() {
      let state = this.deepStatus();
      if (!state.open) return "";
      let current = (0, this.deps.getAbyssDepthFromZoneId)(this.deps.game.currentZoneId) >= 21 ? "current" : "";
      let powerEstimate = (0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)((0, this.deps.getAbyssZoneIdForDepth)(state.currentDepth)));
      return `<div class="map-item map-item--deep-chaos ${current}" data-exploration-departure onclick="enterDeepChaosPrompt()">
            <div class="map-item-main"><span>♾️</span><span>${(0, this.deps._t)("혼돈 심화층")}<br><span class="map-zone-status">${(0, this.deps._t)("현재 심화층: {currentDepth}층, 최고 기록: {highestDepth}층", { currentDepth: state.currentDepth, highestDepth: state.highestDepth })}</span><br>${powerEstimate}</span></div>
            <div class="map-item-actions"><span class="map-zone-status">${(0, this.deps._t)("입장 가능: 21 ~ {highestDepth}", { highestDepth: state.highestDepth })}</span></div>
        </div>`;
    }
    toggleRepeat() {
      if (!this.active) return;
      toggleRootBossRepeat(this.deps.game);
      (0, this.deps.addLog)(`🗝️ ${(0, this.deps._t)("뿌리 보스 반복 도전")}: ${(0, this.deps._t)(this.deps.game.autoRepeatSeasonBoss ? "켜짐" : "꺼짐")}`, "season-up");
      (0, this.deps.updateStaticUI)();
    }
    dispose() {
      this.active = false;
    }
  };

  // modules/realm-entry-ui-classic.mjs
  var deps = {
    get game() {
      return window.GameModules.state.game;
    },
    get CHAOS_REALM_ZONE_ID() {
      return CHAOS_REALM_ZONE_ID;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get HERO_SELECTION_DEFS() {
      return HERO_SELECTION_DEFS;
    },
    get HERO_SELECTION_ORDER() {
      return HERO_SELECTION_ORDER;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get SKY_TOWER_ZONE_ID() {
      return SKY_TOWER_ZONE_ID;
    },
    get UNDERWORLD_ZONE_ID() {
      return UNDERWORLD_ZONE_ID;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get assertBuildEditable() {
      return assertBuildEditable;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get canEnterChaosRealm() {
      return canEnterChaosRealm;
    },
    get canEnterSkyTower() {
      return canEnterSkyTower;
    },
    get canEnterUnderworld() {
      return canEnterUnderworld;
    },
    get changeZone() {
      return changeZone;
    },
    get contentProgression() {
      return contentProgression;
    },
    get ensureChaosRealmState() {
      return ensureChaosRealmState;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get enterUnlockedEndlessDepth() {
      return enterUnlockedEndlessDepth;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get getAbyssZoneIdForDepth() {
      return getAbyssZoneIdForDepth;
    },
    get getContentStartBlockReason() {
      return getContentStartBlockReason;
    },
    get getHeldRunBlockReason() {
      return getHeldRunBlockReason;
    },
    get getSkyStoneMaxLevel() {
      return getSkyStoneMaxLevel;
    },
    get getSkyStoneNextCost() {
      return getSkyStoneNextCost;
    },
    get getSkyStoneReductionPct() {
      return getSkyStoneReductionPct;
    },
    get getSkyTowerLoopClearLimit() {
      return getSkyTowerLoopClearLimit;
    },
    get getSkyTowerRemainingClears() {
      return getSkyTowerRemainingClears;
    },
    get getTalentBloomHeroIdForAscendancy() {
      return getTalentBloomHeroIdForAscendancy;
    },
    get getTalentCardName() {
      return getTalentCardName;
    },
    get getZone() {
      return getZone;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get hasCurrentLoopChaos20Clear() {
      return hasCurrentLoopChaos20Clear;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get requestGameNumber() {
      return requestGameNumber;
    },
    get saveGame() {
      return saveGame;
    },
    get updateStaticUI() {
      return updateStaticUI;
    }
  };
  var floors = new RealmFloorEntry(deps);
  var trials = new RealmTrialEntry(deps);
  safeExposeGlobals({
    enterLabyrinthFloor: (requestedFloor) => floors.labyrinth(requestedFloor),
    enterSkyTowerPrompt: (selectedFloor) => floors.sky(selectedFloor),
    upgradeSkyStone: () => floors.skyStone(),
    enterChaosRealmPrompt: () => floors.chaos(),
    enterUnderworldFloor: (requestedFloor) => floors.underworld(requestedFloor),
    enterUnderworldPrompt: () => floors.pickUnderworld(),
    enterTrialWithTicket: (trialId) => trials.trial(trialId),
    isWoodsmanEchoUnlocked: () => trials.echoOpen(),
    canEnterTalentBloomTrial: () => trials.bloomOpen(),
    enterTalentBloomTrial: () => trials.bloom(),
    enterDeepChaosPrompt: () => trials.deepChaos(),
    getDeepChaosEntryState: () => trials.deepStatus(),
    getDeepChaosMapEntryHtml: () => trials.deepHtml(),
    toggleSeasonBossRepeat: () => trials.toggleRepeat()
  });
  window.GameModules.realmEntryViews = Object.freeze({ dispose: () => {
    floors.dispose();
    trials.dispose();
  } });
})();
