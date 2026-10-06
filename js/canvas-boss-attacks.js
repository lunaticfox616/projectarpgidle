// 보스 공격 연출(2026-10-06 사용자 요청: "보스 몬스터들의 공격 및 패턴이 너무 허접하고 이펙트도 안보여서"). 그림과 소리만 맡고
// 판정 칸은 건드리지 않는다(예고할 때 정해진 enemy.patternArea, 놓은 뒤에는 대기 중인 공격의 bossPattern.area 그대로).
// - 바닥 경고(js/canvas-battlefield.js drawBossPatternArea): 예고가 흐를수록 진해지고 끝 무렵 깜빡인다(groundAlpha).
// - 인물 위(drawMarks): 큰 보스와 주인공이 바닥 칠을 가리므로 채움 없이 선만 더한다. 범위기는 바깥에서 좁혀 드는 조준 고리,
//   줄 · 부채꼴은 보스에서 끝으로 흐르는 꺾쇠. 놓은 뒤 맞기 직전에는 고리가 다 좁혀진 채 빠르게 깜빡인다.
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
    const cracks = [], landed = new Set();

    const easeOut = t => 1 - (1 - t) * (1 - t);
    function isLiveWarning(enemy) {
        if (!enemy || !enemy.isBoss || enemy.noAttack || !(enemy.hp > 0) || !enemy.patternArea) return false;
        return !(enemy.ailments || []).some(ailment => ['freeze', 'stun', 'silence'].includes(ailment.type) && ailment.time > 0);
    }
    /** 0..1 through the live warning on the combat clock, null when the boss is not warning. */
    function warningShare(enemy) {
        const started = Number(enemy && enemy.patternTelegraphStartedAt) || 0;
        if (!enemy || !enemy.patternTelegraphKey || !started) return null;
        return clampNumber((getCombatTime() - started) / COMBAT_GRID_CONFIG.bossPatternWarningMs, 0, 1);
    }
    function blink(share, now) {
        if (share < BLINK_FROM) return 1;
        return 0.62 + 0.38 * Math.abs(Math.cos(now * (0.009 + 0.03 * (share - BLINK_FROM))));
    }
    /** Ground warning strength for drawBossPatternArea: 3 when it appears, 7 at release, blinking near the end. */
    function groundAlpha(enemy) {
        const share = warningShare(enemy);
        return share === null ? 3 : (3 + 4 * share) * blink(share, getCombatTime());
    }
    /** A released area that lands within half a second: full strength, blinking fast. */
    function pendingAlpha() {
        return 7 * (0.6 + 0.4 * Math.abs(Math.cos(getCombatTime() * 0.03)));
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
    function drawChevron(ctx, point, dir, size) {
        const back = { x: point.x - dir.x * size, y: point.y - dir.y * size }, side = { x: -dir.y * size, y: dir.x * size };
        ctx.beginPath();
        ctx.moveTo(back.x + side.x, back.y + side.y);
        ctx.lineTo(point.x + dir.x * size * 0.4, point.y + dir.y * size * 0.4);
        ctx.lineTo(back.x - side.x, back.y - side.y);
        ctx.stroke();
    }
    /** Lines and fans start at the boss: a chevron on every cell pointing away from it, a bright band running outward. */
    function drawRays(ctx, footprint, look) {
        if (!look.origin) return;
        ctx.strokeStyle = '#ffd9c2';
        ctx.lineWidth = 2;
        for (const point of footprint.points) {
            const dx = point.x - look.origin.x, dy = point.y - look.origin.y, length = Math.hypot(dx, dy);
            if (length < 1) continue;
            const band = (length / footprint.tileW - look.now * 0.007) % 3;
            ctx.globalAlpha = (0.3 + 0.6 * look.share) * (band < 0 ? band + 3 : band) / 3 * look.blink;
            drawChevron(ctx, point, { x: dx / length, y: dy / length }, footprint.tileW * 0.2);
        }
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
            clipSkillFootprintTerrain(ctx, footprint); // chevrons only where the hero could stand, like the ground fill
            drawRays(ctx, footprint, { ...look, origin: originOf(look.source, projection) });
        } else drawReticle(ctx, footprint, look);
        ctx.restore();
    }
    /** Strokes over the actors for every live and released boss warning (no fill, so the actors stay readable). */
    function drawMarks(ctx, scene) {
        if (!scene || !scene.projection) return;
        const now = getCombatTime();
        for (const { enemy } of scene.layout || []) {
            const share = isLiveWarning(enemy) ? warningShare(enemy) : null;
            if (share !== null) drawMark(ctx, enemy.patternArea, scene.projection, { share, source: enemy, now, blink: blink(share, now) });
        }
        for (const attack of scene.pending || []) {
            if (attack.delivery !== 'patternArea') continue;
            drawMark(ctx, attack.bossPattern.area, scene.projection, { share: 1, source: attack.source, now, blink: pendingAlpha() / 7 });
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
        if (!fx) return null;
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
    function remember(id) {
        landed.add(id);
        if (landed.size > 64) landed.delete(landed.values().next().value);
    }
    /** Once per impact: debris in the boss's element, a crack left on the ground (areas around a point), the slam sound. */
    function land(fx, footprint) {
        remember(fx.id);
        const scale = clampNumber(Math.max(footprint.width, footprint.tileW) / 96, 0.7, 1.6);
        if (typeof attackFxSpawn === 'function') attackFxSpawn(fx.element || 'phys', footprint.x, footprint.y, { variant: 'slam', scale, crit: true });
        if (!RAY_KINDS.has(fx.footprint.kind)) cracks.push({ centre: { ...fx.footprint.center }, cells: Math.max(1, (fx.footprint.radius || 0) * 2 + 1), start: performance.now() });
        if (cracks.length > 6) cracks.shift();
        if (typeof playUiFeedbackSound === 'function') playUiFeedbackSound('hitSlam');
    }
    /** The released area lands: a short flash of the cells, two shockwaves, and (once) debris, crack and sound. */
    function drawImpact(ctx, fx, progress, projection) {
        const footprint = projectSkillFootprint(fx.footprint, projection);
        if (!footprint) return;
        const ms = progress * (Number(fx.duration) || IMPACT_FLASH_MS);
        if (ms < IMPACT_FLASH_MS) drawBossPatternArea(ctx, fx.footprint, projection, (1 - ms / IMPACT_FLASH_MS) * 5);
        drawShockwaves(ctx, footprint, progress, getEnemyTelegraphColor({ ele: fx.element }).edge);
        if (!landed.has(fx.id)) land(fx, footprint);
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

    return { groundAlpha, pendingAlpha, drawMarks, addMotions, spriteOffsetY, drawImpact, drawGround, warningShare };
})();
safeExposeGlobals({ bossAttackView });
