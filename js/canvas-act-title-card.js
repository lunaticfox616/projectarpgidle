// GENERATED from modules/canvas-act-title-card*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/story-presentation-values.mjs
  var FADE_IN_MS = 500;
  var FADE_OUT_MS = 800;
  var LIVE_MS = 400;
  var LINE = Object.freeze({ baseMs: 1800, perCharMs: 65, maxMs: 6500, staleMs: 15e3, watchMs: 200, introDelayMs: 3200, halfAt: 0.55, maxRows: 3, bubbleChars: 19 });
  var TONES = Object.freeze({ gold: "#e0c27e", violet: "#c9a4f2", cyan: "#8fe3d6", crimson: "#ef9a92" });

  // modules/rendering/stage-npcs.mjs
  var StageNpcs = class {
    constructor(deps) {
      this.deps = deps;
      this.LIVE_MS = LIVE_MS;
      this.TONES = TONES;
      this.npcSheets = /* @__PURE__ */ new Map();
      this.npcHit = null;
      this.npcFlashes = /* @__PURE__ */ new Map();
      this.NPC_HOVER_RIM = "#fff8e6";
      this.hoveredNpc = null;
    }
    npcSheet(id) {
      if (!this.npcSheets.has(id)) this.npcSheets.set(id, this.deps.stagePictures.openPicture(`${this.deps.STAGE_NPC_ART.path}${id}-idle.png?v=${this.deps.STAGE_NPC_ART.version}`));
      return this.npcSheets.get(id);
    }
    npcFrame(now) {
      const times = this.deps.STAGE_NPC_ART.frameMs;
      let left = now % times.reduce((sum, ms) => sum + ms, 0), index = 0;
      while (left >= times[index]) left -= times[index++];
      return index;
    }
    npcLabel(ctx, npc, x, y) {
      ctx.font = `12px ${this.deps.i18n.fontFamily("'Galmuri11'")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(8,6,4,0.9)";
      ctx.fillStyle = this.TONES[npc.tone] || this.TONES.gold;
      this.deps.drawCrispCanvasText(ctx, this.deps._t(npc.name), x, y, "strokeText");
      this.deps.drawCrispCanvasText(ctx, this.deps._t(npc.name), x, y);
    }
    npcOfferMark(ctx, x, y) {
      const colour = "#d9cfb8";
      ctx.fillStyle = "rgba(12,10,12,0.92)";
      ctx.fillRect(x - 8, y - 9, 16, 18);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 7.5, y - 8.5, 15, 17);
      ctx.fillStyle = colour;
      for (let dot = -1; dot <= 1; dot++) ctx.fillRect(x + dot * 4 - 1, y + 2, 2, 2);
    }
    npcStruck(now) {
      let share = 0;
      for (const fx of this.deps.battleFx) {
        if (!fx || fx.type !== "npcStruck" || !(now - fx.start < fx.duration) || now < fx.start) continue;
        share = Math.max(share, 1 - (now - fx.start) / fx.duration);
      }
      return share;
    }
    npcFlashFrame(id, source, frame, colour = "#fff4df") {
      const key = `${id}:${frame}:${colour}`, cell = this.deps.STAGE_NPC_ART.cell;
      if (!this.npcFlashes.has(key)) {
        const canvas = this.deps.document.createElement("canvas"), c = canvas.getContext("2d");
        canvas.width = canvas.height = cell;
        c.drawImage(source, frame * cell, 0, cell, cell, 0, 0, cell, cell);
        c.globalCompositeOperation = "source-in";
        c.fillStyle = colour;
        c.fillRect(0, 0, cell, cell);
        this.npcFlashes.set(key, canvas);
      }
      return this.npcFlashes.get(key);
    }
    hover(npc) {
      this.hoveredNpc = npc ? npc.id : null;
    }
    npcHoverRim(ctx, actor, source, frame, at) {
      if (!actor.talkable || this.hoveredNpc !== actor.npc.id) return;
      const cell = this.deps.STAGE_NPC_ART.cell, rim = Math.max(1, Math.round(at.scale / this.deps.STAGE_NPC_ART.scale));
      const painted = this.npcFlashFrame(actor.npc.id, source, frame, this.NPC_HOVER_RIM);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        this.deps.stageDots.blit(ctx, painted, { x: 0, y: 0, w: cell, h: cell }, { x: at.x + dx * rim, y: at.y + dy * rim, scale: at.scale });
      }
    }
    npcSparks(ctx, x, y, dot, struck) {
      const spread = (1 - struck) * 14 * dot + 4 * dot, size = Math.max(2, Math.round(dot * 2));
      ctx.save();
      ctx.globalAlpha = struck;
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3 + 0.4;
        ctx.fillStyle = i % 2 ? "#ffd27a" : "#fff4df";
        ctx.fillRect(Math.round(x + Math.cos(angle) * spread), Math.round(y + Math.sin(angle) * spread), size, size);
      }
      ctx.restore();
    }
    drawNpc(ctx, actor, state, marked) {
      const art = this.deps.STAGE_NPC_ART, sheet = this.npcSheet(actor.npc.id);
      if (!sheet.ready) return;
      const dot = this.deps.stageActors.scaleFor(state.gridProj.tileW) * art.scale, cell = art.cell, top = Math.round(actor.y - (art.feet[1] - art.head) * dot);
      const frame = this.npcFrame(state.now), struck = this.npcStruck(state.now);
      this.deps.stageRings.shadow(ctx, { x: actor.x, y: actor.y, dot }, 18, 0.34);
      ctx.save();
      const axis = Math.round(actor.x);
      if (state.playerPos.x < actor.x) {
        ctx.translate(axis * 2, 0);
        ctx.scale(-1, 1);
      }
      const at = { x: Math.round(axis - art.feet[0] * dot), y: Math.round(actor.y - art.feet[1] * dot), scale: dot };
      this.npcHoverRim(ctx, actor, sheet.source, frame, at);
      this.deps.stageDots.blit(ctx, sheet.source, { x: frame * cell, y: 0, w: cell, h: cell }, at);
      if (struck > 0) {
        ctx.globalAlpha = 0.6 * struck;
        this.deps.stageDots.blit(ctx, this.npcFlashFrame(actor.npc.id, sheet.source, frame), { x: 0, y: 0, w: cell, h: cell }, at);
      }
      ctx.restore();
      if (struck > 0) this.npcSparks(ctx, actor.x, Math.round((top + actor.y) / 2), dot, struck);
      ctx.save();
      this.npcLabel(ctx, actor.npc, actor.x, top);
      if (marked) this.npcOfferMark(ctx, actor.x, top - 20, marked);
      ctx.restore();
      const head = { x: actor.x, y: top - (marked ? 32 : 12) };
      this.npcHit = actor.talkable ? { npc: actor.npc, at: this.deps.Date.now(), x0: actor.x - 30 * dot, x1: actor.x + 30 * dot, y0: top - 30, y1: actor.y } : null;
      return head;
    }
    npcAt(point) {
      const hit = this.npcHit && this.deps.Date.now() - this.npcHit.at < this.LIVE_MS ? this.npcHit : null;
      return hit && point && point.x >= hit.x0 && point.x <= hit.x1 && point.y >= hit.y0 && point.y <= hit.y1 ? hit.npc : null;
    }
  };
  function createStageNpcs(deps) {
    const view = new StageNpcs(deps);
    return Object.freeze({
      ready: (id) => view.npcSheet(id).ready,
      draw: view.drawNpc.bind(view),
      npcAt: view.npcAt.bind(view),
      hover: view.hover.bind(view)
    });
  }

  // modules/rendering/story-text.mjs
  var StoryText = class {
    constructor(deps) {
      this.deps = deps;
      this.FADE_IN_MS = FADE_IN_MS;
      this.FADE_OUT_MS = FADE_OUT_MS;
      this.LINE = LINE;
      this.storyFont = () => this.deps.i18n.fontFamily("'Galmuri14', 'Galmuri11'");
    }
    opacity(age, showMs) {
      return Math.max(0, Math.min(1, age / this.FADE_IN_MS, (showMs - age) / this.FADE_OUT_MS));
    }
    band(ctx, view) {
      const shade = ctx.createLinearGradient(0, view.top - view.size * 1.4, 0, view.top + view.size * 1.8);
      shade.addColorStop(0, "rgba(6,8,10,0)");
      shade.addColorStop(0.5, "rgba(6,8,10,0.62)");
      shade.addColorStop(1, "rgba(6,8,10,0)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, view.top - view.size * 1.4, view.width, view.size * 3.2);
    }
    kicker(card, ctx, view) {
      const half = view.size * 2.4;
      ctx.font = `${this.deps.pixelFontSize(view.size * 0.5, 15)}px ${this.storyFont()}`;
      ctx.fillStyle = card.style.kickerColour;
      this.deps.drawCrispCanvasText(ctx, card.kicker, view.x, view.top - view.size * 0.55);
      const gap = ctx.measureText(card.kicker).width / 2 + view.size * 0.5;
      ctx.fillRect(Math.round(view.x - gap - half), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
      ctx.fillRect(Math.round(view.x + gap), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
    }
    title(card, ctx, view) {
      ctx.font = `${this.deps.pixelFontSize(view.size, 15)}px ${this.storyFont()}`;
      ctx.lineWidth = 2 * Math.max(2, Math.round(view.size * 0.08));
      ctx.strokeStyle = "rgba(8,6,4,0.9)";
      this.deps.drawCrispCanvasText(ctx, this.deps._t(card.title), view.x, view.top + view.size * 0.5, "strokeText");
      ctx.fillStyle = card.style.titleColour;
      this.deps.drawCrispCanvasText(ctx, this.deps._t(card.title), view.x, view.top + view.size * 0.5);
    }
    drawTitleCard(card, ctx, width, height, now) {
      const size = Math.round(Math.max(20, Math.min(34, Math.min(width, height) * 0.04)));
      const view = { x: Math.round(width / 2), top: Math.round(height * 0.2), size, width };
      ctx.save();
      ctx.globalAlpha = this.opacity(now - card.startAt, card.style.showMs);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this.band(ctx, view);
      this.kicker(card, ctx, view);
      this.title(card, ctx, view);
      ctx.restore();
    }
    storyLineRows(ctx, text, width) {
      const rows = [];
      for (const word of text.split(" ")) {
        const last = rows.length ? `${rows[rows.length - 1]} ${word}` : null;
        if (last !== null && ctx.measureText(last).width <= width) rows[rows.length - 1] = last;
        else rows.push(word);
      }
      return rows;
    }
    storyLineLayout(speech, ctx, width) {
      if (speech.line.layoutFor !== width) {
        const rows = this.storyLineRows(ctx, speech.line.text, width);
        speech.line.layout = { rows, widest: Math.ceil(Math.max(...rows.map((row) => ctx.measureText(row).width))) };
        speech.line.layoutFor = width;
      }
      return speech.line.layout;
    }
    storyAnchor(speech, scene) {
      if (speech.line.woodsman) return this.deps.woodsmanView.speechAnchor(speech.line.woodsman);
      if (speech.line.who === "hero") return { x: scene.light.x, y: (this.deps.getHeroHeadY(scene.now) ?? scene.light.y - 82 * this.deps.HERO_SIZE_SCALE) - 18 };
      if (speech.line.who === "npc") return speech.npcHead;
      if (speech.line.who !== "boss") return null;
      const entry = scene.layout.find((row) => row.drawn && row.enemy.id === speech.line.bossId);
      return entry ? { x: entry.x, y: entry.y - this.deps.getEnemyFieldBarLift(entry.enemy) - 10 } : null;
    }
    storyBubbleFrame(speech, ctx, box, tipX) {
      ctx.fillStyle = "rgba(12,10,12,0.92)";
      ctx.strokeStyle = speech.line.colour;
      ctx.lineWidth = 1;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
      ctx.beginPath();
      ctx.moveTo(tipX - 6, box.y + box.h - 0.5);
      ctx.lineTo(tipX, box.y + box.h + 7);
      ctx.lineTo(tipX + 6, box.y + box.h - 0.5);
      ctx.fill();
      ctx.stroke();
    }
    drawStoryBubble(speech, ctx, view, anchor) {
      const pad = Math.round(view.size * 0.6), rowH = Math.round(view.size * 1.45);
      const { rows, widest } = this.storyLineLayout(speech, ctx, Math.min(view.width - 32, view.size * this.LINE.bubbleChars));
      const w = widest + pad * 2, h = rows.length * rowH + pad * 2;
      const x = Math.round(Math.min(Math.max(8, anchor.x - w / 2), view.width - w - 8)), y = Math.round(Math.max(8, anchor.y - h - 7));
      this.storyBubbleFrame(speech, ctx, { x, y, w, h }, Math.round(Math.min(Math.max(x + 12, anchor.x), x + w - 12)));
      ctx.fillStyle = "#efe7d6";
      rows.forEach((row, index) => this.deps.drawCrispCanvasText(ctx, row, x + w / 2, y + pad + rowH * (index + 0.5)));
    }
    drawStoryBand(speech, ctx, view) {
      const rows = this.storyLineLayout(speech, ctx, Math.min(view.width - view.size * 3, view.size * 34)).rows.slice(0, this.LINE.maxRows);
      const top = view.top - view.size * 2, height = view.size * (rows.length * 1.5 + 3);
      const shade = ctx.createLinearGradient(0, top, 0, top + height);
      [[0, 0], [0.25, 0.66], [0.75, 0.66], [1, 0]].forEach(([at, alpha]) => shade.addColorStop(at, `rgba(6,8,10,${alpha})`));
      ctx.fillStyle = shade;
      ctx.fillRect(0, top, view.width, height);
      if (speech.line.who !== "narration") this.storyBandSpeaker(speech, ctx, view);
      ctx.font = `${this.deps.pixelFontSize(view.size, 15)}px ${this.storyFont()}`;
      ctx.lineWidth = 2 * Math.max(2, Math.round(view.size * 0.1));
      ctx.strokeStyle = "rgba(8,6,4,0.9)";
      ctx.fillStyle = speech.line.who === "narration" ? "#d9cdb0" : "#efe7d6";
      rows.forEach((row, index) => {
        const y = view.top + view.size * (0.9 + index * 1.5);
        this.deps.drawCrispCanvasText(ctx, row, view.x, y, "strokeText");
        this.deps.drawCrispCanvasText(ctx, row, view.x, y);
      });
    }
    storyBandSpeaker(speech, ctx, view) {
      ctx.font = `${this.deps.pixelFontSize(view.size * 0.8, 12)}px ${this.deps.i18n.fontFamily("'Galmuri11'")}`;
      ctx.fillStyle = speech.line.colour;
      this.deps.drawCrispCanvasText(ctx, speech.line.speaker, view.x, view.top - view.size * 0.6);
    }
    drawStoryLine(speech, ctx, scene) {
      if (speech.line.revive) this.deps.bossRevive.draw(ctx, scene, speech.line.revive, scene.now - speech.line.startAt, speech.line.showMs);
      const size = Math.round(Math.max(13, Math.min(18, Math.min(scene.width, scene.height) * 0.022)));
      const view = { x: Math.round(scene.width / 2), top: Math.round(scene.height * 0.2), size, width: scene.width };
      const anchor = this.storyAnchor(speech, scene);
      ctx.save();
      ctx.globalAlpha = this.opacity(scene.now - speech.line.startAt, speech.line.showMs);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${this.deps.pixelFontSize(size, 15)}px ${this.storyFont()}`;
      if (anchor) this.drawStoryBubble(speech, ctx, view, anchor);
      else this.drawStoryBand(speech, ctx, view);
      ctx.restore();
    }
  };
  function createStoryText(deps) {
    const view = new StoryText(deps);
    return Object.freeze({ drawTitleCard: view.drawTitleCard.bind(view), drawStoryLine: view.drawStoryLine.bind(view) });
  }

  // modules/ui/act-title-card.mjs
  var ActTitleCard = class {
    constructor(deps) {
      this.deps = deps;
      this.npcs = createStageNpcs(deps);
      this.text = createStoryText(deps);
      this.ACT = Object.freeze({ showMs: 3600, kickerColour: "#e0c27e", titleColour: "#e9e2cf" });
      this.LIVE_MS = LIVE_MS;
      this.LINE = LINE;
      this.CARRY = /* @__PURE__ */ new Set(["defeat", "class", "epilogue"]);
      this.GREET = Object.freeze({ keys: /* @__PURE__ */ new Set(["wake", "spot", "npc", "reply"]), maxMs: 32e3 });
      this.TONES = TONES;
      this.zone = void 0;
      this.pending = null;
      this.card = null;
      this.frameAt = 0;
      this.line = null;
      this.watchedAt = 0;
      this.trackedAt = 0;
      this.place = null;
      this.watchedRun = null;
      this.covered = false;
      this.holding = false;
      this.greetSpent = 0;
      this.npcHead = null;
      this.woodsmanLine = null;
      this.queue = [];
      this.spoken = /* @__PURE__ */ new Set();
      this.runs = /* @__PURE__ */ new WeakMap();
      this.LOGGED = /* @__PURE__ */ new Set(["hero", "npc", "boss"]);
      this.storyAt = (key, lines) => lines ? { place: key, ...lines } : null;
      this.guideHere = () => this.deps.actExplorationDoors.storyGuide(this.zone);
      this.hushed = () => typeof this.deps.openingJourney === "object" && this.deps.openingJourney.hushes();
      this.rescuing = (run) => run.packs.some((pack) => pack.rescue && pack.aliveIds.length > 0);
      this.inGuideRoom = (run) => {
        const map = this.deps.actExplorationDoors.stageMap(run), room = this.deps.actExplorationDoors.room(run);
        return !!map && !!room && room === this.deps.actExplorationDoors.guideRoom(run, map);
      };
      this.greets = (row) => !!row && this.GREET.keys.has(row.key) && row.zone === this.zone;
      this.ends = (row) => !!row && this.CARRY.has(row.key) && row.zone === this.zone;
      this.NPC_MARK_MS = 1e3;
      this.npcMark = { at: -Infinity, id: null, on: false };
      this.npcRows = () => typeof this.deps.STORY_NPCS === "object" ? Object.values(this.deps.STORY_NPCS) : [];
    }
    actOf(zoneId) {
      return Number.isInteger(zoneId) && zoneId >= 0 && zoneId < this.deps.STORY_ACTS.length ? this.deps.STORY_ACTS[zoneId] : null;
    }
    popupOpen() {
      const overlay = typeof this.deps.document === "object" ? this.deps.document.getElementById("tutorial-overlay") : null;
      return !!overlay && overlay.classList.contains("active");
    }
    /** A window over the battlefield (story popup, act reward, dialog, selection window): a line waits behind it rather than
     * play unseen. */
    storyCovered() {
      return typeof this.deps.document === "object" && !!this.deps.document.querySelector(".tutorial-overlay.active, dialog[open], .selection-overlay");
    }
    watchZone(owner) {
      if (owner.currentZoneId === this.zone) return;
      this.zone = owner.currentZoneId;
      const act = this.actOf(this.zone);
      this.card = null;
      this.pending = act ? { style: this.ACT, kicker: this.deps._t("액트 {displayAct}", { displayAct: act.displayAct }), title: this.deps._t(act.title) } : null;
    }
    track(owner, now) {
      this.watchZone(owner);
      if (this.card && now - this.card.startAt >= this.card.style.showMs) this.card = null;
      if (!this.card && this.pending && !this.popupOpen()) {
        this.card = { ...this.pending, startAt: now };
        this.pending = null;
      }
      this.trackStoryLine(owner, now);
    }
    dropStoryLines(drop) {
      for (let i = this.queue.length - 1; i >= 0; i--) if (drop(this.queue[i])) this.queue.splice(i, 1);
    }
    /** Reading time advances only while the battlefield is uncovered. */
    trackReadingTime(now) {
      const waited = now - (this.trackedAt || now);
      this.trackedAt = now;
      const wasCovered = this.covered;
      this.covered = this.line || this.queue.length ? this.storyCovered() : false;
      if (this.covered || wasCovered) {
        if (this.line) this.line.startAt += waited;
        this.queue.forEach((entry) => {
          entry.at += waited;
        });
      }
    }
    trackStoryLine(owner, now) {
      this.trackReadingTime(now);
      if (this.covered) return;
      if (this.line && now - this.line.startAt >= this.line.showMs) this.line = null;
      this.dropStoryLines((entry) => !this.CARRY.has(entry.key) && (entry.zone !== this.zone || now - entry.at > this.LINE.staleMs && !this.GREET.keys.has(entry.key)));
      if (this.line || this.card || this.pending || !this.queue.length) return;
      this.line = { ...this.queue.shift(), startAt: now };
      this.logStoryLine(owner, this.line);
    }
    /** The line now on screen also goes to the combat log, short (2026-10-15 사용자: "전투로그에 캐릭터, 등장인물, 보스 대사 (마법사 :
     * 대사) 이렇게 간결하게", 설정 '대사 표시' showStoryLog): the hero by its class name, an NPC by its name after the title. */
    logStoryLine(owner, row) {
      if (!this.LOGGED.has(row.who) || owner.settings.showStoryLog === false) return;
      const speaker = row.speaker.split(" (")[0].split(", ").pop(), words = row.text.replace(/^“|”$/g, "");
      this.deps.addLog(`<b class="log-speaker" style="color:${row.colour}">${this.deps.escapeHTML(speaker)}</b> : ${this.deps.escapeHTML(words)}`, "story-line", { noToast: true });
    }
    /** Queues a line once per loop and place (the act, trial or endgame boss whose story it is). row: key (wake, npc, stele,
     * intro, half, defeat, class, epilogue, elite), who (hero, boss, npc, stele, narration), speaker, text, tone, and for a boss its id. */
    queueStoryLine(owner, row, now) {
      const id = `${owner.season || 1}:${this.place}:${row.key}`;
      if (!row.text || this.spoken.has(id)) return;
      this.spoken.add(id);
      const text = this.deps._t(row.text), speaker = row.speaker ? this.deps._t(row.speaker) : row.speaker;
      const showMs = Math.min(this.LINE.maxMs, this.LINE.baseMs + [...text].length * this.LINE.perCharMs);
      this.queue.push({ ...row, text, speaker, zone: this.zone, colour: this.TONES[row.tone] || this.TONES.gold, at: now, showMs });
    }
    /** A boss line in “…” is the boss speaking; in 「…」 it is narration of the fight. */
    queueBossLine(owner, key, seen, text, { now, revive = null }) {
      const who = text && text.startsWith("“") ? "boss" : "narration";
      this.queueStoryLine(owner, { key, who, speaker: seen.name, text, tone: "crimson", bossId: seen.id, revive }, now);
    }
    /** The map's story and the place its lines count under: an act's or a trial's by zone, an endgame boss fight's by zone id
     * (atlas maps share one zone: an apex boss's map names it in atlasStages, js/atlas-endgame.js zoneExtras). */
    storyEncounter(zoneId) {
      const act = this.actOf(zoneId);
      if (act) return this.storyAt(zoneId, this.deps.STORY_ACT_ENCOUNTERS[act.order]);
      if (typeof zoneId !== "string") return null;
      if (this.deps.STORY_TRIAL_ENCOUNTERS[zoneId]) return this.storyAt(zoneId, this.deps.STORY_TRIAL_ENCOUNTERS[zoneId]);
      const here = zoneId === this.deps.ATLAS.zoneId ? this.deps.getZone(zoneId) : null, key = here ? here.atlasStages : zoneId;
      if (here?.boardBoss) return this.storyAt("atlas-board-gate", { boss: this.deps.ATLAS_BOARD.text.boss, oneBoss: true });
      return key && this.deps.STORY_ENDGAME_ENCOUNTERS[key] ? this.storyAt(key, { boss: this.deps.STORY_ENDGAME_ENCOUNTERS[key], oneBoss: true }) : null;
    }
    runWatch(run) {
      if (!this.runs.has(run)) this.runs.set(run, { story: this.storyEncounter(this.zone), act: this.actOf(this.zone), seen: /* @__PURE__ */ new Map(), left: void 0 });
      return this.runs.get(run);
    }
    /** A fight that sends the hero on in the tick its boss falls (a season boss leaves no cleared map on screen): its fall
     * is told once the next map is up. */
    watchPassedRun(owner, run, now) {
      const passed = this.watchedRun && this.watchedRun !== run ? this.runs.get(this.watchedRun) : null;
      if (passed && passed.story && passed.story.boss && this.watchedRun.status === "cleared") this.storyBossDown(owner, passed, now);
      this.watchedRun = run;
    }
    storyClassLore(owner) {
      return this.deps.STORY_CLASS_ORIGINS[owner.selectedClassId] || null;
    }
    /** The room-stage story of the map, looked at a few times a second. Not while the class is being chosen (the game waits
     * then): the hero's lines would be taken in the default class's words. */
    watchStory(owner, now) {
      const run = this.deps.actExplorationState.current(owner);
      if (now - this.watchedAt < this.LINE.watchMs && run === this.watchedRun) return;
      this.watchedAt = now;
      if (!owner.heroSelectionInitialized || this.deps.isLoopHeroSelectOpen()) return;
      this.watchPassedRun(owner, run, now);
      const watch = run ? this.runWatch(run) : null;
      if (!watch || !watch.story || !this.deps.actExplorationDoors.stageMap(run)) return;
      this.place = watch.story.place;
      this.watchStoryRooms(owner, run, watch.story, now);
      this.watchStoryGate(owner, run, watch, now);
      this.watchStoryBoss(owner, run, watch, now);
    }
    watchStoryRooms(owner, run, story, now) {
      const room = this.deps.actExplorationDoors.room(run), stele = story.stele;
      if (room && room.role === "entry") this.watchWake(owner, now);
      if (room && this.inGuideRoom(run)) this.watchEntryRoom(owner, story, now, run);
      if (room && room.role === "optional" && stele && !stele.afterClear) this.queueStoryLine(owner, { key: "stele", who: "stele", speaker: stele.title, text: stele.bark, tone: "cyan" }, now);
    }
    /** The guide's line for this loop (docs/story-bible.md section 9): the first meeting in loop 1, the line for the hero's class
     * in even loops, the line that remembers the hero (loopBark) in odd loops from 3 on. */
    npcLine(owner, npc) {
      const loop = owner.season || 1, byClass = (npc.classBarks || {})[owner.selectedClassId];
      if (loop === 1) return npc.bark;
      return loop % 2 === 0 ? byClass || npc.loopBark || npc.bark : npc.loopBark || byClass || npc.bark;
    }
    /** ...so from loop 2 act 1's entry lines (loopBark, classBarks) are the hero's own, said on getting up in the empty first room
     * (docs/story-bible.md 5.2 and 5.3): the lines name a guide who does not stand there this loop. */
    queueHeroMuse(owner, story, lore, now) {
      if (lore && story.npc && !this.guideHere()) this.queueStoryLine(owner, { key: "npc", who: "hero", speaker: lore.label, text: this.npcLine(owner, story.npc), tone: "gold" }, now);
    }
    firstAct(owner) {
      return this.actOf(this.zone)?.order === 1 && (owner.season || 1) === 1;
    }
    /** Loop 1's act 1: the hero's first words on getting up in the entry room (wakeLine). */
    watchWake(owner, now) {
      const lore = this.storyClassLore(owner);
      if (!this.hushed() && this.firstAct(owner) && lore) this.queueStoryLine(owner, { key: "wake", who: "hero", speaker: lore.label, text: lore.wakeLine, tone: "gold" }, now);
    }
    /** ...and its words on seeing the guide struck (spotLine), in the room where that happens (js/combat-encounters.js starterRescueRoom). */
    queueSpotLine(owner, lore, run, now) {
      if (this.firstAct(owner) && lore && this.rescuing(run)) this.queueStoryLine(owner, { key: "spot", who: "hero", speaker: lore.label, text: lore.spotLine, tone: "gold" }, now);
    }
    /** The guide's room (guideRoom): the guide speaks and, after its first-meeting line (loop 1), the hero answers in its class's
     * words (classReplies are written to that line; from loop 2 the guide speaks other lines, 2026-10-15). While monsters strike
     * the guide (rescue) only the hero speaks: the guide's turn comes once they fall. */
    watchEntryRoom(owner, story, now, run) {
      if (this.hushed()) return;
      const lore = this.storyClassLore(owner), npc = this.guideHere();
      this.queueSpotLine(owner, lore, run, now);
      this.queueHeroMuse(owner, story, lore, now);
      if (!npc || this.rescuing(run)) return;
      this.countNpcMeeting(owner, run);
      this.queueStoryLine(owner, { key: "npc", who: "npc", speaker: npc.name, text: this.npcLine(owner, npc), tone: npc.tone }, now);
      const reply = lore && (owner.season || 1) === 1 ? (npc.classReplies || {})[owner.selectedClassId] : null;
      if (reply) this.queueStoryLine(owner, { key: "reply", who: "hero", speaker: lore.label, text: reply, tone: "gold" }, now);
    }
    /** The first look at the guide standing free in its room is one meeting (js/npc-shop.js meet: the NPC tab and the stock of its
     * shop), once per map run. The NPC tab shows from the first meeting on, with a dot while the NPC has an unlock to buy now. */
    countNpcMeeting(owner, run) {
      const watch = this.runs.get(run), npc = watch ? this.runNpc(owner, watch) : null;
      if (!npc || watch.met) return;
      watch.met = true;
      const tabShown = !!owner.unlocks.npcs;
      const tradeShown = this.deps.contentProgression.opening.canOpen(owner, "tab-trade");
      this.deps.npcShop.meet(npc, this.zone);
      this.deps.contentProgression.opening.sync(owner);
      const tradeOpen = this.deps.contentProgression.opening.canOpen(owner, "tab-trade");
      if (tradeOpen && this.deps.npcShop.stock(npc.id)) owner.noti.npcs = true;
      if (!tabShown || tradeShown !== tradeOpen) this.deps.updateTabUnlockButtons();
    }
    /** The run whose entry room greets the hero now: an active map with the hero in its entry room and no move command given
     * meanwhile (a command waives the greeting for the run). */
    greetingRun(owner) {
      const run = this.deps.actExplorationState.current(owner), watch = run ? this.runs.get(run) : null;
      if (!watch || run.status !== "active" || watch.waived) return null;
      if (run.destination) {
        watch.waived = true;
        return null;
      }
      return this.inGuideRoom(run) ? run : null;
    }
    /** A cleared map still on screen (its boss fell, the departure waits) with no move command given. */
    endingRun(owner) {
      const run = this.deps.actExplorationState.current(owner);
      return run && run.status === "cleared" && !run.destination ? run : null;
    }
    /** Whether the game holds for the story this frame: the entry room's greeting, or a cleared map's ending (the boss's fall and
     * the hero's words for it, 2026-10-15: they spilled into the next act's entry and kept the hero standing there for ~20 s),
     * waits or plays, and the hold has lasted less than GREET.maxMs of battlefield time. Behind a window (time not counted) it holds
     * only when windows pause the game: a game set to run behind windows walks on, and the lines play where the hero is once the
     * window closes. waited: ms since the last frame. */
    holdsGreeting(owner, waited) {
      const greeting = (this.greets(this.line) || this.queue.some(this.greets)) && !!this.greetingRun(owner);
      const waits = greeting || (this.ends(this.line) || this.queue.some(this.ends)) && !!this.endingRun(owner);
      if (!waits) {
        this.greetSpent = 0;
        return false;
      }
      if (this.covered) return !!owner.settings.pauseGameOnOverlay && this.greetSpent < this.GREET.maxMs;
      this.greetSpent += waited;
      return this.greetSpent < this.GREET.maxMs;
    }
    /** The colour the NPC speaks in (its tone in the act and trial lines). */
    npcTone(name) {
      const lines = [...Object.values(this.deps.STORY_ACT_ENCOUNTERS), ...Object.values(this.deps.STORY_TRIAL_ENCOUNTERS)].find((row) => row.npc && row.npc.name === name);
      return lines ? lines.npc.tone : "gold";
    }
    /** The run's NPC, found once: { id, name, title, tone, line } or null. */
    runNpc(owner, watch) {
      if (watch.npc !== void 0) return watch.npc;
      const said = this.guideHere(), row = said ? this.npcRows().find((npc) => npc.name === said.name) : null;
      watch.npc = row ? { id: row.id, name: row.name, title: row.title, tone: this.npcTone(row.name), line: this.npcLine(owner, said) } : null;
      return watch.npc;
    }
    /** Adds the NPC to the battlefield's actors while the hero is in the entry room (js/canvas-act-exploration.js appendScenery),
     * so it stands in depth with the hero and the monsters. It stands on the entry room's post (js/act-exploration-rooms.js npcPost:
     * the back row, two cells from where the hero starts), where act 1's first monsters strike it from two cells away. Nobody
     * stands on its cell (js/act-exploration-doors.js guideCells). */
    appendNpc(owner, actors, state) {
      const run = this.deps.actExplorationState.current(owner), watch = run ? this.runs.get(run) : null;
      const npc = watch ? this.runNpc(owner, watch) : null, map = npc ? this.deps.actExplorationDoors.stageMap(run) : null;
      if (!map || !this.inGuideRoom(run)) return;
      watch.npcCell = watch.npcCell || this.deps.actExplorationRooms.npcPost(this.deps.actExplorationDoors.guideRoom(run, map));
      const point = state.gridProj.cellToScreen(watch.npcCell.gx, watch.npcCell.gy);
      actors.push({ kind: "scenery", id: -3, x: point.x, y: point.y + state.gridProj.actorGroundOffsetY, npc, talkable: !this.rescuing(run) });
    }
    /** The idle frame shown now: the art's own frame times, looping. */
    /** Whether the NPC has an unlock to offer now, asked once a second. */
    npcOffers(npc, now) {
      if (this.npcMark.id !== npc.id || now - this.npcMark.at > this.NPC_MARK_MS) this.npcMark = { at: now, id: npc.id, kind: this.deps.contentUnlockUi.npcNews(npc) };
      return this.npcMark.kind;
    }
    /** The mark over the name in a dark square: three pale dots for a keyword not yet heard (js/content-progression-ui.js npcNews). */
    /** 1 just after a strike on the NPC, fading to 0 over the fx's duration; 0 when none is recent. */
    /** 그림 뒤에 깔리는 테: 한 색으로 칠한 그 프레임을 위아래 좌우로 한 도트씩 옮겨 찍는다. at = 그림을 찍는 자리와 배율. */
    /** The NPC facing the hero, its name over it in its colour (and the offer mark); remembers where it stands for a press. */
    /** The NPC drawn under a battlefield point (canvas CSS px) in the last frame, or null. */
    /** The hero's line when the last elite sealing the boss gate falls. */
    watchStoryGate(owner, run, watch, now) {
      const left = this.deps.actExplorationState.remainingElites(run), before = watch.left, lore = this.storyClassLore(owner);
      watch.left = left;
      if (before > 0 && left === 0 && lore && this.firstGateOfLoop(owner)) this.queueStoryLine(owner, { key: "elite", who: "hero", speaker: lore.label, text: lore.eliteLine, tone: "gold" }, now);
    }
    /** The hero's gate line once a loop (2026-10-15: one sentence for every class, said in all ten acts, became noise; the opened gate
     * shows itself on the stage). */
    firstGateOfLoop(owner) {
      const id = `${owner.season || 1}:gate`;
      if (this.spoken.has(id)) return false;
      this.spoken.add(id);
      return true;
    }
    /** The boss of the last stage (act 4 fights two): the one the half and fall lines speak of, and an act's intro. */
    finalStoryBoss(owner, run) {
      const stages = run.packs.filter((pack) => pack.stage !== null);
      const last = stages.reduce((top, pack) => top && top.stage > pack.stage ? top : pack, null);
      return last ? owner.enemies.find((enemy) => enemy && enemy.isBoss && last.aliveIds.includes(enemy.id)) || null : null;
    }
    /** ...and where it stands now (its middle cell, where a revival is drawn when it falls). */
    sighted(watch, boss, now) {
      if (!watch.seen.has(boss.id)) watch.seen.set(boss.id, { at: now, id: boss.id, name: this.deps.getEnemyDisplayName(boss) });
      const middle = this.deps.hasGridCell(boss) ? this.deps.getGridUnitCenter(boss) : null;
      return Object.assign(watch.seen.get(boss.id), middle ? { gx: middle.gx, gy: middle.gy } : {});
    }
    watchStoryBoss(owner, run, watch, now) {
      const lines = watch.story.boss;
      if (!lines) return;
      if (run.status === "cleared") {
        this.storyBossDown(owner, watch, now);
        return;
      }
      const last = this.finalStoryBoss(owner, run), first = watch.story.oneBoss ? owner.enemies.find((enemy) => enemy && enemy.isBoss) : last;
      if (!first) return;
      const seen = this.sighted(watch, first, now), lastSeen = last ? this.sighted(watch, last, now) : null;
      if (now - seen.at < this.LINE.introDelayMs) return;
      if (!this.deps.woodsmanBattle.owns(first)) this.queueBossLine(owner, "intro", seen, lines.intro, { now });
      if (last && last.hp <= last.maxHp * this.LINE.halfAt) this.queueBossLine(owner, "half", lastSeen, lines.half, { now });
    }
    /** The fall, then the hero's words for the act; an intro or half line not yet shown is past. Nothing when this view never
     * saw the boss (loaded into a cleared map). */
    storyBossDown(owner, watch, now) {
      const seen = [...watch.seen.values()].pop(), lore = this.storyClassLore(owner), act = watch.act;
      if (!seen) return;
      this.place = watch.story.place;
      this.dropStoryLines((entry) => entry.key === "intro" || entry.key === "half");
      const revive = act && this.deps.STAGE_BOSS_REVIVAL.bosses.includes(act.bossId) && Number.isFinite(seen.gx) ? { gx: seen.gx, gy: seen.gy, name: seen.name } : null;
      this.queueBossLine(owner, "defeat", seen, watch.story.boss.defeat, { now, revive });
      if (lore && act) this.queueStoryLine(owner, { key: "class", who: "hero", speaker: lore.label, text: lore.bossLines[act.order], tone: "violet" }, now);
      const stele = watch.story.stele;
      if (stele && stele.afterClear) this.queueStoryLine(owner, { key: "epilogue", who: "stele", speaker: stele.title, text: stele.bark, tone: "cyan" }, now);
    }
    /** Uses the encounter's waiting clock, not a second timer. Pausing also pauses the spoken introduction.
     * The existing line renderer/log are reused; half-health and defeat lines keep their ordinary queue. */
    drawWoodsmanIntroduction(owner, ctx, scene) {
      const intro = this.deps.woodsmanBattle.introduction();
      if (!intro) {
        this.woodsmanLine = null;
        return false;
      }
      const age = intro.elapsedMs - this.deps.WOODSMAN_BATTLE.intro.revealMs;
      if (age < 0 || this.storyCovered()) return true;
      if (this.woodsmanLine?.woodsman !== intro.enemy || this.woodsmanLine.locale !== this.deps.i18n.locale) {
        this.woodsmanLine = {
          woodsman: intro.enemy,
          locale: this.deps.i18n.locale,
          who: "boss",
          colour: this.TONES.crimson,
          speaker: this.deps.getEnemyDisplayName(intro.enemy),
          text: this.deps._t(this.deps.STORY_ENDGAME_ENCOUNTERS[this.deps.OUTSIDE_CHAOS_ZONE_ID].intro),
          showMs: this.deps.WOODSMAN_BATTLE.intro.speechMs
        };
        this.logStoryLine(owner, this.woodsmanLine);
      }
      this.woodsmanLine.startAt = scene.now - age;
      this.text.drawStoryLine({ line: this.woodsmanLine, npcHead: this.npcHead }, ctx, scene);
      return true;
    }
    /** Called once per battlefield frame, after the life bars and the damage numbers. scene: the battlefield's frame scene
     * (width, height, now, light = the hero's place, layout = the drawn enemies). */
    draw(owner, ctx, scene) {
      const waited = scene.now - (this.trackedAt || scene.now);
      this.frameAt = this.deps.Date.now();
      const unlooked = !this.line && !this.queue.length;
      this.track(owner, scene.now);
      this.watchStory(owner, scene.now);
      if (unlooked && (this.line || this.queue.length)) this.covered = this.storyCovered();
      this.holding = this.holdsGreeting(owner, waited);
      if (!scene.observerScene && !this.drawWoodsmanIntroduction(owner, ctx, scene)) this.drawQueuedStory(ctx, scene);
      this.npcHead = null;
    }
    drawNpc(ctx, actor, state) {
      if (!this.npcs.ready(actor.npc.id)) return;
      const marked = actor.talkable ? this.npcOffers(actor.npc, state.now) : "";
      this.npcHead = this.npcs.draw(ctx, actor, state, marked);
    }
    drawQueuedStory(ctx, scene) {
      if (this.card) this.text.drawTitleCard(this.card, ctx, scene.width, scene.height, scene.now);
      else if (this.line) this.text.drawStoryLine({ line: this.line, npcHead: this.npcHead }, ctx, scene);
    }
    /** True while a title card is on screen or about to start — guide cards wait for it (js/tutorial-ui.js). It runs on
     * the battlefield's clock, so this asks the battlefield: a hidden or stalled view never holds the cards back. */
    busy() {
      return !!(this.card || this.pending) && this.deps.Date.now() - this.frameAt < this.LIVE_MS;
    }
    /** True while the hero stands for the entry room's greeting: js/ui.js pauses the game for it. Only while the battlefield
     * draws, like busy. */
    greeting() {
      const opening = typeof this.deps.openingJourney === "object" && this.deps.openingJourney.holds();
      return (this.holding || opening) && this.deps.Date.now() - this.frameAt < this.LIVE_MS;
    }
    /** True while a story line's bubble is on screen (the first start's lesson line steps aside for it, js/opening-journey-ui.js). */
    speaking() {
      return !!(this.line || this.woodsmanLine) && this.deps.Date.now() - this.frameAt < this.LIVE_MS;
    }
  };
  function createActTitleCard(deps) {
    const instance = new ActTitleCard(deps);
    return Object.freeze({ draw: instance.draw.bind(instance), busy: instance.busy.bind(instance), greeting: instance.greeting.bind(instance), speaking: instance.speaking.bind(instance), appendNpc: instance.appendNpc.bind(instance), drawNpc: instance.drawNpc.bind(instance), npcAt: instance.npcs.npcAt, hover: instance.npcs.hover });
  }

  // modules/canvas-act-title-card-classic.mjs
  var native = createActTitleCard({
    get i18n() {
      return i18n;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get STORY_ACT_ENCOUNTERS() {
      return STORY_ACT_ENCOUNTERS;
    },
    get STORY_TRIAL_ENCOUNTERS() {
      return STORY_TRIAL_ENCOUNTERS;
    },
    get ATLAS() {
      return ATLAS;
    },
    get getZone() {
      return getZone;
    },
    get ATLAS_BOARD() {
      return ATLAS_BOARD;
    },
    get STORY_ENDGAME_ENCOUNTERS() {
      return STORY_ENDGAME_ENCOUNTERS;
    },
    get STORY_CLASS_ORIGINS() {
      return STORY_CLASS_ORIGINS;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get isLoopHeroSelectOpen() {
      return isLoopHeroSelectOpen;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get openingJourney() {
      return typeof openingJourney === "undefined" ? void 0 : openingJourney;
    },
    get contentProgression() {
      return contentProgression;
    },
    get npcShop() {
      return npcShop;
    },
    get updateTabUnlockButtons() {
      return updateTabUnlockButtons;
    },
    get STORY_NPCS() {
      return typeof STORY_NPCS === "undefined" ? void 0 : STORY_NPCS;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get stagePictures() {
      return stagePictures;
    },
    get STAGE_NPC_ART() {
      return STAGE_NPC_ART;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get drawCrispCanvasText() {
      return drawCrispCanvasText;
    },
    get battleFx() {
      return battleFx;
    },
    get stageDots() {
      return stageDots;
    },
    get stageActors() {
      return stageActors;
    },
    get stageRings() {
      return stageRings;
    },
    get Date() {
      return Date;
    },
    get getEnemyDisplayName() {
      return getEnemyDisplayName;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get STAGE_BOSS_REVIVAL() {
      return STAGE_BOSS_REVIVAL;
    },
    get pixelFontSize() {
      return pixelFontSize;
    },
    get woodsmanView() {
      return woodsmanView;
    },
    get getHeroHeadY() {
      return getHeroHeadY;
    },
    get HERO_SIZE_SCALE() {
      return HERO_SIZE_SCALE;
    },
    get getEnemyFieldBarLift() {
      return getEnemyFieldBarLift;
    },
    get bossRevive() {
      return bossRevive;
    },
    get WOODSMAN_BATTLE() {
      return WOODSMAN_BATTLE;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    }
  });
  var actTitleCard = Object.freeze({
    draw: (ctx, scene) => native.draw(game, ctx, scene),
    busy: native.busy,
    greeting: native.greeting,
    speaking: native.speaking,
    appendNpc: (actors, state) => native.appendNpc(game, actors, state),
    drawNpc: native.drawNpc,
    npcAt: native.npcAt,
    hover: native.hover,
    scenery: Object.freeze({ appendNpc: native.appendNpc, drawNpc: native.drawNpc })
  });
  if (typeof document === "object" && document.fonts?.load) {
    document.fonts.load("20px 'Galmuri14'").catch((error) => console.warn("[actTitleCard] Story font preload failed", error));
  }
  safeExposeGlobals({ actTitleCard });
})();
