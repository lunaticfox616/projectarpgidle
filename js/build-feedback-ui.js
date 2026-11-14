// GENERATED from modules/build-feedback-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/build-feedback-view.mjs
  var BuildFeedbackView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.previousGame = null;
      this.previousSignature = "";
      this.previousStats = null;
      this.chipTimer = null;
      this.chip = null;
      this.heldDelta = null;
    }
    visibleRect(selector) {
      const node = this.deps.document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (0, this.deps.getComputedStyle)(node).visibility !== "hidden" ? rect : null;
    }
    floorTop(orb) {
      const log = this.visibleRect(".combat-feed"), bar = this.visibleRect("#tab-header-bottom"), notice = this.visibleRect("#mobile-toast-root");
      if (!orb) return bar ? bar.top : this.deps.window.innerHeight - 96;
      const stacked = log && log.bottom <= orb.top + 12 && log.bottom > orb.top - 60 && log.left < orb.right;
      return Math.min(stacked ? log.top : orb.top, notice ? notice.top : Infinity);
    }
    chipAnchor(width) {
      const factor = this.deps.uiDisplay.factor || 1, orb = this.visibleRect("#ui-hp-bar"), card = this.visibleRect("#tutorial-overlay.active .tutorial-card");
      const floor = this.floorTop(orb), left = orb ? orb.left : null;
      const underCard = card && card.top < floor && (left === null || card.left < left + width && card.right > left);
      return { top: ((underCard ? card.top : floor) - 8) / factor, left: left === null ? null : left / factor };
    }
    showDpsDelta(before, after) {
      const delta = (after || 0) - (before || 0);
      if (Math.abs(delta) < 1) return;
      const change = `${delta > 0 ? "▲" : "▼"} ${this.deps.COMPARE_STAT_META.dps.format(Math.abs(delta))}`;
      this.releaseChip();
      const chip = this.deps.document.createElement("div"), value = this.deps.document.createElement("span");
      this.chip = chip;
      chip.className = `build-dps-chip ${delta > 0 ? "is-up" : "is-down"}`;
      chip.setAttribute("role", "status");
      value.className = "build-dps-chip-value";
      value.textContent = change;
      chip.append(value, this.deps.document.createTextNode(" DPS"));
      this.deps.document.body.appendChild(chip);
      const anchor = this.chipAnchor(chip.getBoundingClientRect().width);
      chip.classList.toggle("is-centered", anchor.left === null);
      chip.style.top = `${anchor.top}px`;
      if (anchor.left !== null) chip.style.left = `${anchor.left}px`;
      this.chipTimer = (0, this.deps.setTimeout)(() => {
        if (this.syncOwner() && this.chip === chip) this.releaseChip();
      }, 3200);
    }
    reportDpsChange(before, after) {
      if (!(0, this.deps.isMobilePrimaryNavigationEnabled)() || this.visibleRect("#ui-hp-bar")) return this.showDpsDelta(before, after);
      this.heldDelta = { before: this.heldDelta ? this.heldDelta.before : before, after };
    }
    showHeldDelta() {
      if (!this.heldDelta || !this.visibleRect("#ui-hp-bar")) return;
      const held = this.heldDelta;
      this.heldDelta = null;
      this.showDpsDelta(held.before, held.after);
    }
    /** stats is the current displayed combat estimate, not another domain calculation. */
    updateBuildFeedback(stats) {
      if (!this.syncOwner()) return;
      const game = this.deps.game;
      if (game.isBackgroundCalculation || stats.__uiFallbackStats) return;
      const signature = JSON.stringify([game.equipment, game.activeSkill, game.mobilitySkill, game.equippedSupports, game.equippedSummonSkills, game.summonSkillCounts]);
      if (this.previousStats && this.previousSignature !== signature) this.reportDpsChange(this.previousStats.dps, stats.dps);
      this.showHeldDelta();
      this.previousSignature = signature;
      this.previousStats = { dps: stats.dps };
    }
    syncOwner() {
      if (!this.active) return false;
      if (this.previousGame !== this.deps.game) {
        this.previousGame = this.deps.game;
        this.previousSignature = "";
        this.previousStats = null;
        this.heldDelta = null;
        this.releaseChip();
      }
      return true;
    }
    releaseChip() {
      if (this.chipTimer !== null) (0, this.deps.clearTimeout)(this.chipTimer);
      this.chipTimer = null;
      if (this.chip) this.chip.remove();
      this.chip = null;
    }
    dispose() {
      if (!this.active) return;
      this.active = false;
      this.releaseChip();
      this.heldDelta = null;
      this.previousStats = null;
      this.previousGame = null;
    }
  };

  // modules/build-feedback-ui-classic.mjs
  var buildFeedbackView = new BuildFeedbackView({
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get window() {
      return window;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get COMPARE_STAT_META() {
      return COMPARE_STAT_META;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get isMobilePrimaryNavigationEnabled() {
      return isMobilePrimaryNavigationEnabled;
    }
  });
  window.GameModules.buildFeedbackView = buildFeedbackView;
  safeExposeGlobals({ updateBuildFeedback: buildFeedbackView.updateBuildFeedback.bind(buildFeedbackView) });
})();
