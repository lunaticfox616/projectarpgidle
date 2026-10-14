/** Act title card over the upper battlefield, like an area name in an ARPG: entering (or loading into) a story act
 * shows "액트 N" and the act name. It waits while a story or tutorial popup is open, so it is not spent behind it.
 * Bosses keep the battlefield's own banner (drawBossAnnouncement).
 * On the room stage it also plays the story's lines (data/story-journal.js), one at a time after the card: the hero's
 * words and a boss's own words (“…”) in a speech bubble over the one speaking, so it is clear who talks; the guide of
 * the entry room, a side room's inscription and the narration of a boss fight (「…」) in a band where the card stands.
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
    const TONES = Object.freeze({ gold: '#e0c27e', violet: '#c9a4f2', cyan: '#8fe3d6', crimson: '#ef9a92' });
    const STORY_FONT = "'Galmuri14', 'MulmaruMono', 'Malgun Gothic', sans-serif";
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
    /** Queues a line once per loop and map. row: key (npc, stele, intro, half, defeat, class, elite), who (hero, boss, npc,
     * stele, narration), speaker, text, tone, and for a boss its id. */
    function queueStoryLine(row, now) {
        const id = `${game.season || 1}:${zone}:${row.key}`;
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
        const room = actExplorationDoors.room(run), npc = story.npc, stele = story.stele;
        if (room && room.role === 'entry' && npc) queueStoryLine({ key: 'npc', who: 'npc', speaker: npc.name, text: npc.bark, tone: npc.tone }, now);
        if (room && room.role === 'optional' && stele) queueStoryLine({ key: 'stele', who: 'stele', speaker: stele.title, text: stele.bark, tone: 'cyan' }, now);
    }
    /** The hero's line when the last elite sealing the boss gate falls. */
    function watchStoryGate(run, now) {
        const left = actExplorationState.remainingElites(run), before = gateLeft.get(run), lore = storyClassLore();
        gateLeft.set(run, left);
        if (before > 0 && left === 0 && lore) queueStoryLine({ key: 'elite', who: 'hero', speaker: lore.label, text: lore.eliteLine, tone: 'gold' }, now);
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
        if (!bossSeen.has(boss.id)) bossSeen.set(boss.id, { at: now, id: boss.id, name: getEnemyDisplayName(boss) });
        const seen = bossSeen.get(boss.id);
        if (now - seen.at < LINE.introDelayMs) return;
        queueBossLine('intro', seen, story.boss.intro, now);
        if (boss.hp <= boss.maxHp * LINE.halfAt) queueBossLine('half', seen, story.boss.half, now);
    }
    /** The fall, then the hero's words for the act; an intro or half line not yet shown is past. Nothing when this view never
     * saw the boss (loaded into a cleared map). */
    function storyBossDown(story, now) {
        const seen = [...bossSeen.values()].pop(), lore = storyClassLore(), act = actOf(zone);
        if (!seen) return;
        dropStoryLines(entry => entry.key === 'intro' || entry.key === 'half');
        queueBossLine('defeat', seen, story.boss.defeat, now);
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
        frameAt = Date.now();
        track(scene.now);
        if (stageView.enabled()) watchStory(scene.now);
        if (card) drawTitleCard(ctx, scene.width, scene.height, scene.now);
        else if (line) drawStoryLine(ctx, scene);
    }
    /** True while a title card is on screen or about to start — guide cards wait for it (js/tutorial-ui.js). It runs on
     * the battlefield's clock, so this asks the battlefield: a hidden or stalled view never holds the cards back. */
    function busy() { return !!(card || pending) && Date.now() - frameAt < LIVE_MS; }
    if (typeof document === 'object' && document.fonts?.load) document.fonts.load("20px 'Galmuri14'").catch(() => {});
    return Object.freeze({ draw, busy });
})();
safeExposeGlobals({ actTitleCard });
