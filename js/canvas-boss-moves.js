/** The boss moves on screen (js/boss-moves.js; 2026-10-16 사용자: GPT가 만든 적 공격 효과로 보스 패턴을 다양하게, "vfx용량과 색 검수,
 * 늘어나거나 줄어들어서 이상하게 보이지 않는지 검수, 몬스터가 자연스럽게 사용하는지도 중요해"). Effects come from the boss's own sheet
 * (data/boss-fx.js; GPT's art, assets/stage-vfx/boss-fx, local only) at one size per boss: its scale × the dot the boss is drawn at.
 * Nothing is stretched: a shot turns along its lane, a beam is the frame's head, its middle tiled, its tail.
 * Ground (under the actors): each stage's cells warn, faint to strong as their turn comes, then burst (impact frames; a ground boss's
 * eruption, a falling boss's drop). Air (over them): the charge at the boss's hand through the warning, shots flying down their
 * lanes from the hand at its height, the beam (or, for bosses whose art is a shot, a stream of shots) held from the hand.
 * The hand is the emit point of the frame the boss strikes on (data/boss-fx.js emit), from where the boss was drawn
 * (js/canvas-stage-roster.js placementOf). Without the art the warnings and a flash of every stage still show. Draws only. */
const bossMoveView = (() => {
    const BURST_FLASH_MS = 200, STREAM_EVERY_MS = 120, FALL_MS = 320, FALL_TILES = 3.2;
    const sheets = new Map();
    const fx = () => (typeof BOSS_FX === 'object' ? BOSS_FX : null);
    const sum = list => list.reduce((total, ms) => total + ms, 0);

    function sheetOf(key) {
        if (!sheets.has(key)) sheets.set(key, stagePictures.openPicture(`${fx().path}${key}.png?v=${fx().version}`));
        const sheet = sheets.get(key);
        return sheet.ready ? sheet : null;
    }
    /** The clip's frame at ms (loop: round and round; else null once it is over). */
    function frameAt(clip, ms, loop) {
        const total = sum(clip.ms);
        if (ms < 0 || (!loop && ms >= total)) return null;
        let rest = loop ? ms % total : ms;
        for (let i = 0; i < clip.ms.length; i++) {
            if (rest < clip.ms[i]) return clip.frames[i];
            rest -= clip.ms[i];
        }
        return clip.frames[clip.frames.length - 1];
    }
    /** One frame with its anchor at `at`, `scale` screen px per effect px, turned by angle; flip mirrors it (a shot going left keeps
     * its top up). */
    function drawFrame(ctx, clip, frame, at, look) {
        const sheet = frame && sheetOf(clip.sheet);
        if (!sheet) return;
        const cell = fx().cell, cols = fx().cols, s = look.scale;
        ctx.save();
        ctx.translate(at.x, at.y);
        if (look.angle) ctx.rotate(look.angle);
        if (look.flip !== !!frame[5]) ctx.scale(-1, 1);
        if (look.alpha !== undefined) ctx.globalAlpha *= look.alpha;
        stageDots.blit(ctx, sheet.source, { x: (frame[0] % cols) * cell, y: Math.floor(frame[0] / cols) * cell, w: cell, h: cell },
            { x: -frame[1] * s, y: -frame[2] * s, scale: s }, true);
        ctx.restore();
    }
    /** A screen direction as an angle that keeps the art's top up: { angle, flip }. */
    function heading(from, to) {
        const dx = to.x - from.x, dy = to.y - from.y;
        return dx < 0 ? { angle: Math.atan2(-dy, -dx), flip: true } : { angle: Math.atan2(dy, dx), flip: false };
    }

    /** Where the boss stands and lets its effects go: { feet, hand, dot } in screen px. */
    function bodyOf(enemy, row, projection) {
        const placed = typeof stageRoster === 'object' ? stageRoster.placementOf(enemy.id) : null;
        if (placed) {
            const emit = row.emit[Math.min(row.emit.length - 1, placed.strikeFrame)] || row.emit[0], side = placed.west ? -1 : 1;
            return { feet: { x: placed.x, y: placed.y }, hand: { x: placed.x + emit[0] * placed.dot * side, y: placed.y + emit[1] * placed.dot }, dot: placed.dot };
        }
        const centre = getGridUnitCenter(enemy), at = projection.cellToScreen(centre.gx, centre.gy);
        const feet = { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) }, dot = projection.tileW / 48;
        return { feet, hand: { x: feet.x, y: feet.y - projection.tileH * 0.9 }, dot };
    }
    const floorOf = (cell, projection) => {
        const at = projection.cellToScreen(cell.gx, cell.gy);
        return { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) };
    };

    // ── ground ────────────────────────────────────────────────────────────
    /** A stage's cells on the ground: alpha rises as its turn comes (the last 0.6 s), then a short flash once it lands. */
    function drawStageWarning(ctx, stage, landAt, now, projection) {
        const left = landAt - now, alpha = left > 0 ? 1.5 + 5.5 * clampNumber(1 - left / 600, 0, 1) : 6 * (1 - -left / BURST_FLASH_MS);
        if (alpha <= 0) return;
        const footprint = projectSkillFootprint({ cells: stage.cells, kind: 'blast', center: stage.cells[0] }, projection);
        if (footprint) drawSkillFootprintGround(ctx, footprint, '#ff684f', alpha);
    }
    /** What bursts out of the ground where a stage lands: a ground boss's eruption, else its impact. A volley and a beam do not burst. */
    function burstClip(row, kind) {
        if (['volley', 'beam'].includes(kind)) return null;
        return row.kind === 'ground' ? row.clips.action : row.clips.impact;
    }
    function drawBursts(ctx, entry, row, now, projection) {
        const move = entry.move, clip = burstClip(row, move.kind);
        if (!clip) return;
        // Bursts at the body's own effect size: impactScale (small for beam bosses) is for the tip of a shot or a beam only.
        const body = bodyOf(entry.source, row, projection), scale = body.dot * row.scale;
        for (const stage of move.stages) {
            const since = now - (move.releasedAt + stage.ms);
            if (row.kind === 'fall') { drawFalls(ctx, { entry, row, stage, since }, projection); continue; }
            const frame = frameAt(clip, since, false);
            if (frame) stage.cells.forEach(cell => drawFrame(ctx, clip, frame, floorOf(cell, projection), { scale }));
        }
    }
    /** A falling boss's stage: the shot drops onto each cell over FALL_MS (down and a little sideways), then its impact plays. */
    function drawFalls(ctx, fall, projection) {
        const { entry, row, stage, since } = fall, body = bodyOf(entry.source, row, projection), scale = body.dot * row.scale;
        for (const cell of stage.cells) {
            const floor = floorOf(cell, projection), top = { x: floor.x - projection.tileW * 0.8, y: floor.y - projection.tileH * FALL_TILES };
            if (since < 0 && since > -FALL_MS) {
                const p = 1 + since / FALL_MS, at = { x: top.x + (floor.x - top.x) * p, y: top.y + (floor.y - top.y) * p };
                drawFrame(ctx, row.clips.action, frameAt(row.clips.action, FALL_MS + since, true), at, { scale, ...heading(top, floor) });
            }
            const frame = frameAt(row.clips.impact, since, false);
            if (frame) drawFrame(ctx, row.clips.impact, frame, floor, { scale });
        }
    }
    function drawGround(ctx, projection) {
        if (!projection) return;
        const now = bossAttackView.now();
        for (const entry of bossMoves.live(now)) {
            const move = entry.move, found = bossMoves.fxOf(entry.source);
            for (const stage of move.stages) {
                const cells = stage.cells.filter(cell => !move.spent.includes(cell.lane) || move.kind !== 'volley');
                if (cells.length && move.kind !== 'beam') drawStageWarning(ctx, { cells }, move.releasedAt + stage.ms, now, projection);
            }
            if (found && fx()) drawBursts(ctx, entry, found.row, now, projection);
        }
    }

    // ── air ───────────────────────────────────────────────────────────────
    /** The charge at the boss's hand through its warning: GPT's charge frames spread over the warning, the last flash at the end. */
    function drawCharges(ctx, projection) {
        for (const enemy of game.enemies || []) {
            const share = enemy && enemy.isBoss ? bossAttackView.warningShare(enemy) : null, found = share === null ? null : bossMoves.fxOf(enemy);
            if (!found || !enemy.patternArea) continue;
            const clip = found.row.clips.charge, body = bodyOf(enemy, found.row, projection);
            const frame = clip.frames[Math.min(clip.frames.length - 1, Math.floor(share * (clip.frames.length - 0.5)))];
            drawFrame(ctx, clip, frame, body.hand, { scale: body.dot * found.row.scale });
        }
    }
    /** A lane's path through time: the hand at release, then cell k at hand height when its stage lands. [{ at, x, y }] */
    function lanePath(entry, row, lane, projection) {
        const move = entry.move, body = bodyOf(entry.source, row, projection), lift = body.hand.y - body.feet.y;
        const points = [{ at: move.releasedAt, x: body.hand.x, y: body.hand.y }];
        for (const stage of move.stages) {
            const cell = stage.cells.find(row2 => row2.lane === lane);
            if (cell) { const floor = floorOf(cell, projection); points.push({ at: move.releasedAt + stage.ms, x: floor.x, y: floor.y + lift }); }
        }
        return points;
    }
    function pointAt(path, now) {
        for (let i = 1; i < path.length; i++) {
            if (now > path[i].at) continue;
            const a = path[i - 1], b = path[i], p = clampNumber((now - a.at) / Math.max(1, b.at - a.at), 0, 1);
            return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, from: a, to: b };
        }
        return null;
    }
    /** The shots of a volley: each flies its lane until it hits (move.hits) or runs out, then its impact plays where it ended. */
    function drawShots(ctx, entry, row, now, projection) {
        const move = entry.move, lanes = new Set(move.stages.flatMap(stage => stage.cells.map(cell => cell.lane)));
        const scale = bossMoveScale(entry, row, projection);
        for (const lane of lanes) {
            const hit = move.hits.find(row2 => row2.lane === lane), path = lanePath(entry, row, lane, projection);
            const end = (hit && path.find(point => point.at === move.releasedAt + hit.ms)) || path[path.length - 1];
            const flying = now < end.at && pointAt(path, now);
            if (flying) drawFrame(ctx, row.clips.action, frameAt(row.clips.action, now - move.releasedAt, true), flying, { scale, ...heading(flying.from, flying.to) });
            else drawFrame(ctx, row.clips.impact, frameAt(row.clips.impact, now - end.at, false), end, { scale: scale * row.impactScale });
        }
    }
    const bossMoveScale = (entry, row, projection) => bodyOf(entry.source, row, projection).dot * row.scale;

    /** A beam held from the hand to the line's far cell: head, tiled middle, tail (beam art), or a stream of shots (shot art). */
    function drawBeam(ctx, entry, row, now, projection) {
        const move = entry.move, first = move.stages[0], last = move.stages[move.stages.length - 1];
        const start = move.releasedAt + first.ms, end = move.releasedAt + last.ms + BOSS_MOVE_RULES.beam.tickMs;
        if (now < start - 90 || now > end + 200) return;
        const body = bodyOf(entry.source, row, projection), far = first.cells[first.cells.length - 1], floor = floorOf(far, projection);
        const tip = { x: floor.x, y: floor.y + body.hand.y - body.feet.y }, scale = body.dot * row.scale;
        if (row.kind === 'beam') drawBeamBody(ctx, { clip: row.clips.action, frame: beamFrame(row.clips.action, now, start, end), from: body.hand, to: tip, scale });
        else drawStream(ctx, row, { now, start, end, from: body.hand, to: tip, scale });
        const tick = move.stages.find(stage => now >= move.releasedAt + stage.ms && now < move.releasedAt + stage.ms + 370);
        if (tick) drawFrame(ctx, row.clips.impact, frameAt(row.clips.impact, now - move.releasedAt - tick.ms, false), tip, { scale: scale * row.impactScale });
    }
    /** The beam's frame: its first two while it forms, the middle two while it holds, the last two as it fades. */
    function beamFrame(clip, now, start, end) {
        const n = clip.frames.length;
        if (now < start) return clip.frames[0];
        if (now > end) return clip.frames[Math.min(n - 1, n - 2 + Math.floor((now - end) / 100))];
        return clip.frames[2 + Math.floor((now - start) / 90) % 2];
    }
    function drawBeamBody(ctx, beam) {
        const { clip, frame, from, to, scale } = beam, sheet = frame && sheetOf(clip.sheet);
        if (!sheet) return;
        const cell = fx().cell, cols = fx().cols, sx = (frame[0] % cols) * cell, sy = Math.floor(frame[0] / cols) * cell;
        const left = frame[3], right = frame[4], span = right - left + 1, cut = Math.max(2, Math.round(span * 0.3));
        const length = Math.hypot(to.x - from.x, to.y - from.y) / scale, look = heading(from, to);
        ctx.save();
        ctx.translate(from.x, from.y);
        ctx.rotate(look.angle);
        if (look.flip) ctx.scale(-1, 1);
        const piece = (x, w, at) => stageDots.blit(ctx, sheet.source, { x: sx + x, y: sy, w, h: cell }, { x: at * scale, y: -frame[2] * scale, scale }, true);
        piece(left, cut, 0);
        const body = { x: left + cut, w: Math.max(1, span - cut * 2) };
        for (let at = cut; at < length - cut; at += body.w) piece(body.x, Math.min(body.w, Math.ceil(length - cut - at)), at);
        piece(right + 1 - cut, cut, Math.max(cut, length - cut));
        ctx.restore();
    }
    /** Shots let go every STREAM_EVERY_MS from start to end, each crossing the line in a stepMs per cell's time. */
    function drawStream(ctx, row, s) {
        const clip = row.clips.action, travel = Math.max(200, Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y) * 1.4), look = heading(s.from, s.to);
        for (let launch = s.start - travel * 0.5; launch < s.end; launch += STREAM_EVERY_MS) {
            const p = (s.now - launch) / travel;
            if (p < 0 || p > 1) continue;
            drawFrame(ctx, clip, frameAt(clip, s.now - launch, true), { x: s.from.x + (s.to.x - s.from.x) * p, y: s.from.y + (s.to.y - s.from.y) * p }, { scale: s.scale, ...look });
        }
    }
    function drawAir(ctx, projection) {
        if (!projection || !fx()) return;
        const now = bossAttackView.now();
        drawCharges(ctx, projection);
        for (const entry of bossMoves.live(now)) {
            const found = bossMoves.fxOf(entry.source);
            if (!found) continue;
            if (entry.move.kind === 'volley') drawShots(ctx, entry, found.row, now, projection);
            if (entry.move.kind === 'beam') drawBeam(ctx, entry, found.row, now, projection);
        }
    }

    /** How long the boss holds its strike frame after letting go (js/canvas-monster-actors.js): a beam's whole length, else 0. */
    function strikeHoldMs(enemy) {
        const entry = bossMoves.live(bossAttackView.now()).find(row => row.source === enemy && row.move.kind === 'beam');
        if (!entry) return 0;
        const stages = entry.move.stages;
        return stages[stages.length - 1].ms + BOSS_MOVE_RULES.beam.tickMs;
    }

    return Object.freeze({ drawGround, drawAir, strikeHoldMs });
})();
safeExposeGlobals({ bossMoveView });
