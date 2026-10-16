/** 스킬 이펙트의 연결 규칙 둘째 묶음 (첫째는 js/canvas-stage-skill-rules.js): 투사체의 몸, 따로 시전하는 룬, 이동기, 위습.
 * - 투사체의 몸: 날아가는 사건(travel)마다 인계의 그림(속성 장식이 붙은 창, 쌍독니, 도는 방패, 화살, 던지는 플라스크)을 그 자리에 그린다.
 *   곧게 나는 것은 손 높이로, 던지는 플라스크는 포물선으로 난다.
 * - 따로 시전하는 룬(js/skill-gem-casts.js): 사건에 적힌 단계 이름마다 인계의 클립과 연출을 튼다. 탄성 플라스크(튕길 때마다 중독 폭발),
 *   신성한 기도(빛의 창), 폭발 혼합물, 과냉각 혼합물, 빈 플라스크(깨지는 병과 날아가는 유리 조각), 신성한 안개, 암살, 차원찢기(우주 구체),
 *   향로구름. 시간 가속과 파문심판은 인계도 게임의 옛 그림을 쓴다.
 * - 이동기: 그림자 점멸의 연기, v32의 돌진, 도약 강타, 섬머솔트 슬래시(js/canvas-stage-skill-runes.js). 주인공이 사라지고 나타나는
 *   움직임은 게임의 것 그대로다. 활을 들고 쏘는 화살 룬은 몸 대신 마법 화살 클립이 난다.
 * - 위습: 소환된 위습의 몸과 쏘는 구슬을 그 속성의 클립으로 그린다.
 * 새 연출이 맡은 단계는 참을, 예전 그림에 맡기는 단계는 거짓을, 여기서 다루지 않는 사건은 null을 돌려준다. 읽기만 한다.
 */
const stageSkillCasts = (() => {
    const K = stageSkillKit, WIDE = K.WIDE, DEEP = K.DEEP;
    const seen = new WeakSet();                   // 이미 클립으로 옮긴 사건
    /** 투사체의 몸: 룬 번호 → 인계의 생김새(js/canvas-stage-skill-draws.js). */
    const BODIES = Object.freeze({ 7: 'spear', 9: 'spear', 11: 'spear', 26: 'spear', 30: 'bigspear', 14: 'arrow', 25: 'arrow',
        38: 'flask', 44: 'flask', 47: 'flask', 48: 'flask', 49: 'flask' });
    /** 따로 시전하는 룬의 사건에서 단계 이름이 적힌 칸. */
    const PHASE_KEYS = Object.freeze(['flaskPhase', 'lancePhase', 'mixturePhase', 'supercooledPhase', 'emptyFlaskPhase', 'holyMistPhase', 'assassinationPhase',
        'causalityPhase', 'riftPhase', 'smokePhase', 'harpoonPhase', 'timePhase', 'judgmentPhase']);
    /** 위습이 쏜 구슬이 맞을 때의 타격 클립(속성별). */
    const WISP_HIT = Object.freeze({ fire: 'h_fire@fire', cold: 'h_ice@cold', light: 'h_lit@light', chaos: 'h_chaos@chaos', phys: 'h_xs@phys' });
    /** 제 때가 된 사건을 처음 보는가(때가 되기 전에 알려진 사건은 아직 틀지 않는다). */
    const castFirst = c => c.view.now >= c.event.at && !seen.has(c.event) && !!seen.add(c.event);
    /** 클립을 그 칸에 세운다: 바닥 기준 클립은 발 자리, 가운데 기준 클립은 몸 높이. */
    function castStand(ref, spot, o) {
        return stageSkillVfx.play(ref, K.at(spot, o.dx || 0, K.onGround(ref) ? 1 : -46), o);
    }

    // ---------------------------------------------------------------- projectile bodies
    /** 던진 플라스크: 손에서 포물선으로 날아 땅에 닿는다. 바닥에 그림자가 따라간다. */
    function castDrawLob(c, look) {
        const event = c.event, k = Math.max(0, Math.min(1, (c.view.now - event.at) / Math.max(1, event.duration)));
        const from = event.sourceCell, to = event.landingCell || event.targetCells[0], far = Math.hypot((to.gx - from.gx) * WIDE, (to.gy - from.gy) * DEEP * 2);
        const at = K.screen(c.view.projection, { gx: from.gx + (to.gx - from.gx) * k, gy: from.gy + (to.gy - from.gy) * k }), ctx = c.view.ctx;
        // 같은 적에게 다시 튀는 플라스크(탄성 플라스크)는 제자리에서 높이 튄다
        const height = (1 - k) * 55 + Math.sin(k * Math.PI) * (far < 8 ? 44 : 24 + far * 0.12);
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,12,0.35)';
        ctx.beginPath(); ctx.ellipse(Math.round(at.x), Math.round(at.y) + 1, 11 * at.dot, 3 * at.dot, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        stageSkillDraws.body(ctx, look, { x: at.x, y: at.y - height * at.dot, dot: at.dot, face: 1, t: c.view.now - event.at, element: c.element });
    }
    /** 곧게 나는 투사체: 길을 따라 손 높이로 날고, 나아가는 쪽을 보며 깊이 쪽으로 가면 그만큼 기운다. 쏜 자리의 몸 앞면보다 뒤쪽은
     * 그리지 않는다(K.emerge): 창 자루가 등 뒤에서부터 보이지 않고 몸 앞에서 나온다. */
    function castDrawShot(c, look) {
        const event = c.event, elapsed = c.view.now - event.at, spot = K.along(event, elapsed), lift = event.aloft ? PROJECTILE_FLIGHT_LIFT : 0;
        const at = K.screen(c.view.projection, { gx: spot.gx, gy: spot.gy + lift }), ctx = c.view.ctx;
        const angle = Math.atan2((spot.to.gy - spot.from.gy) * DEEP, Math.abs(spot.to.gx - spot.from.gx) * WIDE);
        ctx.save();
        K.emerge(ctx, c.view.projection, event);
        stageSkillDraws.body(ctx, look, { x: at.x, y: at.y + K.HAND * at.dot, dot: at.dot, face: spot.face, angle, t: elapsed, element: c.element });
        ctx.restore();
    }
    /** 활로 쏜 마법 화살: 몸 대신 그 화살 클립이 손 높이로 나아가는 쪽을 보며 난다. */
    function castDrawArrow(c, ref) {
        const event = c.event, elapsed = c.view.now - event.at, spot = K.along(event, elapsed), lift = event.aloft ? PROJECTILE_FLIGHT_LIFT : 0;
        const at = K.screen(c.view.projection, { gx: spot.gx, gy: spot.gy + lift }), ctx = c.view.ctx;
        const rot = Math.atan2((spot.to.gy - spot.from.gy) * DEEP, Math.abs(spot.to.gx - spot.from.gx) * WIDE);
        ctx.save();
        K.emerge(ctx, c.view.projection, event);
        stageSkillVfx.stamp(ctx, ref, elapsed, { x: at.x, y: at.y + K.HAND * at.dot, dot: at.dot, face: spot.face, rot, ramp: c.look.ramp });
        ctx.restore();
    }
    /** 날아가는 사건 하나: 처음 볼 때 발사 섬광(활이면 활의 섬광)을 틀고, 나는 동안 프레임마다 몸을 그린다. */
    function castBody(c) {
        const look = BODIES[c.gem.id], elapsed = c.view.now - c.event.at, bow = stageSkillRunes.bow(c.gem);
        const flash = bow ? stageSkillRunes.bowFlash(c.gem, c.element) : c.gem.map.muzzle;
        if (c.first && flash) stageSkillVfx.play(flash, K.at(K.heroSpot(), c.look.face * (bow ? 30 : 26), bow ? -54 : -52), c.look);
        if (elapsed < 0 || elapsed >= c.event.duration) return true;
        if (bow) castDrawArrow(c, bow.arrow);
        else if (look === 'flask') castDrawLob(c, look);
        else castDrawShot(c, look);
        return true;
    }

    // ---------------------------------------------------------------- natively cast gems
    const castTake = () => true;
    /** 떨어진 자리의 클립(탄성 플라스크의 연기, 빈 플라스크의 유리 조각). */
    function castLand(c) {
        const ref = c.gem.map.land, spot = c.event.landingCell;
        if (c.first && ref) stageSkillVfx.play(ref, K.at(spot, 0, K.onGround(ref) ? 1 : -8), { ...c.look, layer: K.onGround(ref) ? 'ground' : 'top' });
        return true;
    }
    /** 탄성 플라스크가 떨어진 자리: 연기와, 튕길 때마다 터지는 작은 중독 폭발. */
    function castSplash(c) {
        if (c.first && c.gem.map.pop) stageSkillVfx.play(c.gem.map.pop, K.at(c.event.landingCell, 0, -46), { face: Math.random() < 0.5 ? 1 : -1, ramp: c.look.ramp, delay: 30 });
        return castLand(c);
    }
    /** 신성한 기도: 손에서 빛이 터지고, 범위 안의 적마다 빛의 창이 하늘에서 내리꽂혀 피해의 순간에 박힌다(꽂힌 자리에서 번개가 튄다). */
    function castLances(c) {
        if (!c.first) return true;
        const map = c.gem.map, wait = Math.max(0, c.event.duration - 170);
        if (map.cast) stageSkillVfx.play(map.cast, K.at(K.heroSpot(), c.look.face * 22, -62), c.look);
        c.event.targetCells.forEach(cell => stageSkillSpells.fallSpear({ at: K.at(cell), delay: wait, element: c.element, hit: map.spearHit, ramp: c.look.ramp }));
        return true;
    }
    /** 폭발 혼합물: 떨어진 자리에서 터진다. */
    function castBurst(c) {
        if (c.first) stageSkillVfx.play(c.gem.map.area, K.at(c.event.landingCell, 0, -30), c.look);
        return true;
    }
    /** 과냉각 혼합물: 떨어진 자리에서 얼음 터짐이 고리 셋으로 퍼져 나간다. */
    function castRings(c) {
        if (!c.first) return true;
        const gap = Number(c.event.ringInterval) || 260, centre = c.event.landingCell;
        for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 5; i++) {
            const angle = i / 5 * Math.PI * 2 + ring, a = (ring + 1.5) * WIDE * 0.85, b = (ring + 1.5) * DEEP * 0.85;
            stageSkillVfx.play(c.gem.map.area, K.at(centre, Math.cos(angle) * a, Math.sin(angle) * b - 30), { ...c.look, delay: ring * gap + i * 25, alpha: 0.85 });
        }
        return true;
    }
    /** 신성한 안개: 향로를 든 손에서 안개가 세 번 뿜어져 둘레 여섯 방향으로 흘러 나간다. */
    function castMist(c) {
        if (!c.first) return true;
        const hero = c.event.holySource || K.heroSpot(), reach = (Number(c.event.holyRadius) || 1) + 0.5, hand = [c.look.face * 16, -56];
        for (let burst = 0; burst < 3; burst++) for (let k = 0; k < 6; k++) {
            const angle = k / 6 * Math.PI * 2 + burst * 0.5, x = Math.cos(angle) * reach * WIDE * 0.95, y = -16 + Math.sin(angle) * reach * DEEP * 0.95;
            stageSkillVfx.play(c.gem.map.mist, K.at(hero, hand[0], hand[1]), { ramp: c.look.ramp, face: x < 0 ? -1 : 1, delay: burst * 230 + k * 30, alpha: 0.5,
                move: { dx: x - hand[0], dy: y - hand[1], ms: 620 } });
        }
        return true;
    }
    /** 암살: 사라진 자리의 흙먼지, 나타난 자리의 흙먼지와 착지 먼지, 그리고 가는 급소 베기. */
    function castVanish(c) {
        if (c.first) castStand(c.gem.map.smoke, c.event.blinkCell, c.look);
        return true;
    }
    function castArrive(c) {
        if (!c.first) return true;
        castStand(c.gem.map.smoke, c.event.blinkCell, c.look);
        stageSkillVfx.play(c.gem.map.land, K.at(c.event.blinkCell, 0, 1), { ...c.look, layer: 'ground' });
        return true;
    }
    function castSlash(c) {
        if (!c.first) return true;
        const ref = c.gem.map.swing, from = c.event.sourceCell, face = Math.sign(c.event.landingCell.gx - from.gx) || K.heroFace();
        stageSkillVfx.play(ref, K.at(from, face * Math.max(34, stageSkillVfx.clipWidth(ref) / 2 - 26), K.BODY), { ramp: c.look.ramp, face });
        return true;
    }
    /** 빈 플라스크가 깨지는 자리: 흰 십자 반짝임과 튀었다 떨어지는 작은 유리 조각. */
    function castShatter(c) {
        if (c.first) stageSkillSpells.glassBreak(K.at(c.event.landingCell));
        return true;
    }
    /** 빈 플라스크의 유리 파편 하나: 깨진 자리에서 둘레의 적에게 포물선으로 날아가 꽂힌다. */
    function castShard(c) {
        const from = c.event.sourceCell, to = c.event.targetCells[0];
        if (c.first) stageSkillSpells.glassShard({ at: K.at(from), to: { dx: (to.gx - from.gx) * WIDE, dy: (to.gy - from.gy) * DEEP }, k: Number(c.event.projectileIndex) || 0, ms: Math.max(1, c.event.duration), hit: true });
        return true;
    }
    /** 차원찢기: 떠나는 자리의 우주 구체가 오그라들며 닫히고, 닿는 자리에 구체가 열렸다 닫히고, 닿은 자리에서 크게 부풀며 터진다. */
    function castRift(c) {
        if (!c.first) return true;
        const move = c.event.move, at = c.event.at, radius = Number(c.event.footprint && c.event.footprint.radius) || 1;
        stageSkillSpells.cosmos({ at: K.at(move.from), R: 40, delay: Math.max(0, move.tear - at), life: 440, mode: 'close' });
        stageSkillSpells.cosmos({ at: K.at(move.to), R: 40, delay: Math.max(0, move.openB - at), life: 380, mode: 'open' });
        stageSkillSpells.cosmos({ at: K.at(move.to), R: Math.min(110, (radius + 0.5) * WIDE * 0.75), delay: Math.max(0, move.burst - at), life: 520, mode: 'burst' });
        return true;
    }
    /** 향로구름: 떠나는 자리와 닿는 자리에 연막이 차례로 핀다. */
    function castSmoke(c) {
        if (!c.first) return true;
        const move = c.event.move, at = c.event.at;
        castStand(c.gem.map.smoke, move.from, { ...c.look, delay: Math.max(0, move.puff - at) });
        castStand(c.gem.map.smoke, move.to, { ...c.look, delay: Math.max(0, move.puffB - at) });
        return true;
    }
    /** 작살화살: 쏘는 순간의 발사 섬광만 더한다. 작살과 밧줄, 끌려가는 움직임은 게임의 그림이 그린다. */
    function castHarpoon(c) {
        const move = c.event.move, face = Math.sign(move.foe.gx - move.from.gx) || K.heroFace();
        if (c.first && c.gem.map.muzzle) stageSkillVfx.play(c.gem.map.muzzle, K.at(move.from, face * 26, -52), { ramp: c.look.ramp, face, delay: Math.max(0, move.release - c.event.at) });
        return false;
    }
    /** 룬 번호 → 단계 이름 → 그 단계의 연출. 여기에 없는 단계는 예전 그림이 그린다. */
    const NATIVE = Object.freeze({
        44: { flight: castBody, splash: castSplash },
        45: { fall: castLances, land: castTake },
        47: { flight: castBody, burst: castBurst },
        48: { flight: castBody, wave: castRings },
        49: { flask: castBody, shard: castShard, shatter: castShatter },
        50: { censer: castTake, mist: castMist, debuff: castTake },
        52: { vanish: castVanish, arrive: castArrive, slash: castSlash },
        54: { move: castRift },
        55: { move: castSmoke },
        56: { move: castHarpoon }
    });

    // ---------------------------------------------------------------- movement gems
    /** 그림자 점멸: 떠난 자리와 나타난 자리에 연기가 핀다. */
    function castBlink(c, from, to) {
        castStand(c.gem.map.smoke, from, c.look);
        castStand(c.gem.map.land, to, { ...c.look, delay: 100 });
    }
    /** 이동하는 사건(mobility): 돌진, 도약 강타, 섬머솔트 슬래시(js/canvas-stage-skill-runes.js)와 그림자 점멸은 새 연출이, 암살은 제 단계가 그린다. */
    function castMobility(c) {
        const move = { from: c.event.sourceCell, to: c.event.targetCells[0], ms: c.event.glideMs }, runes = stageSkillRunes.moves(c.gem);
        if (c.first && runes) stageSkillRunes.mobility(c.gem, move);
        else if (c.first && c.gem.id === 40) castBlink(c, move.from, move.to);
        return runes || c.gem.id === 40 || !!NATIVE[c.gem.id];
    }

    // ---------------------------------------------------------------- claim
    const castPhase = event => { const key = PHASE_KEYS.find(name => event[name]); return key ? event[key] : null; };
    /** @returns {?boolean} 새 연출이 맡았으면 참, 예전 그림에 맡기면 거짓, 여기서 다루지 않는 사건이면 null */
    /** 사건 하나를 그릴 때 쓰는 묶음: 룬, 속성, 바라보는 쪽과 색. */
    function castContext(gem, event, view) {
        const target = event.landingCell || (event.targetCells && event.targetCells[0]), source = event.sourceCell || K.heroSpot();
        const face = (target && Math.sign(target.gx - source.gx)) || K.heroFace(), element = event.element || gem.meta.el;
        return { gem, event, view, element, first: false, look: { face, ramp: K.ramp(gem, element) } };
    }
    /** 따로 시전하는 룬의 단계 하나: 표에 있으면 그 연출이, 없으면 예전 그림이 맡는다. */
    function castNativePhase(c, phase) {
        const play = (NATIVE[c.gem.id] || {})[phase];
        if (!play) return false;
        c.first = castFirst(c);
        return play(c);
    }
    function castClaim(gem, event, view) {
        const phase = castPhase(event), c = castContext(gem, event, view);
        if (phase) return castNativePhase(c, phase);
        const moving = event.kind === 'mobility';
        if (!moving && !(event.kind === 'travel' && BODIES[gem.id])) return null;
        c.first = castFirst(c);
        return moving ? castMobility(c) : castBody(c);
    }

    // ---------------------------------------------------------------- wisps
    /** 소환된 위습의 몸: 그 속성의 구슬이 몸 높이에서 조금씩 오르내린다. @returns {?number} 그린 몸의 맨 위(화면 y). 새 그림이 없으면 null */
    function wispBody(ctx, summon, at, view) {
        const gem = stageSkillVfx.ready() ? K.gemOf(summon.gemName) : null;
        if (!gem || !gem.map.body) return null;
        const dot = stageActors.scaleFor(view.proj.tileW), phase = (Number(summon.id) || 0) * 0.7, bob = Math.round(Math.sin(view.now / 260 + phase) * 3);
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,12,0.3)';
        ctx.fillRect(Math.round(at.x - 5 * dot), Math.round(at.y + dot), Math.round(11 * dot), Math.max(1, Math.round(2 * dot)));
        stageSkillVfx.stamp(ctx, gem.map.body, view.now + phase * 500, { x: at.x, y: at.y + (bob - 76) * dot, dot, face: K.heroFace(), ramp: K.ramp(gem, gem.meta.el) });
        ctx.restore();
        return at.y - 96 * dot;
    }
    /** 위습이 쏜 한 발: 구슬이 위습에게서 대상의 몸으로 날아가 닿는 자리에 속성 타격이 붙는다. */
    function wispShot(fx, gem) {
        const from = { gx: fx.sourceGx, gy: fx.sourceGy }, to = { gx: fx.targetGx, gy: fx.targetGy }, rule = (WISP_SUMMONS[fx.gemName] || {}).flight || { base: 120, perDot: 0 };
        const dx = (to.gx - from.gx) * WIDE, dy = (to.gy - from.gy) * DEEP, ms = Math.max(120, rule.base + rule.perDot * Math.hypot(to.gx - from.gx, to.gy - from.gy) * 16);
        const element = gem.meta.el === 'prism' ? ['fire', 'cold', 'light'][(Number(fx.id) || 0) % 3] : gem.meta.el, ramp = STAGE_SKILL_VFX.elementRamp[element] || 'phys';
        stageSkillVfx.play(gem.map.shot, K.at(from, 0, -72), { ramp, face: Math.sign(dx) || 1, life: ms, move: { dx, dy: dy + 22, ms } });
        stageSkillVfx.play(WISP_HIT[element] || WISP_HIT.phys, K.at(to, 0, K.BODY), { ramp, face: Math.sign(dx) || 1, delay: ms, hit: true });
    }
    /** 위습들의 공격을 새 클립으로 옮긴다(공격마다 한 번). @returns {boolean} 새 그림이 맡았는지(맡았으면 예전 위습 공격 그림은 그리지 않는다) */
    function wispShots(now) {
        if (!stageSkillVfx.ready()) return false;
        for (const fx of battleFx) {
            if (!fx || fx.type !== 'summonAttack' || fx.start > now || seen.has(fx)) continue;
            const gem = K.gemOf(fx.gemName);
            seen.add(fx);
            if (gem && gem.map.shot && Number.isFinite(fx.targetGx)) wispShot(fx, gem);
        }
        return true;
    }
    /** 위습의 한 발이 닿는 자리에 붙는 타격 클립(그 속성의 것). */
    const wispHit = element => WISP_HIT[element] || WISP_HIT.phys;
    return Object.freeze({ claim: castClaim, wispBody, wispShots, wispHit });
})();
safeExposeGlobals({ stageSkillCasts });
