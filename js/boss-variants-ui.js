// GENERATED from modules/boss-variants-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/boss-variants-view.mjs
  var BossVariantsView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.esc = (value) => this.deps.escapeHTML(String(value));
      for (const name of ["announce", "recordHtml"]) this[name] = this[name].bind(this);
      listenView(this, this.deps.window, "project-idle:boss-variant", (event) => this.announce(event.detail || {}));
    }
    announce(detail) {
      if (detail.kind === "spawn") {
        const how = detail.recalled ? "기억 속에서 변이체가 다시 불려 나왔습니다" : "변이체가 나타났습니다";
        this.deps.addLog(`🧬 ${how}: ${this.esc(this.deps._t(detail.name))}`, "loot-unique", { toast: true });
        return;
      }
      const gift = detail.first ? ` 처음 잡은 변이: ${detail.gift.map(([key, amount]) => `${this.deps._t(this.deps.ORB_DB[key].name)} ${amount}`).join(", ")}.` : "";
      const memory = detail.memory ? this.deps._t(" {boss}의 기억 {tier}단계를 얻었습니다.", { boss: this.esc(this.deps.atlas.node(detail.memory.node).boss), tier: detail.memory.tier }) : "";
      this.deps.addLog(this.deps._t("🧬 변이체 처치: {name}. 전리품이 늘었습니다.{gift}{memory}", { name: this.esc(this.deps._t(detail.name)), gift, memory }), "loot-unique", { toast: !!(detail.first || detail.memory) });
    }
    recordHtml() {
      if (!this.active) return "";
      const rows = this.deps.bossVariants.records(this.deps.game);
      if (!this.deps.bossVariants.open(this.deps.game) && !rows.some((row) => row.kills > 0)) return "";
      const chips = rows.map((row) => `<span class="${row.kills ? "is-on" : ""}" style="--tint:${row.kind.outline}"><i></i>${this.esc(this.deps._t(row.kind.name))} ${row.kills}</span>`).join("");
      return `<section class="atlas-late-group boss-variant-records"><h3>${this.deps._t("변이체 기록")}</h3><p class="atlas-muted">${this.deps._t("보스 변이체 해금 뒤에 보스가 드물게 변이체로 나옵니다.\n            처음 잡은 변이마다 황금률, 아틀라스의 보스였다면 그 보스의 기억 {memoryTier}단계.", { memoryTier: this.deps.BOSS_VARIANTS.reward.memoryTier })}</p><div class="atlas-late-blight">${chips}</div></section>`;
    }
    api() {
      return Object.freeze({ recordHtml: this.recordHtml });
    }
    dispose() {
      releaseViewEvents(this);
    }
  };
  function createBossVariantsView(deps) {
    const view = new BossVariantsView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/boss-variants-ui-classic.mjs
  var bossVariantsUi = createBossVariantsView({
    get BOSS_VARIANTS() {
      return BOSS_VARIANTS;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get atlas() {
      return atlas;
    },
    get bossVariants() {
      return bossVariants;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ bossVariantsUi });
})();
