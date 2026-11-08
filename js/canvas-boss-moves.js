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
    // 칼끝 좌표는 나무꾼 공격 시트의 자세별 도트 위치다. 파편은 적중한 칸에서만 솟는다.
    const WOODSMAN_BLADE = [
        [70,-22], [68,-28], [-60,-134], [71,-52], [91,-103], [77,-52], [70,-22], [70,-22],
        [70,-22], [62,-104], [-54,-159], [-46,-169], [86,-24], [77,-34], [73,-43], [70,-22],
        [70,-22], [41,-127], [25,-167], [63,-165], [64,-165], [70,-162], [50,-111], [70,-22]
    ];
    // Separate authored shapes and timing. Only the quiet pre-strike glint is shared.
    const WOODSMAN_SHAPES = {
        phys: { slash: [20,55,75,110], impact: [25,55,80,130], speed: .14, rise: -.035, size: 1.12 },
        fire: { slash: [30,65,100,140], impact: [30,70,110,180], speed: .10, rise: .14, size: 1.32 },
        cold: { slash: [15,45,65,95], impact: [20,100,100,150], speed: .27, rise: 0, size: 1.36 },
        light: { slash: [15,35,35,65], impact: [15,35,45,100], speed: .42, rise: 0, size: 1.42 },
        chaos: { slash: [60,100,100,140], impact: [60,100,110,180], speed: .045, rise: -.04, size: 1.34 }
    };
    const woodsmanOrigins = new WeakMap();
    const WOODSMAN_CLIPS = Object.fromEntries(Object.entries(WOODSMAN_SHAPES).map(([element, shape], palette) => [
        element, [[64,64,[1,1,1,1]], [8,64,shape.slash], [64,112,shape.impact]]
            .map(([x, y, ms], row) => ({ sheet: 'woodsman-elements-v2', cell: 128, cols: 4, ms,
                frames: ms.map((_, i) => [(palette * 3 + row) * 4 + i, x, y, 0, 0, 0]) }))
    ]));

    function sheetOf(key) {
        if (!stageActors.available()) return null; // a build without the stage art has no effect sheets either: never ask for them
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
        const { cell = fx().cell, cols = fx().cols } = clip, s = look.scale;
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
    const HELD_MOVES = Object.freeze(['beam', 'grind']);
    /** 톱날이 가는 칸: 맞을 때마다 붉게 뛴다. */
    function drawGrindGround(ctx, move, now, projection) {
        const rule = BOSS_MOVE_RULES.grind, first = move.releasedAt + move.stages[0].ms, since = now - first;
        if (!move.stages.length || since > rule.tickMs * move.stages.length) return;
        const beat = since < 0 ? 0 : 1 - (since % rule.tickMs) / rule.tickMs, cells = move.stages[0].cells;
        const footprint = projectSkillFootprint({ cells, kind: 'blast', center: cells[0] }, projection);
        if (footprint) drawSkillFootprintGround(ctx, footprint, '#ff3a24', 1.2 + beat * 3.2);
    }
    /** 톱날에서 튀는 불꽃(도트 네모): 맞을 때마다 한 번, 무대 그림의 원판 앞쪽에서 앞과 아래로. 원판 자리는 그림에서 잰 값이다. */
    const SAW_RIM = Object.freeze({ x: 172, y: -52 }), SPARK_COLOURS = Object.freeze(['#fff4cf', '#ffc24d', '#ff7a2e', '#ff3a24']);
    function drawGrindSparks(ctx, entry, now) {
        const placed = typeof stageRoster === 'object' ? stageRoster.placementOf(entry.source.id) : null;
        if (!placed) return;
        const rule = BOSS_MOVE_RULES.grind, move = entry.move, side = placed.west ? -1 : 1, size = Math.max(3, Math.round(placed.dot * 3));
        ctx.save();
        move.stages.forEach((stage, tick) => {
            const age = (now - (move.releasedAt + stage.ms)) / rule.tickMs / 2;
            if (age < 0 || age > 1) return;
            for (let i = 0; i < 16; i++) {
                const spread = (hashSeed(`${tick}:${i}`) >>> 0) / 4294967296, far = (20 + spread * 64) * age, drop = 40 * age * age * (0.4 + spread);
                ctx.globalAlpha = 1 - age;
                ctx.fillStyle = SPARK_COLOURS[i % SPARK_COLOURS.length];
                const dx = SAW_RIM.x + far * Math.cos((i - 8) * 0.2), dy = SAW_RIM.y + far * Math.sin((i - 8) * 0.2) + drop;
                ctx.fillRect(Math.round(placed.x + side * dx * placed.dot), Math.round(placed.y + dy * placed.dot), size, size);
            }
        });
        ctx.restore();
    }
    function drawGround(ctx, projection) {
        if (!projection) return;
        const now = bossAttackView.now();
        drawShiftMarks(ctx, projection, now);
        for (const entry of bossMoves.live(now)) {
            const move = entry.move, found = bossMoves.fxOf(entry.source);
            for (const stage of move.stages) {
                const cells = stage.cells.filter(cell => !move.spent.includes(cell.lane) || move.kind !== 'volley');
                if (cells.length && !HELD_MOVES.includes(move.kind)) drawStageWarning(ctx, { cells }, move.releasedAt + stage.ms, now, projection);
            }
            if (move.kind === 'grind') drawGrindGround(ctx, move, now, projection);
            if (found && fx()) drawBursts(ctx, entry, found.row, now, projection);
        }
    }

    // ── air ───────────────────────────────────────────────────────────────
    function shiftAlpha(enemy) {
        const shift = bossMoves.shiftOf(enemy);
        if (!shift) return 1;
        const now = bossAttackView.now();
        return shift.landed ? clampNumber((now - shift.landAt) / 180, 0, 1)
            : clampNumber((shift.landAt - 100 - now) / 160, 0, 1);
    }
    /** Pale footprint = arrival, red footprint = damage. Neither follows the victim after being warned. */
    function drawShiftMarks(ctx, projection, now) {
        for (const enemy of game.enemies || []) {
            const shift = bossMoves.shiftOf(enemy);
            if (!shift || now > shift.landAt + 260) continue;
            const cells = getGridFootprintCells(shift.to.gx, shift.to.gy, getGridUnitFootprint(enemy));
            const footprint = projectSkillFootprint({ cells, kind: 'blast', center: shift.to }, projection);
            if (footprint) drawSkillFootprintGround(ctx, footprint, '#e4d5a1', 2.8);
        }
    }
    function drawShiftFlashes(ctx, projection, now) {
        for (const enemy of game.enemies || []) {
            const shift = bossMoves.shiftOf(enemy);
            if (!shift || Math.abs(now - shift.landAt) > 280) continue;
            const clip = WOODSMAN_CLIPS[shift.element][0], cell = shift.landed ? shift.to : shift.from;
            const at = floorOf(getGridUnitCenter({ ...cell, isBoss: true, footprint: getGridUnitFootprint(enemy) }), projection);
            const scale = projection.tileW / 96, age = now - shift.landAt;
            const alpha = Math.max(0, 1 - Math.abs(age) / 280);
            const frame = clip.frames[Math.min(3, Math.floor(Math.abs(age) / 70))];
            drawFrame(ctx, clip, frame, { x: at.x, y: at.y - 65 * scale }, { scale: scale * 1.15, alpha });
        }
    }
    function woodsmanBlade(placed, frame) {
        const [x, y] = WOODSMAN_BLADE[frame];
        return { x: placed.x + x * placed.dot * (placed.west ? -1 : 1), y: placed.y + y * placed.dot };
    }

    function drawWoodsmanCharge(ctx, enemy, element, share) {
        const placed = stageRoster.placementOf(enemy.id);
        if (!placed || placed.actor !== 'woodsman' || placed.clip !== 'attack' || placed.frame >= placed.strikeFrame) return;
        const clip = WOODSMAN_CLIPS[element][0];
        const frame = clip.frames[Math.min(3, Math.floor(share * 4))];
        drawFrame(ctx, clip, frame, woodsmanBlade(placed, placed.frame), { scale: placed.dot * 0.68, alpha: 0.87, flip: false });
    }

    function drawWoodsmanRelease(ctx, effect, elapsed) {
        const clip = WOODSMAN_CLIPS[effect.element][1], frame = frameAt(clip, elapsed, false);
        if (!frame) return;
        const origin = woodsmanOrigin(effect);
        if (!origin) return;
        const shape = WOODSMAN_SHAPES[effect.element], { dot, west } = origin;
        const at = { x: origin.x + (west ? -1 : 1) * dot * elapsed * shape.speed, y: origin.y - dot * elapsed * shape.rise };
        drawFrame(ctx, clip, frame, at, { scale: dot * shape.size, flip: west });
    }

    /** A cut leaves the blade once; recovery and a later turn do not drag it back. */
    function woodsmanOrigin(effect) {
        if (woodsmanOrigins.has(effect)) return woodsmanOrigins.get(effect);
        const placed = stageRoster.placementOf(effect.enemyId);
        if (!placed || placed.actor !== 'woodsman') return null;
        const origin = { ...woodsmanBlade(placed, placed.strikeFrame), dot: placed.dot, west: placed.west };
        woodsmanOrigins.set(effect, origin);
        return origin;
    }

    function drawWoodsmanFx(ctx, effect, now, projection) {
        const elapsed = now - effect.start;
        if (effect.type === 'bossRelease' && effect.woodsman) return drawWoodsmanRelease(ctx, effect, elapsed);
        if (effect.type !== 'woodsmanImpact' || !projection) return;
        const clip = WOODSMAN_CLIPS[effect.element][2], frame = frameAt(clip, elapsed, false);
        if (!frame) return;
        for (const at of woodsmanImpactPoints(effect.cells, projection)) {
            drawFrame(ctx, clip, frame, at, { scale: projection.tileW / 96, flip: false });
        }
    }

    /** Nearby hit cells share one burst, so narrow lanes do not stack three explosions over the hero. */
    function woodsmanImpactPoints(cells, projection) {
        const points = [], step = Math.max(1, Math.ceil(cells.length / 6)), gap = projection.tileW * .95;
        for (let i = 0; i < cells.length && points.length < 3; i += step) {
            const at = floorOf(cells[i], projection);
            if (points.every(p => Math.hypot(p.x - at.x, p.y - at.y) >= gap)) points.push(at);
        }
        return points;
    }

    /** The charge at the boss's hand through its warning: GPT's charge frames spread over the warning, the last flash at the end. */
    function drawCharges(ctx, projection) {
        for (const enemy of game.enemies || []) {
            const share = enemy && enemy.isBoss ? bossAttackView.warningShare(enemy) : null;
            if (share === null || !enemy.patternArea) continue;
            const element = woodsmanAttackFxElement(enemy);
            if (element) { drawWoodsmanCharge(ctx, enemy, element, share); continue; }
            const found = bossMoves.fxOf(enemy);
            if (!found) continue;
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
        const start = move.releasedAt + first.ms, end = Math.min(move.releasedAt + last.ms + BOSS_MOVE_RULES.beam.tickMs, move.cutAt ?? Infinity);
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
        drawShiftFlashes(ctx, projection, now);
        drawCharges(ctx, projection);
        for (const entry of bossMoves.live(now)) {
            if (entry.move.kind === 'grind') drawGrindSparks(ctx, entry, now);
            const found = bossMoves.fxOf(entry.source);
            if (!found) continue;
            if (entry.move.kind === 'volley') drawShots(ctx, entry, found.row, now, projection);
            if (entry.move.kind === 'beam') drawBeam(ctx, entry, found.row, now, projection);
        }
    }

    /** 뿌리 절단자는 예고한 칸 쪽을 본 채 톱날을 간다: 칸은 그대로인데 주인공을 따라 몸만 돌면 톱날과 칸이 어긋난다. 예고와 갈기 사이에만 'west' 또는 'east', 그 밖에는 null. */
    function heldSide(enemy) {
        const shift = enemy && bossMoves.shiftOf(enemy);
        if (shift && (!shift.released || getCombatTime() < shift.releasedAt + 800)) {
            return shift.target.gx < getGridUnitCenter(enemy).gx ? 'west' : 'east';
        }
        if (!enemy || !enemy.roomInvader) return null;
        const cells = grindCells(enemy, bossAttackView.now());
        if (!cells) return null;
        return cells.reduce((sum, cell) => sum + cell.gx, 0) / cells.length < getGridUnitCenter(enemy).gx ? 'west' : 'east';
    }
    function grindCells(enemy, now) {
        if (enemy.patternArea) return enemy.patternArea.cells;
        const entry = bossMoves.live(now).find(row => row.source === enemy && row.move.kind === 'grind');
        const stages = entry ? entry.move.stages : [];
        return stages.length && now <= entry.move.releasedAt + stages[stages.length - 1].ms ? stages[0].cells : null;
    }
    /** How long the boss holds its strike frame after letting go (js/canvas-monster-actors.js): a beam's whole length, else 0. */
    function strikeHoldMs(enemy) {
        const entry = bossMoves.live(bossAttackView.now()).find(row => row.source === enemy && row.move.kind === 'beam');
        if (!entry) return 0;
        const stages = entry.move.stages;
        return stages[stages.length - 1].ms + BOSS_MOVE_RULES.beam.tickMs;
    }

    return Object.freeze({ drawGround, drawAir, drawWoodsmanFx, strikeHoldMs, heldSide, shiftAlpha });
})();
safeExposeGlobals({ bossMoveView });
