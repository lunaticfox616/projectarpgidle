import { createStageNpcs } from '../rendering/stage-npcs.mjs';
import { createStoryText } from '../rendering/story-text.mjs';
import { LIVE_MS, LINE, TONES } from '../rendering/story-presentation-values.mjs';

/** Act title card over the upper battlefield, like an area name in an ARPG: entering (or loading into) a story act
 * shows "액트 N" and the act name. It waits while a story or tutorial popup is open, so it is not spent behind it.
 * Bosses keep the battlefield's own banner (drawBossAnnouncement).
 * On the room stage it also plays the story's lines (data/story-journal.js), one at a time after the card: the hero's
 * words and a boss's own words (“…”) in a speech bubble over the one speaking, so it is clear who talks; the guide of
 * the entry room, a side room's inscription and the narration of a boss fight (「…」) in a band where the card stands.
 * Acts and trials speak in their rooms, the endgame boss fights (STORY_ENDGAME_ENCOUNTERS) at the boss.
 * The NPC of an act's or a trial's entry room stands there when the stage has its picture (data/stage-view.js STAGE_NPC_ART)
 * and speaks in a bubble too (pressing it opens its window). While the entry room's greeting or a cleared map's ending waits
 * or plays, the game pauses as for a story popup (greeting, read by js/ui.js): the hero stands and listens instead of running
 * on, and an act's ending is told in its own boss room before the next act.
 * Read-only: it watches game state; nothing here touches combat state.
 */
class ActTitleCard {
    constructor(deps) {
        this.deps = deps;
        this.npcs = createStageNpcs(deps);
        this.text = createStoryText(deps);
        this.ACT = Object.freeze({ showMs: 3600, kickerColour: '#e0c27e', titleColour: '#e9e2cf' });

        this.LIVE_MS = LIVE_MS;
        this.LINE = LINE;
        this.CARRY = new Set(['defeat', 'class', 'epilogue']);
        this.GREET = Object.freeze({ keys: new Set(['wake', 'spot', 'npc', 'reply']), maxMs: 32000 });
        this.TONES = TONES;

        this.zone = undefined;
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
        this.spoken = new Set();
        this.runs = new WeakMap();
        this.LOGGED = new Set(['hero', 'npc', 'boss']);
        this.storyAt = (key, lines) => (lines ? { place: key, ...lines } : null);
        this.guideHere = () => this.deps.actExplorationDoors.storyGuide(this.zone);
        this.hushed = () => typeof this.deps.openingJourney === 'object' && this.deps.openingJourney.hushes();
        this.rescuing = run => run.packs.some(pack => pack.rescue && pack.aliveIds.length > 0);
        this.inGuideRoom = run => { const map = this.deps.actExplorationDoors.stageMap(run), room = this.deps.actExplorationDoors.room(run); return !!map && !!room && room === this.deps.actExplorationDoors.guideRoom(run, map); };
        this.greets = row => !!row && this.GREET.keys.has(row.key) && row.zone === this.zone;
        this.ends = row => !!row && this.CARRY.has(row.key) && row.zone === this.zone;
        this.NPC_MARK_MS = 1000;

        this.npcMark = { at: -Infinity, id: null, on: false };
        this.npcRows = () => (typeof this.deps.STORY_NPCS === 'object' ? Object.values(this.deps.STORY_NPCS) : []);

    }

    actOf(zoneId) {
        return Number.isInteger(zoneId) && zoneId >= 0 && zoneId < this.deps.STORY_ACTS.length ? this.deps.STORY_ACTS[zoneId] : null;
    }

    popupOpen() {
        const overlay = typeof this.deps.document === 'object' ? this.deps.document.getElementById('tutorial-overlay') : null;
        return !!overlay && overlay.classList.contains('active');
    }

    /** A window over the battlefield (story popup, act reward, dialog, selection window): a line waits behind it rather than
     * play unseen. */
    storyCovered() {
        return typeof this.deps.document === 'object' && !!this.deps.document.querySelector('.tutorial-overlay.active, dialog[open], .selection-overlay');
    }

    watchZone(owner) {
        if (owner.currentZoneId === this.zone) return;
        this.zone = owner.currentZoneId;
        const act = this.actOf(this.zone);
        this.card = null;
        // Act number and name only: the act's one-line subtitle repeats the goal panel (and ran under it on phones).
        this.pending = act ? { style: this.ACT, kicker: this.deps._t('액트 {displayAct}', { displayAct: act.displayAct }), title: this.deps._t(act.title) } : null;
    }

    track(owner, now) {
        this.watchZone(owner);
        if (this.card && now - this.card.startAt >= this.card.style.showMs) this.card = null;
        if (!this.card && this.pending && !this.popupOpen()) { this.card = { ...this.pending, startAt: now }; this.pending = null; }
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
        this.covered = (this.line || this.queue.length) ? this.storyCovered() : false;
        // Both the current line and queued lines keep their unread time, including the frame that closes the window.
        if (this.covered || wasCovered) {
            if (this.line) this.line.startAt += waited;
            this.queue.forEach(entry => { entry.at += waited; });
        }
    }

    trackStoryLine(owner, now) {
        this.trackReadingTime(now);
        if (this.covered) return;
        if (this.line && now - this.line.startAt >= this.line.showMs) this.line = null;
        // Greetings and endings keep their place in the reading queue: the hero stands for them.
        this.dropStoryLines(entry => !this.CARRY.has(entry.key) && (entry.zone !== this.zone || (now - entry.at > this.LINE.staleMs && !this.GREET.keys.has(entry.key))));
        if (this.line || this.card || this.pending || !this.queue.length) return;
        this.line = { ...this.queue.shift(), startAt: now };
        this.logStoryLine(owner, this.line);
    }

    /** The line now on screen also goes to the combat log, short (2026-10-15 사용자: "전투로그에 캐릭터, 등장인물, 보스 대사 (마법사 :
     * 대사) 이렇게 간결하게", 설정 '대사 표시' showStoryLog): the hero by its class name, an NPC by its name after the title. */
    logStoryLine(owner, row) {
        if (!this.LOGGED.has(row.who) || owner.settings.showStoryLog === false) return;
        const speaker = row.speaker.split(' (')[0].split(', ').pop(), words = row.text.replace(/^“|”$/g, '');
        this.deps.addLog(`<b class="log-speaker" style="color:${row.colour}">${this.deps.escapeHTML(speaker)}</b> : ${this.deps.escapeHTML(words)}`, 'story-line', { noToast: true });
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
        const who = text && text.startsWith('“') ? 'boss' : 'narration';
        this.queueStoryLine(owner, { key, who, speaker: seen.name, text, tone: 'crimson', bossId: seen.id, revive }, now);
    }

    /** The map's story and the place its lines count under: an act's or a trial's by zone, an endgame boss fight's by zone id
     * (atlas maps share one zone: an apex boss's map names it in atlasStages, js/atlas-endgame.js zoneExtras). */
    storyEncounter(zoneId) {
        const act = this.actOf(zoneId);
        if (act) return this.storyAt(zoneId, this.deps.STORY_ACT_ENCOUNTERS[act.order]);
        if (typeof zoneId !== 'string') return null;
        if (this.deps.STORY_TRIAL_ENCOUNTERS[zoneId]) return this.storyAt(zoneId, this.deps.STORY_TRIAL_ENCOUNTERS[zoneId]);
        const here = zoneId === this.deps.ATLAS.zoneId ? this.deps.getZone(zoneId) : null, key = here ? here.atlasStages : zoneId;
        if (here?.boardBoss) return this.storyAt('atlas-board-gate', { boss: this.deps.ATLAS_BOARD.text.boss, oneBoss: true });
        // oneBoss: the stages of an endgame fight are bodies of one boss, so its intro greets the first body.
        return key && this.deps.STORY_ENDGAME_ENCOUNTERS[key] ? this.storyAt(key, { boss: this.deps.STORY_ENDGAME_ENCOUNTERS[key], oneBoss: true }) : null;
    }

    runWatch(run) {
        if (!this.runs.has(run)) this.runs.set(run, { story: this.storyEncounter(this.zone), act: this.actOf(this.zone), seen: new Map(), left: undefined });
        return this.runs.get(run);
    }

    /** A fight that sends the hero on in the tick its boss falls (a season boss leaves no cleared map on screen): its fall
     * is told once the next map is up. */
    watchPassedRun(owner, run, now) {
        const passed = this.watchedRun && this.watchedRun !== run ? this.runs.get(this.watchedRun) : null;
        if (passed && passed.story && passed.story.boss && this.watchedRun.status === 'cleared') this.storyBossDown(owner, passed, now);
        this.watchedRun = run;
    }

    storyClassLore(owner) {
        return this.deps.STORY_CLASS_ORIGINS[owner.selectedClassId] || null;
    }

    /** The room-stage story of the map, looked at a few times a second. Not while the class is being chosen (the game waits
     * then): the hero's lines would be taken in the default class's words. */
    watchStory(owner, now) {
        const run = this.deps.actExplorationState.current(owner);
        // A new map is looked at at once: its greeting holds the hero before the first step.
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
        if (room && room.role === 'entry') this.watchWake(owner, now);
        if (room && this.inGuideRoom(run)) this.watchEntryRoom(owner, story, now, run);
        if (room && room.role === 'optional' && stele && !stele.afterClear) this.queueStoryLine(owner, { key: 'stele', who: 'stele', speaker: stele.title, text: stele.bark, tone: 'cyan' }, now);
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
        if (lore && story.npc && !this.guideHere()) this.queueStoryLine(owner, { key: 'npc', who: 'hero', speaker: lore.label, text: this.npcLine(owner, story.npc), tone: 'gold' }, now);
    }

    firstAct(owner) { return this.actOf(this.zone)?.order === 1 && (owner.season || 1) === 1; }

    /** Loop 1's act 1: the hero's first words on getting up in the entry room (wakeLine). */
    watchWake(owner, now) {
        const lore = this.storyClassLore(owner);
        if (!this.hushed() && this.firstAct(owner) && lore) this.queueStoryLine(owner, { key: 'wake', who: 'hero', speaker: lore.label, text: lore.wakeLine, tone: 'gold' }, now);
    }

    /** ...and its words on seeing the guide struck (spotLine), in the room where that happens (js/combat-encounters.js starterRescueRoom). */
    queueSpotLine(owner, lore, run, now) {
        if (this.firstAct(owner) && lore && this.rescuing(run)) this.queueStoryLine(owner, { key: 'spot', who: 'hero', speaker: lore.label, text: lore.spotLine, tone: 'gold' }, now);
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
        this.queueStoryLine(owner, { key: 'npc', who: 'npc', speaker: npc.name, text: this.npcLine(owner, npc), tone: npc.tone }, now);
        const reply = lore && (owner.season || 1) === 1 ? (npc.classReplies || {})[owner.selectedClassId] : null;
        if (reply) this.queueStoryLine(owner, { key: 'reply', who: 'hero', speaker: lore.label, text: reply, tone: 'gold' }, now);
    }

    /** The first look at the guide standing free in its room is one meeting (js/npc-shop.js meet: the NPC tab and the stock of its
     * shop), once per map run. The NPC tab shows from the first meeting on, with a dot while the NPC has an unlock to buy now. */
    countNpcMeeting(owner, run) {
        const watch = this.runs.get(run), npc = watch ? this.runNpc(owner, watch) : null;
        if (!npc || watch.met) return;
        watch.met = true;
        const tabShown = !!owner.unlocks.npcs;
        const tradeShown = this.deps.contentProgression.opening.canOpen(owner, 'tab-trade');
        this.deps.npcShop.meet(npc, this.zone);
        this.deps.contentProgression.opening.sync(owner);
        const tradeOpen = this.deps.contentProgression.opening.canOpen(owner, 'tab-trade');
        // 해금할 것이 있거나 진열대가 새로 놓였으면(만날 때마다 새로 놓인다, 1회차 첫 만남의 하켄만 닫혀 있다) NPC 탭에 점을 켠다.
        if (tradeOpen && this.deps.npcShop.stock(npc.id)) owner.noti.npcs = true;
        if (!tabShown || tradeShown !== tradeOpen) this.deps.updateTabUnlockButtons();
    }

    /** The run whose entry room greets the hero now: an active map with the hero in its entry room and no move command given
     * meanwhile (a command waives the greeting for the run). */
    greetingRun(owner) {
        const run = this.deps.actExplorationState.current(owner), watch = run ? this.runs.get(run) : null;
        if (!watch || run.status !== 'active' || watch.waived) return null;
        if (run.destination) { watch.waived = true; return null; }
        return this.inGuideRoom(run) ? run : null;
    }

    /** A cleared map still on screen (its boss fell, the departure waits) with no move command given. */
    endingRun(owner) {
        const run = this.deps.actExplorationState.current(owner);
        return run && run.status === 'cleared' && !run.destination ? run : null;
    }

    /** Whether the game holds for the story this frame: the entry room's greeting, or a cleared map's ending (the boss's fall and
     * the hero's words for it, 2026-10-15: they spilled into the next act's entry and kept the hero standing there for ~20 s),
     * waits or plays, and the hold has lasted less than GREET.maxMs of battlefield time. Behind a window (time not counted) it holds
     * only when windows pause the game: a game set to run behind windows walks on, and the lines play where the hero is once the
     * window closes. waited: ms since the last frame. */
    holdsGreeting(owner, waited) {
        const greeting = (this.greets(this.line) || this.queue.some(this.greets)) && !!this.greetingRun(owner);
        const waits = greeting || ((this.ends(this.line) || this.queue.some(this.ends)) && !!this.endingRun(owner));
        if (!waits) { this.greetSpent = 0; return false; }
        if (this.covered) return !!owner.settings.pauseGameOnOverlay && this.greetSpent < this.GREET.maxMs;
        this.greetSpent += waited;
        return this.greetSpent < this.GREET.maxMs;
    }

    /** The colour the NPC speaks in (its tone in the act and trial lines). */
    npcTone(name) {
        const lines = [...Object.values(this.deps.STORY_ACT_ENCOUNTERS), ...Object.values(this.deps.STORY_TRIAL_ENCOUNTERS)].find(row => row.npc && row.npc.name === name);
        return lines ? lines.npc.tone : 'gold';
    }

    /** The run's NPC, found once: { id, name, title, tone, line } or null. */
    runNpc(owner, watch) {
        if (watch.npc !== undefined) return watch.npc;
        const said = this.guideHere(), row = said ? this.npcRows().find(npc => npc.name === said.name) : null;
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
        actors.push({ kind: 'scenery', id: -3, x: point.x, y: point.y + state.gridProj.actorGroundOffsetY, npc, talkable: !this.rescuing(run) });
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
        if (before > 0 && left === 0 && lore && this.firstGateOfLoop(owner)) this.queueStoryLine(owner, { key: 'elite', who: 'hero', speaker: lore.label, text: lore.eliteLine, tone: 'gold' }, now);
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
        const stages = run.packs.filter(pack => pack.stage !== null);
        const last = stages.reduce((top, pack) => (top && top.stage > pack.stage ? top : pack), null);
        return last ? owner.enemies.find(enemy => enemy && enemy.isBoss && last.aliveIds.includes(enemy.id)) || null : null;
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
        if (run.status === 'cleared') { this.storyBossDown(owner, watch, now); return; }
        const last = this.finalStoryBoss(owner, run), first = watch.story.oneBoss ? owner.enemies.find(enemy => enemy && enemy.isBoss) : last;
        if (!first) return;
        const seen = this.sighted(watch, first, now), lastSeen = last ? this.sighted(watch, last, now) : null;
        if (now - seen.at < this.LINE.introDelayMs) return;
        if (!this.deps.woodsmanBattle.owns(first)) this.queueBossLine(owner, 'intro', seen, lines.intro, { now });
        if (last && last.hp <= last.maxHp * this.LINE.halfAt) this.queueBossLine(owner, 'half', lastSeen, lines.half, { now });
    }

    /** The fall, then the hero's words for the act; an intro or half line not yet shown is past. Nothing when this view never
     * saw the boss (loaded into a cleared map). */
    storyBossDown(owner, watch, now) {
        const seen = [...watch.seen.values()].pop(), lore = this.storyClassLore(owner), act = watch.act;
        if (!seen) return;
        this.place = watch.story.place;
        this.dropStoryLines(entry => entry.key === 'intro' || entry.key === 'half');
        const revive = act && this.deps.STAGE_BOSS_REVIVAL.bosses.includes(act.bossId) && Number.isFinite(seen.gx) ? { gx: seen.gx, gy: seen.gy, name: seen.name } : null;
        this.queueBossLine(owner, 'defeat', seen, watch.story.boss.defeat, { now, revive });
        if (lore && act) this.queueStoryLine(owner, { key: 'class', who: 'hero', speaker: lore.label, text: lore.bossLines[act.order], tone: 'violet' }, now);
        // An account of the completed fight must follow its last words, never precede it in an optional room.
        const stele = watch.story.stele;
        if (stele && stele.afterClear) this.queueStoryLine(owner, { key: 'epilogue', who: 'stele', speaker: stele.title, text: stele.bark, tone: 'cyan' }, now);
    }

    /** Uses the encounter's waiting clock, not a second timer. Pausing also pauses the spoken introduction.
     * The existing line renderer/log are reused; half-health and defeat lines keep their ordinary queue. */
    drawWoodsmanIntroduction(owner, ctx, scene) {
        const intro = this.deps.woodsmanBattle.introduction();
        if (!intro) { this.woodsmanLine = null; return false; }
        const age = intro.elapsedMs - this.deps.WOODSMAN_BATTLE.intro.revealMs;
        if (age < 0 || this.storyCovered()) return true;
        if (this.woodsmanLine?.woodsman !== intro.enemy || this.woodsmanLine.locale !== this.deps.i18n.locale) {
            this.woodsmanLine = { woodsman: intro.enemy, locale: this.deps.i18n.locale, who: 'boss', colour: this.TONES.crimson,
                speaker: this.deps.getEnemyDisplayName(intro.enemy), text: this.deps._t(this.deps.STORY_ENDGAME_ENCOUNTERS[this.deps.OUTSIDE_CHAOS_ZONE_ID].intro),
                showMs: this.deps.WOODSMAN_BATTLE.intro.speechMs };
            this.logStoryLine(owner, this.woodsmanLine);
        }
        this.woodsmanLine.startAt = scene.now - age;
        this.text.drawStoryLine({ line:this.woodsmanLine, npcHead:this.npcHead }, ctx, scene);
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
        // A first line queued after track still needs the current window state for the greeting hold and the next frame.
        if (unlooked && (this.line || this.queue.length)) this.covered = this.storyCovered();
        this.holding = this.holdsGreeting(owner, waited);
        if (!scene.observerScene && !this.drawWoodsmanIntroduction(owner, ctx, scene)) this.drawQueuedStory(ctx, scene);
        this.npcHead = null; // the guide's head is placed again by the next frame's actor layer, if it stands there
    }

    drawNpc(ctx, actor, state) {
        if(!this.npcs.ready(actor.npc.id))return;
        const marked=actor.talkable?this.npcOffers(actor.npc,state.now):'';
        this.npcHead=this.npcs.draw(ctx,actor,state,marked);
    }

    drawQueuedStory(ctx, scene) {
        if (this.card) this.text.drawTitleCard(this.card, ctx, scene.width, scene.height, scene.now);
        else if (this.line) this.text.drawStoryLine({ line:this.line, npcHead:this.npcHead }, ctx, scene);
    }

    /** True while a title card is on screen or about to start — guide cards wait for it (js/tutorial-ui.js). It runs on
     * the battlefield's clock, so this asks the battlefield: a hidden or stalled view never holds the cards back. */
    busy() { return !!(this.card || this.pending) && this.deps.Date.now() - this.frameAt < this.LIVE_MS; }

    /** True while the hero stands for the entry room's greeting: js/ui.js pauses the game for it. Only while the battlefield
     * draws, like busy. */
    greeting() {
        const opening = typeof this.deps.openingJourney === 'object' && this.deps.openingJourney.holds();
        return (this.holding || opening) && this.deps.Date.now() - this.frameAt < this.LIVE_MS;
    }

    /** True while a story line's bubble is on screen (the first start's lesson line steps aside for it, js/opening-journey-ui.js). */
    speaking() { return !!(this.line || this.woodsmanLine) && this.deps.Date.now() - this.frameAt < this.LIVE_MS; }
}

export function createActTitleCard(deps) {
    const instance = new ActTitleCard(deps);
    return Object.freeze({ draw: instance.draw.bind(instance), busy: instance.busy.bind(instance), greeting: instance.greeting.bind(instance), speaking: instance.speaking.bind(instance), appendNpc: instance.appendNpc.bind(instance), drawNpc: instance.drawNpc.bind(instance), npcAt: instance.npcs.npcAt, hover: instance.npcs.hover });
}
