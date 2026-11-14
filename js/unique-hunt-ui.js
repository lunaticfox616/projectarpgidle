// GENERATED from modules/unique-hunt-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/unique-hunt-view.mjs
  var UniqueHuntView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      for (const name of ["describeUniqueHuntSource", "getUniqueHuntSource", "renderUniqueHuntTargetCard", "renderUniqueHuntPanel", "toggleUniqueHuntFromUi", "navigateToUniqueHuntSource"]) this[name] = this[name].bind(this);
      this.UNIQUE_HUNT_SOURCE_TYPES = Object.freeze({
        act: { label: "액트 사냥터", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-hunting" },
        abyss: { label: "혼돈", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-chaos" },
        chaosRealm: { label: "혼돈계", mapSubtab: "map-tab-chaos-realm" },
        underworld: { label: "지하계", mapSubtab: "map-tab-underworld" },
        cosmos: { label: "우주계", mapSubtab: "map-tab-cosmos" },
        beehive: { label: "벌집 원정", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-beehive" },
        trial: { label: "전직 시련", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-trials" },
        labyrinth: { label: "고대 미궁", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-labyrinth" },
        meteor: { label: "운석 낙하 지점", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-meteor" },
        seasonBoss: { label: "강대한 적", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-root-boss" },
        skyTower: { label: "창공의 탑 보스", mapSubtab: "map-tab-sky" },
        colony: { label: "군락지 지배체", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-colony" },
        // 깨어난 아틀라스의 최종 보스와 리그 우두머리만 주는 고유(data/atlas-endgame.js, 아틀라스의 최종 보기).
        atlasLate: { label: "깨어난 아틀라스 보스", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-worldtree", atlasView: "late" }
      });
      this.UNIQUE_HUNT_SOURCE_IDS = Object.freeze({
        grand_breach_run: { label: "대균열", mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-voidrift" },
        cosmos_astra: { label: "잔향체 아스트라", mapSubtab: "map-tab-cosmos" }
      });
      this.UNIQUE_HUNT_COSMOS_BOSSES = Object.freeze({
        "planet-45": "에니프론",
        "planet-46": "하말리스",
        "planet-47": "디프다르",
        "planet-48": "주베누비아",
        "planet-49": "주벤샤말"
      });
      this.host = null;
      this.owner = null;
      listenView(this, this.deps.window, "project-idle:unique-hunt-changed", this.renderUniqueHuntPanel);
    }
    describeUniqueHuntSource(entry) {
      let source = this.getUniqueHuntSource(entry);
      let league = this.deps.ATLAS_ENDGAME.leagues.find((row) => [].concat(row.unique || []).includes(entry && entry.name));
      if (league && source.exploreSubtab !== "map-explore-worldtree") source.label += this.deps._t(", 아틀라스 {boss}", { boss: league.boss });
      let boss = this.deps.SEASON_BOSS_ZONES.find((row) => row.signatureUnique === (entry && entry.name));
      if (boss) source.label += `, ${this.deps._t(boss.name)}`;
      return source;
    }
    getUniqueHuntSource(entry) {
      const drop = entry?.dropOnly;
      if (!drop || typeof drop !== "object") return this.tierSource(entry);
      const source = this.sourceForDrop(drop, entry);
      if (drop.type === "labyrinth" && Number(drop.minFloor) > 0) source.label += this.deps._t(" {floor}층+", { floor: Math.floor(drop.minFloor) });
      return source;
    }
    sourceForDrop(drop, entry) {
      if (drop.type === "cosmosBoss" && !this.UNIQUE_HUNT_SOURCE_IDS[drop.id]) {
        const boss = this.deps._t(this.UNIQUE_HUNT_COSMOS_BOSSES[drop.bossId] || "은하 보스");
        return { label: this.deps._t("우주계, {boss}", { boss }), mapSubtab: "map-tab-cosmos" };
      }
      const source = this.UNIQUE_HUNT_SOURCE_IDS[drop.id] || this.UNIQUE_HUNT_SOURCE_TYPES[drop.type];
      return source ? { ...source, label: this.deps._t(source.label) } : this.tierSource(entry);
    }
    tierSource(entry) {
      const max = Math.max(1, Math.floor(Number(entry?.reqTier) || 1));
      return { label: this.deps._t("T{max}+ 사냥터", { max }), mapSubtab: "map-tab-zones", exploreSubtab: "map-explore-hunting" };
    }
    renderUniqueHuntTargetCard(entry) {
      let key = this.deps.uniqueHuntRuntime.getKey(entry);
      let encoded = encodeURIComponent(key).replace(/'/g, "%27");
      let registered = !!(this.deps.game.uniqueCodex && this.deps.game.uniqueCodex[key]);
      let chase = entry.ultraRare || entry.cosmosChase;
      return `<article class="codex-hunt-target${chase ? " is-chase" : ""}"><span class="codex-art"><img src="${this.deps.getUniqueEntryVisualAsset(entry)}" alt=""></span>
        <div><strong>${this.deps.escapeHTML(this.deps._t(entry.name))}</strong><small>${this.deps.escapeHTML(this.describeUniqueHuntSource(entry).label)}${registered ? this.deps._t(", 등록됨") : ""}${chase ? this.deps._t(", 극희귀") : ""}</small></div>
        <div class="codex-hunt-actions"><button type="button" data-hunt-go="${encoded}">${this.deps._t("드랍처")}</button><button type="button" data-hunt-stop="${encoded}">${this.deps._t("해제")}</button></div>
    </article>`;
    }
    renderUniqueHuntPanel() {
      if (!this.active) return;
      let root = this.deps.document.getElementById("ui-unique-hunt-tracker");
      if (!root) return;
      if (root !== this.host) {
        releaseViewTarget(this, this.host);
        this.host = root;
        listenView(this, root, "click", (event) => this.onClick(event));
      }
      this.owner = this.deps.game;
      root.hidden = ["realm", "leaves"].includes(this.owner.codexSubtab);
      if (root.hidden) return;
      let targets = this.deps.uniqueHuntRuntime.getTargets(this.owner);
      let cells = targets.map(this.renderUniqueHuntTargetCard);
      while (cells.length < this.deps.uniqueHuntRuntime.limit) cells.push(`<div class="codex-hunt-empty"><span class="px-center">${cells.length ? this.deps._t("빈 칸") : this.deps._t("고유를 눌러 추적")}</span></div>`);
      this.deps.writeHtmlIfChanged(root, `<section class="codex-hunt"><header><strong>${this.deps._t("파밍 추적")}</strong><em>${this.deps._t("자동해체 보호")}</em><b>${targets.length}/${this.deps.uniqueHuntRuntime.limit}</b></header>
        <div class="codex-hunt-row">${cells.join("")}</div></section>`);
    }
    toggleUniqueHuntFromUi(encodedKey) {
      if (!this.active) return false;
      const owner = this.deps.game;
      let result = this.deps.uniqueHuntRuntime.toggle(decodeURIComponent(encodedKey), owner);
      if (!result.ok) {
        if (typeof this.deps.showGameToast === "function") this.deps.showGameToast(result.reason, { tone: "warning" });
        return false;
      }
      if (typeof this.deps.queueImportantSave === "function") this.deps.queueImportantSave(200);
      if (typeof this.deps.showGameToast === "function") {
        this.deps.showGameToast(this.deps._t(result.tracked ? "{name} 파밍 추적 시작" : "{name} 파밍 추적 해제", { name: this.deps._t(result.entry.name) }), { tone: result.tracked ? "success" : "info" });
      }
      this.deps.updateStaticUI();
      return true;
    }
    navigateToUniqueHuntSource(encodedKey) {
      let entry = this.deps.uniqueHuntRuntime.getEntry(decodeURIComponent(encodedKey));
      if (!entry) return false;
      let source = this.describeUniqueHuntSource(entry);
      let tabButton = this.deps.document.getElementById(`btn-${source.mapSubtab}`);
      if (!tabButton || tabButton.style.display === "none") {
        if (typeof this.deps.showGameToast === "function") this.deps.showGameToast(this.deps._t("{label} 콘텐츠가 아직 해금되지 않았습니다.", { label: source.label }), { tone: "warning" });
        return false;
      }
      this.deps.switchTab("tab-map");
      this.deps.switchMapSubtab(source.mapSubtab);
      if (source.exploreSubtab) {
        let exploreButton = this.deps.document.getElementById(`btn-${source.exploreSubtab}`);
        if (exploreButton && exploreButton.style.display !== "none") this.deps.switchMapExploreSubtab(source.exploreSubtab);
      }
      if (source.atlasView) this.deps.atlasUi.setView(source.atlasView);
      return true;
    }
    onClick(event) {
      if (this.owner !== this.deps.game) {
        this.renderUniqueHuntPanel();
        return;
      }
      const button = event.target.closest("[data-hunt-go], [data-hunt-stop]");
      if (!button || !this.host.contains(button)) return;
      if (button.hasAttribute("data-hunt-go")) this.navigateToUniqueHuntSource(button.dataset.huntGo);
      else this.toggleUniqueHuntFromUi(button.dataset.huntStop);
    }
    api() {
      return Object.freeze({
        renderPanel: this.renderUniqueHuntPanel,
        getSource: this.describeUniqueHuntSource,
        toggle: this.toggleUniqueHuntFromUi,
        navigate: this.navigateToUniqueHuntSource
      });
    }
    dispose() {
      releaseViewEvents(this);
      this.host = null;
      this.owner = null;
    }
  };
  function createUniqueHuntView(deps) {
    const view = new UniqueHuntView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/unique-hunt-ui-classic.mjs
  var uniqueHuntUi = createUniqueHuntView({
    get ATLAS_ENDGAME() {
      return ATLAS_ENDGAME;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get _t() {
      return _t;
    },
    get atlasUi() {
      return atlasUi;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getUniqueEntryVisualAsset() {
      return getUniqueEntryVisualAsset;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get showGameToast() {
      return showGameToast;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchTab() {
      return switchTab;
    },
    get uniqueHuntRuntime() {
      return uniqueHuntRuntime;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get window() {
      return window;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    }
  });
  safeExposeGlobals({ uniqueHuntUi });
})();
