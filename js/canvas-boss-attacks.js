// 보스 공격 연출(2026-10-06 사용자 요청: "보스 몬스터들의 공격 및 패턴이 너무 허접하고 이펙트도 안보여서"). 그림과 소리만 맡고
// 판정 칸은 건드리지 않는다(예고할 때 정해진 enemy.patternArea, 놓은 뒤에는 대기 중인 공격의 bossPattern.area 그대로).
// - 바닥 경고(js/canvas-battlefield.js drawBossPatternArea): 예고가 흐를수록 진해지고 끝 무렵 깜빡인다(groundAlpha).
// - 바닥 표시(drawMarks, 2026-10-19부터 인물 아래): 줄과 부채꼴은 보스 쪽에서부터 차오르는 칸과 바닥에 눕힌 화살촉, 위에서 보는
//   전장의 범위기는 바깥에서 좁혀 드는 조준 고리. 놓은 뒤 맞기 직전에는 다 찬 채 빠르게 깜빡인다. 맞는 순간의 칸 번쩍임도 바닥에 그린다.
// - 그림 보스의 몸(addMotions): 예고 동안 목표 반대쪽으로 젖히고 떨다가, 놓는 순간(bossRelease 효과) 범위기는 뛰어올라
//   내리찍고 나머지는 앞으로 내지른다. 맞는 순간의 작은 돌진(enemyAttack)은 보스에게서 이것으로 바뀐다.
// - 타격(drawImpact): 충격파 두 겹, 원소 색 파편(canvas-attack-fx 'slam'), 땅 갈라짐 자국(drawGround), 소리. 흔들림은
//   getBattleFeedbackProfile의 bossSlam이 맡는다.
const bossAttackView = (() => {
    const BLINK_FROM = 0.72;          // 예고가 이만큼 지나면 바닥 경고가 깜빡이기 시작한다
    const RETICLE_START = 2.2;        // 조준 고리가 범위의 몇 배 크기에서 좁혀 들기 시작하는지
    // 몸 움직임(칸 단위). 범위기는 놓은 뒤 0.5초에 땅에 닿으므로(BOSS_ATTACK_IMPACT_DELAY_MS) 뛰어오른 몸이 그때 내려앉는다.
    const MOTION = Object.freeze({ leanTiles: 0.2, rearTiles: 0.1, hopTiles: 0.55, lungeTiles: 0.4, releaseMs: 540, landAt: 0.93, trembleFrom: 0.6 });
    const CRACK_MS = 1400, IMPACT_FLASH_MS = 240;
    const RAY_KINDS = new Set(['line', 'fan']);
    // 충격은 효과 객체로 기억한다: 효과 번호는 런마다 0부터 다시 매겨져, 번호로 기억하면 다음 런의 충격이 가끔 통째로 빠졌다.
    const cracks = [], landed = new WeakSet();

    const easeOut = t => 1 - (1 - t) * (1 - t);
    /** 옆에서 보는 무대(2026-10-16 사용자 "보스 패턴의 동그라미 강조표시가 이상하고, 좀 이상한 이펙트들도 있어"): 원근으로 납작하게 눌린 큰 타원이
     * 범위 밖에서 조여 들고 흰 꺾쇠가 돌며, 착탄 때 흰 타원 두 겹이 퍼지고 위에서 보는 전장의 파편과 바닥 금이 남았다. 무대에서는 바닥 칸의
     * 경고(깜빡이며 짙어진다)와 갈래와 줄의 화살표, 보스의 효과 그림(js/canvas-boss-moves.js)만 쓴다. 착탄 때 칸이 번쩍이는 빛과 소리는 둔다. */
    const onStage = () => typeof stageView === 'object' && stageView.enabled();
    const isHeld = enemy => (enemy.ailments || []).some(ailment => ['freeze', 'stun', 'silence'].includes(ailment.type) && ailment.time > 0);
    function isLiveWarning(enemy) {
        if (!enemy || !enemy.isBoss || enemy.noAttack || !(enemy.hp > 0) || !enemy.patternArea) return false;
        return !isHeld(enemy);
    }
    /** The combat clock between its 100 ms steps: on the stepped clock the warning ramped, blinked and closed in tenths of a second
     * (2026-10-07 review). It runs on from the last step by the screen's clock, up to one step, and stays put once the fight has
     * not stepped for a while (paused). */
    let stepClock = -1, stepAt = 0;
    function smoothCombatTime() {
        const combat = getCombatTime(), now = performance.now();
        if (combat !== stepClock) { stepClock = combat; stepAt = now; }
        const since = now - stepAt;
        return since < 150 ? combat + Math.min(100, since) : combat;
    }
    /** 0..1 through the live warning, null when the boss is not warning. */
    function warningShare(enemy) {
        const started = Number(enemy && enemy.patternTelegraphStartedAt) || 0;
        if (!enemy || !enemy.patternTelegraphKey || !started) return null;
        return clampNumber((smoothCombatTime() - started) / (enemy.nextPatternState?.warningMs || COMBAT_GRID_CONFIG.bossPatternWarningMs), 0, 1);
    }
    /** 1, then a blink that quickens towards the release. The phase is the rate integrated over the warning; clock × rate made the
     * phase jump at random as soon as the rate moved. */
    function blink(share) {
        if (share < BLINK_FROM) return 1;
        const span = COMBAT_GRID_CONFIG.bossPatternWarningMs, late = share - BLINK_FROM;
        return 0.62 + 0.38 * Math.abs(Math.cos(0.009 * share * span + 0.015 * span * late * late));
    }
    /** Ground warning strength for drawBossPatternArea: 3 when it appears, 7 at release, blinking near the end. */
    function groundAlpha(enemy) {
        const share = warningShare(enemy);
        return share === null ? 3 : (3 + 4 * share) * blink(share);
    }
    /** A released area that lands within half a second: full strength, blinking fast (about 105 ms a beat, on the screen's clock). */
    function pendingAlpha() {
        return 7 * (0.6 + 0.4 * Math.abs(Math.cos(performance.now() * 0.03)));
    }

    // ── 인물 위 선(채움 없음) ─────────────────────────────────
    /** ring = { x, y, rx, ry }: four short arcs just outside it, turned by spin. */
    function drawBrackets(ctx, ring, spin) {
        for (let k = 0; k < 4; k++) {
            const at = spin + k * Math.PI / 2;
            ctx.beginPath();
            ctx.ellipse(ring.x, ring.y, ring.rx * 1.12, ring.ry * 1.12, 0, at - 0.28, at + 0.28);
            ctx.stroke();
        }
    }
    /** A ring that closes in from outside onto the area, with four brackets turning into place. */
    function drawReticle(ctx, footprint, look) {
        const close = easeOut(look.share), grow = 1 + (RETICLE_START - 1) * (1 - close);
        const rx = Math.max(footprint.width, footprint.tileW) / 2 * grow, ry = Math.max(footprint.height, footprint.tileH) / 2 * grow;
        ctx.globalAlpha = (0.35 + 0.55 * close) * look.blink;
        ctx.strokeStyle = '#ff6a4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(footprint.x, footprint.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffe2c4';
        ctx.lineWidth = 3;
        drawBrackets(ctx, { x: footprint.x, y: footprint.y, rx, ry }, (1 - close) * Math.PI / 2);
    }
    // 줄과 갈래(2026-10-19 사용자 "사용 전 알려주는 화살표가 허접해서 그럴듯하게", "캐릭터보단 아래 레이어에"): 칸마다 그은 가는 흰 꺾쇠
    // 대신, 바닥에 눕힌 두툼한 화살촉이 보스에서 끝으로 늘어서고, 예고가 흐르는 만큼 보스 쪽에서부터 칸이 차오른다(끝까지 차면 맞는다).
    // 바닥 칸 경고와 같이 인물 아래에 그린다. 거리는 바닥 단위(칸 너비 = 1)로 잰다: 무대의 깊이는 눌려 그려지므로 화면 y를 펴서 잰다.
    const ARROW = Object.freeze({ depth: 0.36, half: 0.32, thick: 0.16, first: 1.15, every: 1.7, endGap: 0.45 });
    /** The warned cells shown on the floor (open floor without obstacles, js/canvas-skill-footprint.js): the ray is measured on these,
     * so its charge reaches the end the player sees, not a cell hidden in a wall. */
    function shownPoints(footprint) {
        const map = getCombatGridSize(), run = actExplorationState.current(game);
        if (!map.tiles) return footprint.points;
        const sealed = !!run && actExplorationState.gateSealed(run), taken = getGroundTakenCellKeys(run);
        return footprint.points.filter(point => actExplorationMap.walkable(map, point, sealed) && !taken.has(gridCellKey(point.gx, point.gy)));
    }
    /** The ray's frame on the floor: origin, unit axis, reach (floor tiles) and the shown cells. */
    function rayFrame(footprint, origin) {
        const squash = footprint.tileH / footprint.tileW, unit = footprint.tileW, shown = shownPoints(footprint);
        const flat = point => ({ x: (point.x - origin.x) / unit, y: (point.y - origin.y) / squash / unit });
        const offsets = shown.map(flat).filter(o => Math.hypot(o.x, o.y) > 0.01);
        if (!offsets.length) return null;
        const sum = offsets.reduce((acc, o) => { const l = Math.hypot(o.x, o.y); return { x: acc.x + o.x / l, y: acc.y + o.y / l }; }, { x: 0, y: 0 });
        const len = Math.hypot(sum.x, sum.y);
        if (len < 0.01) return null;
        const axis = { x: sum.x / len, y: sum.y / len };
        const reach = Math.max(...offsets.map(o => o.x * axis.x + o.y * axis.y + 0.5));
        return { origin, axis, reach, squash, unit, shown, tileH: footprint.tileH };
    }
    /** Whether a screen point lies on one of the shown cells. */
    const onShownCell = (frame, point) => frame.shown.some(cell => Math.abs(point.x - cell.x) <= frame.unit / 2 && Math.abs(point.y - cell.y) <= frame.tileH / 2);
    /** A floor point (tiles along the axis and across it) back on the screen. */
    function onFloor(frame, along, across) {
        const ax = frame.axis.x, ay = frame.axis.y, x = ax * along - ay * across, y = ay * along + ax * across;
        return { x: frame.origin.x + x * frame.unit, y: frame.origin.y + y * frame.squash * frame.unit };
    }
    /** The charged part: from the boss out to share of the reach (straight with time: full means it lands now), with a bright front. */
    function drawCharge(ctx, frame, look) {
        const front = frame.reach * look.share, wide = frame.reach * 2 + 2;
        if (front <= 0.05) return;
        const corners = [onFloor(frame, 0, -wide), onFloor(frame, front, -wide), onFloor(frame, front, wide), onFloor(frame, 0, wide)];
        ctx.globalAlpha = (0.18 + 0.2 * look.share) * look.blink;
        ctx.fillStyle = '#ff8a5c';
        ctx.beginPath();
        corners.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
        ctx.closePath();
        ctx.fill();
        // The front: a soft wide glow under a bright line, so where the charge has got to reads even on a busy floor.
        for (const [width, colour, alpha] of [[0.14, '#ff6a40', 0.35], [0.05, '#fff1e2', 0.6 + 0.4 * look.share]]) {
            ctx.globalAlpha = Math.min(1, alpha) * look.blink;
            ctx.strokeStyle = colour;
            ctx.lineWidth = Math.max(2, frame.unit * width);
            ctx.beginPath();
            ctx.moveTo(corners[1].x, corners[1].y);
            ctx.lineTo(corners[2].x, corners[2].y);
            ctx.stroke();
        }
    }
    /** One solid arrowhead lying on the floor, its tip `along` tiles out on the ray; none where it would be cut by the edge of the
     * warned floor (a broken arrowhead read as a glitch). */
    function drawArrowhead(ctx, frame, along, lit) {
        const { depth, half, thick } = ARROW;
        const shape = [[thick, 0], [thick - depth, -half], [-depth, -half], [0, 0], [-depth, half], [thick - depth, half]];
        const points = shape.map(([a, b]) => onFloor(frame, along + a, b));
        if (![points[0], points[2], points[4]].every(point => onShownCell(frame, point))) return;
        ctx.beginPath();
        points.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
        ctx.closePath();
        ctx.fillStyle = lit ? '#ffe7d6' : '#ff9d7a';
        ctx.fill();
        ctx.strokeStyle = '#3d140e';
        ctx.lineWidth = Math.max(1, frame.unit * 0.025);
        ctx.stroke();
    }
    /** Arrowheads every ARROW.every tiles down the middle out to the far end (a fan's spread shows in its cells; arrows toward its edges
     * only fitted next to the boss, bunched on one another). The ones the charge has passed are lit. */
    function drawArrows(ctx, frame, look) {
        const front = frame.reach * look.share;
        for (let along = ARROW.first; along <= frame.reach - ARROW.endGap; along += ARROW.every) {
            const lit = along <= front;
            ctx.globalAlpha = (lit ? 0.95 : 0.5 + 0.2 * look.share) * look.blink;
            drawArrowhead(ctx, frame, along, lit);
        }
    }
    /** Lines and fans start at the boss: they charge outward from it, under arrowheads pointing the way it strikes. */
    function drawRays(ctx, footprint, look) {
        const frame = look.origin && rayFrame(footprint, look.origin);
        if (!frame) return;
        clipSkillFootprint(ctx, footprint); // the warned cells only (a fan's triangle), and below only floor the hero could stand on
        drawCharge(ctx, frame, look);
        drawArrows(ctx, frame, look);
    }
    function originOf(source, projection) {
        if (!source || !hasGridCell(source)) return null;
        const centre = getGridUnitCenter(source);
        return projection.cellToScreen(centre.gx, centre.gy);
    }
    function drawMark(ctx, area, projection, look) {
        const footprint = projectSkillFootprint(area, projection);
        if (!footprint) return;
        ctx.save();
        if (RAY_KINDS.has(area.kind)) {
            clipSkillFootprintTerrain(ctx, footprint); // only where the hero could stand, like the ground fill
            // From the boss's cell the ray leaves from (js/combat-patterns.js patternArea.source), else the boss's middle: from the middle of a
            // wide boss the axis leant off the ray's row.
            const origin = hasGridCell(area.source) ? projection.cellToScreen(area.source.gx, area.source.gy) : originOf(look.source, projection);
            drawRays(ctx, footprint, { ...look, origin });
        } else if (!onStage()) drawReticle(ctx, footprint, look);
        ctx.restore();
    }
    /** A released area gets the closing ring; a move's stages show their own warnings, shots and bursts (js/canvas-boss-moves.js). */
    const closesIn = attack => attack.delivery === 'patternArea' && !attack.bossPattern.move;
    /** The bright edge of every live and released boss warning (a released snapshot owns its warning even when the boss no longer
     * previews one). Under the actors since 2026-10-19 (before, it was the last part of a warning still drawn over them). */
    function drawEdges(ctx, scene) {
        const areas = (scene.layout || []).filter(({ enemy }) => isLiveWarning(enemy)).map(({ enemy }) => enemy.patternArea);
        (scene.pending || []).forEach(attack => { if (attack.delivery === 'patternArea') areas.push(attack.bossPattern.area); });
        new Set(areas).forEach(area => drawBossPatternArea(ctx, area, scene.projection, 0.92, true));
    }
    /** Every landing's flash of the struck cells (battleFx bossAreaImpact), on the floor like its warning. Effects are stamped on the
     * battlefield's clock (battleVisualState.visualNow, held back by hit stops), so the flash is timed on it too. */
    function drawImpactFlashes(ctx, projection) {
        const now = Number.isFinite(battleVisualState.visualNow) ? battleVisualState.visualNow : performance.now();
        for (const fx of battleFx) {
            if (!fx || fx.type !== 'bossAreaImpact' || now < fx.start) continue;
            const ms = now - fx.start;
            if (ms < IMPACT_FLASH_MS) drawBossPatternArea(ctx, fx.footprint, projection, (1 - ms / IMPACT_FLASH_MS) * 5);
        }
    }
    /** Under the actors, after the ground warnings (js/canvas-battlefield.js drawEnemyAttackTelegraphs): the landings' flashes and the
     * marks of every live and released boss warning, so the bosses and the hero stand over them (2026-10-19 user: "캐릭터에 가려지도록"). */
    function drawMarks(ctx, scene) {
        if (!scene || !scene.projection) return;
        drawImpactFlashes(ctx, scene.projection);
        drawEdges(ctx, scene);
        for (const { enemy } of scene.layout || []) {
            const share = isLiveWarning(enemy) ? warningShare(enemy) : null;
            if (share !== null) drawMark(ctx, enemy.patternArea, scene.projection, { share, source: enemy, blink: blink(share) });
        }
        for (const attack of scene.pending || []) {
            if (!closesIn(attack)) continue;
            drawMark(ctx, attack.bossPattern.area, scene.projection, { share: 1, source: attack.source, blink: pendingAlpha() / 7 });
        }
    }

    // ── 몸 ─────────────────────────────────────────────────
    function towards(entry, playerPos) {
        const dx = Number(playerPos.x) - Number(entry.x), dy = Number(playerPos.y) - Number(entry.y), length = Math.hypot(dx, dy);
        return length < 0.01 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
    }
    function latestRelease(enemy, now) {
        let found = null;
        for (const fx of battleFx) {
            if (!fx || fx.type !== 'bossRelease' || fx.enemyId !== enemy.id || now < fx.start || now - fx.start > MOTION.releaseMs) continue;
            if (!found || fx.start > found.start) found = fx;
        }
        return found;
    }
    /** Height of the hop (0 → on the ground): up fast, hang, then drop to land with the impact. */
    function hopHeight(t) {
        if (t >= MOTION.landAt) return 0;
        const u = t / MOTION.landAt;
        return u < 0.55 ? Math.sin(Math.PI / 2 * u / 0.55) : 1 - Math.pow((u - 0.55) / 0.45, 2);
    }
    /** Area specials hop and slam down (the shadow stays: lift moves only the picture); shots and lines thrust forward. */
    function releaseMotion(entry, dir, now, tile) {
        const fx = latestRelease(entry.enemy, now);
        // Frozen, stunned or silenced right after letting go: the attack was called off, so no hop that lands on nothing.
        if (!fx || isHeld(entry.enemy)) return null;
        const t = clampNumber((now - fx.start) / MOTION.releaseMs, 0, 1);
        if (!fx.slam) {
            const stride = Math.sin(Math.PI * Math.min(1, t / 0.7)) * MOTION.lungeTiles * tile;
            return { progress: t, x: dir.x * stride, y: dir.y * stride };
        }
        const reach = Math.sin(Math.PI * Math.min(1, t / MOTION.landAt)) * 0.15 * tile;
        return { progress: t, x: dir.x * reach, y: dir.y * reach, lift: hopHeight(t) * MOTION.hopTiles * tile };
    }
    /** While warning: lean away from the hero and rear up, trembling over the last part. */
    function windUpMotion(entry, dir, now, tile) {
        const share = isLiveWarning(entry.enemy) ? warningShare(entry.enemy) : null;
        if (share === null) return null;
        const lean = -easeOut(share) * MOTION.leanTiles * tile;
        const tremble = share > MOTION.trembleFrom ? Math.sin(now * 0.09) * 2 * (share - MOTION.trembleFrom) / (1 - MOTION.trembleFrom) : 0;
        return { progress: 0, x: dir.x * lean + tremble, y: dir.y * lean, lift: easeOut(share) * MOTION.rearTiles * tile };
    }
    /** drawBattleSprite offsetY for a lifted body (undefined keeps the frame's own offset; the shadow stays on the ground). */
    function spriteOffsetY(motion, frame) {
        if (!motion || !(motion.lift > 0)) return undefined;
        return (Number(frame && frame.offsetY) || 0) - motion.lift;
    }
    /** Replaces the bosses' rows in the attack motion map (screen px): the wind-up and the release, never the late hit lunge. */
    function addMotions(motions, layout, playerPos, now, tile) {
        if (!playerPos || !(tile > 0)) return motions;
        for (const entry of layout || []) {
            if (!entry.enemy || !entry.enemy.isBoss) continue;
            const dir = towards(entry, playerPos);
            const motion = releaseMotion(entry, dir, now, tile) || windUpMotion(entry, dir, now, tile);
            if (motion) motions[entry.enemy.id] = motion;
            else delete motions[entry.enemy.id];
        }
        return motions;
    }

    // ── 타격 ───────────────────────────────────────────────
    function drawShockwaves(ctx, footprint, progress, colour) {
        const rx = Math.max(footprint.width, footprint.tileW) / 2, ry = Math.max(footprint.height, footprint.tileH) / 2;
        ctx.save();
        for (const [delay, width] of [[0, 4], [0.18, 2]]) {
            const t = clampNumber((progress - delay) / (1 - delay), 0, 1);
            if (t <= 0 || t >= 1) continue;
            const grow = 0.35 + 1.05 * easeOut(t);
            ctx.globalAlpha = (1 - t) * 0.9;
            ctx.strokeStyle = t < 0.25 ? '#fff4de' : colour;
            ctx.lineWidth = width * (1 - t * 0.6);
            ctx.beginPath();
            ctx.ellipse(footprint.x, footprint.y, rx * grow, ry * grow, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
    /** Once per impact: debris in the boss's element, a crack left on the ground (areas around a point), the slam sound. */
    function land(fx, footprint) {
        landed.add(fx);
        const scale = clampNumber(Math.max(footprint.width, footprint.tileW) / 96, 0.7, 1.6);
        if (typeof attackFxSpawn === 'function') attackFxSpawn(fx.element || 'phys', footprint.x, footprint.y, { variant: 'slam', scale, crit: true });
        if (!RAY_KINDS.has(fx.footprint.kind)) cracks.push({ centre: { ...fx.footprint.center }, cells: Math.max(1, (fx.footprint.radius || 0) * 2 + 1), start: performance.now() });
        if (cracks.length > 6) cracks.shift();
        if (typeof playUiFeedbackSound === 'function') playUiFeedbackSound('hitSlam');
    }
    /** The released area lands, over the actors: two shockwaves and (once) debris, crack and sound. The cells' flash is on the floor
     * (drawImpactFlashes). */
    function drawImpact(ctx, fx, progress, projection) {
        const footprint = projectSkillFootprint(fx.footprint, projection);
        if (!footprint) return;
        if (onStage()) {
            if (!landed.has(fx)) { landed.add(fx); if (typeof playUiFeedbackSound === 'function') playUiFeedbackSound('hitSlam'); }
            return;
        }
        drawShockwaves(ctx, footprint, progress, getEnemyTelegraphColor({ ele: fx.element }).edge);
        if (!landed.has(fx)) land(fx, footprint);
    }
    /** Cracks under the actors where areas landed, fading over CRACK_MS (grid cells, so a scrolling map keeps them in place). */
    function drawGround(ctx, projection) {
        const image = typeof getSkillGemVfxImage === 'function' ? getSkillGemVfxImage('skillFxEarthCrack') : null, now = performance.now();
        while (cracks.length && now - cracks[0].start > CRACK_MS) cracks.shift();
        if (!image || !projection) return;
        for (const crack of cracks) {
            const at = projection.cellToScreen(crack.centre.gx, crack.centre.gy), size = projection.tileW * (crack.cells + 0.6);
            ctx.save();
            ctx.globalAlpha = 0.85 * (1 - (now - crack.start) / CRACK_MS);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, at.x - size / 2, at.y - size / 2 * (projection.tileH / projection.tileW), size, size * (projection.tileH / projection.tileW));
            ctx.restore();
        }
    }

    return { groundAlpha, pendingAlpha, drawMarks, addMotions, spriteOffsetY, drawImpact, drawGround, warningShare, now: smoothCombatTime };
})();
safeExposeGlobals({ bossAttackView });
