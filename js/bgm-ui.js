// GENERATED from modules/bgm-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/background-music.mjs
  var FADE_SEC = 1.4;
  var BOSS_HOLD_MS = 8e3;
  var CACHE_TRACKS = 2;
  var LEVEL = 0.45;
  var DUCK_LEVEL = 0.5;
  var DUCK_RELEASE_MS = 1500;
  function trackPosition(track, elapsed) {
    if (elapsed < track.loopEnd) return elapsed;
    return track.loopStart + (elapsed - track.loopStart) % (track.loopEnd - track.loopStart);
  }
  var BackgroundMusic = class {
    constructor(catalog, inputs, environment) {
      this.catalog = catalog;
      this.inputs = inputs;
      this.environment = environment;
      this.buffers = /* @__PURE__ */ new Map();
      this.positions = /* @__PURE__ */ new Map();
      this.warned = /* @__PURE__ */ new Set();
      this.output = null;
      this.current = null;
      this.loading = null;
      this.bossUntil = 0;
      this.bossTrack = "boss";
      this.duckUntil = 0;
      this.pendingTimers = /* @__PURE__ */ new Set();
      this.disposed = false;
    }
    failure(label, error) {
      if (this.warned.has(label)) return;
      this.warned.add(label);
      this.environment.warn(`[bgm] ${label}`, error);
    }
    standingBossTrack(bosses, type) {
      const own = bosses.map((enemy) => this.catalog.visual[enemy.monsterVisualId]).find(Boolean);
      return own || this.catalog.boss[type] || "boss";
    }
    zoneTrack(zone) {
      if (!zone) return "act";
      return this.catalog.visual[zone.atlasStages || zone.bossVisualId] || this.catalog.zone[zone.type] || "act";
    }
    wantedTrack(now) {
      if (this.inputs.startupOpen()) return "title";
      const zone = this.inputs.zone();
      const bosses = this.inputs.enemies().filter((enemy) => enemy.isBoss && enemy.hp > 0);
      if (bosses.length) {
        this.bossUntil = now + BOSS_HOLD_MS;
        this.bossTrack = this.standingBossTrack(bosses, zone?.type);
      }
      return now < this.bossUntil ? this.bossTrack : this.zoneTrack(zone);
    }
    async bufferFor(context, id) {
      if (this.buffers.has(id)) {
        const buffer2 = this.buffers.get(id);
        this.buffers.delete(id);
        this.buffers.set(id, buffer2);
        return buffer2;
      }
      const response = await this.environment.fetch("assets/audio/bgm/" + this.catalog.tracks[id].file + "?v=20261105-bgm3");
      if (!response.ok) throw Error(`BGM fetch failed: ${response.status} ${id}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (this.disposed) return buffer;
      this.buffers.set(id, buffer);
      for (const old of this.buffers.keys()) if (this.buffers.size > CACHE_TRACKS && old !== this.current?.id) this.buffers.delete(old);
      return buffer;
    }
    fadeOutTrack(context) {
      if (!this.current) return;
      const { id, node, gain, startedAt, offset } = this.current;
      this.positions.set(id, trackPosition(this.catalog.tracks[id], offset + context.currentTime - startedAt));
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_SEC);
      node.stop(context.currentTime + FADE_SEC + 0.05);
      node.onended = () => {
        node.disconnect();
        gain.disconnect();
      };
      this.current = null;
    }
    startTrack(context, id, buffer) {
      const track = this.catalog.tracks[id], node = context.createBufferSource(), gain = context.createGain();
      node.buffer = buffer;
      node.loop = true;
      node.loopStart = track.loopStart;
      node.loopEnd = Math.min(track.loopEnd, buffer.duration - 2 / buffer.sampleRate);
      const offset = Math.min(this.positions.get(id) || 0, node.loopEnd - 0.05);
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_SEC);
      node.connect(gain);
      gain.connect(this.output);
      node.start(context.currentTime, offset);
      this.current = { id, node, gain, startedAt: context.currentTime, offset };
    }
    async switchTrack(context, id) {
      this.loading = id;
      try {
        const buffer = await this.bufferFor(context, id);
        if (this.disposed || this.loading !== id) return;
        this.fadeOutTrack(context);
        this.startTrack(context, id, buffer);
      } catch (error) {
        if (!this.disposed) this.failure(id, error);
      } finally {
        if (this.loading === id) this.loading = null;
      }
    }
    ensureOutput(context) {
      if (this.output) return;
      this.output = context.createGain();
      this.output.gain.value = 0;
      this.output.connect(context.destination);
    }
    syncLevel(context) {
      const now = this.environment.now(), ducked = now < this.duckUntil;
      const settle = ducked ? 0.05 : now - this.duckUntil < DUCK_RELEASE_MS ? 0.4 : 0.08;
      const level = this.inputs.audible() ? LEVEL * this.inputs.volume() / 100 * (ducked ? DUCK_LEVEL : 1) : 0;
      this.output.gain.setTargetAtTime(level, context.currentTime, settle);
    }
    schedule(callback, ms) {
      const id = this.environment.schedule(() => {
        this.pendingTimers.delete(id);
        if (!this.disposed) callback();
      }, ms);
      this.pendingTimers.add(id);
    }
    duck(ms) {
      if (this.disposed) return;
      this.duckUntil = Math.max(this.duckUntil, this.environment.now() + ms);
      const relevel = () => {
        const context = this.inputs.context();
        if (context && this.output) this.syncLevel(context);
      };
      relevel();
      this.schedule(relevel, ms + 20);
    }
    tick() {
      if (this.disposed) return;
      const context = this.inputs.context();
      if (!context || context.state !== "running" || this.inputs.background()) return;
      this.ensureOutput(context);
      this.syncLevel(context);
      if (!this.inputs.enabled()) return void this.fadeOutTrack(context);
      const id = this.wantedTrack(this.environment.now());
      if (id !== this.current?.id && id !== this.loading && this.catalog.tracks[id]) void this.switchTrack(context, id);
    }
    leaveZone() {
      if (this.disposed) return;
      this.schedule(() => {
        this.bossUntil = 0;
        this.tick();
      }, 0);
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.loading = null;
      for (const id of this.pendingTimers) this.environment.cancel(id);
      this.pendingTimers.clear();
      if (this.current) {
        const { node, gain } = this.current;
        node.onended = null;
        node.stop();
        node.disconnect();
        gain.disconnect();
        this.current = null;
      }
      this.output?.disconnect();
      this.output = null;
      this.buffers.clear();
      this.positions.clear();
    }
  };
  function createBackgroundMusic(catalog, inputs, environment) {
    const music2 = new BackgroundMusic(catalog, inputs, environment);
    return Object.freeze({
      tick: () => music2.tick(),
      duck: (ms) => music2.duck(ms),
      leaveZone: () => music2.leaveZone(),
      dispose: () => music2.dispose()
    });
  }

  // modules/browser/background-music-controls.mjs
  function installBackgroundMusicControls(environment, music2, controls) {
    const { document: document2, window: window2 } = environment, listeners = [];
    const listen = (target, name, handler) => {
      target.addEventListener(name, handler);
      listeners.push(() => target.removeEventListener(name, handler));
    };
    listen(document2, "input", (event) => {
      if (!event.target.matches?.("[data-bgm-volume]")) return;
      controls.setVolume(event.target.valueAsNumber);
      controls.syncVolume();
      music2.tick();
    });
    listen(document2, "change", (event) => {
      if (event.target.matches?.("[data-bgm-volume]")) controls.saveVolume();
    });
    listen(document2, "visibilitychange", music2.tick);
    const live = (handler) => (event) => {
      if (!event.detail?.background) handler();
    };
    listen(window2, "project-idle:encounter-finished", live(() => music2.duck(2200)));
    listen(window2, "project-idle:player-defeated", live(() => music2.duck(2e3)));
    listen(window2, "project-idle:movement-started", live(music2.leaveZone));
    listen(window2, "project-idle:startup-visibility", controls.syncVolume);
    const interval = environment.repeat(music2.tick, 1e3);
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      environment.cancelRepeat(interval);
      listeners.splice(0).forEach((remove) => remove());
      music2.dispose();
    };
  }

  // modules/bgm-ui-classic.mjs
  var volume = () => game.settings.bgmVolume ?? 70;
  var music = createBackgroundMusic({ tracks: BGM_TRACKS, visual: BGM_BOSS_VISUAL_TRACKS, boss: BGM_BOSS_TRACKS, zone: BGM_ZONE_TRACKS }, {
    volume,
    audible: () => game.settings.bgm !== false && volume() > 0 && !document.hidden,
    enabled: () => game.settings.bgm !== false,
    startupOpen: () => isStartupOverlayOpen(),
    zone: () => getZone(game.currentZoneId),
    enemies: () => game.enemies || [],
    background: () => game.isBackgroundCalculation,
    context: () => playUiFeedbackSound.context()
  }, {
    now: () => performance.now(),
    warn: (label, error) => console.warn(label, error),
    fetch: function requestBackgroundMusicFile(url) {
      return fetch(url);
    },
    schedule: (callback, ms) => setTimeout(callback, ms),
    cancel: (id) => clearTimeout(id)
  });
  function syncVolumeControl() {
    document.querySelectorAll("[data-bgm-volume]").forEach((slider) => {
      slider.value = volume();
      slider.setAttribute("aria-valuetext", `${volume()}%`);
      const output = slider.parentElement.querySelector("output");
      if (output) output.value = `${volume()}%`;
    });
  }
  var dispose = installBackgroundMusicControls({
    document,
    window,
    repeat: (callback, ms) => setInterval(callback, ms),
    cancelRepeat: (id) => clearInterval(id)
  }, music, {
    setVolume: (value) => {
      game.settings.bgmVolume = value;
    },
    syncVolume: syncVolumeControl,
    saveVolume: () => {
      if (!startupOverlayActive) saveGame({ skipCloudSync: true });
    }
  });
  var gameBgm = Object.freeze({
    sync: () => {
      syncVolumeControl();
      playUiFeedbackSound.unlock();
      music.tick();
    },
    syncControls: syncVolumeControl,
    dispose
  });
  safeExposeGlobals({ gameBgm });
})();
