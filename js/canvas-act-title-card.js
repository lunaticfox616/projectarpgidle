/** Act title card over the upper battlefield, like an area name in an ARPG: entering (or loading into) a story act
 * shows "액트 N" and the act name. It waits while a story or tutorial popup is open, so it is not spent behind it.
 * Bosses keep the battlefield's own banner (drawBossAnnouncement).
 * On the room stage the same place carries the story's spoken lines (data/story-journal.js): the act's or trial's
 * guide in the entry room, the inscription of a side room, the final boss's intro, half-life and fall, and the hero's
 * own words when the gate elites and the act boss fall. One line at a time, after the card.
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
    // js/canvas-battlefield.js). Lines wrap between words, at most maxRows rows.
    const LINE = Object.freeze({ baseMs: 1800, perCharMs: 65, maxMs: 6500, staleMs: 15000, watchMs: 200, introDelayMs: 3200, halfAt: 0.55, maxRows: 3 });
    const CARRY = new Set(['defeat', 'class']);
    const TONES = Object.freeze({ gold: '#e0c27e', violet: '#c9a4f2', cyan: '#8fe3d6', crimson: '#ef9a92' });
    let zone, pending = null, card = null, frameAt = 0, line = null, watchedAt = 0, trackedAt = 0;
    const queue = [], spoken = new Set(), bossSeen = new Map(), gateLeft = new WeakMap();

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
        bossSeen.clear();
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
        if (storyCovered()) { queue.forEach(entry => { entry.at += waited; }); return; }
        dropStoryLines(entry => (entry.zone !== zone && !CARRY.has(entry.key)) || now - entry.at > LINE.staleMs);
        if (line || card || pending || !queue.length) return;
        line = { ...queue.shift(), startAt: now };
    }
    /** Queues a line once per loop and map; key names the moment (npc, stele, intro, half, defeat, class, elite). */
    function queueStoryLine(key, speaker, text, tone, now) {
        const id = `${game.season || 1}:${zone}:${key}`;
        if (!text || spoken.has(id)) return;
        spoken.add(id);
        const showMs = Math.min(LINE.maxMs, LINE.baseMs + [...text].length * LINE.perCharMs);
        queue.push({ key, zone, speaker, text, colour: TONES[tone] || TONES.gold, at: now, showMs });
    }
    function storyEncounter(zoneId) {
        const act = actOf(zoneId);
        if (act) return STORY_ACT_ENCOUNTERS[act.order] || null;
        return typeof zoneId === 'string' ? STORY_TRIAL_ENCOUNTERS[zoneId] || null : null;
    }
    function storyClassLore() {
        return STORY_CLASS_ORIGINS[game.selectedClassId] || null;
    }
    /** The room-stage story of the map, looked at a few times a second. */
    function watchStory(now) {
        if (now - watchedAt < LINE.watchMs) return;
        watchedAt = now;
        const run = actExplorationState.current(game), story = storyEncounter(zone);
        if (!story || !run || !actExplorationDoors.stageMap(run)) return;
        watchStoryRooms(run, story, now);
        watchStoryGate(run, now);
        watchStoryBoss(run, story, now);
    }
    function watchStoryRooms(run, story, now) {
        const room = actExplorationDoors.room(run);
        if (room && room.role === 'entry' && story.npc) queueStoryLine('npc', story.npc.name, story.npc.bark, story.npc.tone, now);
        if (room && room.role === 'optional' && story.stele) queueStoryLine('stele', story.stele.title, story.stele.bark, 'cyan', now);
    }
    /** The hero's line when the last elite sealing the boss gate falls. */
    function watchStoryGate(run, now) {
        const left = actExplorationState.remainingElites(run), before = gateLeft.get(run), lore = storyClassLore();
        gateLeft.set(run, left);
        if (before > 0 && left === 0 && lore) queueStoryLine('elite', lore.label, lore.eliteLine, 'gold', now);
    }
    /** The boss of the last stage (act 4 fights two): the one the intro, half and fall lines speak of. */
    function finalStoryBoss(run) {
        const stages = run.packs.filter(pack => pack.stage !== null);
        const last = stages.reduce((top, pack) => (top && top.stage > pack.stage ? top : pack), null);
        return last ? game.enemies.find(enemy => enemy && enemy.isBoss && last.aliveIds.includes(enemy.id)) || null : null;
    }
    function watchStoryBoss(run, story, now) {
        if (!story.boss) return;
        if (run.status === 'cleared') { storyBossDown(story, now); return; }
        const boss = finalStoryBoss(run);
        if (!boss) return;
        if (!bossSeen.has(boss.id)) bossSeen.set(boss.id, { at: now, name: getEnemyDisplayName(boss) });
        const seen = bossSeen.get(boss.id);
        if (now - seen.at < LINE.introDelayMs) return;
        queueStoryLine('intro', seen.name, story.boss.intro, 'crimson', now);
        if (boss.hp <= boss.maxHp * LINE.halfAt) queueStoryLine('half', seen.name, story.boss.half, 'crimson', now);
    }
    /** The fall, then the hero's words for the act; an intro or half line not yet shown is past. Nothing when this view never
     * saw the boss (loaded into a cleared map). */
    function storyBossDown(story, now) {
        const seen = [...bossSeen.values()].pop(), lore = storyClassLore(), act = actOf(zone);
        if (!seen) return;
        dropStoryLines(entry => entry.key === 'intro' || entry.key === 'half');
        queueStoryLine('defeat', seen.name, story.boss.defeat, 'crimson', now);
        if (lore && act) queueStoryLine('class', lore.label, lore.bossLines[act.order], 'violet', now);
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
        ctx.font = `${view.size}px 'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif`;
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
    /** Rows of a line no wider than width, broken between words (measured once per line and width). */
    function storyLineRows(ctx, text, width) {
        const rows = [];
        for (const word of text.split(' ')) {
            const last = rows.length ? `${rows[rows.length - 1]} ${word}` : null;
            if (last !== null && ctx.measureText(last).width <= width) rows[rows.length - 1] = last;
            else rows.push(word);
        }
        return rows.slice(0, LINE.maxRows);
    }
    function storyLineBand(ctx, view, count) {
        const top = view.top - view.size * 2, height = view.size * (count * 1.5 + 3);
        const shade = ctx.createLinearGradient(0, top, 0, top + height);
        shade.addColorStop(0, 'rgba(6,8,10,0)');
        shade.addColorStop(0.25, 'rgba(6,8,10,0.66)');
        shade.addColorStop(0.75, 'rgba(6,8,10,0.66)');
        shade.addColorStop(1, 'rgba(6,8,10,0)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, top, view.width, height);
    }
    function storyLineText(ctx, view, rows) {
        ctx.font = `${Math.round(view.size * 0.8)}px 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.fillStyle = line.colour;
        ctx.fillText(line.speaker, view.x, view.top - view.size * 0.6);
        ctx.font = `${view.size}px 'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        ctx.lineWidth = Math.max(3, view.size * 0.2);
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = '#efe7d6';
        rows.forEach((row, index) => {
            const y = view.top + view.size * (0.9 + index * 1.5);
            ctx.strokeText(row, view.x, y);
            ctx.fillText(row, view.x, y);
        });
    }
    /** The current line where the title card stands, in the font of the card. */
    function drawStoryLine(ctx, width, height, now) {
        const size = Math.round(Math.max(13, Math.min(18, Math.min(width, height) * 0.022)));
        const view = { x: Math.round(width / 2), top: Math.round(height * 0.2), size, width };
        ctx.save();
        ctx.globalAlpha = opacity(now - line.startAt, line.showMs);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${size}px 'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif`;
        if (line.rowsFor !== width) { line.rows = storyLineRows(ctx, line.text, Math.min(width - size * 3, size * 34)); line.rowsFor = width; }
        storyLineBand(ctx, view, line.rows.length);
        storyLineText(ctx, view, line.rows);
        ctx.restore();
    }
    /** Called once per battlefield frame, after the lighting pass. */
    function draw(ctx, width, height, now) {
        frameAt = Date.now();
        track(now);
        if (stageView.enabled()) watchStory(now);
        if (card) drawTitleCard(ctx, width, height, now);
        else if (line) drawStoryLine(ctx, width, height, now);
    }
    /** True while a title card is on screen or about to start — guide cards wait for it (js/tutorial-ui.js). It runs on
     * the battlefield's clock, so this asks the battlefield: a hidden or stalled view never holds the cards back. */
    function busy() { return !!(card || pending) && Date.now() - frameAt < LIVE_MS; }
    if (typeof document === 'object' && document.fonts?.load) document.fonts.load("20px 'Galmuri14'").catch(() => {});
    return Object.freeze({ draw, busy });
})();
safeExposeGlobals({ actTitleCard });
