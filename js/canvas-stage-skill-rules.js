/** 스킬 이펙트의 연결 규칙: 게임의 스킬 사건을 인계 받은 클립으로 옮긴다 (data/stage-skill-vfx.js의 gems, 재생은
 * js/canvas-stage-skill-vfx.js). 인계 쪽 시뮬레이터가 젬을 쓸 때 클립을 트는 자리와 때를 게임의 사건에 맞춰 옮긴 것이다.
 * 게임이 주는 사건은 셋이다.
 * - 시전 시작(js/canvas-world-tree-fx.js swing: 주인공이 스킬을 쓰기 시작한 순간): 시전 마법진(주문, 위습, 시전과 집중 슬롯의 젬).
 * - 맞은 적마다(js/canvas-battlefield.js queueSkillGemVfx): 휘두름(한 번의 공격에 한 번), 맞은 적의 타격 클립, 연쇄 번개, 지속 타격.
 * - 그림 사건(js/canvas-world-tree-fx.js renderEvent: 예비 windup, 날아가는 travel, 닿는 stage): 범위 클립, 여진, 낙하, 파동, 발사 섬광.
 *   그 젬의 그때를 새 클립이 맡으면 참을 돌려 예전 그림을 대신한다. 맡지 않는 것(투사체의 몸, 룬 지뢰와 시계처럼 게임이 이미 가진
 *   그림, 이동기와 위습, 인계에서 빠진 젬)은 예전 그림이 그대로 그린다.
 * 젬의 판정, 대상, 피해는 게임의 것 그대로다: 여기는 사건을 읽기만 한다.
 */
const stageSkillRules = (() => {
    const WIDE = 64, DEEP = 32;                   // 한 칸의 도트
    const REACH = 80;                             // 근접 휘두름이 닿는 거리(도트, 인계의 1.25칸)
    const BODY = -50;                             // 몸 가운데 높이(발에서, 도트)
    const handled = new WeakSet();                // 이미 클립으로 옮긴 사건
    const swung = new Map();                      // "젬:공격 묶음:반복" → 휘두름을 튼 시각
    const struck = new Map();                     // 적 id → 타격 클립을 붙인 시각
    let lastFace = 1;
    /** 속성별 기본 타격 클립(젬이 타격을 정하지 않았을 때). 물리는 근접이면 X 섬광, 아니면 작은 가시 고리. */
    const ELEMENT_HIT = Object.freeze({ fire: 'h_fire@fire', cold: 'h_ice@cold', light: 'h_lit@light', chaos: 'h_chaos@chaos' });
    /** 근접 젬이 휘두름을 정하지 않았을 때 쓰는 클립. */
    const PLAIN_SWING = 'crescent';
    /** 게임이 이미 가진 그림을 그대로 쓰는 갈래: 이동기, 위습, 튕기는 플라스크. */
    const OWN_ART = new Set(['move', 'wisp', 'bounce']);
    /** 닿는 순간(stage)을 새 클립이 맡게 하는 훅. */
    const STAGE_HOOKS = Object.freeze(['shout', 'suck', 'area', 'ring', 'area2', 'land', 'seep', 'drop', 'orb']);

    // ---------------------------------------------------------------- which gem, where
    function ruleGemOf(skillName) {
        const spec = SKILL_FX_ATLAS[skillName], map = spec ? STAGE_SKILL_VFX.gems[spec.id] : null;
        return map ? { id: spec.id, map, meta: STAGE_SKILL_VFX.meta[spec.id] } : null;
    }
    const ruleRamp = (gem, element) => gem.map.ramp || STAGE_SKILL_VFX.elementRamp[element] || STAGE_SKILL_VFX.elementRamp[gem.meta.el] || 'phys';
    const ruleRef = (value, index = 0) => (Array.isArray(value) ? value[index % value.length] : value);
    const ruleOnGround = ref => { const clip = stageSkillVfx.clipOf(ref); return !!clip && clip.an === 'bottom'; };
    const ruleHeroSpot = () => ({ gx: game.gridPlayer.gx, gy: game.gridPlayer.gy });
    const ruleEnemy = id => (game.enemies || []).find(unit => unit.id === id && hasGridCell(unit)) || null;
    /** 적이 선 자리: 몸의 가로 가운데와 앞줄. */
    function ruleEnemySpot(enemy) {
        const size = getGridUnitFootprint(enemy);
        return { gx: enemy.gx + (size.columns - 1) / 2, gy: enemy.gy + size.rows - 1 };
    }
    /** 맞은 적이 선 자리: 살아 있으면 그 몸, 아니면 맞은 칸. */
    function ruleVictimSpot(fx) {
        const enemy = ruleEnemy(fx.enemyId);
        return enemy ? ruleEnemySpot(enemy) : { gx: fx.targetCell.gx, gy: fx.targetCell.gy };
    }
    /** 주인공이 보는 쪽(1 오른쪽, -1 왼쪽): 가장 가까운 적 쪽. 적이 없으면 마지막으로 친 쪽. */
    function ruleHeroFace() {
        const hero = game.gridPlayer, far = unit => Math.abs(unit.gx - hero.gx) + Math.abs(unit.gy - hero.gy);
        const living = (game.enemies || []).filter(unit => unit.hp > 0 && hasGridCell(unit)).sort((a, b) => far(a) - far(b));
        return (living.length && Math.sign(getGridUnitCenter(living[0]).gx - hero.gx)) || lastFace;
    }
    const ruleAt = (spot, dx = 0, dy = 0) => ({ gx: spot.gx, gy: spot.gy, dx, dy });
    function ruleForget(map, now, age) { for (const [key, time] of map) if (now - time > age || time > now) map.delete(key); }

    // ---------------------------------------------------------------- swing, chop, impact
    /** 휘두름 클립이 몸에서 놓이는 자리: 가운데 기준 클립은 몸 높이 앞쪽, 왼쪽 기준은 몸 바로 앞, 바닥 기준은 발 앞. */
    function ruleSwingOffset(ref) {
        const clip = stageSkillVfx.clipOf(ref), half = stageSkillVfx.clipWidth(ref) / 2;
        if (clip.an === 'left') return [6, BODY];
        return clip.an === 'bottom' ? [Math.max(REACH * 0.55, half - 20), 4] : [Math.max(REACH * 0.42, half - 26), BODY];
    }
    /** 내려찍기: 클립을 돌려 머리 위에서 가속하며 떨어뜨리고, 닿는 자리에 바닥 클립을 차례로 튼다. */
    function rulePlayChop(gem, ref, look) {
        const hero = ruleHeroSpot(), chop = gem.map.chop, half = stageSkillVfx.clipWidth(ref) / 2, ms = Math.min(110, Math.max(80, stageSkillVfx.clipLength(ref) * 0.4));
        stageSkillVfx.play(ref, ruleAt(hero, look.face * (Math.max(REACH * 0.5, half - 10) + (chop.dx || 0)), 0),
            { face: look.face, ramp: look.ramp, rot: chop.rot * Math.PI / 180, fall: { from: chop.from, to: chop.to, ms } });
        const reach = look.face * Math.max(REACH * 0.6, 50);
        [].concat(gem.map.impact || []).forEach((impact, index) => {
            const nudge = index === 1 && chop.ground ? look.face * 14 : 0;
            stageSkillVfx.play(impact, ruleAt(hero, reach + nudge, ruleOnGround(impact) ? 1 : -30),
                { face: look.face, ramp: look.ramp, delay: ms + index * 30, layer: index ? 'top' : 'ground', rot: impact.startsWith('lavaw') ? -1.15 : 0 });
        });
    }
    /** 한 번의 공격에 한 번: 그 젬의 휘두름(여러 개면 반복마다 번갈아), 회전, 내려찍기. 둘째 타격은 조금 늦게 나간다. */
    function rulePlaySwing(gem, fx, look) {
        const hero = ruleHeroSpot(), repeat = Number(fx.repeatIndex) || 0;
        if (gem.map.spin) { stageSkillVfx.play(gem.map.spin, ruleAt(hero, 0, -42), { face: look.face, ramp: look.ramp, life: 420 }); return; }
        const ref = gem.map.swing ? ruleRef(gem.map.swing, repeat) : PLAIN_SWING;
        if (gem.map.chop) { rulePlayChop(gem, ref, look); return; }
        const [dx, dy] = ruleSwingOffset(ref);
        stageSkillVfx.play(ref, ruleAt(hero, look.face * dx, dy), { face: look.face, ramp: look.ramp, delay: repeat * 110 });
    }
    /** 휘두름을 새 클립으로 그리는 젬인가: 휘두름이나 회전 클립이 정해졌거나, 정해지지 않은 근접 젬(기본 클립). 휘두름을 끈 젬과
     * 코드로 그리는 찌르기(혈기 폭쇄), 이동기는 게임의 그림을 그대로 쓴다. */
    function ruleSwings(gem) {
        const swing = gem.map.swing;
        if (gem.meta.kind === 'move' || swing === 'none' || swing === 'pierce') return false;
        return !!gem.map.spin || !!swing || gem.meta.melee;
    }
    /** 첫 타격인가: 연쇄가 건너뛴 타격, 파동의 뒤 단계, 여진은 휘두름을 다시 내지 않는다. */
    const ruleLeadHit = fx => !fx.stageKind || fx.stageKind === 'primary' || !Number(fx.stageIndex);
    function ruleSwingOnce(gem, fx, look, now) {
        if (!ruleSwings(gem) || !ruleLeadHit(fx)) return;
        const key = `${fx.skillName}:${String(fx.damageTextGroupId).split(':')[0]}:${Number(fx.repeatIndex) || 0}`;
        if (swung.has(key)) return;
        swung.set(key, now);
        rulePlaySwing(gem, fx, look);
    }

    // ---------------------------------------------------------------- per victim
    function ruleHitRef(gem, element) {
        const own = ruleRef(gem.map.hit);
        if (own) return own === 'none' ? null : own;
        if (gem.map.ramp === 'blood') return 'hit_blood@blood';
        return ELEMENT_HIT[element] || (gem.meta.melee ? 'h_x@phys' : 'h_xs@phys');
    }
    /** 맞은 적의 타격 클립: 같은 적에게는 간격을 두고 붙인다(연타에 화면이 덮이지 않게). */
    function rulePlayHit(gem, hit) {
        const ref = ruleHitRef(gem, hit.fx.element), last = struck.has(hit.fx.enemyId) ? struck.get(hit.fx.enemyId) : -1e9;
        if (!ref || hit.now - last < stageSkillVfx.HIT.gap) return;
        const played = stageSkillVfx.play(ref, ruleAt(hit.victim, -hit.look.face * 8, ruleOnGround(ref) ? 2 : BODY), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
        if (played) struck.set(hit.fx.enemyId, hit.now);
    }
    /** 두 자리 사이를 클립으로 잇는다(연쇄 번개): 길이에 맞춰 몇 개를 돌려 늘어놓는다. */
    function rulePlayLink(ref, from, to, ramp) {
        const dx = (to.gx - from.gx) * WIDE, dy = (to.gy - from.gy) * DEEP, length = Math.hypot(dx, dy), width = stageSkillVfx.clipWidth(ref);
        if (length < 8 || !width) return;
        const count = Math.max(1, Math.round(length / width)), angle = Math.atan2(dy, dx), scale = length / (count * width);
        for (let i = 0; i < count; i++) stageSkillVfx.play(ref, ruleAt(from, dx * i / count, BODY + dy * i / count), { ramp, rot: angle, scale, delay: i * 40 });
    }
    /** 연쇄: 첫 대상은 주인공에게서, 다음부터는 앞서 맞은 적에게서 번개가 건너온다. */
    function ruleChainLink(gem, hit) {
        if (!gem.map.zap || !hit.fx.chain) return;
        const before = hit.fx.chainFromEnemyId == null ? null : ruleEnemy(hit.fx.chainFromEnemyId);
        const from = hit.fx.chainFromEnemyId == null ? ruleHeroSpot() : before ? ruleEnemySpot(before) : hit.fx.sourceCell;
        rulePlayLink(gem.map.zap, from, hit.victim, hit.look.ramp);
    }
    /** 흡혈: 피 혼령 둘이 적에게서 주인공에게 날아와 흡수 고리가 된다. */
    function rulePlayDrain(gem, hit) {
        const hero = ruleHeroSpot(), dx = (hero.gx - hit.victim.gx) * WIDE, dy = (hero.gy - hit.victim.gy) * DEEP;
        [0, 130].forEach((delay, index) => stageSkillVfx.play(gem.map.drain, ruleAt(hit.victim, 0, -52 + index * 8),
            { face: Math.sign(dx) || 1, ramp: hit.look.ramp, scale: 0.55, alpha: 0.9, life: 380, delay: 110 + delay, move: { dx, dy: dy - 4, ms: 380 } }));
        if (gem.map.absorb) stageSkillVfx.play(gem.map.absorb, ruleAt(hero, 0, -52), { ramp: hit.look.ramp, scale: 0.8, alpha: 0.9, delay: 620 });
    }
    /** 첫 타격에 한 번 붙는 것: 흡혈의 흐름, 착탄 폭발, 몸에 붙는 구슬. */
    function ruleFirstExtras(gem, hit) {
        const map = gem.map, look = hit.look;
        if (map.drain) rulePlayDrain(gem, hit);
        if (map.blast) stageSkillVfx.play(map.blast, ruleAt(hit.victim, 0, BODY), { face: look.face, ramp: look.ramp, scale: 0.8 });
        if (map.orb) stageSkillVfx.play(map.orb, ruleAt(hit.victim, 0, -44), { ramp: look.ramp, scale: 0.6, life: 900 });
    }
    /** 지속 타격: 둘째부터의 타격과 장판의 틱에는 그 젬의 틱 클립이 붙는다. */
    function ruleTickExtras(gem, hit) {
        const tick = gem.map.tick;
        if (tick) stageSkillVfx.play(tick, ruleAt(hit.victim, 0, ruleOnGround(tick) ? 0 : -40), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
    }
    /** 타격 하나의 자리와 방향: 연쇄가 건너온 타격은 앞서 맞은 적 쪽에서, 그 밖에는 주인공 쪽에서 본다. */
    function ruleHitOf(gem, fx) {
        const victim = ruleVictimSpot(fx), chained = fx.chainFromEnemyId != null;
        const face = Math.sign(victim.gx - (chained ? fx.sourceCell.gx : game.gridPlayer.gx)) || lastFace;
        if (!chained) lastFace = face;
        return { fx, victim, look: { face, ramp: ruleRamp(gem, fx.element) }, now: stageSkillVfx.now() };
    }
    /** 그 공격의 첫 타격인가(뒤 단계, 반복, 장판의 틱이 아니다). */
    const ruleFirstHit = fx => !Number(fx.stageIndex) && !Number(fx.repeatIndex) && !/tick/i.test(String(fx.stageKind));
    /** 맞은 적마다 한 번 불린다. */
    function ruleNoteHit(fx) {
        const gem = fx.targetCell && fx.sourceCell && stageSkillVfx.ready() ? ruleGemOf(fx.skillName) : null;
        if (!gem) return;
        const hit = ruleHitOf(gem, fx);
        ruleForget(swung, hit.now, 4000);
        ruleForget(struck, hit.now, 2000);
        ruleSwingOnce(gem, fx, hit.look, hit.now);
        ruleChainLink(gem, hit);
        rulePlayHit(gem, hit);
        if (ruleFirstHit(fx)) ruleFirstExtras(gem, hit); else ruleTickExtras(gem, hit);
    }

    // ---------------------------------------------------------------- cast start
    /** 시전 시작: 주문, 위습, 시전과 집중 슬롯의 젬은 손 앞에 그 속성의 마법진이 선다(예비 동작 동안). */
    function ruleNoteWindup(fx) {
        const gem = fx.sourceCell && !handled.has(fx) && stageSkillVfx.ready() ? ruleGemOf(fx.skillName) : null;
        if (!gem || !gem.meta.cast) return;
        handled.add(fx);
        stageSkillSigil.cast({ spot: ruleHeroSpot(), face: ruleHeroFace(), element: gem.meta.el, ms: Math.max(200, Number(fx.impactDelayMs) || 0) + 60 });
    }

    // ---------------------------------------------------------------- areas
    /** 범위의 가운데와 반지름(칸). */
    function ruleAreaOf(event) {
        const fp = event.footprint || {}, centre = fp.center || event.targetCells[0] || event.sourceCell;
        return { centre: { gx: centre.gx, gy: centre.gy }, radius: Number(fp.radius) || 0 };
    }
    /** 범위를 채울 자리들(도트): 가운데 하나, 범위가 클립보다 넓으면 둘레에 넷, 훨씬 넓으면 모서리에 넷 더(시간차로). 큰 클립은 가운데 하나만. */
    function ruleFillSpots(clip, area, width) {
        const a = (area.radius + 0.5) * WIDE, b = (area.radius + 0.5) * DEEP, spots = [[0, 0, 0]];
        if (clip.one) return spots;
        if (a > width * 0.65) [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].forEach(([x, y], i) => spots.push([a * x, b * y, 60 + i * 20]));
        if (a > width * 1.4) [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, y], i) => spots.push([a * 0.62 * x, b * 0.62 * y, 130 + i * 20]));
        return spots;
    }
    function ruleFillArea(ref, area, o) {
        const clip = stageSkillVfx.clipOf(ref);
        if (!clip) return;
        const lift = clip.an === 'bottom' ? 0 : -30;
        ruleFillSpots(clip, area, stageSkillVfx.clipWidth(ref)).forEach(([dx, dy, delay], index) => stageSkillVfx.play(ref, ruleAt(area.centre, dx, dy + lift),
            { face: o.face, ramp: o.ramp, delay: (o.delay || 0) + delay, alpha: index ? 0.85 : 1, life: o.life, nextLife: o.nextLife, layer: o.layer }));
    }
    /** 불멸의 진동: 몸에서 퍼지는 고리 셋, 바닥의 파문, 바람. */
    function rulePlayShout(shout, look) {
        const hero = ruleHeroSpot();
        [0, 110, 220].forEach((delay, index) => stageSkillVfx.play(shout.ring, ruleAt(hero, 0, -46), { ramp: look.ramp, delay, scale: 0.8 + index * 0.35, alpha: 1 - index * 0.2 }));
        stageSkillVfx.play(shout.ground, ruleAt(hero, 0, 1), { ramp: look.ramp, layer: 'ground' });
        stageSkillVfx.play(shout.burst, ruleAt(hero, look.face * 40, -46), { ramp: look.ramp, face: look.face, delay: 60 });
    }
    /** 중력 붕괴: 둘레의 먼지가 가운데로 빨려 든다. */
    function rulePlaySuck(s) {
        const a = (s.area.radius + 0.5) * WIDE * 0.9, b = (s.area.radius + 0.5) * DEEP * 0.9;
        for (let i = 0; i < 6; i++) {
            const angle = i / 6 * Math.PI * 2 + 0.4, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
            stageSkillVfx.play(s.map.suck, ruleAt(s.area.centre, x, y + 1), { face: x < 0 ? 1 : -1, ramp: s.look.ramp, delay: i * 20, alpha: 0.85, layer: 'ground', move: { dx: -x * 0.85, dy: -y * 0.85, ms: 300 } });
        }
    }
    /** 난타 눈보라: 범위 안의 여기저기에 고드름이 떨어지고 닿은 자리에서 얼음이 터진다. */
    function rulePlayDrops(s) {
        const rng = createSeededRng(`drops:${Math.round(stageSkillVfx.now())}`), count = Math.max(4, Math.round(s.long / 240)), reach = s.area.radius + 0.4;
        for (let i = 0; i < count; i++) {
            const angle = rng() * Math.PI * 2, far = Math.sqrt(rng()), x = Math.cos(angle) * far * reach * WIDE, y = Math.sin(angle) * far * reach * DEEP, delay = i * (s.long / count);
            stageSkillVfx.play(s.map.drop, ruleAt(s.area.centre, x, y - 6), { ramp: s.look.ramp, delay, life: 140, fall: { from: -90 - rng() * 30, to: 0, ms: 140 } });
            if (s.map.tick) stageSkillVfx.play(s.map.tick, ruleAt(s.area.centre, x, y + 20), { ramp: s.look.ramp, delay: delay + 140, scale: 0.8 });
        }
    }
    const rulePlayArea = s => ruleFillArea(s.map.area, s.area, { face: s.look.face, ramp: s.look.ramp, delay: s.map.swing ? 40 : 0, life: s.long, nextLife: Math.max(300, s.long - 700) });
    const rulePlayRing = s => ruleFillArea(s.map.ring, { ...s.area, radius: 0 }, { face: s.look.face, ramp: s.look.ramp });
    const rulePlayLand = s => stageSkillVfx.play(s.map.land, ruleAt(s.area.centre, 0, ruleOnGround(s.map.land) ? 1 : -30), { face: s.look.face, ramp: s.look.ramp });
    const rulePlaySeep = s => ruleFillArea(s.map.seep, s.area, { face: s.look.face, ramp: s.look.ramp, life: s.long });
    function rulePlayRocks(s) {
        [].concat(s.map.area2).forEach((ref, index) => stageSkillVfx.play(ref, ruleAt(s.area.centre, 0, ruleOnGround(ref) ? 1 : -46), { face: s.look.face, ramp: s.look.ramp, delay: 320 + index * 40 }));
    }
    /** 닿는 순간(stage)의 훅과 그 연출. */
    const STAGE_PLAYS = Object.freeze([['suck', rulePlaySuck], ['area', rulePlayArea], ['ring', rulePlayRing], ['area2', rulePlayRocks], ['land', rulePlayLand], ['seep', rulePlaySeep], ['drop', rulePlayDrops]]);
    /** 닿는 순간의 범위 연출. 여진(강타의 둘째 단계)은 그 범위에 여진 클립을 깐다. */
    function rulePlayStage(gem, event, look) {
        const s = { map: gem.map, area: ruleAreaOf(event), look, long: Math.max(400, event.duration || 0) };
        if (gem.map.shout) { rulePlayShout(gem.map.shout, look); return; }
        if (gem.map.after && Number(event.stageIndex) > 0) { ruleFillArea(gem.map.after, s.area, { face: look.face, ramp: look.ramp }); return; }
        for (const [hook, play] of STAGE_PLAYS) if (gem.map[hook]) play(s);
    }
    /** 예비 동작(windup)의 연출: 유성은 높고 먼 곳에서 범위 가운데로 떨어진다. */
    function rulePlayWindup(gem, event, look) {
        if (!gem.map.fall) return;
        const area = ruleAreaOf(event), ms = Math.max(200, event.duration || 360);
        stageSkillVfx.play(gem.map.fall, ruleAt(area.centre, look.face * 150, -360), { face: look.face, ramp: look.ramp, life: ms, move: { dx: -look.face * 150, dy: 320, ms } });
    }
    /** 날아가는 것(travel): 발사 섬광을 손 앞에 한 번 튼다. 투사체의 몸은 게임의 그림이 그린다. */
    function rulePlayMuzzle(gem, event, look) {
        if (gem.map.muzzle) stageSkillVfx.play(gem.map.muzzle, ruleAt(ruleHeroSpot(), look.face * 24, -58), { face: look.face, ramp: look.ramp, scale: 0.9 });
    }

    // ---------------------------------------------------------------- picture events
    /** 그 젬의 그 사건을 새 클립이 맡는가: 젬이 가진 훅과 인계의 갈래로 정한다. */
    const TAKES = Object.freeze({
        windup: gem => ruleSwings(gem) || !!gem.map.fall || !!gem.map.drop,
        stage: gem => ruleSwings(gem) || gem.meta.kind === 'chain' || STAGE_HOOKS.some(hook => gem.map[hook]),
        travel: gem => !!gem.map.wave && gem.map.wave !== 'none'
    });
    const ruleTakes = (gem, kind) => !gem.map.old && !OWN_ART.has(gem.meta.kind) && !!TAKES[kind] && TAKES[kind](gem);
    /** 길(칸과 그 칸에 닿는 때)을 따라 지금 있는 자리. */
    function ruleAlongPath(event, elapsed) {
        const path = event.travelPath && event.travelPath.length > 1 ? event.travelPath
            : [{ ...event.sourceCell, offsetMs: 0 }, { ...event.targetCells[0], offsetMs: event.duration }];
        let i = 0;
        while (i < path.length - 2 && path[i + 1].offsetMs <= elapsed) i++;
        const a = path[i], b = path[i + 1], u = Math.max(0, Math.min(1, (elapsed - a.offsetMs) / Math.max(1, b.offsetMs - a.offsetMs)));
        return { gx: a.gx + (b.gx - a.gx) * u, gy: a.gy + (b.gy - a.gy) * u, face: Math.sign(b.gx - a.gx) || lastFace };
    }
    /** 나아가는 파동: 파동 클립이 길을 따라 몸 높이에서 조금 출렁이며 나아간다(매 프레임 그 자리에 찍는다). */
    function ruleDrawWave(gem, event, view) {
        const elapsed = view.now - event.at;
        if (elapsed < 0 || elapsed > event.duration + 200) return;
        const p = view.projection, spot = ruleAlongPath(event, Math.min(elapsed, event.duration)), base = p.cellToScreen(spot.gx, spot.gy), dot = stageActors.scaleFor(p.tileW);
        view.ctx.save();
        view.ctx.globalAlpha *= elapsed > event.duration ? 1 - (elapsed - event.duration) / 200 : 1;
        stageSkillVfx.stamp(view.ctx, gem.map.wave, elapsed, { x: base.x + spot.face * 10 * dot, y: base.y + (p.actorGroundOffsetY || 0) + (-54 + Math.round(Math.sin(elapsed / 70) * 2)) * dot,
            face: spot.face, dot, ramp: ruleRamp(gem, event.element) });
        view.ctx.restore();
    }
    const EVENT_PLAYS = Object.freeze({ windup: rulePlayWindup, stage: rulePlayStage, travel: rulePlayMuzzle });
    /** 처음 보는 사건이면 그때의 클립을 튼다. */
    function rulePlayEvent(gem, event) {
        if (handled.has(event) || !EVENT_PLAYS[event.kind]) return;
        handled.add(event);
        const target = event.targetCells && event.targetCells[0], source = event.sourceCell || ruleHeroSpot();
        EVENT_PLAYS[event.kind](gem, event, { face: (target && Math.sign(target.gx - source.gx)) || ruleHeroFace(), ramp: ruleRamp(gem, event.element) });
    }
    /** @param {object} event 그림 사건 @param {{ctx:CanvasRenderingContext2D, projection:object, now:number}} view 이번 프레임의 붓, 투영, 사건의 시계
     * @returns {boolean} 이 그림 사건을 새 클립이 맡았는가(맡았으면 예전 그림은 그리지 않는다). */
    function ruleClaimEvent(event, view) {
        const gem = stageSkillVfx.ready() ? ruleGemOf(event.skillName) : null;
        if (!gem) return false;
        rulePlayEvent(gem, event);
        const mine = ruleTakes(gem, event.kind);
        if (mine && event.kind === 'travel') ruleDrawWave(gem, event, view);
        return mine;
    }
    return Object.freeze({ claim: ruleClaimEvent, hit: ruleNoteHit, windup: ruleNoteWindup });
})();
safeExposeGlobals({ stageSkillRules });
