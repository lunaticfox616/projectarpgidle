/** 스킬룬 이펙트의 연결 규칙 셋째 묶음 (2026-10-17 "스킬룬 디렉터 전달" v32. 첫째는 js/canvas-stage-skill-rules.js, 둘째는
 * js/canvas-stage-skill-casts.js): v32가 더한 연결 이름(data/stage-skill-vfx.js gems)을 게임의 사건에 건다. 인계 쪽 시뮬레이터가 그 룬을
 * 쓸 때 연출을 트는 자리와 때를 옮긴 것이고, 그리는 일은 js/canvas-stage-skill-strokes.js와 js/canvas-stage-skill-spells.js가 한다.
 * - 휘두름(swing): 이중 베기의 X자(xcut), 번개 타격의 세로 베기(vcut), 올려 베기(rise), 불사르기의 불길(fan), 얼어붙은 고리(icering).
 * - 맞은 적마다(victim): 올려 베기의 베임 선, 폭발성 타격의 불씨, 서리베기의 안개, 피뢰침의 첫 틱,
 *   공허 가르기에 끌려온 적의 꼬리, 단두대의 벼락, 고리의 큰 가시, 지진의 큰 기둥(실제로 맞은 적마다 따로).
 * - 그림 사건(claim): 참격파, 서리 파동, 부싯돌 베기, 피뢰침, 신성한 단두대, 혹한의 지진, 불씨의 함성, 서리바람 내지르기, 화살비.
 *   옛 그림 표(data/skill-fx-atlas.js)에 없는 새 룬의 사건도 무대에서는 여기로 온다(js/canvas-world-tree-fx.js).
 * - 시전 시작(windup): 부싯돌 베기의 불티. 이동(mobility): 돌진, 도약 강타, 섬머솔트 슬래시. 활을 들면 화살 룬은 마법 화살(bow).
 * - 몸이 뜨는 이동(heroAir): 도약 강타는 포물선으로 뛰고 섬머솔트 슬래시는 뛰며 한 바퀴 돈다. 2026-10-17 사용자가 시뮬레이터의 모습대로
 *   이 두 룬만 주인공 그림을 띄우고 돌리게 했다(코드로 만든 동작을 쓰지 않는 규칙의 예외). 다른 룬은 주인공 그림을 움직이지 않는다.
 * 룬의 판정, 대상, 피해는 게임의 것 그대로다: 여기는 사건을 읽기만 한다.
 */
const stageSkillRunes = (() => {
    const K = stageSkillKit, ST = stageSkillStrokes, SP = stageSkillSpells, WIDE = K.WIDE, DEEP = K.DEEP;
    const seen = new WeakSet();                   // 이미 연출을 건 그림 사건
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
    /** 같은 공격 단계의 그림 시작 시각. canvas-world-tree-fx stationaryEvents와 같은 시계이며 그 모듈을 역으로 호출하지 않는다. */
    function stageArtAt(fx) {
        for (let i = battleFx.length - 1; i >= 0 && fx.damageTextGroupId; i--) {
            const row = battleFx[i];
            if (row && row.type === 'combatTravel' && row.damageTextGroupId === fx.damageTextGroupId) return row.start + Math.max(1, row.flightMs || 1);
        }
        return null;
    }
    const ringRadius = fx => Math.max(1, Number(fx.attackFootprint && fx.attackFootprint.radius) || 1);
    /** 그 사건이 나가는 쪽: 옆으로 치는 룬(js/combat-grid.js band)은 대상을 고를 때 정한 쪽, 아니면 대상이 선 쪽, 같은 세로줄이면 주인공이 보는 쪽. */
    const faceOf = event => {
        const band = event.footprint && event.footprint.band, target = event.targetCells && event.targetCells[0], source = event.sourceCell;
        return (band && band.side) || (target && source && Math.sign(target.gx - source.gx)) || K.heroFace();
    };
    /** 옆으로 치는 룬이 덮는 위아래 줄 수(그림을 그만큼 두툼하게 그린다). 아니면 0. */
    const rowsOf = footprint => (footprint && footprint.band ? footprint.band.rows : 0);
    /** 앞으로 그릴 칸 수: 옆으로 치는 룬은 띠의 길이, 아니면 부채꼴 중심선의 길이(모르면 fallback). */
    const reachCellsOf = (footprint, fallback) => (footprint && footprint.band ? footprint.band.reach
        : Math.max(1, Math.round(((footprint && footprint.cone && footprint.cone.length) || fallback) - 0.5)));
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
    /** 불사르기: 쐐기 끝까지 번지는 불길 앞면과, 무기 앞에서 쐐기 끝 다섯 방향으로 뿜어지는 불길 클립(가운데가 크고 멀리). 옆으로 치는 띠면
     * 불길이 첫 칸 안에 위아래 줄까지 번지고 클립도 그 줄들의 몸 높이로 뿜어진다. */
    function runeFan(gem, fx, look) {
        const hero = K.heroSpot(), rows = rowsOf(fx.attackFootprint), cells = reachCellsOf(fx.attackFootprint, 3.5), Lp = cells * WIDE;
        ST.flameFan(K.at(hero), look.face, cells, hero.gx * 31 + hero.gy, rows);
        if (!gem.map.fanFlame) return;
        const sx = look.face * 30, sy = -44, spread = rows ? rows + 0.5 : cells / 2;
        [-1, -0.5, 0, 0.5, 1].forEach(k => {
            const ex = look.face * Lp * (0.78 - Math.abs(k) * 0.12), ey = k * spread * DEEP * 0.75 - 30, rot = Math.atan2(ey - sy, Math.abs(ex - sx));
            stageSkillVfx.play(gem.map.fanFlame, K.at(hero, sx + look.face * 20, sy), { face: look.face, ramp: look.ramp, delay: Math.abs(k) * 40, scale: 1.25 - Math.abs(k) * 0.3, alpha: 0.9, rot,
                move: { dx: ex - sx - look.face * 20, dy: ey - sy, ms: 300 } });
        });
    }
    /** 얼어붙은 고리: 휘두름마다 고리 하나. 실제 피격 대상의 큰 가시는 runeRingHit에서 따로 건다. */
    function runeIceRing(fx, look) {
        SP.iceRing({ at: K.at(K.heroSpot()), face: look.face, radius: ringRadius(fx) });
    }
    /** 첫 단계에 실제로 맞은 적의 큰 가시 셋. 고리를 세운 첫 타격과 같은 프레임에 온다. */
    function runeRingHit(hit) {
        const hero = K.heroSpot();
        SP.iceRingSpikes({ at: K.at(hero), radius: ringRadius(hit.fx), victim: relative(hit.victim, hero) });
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
        (gem, hit) => gem.map.rod && hit.fx.stageKind === 'fieldStart' && gem.map.tick && runeRodTick(gem.map.tick, hit),
        (gem, hit) => gem.map.gash && runeGashPull(hit.fx, hit),
        (gem, hit) => gem.map.icering && !Number(hit.fx.stageIndex) && !Number(hit.fx.repeatIndex) && runeRingHit(hit),
        (gem, hit) => gem.map.pillars && Number(hit.fx.stageIndex) > 0 && !Number(hit.fx.repeatIndex) && runePillarHit(gem, hit),
        (gem, hit) => gem.map.mark && gem.map.bolt && !Number(hit.fx.repeatIndex) && runeGuillotineBolt(gem, hit)
    ]);
    /** 피뢰침의 첫 틱(장판이 서는 순간)에도 그 적에게 번개 금이 튄다(뒤 틱은 지속 타격의 규칙이 튼다). */
    function runeRodTick(ref, hit) {
        stageSkillVfx.play(ref, K.at(hit.victim, 0, K.onGround(ref) ? 0 : -40), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
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
    /** 참격파: 큰 베기 선, 바닥을 긁으며 나아가는 칼바람과 그것을 따라가는 연기 물결. 옆으로 치는 띠면 칼바람이 위아래 줄까지 덮게 높아지고
     * 줄마다 긁힌 자국과 연기 물결이 간다. */
    function runeSlashWave(gem, event) {
        const from = event.sourceCell, face = faceOf(event), rows = rowsOf(event.footprint), ms = Math.max(120, event.duration), L = cellsAhead(event) * WIDE;
        ST.slashWave(K.at(from), face, L, ms, rows);
        if (!gem.map.smwave) return;
        for (let lane = -rows; lane <= rows; lane++) stageSkillVfx.play(gem.map.smwave, K.at(from, face * 40, -26 + lane * DEEP),
            { face, delay: 40 + Math.abs(lane) * 30, alpha: lane ? 0.5 : 0.7, move: { dx: face * (L - 70), dy: 0, ms: ms + 120 } });
    }
    /** 서리 파동: 파동이 지나는 칸마다 얼음 결정(바닥 앞뒤로 둘, 옆으로 치는 띠면 줄마다 하나). */
    function runeIceTrail(gem, event) {
        const from = event.sourceCell, face = faceOf(event), rows = rowsOf(event.footprint), cells = cellsAhead(event), cellMs = event.duration / cells;
        const lanes = rows ? Array.from({ length: rows * 2 + 1 }, (_, i) => (i - rows) * 0.9) : [-0.45 * 0.75, 0.4 * 0.75];
        for (let i = 0; i < cells; i++) lanes.forEach((k, j) => stageSkillVfx.play(gem.map.iceTrail, K.at(from, face * (i + 0.55 + (j % 2) * 0.25) * WIDE, k * DEEP),
            { face: (i + j) % 2 ? -face : face, delay: i * cellMs + j * 50, layer: k < 0 ? 'ground' : 'top' }));
    }
    /** 나아가는 그림이 지나는 칸 수: 띠의 길이, 아니면 대상 칸까지의 가로 칸 수. */
    function cellsAhead(event) {
        const band = event.footprint && event.footprint.band;
        return band ? band.reach : Math.max(1, Math.round(Math.abs(event.targetCells[0].gx - event.sourceCell.gx)));
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
    /** 신성한 단두대: 시전 때 정한 후보들의 머리 위에 표식과 단두대가 선다. 벼락은 실제 피격 사건에서 따로 낸다. */
    function runeGuillotineStart(gem, event, now) {
        const face = K.heroFace(), wait = Math.max(0, event.duration - (now - event.at)), map = gem.map;
        if (map.wings) stageSkillVfx.play(map.wings, K.at(event.sourceCell, 0, -30), { face, layer: 'ground', alpha: 0.7 });
        for (const id of new Set(event.targetIds || [])) {
            const enemy = K.enemy(id);
            if (!enemy || !(enemy.hp > 0)) continue;
            const spot = K.enemySpot(enemy);
            if (map.mark) stageSkillVfx.play(map.mark, K.at(spot, 0, K.onGround(map.mark) ? 1 : -46), { face, alpha: 0.85, delay: Math.max(0, wait - 300) });
            SP.guillotine(K.at(spot), Math.max(0, wait - 150));
        }
    }
    /** 첫 반복의 실제 피격 위치에만 낙뢰를 낸다. 이번 타격으로 쓰러진 적도 같은 연출을 받는다. */
    function runeGuillotineBolt(gem, hit) {
        const face = K.heroFace(), map = gem.map;
        stageSkillVfx.play(map.bolt, K.at(hit.victim, 0, 1), { face });
        if (map.boltGround) stageSkillVfx.play(map.boltGround, K.at(hit.victim, 0, 1), { face, layer: 'ground', delay: 30 });
    }
    /** 혹한의 지진의 둘째 단계: 친 자리(몸 앞 반 칸)에서 앞 쐐기를 따라 얼음 기둥이 솟는다(옆으로 치는 띠면 줄마다). */
    function runePillars(gem, event) {
        const face = faceOf(event), from = event.sourceCell, origin = { gx: from.gx + face * 0.5, gy: from.gy };
        SP.iceColumns({ at: K.at(origin), face, L: reachCellsOf(event.footprint, 3.5), rowMs: gem.map.pillars, rows: rowsOf(event.footprint) });
    }
    /** 실제 피격 대상의 큰 기둥. 전투 틱 때문에 늦게 온 타격은 기본 기둥 열의 시각으로 보정하고, 이미 지났으면 지금부터 온전히 그린다. */
    function runePillarHit(gem, hit) {
        const from = hit.fx.sourceCell, ahead = Math.max(0, Math.abs(hit.victim.gx - from.gx) - 0.5), artAt = stageArtAt(hit.fx);
        const delay = Math.max(0, ahead * gem.map.pillars - (artAt === null ? 0 : hit.now - artAt));
        SP.iceColumn({ at: K.at(hit.victim), delay, face: Math.sign(hit.victim.gx - from.gx) || K.heroFace(), seed: Number(hit.fx.enemyId) || 0 });
    }
    /** 불씨의 함성: 첫 단계에 외침, 불씨 앞면, 둘레 폭발, 타는 바닥을 한 번에 건다(뒤 단계는 바닥이 타는 동안이다). */
    function runeEmber(gem, event) {
        const stages = patternOf(gem).stages || [], total = (stages.length ? stages[stages.length - 1].delayMs : 1200) + 260;
        SP.emberShout({ at: K.at(event.sourceCell), radius: Number(event.footprint && event.footprint.radius) || 2, wave: 90, total, clips: gem.map.ember });
    }
    function runeFrostCone(gem, event) {
        SP.frostCone({ at: K.at(event.sourceCell), face: faceOf(event), L: reachCellsOf(event.footprint, 4.5), wave: Number(patternOf(gem).waveMsPerCell) || 100,
            smwave: gem.map.smwave, rows: rowsOf(event.footprint) });
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
        [map => map.mark && map.bolt, { windup: runeGuillotineStart }], // 타격은 victim이 맡고 단계 사건의 옛 그림은 막는다.
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
    // ---------------------------------------------------------------- airborne hero (도약 강타, 섬머솔트 슬래시)
    let airNow = null;                            // 이번 프레임의 공중 자세(heroAir가 적는다): 공중제비 궤적이 몸 높이를 따라간다
    let airMove = null;                           // 마지막으로 본 이동 표시: 표시 목록이 차서 먼저 밀려나도 공중 시간이 끝날 때까지 쓴다
    /** 몸이 뜨는 이동 룬의 공중 시간(ms, data/skills.js mobilityPattern.airMs), 포물선 높이(도트), 도는 각(인계의 startLeap, startFlip).
     * 공중제비(flip)는 높이 34도트로 한 바퀴, 도약은 거리에 따라 높이가 는다. 아니면 null. 2026-10-20 v42: 주인공 그림의 도약과 공중제비는
     * 그림이 스스로 뛰고 돌아서, 그림이 뜨는 높이(data/stage-characters.js lift)만큼 포물선을 낮추고 공중제비 그림이면 코드로 돌리지 않는다. */
    function runeAir(gem, move) {
        const ms = Number(((SKILL_DB[gem.meta.name] || {}).mobilityPattern || {}).airMs) || 0;
        if (!ms) return null;
        const drawn = heroMotionClip(gem.meta.name);
        return gem.map.flip ? flipAir(ms, drawn) : leapAir(ms, move, drawn);
    }
    const drawnLift = drawn => Number(drawn.clip.lift) || 0;
    function flipAir(ms, drawn) {
        return drawn && drawn.motion === 'flip' ? { ms, arc: Math.max(8, 34 - drawnLift(drawn)), spin: 0 } : { ms, arc: 34, spin: Math.PI * 2 };
    }
    function leapAir(ms, move, drawn) {
        const arc = 38 + Math.hypot((move.to.gx - move.from.gx) * WIDE, (move.to.gy - move.from.gy) * DEEP * 2) * 0.12;
        return { ms, arc: drawn && drawn.motion === 'leap' ? Math.max(12, arc - drawnLift(drawn)) : arc, spin: 0 };
    }
    /** 무대 주인공이 그 룬을 쓸 때 그리는 동작과 그 칸(js/canvas-stage-actors.js motionFor, clipOf). 무대가 아니거나 그 그림이 없으면 null. */
    function heroMotionClip(name) {
        if (typeof stageView !== 'object' || !stageView.enabled() || typeof getStageHeroStance !== 'function') return null;
        const classId = getHeroAppearanceId(), stance = getStageHeroStance(), motion = stageActors.motionFor(name, classId, stance), clip = stageActors.clipOf(classId, stance, motion);
        return clip ? { motion, clip } : null;
    }
    /** 가장 최근의 이동(js/combat.js가 남긴 playerMobility). 목록에서 사라졌으면 마지막으로 본 것. 없으면 null. */
    function latestMobility(now) {
        for (let i = battleFx.length - 1; i >= 0; i--) {
            const fx = battleFx[i];
            if (fx && fx.type === 'playerMobility' && fx.start <= now) { airMove = fx; return fx; }
        }
        return airMove;
    }
    /** 이번 프레임 주인공의 공중 자세: 땅 위 자리(칸, 떠난 칸에서 닿는 칸으로), 높이(도트), 돈 각(라디안, 보는 쪽으로).
     * 가장 최근의 이동이 몸이 뜨는 룬이고 아직 공중이면, 아니면 null. */
    function runeHeroAir(now) {
        const fx = latestMobility(now), gem = fx && fx.skillName && fx.fromCell && fx.toCell ? K.gemOf(fx.skillName) : null;
        const move = gem ? { from: fx.fromCell, to: fx.toCell } : null, air = move ? runeAir(gem, move) : null, k = air ? (now - fx.start) / air.ms : 1;
        airNow = k < 1 ? runeAirPose(move, air, k) : null;
        return airNow;
    }
    function runeAirPose(move, air, k) {
        const face = Math.sign(move.to.gx - move.from.gx) || K.heroFace();
        return { gx: move.from.gx + (move.to.gx - move.from.gx) * k, gy: move.from.gy + (move.to.gy - move.from.gy) * k, lift: air.arc * 4 * k * (1 - k), rot: air.spin * k * face };
    }
    const airLift = () => (airNow ? airNow.lift : 0);
    /** 이 이동 룬의 연출을 여기서 그리는가(돌진, 도약 강타, 섬머솔트 슬래시). */
    const runeMoves = gem => !!(gem.map.charge || gem.map.flip || gem.map.kick || gem.map.impact) && gem.meta.kind === 'move';
    /** 이동 칸의 룬: 박차고 나가는 먼지, 달리는 동안의 공기 활(돌진)이나 무기 궤적(섬머솔트 슬래시), 착지 자리의 충격.
     * @param {{from:object, to:object, ms:?number}} move 떠난 칸, 닿는 칸, 옮겨 가는 시간 */
    function runeMobility(gem, move) {
        // 몸이 뜨는 룬은 공중 시간 동안 날아 그 끝에 내려앉는다(착지 충격도 그때)
        const map = gem.map, face = Math.sign(move.to.gx - move.from.gx) || K.heroFace(), air = runeAir(gem, move), ms = air ? air.ms : Math.max(120, move.ms || 280);
        const follow = followHero;
        if (map.kick) runeKick(map, move, face);
        if (map.charge) SP.charge({ at: K.at(move.from), follow, face, ms });
        if (map.flip) SP.flipTrail({ at: K.at(move.from), follow, face, ms, lift: airLift });
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
        hitRef: runeHitRef, hitRefs: runeHitRefs, heroAir: runeHeroAir });
})();
safeExposeGlobals({ stageSkillRunes });
