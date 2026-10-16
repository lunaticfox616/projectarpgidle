/** 스킬룬 이펙트의 연결 규칙 셋째 묶음 (2026-10-17 "스킬룬 디렉터 전달" v32. 첫째는 js/canvas-stage-skill-rules.js, 둘째는
 * js/canvas-stage-skill-casts.js): v32가 더한 연결 이름(data/stage-skill-vfx.js gems)을 게임의 사건에 건다. 인계 쪽 시뮬레이터가 그 룬을
 * 쓸 때 연출을 트는 자리와 때를 옮긴 것이고, 그리는 일은 js/canvas-stage-skill-strokes.js와 js/canvas-stage-skill-spells.js가 한다.
 * - 휘두름(swing): 이중 베기의 X자(xcut), 번개 타격의 세로 베기(vcut), 올려 베기(rise), 불사르기의 불길(fan), 얼어붙은 고리(icering).
 * - 맞은 적마다(victim): 올려 베기의 베임 선, 폭발성 타격의 불씨, 서리베기의 안개, 전도성 난격의 휘두름과 번개, 피뢰침의 첫 틱,
 *   공허 가르기에 끌려온 적의 꼬리.
 * - 그림 사건(claim): 참격파, 서리 파동, 부싯돌 베기, 피뢰침, 신성한 단두대, 혹한의 지진, 불씨의 함성, 서리바람 내지르기, 화살비.
 *   옛 그림 표(data/skill-fx-atlas.js)에 없는 새 룬의 사건도 무대에서는 여기로 온다(js/canvas-world-tree-fx.js).
 * - 시전 시작(windup): 부싯돌 베기의 불티. 이동(mobility): 돌진, 도약 강타, 섬머솔트 슬래시. 활을 들면 화살 룬은 마법 화살(bow).
 * 룬의 판정, 대상, 피해는 게임의 것 그대로다: 여기는 사건을 읽기만 한다. 주인공 그림은 움직이지 않는다(코드로 만든 동작 금지).
 */
const stageSkillRunes = (() => {
    const K = stageSkillKit, ST = stageSkillStrokes, SP = stageSkillSpells, WIDE = K.WIDE, DEEP = K.DEEP;
    const seen = new WeakSet();                   // 이미 연출을 건 그림 사건
    const ticks = new Map();                      // "룬:공격 묶음:단계" → { at: 연출을 건 시각, last: 그 단계에서 마지막으로 맞은 적의 자리 }
    const pulled = new Map();                     // 적 id → 공허 가르기가 열릴 때 서 있던 자리
    /** 속성별 타격 묶음(인계의 HIT_POOL): 룬이 타격을 정하지 않았으면 맞을 때마다 그 속성의 것 가운데 하나. */
    const POOL_OF = Object.freeze({ fire: 'fire', cold: 'cold', light: 'light', chaos: 'chaos', prism: 'prism' });
    /** 공용 폭발(별 터짐 등)은 정한 타격으로 치지 않는다(인계의 GENERIC_HIT). */
    const GENERIC_HIT = /^(star_burst|blood_burst|necro_burst|slime_burst|slash_h)(@|$)/;
    const MELEE_KIND = new Set(['strike', 'whirl', 'move']);
    const firstSight = (event, now) => now >= event.at && !seen.has(event) && !!seen.add(event);
    const followEnemy = id => { const enemy = K.enemy(id); return () => (enemy && K.enemy(id) === enemy && enemy.hp > 0 ? K.enemySpot(enemy) : null); };
    const followHero = () => K.heroDrawn();
    /** 근접 공격이 앞으로 닿는 길이(도트): 범위 칸이 주인공에게서 가로로 뻗은 칸 수에 반 칸을 더한다(인계의 shape.b). */
    function runeReach(fx) {
        const cells = (fx.attackFootprint && fx.attackFootprint.cells) || [], hero = game.gridPlayer;
        return (Math.max(1, ...cells.map(cell => Math.abs(cell.gx - hero.gx))) + 0.5) * WIDE;
    }
    /** 그 룬의 단계 사이 시간(ms): 단계 표의 다음 단계가 늦는 만큼. */
    function stageGapMs(gem, index) {
        const stages = (SKILL_DB[gem.meta.name] && SKILL_DB[gem.meta.name].combatPattern && SKILL_DB[gem.meta.name].combatPattern.stages) || [];
        return stages[index + 1] && stages[index] ? stages[index + 1].delayMs - stages[index].delayMs : 0;
    }
    const patternOf = gem => (SKILL_DB[gem.meta.name] && SKILL_DB[gem.meta.name].combatPattern) || {};
    /** 그 사건의 범위 안에 서 있는 살아 있는 적(가까운 차례). */
    function enemiesOn(event, limit) {
        const cells = new Set((event.targetCells || []).map(cell => `${Math.round(cell.gx)},${Math.round(cell.gy)}`)), from = event.sourceCell || K.heroSpot();
        const inside = (game.enemies || []).filter(enemy => enemy.hp > 0 && hasGridCell(enemy) && getGridUnitCells(enemy).some(cell => cells.has(`${cell.gx},${cell.gy}`)));
        return inside.sort((a, b) => getGridUnitDistance(from, a) - getGridUnitDistance(from, b)).slice(0, limit || 99);
    }
    const faceOf = event => { const target = event.targetCells && event.targetCells[0], source = event.sourceCell; return (target && source && Math.sign(target.gx - source.gx)) || K.heroFace(); };
    const relative = (spot, from) => ({ dx: (spot.gx - from.gx) * WIDE, dy: (spot.gy - from.gy) * DEEP });

    // ---------------------------------------------------------------- swings
    /** 코드로 그리는 휘두름: 그렸으면 참(그 룬의 휘두름 클립은 틀지 않는다). */
    function runeSwing(gem, fx, look) {
        const map = gem.map, hero = K.heroSpot(), repeat = Number(fx.repeatIndex) || 0, reach = runeReach(fx);
        if (map.xcut) ST.crossCut(K.at(hero), look.face, reach, repeat);
        else if (map.vcut) ST.vCut(K.at(hero), look.face, reach);
        else if (map.swing === 'rise') ST.riseSwing(K.at(hero), look.face, reach * 0.85, followHero);
        else if (map.fan) runeFan(gem, fx, look);
        else if (map.icering) runeIceRing(fx, look);
        else return !!map.drag;   // 부싯돌 베기는 검기가 떠날 때 휘두른다(runeFlint)
        return true;
    }
    /** 이 룬의 휘두름을 여기서 그리는가. */
    const drawsSwing = gem => !!(gem.map.xcut || gem.map.vcut || gem.map.fan || gem.map.icering || gem.map.swing === 'rise');
    /** 불사르기: 쐐기 끝까지 번지는 불길 앞면과, 무기 앞에서 쐐기 끝 다섯 방향으로 뿜어지는 불길 클립(가운데가 크고 멀리). */
    function runeFan(gem, fx, look) {
        const hero = K.heroSpot(), cone = fx.attackFootprint && fx.attackFootprint.cone, cells = Math.max(1, Math.round(((cone && cone.length) || 3.5) - 0.5)), Lp = cells * WIDE;
        ST.flameFan(K.at(hero), look.face, cells, hero.gx * 31 + hero.gy);
        if (!gem.map.fanFlame) return;
        const sx = look.face * 30, sy = -44;
        [-1, -0.5, 0, 0.5, 1].forEach(k => {
            const ex = look.face * Lp * (0.78 - Math.abs(k) * 0.12), ey = k * (cells / 2) * DEEP * 0.75 - 30, rot = Math.atan2(ey - sy, Math.abs(ex - sx));
            stageSkillVfx.play(gem.map.fanFlame, K.at(hero, sx + look.face * 20, sy), { face: look.face, ramp: look.ramp, delay: Math.abs(k) * 40, scale: 1.25 - Math.abs(k) * 0.3, alpha: 0.9, rot,
                move: { dx: ex - sx - look.face * 20, dy: ey - sy, ms: 300 } });
        });
    }
    /** 얼어붙은 고리: 범위 안에 선 적들의 발밑에 큰 가시가 솟는다. */
    function runeIceRing(fx, look) {
        const hero = K.heroSpot(), radius = Math.max(1, Number(fx.attackFootprint && fx.attackFootprint.radius) || 1);
        const victims = (game.enemies || []).filter(enemy => enemy.hp > 0 && hasGridCell(enemy) && getGridUnitDistance(hero, enemy) <= radius + 0.5).map(enemy => relative(K.enemySpot(enemy), hero));
        SP.iceRing({ at: K.at(hero), face: look.face, radius, victims });
    }

    // ---------------------------------------------------------------- per victim
    /** 맞은 적마다. lead: 이 타격이 그 공격의 휘두름을 냈다(묶음의 첫 타격). */
    function runeVictim(gem, hit, lead) {
        const o = { lead, first: !Number(hit.fx.stageIndex) && !Number(hit.fx.repeatIndex) };
        for (const play of VICTIM_PLAYS) play(gem, hit, o);
    }
    /** 맞은 적마다 볼 것: 그 룬의 연결 이름이 있으면 그 연출을 건다. */
    const VICTIM_PLAYS = Object.freeze([
        (gem, hit, o) => gem.map.swing === 'rise' && o.first && ST.upCut(K.at(hit.victim), hit.look.face, followEnemy(hit.fx.enemyId)),
        (gem, hit, o) => gem.map.fuse && o.lead && ST.fuse(K.at(hit.victim), Math.max(120, stageGapMs(gem, 0)), followEnemy(hit.fx.enemyId)),
        (gem, hit, o) => gem.map.frostmist && o.lead && ST.frostMist(K.at(K.heroSpot()), K.heroFace(), runeReach(hit.fx), Number(hit.fx.enemyId) || 0),
        (gem, hit, o) => gem.map.strike && o.lead && stageSkillVfx.play(gem.map.strike, K.at(hit.victim, 0, K.onGround(gem.map.strike) ? 1 : -46), { face: hit.look.face, ramp: hit.look.ramp, delay: 50 }),
        (gem, hit) => gem.map.wild && runeWildTick(gem, hit),
        (gem, hit) => gem.map.rod && hit.fx.stageKind === 'fieldStart' && gem.map.tick && runeRodTick(gem.map.tick, hit),
        (gem, hit) => gem.map.gash && runeGashPull(hit.fx, hit)
    ]);
    /** 피뢰침의 첫 틱(장판이 서는 순간)에도 그 적에게 번개 금이 튄다(뒤 틱은 지속 타격의 규칙이 튼다). */
    function runeRodTick(ref, hit) {
        stageSkillVfx.play(ref, K.at(hit.victim, 0, K.onGround(ref) ? 0 : -40), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
    }
    /** 전도성 난격: 틱마다 한 번 번갈아 휘두르고, 같은 틱에 맞은 적끼리 번개가 잇고, 앞의 세 적에게 번개가 튄다. 마무리는 크게 내려베고 바닥 방전. */
    function runeWildTick(gem, hit) {
        const fx = hit.fx, index = Number(fx.stageIndex) || 0, key = `${fx.skillName}:${String(fx.damageTextGroupId).split(':')[0]}:${index}`, row = ticks.get(key);
        const count = row ? row.count : 0;
        if (row) runeZap(row.last, hit.victim); else runeWildSwing(gem, hit, index);
        ticks.set(key, { at: hit.now, last: hit.victim, count: count + 1 });
        const refs = gem.map.tickHit || [];
        if (refs.length && count < 3) stageSkillVfx.play(refs[(index + count) % refs.length], K.at(hit.victim, 0, -46), { face: K.heroFace(), ramp: hit.look.ramp, hit: true });
    }
    /** 그 틱의 첫 타격: 휘두름 하나(마무리면 큰 내려베기와 바닥 방전). */
    function runeWildSwing(gem, hit, index) {
        const fin = hit.fx.stageKind === 'channelFinisher', face = K.heroFace(), hero = K.heroSpot(), every = Number(patternOf(gem).intervalMs) || 150;
        for (const [old, value] of ticks) if (hit.now - value.at > 3000 || value.at > hit.now) ticks.delete(old);
        SP.wildSwing({ at: K.at(hero), follow: followHero, k: index, face, reach: fin ? 80 : 62, life: fin ? 300 : every + 40, fin });
        if (fin) SP.discharge(K.at(hero, face * 1.05 * WIDE, 0), 70);
    }
    /** 맞은 적끼리 잇는 짧은 번개(몸 높이, 0.14초, 60ms마다 꺾임이 바뀐다). */
    function runeZap(from, to) {
        const ink = ST.ink('light'), dx = (to.gx - from.gx) * WIDE, dy = (to.gy - from.gy) * DEEP, seed = Math.random() * 1000;
        stageSkillVfx.paint(K.at(from, 0, -50), { life: 140 }, (ctx, t, dot) => {
            ctx.scale(dot, dot); ctx.globalAlpha = 1 - (t / 140) * 0.7; ctx.strokeStyle = ink.c1; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, 0);
            for (let i = 1; i < 6; i++) { const k = i / 6, j = Math.sin(seed + i * 3.1 + Math.floor(t / 60)) * 6; ctx.lineTo(dx * k + j * 0.4, dy * k + j); }
            ctx.lineTo(dx, dy); ctx.stroke();
        });
    }
    /** 공허 가르기: 틈이 열릴 때 선 자리를 적어 두고, 닫히며 벨 때 끌려온 적이 있으면 그 길에 보라 꼬리 세 줄을 남긴다. */
    function runeGashPull(fx, hit) {
        const id = fx.enemyId, stage = Number(fx.stageIndex) || 0;
        if (!stage) { if (pulled.size > 64) pulled.clear(); pulled.set(id, { gx: hit.victim.gx, gy: hit.victim.gy }); return; }
        const from = pulled.get(id);
        pulled.delete(id);
        if (!from || Math.hypot(hit.victim.gx - from.gx, hit.victim.gy - from.gy) < 0.3) return;
        const ink = ST.ink('chaos'), dx = (hit.victim.gx - from.gx) * WIDE, dy = (hit.victim.gy - from.gy) * DEEP, back = Math.sign(dx) * 8;
        stageSkillVfx.paint(K.at(from), { life: 520 }, (ctx, t, dot) => {
            const a = t < 300 ? 0.7 : Math.max(0, 0.7 * (1 - (t - 300) / 220));
            ctx.scale(dot, dot);
            [[-28, ink.c2], [-46, ink.c1], [-64, ink.c2]].forEach(([h, colour], i) => { ctx.globalAlpha = a * (i === 1 ? 1 : 0.6); ctx.fillStyle = colour; ST.line(0, h, dx - back, dy + h, (x, y) => ctx.fillRect(x, y, 1, 1)); });
        });
    }

    // ---------------------------------------------------------------- picture events
    /** 참격파: 큰 베기 선, 바닥을 긁으며 나아가는 칼바람과 그것을 따라가는 연기 물결. */
    function runeSlashWave(gem, event) {
        const from = event.sourceCell, face = faceOf(event), L = Math.max(1, Math.abs(event.targetCells[0].gx - from.gx)) * WIDE, ms = Math.max(120, event.duration);
        ST.slashWave(K.at(from), face, L, ms);
        if (gem.map.smwave) stageSkillVfx.play(gem.map.smwave, K.at(from, face * 40, -26), { face, delay: 40, alpha: 0.7, move: { dx: face * (L - 70), dy: 0, ms: ms + 120 } });
    }
    /** 서리 파동: 파동이 지나는 칸마다 얼음 결정 둘(바닥 앞뒤로). */
    function runeIceTrail(gem, event) {
        const from = event.sourceCell, face = faceOf(event), cells = Math.max(1, Math.round(Math.abs(event.targetCells[0].gx - from.gx))), cellMs = event.duration / cells;
        for (let i = 0; i < cells; i++) [-0.45, 0.4].forEach((k, j) => stageSkillVfx.play(gem.map.iceTrail, K.at(from, face * (i + 0.55 + j * 0.25) * WIDE, k * 0.75 * DEEP),
            { face: (i + j) % 2 ? -face : face, delay: i * cellMs + j * 50, layer: k < 0 ? 'ground' : 'top' }));
    }
    /** 부싯돌 베기: 떠나는 순간 휘두르고, 지나간 바닥이 그을리고, 나는 동안 바닥에 선 초승달 불길이 손 높이보다 낮게 달린다. */
    function runeFlint(gem, event, view, hooks) {
        const elapsed = view.now - event.at, lift = event.aloft ? PROJECTILE_FLIGHT_LIFT : 0;
        if (firstSight(event, view.now)) {
            const from = { gx: event.sourceCell.gx, gy: event.sourceCell.gy + lift }, face = faceOf(event), L = Math.hypot((event.targetCells[0].gx - event.sourceCell.gx) * WIDE, (event.targetCells[0].gy - event.sourceCell.gy) * DEEP);
            hooks.swing(gem, { face, ramp: K.ramp(gem, event.element) });
            ST.scorch(K.at(from), face, event.duration, t => L * Math.min(1, t / Math.max(1, event.duration)));
        }
        if (elapsed < 0 || elapsed >= event.duration) return;
        const spot = K.along(event, elapsed), at = K.screen(view.projection, { gx: spot.gx, gy: spot.gy + lift }), ctx = view.ctx;
        ctx.save(); ctx.translate(Math.round(at.x), Math.round(at.y)); ctx.scale(spot.face * at.dot, at.dot); ctx.imageSmoothingEnabled = false;
        ST.flameWave(ctx, elapsed);
        ctx.restore();
    }
    /** 피뢰침: 검끝에서 번개가 치고, 검끝에 구슬이 맺혀 따라다니고, 틱마다 발밑에 번개 금이 퍼진다. */
    function runeRod(gem, event) {
        const rod = gem.map.rod, hero = K.heroSpot(), face = K.heroFace(), pattern = patternOf(gem), hits = Number(pattern.hits) || 4, every = Number(pattern.intervalMs) || 220;
        stageSkillVfx.play(rod.bolt, K.at(hero, face * 8, -112), { face });
        stageSkillVfx.play(rod.orb, K.at(hero, face * 8, -112), { face, life: hits * every + 120, delay: 60, follow: followHero });
        for (let i = 0; i < hits; i++) stageSkillVfx.play(rod.ring, K.at(hero, 0, -2), { face: i % 2 ? -face : face, layer: 'ground', alpha: 0.8, delay: i * every, follow: followHero });
        return event;
    }
    /** 신성한 단두대: 시전하면 발밑에 날개가, 범위 안 가까운 적들의 머리 위에 표식과 단두대가 서고 칼날이 피해의 순간에 닿는다. 그때 벼락. */
    function runeGuillotineStart(gem, event, now) {
        const face = K.heroFace(), wait = Math.max(0, event.duration - (now - event.at)), map = gem.map;
        if (map.wings) stageSkillVfx.play(map.wings, K.at(event.sourceCell, 0, -30), { face, layer: 'ground', alpha: 0.7 });
        for (const enemy of enemiesOn(event, (SKILL_DB[gem.meta.name] || {}).targets)) {
            const spot = K.enemySpot(enemy);
            if (map.mark) stageSkillVfx.play(map.mark, K.at(spot, 0, K.onGround(map.mark) ? 1 : -46), { face, alpha: 0.85, delay: Math.max(0, wait - 300) });
            SP.guillotine(K.at(spot), Math.max(0, wait - 150));
        }
    }
    function runeGuillotineStrike(gem, event) {
        const face = K.heroFace(), map = gem.map;
        for (const enemy of enemiesOn(event, (SKILL_DB[gem.meta.name] || {}).targets)) {
            const spot = K.enemySpot(enemy);
            if (map.bolt) stageSkillVfx.play(map.bolt, K.at(spot, 0, 1), { face });
            if (map.boltGround) stageSkillVfx.play(map.boltGround, K.at(spot, 0, 1), { face, layer: 'ground', delay: 30 });
        }
    }
    /** 혹한의 지진의 둘째 단계: 친 자리(몸 앞 반 칸)에서 앞 쐐기를 따라 얼음 기둥이 솟는다. */
    function runePillars(gem, event) {
        const face = faceOf(event), from = event.sourceCell, origin = { gx: from.gx + face * 0.5, gy: from.gy };
        const cone = event.footprint && event.footprint.cone, L = Math.max(1, Math.round(((cone && cone.length) || 3.5) - 0.5));
        SP.iceColumns({ at: K.at(origin), face, L, rowMs: gem.map.pillars, victims: enemiesOn(event).map(enemy => relative(K.enemySpot(enemy), origin)) });
    }
    /** 불씨의 함성: 첫 단계에 외침, 불씨 앞면, 둘레 폭발, 타는 바닥을 한 번에 건다(뒤 단계는 바닥이 타는 동안이다). */
    function runeEmber(gem, event) {
        const stages = patternOf(gem).stages || [], total = (stages.length ? stages[stages.length - 1].delayMs : 1200) + 260;
        SP.emberShout({ at: K.at(event.sourceCell), radius: Number(event.footprint && event.footprint.radius) || 2, wave: 90, total, clips: gem.map.ember });
    }
    function runeFrostCone(gem, event) {
        const cone = event.footprint && event.footprint.cone, L = Math.max(1, Math.round(((cone && cone.length) || 4.5) - 0.5));
        SP.frostCone({ at: K.at(event.sourceCell), face: faceOf(event), L, wave: Number(patternOf(gem).waveMsPerCell) || 100, smwave: gem.map.smwave });
    }
    /** 화살비: 첫 단계의 시전에 화살 다섯 발을 쏘아 올리고(떠나는 때에), 첫 단계가 닿을 때 범위에 화살비가 내린다(남은 단계 동안). */
    function runeRainStart(gem, event, now) {
        const stages = patternOf(gem).stages || [], release = Math.max(0, event.duration - ((stages[0] && stages[0].delayMs) || 380) - (now - event.at));
        SP.volleyUp(K.at(event.sourceCell), faceOf(event), release);
    }
    function runeRain(gem, event) {
        const stages = patternOf(gem).stages || [], span = stages.length > 1 ? stages[stages.length - 1].delayMs - stages[0].delayMs : 880, fp = event.footprint || {};
        SP.arrowRain({ at: K.at(fp.center || event.targetCells[0]), face: faceOf(event), radius: Number(fp.radius) || 1, ms: span + 120 });
    }
    /** 그림 사건마다: 처음 볼 때 그 룬의 연출을 건다. */
    const CLAIMS = Object.freeze([
        [map => map.slashwave, { travel: runeSlashWave }],
        [map => map.iceTrail, { travel: runeIceTrail }],
        [map => map.rod, { stage: (gem, event) => (Number(event.stageIndex) ? null : runeRod(gem, event)) }],
        [map => map.mark && map.bolt, { windup: runeGuillotineStart, stage: runeGuillotineStrike }],
        [map => map.pillars, { stage: (gem, event) => (Number(event.stageIndex) ? runePillars(gem, event) : null) }],
        [map => map.ember, { stage: (gem, event) => (Number(event.stageIndex) ? null : runeEmber(gem, event)) }],
        [map => map.frostcone, { stage: runeFrostCone }],
        [map => map.rain, { windup: (gem, event, now) => (Number(event.stageIndex) ? null : runeRainStart(gem, event, now)), stage: (gem, event) => (Number(event.stageIndex) ? null : runeRain(gem, event)) }]
    ]);
    /** @returns {?boolean} 이 룬의 그림 사건을 여기서 맡으면 참(예전 그림은 그리지 않는다), 다루지 않으면 null */
    function runeClaim(gem, event, view, hooks) {
        if (gem.map.drag && event.kind === 'travel') { runeFlint(gem, event, view, hooks); return true; }
        const row = CLAIMS.find(([has]) => has(gem.map));
        if (!row) return null;
        const play = row[1][event.kind];
        if (play && firstSight(event, view.now)) play(gem, event, view.now);
        // 혹한의 지진의 첫 단계(내리찍기)는 휘두름의 규칙이 맡는다
        return gem.map.pillars && event.kind === 'stage' && !Number(event.stageIndex) ? null : true;
    }

    // ---------------------------------------------------------------- windup, movement, bows, hits
    /** 시전 시작: 부싯돌 베기는 타격 전까지 무기 끝이 바닥을 긁어 불티가 튄다. */
    function runeWindup(gem, fx) {
        if (!gem.map.drag) return;
        const hero = K.heroSpot();
        ST.dragSpark(K.at(hero), K.heroFace(), Math.max(200, Number(fx.impactDelayMs) || 0), hero.gx * 13 + hero.gy);
    }
    /** 이 이동 룬의 연출을 여기서 그리는가(돌진, 도약 강타, 섬머솔트 슬래시). */
    const runeMoves = gem => !!(gem.map.charge || gem.map.flip || gem.map.kick || gem.map.impact) && gem.meta.kind === 'move';
    /** 이동 칸의 룬: 박차고 나가는 먼지, 달리는 동안의 공기 활(돌진)이나 무기 궤적(섬머솔트 슬래시), 착지 자리의 충격.
     * @param {{from:object, to:object, ms:?number}} move 떠난 칸, 닿는 칸, 옮겨 가는 시간 */
    function runeMobility(gem, move) {
        const map = gem.map, face = Math.sign(move.to.gx - move.from.gx) || K.heroFace(), ms = Math.max(120, move.ms || 280);
        const follow = followHero;
        if (map.kick) runeKick(map, move, face);
        if (map.charge) SP.charge({ at: K.at(move.from), follow, face, ms });
        if (map.flip) SP.flipTrail({ at: K.at(move.from), follow, face, ms });
        runeLanding(map, move.to, { face, ms });
    }
    /** 착지 자리의 충격 클립들: 도약 강타는 몸 앞 0.6칸, 섬머솔트 슬래시는 0.9칸에서 차례로(첫째는 바닥 층). */
    function runeLanding(map, to, o) {
        [].concat(map.impact || []).forEach((ref, k) => stageSkillVfx.play(ref, K.at(to, o.face * (map.flip ? 0.9 : 0.6) * WIDE + (k === 3 ? o.face * 18 : 0), K.onGround(ref) ? 1 : -30),
            { face: o.face, delay: o.ms + k * 30, layer: k === 0 ? 'ground' : 'top' }));
    }
    /** 박차고 나가는 먼지: 돌진은 등 뒤로 작게, 도약은 발밑에. */
    function runeKick(map, move, face) {
        const charge = !!map.charge;
        stageSkillVfx.play(map.kick, K.at(move.from, charge ? -face * 10 : 0, 1), { face: charge ? -face : face, layer: 'ground', scale: charge ? 0.7 : 0.8, alpha: charge ? 0.6 : 0.7 });
    }
    /** 활을 들고 쏘는 화살 룬의 마법 화살(인계: 활일 때만): { arrow, exp }. 활이 아니거나 정하지 않은 룬이면 null. */
    function runeBow(gem) {
        return gem.map.bow && typeof getEquippedWeaponStance === 'function' && getEquippedWeaponStance() === 'bow' ? gem.map.bow : null;
    }
    /** 활의 발사 섬광 클립(그 속성의 색). */
    const runeBowFlash = (gem, element) => 'p_bow@' + (element === 'phys' ? 'phys' : STAGE_SKILL_VFX.elementRamp[element] || 'phys');
    /** 맞은 적의 타격 클립: 룬이 정한 것(공용 폭발은 빼고), 없으면 속성의 묶음에서 하나. 'none'이면 없다. kind: 근접 갈래면 물리는 근접 묶음. */
    function runeHitRefs(gem, element) {
        const own = Array.isArray(gem.map.hit) ? gem.map.hit[0] : gem.map.hit, pool = STAGE_SKILL_VFX.hitPool;
        if (own === 'none') return [];
        if (own && !GENERIC_HIT.test(own)) return [own];
        if (gem.map.ramp === 'blood') return pool.blood;
        if (element === 'phys' || !POOL_OF[element]) return pool[MELEE_KIND.has(gem.meta.kind) ? 'physM' : 'physR'];
        return pool[POOL_OF[element]];
    }
    function runeHitRef(gem, element) {
        const bow = runeBow(gem);
        if (bow) return bow.exp;
        const refs = runeHitRefs(gem, element);
        return refs.length ? refs[Math.floor(Math.random() * refs.length)] : null;
    }
    return Object.freeze({ swing: runeSwing, drawsSwing, victim: runeVictim, claim: runeClaim, windup: runeWindup, moves: runeMoves, mobility: runeMobility, bow: runeBow, bowFlash: runeBowFlash,
        hitRef: runeHitRef, hitRefs: runeHitRefs });
})();
safeExposeGlobals({ stageSkillRunes });
