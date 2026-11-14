// GENERATED from modules/map-discovery-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/map-discovery.mjs
  var MAP_EXPLORE_ALARM_SUBTABS = Object.freeze([
    "map-explore-hunting",
    "map-explore-root-boss",
    "map-explore-colony",
    "map-explore-trials"
  ]);
  function hasTalentBloomTrialKey(owner) {
    return (owner.currencies.chaosKey || 0) >= 1 || (owner.currencies.coreKey || 0) >= 1;
  }
  var MapDiscovery = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    signatures(owner) {
      const cap = typeof this.deps.LAST_STORY_ZONE_ID === "number" ? this.deps.LAST_STORY_ZONE_ID : Math.max(0, Math.floor(owner.maxZoneId || 0));
      const bosses = this.deps.SEASON_BOSS_ZONES || [];
      const trials = this.deps.contentProgression.isUnlocked("battleTrials") ? this.deps.TRIAL_ZONES : [];
      const available = (trial) => trial.bloomTrial ? hasTalentBloomTrialKey(owner) : trial.reqZone !== -1 && owner.maxZoneId >= trial.reqZone || (owner.unlockedTrials || []).includes(trial.id);
      return {
        "map-explore-hunting": Math.min(Math.max(0, Math.floor(owner.maxZoneId || 0)), cap),
        "map-explore-root-boss": bosses.filter((zone) => (owner.season || 1) >= (zone.reqSeason || 2)).length,
        "map-explore-colony": (owner.season || 1) >= 15 ? 1 : 0,
        "map-explore-trials": trials.filter(available).length
      };
    }
    ensure(owner) {
      if (!owner.mapAlarmSeen || typeof owner.mapAlarmSeen !== "object") owner.mapAlarmSeen = {};
      if (!owner.mapAlarmMainSeen || typeof owner.mapAlarmMainSeen !== "object") owner.mapAlarmMainSeen = {};
    }
    detect(owner) {
      this.ensure(owner);
      const signatures = this.signatures(owner);
      for (const key of MAP_EXPLORE_ALARM_SUBTABS) {
        if (owner.mapAlarmSeen[key] === void 0) owner.mapAlarmSeen[key] = signatures[key];
        if (owner.mapAlarmMainSeen[key] === void 0) {
          owner.mapAlarmMainSeen[key] = signatures[key];
          continue;
        }
        if (signatures[key] > owner.mapAlarmMainSeen[key]) owner.noti.map = true;
      }
    }
    clear(owner, subtabId) {
      const key = subtabId === "map-explore-atlas" ? "map-explore-hunting" : subtabId;
      if (!MAP_EXPLORE_ALARM_SUBTABS.includes(key)) return;
      this.ensure(owner);
      owner.mapAlarmSeen[key] = this.signatures(owner)[key];
    }
    acknowledge(owner) {
      this.ensure(owner);
      const signatures = this.signatures(owner);
      for (const key of MAP_EXPLORE_ALARM_SUBTABS) owner.mapAlarmMainSeen[key] = signatures[key];
    }
    unseen(owner) {
      this.ensure(owner);
      const signatures = this.signatures(owner);
      return MAP_EXPLORE_ALARM_SUBTABS.filter((key) => owner.mapAlarmSeen[key] !== void 0 && signatures[key] > owner.mapAlarmSeen[key]);
    }
  };

  // modules/ui/map-tab-reveals.mjs
  var MapTabReveals = class {
    constructor(deps2) {
      this.deps = deps2;
      this.owner = null;
      this.season = null;
      this.loop = null;
      this.pending = /* @__PURE__ */ new Set();
      this.running = /* @__PURE__ */ new Map();
    }
    observe(owner) {
      if (this.owner === owner && this.season === owner.season && this.loop === owner.loopCount) return;
      this.reset();
      this.owner = owner;
      this.season = owner.season;
      this.loop = owner.loopCount;
    }
    add(owner, id) {
      this.observe(owner);
      this.pending.add(id);
    }
    start(owner, button, id) {
      this.observe(owner);
      if (!button || !this.pending.delete(id)) return;
      this.finish(button);
      const listener = (event) => {
        if (event.target === button) this.finish(button);
      };
      const timer = this.deps.setTimeout(() => this.finish(button), 1400);
      this.running.set(button, { listener, timer });
      button.classList.add("map-primary-tab-unlock-reveal");
      button.addEventListener("animationend", listener);
    }
    finish(button) {
      const binding = this.running.get(button);
      if (!binding) return;
      this.running.delete(button);
      this.deps.clearTimeout(binding.timer);
      button.removeEventListener("animationend", binding.listener);
      button.classList.remove("map-primary-tab-unlock-reveal");
    }
    reset() {
      for (const button of this.running.keys()) this.finish(button);
      this.pending.clear();
      this.owner = null;
    }
  };

  // modules/ui/map-discovery-view.mjs
  var MapDiscoveryView = class {
    constructor(deps2, discovery2, reveals2) {
      this.deps = deps2;
      this.discovery = discovery2;
      this.reveals = reveals2;
      this.active = true;
    }
    owner() {
      const owner = this.deps.game;
      this.reveals.observe(owner);
      return owner;
    }
    entryCondition(id, owner) {
      const condition = this.deps.getMapPrimaryContentEntryCondition(id, owner);
      if (id !== "map-tab-pvp") return condition;
      if (typeof this.deps.socialCloudReady !== "function" || !this.deps.socialCloudReady()) return "로그인 필요";
      if (typeof this.deps.getMyNickname === "function" && !this.deps.getMyNickname()) return "닉네임 설정 필요";
      return "";
    }
    syncMapPrimaryContentTabs() {
      if (!this.active) return;
      const owner = this.owner();
      let activeUnlocked = false;
      for (const def of this.deps.MAP_PRIMARY_CONTENTS) {
        const unlocked = this.deps.isMapPrimaryContentUnlocked(owner, def.id);
        if (def.id === owner.mapSubtab) activeUnlocked = unlocked;
        this.renderPrimaryTab(owner, def, unlocked);
      }
      if (!activeUnlocked && owner.mapSubtab !== "map-tab-zones") this.deps.switchMapSubtab("map-tab-zones");
    }
    renderPrimaryTab(owner, def, unlocked) {
      const button = this.deps.document.getElementById("btn-" + def.id);
      if (!button) return;
      button.style.display = unlocked ? "" : "none";
      const condition = unlocked ? this.entryCondition(def.id, owner) : "";
      button.classList.toggle("map-primary-tab--entry-locked", !!condition);
      button.dataset.entryCondition = condition;
      button.setAttribute("aria-label", condition ? `${def.label}, ${condition}` : def.label);
      button.dataset.tip = condition;
      if (unlocked) this.reveals.start(owner, button, def.id);
    }
    announceMapPrimaryContentUnlocks() {
      if (!this.active) return [];
      const owner = this.owner(), unlocked = this.deps.reconcileMapPrimaryContentUnlocks(owner);
      if (!unlocked.length) return unlocked;
      owner.noti.map = true;
      for (const id of unlocked) {
        this.reveals.add(owner, id);
        const content = this.deps.CONTENT_UNLOCK_CATALOG.find((row) => row.routes?.[0] === id);
        if (content) this.deps.contentUnlockUi.announceContent(content.id);
      }
      this.syncMapPrimaryContentTabs();
      return unlocked;
    }
    switchMapExploreSubtab(subtabId) {
      if (!this.active || !this.deps.contentProgression.canOpen(subtabId)) return;
      const owner = this.owner(), document2 = this.deps.document, fallback = "map-explore-atlas";
      const panel = document2.getElementById(subtabId) || document2.getElementById(fallback);
      const activeId = panel ? panel.id : fallback;
      if (activeId === owner.mapExploreSubtab && this.deps.isSelectedSubtab(activeId)) return;
      owner.mapExploreSubtab = activeId;
      document2.querySelectorAll("#map-tab-zones .vertical-tab-panel").forEach((el) => el.classList.remove("active"));
      document2.querySelectorAll("#map-tab-zones .vertical-tab-btn").forEach((el) => el.classList.remove("active"));
      if (panel) panel.classList.add("active");
      const button = document2.getElementById("btn-" + activeId);
      if (button) button.classList.add("active");
      this.discovery.clear(owner, activeId);
      this.renderMapExploreNotiDots();
      this.renderDestination(activeId);
      this.deps.renderMobileMapNavigation();
      this.deps.explorationAtlasUi.render();
    }
    renderDestination(id) {
      if (id === "map-explore-beehive") this.deps.renderLoop8BeehivePanel(true);
      if (id === "map-explore-colony") this.deps.renderLoop15ColonyPanel();
      if (id === "map-explore-beyond") this.deps.renderBeyondBoundaryPanel();
      if (id === "map-explore-worldtree") this.deps.atlasUi.render();
    }
    detectNewMapUnlockAlarms() {
      if (this.active) this.discovery.detect(this.owner());
    }
    acknowledgeMapMainAlarm() {
      if (this.active) this.discovery.acknowledge(this.owner());
    }
    renderMapExploreNotiDots() {
      if (!this.active) return;
      const owner = this.owner();
      if (!owner.mapAlarmSeen || typeof owner.mapAlarmSeen !== "object") return;
      const signatures = this.discovery.signatures(owner);
      for (const key of MAP_EXPLORE_ALARM_SUBTABS) {
        const dot = this.deps.document.getElementById("noti-" + key);
        if (!dot) continue;
        const seen = owner.mapAlarmSeen[key];
        dot.style.display = seen !== void 0 && signatures[key] > seen ? "block" : "none";
      }
    }
    isMapExploreSubtabOpenable(id) {
      const button = this.deps.document.getElementById("btn-" + id);
      return !!button && button.style.display !== "none";
    }
    alarmSource(owner) {
      if (this.deps.getAvailableActRewardZoneIds().length > 0) return "map-explore-atlas";
      const source = this.discovery.unseen(owner).find((id) => this.isMapExploreSubtabOpenable(id)) || null;
      return source === "map-explore-hunting" ? "map-explore-atlas" : source;
    }
    focusMapAlarmSourceSubtab() {
      if (!this.active) return;
      const owner = this.owner();
      if (!(owner.noti && owner.noti.map && this.deps.isNotiEnabled("map"))) return;
      const source = this.alarmSource(owner);
      if (!source) return;
      owner.mapSubtab = "map-tab-zones";
      owner.mapExploreSubtab = source;
      if (source === "map-explore-atlas") this.deps.worldMapUi.pickAct(this.deps.getAvailableActRewardZoneIds()[0] ?? Math.floor(Number(owner.maxZoneId) || 0));
    }
    setExploreSubtabAvailable(id, available) {
      if (!this.active) return;
      const button = this.deps.document.getElementById("btn-" + id);
      if (button) button.style.display = available ? "" : "none";
      if (!available && this.owner().mapExploreSubtab === id) this.switchMapExploreSubtab("map-explore-atlas");
    }
    dispose() {
      this.active = false;
      this.reveals.reset();
    }
  };

  // modules/map-discovery-ui-classic.mjs
  var deps = {
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get LAST_STORY_ZONE_ID() {
      return typeof LAST_STORY_ZONE_ID === "undefined" ? void 0 : LAST_STORY_ZONE_ID;
    },
    get MAP_PRIMARY_CONTENTS() {
      return MAP_PRIMARY_CONTENTS;
    },
    get SEASON_BOSS_ZONES() {
      return typeof SEASON_BOSS_ZONES === "undefined" ? void 0 : SEASON_BOSS_ZONES;
    },
    get TRIAL_ZONES() {
      return TRIAL_ZONES;
    },
    get atlasUi() {
      return atlasUi;
    },
    get clearTimeout() {
      return clearTimeout.bind(globalThis);
    },
    get contentProgression() {
      return contentProgression;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get document() {
      return document;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getAvailableActRewardZoneIds() {
      return getAvailableActRewardZoneIds;
    },
    get getMapPrimaryContentEntryCondition() {
      return getMapPrimaryContentEntryCondition;
    },
    get getMyNickname() {
      return typeof getMyNickname === "undefined" ? void 0 : getMyNickname;
    },
    get isMapPrimaryContentUnlocked() {
      return isMapPrimaryContentUnlocked;
    },
    get isNotiEnabled() {
      return isNotiEnabled;
    },
    get isSelectedSubtab() {
      return isSelectedSubtab;
    },
    get reconcileMapPrimaryContentUnlocks() {
      return reconcileMapPrimaryContentUnlocks;
    },
    get renderBeyondBoundaryPanel() {
      return renderBeyondBoundaryPanel;
    },
    get renderLoop15ColonyPanel() {
      return renderLoop15ColonyPanel;
    },
    get renderLoop8BeehivePanel() {
      return renderLoop8BeehivePanel;
    },
    get renderMobileMapNavigation() {
      return renderMobileMapNavigation;
    },
    get setTimeout() {
      return setTimeout.bind(globalThis);
    },
    get socialCloudReady() {
      return typeof socialCloudReady === "undefined" ? void 0 : socialCloudReady;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get worldMapUi() {
      return worldMapUi;
    }
  };
  var discovery = new MapDiscovery(deps);
  var reveals = new MapTabReveals(deps);
  var navigation = new MapDiscoveryView(deps, discovery, reveals);
  var mapNavigation = Object.freeze({
    syncMapPrimaryContentTabs: navigation.syncMapPrimaryContentTabs.bind(navigation),
    announceMapPrimaryContentUnlocks: navigation.announceMapPrimaryContentUnlocks.bind(navigation),
    switchMapExploreSubtab: navigation.switchMapExploreSubtab.bind(navigation),
    detectNewMapUnlockAlarms: navigation.detectNewMapUnlockAlarms.bind(navigation),
    acknowledgeMapMainAlarm: navigation.acknowledgeMapMainAlarm.bind(navigation),
    renderMapExploreNotiDots: navigation.renderMapExploreNotiDots.bind(navigation),
    isMapExploreSubtabOpenable: navigation.isMapExploreSubtabOpenable.bind(navigation),
    focusMapAlarmSourceSubtab: navigation.focusMapAlarmSourceSubtab.bind(navigation),
    setExploreSubtabAvailable: navigation.setExploreSubtabAvailable.bind(navigation),
    canSeeTalentBloomTrial: () => hasTalentBloomTrialKey(deps.game),
    dispose: navigation.dispose.bind(navigation)
  });
  window.GameModules.mapDiscoveryView = mapNavigation;
  safeExposeGlobals({
    syncMapPrimaryContentTabs: mapNavigation.syncMapPrimaryContentTabs,
    announceMapPrimaryContentUnlocks: mapNavigation.announceMapPrimaryContentUnlocks,
    switchMapExploreSubtab: mapNavigation.switchMapExploreSubtab,
    detectNewMapUnlockAlarms: mapNavigation.detectNewMapUnlockAlarms,
    acknowledgeMapMainAlarm: mapNavigation.acknowledgeMapMainAlarm,
    renderMapExploreNotiDots: mapNavigation.renderMapExploreNotiDots,
    isMapExploreSubtabOpenable: mapNavigation.isMapExploreSubtabOpenable,
    focusMapAlarmSourceSubtab: mapNavigation.focusMapAlarmSourceSubtab,
    setExploreSubtabAvailable: mapNavigation.setExploreSubtabAvailable,
    canSeeTalentBloomTrial: mapNavigation.canSeeTalentBloomTrial
  });
})();
