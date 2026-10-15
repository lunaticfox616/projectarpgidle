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
const actTitleCard = (() => {
    const ACT = Object.freeze({ showMs: 3600, kickerColour: '#e0c27e', titleColour: '#e9e2cf' });
    const FADE_IN_MS = 500;
    const FADE_OUT_MS = 800;
    const LIVE_MS = 400; // the battlefield drew within this long: it is on screen and running
    // A line shows for baseMs plus perCharMs a character (at most maxMs). Time behind a window (story popup, act reward,
    // dialog) does not count; a line still waiting after staleMs on screen, or queued on another map, is dropped, except the
    // boss's fall, the hero's words and the closing inscription (CARRY): the reward window may open over them.
    // The boss intro waits introDelayMs from the boss's first sight, past its name banner (BOSS_BANNER_MS, 2.6 s,
    // js/canvas-battlefield.js). Lines wrap between words: bubbles at bubbleChars characters a row, bands at most maxRows rows.
    const LINE = Object.freeze({ baseMs: 1800, perCharMs: 65, maxMs: 6500, staleMs: 15000, watchMs: 200, introDelayMs: 3200, halfAt: 0.55, maxRows: 3, bubbleChars: 19 });
    const CARRY = new Set(['defeat', 'class', 'epilogue']);
    // The entry room's greeting: the hero's first words, the guide's line and the hero's answer. The hero stands for it at
    // most maxMs (the card, two lines carried from the last map and the greeting fit within it at the longest line length);
    // a move command ends the wait at once.
    const GREET = Object.freeze({ keys: new Set(['wake', 'spot', 'npc', 'reply']), maxMs: 32000 });
    const TONES = Object.freeze({ gold: '#e0c27e', violet: '#c9a4f2', cyan: '#8fe3d6', crimson: '#ef9a92' });
    const STORY_FONT = "'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif";
    let zone, pending = null, card = null, frameAt = 0, line = null, watchedAt = 0, trackedAt = 0, place = null, watchedRun = null;
    let covered = false, holding = false, greetSpent = 0, npcHead = null;
    // Per exploration run: its story and act, the bosses this view saw (id: first sight and name), the gate elites left, where
    // its guide stands, and whether a move command waived the greeting.
    const queue = [], spoken = new Set(), runs = new WeakMap();

    function actOf(zoneId) {
        return Number.isInteger(zoneId) && zoneId >= 0 && zoneId < STORY_ACTS.length ? STORY_ACTS[zoneId] : null;
    }
    function popupOpen() {
        const overlay = typeof document === 'object' ? document.getElementById('tutorial-overlay') : null;
        return !!overlay && overlay.classList.contains('active');
    }
    /** A window over the battlefield (story popup, act reward, dialog, selection window): a line waits behind it rather than
     * play unseen. */
    function storyCovered() {
        return typeof document === 'object' && !!document.querySelector('.tutorial-overlay.active, dialog[open], .selection-overlay');
    }
    function watchZone() {
        if (game.currentZoneId === zone) return;
        zone = game.currentZoneId;
        const act = actOf(zone);
        card = null;
        // Act number and name only: the act's one-line subtitle repeats the goal panel (and ran under it on phones).
        pending = act ? { style: ACT, kicker: `액트 ${act.displayAct}`, title: act.title } : null;
    }
    function track(now) {
        watchZone();
        if (card && now - card.startAt >= card.style.showMs) card = null;
        if (!card && pending && !popupOpen()) { card = { ...pending, startAt: now }; pending = null; }
        trackStoryLine(now);
    }
    function dropStoryLines(drop) {
        for (let i = queue.length - 1; i >= 0; i--) if (drop(queue[i])) queue.splice(i, 1);
    }
    /** Reading time advances only while the battlefield is uncovered. */
    function trackReadingTime(now) {
        const waited = now - (trackedAt || now);
        trackedAt = now;
        const wasCovered = covered;
        covered = storyCovered();
        // Both the current line and queued lines keep their unread time, including the frame that closes the window.
        if (covered || wasCovered) {
            if (line) line.startAt += waited;
            queue.forEach(entry => { entry.at += waited; });
        }
    }
    function trackStoryLine(now) {
        trackReadingTime(now);
        if (covered) return;
        if (line && now - line.startAt >= line.showMs) line = null;
        // Greetings and endings keep their place in the reading queue: the hero stands for them.
        dropStoryLines(entry => !CARRY.has(entry.key) && (entry.zone !== zone || (now - entry.at > LINE.staleMs && !GREET.keys.has(entry.key))));
        if (line || card || pending || !queue.length) return;
        line = { ...queue.shift(), startAt: now };
        logStoryLine(line);
    }
    // Who is logged: the hero, the NPCs, the bosses. Narration and inscriptions stay on the stage.
    const LOGGED = new Set(['hero', 'npc', 'boss']);
    /** The line now on screen also goes to the combat log, short (2026-10-15 사용자: "전투로그에 캐릭터, 등장인물, 보스 대사 (마법사 :
     * 대사) 이렇게 간결하게", 설정 '대사 표시' showStoryLog): the hero by its class name, an NPC by its name after the title. */
    function logStoryLine(row) {
        if (!LOGGED.has(row.who) || game.settings.showStoryLog === false) return;
        const speaker = row.speaker.split(' (')[0].split(', ').pop(), words = row.text.replace(/^“|”$/g, '');
        addLog(`<b class="log-speaker" style="color:${row.colour}">${escapeHTML(speaker)}</b> : ${escapeHTML(words)}`, 'story-line', { noToast: true });
    }
    /** Queues a line once per loop and place (the act, trial or endgame boss whose story it is). row: key (wake, npc, stele,
     * intro, half, defeat, class, epilogue, elite), who (hero, boss, npc, stele, narration), speaker, text, tone, and for a boss its id. */
    function queueStoryLine(row, now) {
        const id = `${game.season || 1}:${place}:${row.key}`;
        if (!row.text || spoken.has(id)) return;
        spoken.add(id);
        const showMs = Math.min(LINE.maxMs, LINE.baseMs + [...row.text].length * LINE.perCharMs);
        queue.push({ ...row, zone, colour: TONES[row.tone] || TONES.gold, at: now, showMs });
    }
    /** A boss line in “…” is the boss speaking; in 「…」 it is narration of the fight. */
    function queueBossLine(key, seen, text, now, revive = null) {
        const who = text && text.startsWith('“') ? 'boss' : 'narration';
        queueStoryLine({ key, who, speaker: seen.name, text, tone: 'crimson', bossId: seen.id, revive }, now);
    }
    const storyAt = (key, lines) => (lines ? { place: key, ...lines } : null);
    /** The map's story and the place its lines count under: an act's or a trial's by zone, an endgame boss fight's by zone id
     * (atlas maps share one zone: an apex boss's map names it in atlasStages, js/atlas-endgame.js zoneExtras). */
    function storyEncounter(zoneId) {
        const act = actOf(zoneId);
        if (act) return storyAt(zoneId, STORY_ACT_ENCOUNTERS[act.order]);
        if (typeof zoneId !== 'string') return null;
        if (STORY_TRIAL_ENCOUNTERS[zoneId]) return storyAt(zoneId, STORY_TRIAL_ENCOUNTERS[zoneId]);
        const here = zoneId === ATLAS.zoneId ? getZone(zoneId) : null, key = here ? here.atlasStages : zoneId;
        // oneBoss: the stages of an endgame fight are bodies of one boss, so its intro greets the first body.
        return key && STORY_ENDGAME_ENCOUNTERS[key] ? storyAt(key, { boss: STORY_ENDGAME_ENCOUNTERS[key], oneBoss: true }) : null;
    }
    function runWatch(run) {
        if (!runs.has(run)) runs.set(run, { story: storyEncounter(zone), act: actOf(zone), seen: new Map(), left: undefined });
        return runs.get(run);
    }
    /** A fight that sends the hero on in the tick its boss falls (a season boss leaves no cleared map on screen): its fall
     * is told once the next map is up. */
    function watchPassedRun(run, now) {
        const passed = watchedRun && watchedRun !== run ? runs.get(watchedRun) : null;
        if (passed && passed.story && passed.story.boss && watchedRun.status === 'cleared') storyBossDown(passed, now);
        watchedRun = run;
    }
    function storyClassLore() {
        return STORY_CLASS_ORIGINS[game.selectedClassId] || null;
    }
    /** The room-stage story of the map, looked at a few times a second. Not while the class is being chosen (the game waits
     * then): the hero's lines would be taken in the default class's words. */
    function watchStory(now) {
        const run = actExplorationState.current(game);
        // A new map is looked at at once: its greeting holds the hero before the first step.
        if (now - watchedAt < LINE.watchMs && run === watchedRun) return;
        watchedAt = now;
        if (!game.heroSelectionInitialized || isLoopHeroSelectOpen()) return;
        watchPassedRun(run, now);
        const watch = run ? runWatch(run) : null;
        if (!watch || !watch.story || !actExplorationDoors.stageMap(run)) return;
        place = watch.story.place;
        watchStoryRooms(run, watch.story, now);
        watchStoryGate(run, watch, now);
        watchStoryBoss(run, watch, now);
    }
    function watchStoryRooms(run, story, now) {
        const room = actExplorationDoors.room(run), stele = story.stele;
        if (room && room.role === 'entry') watchWake(now);
        if (room && inGuideRoom(run)) watchEntryRoom(story, now, run);
        if (room && room.role === 'optional' && stele && !stele.afterClear) queueStoryLine({ key: 'stele', who: 'stele', speaker: stele.title, text: stele.bark, tone: 'cyan' }, now);
    }
    /** The guide's line for this loop (docs/story-bible.md section 9): the first meeting in loop 1, the line for the hero's class
     * in even loops, the line that remembers the hero (loopBark) in odd loops from 3 on. */
    function npcLine(npc) {
        const loop = game.season || 1, byClass = (npc.classBarks || {})[game.selectedClassId];
        if (loop === 1) return npc.bark;
        return loop % 2 === 0 ? byClass || npc.loopBark || npc.bark : npc.loopBark || byClass || npc.bark;
    }
    /** The guide of the entry room's lines: act 1's guide stands there only in loop 1 (2026-10-15 사용자: after a loop the first room has no
     * Haken, as there is no fall to wake from). */
    const guideHere = story => (story.npc && !(actOf(zone)?.order === 1 && (game.season || 1) > 1) ? story.npc : null);
    /** ...so from loop 2 act 1's entry lines (loopBark, classBarks) are the hero's own, said on getting up in the empty first room
     * (docs/story-bible.md 5.2 and 5.3). */
    function queueHeroMuse(story, lore, now) {
        if (lore && story.npc && actOf(zone)?.order === 1 && (game.season || 1) > 1) queueStoryLine({ key: 'npc', who: 'hero', speaker: lore.label, text: npcLine(story.npc), tone: 'gold' }, now);
    }
    /** The hero's first words, in loop 1's act 1 entry room. */
    /** The first start's hero lies in the entry room until pressed (js/opening-journey-ui.js): no lines meanwhile, nor under the intro
     * (the intro starts a tick after the class pick). */
    const hushed = () => typeof openingJourney === 'object' && openingJourney.hushes();
    const firstAct = () => actOf(zone)?.order === 1 && (game.season || 1) === 1;
    /** Loop 1's act 1: the hero's first words on getting up in the entry room (wakeLine). */
    function watchWake(now) {
        const lore = storyClassLore();
        if (!hushed() && firstAct() && lore) queueStoryLine({ key: 'wake', who: 'hero', speaker: lore.label, text: lore.wakeLine, tone: 'gold' }, now);
    }
    /** ...and its words on seeing the guide struck (spotLine), in the room where that happens (js/combat.js starterRescueRoom). */
    function queueSpotLine(lore, run, now) {
        if (firstAct() && lore && run.packs.some(pack => pack.rescue)) queueStoryLine({ key: 'spot', who: 'hero', speaker: lore.label, text: lore.spotLine, tone: 'gold' }, now);
    }
    /** The monster striking the guide in act 1 still stands (js/combat.js createStarterRescuePack). */
    const rescuing = run => run.packs.some(pack => pack.rescue && pack.aliveIds.length > 0);
    /** The room where the map's guide stands and its first lines are said: the entry room, or in loop 1's first start the room behind
     * it where the guide is struck (js/combat.js starterRescueRoom; saves from before kept it in the entry room). */
    function guideRoom(run, map) {
        const pack = run.packs.find(row => row.rescue);
        return (pack && map.rooms.find(room => room.id === pack.roomId)) || map.entry;
    }
    const inGuideRoom = run => { const map = actExplorationDoors.stageMap(run), room = actExplorationDoors.room(run); return !!map && !!room && room === guideRoom(run, map); };
    /** The guide's room (guideRoom): the guide speaks and, after its first-meeting line (loop 1), the hero answers in its class's
     * words (classReplies are written to that line; from loop 2 the guide speaks other lines, 2026-10-15). While monsters strike
     * the guide (rescue) only the hero speaks: the guide's turn comes once they fall. */
    function watchEntryRoom(story, now, run) {
        if (hushed()) return;
        const lore = storyClassLore(), npc = guideHere(story);
        queueSpotLine(lore, run, now);
        queueHeroMuse(story, lore, now);
        if (!npc || rescuing(run)) return;
        queueStoryLine({ key: 'npc', who: 'npc', speaker: npc.name, text: npcLine(npc), tone: npc.tone }, now);
        const reply = lore && (game.season || 1) === 1 ? (npc.classReplies || {})[game.selectedClassId] : null;
        if (reply) queueStoryLine({ key: 'reply', who: 'hero', speaker: lore.label, text: reply, tone: 'gold' }, now);
    }
    const greets = row => !!row && GREET.keys.has(row.key) && row.zone === zone;
    /** The run whose entry room greets the hero now: an active map with the hero in its entry room and no move command given
     * meanwhile (a command waives the greeting for the run). */
    function greetingRun() {
        const run = actExplorationState.current(game), watch = run ? runs.get(run) : null;
        if (!watch || run.status !== 'active' || watch.waived) return null;
        if (run.destination) { watch.waived = true; return null; }
        return inGuideRoom(run) ? run : null;
    }
    const ends = row => !!row && CARRY.has(row.key) && row.zone === zone;
    /** A cleared map still on screen (its boss fell, the departure waits) with no move command given. */
    function endingRun() {
        const run = actExplorationState.current(game);
        return run && run.status === 'cleared' && !run.destination ? run : null;
    }
    /** Whether the game holds for the story this frame: the entry room's greeting, or a cleared map's ending (the boss's fall and
     * the hero's words for it, 2026-10-15: they spilled into the next act's entry and kept the hero standing there for ~20 s),
     * waits or plays, and the hold has lasted less than GREET.maxMs of battlefield time. Behind a window (time not counted) it holds
     * only when windows pause the game: a game set to run behind windows walks on, and the lines play where the hero is once the
     * window closes. waited: ms since the last frame. */
    function holdsGreeting(waited) {
        const greeting = (greets(line) || queue.some(greets)) && !!greetingRun();
        const waits = greeting || ((ends(line) || queue.some(ends)) && !!endingRun());
        if (!waits) { greetSpent = 0; return false; }
        if (covered) return !!game.settings.pauseGameOnOverlay && greetSpent < GREET.maxMs;
        greetSpent += waited;
        return greetSpent < GREET.maxMs;
    }

    // The NPC of the entry room stands there when the stage has its picture (data/stage-view.js STAGE_NPC_ART): in a story act or
    // trial the NPC of its lines (none on the endgame content maps). Its idle frames from the art, its name
    // over it (with a mark while it has an unlock to offer), its line in a bubble over the name. Pressing it opens its window
    // (npcAt, read by js/ui.js; js/content-progression-ui.js openNpc). It takes no part in the fight.
    const NPC_MARK_MS = 1000;        // how often the mark asks whether the NPC has an unlock to offer
    const npcSheets = new Map();     // picture id: the idle strip, decoded off the main thread (js/canvas-stage-pictures.js)
    let npcHit = null, npcMark = { at: -Infinity, id: null, on: false };
    const npcRows = () => (typeof STORY_NPCS === 'object' ? Object.values(STORY_NPCS) : []);
    /** The colour the NPC speaks in (its tone in the act and trial lines). */
    function npcTone(name) {
        const lines = [...Object.values(STORY_ACT_ENCOUNTERS), ...Object.values(STORY_TRIAL_ENCOUNTERS)].find(row => row.npc && row.npc.name === name);
        return lines ? lines.npc.tone : 'gold';
    }
    /** The run's NPC, found once: { id, name, title, tone, line } or null. */
    function runNpc(watch) {
        if (watch.npc !== undefined) return watch.npc;
        const said = watch.story && guideHere(watch.story), row = said ? npcRows().find(npc => npc.name === said.name) : null;
        watch.npc = row ? { id: row.id, name: row.name, title: row.title, tone: npcTone(row.name), line: npcLine(said) } : null;
        return watch.npc;
    }
    /** Adds the NPC to the battlefield's actors while the hero is in the entry room (js/canvas-act-exploration.js appendScenery),
     * so it stands in depth with the hero and the monsters. It stands on the entry room's post (js/act-exploration-rooms.js npcPost:
     * the back row, two cells from where the hero starts), where act 1's first monster strikes it. */
    function appendNpc(actors, state) {
        const run = stageView.enabled() ? actExplorationState.current(game) : null, watch = run ? runs.get(run) : null;
        const npc = watch ? runNpc(watch) : null, map = npc ? actExplorationDoors.stageMap(run) : null;
        if (!map || !inGuideRoom(run)) return;
        watch.npcCell = watch.npcCell || actExplorationRooms.npcPost(guideRoom(run, map));
        const point = state.gridProj.cellToScreen(watch.npcCell.gx, watch.npcCell.gy);
        actors.push({ kind: 'scenery', id: -3, x: point.x, y: point.y + state.gridProj.actorGroundOffsetY, npc, talkable: !rescuing(run) });
    }
    function npcSheet(id) {
        if (!npcSheets.has(id)) npcSheets.set(id, stagePictures.openPicture(`${STAGE_NPC_ART.path}${id}-idle.png`));
        return npcSheets.get(id);
    }
    /** The idle frame shown now: the art's own frame times, looping. */
    function npcFrame(now) {
        const times = STAGE_NPC_ART.frameMs;
        let left = now % times.reduce((sum, ms) => sum + ms, 0), index = 0;
        while (left >= times[index]) left -= times[index++];
        return index;
    }
    /** Whether the NPC has an unlock to offer now, asked once a second. */
    function npcOffers(npc, now) {
        if (npcMark.id !== npc.id || now - npcMark.at > NPC_MARK_MS) npcMark = { at: now, id: npc.id, kind: contentUnlockUi.npcNews(npc) };
        return npcMark.kind;
    }
    function npcLabel(ctx, npc, x, y) {
        ctx.font = `13px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = TONES[npc.tone] || TONES.gold;
        ctx.strokeText(npc.name, x, y);
        ctx.fillText(npc.name, x, y);
    }
    /** The mark over the name in a dark square: a gold "!" for an unlock to offer, three pale dots for a keyword not yet heard
     * (js/content-progression-ui.js npcNews). */
    function npcOfferMark(ctx, x, y, kind) {
        const colour = kind === 'unlock' ? TONES.gold : '#d9cfb8';
        ctx.fillStyle = 'rgba(12,10,12,0.92)';
        ctx.fillRect(x - 8, y - 9, 16, 18);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 7.5, y - 8.5, 15, 17);
        ctx.fillStyle = colour;
        if (kind === 'unlock') ctx.fillText('!', x, y + 1);
        else for (let dot = -1; dot <= 1; dot++) ctx.fillRect(x + dot * 4 - 1, y + 2, 2, 2);
    }
    // A monster striking the NPC (act 1's first monster, js/combat.js strikeRescueTarget, battle fx 'npcStruck'): the NPC's frame
    // flashes white and a few sparks burst on it. The picture itself never moves (no code-made motion).
    const npcFlashes = new Map();    // "id:frame" → that idle frame painted white
    /** 1 just after a strike on the NPC, fading to 0 over the fx's duration; 0 when none is recent. */
    function npcStruck(now) {
        let share = 0;
        for (const fx of battleFx) {
            if (!fx || fx.type !== 'npcStruck' || !(now - fx.start < fx.duration) || now < fx.start) continue;
            share = Math.max(share, 1 - (now - fx.start) / fx.duration);
        }
        return share;
    }
    function npcFlashFrame(id, source, frame) {
        const key = `${id}:${frame}`, cell = STAGE_NPC_ART.cell;
        if (!npcFlashes.has(key)) {
            const canvas = document.createElement('canvas'), c = canvas.getContext('2d');
            canvas.width = canvas.height = cell;
            c.drawImage(source, frame * cell, 0, cell, cell, 0, 0, cell, cell);
            c.globalCompositeOperation = 'source-in';
            c.fillStyle = '#fff4df';
            c.fillRect(0, 0, cell, cell);
            npcFlashes.set(key, canvas);
        }
        return npcFlashes.get(key);
    }
    function npcSparks(ctx, x, y, dot, struck) {
        const spread = (1 - struck) * 14 * dot + 4 * dot, size = Math.max(2, Math.round(dot * 2));
        ctx.save();
        ctx.globalAlpha = struck;
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3 + 0.4;
            ctx.fillStyle = i % 2 ? '#ffd27a' : '#fff4df';
            ctx.fillRect(Math.round(x + Math.cos(angle) * spread), Math.round(y + Math.sin(angle) * spread), size, size);
        }
        ctx.restore();
    }
    /** The NPC facing the hero, its name over it in its colour (and the offer mark); remembers where it stands for a press. */
    function drawNpc(ctx, actor, state) {
        const art = STAGE_NPC_ART, sheet = npcSheet(actor.npc.id);
        if (!sheet.ready) return;
        const dot = stageActors.scaleFor(state.gridProj.tileW) * art.scale, cell = art.cell, top = Math.round(actor.y - (art.feet[1] - art.head) * dot);
        const frame = npcFrame(state.now), struck = npcStruck(state.now);
        stageRings.shadow(ctx, { x: actor.x, y: actor.y, dot }, 18, 0.34);
        ctx.save();
        if (state.playerPos.x < actor.x) { ctx.translate(actor.x * 2, 0); ctx.scale(-1, 1); }
        const at = { x: Math.round(actor.x - art.feet[0] * dot), y: Math.round(actor.y - art.feet[1] * dot), scale: dot };
        stageDots.blit(ctx, sheet.source, { x: frame * cell, y: 0, w: cell, h: cell }, at);
        if (struck > 0) {
            ctx.globalAlpha = 0.6 * struck;
            stageDots.blit(ctx, npcFlashFrame(actor.npc.id, sheet.source, frame), { x: 0, y: 0, w: cell, h: cell }, at);
        }
        ctx.restore();
        if (struck > 0) npcSparks(ctx, actor.x, Math.round((top + actor.y) / 2), dot, struck);
        ctx.save();
        npcLabel(ctx, actor.npc, actor.x, top);
        const marked = actor.talkable ? npcOffers(actor.npc, state.now) : '';
        if (marked) npcOfferMark(ctx, actor.x, top - 20, marked);
        ctx.restore();
        npcHead = { x: actor.x, y: top - (marked ? 32 : 12) };
        npcHit = actor.talkable ? { npc: actor.npc, at: Date.now(), x0: actor.x - 30 * dot, x1: actor.x + 30 * dot, y0: top - 30, y1: actor.y } : null;
    }
    /** The NPC drawn under a battlefield point (canvas CSS px) in the last frame, or null. */
    function npcAt(point) {
        const hit = npcHit && Date.now() - npcHit.at < LIVE_MS ? npcHit : null;
        return hit && point && point.x >= hit.x0 && point.x <= hit.x1 && point.y >= hit.y0 && point.y <= hit.y1 ? hit.npc : null;
    }
    /** The hero's line when the last elite sealing the boss gate falls. */
    function watchStoryGate(run, watch, now) {
        const left = actExplorationState.remainingElites(run), before = watch.left, lore = storyClassLore();
        watch.left = left;
        if (before > 0 && left === 0 && lore && firstGateOfLoop()) queueStoryLine({ key: 'elite', who: 'hero', speaker: lore.label, text: lore.eliteLine, tone: 'gold' }, now);
    }
    /** The hero's gate line once a loop (2026-10-15: one sentence for every class, said in all ten acts, became noise; the opened gate
     * shows itself on the stage). */
    function firstGateOfLoop() {
        const id = `${game.season || 1}:gate`;
        if (spoken.has(id)) return false;
        spoken.add(id);
        return true;
    }
    /** The boss of the last stage (act 4 fights two): the one the half and fall lines speak of, and an act's intro. */
    function finalStoryBoss(run) {
        const stages = run.packs.filter(pack => pack.stage !== null);
        const last = stages.reduce((top, pack) => (top && top.stage > pack.stage ? top : pack), null);
        return last ? game.enemies.find(enemy => enemy && enemy.isBoss && last.aliveIds.includes(enemy.id)) || null : null;
    }
    /** A boss this view has seen: its first sight and its name for the band. */
    /** ...and where it stands now (its middle cell, where a revival is drawn when it falls). */
    function sighted(watch, boss, now) {
        if (!watch.seen.has(boss.id)) watch.seen.set(boss.id, { at: now, id: boss.id, name: getEnemyDisplayName(boss) });
        const middle = hasGridCell(boss) ? getGridUnitCenter(boss) : null;
        return Object.assign(watch.seen.get(boss.id), middle ? { gx: middle.gx, gy: middle.gy } : {});
    }
    function watchStoryBoss(run, watch, now) {
        const lines = watch.story.boss;
        if (!lines) return;
        if (run.status === 'cleared') { storyBossDown(watch, now); return; }
        const last = finalStoryBoss(run), first = watch.story.oneBoss ? game.enemies.find(enemy => enemy && enemy.isBoss) : last;
        if (!first) return;
        const seen = sighted(watch, first, now), lastSeen = last ? sighted(watch, last, now) : null;
        if (now - seen.at < LINE.introDelayMs) return;
        queueBossLine('intro', seen, lines.intro, now);
        if (last && last.hp <= last.maxHp * LINE.halfAt) queueBossLine('half', lastSeen, lines.half, now);
    }
    /** The fall, then the hero's words for the act; an intro or half line not yet shown is past. Nothing when this view never
     * saw the boss (loaded into a cleared map). */
    function storyBossDown(watch, now) {
        const seen = [...watch.seen.values()].pop(), lore = storyClassLore(), act = watch.act;
        if (!seen) return;
        place = watch.story.place;
        dropStoryLines(entry => entry.key === 'intro' || entry.key === 'half');
        const revive = act && STAGE_BOSS_REVIVAL.bosses.includes(act.bossId) && Number.isFinite(seen.gx) ? { gx: seen.gx, gy: seen.gy, name: seen.name } : null;
        queueBossLine('defeat', seen, watch.story.boss.defeat, now, revive);
        if (lore && act) queueStoryLine({ key: 'class', who: 'hero', speaker: lore.label, text: lore.bossLines[act.order], tone: 'violet' }, now);
        // An account of the completed fight must follow its last words, never precede it in an optional room.
        const stele = watch.story.stele;
        if (stele && stele.afterClear) queueStoryLine({ key: 'epilogue', who: 'stele', speaker: stele.title, text: stele.bark, tone: 'cyan' }, now);
    }
    function opacity(age, showMs) {
        return Math.max(0, Math.min(1, age / FADE_IN_MS, (showMs - age) / FADE_OUT_MS));
    }
    function band(ctx, view) {
        const shade = ctx.createLinearGradient(0, view.top - view.size * 1.4, 0, view.top + view.size * 1.8);
        shade.addColorStop(0, 'rgba(6,8,10,0)');
        shade.addColorStop(0.5, 'rgba(6,8,10,0.62)');
        shade.addColorStop(1, 'rgba(6,8,10,0)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, view.top - view.size * 1.4, view.width, view.size * 3.2);
    }
    function kicker(ctx, view) {
        const half = view.size * 2.4;
        ctx.font = `${Math.round(view.size * 0.5)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = card.style.kickerColour;
        ctx.fillText(card.kicker, view.x, view.top - view.size * 0.55);
        const gap = ctx.measureText(card.kicker).width / 2 + view.size * 0.5;
        ctx.fillRect(Math.round(view.x - gap - half), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
        ctx.fillRect(Math.round(view.x + gap), Math.round(view.top - view.size * 0.72), Math.round(half), 1);
    }
    function title(ctx, view) {
        ctx.font = `${view.size}px ${STORY_FONT}`;
        ctx.lineWidth = Math.max(3, view.size * 0.16);
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.strokeText(card.title, view.x, view.top + view.size * 0.5);
        ctx.fillStyle = card.style.titleColour;
        ctx.fillText(card.title, view.x, view.top + view.size * 0.5);
    }
    function drawTitleCard(ctx, width, height, now) {
        const size = Math.round(Math.max(20, Math.min(34, Math.min(width, height) * 0.04)));
        const view = { x: Math.round(width / 2), top: Math.round(height * 0.2), size, width };
        ctx.save();
        ctx.globalAlpha = opacity(now - card.startAt, card.style.showMs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        band(ctx, view);
        kicker(ctx, view);
        title(ctx, view);
        ctx.restore();
    }
    /** Rows of a line no wider than width, broken between words. */
    function storyLineRows(ctx, text, width) {
        const rows = [];
        for (const word of text.split(' ')) {
            const last = rows.length ? `${rows[rows.length - 1]} ${word}` : null;
            if (last !== null && ctx.measureText(last).width <= width) rows[rows.length - 1] = last;
            else rows.push(word);
        }
        return rows;
    }
    /** The rows and widest row of the current line for this width, measured once. */
    function storyLineLayout(ctx, width) {
        if (line.layoutFor !== width) {
            const rows = storyLineRows(ctx, line.text, width);
            line.layout = { rows, widest: Math.ceil(Math.max(...rows.map(row => ctx.measureText(row).width))) };
            line.layoutFor = width;
        }
        return line.layout;
    }
    /** Where the speaker stands this frame: just above the hero's life bar, or above the boss's bar. Null for a voice with
     * no body on screen (guide, inscription, narration, a boss already gone): those take the band. */
    function storyAnchor(scene) {
        if (line.who === 'hero') return { x: scene.light.x, y: (getHeroHeadY(scene.now) ?? scene.light.y - 82 * HERO_SIZE_SCALE) - 18 };
        if (line.who === 'npc') return npcHead;
        if (line.who !== 'boss') return null;
        const entry = scene.layout.find(row => row.drawn && row.enemy.id === line.bossId);
        return entry ? { x: entry.x, y: entry.y - getEnemyFieldBarLift(entry.enemy) - 10 } : null;
    }
    function storyBubbleFrame(ctx, box, tipX) {
        ctx.fillStyle = 'rgba(12,10,12,0.92)';
        ctx.strokeStyle = line.colour;
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
    /** A speech bubble over the speaker, its tail on the speaker's head, kept inside the battlefield. */
    function drawStoryBubble(ctx, view, anchor) {
        const pad = Math.round(view.size * 0.6), rowH = Math.round(view.size * 1.45);
        const { rows, widest } = storyLineLayout(ctx, Math.min(view.width - 32, view.size * LINE.bubbleChars));
        const w = widest + pad * 2, h = rows.length * rowH + pad * 2;
        const x = Math.round(Math.min(Math.max(8, anchor.x - w / 2), view.width - w - 8)), y = Math.round(Math.max(8, anchor.y - h - 7));
        storyBubbleFrame(ctx, { x, y, w, h }, Math.round(Math.min(Math.max(x + 12, anchor.x), x + w - 12)));
        ctx.fillStyle = '#efe7d6';
        rows.forEach((row, index) => ctx.fillText(row, x + w / 2, y + pad + rowH * (index + 0.5)));
    }
    /** A line with no body to speak from: the band where the card stands, the speaker above unless it is narration. */
    function drawStoryBand(ctx, view) {
        const rows = storyLineLayout(ctx, Math.min(view.width - view.size * 3, view.size * 34)).rows.slice(0, LINE.maxRows);
        const top = view.top - view.size * 2, height = view.size * (rows.length * 1.5 + 3);
        const shade = ctx.createLinearGradient(0, top, 0, top + height);
        [[0, 0], [0.25, 0.66], [0.75, 0.66], [1, 0]].forEach(([at, alpha]) => shade.addColorStop(at, `rgba(6,8,10,${alpha})`));
        ctx.fillStyle = shade;
        ctx.fillRect(0, top, view.width, height);
        if (line.who !== 'narration') storyBandSpeaker(ctx, view);
        ctx.font = `${view.size}px ${STORY_FONT}`;
        ctx.lineWidth = Math.max(3, view.size * 0.2);
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = line.who === 'narration' ? '#d9cdb0' : '#efe7d6';
        rows.forEach((row, index) => {
            const y = view.top + view.size * (0.9 + index * 1.5);
            ctx.strokeText(row, view.x, y);
            ctx.fillText(row, view.x, y);
        });
    }
    function storyBandSpeaker(ctx, view) {
        ctx.font = `${Math.round(view.size * 0.8)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = line.colour;
        ctx.fillText(line.speaker, view.x, view.top - view.size * 0.6);
    }
    function drawStoryLine(ctx, scene) {
        if (line.revive) bossRevive.draw(ctx, scene, line.revive, scene.now - line.startAt, line.showMs);
        const size = Math.round(Math.max(13, Math.min(18, Math.min(scene.width, scene.height) * 0.022)));
        const view = { x: Math.round(scene.width / 2), top: Math.round(scene.height * 0.2), size, width: scene.width };
        const anchor = storyAnchor(scene);
        ctx.save();
        ctx.globalAlpha = opacity(scene.now - line.startAt, line.showMs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size}px ${STORY_FONT}`;
        if (anchor) drawStoryBubble(ctx, view, anchor);
        else drawStoryBand(ctx, view);
        ctx.restore();
    }
    /** Called once per battlefield frame, after the life bars and the damage numbers. scene: the battlefield's frame scene
     * (width, height, now, light = the hero's place, layout = the drawn enemies). */
    function draw(ctx, scene) {
        const waited = scene.now - (trackedAt || scene.now);
        frameAt = Date.now();
        track(scene.now);
        if (stageView.enabled()) watchStory(scene.now);
        holding = stageView.enabled() && holdsGreeting(waited);
        if (card) drawTitleCard(ctx, scene.width, scene.height, scene.now);
        else if (line) drawStoryLine(ctx, scene);
        npcHead = null; // the guide's head is placed again by the next frame's actor layer, if it stands there
    }
    /** True while a title card is on screen or about to start — guide cards wait for it (js/tutorial-ui.js). It runs on
     * the battlefield's clock, so this asks the battlefield: a hidden or stalled view never holds the cards back. */
    function busy() { return !!(card || pending) && Date.now() - frameAt < LIVE_MS; }
    /** True while the hero stands for the entry room's greeting: js/ui.js pauses the game for it. Only while the battlefield
     * draws, like busy. */
    function greeting() {
        const opening = typeof openingJourney === 'object' && openingJourney.holds();
        return (holding || opening) && Date.now() - frameAt < LIVE_MS;
    }
    /** True while a story line's bubble is on screen (the first start's lesson line steps aside for it, js/opening-journey-ui.js). */
    function speaking() { return !!line && Date.now() - frameAt < LIVE_MS; }
    if (typeof document === 'object' && document.fonts?.load) document.fonts.load("20px 'Galmuri14'").catch(() => {});
    return Object.freeze({ draw, busy, greeting, speaking, appendNpc, drawNpc, npcAt });
})();
safeExposeGlobals({ actTitleCard });
