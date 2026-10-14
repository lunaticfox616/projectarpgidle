/** Act title card over the upper battlefield, like an area name in an ARPG: entering (or loading into) a story act
 * shows "액트 N" and the act name. It waits while a story or tutorial popup is open, so it is not spent behind it.
 * Bosses keep the battlefield's own banner (drawBossAnnouncement).
 * On the room stage it also plays the story's lines (data/story-journal.js), one at a time after the card: the hero's
 * words and a boss's own words (“…”) in a speech bubble over the one speaking, so it is clear who talks; the guide of
 * the entry room, a side room's inscription and the narration of a boss fight (「…」) in a band where the card stands.
 * Acts and trials speak in their rooms, the endgame boss fights (STORY_ENDGAME_ENCOUNTERS) at the boss.
 * The guide of the entry room stands there when the stage has a picture for it (data/stage-view.js STAGE_STORY_NPCS) and
 * speaks in a bubble too; while the entry room's greeting waits or plays, the game pauses as for a story popup (greeting,
 * read by js/ui.js), so the hero stands and listens instead of running on.
 * Read-only: it watches game state; nothing here touches combat state.
 */
const actTitleCard = (() => {
    const ACT = Object.freeze({ showMs: 3600, kickerColour: '#e0c27e', titleColour: '#e9e2cf' });
    const FADE_IN_MS = 500;
    const FADE_OUT_MS = 800;
    const LIVE_MS = 400; // the battlefield drew within this long: it is on screen and running
    // A line shows for baseMs plus perCharMs a character (at most maxMs). Time behind a window (story popup, act reward,
    // dialog) does not count; a line still waiting after staleMs on screen, or queued on another map, is dropped, except the
    // boss's fall and the hero's words for it (CARRY): the reward window opens over them and the next act may begin first.
    // The boss intro waits introDelayMs from the boss's first sight, past its name banner (BOSS_BANNER_MS, 2.6 s,
    // js/canvas-battlefield.js). Lines wrap between words: bubbles at bubbleChars characters a row, bands at most maxRows rows.
    const LINE = Object.freeze({ baseMs: 1800, perCharMs: 65, maxMs: 6500, staleMs: 15000, watchMs: 200, introDelayMs: 3200, halfAt: 0.55, maxRows: 3, bubbleChars: 19 });
    const CARRY = new Set(['defeat', 'class']);
    // The entry room's greeting: the hero's first words and the guide's line. The hero stands for it at most maxMs (the card,
    // lines carried from the last map and the greeting itself fit well within it); a move command ends the wait at once.
    const GREET = Object.freeze({ keys: new Set(['wake', 'npc']), maxMs: 25000 });
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
    function trackStoryLine(now) {
        const waited = now - (trackedAt || now);
        trackedAt = now;
        if (line && now - line.startAt >= line.showMs) line = null;
        covered = storyCovered();
        if (covered) { queue.forEach(entry => { entry.at += waited; }); return; }
        // The greeting is not stale while it waits: the hero stands for it.
        dropStoryLines(entry => (entry.zone !== zone && !CARRY.has(entry.key)) || (now - entry.at > LINE.staleMs && !GREET.keys.has(entry.key)));
        if (line || card || pending || !queue.length) return;
        line = { ...queue.shift(), startAt: now };
    }
    /** Queues a line once per loop and place (the act, trial or endgame boss whose story it is). row: key (wake, npc, stele,
     * intro, half, defeat, class, elite), who (hero, boss, npc, stele, narration), speaker, text, tone, and for a boss its id. */
    function queueStoryLine(row, now) {
        const id = `${game.season || 1}:${place}:${row.key}`;
        if (!row.text || spoken.has(id)) return;
        spoken.add(id);
        const showMs = Math.min(LINE.maxMs, LINE.baseMs + [...row.text].length * LINE.perCharMs);
        queue.push({ ...row, zone, colour: TONES[row.tone] || TONES.gold, at: now, showMs });
    }
    /** A boss line in “…” is the boss speaking; in 「…」 it is narration of the fight. */
    function queueBossLine(key, seen, text, now) {
        const who = text && text.startsWith('“') ? 'boss' : 'narration';
        queueStoryLine({ key, who, speaker: seen.name, text, tone: 'crimson', bossId: seen.id }, now);
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
        if (room && room.role === 'entry') watchEntryRoom(story, now);
        if (room && room.role === 'optional' && stele) queueStoryLine({ key: 'stele', who: 'stele', speaker: stele.title, text: stele.bark, tone: 'cyan' }, now);
    }
    /** The entry room: in act 1 the hero wakes first (wakeLine), then the guide speaks, from loop 2 on with the line that
     * remembers the hero (loopBark). */
    function watchEntryRoom(story, now) {
        const lore = storyClassLore(), act = actOf(zone), npc = story.npc;
        if (act && act.order === 1 && lore) queueStoryLine({ key: 'wake', who: 'hero', speaker: lore.label, text: lore.wakeLine, tone: 'gold' }, now);
        if (!npc) return;
        const text = (game.season || 1) >= 2 && npc.loopBark ? npc.loopBark : npc.bark;
        queueStoryLine({ key: 'npc', who: 'npc', speaker: npc.name, text, tone: npc.tone }, now);
    }
    const greets = row => !!row && GREET.keys.has(row.key) && row.zone === zone;
    /** The run whose entry room greets the hero now: an active map with the hero in its entry room and no move command given
     * meanwhile (a command waives the greeting for the run). */
    function greetingRun() {
        const run = actExplorationState.current(game), watch = run ? runs.get(run) : null;
        if (!watch || run.status !== 'active' || watch.waived) return null;
        if (run.destination) { watch.waived = true; return null; }
        const room = actExplorationDoors.room(run);
        return room && room.role === 'entry' ? run : null;
    }
    /** Whether the hero stands for the greeting this frame: it waits or plays, and has held the hero less than GREET.maxMs of
     * battlefield time. Behind a window (time not counted) it holds only when windows pause the game: a game set to run behind
     * windows walks on, and its greeting plays where the hero is once the window closes. waited: ms since the last frame. */
    function holdsGreeting(waited) {
        const waits = (greets(line) || queue.some(greets)) && !!greetingRun();
        if (!waits) { greetSpent = 0; return false; }
        if (covered) return !!game.settings.pauseGameOnOverlay && greetSpent < GREET.maxMs;
        greetSpent += waited;
        return greetSpent < GREET.maxMs;
    }

    // The guide stands in the entry room when the stage has a picture for it: the hero's friendly rim instead of a monster's
    // red one, a name tag instead of a life bar, and its line in a bubble over it.
    const npcFigures = new Map(); // picture id: the figure the roster draws (it keeps the facing and the drawn height by it)
    /** The stage picture of this map's guide (data/stage-view.js STAGE_STORY_NPCS, by the last word of its name), or null. */
    function npcLook(story) {
        const looks = typeof STAGE_STORY_NPCS === 'object' ? STAGE_STORY_NPCS : {};
        return story && story.npc ? looks[String(story.npc.name).split(/[\s,]+/).pop()] || null : null;
    }
    /** The back row of the entry room, two cells from where the hero first stood there, into the room. */
    function npcCell(room, hero) {
        const from = Math.round(hero.gx), side = from + 2 <= room.x1 ? 2 : -2;
        return { gx: Math.max(room.x0, Math.min(room.x1, from + side)), gy: room.y0 };
    }
    /** Adds the guide to the battlefield's actors while the hero is in the entry room (js/canvas-act-exploration.js
     * appendScenery), so it stands in depth with the hero and the monsters. */
    function appendNpc(actors, state) {
        const run = stageView.enabled() ? actExplorationState.current(game) : null, watch = run ? runs.get(run) : null;
        const look = watch ? npcLook(watch.story) : null, map = look ? actExplorationDoors.stageMap(run) : null;
        if (!map || actExplorationDoors.room(run) !== map.entry) return;
        watch.npcCell = watch.npcCell || npcCell(map.entry, game.gridPlayer);
        const point = state.gridProj.cellToScreen(watch.npcCell.gx, watch.npcCell.gy), npc = watch.story.npc;
        actors.push({ kind: 'scenery', id: -3, x: point.x, y: point.y + state.gridProj.actorGroundOffsetY, npc: { look, name: npc.name, tone: npc.tone } });
    }
    function npcFigure(look) {
        if (!npcFigures.has(look.look)) npcFigures.set(look.look, { id: -3, bossAssetKey: look.look, isBoss: false });
        return npcFigures.get(look.look);
    }
    /** The guide facing the hero, then its name over it in its colour; the bubble of its line hangs over the name. */
    function drawNpc(ctx, actor, state) {
        const npc = actor.npc, figure = npcFigure(npc.look), facing = state.playerPos.x < actor.x ? 'west' : 'east';
        const pose = { x: actor.x, y: actor.y, tile: state.gridProj.tileW, now: state.now, facing, rim: BATTLE_SPRITE_OUTLINES.hero, spawnScale: npc.look.scale || 1 };
        if (!stageRoster.draw(ctx, figure, pose)) return;
        const top = actor.y - getEnemyFieldBarLift(figure);
        npcHead = { x: actor.x, y: top - 12 };
        ctx.save();
        ctx.font = `13px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = TONES[npc.tone] || TONES.gold;
        ctx.strokeText(npc.name, actor.x, top);
        ctx.fillText(npc.name, actor.x, top);
        ctx.restore();
    }
    /** The hero's line when the last elite sealing the boss gate falls. */
    function watchStoryGate(run, watch, now) {
        const left = actExplorationState.remainingElites(run), before = watch.left, lore = storyClassLore();
        watch.left = left;
        if (before > 0 && left === 0 && lore) queueStoryLine({ key: 'elite', who: 'hero', speaker: lore.label, text: lore.eliteLine, tone: 'gold' }, now);
    }
    /** The boss of the last stage (act 4 fights two): the one the half and fall lines speak of, and an act's intro. */
    function finalStoryBoss(run) {
        const stages = run.packs.filter(pack => pack.stage !== null);
        const last = stages.reduce((top, pack) => (top && top.stage > pack.stage ? top : pack), null);
        return last ? game.enemies.find(enemy => enemy && enemy.isBoss && last.aliveIds.includes(enemy.id)) || null : null;
    }
    /** A boss this view has seen: its first sight and its name for the band. */
    function sighted(watch, boss, now) {
        if (!watch.seen.has(boss.id)) watch.seen.set(boss.id, { at: now, id: boss.id, name: getEnemyDisplayName(boss) });
        return watch.seen.get(boss.id);
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
        queueBossLine('defeat', seen, watch.story.boss.defeat, now);
        if (lore && act) queueStoryLine({ key: 'class', who: 'hero', speaker: lore.label, text: lore.bossLines[act.order], tone: 'violet' }, now);
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
    function greeting() { return holding && Date.now() - frameAt < LIVE_MS; }
    if (typeof document === 'object' && document.fonts?.load) document.fonts.load("20px 'Galmuri14'").catch(() => {});
    return Object.freeze({ draw, busy, greeting, appendNpc, drawNpc });
})();
safeExposeGlobals({ actTitleCard });
