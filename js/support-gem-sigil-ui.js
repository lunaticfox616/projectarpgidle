// GENERATED from modules/support-gem-sigil-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/support-gem-sigil-markup.mjs
  function sigilPips(runtime, tier) {
    const count = Math.max(0, Math.min(3, Math.floor(Number(tier) || 0)));
    return count ? `<em>${"◆".repeat(count)}</em>` : "";
  }
  function sigilHtml(runtime, name, className, tier) {
    const cell = (0, runtime.deps.getSupportRuneArtCell)(name);
    const art = cell ? `<span class="support-rune-art" style="--col:${cell.col};--row:${cell.row}"></span>` : (0, runtime.deps.renderPixelIcon)("star", "support-sigil-icon");
    return `<span class="support-sigil${cell ? " is-art" : ""} is-tone-${(0, runtime.deps.getSupportRuneTone)(name)} ${className || ""}" aria-hidden="true">${art}${sigilPips(runtime, tier)}</span>`;
  }
  function summonHtml(runtime, name, className) {
    const look = runtime.state.SUMMON_LOOKS[name];
    return look ? `<span class="support-sigil is-tone-${look[1]} ${className}" aria-label="${(0, runtime.deps.escapeHTML)(name)}">${(0, runtime.deps.renderPixelIcon)(look[0], "support-sigil-icon")}</span>` : "";
  }

  // modules/ui/support-gem-sigil-view.mjs
  function createSupportGemSigilView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { sigilHtml, summonHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ html: runtime.handlers.sigilHtml, tone: runtime.deps.getSupportRuneTone, summonHtml: runtime.handlers.summonHtml });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.SUMMON_LOOKS = Object.freeze({
      "수액 골렘 소환": ["shield", "summon"]
    });
  }

  // modules/support-gem-sigil-ui-classic.mjs
  var supportGemSigil = createSupportGemSigilView({
    get getSupportRuneArtCell() {
      return getSupportRuneArtCell;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get getSupportRuneTone() {
      return getSupportRuneTone;
    },
    get escapeHTML() {
      return escapeHTML;
    }
  });
  safeExposeGlobals({ supportGemSigil });
})();
