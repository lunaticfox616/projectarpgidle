// GENERATED from modules/ui-audio*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/feedback-audio.mjs
  var FeedbackAudio = class {
    constructor(environment, inputs) {
      this.environment = environment;
      this.inputs = inputs;
      this.root = "assets/audio/game-sfx-v2/";
      this.uiKinds = { open: "uiSelect", confirm: "uiConfirm", cancel: "uiCancel", danger: "uiDanger", success: "uiSuccess" };
      this.context = null;
      this.master = null;
      this.muffle = null;
      this.compressor = null;
      this.disposed = false;
      this.bank = null;
      this.loading = false;
      this.buffers = /* @__PURE__ */ new Map();
      this.active = /* @__PURE__ */ new Set();
      this.lastPlayed = /* @__PURE__ */ new Map();
      this.warnings = /* @__PURE__ */ new Set();
      this.variations = /* @__PURE__ */ new Map();
      this.variationSeed = 1831565813;
    }
    updateMasterGain() {
      if (!this.master) return;
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.inputs.permitted() ? this.inputs.masterLevel() : 0, this.context.currentTime, 0.015);
    }
    failure(label, error) {
      if (this.warnings.has(label)) return;
      this.warnings.add(label);
      this.environment.console.warn(`[ui-audio] ${label}`, error);
    }
    async fetchFile(path) {
      const response = await this.environment.fetch(path + "?v=20261110-bell-wave");
      if (!response.ok) throw Error(`Audio fetch failed: ${response.status} ${path}`);
      return response;
    }
    async loadBank() {
      if (this.loading) return;
      this.loading = true;
      try {
        const bank = await (await this.fetchFile(this.root + "bank.json")).json();
        if (this.disposed) return;
        this.bank = bank;
        const files = [...new Set(Object.values(this.bank).flatMap((row) => row.files))];
        await Promise.all(files.map(async (file) => {
          try {
            const bytes = await (await this.fetchFile(this.root + file)).arrayBuffer();
            if (this.disposed) return;
            const buffer = await this.context.decodeAudioData(bytes);
            if (!this.disposed) this.buffers.set(file, buffer);
          } catch (error) {
            this.failure(file, error);
          }
        }));
      } catch (error) {
        this.failure("sample bank unavailable", error);
      }
    }
    unlock() {
      if (this.disposed) return;
      if (!this.inputs.permitted() && !this.inputs.bgmWanted()) return;
      const AudioCtx = this.environment.audioConstructor();
      if (!AudioCtx || !this.inputs.gestureSeen()) return;
      try {
        if (!this.context) {
          this.context = new AudioCtx();
          this.master = this.context.createGain();
          this.master.gain.value = this.inputs.masterLevel();
          const compressor = this.compressor = this.context.createDynamicsCompressor();
          compressor.threshold.value = -16;
          compressor.knee.value = 12;
          compressor.ratio.value = 4;
          compressor.attack.value = 3e-3;
          compressor.release.value = 0.12;
          this.muffle = this.context.createBiquadFilter();
          this.muffle.type = "lowpass";
          this.muffle.frequency.value = 2e4;
          this.master.connect(this.muffle);
          this.muffle.connect(compressor);
          compressor.connect(this.context.destination);
          void this.loadBank();
        }
        this.updateMasterGain();
        if (this.context.state === "suspended") this.context.resume().catch((error) => this.failure("resume failed", error));
      } catch (error) {
        this.failure("audio unavailable", error);
      }
    }
    release(voice) {
      if (!this.active.delete(voice)) return;
      voice.node.disconnect();
      voice.gain.disconnect();
    }
    stop(voice) {
      voice.node.stop();
      this.release(voice);
    }
    silence() {
      [...this.active].forEach((voice) => this.stop(voice));
    }
    makeRoom(priority) {
      if (priority === 0 && [...this.active].filter((voice) => voice.priority === 0).length >= 4) return false;
      if (this.active.size < 8) return true;
      const victim = [...this.active].find((voice) => voice.priority < priority);
      if (!victim) return false;
      this.stop(victim);
      return true;
    }
    throttled(spec) {
      const now = this.environment.performance.now(), previous = this.lastPlayed.get(spec.group) ?? -Infinity;
      if (now - previous < spec.cooldown) return true;
      return false;
    }
    updateMuffle() {
      if (!this.muffle) return;
      const cutoff = this.inputs.muffleCutoff();
      if (Math.abs(this.muffle.frequency.value - cutoff) > 1) this.muffle.frequency.setTargetAtTime(cutoff, this.context.currentTime, 0.08);
    }
    attach(node, gain, priority) {
      this.updateMuffle();
      const voice = { node, gain, priority };
      node.connect(gain);
      gain.connect(this.master);
      node.onended = () => this.release(voice);
      this.active.add(voice);
      return voice;
    }
    shuffled(files, previous) {
      const remaining = files.slice();
      for (let i = remaining.length - 1; i > 0; i--) {
        this.variationSeed ^= this.variationSeed << 13;
        this.variationSeed ^= this.variationSeed >>> 17;
        this.variationSeed ^= this.variationSeed << 5;
        const j = (this.variationSeed >>> 0) % (i + 1);
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      if (remaining.length > 1 && remaining[0] === previous) {
        [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
      }
      return remaining;
    }
    sampleChoice(spec) {
      const files = spec.files.filter((file) => this.buffers.has(file));
      if (!files.length) return null;
      const key = spec.files.join("|");
      let deck = this.variations.get(key);
      if (!deck?.remaining.length) {
        deck = { remaining: this.shuffled(files, deck?.last), last: deck?.last };
        this.variations.set(key, deck);
      }
      return { file: deck.remaining[0], deck };
    }
    playSample(spec) {
      if (this.throttled(spec)) return;
      const choice = this.sampleChoice(spec);
      if (!choice || !this.makeRoom(spec.priority)) return;
      const node = this.context.createBufferSource(), gain = this.context.createGain();
      node.buffer = this.buffers.get(choice.file);
      node.playbackRate.value = spec.rate * (spec.sampleRates?.[choice.file] ?? 1);
      gain.gain.value = spec.gain * (spec.sampleGains?.[choice.file] ?? 1);
      const voice = this.attach(node, gain, spec.priority);
      try {
        node.start();
        this.lastPlayed.set(spec.group, this.environment.performance.now());
        choice.deck.last = choice.deck.remaining.shift();
      } catch (error) {
        this.release(voice);
        throw error;
      }
    }
    readyToPlay() {
      return !this.disposed && this.inputs.permitted() && this.context?.state === "running";
    }
    playUiFeedbackSound(kind) {
      if (!this.readyToPlay()) return;
      try {
        const spec = this.bank?.[this.uiKinds[kind] || kind];
        if (!spec || spec.enabled === false) return;
        this.playSample(spec);
      } catch (error) {
        this.failure(`play ${kind}`, error);
      }
    }
    async dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.silence();
      this.master?.disconnect();
      this.muffle?.disconnect();
      this.compressor?.disconnect();
      this.master = null;
      this.muffle = null;
      this.compressor = null;
      this.buffers.clear();
      this.variations.clear();
      this.lastPlayed.clear();
      this.bank = null;
      const context = this.context;
      this.context = null;
      try {
        if (context && context.state !== "closed") await context.close();
      } catch (error) {
        this.failure("close failed", error);
      }
    }
  };
  function createFeedbackAudio(environment, inputs) {
    const core = new FeedbackAudio(environment, inputs);
    return Object.freeze({
      play: core.playUiFeedbackSound.bind(core),
      ready: core.readyToPlay.bind(core),
      context: () => core.context,
      unlock: core.unlock.bind(core),
      dispose: core.dispose.bind(core),
      syncSettings() {
        if (!inputs.permitted()) {
          core.updateMasterGain();
          core.silence();
        } else if (core.context) core.unlock();
      },
      visibilityChanged() {
        core.updateMasterGain();
        if (inputs.hidden()) core.silence();
      },
      playInventory(kind, phase) {
        const spec = core.bank?.[kind];
        if (!spec || spec.enabled === false) return;
        try {
          core.playSample({ ...spec, group: "inventory:" + phase });
        } catch (error) {
          core.failure("inventory " + kind, error);
        }
      }
    });
  }

  // modules/browser/feedback-audio-controls.mjs
  function installFeedbackAudioControls({ document: document2, window: window2 }, audio2, controls) {
    const listeners = [];
    const listen = (target, name, handler, options) => {
      target.addEventListener(name, handler, options);
      listeners.push(() => target.removeEventListener(name, handler, options));
    };
    listen(document2, "input", (event) => {
      if (!event.target.matches?.("[data-sound-volume]")) return;
      controls.setVolume(event.target.valueAsNumber);
      audio2.syncSettings();
      controls.syncVolumeControl();
    });
    listen(document2, "change", (event) => {
      if (event.target.matches?.("[data-sound-volume]")) controls.saveVolume();
    });
    listen(document2, "click", (event) => {
      if (event.target.id === "btn-sound-preview") audio2.play("uiSelect");
      const tab = event.target.closest?.('.tab-btn,.sub-tab-btn,[role="tab"]');
      if (tab && !tab.disabled && tab.getAttribute("aria-disabled") !== "true") audio2.play("uiSelect");
    });
    listen(window2, "project-idle:startup-visibility", controls.syncVolumeControl);
    for (const name of ["pointerdown", "pointerup", "touchend"]) listen(document2, name, audio2.unlock, { passive: true });
    listen(document2, "keydown", audio2.unlock);
    listen(window2, "project-idle:encounter-finished", (event) => {
      if (!event.detail?.background) audio2.play("stageClear");
    });
    listen(window2, "project-idle:player-defeated", (event) => {
      if (!event.detail?.background) audio2.play("playerDeath");
    });
    listen(window2, "project-idle:items-salvaged", () => audio2.play("itemDismantle"));
    listen(document2, "visibilitychange", audio2.visibilityChanged);
    return () => {
      listeners.splice(0).forEach((remove) => remove());
    };
  }

  // modules/ui-audio-classic.mjs
  var permitted = () => typeof game !== "undefined" && game.settings?.uiSounds !== false && game.settings?.soundVolume !== 0 && !document.hidden && !game.isBackgroundCalculation;
  var audio = createFeedbackAudio({
    audioConstructor: () => window.AudioContext || window.webkitAudioContext,
    fetch: function requestFeedbackAudioFile(url) {
      return fetch(url);
    },
    performance: { now: () => performance.now() },
    console
  }, {
    permitted,
    hidden: () => document.hidden,
    masterLevel: () => 0.55 * (game.settings.soundVolume ?? 100) / 100,
    bgmWanted: () => typeof game !== "undefined" && game.settings?.bgm !== false && game.settings?.bgmVolume !== 0 && !document.hidden,
    gestureSeen: () => !navigator.userActivation || navigator.userActivation.hasBeenActive,
    muffleCutoff: () => typeof OCEAN_ZONE_ID !== "undefined" && game.currentZoneId === OCEAN_ZONE_ID ? Math.max(650, 1700 - Math.max(0, Number(game.ocean && game.ocean.depthM) || 0) * 1.1) : 2e4
  });
  function syncVolumeControl() {
    const volume = game.settings.soundVolume ?? 100;
    document.querySelectorAll("[data-sound-volume]").forEach((slider) => {
      slider.value = volume;
      slider.setAttribute("aria-valuetext", `${volume}%`);
      const output = slider.parentElement.querySelector("output");
      if (output) output.value = `${volume}%`;
    });
    const preview = document.getElementById("btn-sound-preview");
    if (preview) preview.disabled = !permitted();
  }
  function itemSoundKind(item) {
    if (["반지", "목걸이", "주얼", "코어"].includes(item.slot)) return "inventoryGem";
    if (item.slot === "액막이") return "inventoryWood";
    if (item.slot === "허리띠") return "inventoryLeather";
    if (item.slot === "무기") {
      const category = getWeaponCategoryId(item);
      if (category === "shortbow") return "inventoryWood";
      if (category === "orb" || category === "flask") return "inventoryGem";
      return "inventoryMetal";
    }
    const types = getItemBaseDefenseTypes(item);
    if (types.has("armor")) return "inventoryMetal";
    if (types.has("evasion")) return "inventoryLeather";
    return "inventoryCloth";
  }
  var playUiFeedbackSound = (kind) => audio.play(kind);
  playUiFeedbackSound.inventory = (item, phase) => {
    if (!item || !audio.ready()) return;
    if (phase === "equip" && bagItems.isJewel(item)) return;
    audio.playInventory(itemSoundKind(item), phase);
  };
  playUiFeedbackSound.syncSettings = () => {
    audio.syncSettings();
    syncVolumeControl();
  };
  playUiFeedbackSound.context = audio.context;
  playUiFeedbackSound.unlock = audio.unlock;
  playUiFeedbackSound.disposeControls = installFeedbackAudioControls({ document, window }, audio, {
    syncVolumeControl,
    setVolume: (value) => {
      game.settings.soundVolume = value;
    },
    saveVolume: () => {
      if (!startupOverlayActive) saveGame({ skipCloudSync: true });
    }
  });
  playUiFeedbackSound.dispose = () => {
    playUiFeedbackSound.disposeControls();
    return audio.dispose();
  };
  var playLootDropSound = (major) => {
    if (major) playUiFeedbackSound("lootMajor");
  };
  safeExposeGlobals({ playUiFeedbackSound, playLootDropSound });
})();
