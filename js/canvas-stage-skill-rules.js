/** 스킬 이펙트의 연결 규칙: 게임의 스킬 사건을 인계 받은 클립과 연출로 옮긴다 (data/stage-skill-vfx.js의 gems, 재생은
 * js/canvas-stage-skill-vfx.js, 코드로 그리는 연출은 js/canvas-stage-skill-draws.js). 인계 쪽 시뮬레이터가 룬을 쓸 때 클립을 트는
 * 자리와 때를 게임의 사건에 맞춰 옮긴 것이다. 게임이 주는 사건은 셋이다.
 * - 시전 시작(js/canvas-world-tree-fx.js swing: 주인공이 스킬을 쓰기 시작한 순간): 시전 마법진과 외곽선 오라(주문, 위습, 시전과 집중
 *   슬롯의 룬), 위습을 부르는 클립.
 * - 맞은 적마다(js/canvas-battlefield.js queueSkillGemVfx): 휘두름(한 번의 공격에 한 번), 바늘 찌르기, 우주 틈, 맞은 적의 타격 클립,
 *   연쇄 번개, 지속 타격, 화염 부패의 구슬과 사망 폭발, 빙결 침식의 안개가 몸으로 감겨 드는 모습.
 * - 그림 사건(js/canvas-world-tree-fx.js renderEvent와 paintCast: 예비 windup, 날아가는 travel, 닿는 stage, 이동 mobility):
 *   범위 클립, 여진, 낙하, 파동, 발사 섬광. 투사체의 몸과 따로 시전하는 룬, 이동기는 js/canvas-stage-skill-casts.js가 맡는다.
 *   그 룬의 그때를 새 연출이 맡으면 참을 돌려 예전 그림을 대신한다. 맡지 않는 것은 예전 그림이 그대로 그린다: 번개 각인, 시간 가속,
 *   파문심판(인계도 게임의 옛 그림을 쓴다). 인계에서 빠진 룬 다섯은 2026-10-13에 게임에서도 지웠다.
 * 룬의 판정, 대상, 피해는 게임의 것 그대로다: 여기는 사건을 읽기만 한다.
 */
const stageSkillRules = (() => {
    const K = stageSkillKit, WIDE = K.WIDE, DEEP = K.DEEP, BODY = K.BODY;
    const REACH = 80;                             // 근접 휘두름이 닿는 거리(도트, 인계의 1.25칸)
    const ROT_MS = 2000;                          // 화염 부패의 구슬이 몸에 붙어 있는 시간(다시 걸리면 늘어난다)
    const WAVE_FRONT = 10;                        // 파동의 앞머리가 출발하는 자리(쓴 자리에서 앞으로, 도트)
    const WAVE_DRIFT = 0.35;                      // 파동이 대상의 줄 쪽으로 따라가는 몫(0 = 쓴 줄 그대로, 1 = 대상의 줄까지)
    const WAVE_BASE = -51;                        // 파동 그림의 가운데 높이(도트): 그림의 아래 끝(거품)이 바닥에 닿는다
    const handled = new WeakSet();                // 이미 클립으로 옮긴 사건
    const swung = new Map();                      // "룬:공격 묶음:반복" → 휘두름을 튼 시각
    const struck = new Map();                     // 적 id → 타격 클립을 붙인 시각
    const rots = new Map();                       // 적 id → 화염 부패의 구슬
    /** 속성별 기본 타격 클립(룬이 타격을 정하지 않았을 때). 물리는 근접이면 X 섬광, 아니면 작은 가시 고리. */
    const ELEMENT_HIT = Object.freeze({ fire: 'h_fire@fire', cold: 'h_ice@cold', light: 'h_lit@light', chaos: 'h_chaos@chaos' });
    /** 근접 룬이 휘두름을 정하지 않았을 때 쓰는 클립. */
    const PLAIN_SWING = 'crescent';
    /** 휘두름을 제 단계에서 내는 룬(암살은 도착한 뒤의 베기 단계가 낸다). */
    const CAST_SWING = new Set([52]);
    /** 닿는 순간(stage)을 새 클립이 맡게 하는 훅. */
    const STAGE_HOOKS = Object.freeze(['shout', 'suck', 'area', 'ring', 'area2', 'land', 'seep', 'drop', 'orb']);
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
        const hero = K.heroSpot(), chop = gem.map.chop, half = stageSkillVfx.clipWidth(ref) / 2, ms = Math.min(110, Math.max(80, stageSkillVfx.clipLength(ref) * 0.4));
        stageSkillVfx.play(ref, K.at(hero, look.face * (Math.max(REACH * 0.5, half - 10) + (chop.dx || 0)), 0),
            { face: look.face, ramp: look.ramp, rot: chop.rot * Math.PI / 180, fall: { from: chop.from, to: chop.to, ms } });
        const reach = look.face * Math.max(REACH * 0.6, 50);
        [].concat(gem.map.impact || []).forEach((impact, index) => {
            const nudge = index === 1 && chop.ground ? look.face * 14 : 0;
            stageSkillVfx.play(impact, K.at(hero, reach + nudge, K.onGround(impact) ? 1 : -30),
                { face: look.face, ramp: look.ramp, delay: ms + index * 30, layer: index ? 'top' : 'ground', rot: impact.startsWith('lavaw') ? -1.15 : 0 });
        });
    }
    /** 베는 길이(도트): 그 공격의 범위가 주인공에게서 가로로 뻗은 칸 수. */
    function ruleReachOf(fx) {
        const cells = (fx.attackFootprint && fx.attackFootprint.cells) || [], hero = game.gridPlayer;
        return Math.max(2, ...cells.map(cell => Math.abs(cell.gx - hero.gx))) * WIDE;
    }
    /** 코드로 그리는 휘두름: 공허 가르기의 우주 틈, 혈기 폭쇄의 바늘 찌르기. @returns {boolean} 그렸는지 */
    function rulePlayDrawn(gem, fx, look) {
        const hero = K.heroSpot();
        if (gem.map.gash) {
            const gash = stageSkillDraws.gash(look.face, ruleReachOf(fx), hero.gx * 31 + hero.gy);
            stageSkillVfx.paint(K.at(hero), { life: gash.life }, gash.paint);
        } else if (gem.map.swing === 'pierce') {
            const pierce = stageSkillDraws.pierce(look.face, look.ramp);
            stageSkillVfx.paint(K.at(hero, look.face * 14, -42), { life: pierce.life }, pierce.paint);
        } else return false;
        return true;
    }
    /** 한 번의 공격에 한 번: 그 룬의 휘두름(여러 개면 반복마다 번갈아), 회전, 내려찍기. 둘째 타격은 조금 늦게 나간다. */
    function rulePlaySwing(gem, fx, look) {
        const hero = K.heroSpot(), repeat = Number(fx.repeatIndex) || 0;
        if (rulePlayDrawn(gem, fx, look)) return;
        if (gem.map.spin) { stageSkillVfx.play(gem.map.spin, K.at(hero, 0, -42), { face: look.face, ramp: look.ramp, life: 420 }); return; }
        const ref = gem.map.swing ? K.ref(gem.map.swing, repeat) : PLAIN_SWING;
        if (gem.map.chop) { rulePlayChop(gem, ref, look); return; }
        const [dx, dy] = ruleSwingOffset(ref);
        stageSkillVfx.play(ref, K.at(hero, look.face * dx, dy), { face: look.face, ramp: look.ramp, delay: repeat * 110 });
    }
    /** 휘두름을 새 연출로 그리는 룬인가: 휘두름, 회전, 우주 틈, 찌르기가 정해졌거나, 정해지지 않은 근접 룬(기본 클립). 휘두름을 끈 룬과
     * 휘두름 없는 이동기, 제 단계에서 휘두름을 내는 룬은 아니다. */
    function ruleSwings(gem) {
        const swing = gem.map.swing;
        if (CAST_SWING.has(gem.id)) return false;
        if (gem.map.gash || gem.map.spin) return true;
        if (swing) return swing !== 'none';
        return gem.meta.melee && gem.meta.kind !== 'move';
    }
    /** 첫 타격인가: 연쇄가 건너뛴 타격, 파동의 뒤 단계, 여진은 휘두름을 다시 내지 않는다. */
    const ruleLeadHit = fx => !fx.stageKind || fx.stageKind === 'primary' || !Number(fx.stageIndex);
    function ruleSwingOnce(gem, fx, look, now) {
        if (!ruleSwings(gem) || !ruleLeadHit(fx)) return;
        const key = `${fx.skillName}:${String(fx.damageTextGroupId).split(':')[0]}:${Number(fx.repeatIndex) || 0}`;
        if (swung.has(key)) return;
        swung.set(key, now);
        // 휘두름은 주인공의 몸 앞에 나온다: 먼저 셈한 타격의 적이 등 뒤에 있어도(둘러싸였을 때) 주인공이 보는 쪽으로 낸다
        rulePlaySwing(gem, fx, { ...look, face: K.heroFace() });
    }

    // ---------------------------------------------------------------- per victim
    function ruleHitRef(gem, element) {
        const own = K.ref(gem.map.hit);
        if (own) return own === 'none' ? null : own;
        if (gem.map.ramp === 'blood') return 'hit_blood@blood';
        return ELEMENT_HIT[element] || (gem.meta.melee ? 'h_x@phys' : 'h_xs@phys');
    }
    /** 맞은 적의 타격 클립: 같은 적에게는 간격을 두고 붙인다(연타에 화면이 덮이지 않게). */
    function rulePlayHit(gem, hit) {
        const ref = ruleHitRef(gem, hit.fx.element), last = struck.has(hit.fx.enemyId) ? struck.get(hit.fx.enemyId) : -1e9;
        if (!ref || hit.now - last < stageSkillVfx.HIT.gap) return;
        const played = stageSkillVfx.play(ref, K.at(hit.victim, -hit.look.face * 8, K.onGround(ref) ? 2 : BODY), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
        if (played) struck.set(hit.fx.enemyId, hit.now);
    }
    /** 두 자리 사이를 클립으로 잇는다(연쇄 번개): 길이에 맞춰 몇 개를 돌려 늘어놓는다. */
    function rulePlayLink(ref, from, to, ramp) {
        const dx = (to.gx - from.gx) * WIDE, dy = (to.gy - from.gy) * DEEP, length = Math.hypot(dx, dy), width = stageSkillVfx.clipWidth(ref);
        if (length < 8 || !width) return;
        const count = Math.max(1, Math.round(length / width)), angle = Math.atan2(dy, dx), scale = length / (count * width);
        for (let i = 0; i < count; i++) stageSkillVfx.play(ref, K.at(from, dx * i / count, BODY + dy * i / count), { ramp, rot: angle, scale, delay: i * 40 });
    }
    /** 연쇄: 첫 대상은 주인공에게서, 다음부터는 앞서 맞은 적에게서 번개가 건너온다. */
    function ruleChainLink(gem, hit) {
        if (!gem.map.zap || !hit.fx.chain) return;
        const before = hit.fx.chainFromEnemyId == null ? null : K.enemy(hit.fx.chainFromEnemyId);
        const from = hit.fx.chainFromEnemyId == null ? K.heroSpot() : before ? K.enemySpot(before) : hit.fx.sourceCell;
        rulePlayLink(gem.map.zap, from, hit.victim, hit.look.ramp);
    }
    /** 흡혈: 피 혼령 둘이 적에게서 주인공에게 날아와 흡수 고리가 된다. */
    function rulePlayDrain(gem, hit) {
        const hero = K.heroSpot(), dx = (hero.gx - hit.victim.gx) * WIDE, dy = (hero.gy - hit.victim.gy) * DEEP;
        [0, 130].forEach((delay, index) => stageSkillVfx.play(gem.map.drain, K.at(hit.victim, 0, -52 + index * 8),
            { face: Math.sign(dx) || 1, ramp: hit.look.ramp, scale: 0.55, alpha: 0.9, life: 380, delay: 110 + delay, move: { dx, dy: dy - 4, ms: 380 } }));
        if (gem.map.absorb) stageSkillVfx.play(gem.map.absorb, K.at(hero, 0, -52), { ramp: hit.look.ramp, scale: 0.8, alpha: 0.9, delay: 620 });
    }

    // ---------------------------------------------------------------- fire rot (화염 부패)
    /** 구슬이 붙은 적이 죽은 자리의 폭발: 몸 높이의 폭발과 둘레 바닥에 남는 불. */
    function ruleRotBurst(rot) {
        const spot = rot.row.at, map = rot.gem.map;
        if (map.boom) stageSkillVfx.play(map.boom, K.at(spot, 0, K.onGround(map.boom) ? 1 : -46), { ramp: rot.ramp, scale: 0.72, alpha: 0.9 });
        if (map.boom2) ruleFillArea(map.boom2, { centre: spot, radius: 1.5 }, { ramp: rot.ramp, life: 700, layer: 'ground' });
    }
    /** 프레임마다: 적이 살아 있으면 구슬이 남고, 시간이 다하면 걷히고, 그 전에 죽으면 터진다. @returns {boolean} 더 볼지 */
    function ruleWatchRot(id, time) {
        const rot = rots.get(id), enemy = rot ? K.enemy(id) : null;
        if (!rot) return false;
        if (enemy === rot.unit && enemy.hp > 0 && time < rot.until) return true;
        rot.row.life = Math.min(rot.row.life, time - rot.row.start);
        // 터지는 것은 죽었을 때뿐이다: 구역이나 판이 바뀌어 목록에서 사라진 적(살아 있던 그대로 치워졌다)의 자리에서는 터지지 않는다
        if (rot.unit.hp <= 0) ruleRotBurst(rot);
        rots.delete(id);
        return false;
    }
    /** 화염 부패: 대상의 몸 가운데에 용암 구슬이 붙어 따라다닌다. 다시 걸리면 시간이 늘어난다. */
    function ruleStartRot(gem, hit) {
        const id = hit.fx.enemyId, known = rots.get(id);
        if (known && known.until > hit.now) { known.until = hit.now + ROT_MS; known.row.life = known.until - known.row.start; return; }
        // 같은 번호를 다시 쓰는 다른 판의 적을 따라가지 않게, 번호가 아니라 그 적 자체를 붙든다
        const unit = K.enemy(id), follow = () => (unit && K.enemy(id) === unit && unit.hp > 0 ? K.enemySpot(unit) : null);
        const row = unit ? stageSkillVfx.play(gem.map.orb, K.at(hit.victim, 0, -42), { ramp: hit.look.ramp, scale: 0.8, life: ROT_MS, follow }) : null;
        if (!row) return;
        rots.set(id, { row, until: hit.now + ROT_MS, gem, ramp: hit.look.ramp, unit });
        stageSkillVfx.watch(time => ruleWatchRot(id, time));
    }

    // ---------------------------------------------------------------- frost seep (빙결 침식)
    /** 범위 가장자리의 안개가 가운데로 천천히 흘러들고(절반은 몸 앞으로), 바닥에 낮게 깔린다. */
    function ruleSeepMist(s) {
        const ref = s.map.seep, a = (s.area.radius + 0.5) * WIDE, b = (s.area.radius + 0.5) * DEEP, ms = Math.max(700, s.long - 250);
        for (let i = 0; i < 10; i++) {
            const angle = i / 10 * Math.PI * 2 + (i % 2) * 0.31, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
            stageSkillVfx.play(ref, K.at(s.area.centre, x * 1.05, y * 1.05 - 12), { face: x < 0 ? -1 : 1, ramp: s.look.ramp, delay: i * 40, alpha: i % 2 ? 0.22 : 0.32,
                layer: i % 2 ? 'top' : 'ground', move: { dx: -x * 0.75, dy: -y * 0.75, ms } });
        }
        for (let j = 0; j < 3; j++) stageSkillVfx.play(ref, K.at(s.area.centre, (j - 1) * 26, -8), { face: j % 2 ? -1 : 1, ramp: s.look.ramp, delay: 260 + j * 150, alpha: 0.22, layer: 'ground' });
    }
    /** 틱마다 표적 몸 둘레의 안개가 몸 안으로 감겨 들어가고, 옅은 냉기가 몸에 남았다 흩어진다. */
    function ruleSeepInto(gem, hit) {
        const ref = gem.map.seep, last = struck.has(hit.fx.enemyId) ? struck.get(hit.fx.enemyId) : -1e9;
        if (hit.now - last < stageSkillVfx.HIT.gap) return;
        struck.set(hit.fx.enemyId, hit.now);
        for (let k = 0; k < 5; k++) {
            const angle = k / 5 * Math.PI * 2 + 0.6, x = Math.cos(angle) * 30, y = Math.sin(angle) * 20;
            stageSkillVfx.play(ref, K.at(hit.victim, x, y - 34), { face: x < 0 ? -1 : 1, ramp: hit.look.ramp, delay: k * 45, alpha: 0.38, scale: 0.5, ms: 26, cut: 380, move: { dx: -x, dy: -y + 4, ms: 340 } });
        }
        stageSkillVfx.play(ref, K.at(hit.victim, 0, -28), { ramp: hit.look.ramp, delay: 200, alpha: 0.22, scale: 0.8, ms: 40, cut: 520 });
    }

    // ---------------------------------------------------------------- hits
    /** 첫 타격에 한 번 붙는 것: 흡혈의 흐름, 착탄 폭발, 화염 부패의 구슬. */
    function ruleFirstExtras(gem, hit) {
        const map = gem.map, look = hit.look;
        if (map.drain) rulePlayDrain(gem, hit);
        if (map.blast) stageSkillVfx.play(map.blast, K.at(hit.victim, 0, BODY), { face: look.face, ramp: look.ramp, scale: 0.8 });
        if (map.orb) ruleStartRot(gem, hit);
    }
    /** 지속 타격: 둘째부터의 타격과 장판의 틱에는 그 룬의 틱 클립이 붙는다. */
    function ruleTickExtras(gem, hit) {
        const tick = gem.map.tick;
        if (tick) stageSkillVfx.play(tick, K.at(hit.victim, 0, K.onGround(tick) ? 0 : -40), { face: hit.look.face, ramp: hit.look.ramp, hit: true });
    }
    /** 타격 하나의 자리와 방향: 연쇄가 건너온 타격은 앞서 맞은 적 쪽에서, 그 밖에는 주인공 쪽에서 본다. */
    function ruleHitOf(gem, fx) {
        const enemy = K.enemy(fx.enemyId), victim = enemy ? K.enemySpot(enemy) : { gx: fx.targetCell.gx, gy: fx.targetCell.gy }, chained = fx.chainFromEnemyId != null;
        const face = Math.sign(victim.gx - (chained ? fx.sourceCell.gx : game.gridPlayer.gx)) || K.heroFace();
        if (!chained) K.noteFace(face);
        return { fx, victim, look: { face, ramp: K.ramp(gem, fx.element) }, now: stageSkillVfx.now() };
    }
    /** 그 공격의 첫 타격인가(뒤 단계, 반복, 장판의 틱이 아니다). */
    const ruleFirstHit = fx => !Number(fx.stageIndex) && !Number(fx.repeatIndex) && !/tick/i.test(String(fx.stageKind));
    /** 맞은 적마다 한 번 불린다. */
    function ruleNoteHit(fx) {
        const gem = fx.targetCell && fx.sourceCell && stageSkillVfx.ready() ? K.gemOf(fx.skillName) : null;
        if (!gem) return;
        const hit = ruleHitOf(gem, fx);
        ruleForget(swung, hit.now, 4000);
        ruleForget(struck, hit.now, 2000);
        ruleSwingOnce(gem, fx, hit.look, hit.now);
        ruleChainLink(gem, hit);
        if (gem.map.seep) ruleSeepInto(gem, hit); else rulePlayHit(gem, hit);
        if (ruleFirstHit(fx)) ruleFirstExtras(gem, hit); else ruleTickExtras(gem, hit);
    }

    // ---------------------------------------------------------------- cast start
    /** 시전 시작: 주문, 위습, 시전과 집중 슬롯의 룬은 손 앞에 그 속성의 마법진이 서고 몸에 외곽선 오라가 돈다(예비 동작 동안).
     * 위습 소환은 예비 동작이 끝날 때 등 뒤에서 그 속성의 소환 클립이 튄다. */
    function ruleNoteWindup(fx) {
        const gem = fx.sourceCell && !handled.has(fx) && stageSkillVfx.ready() ? K.gemOf(fx.skillName) : null;
        if (!gem || !gem.meta.cast) return;
        handled.add(fx);
        const hero = K.heroSpot(), face = K.heroFace(), wind = Math.max(200, Number(fx.impactDelayMs) || 0);
        stageSkillSigil.cast({ spot: hero, face, element: gem.meta.el, ms: wind + 60 });
        const summon = gem.meta.kind === 'wisp' ? gem.map.cast : null;
        if (summon) stageSkillVfx.play(summon, K.at(hero, -face * 34, K.onGround(summon) ? -29 : -76), { face, ramp: K.ramp(gem, fx.element), delay: wind });
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
        ruleFillSpots(clip, area, stageSkillVfx.clipWidth(ref)).forEach(([dx, dy, delay], index) => stageSkillVfx.play(ref, K.at(area.centre, dx, dy + lift),
            { face: o.face, ramp: o.ramp, delay: (o.delay || 0) + delay, alpha: index ? 0.85 : 1, life: o.life, nextLife: o.nextLife, layer: o.layer }));
    }
    /** 대지의 함성: 몸에서 퍼지는 고리 셋, 바닥의 파문 둘, 좌우로 터지는 바람. */
    function rulePlayShout(shout, look) {
        const hero = K.heroSpot();
        [0.6, 0.95, 1.3].forEach((scale, index) => stageSkillVfx.play(shout.ring, K.at(hero, 0, -48), { ramp: look.ramp, delay: index * 110, scale, alpha: 1 - index * 0.22 }));
        [0, 160].forEach((delay, index) => stageSkillVfx.play(shout.ground, K.at(hero, 0, 1), { ramp: look.ramp, delay, scale: 1 + index * 0.5, alpha: 0.9 - index * 0.3, layer: 'ground' }));
        for (const side of [1, -1]) stageSkillVfx.play(shout.burst, K.at(hero, side * 30, -50), { ramp: look.ramp, face: side, delay: 40, scale: 0.8, alpha: 0.8 });
    }
    /** 중력 붕괴: 둘레의 먼지가 가운데로 빨려 든다. */
    function rulePlaySuck(s) {
        const a = (s.area.radius + 0.5) * WIDE * 0.9, b = (s.area.radius + 0.5) * DEEP * 0.9;
        for (let i = 0; i < 6; i++) {
            const angle = i / 6 * Math.PI * 2 + 0.4, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
            stageSkillVfx.play(s.map.suck, K.at(s.area.centre, x, y + 1), { face: x < 0 ? 1 : -1, ramp: s.look.ramp, delay: i * 20, alpha: 0.85, layer: 'ground', move: { dx: -x * 0.85, dy: -y * 0.85, ms: 300 } });
        }
    }
    /** 난타 눈보라: 범위 안의 여기저기에 고드름이 떨어지고 닿은 자리에서 얼음이 터진다. */
    function rulePlayDrops(s) {
        const rng = createSeededRng(`drops:${Math.round(stageSkillVfx.now())}`), count = Math.max(4, Math.round(s.long / 240)), reach = s.area.radius + 0.4;
        for (let i = 0; i < count; i++) {
            const angle = rng() * Math.PI * 2, far = Math.sqrt(rng()), x = Math.cos(angle) * far * reach * WIDE, y = Math.sin(angle) * far * reach * DEEP, delay = i * (s.long / count);
            stageSkillVfx.play(s.map.drop, K.at(s.area.centre, x, y - 6), { ramp: s.look.ramp, delay, life: 140, fall: { from: -90 - rng() * 30, to: 0, ms: 140 } });
            if (s.map.tick) stageSkillVfx.play(s.map.tick, K.at(s.area.centre, x, y + 20), { ramp: s.look.ramp, delay: delay + 140, scale: 0.8 });
        }
    }
    const rulePlayArea = s => ruleFillArea(s.map.area, s.area, { face: s.look.face, ramp: s.look.ramp, delay: s.map.swing ? 40 : 0, life: s.long, nextLife: Math.max(300, s.long - 700) });
    const rulePlayRing = s => ruleFillArea(s.map.ring, { ...s.area, radius: 0 }, { face: s.look.face, ramp: s.look.ramp });
    const rulePlayLand = s => stageSkillVfx.play(s.map.land, K.at(s.area.centre, 0, K.onGround(s.map.land) ? 1 : -30), { face: s.look.face, ramp: s.look.ramp });
    function rulePlayRocks(s) {
        [].concat(s.map.area2).forEach((ref, index) => stageSkillVfx.play(ref, K.at(s.area.centre, 0, K.onGround(ref) ? 1 : -46), { face: s.look.face, ramp: s.look.ramp, delay: 320 + index * 40 }));
    }
    /** 닿는 순간(stage)의 훅과 그 연출. */
    const STAGE_PLAYS = Object.freeze([['suck', rulePlaySuck], ['area', rulePlayArea], ['ring', rulePlayRing], ['area2', rulePlayRocks], ['land', rulePlayLand], ['seep', ruleSeepMist], ['drop', rulePlayDrops]]);
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
        stageSkillVfx.play(gem.map.fall, K.at(area.centre, look.face * 150, -360), { face: look.face, ramp: look.ramp, life: ms, move: { dx: -look.face * 150, dy: 320, ms } });
    }
    /** 날아가는 것(travel): 발사 섬광을 손 앞에 한 번 튼다. */
    function rulePlayMuzzle(gem, event, look) {
        if (gem.map.muzzle) stageSkillVfx.play(gem.map.muzzle, K.at(K.heroSpot(), look.face * 26, -52), { face: look.face, ramp: look.ramp });
    }

    // ---------------------------------------------------------------- picture events
    /** 그 룬의 그 사건을 새 클립이 맡는가: 룬이 가진 훅과 인계의 갈래로 정한다. */
    const TAKES = Object.freeze({
        windup: gem => ruleSwings(gem) || !!gem.map.fall || !!gem.map.drop,
        stage: gem => ruleSwings(gem) || gem.meta.kind === 'chain' || STAGE_HOOKS.some(hook => gem.map[hook]),
        travel: gem => !!gem.map.wave && gem.map.wave !== 'none'
    });
    const ruleTakes = (gem, kind) => !gem.map.old && !!TAKES[kind] && TAKES[kind](gem);
    /** 나아가는 파동: 파동 클립이 바닥에 붙어 조금 출렁이며 앞으로 나아간다(매 프레임 그 자리에 찍는다). 쓴 자리의 몸 앞면보다
     * 뒤쪽은 그리지 않는다(K.emerge): 파동이 몸 앞에서 자라 나와 나아간다.
     * 게임의 판정은 대상이 선 칸까지의 줄이라 대상이 다른 줄에 있으면 비스듬하다. 그림을 그 줄대로 옮기면 화면에서는 위로 떠올라,
     * 제 줄에 선 적들의 머리 위를 지나 허공에서 끝났다(2026-10-13 사용자: 높이를 "조절해줘"). 인계의 연출처럼 쓴 줄의 바닥을 따라
     * 가로로 쓸고 가되, 대상의 줄 쪽으로는 WAVE_DRIFT만큼만 따라간다(그림의 키가 세 줄 높이라 다른 줄의 적도 덮는다). */
    function ruleDrawWave(gem, event, view) {
        const elapsed = view.now - event.at;
        if (elapsed < 0 || elapsed > event.duration + 200) return;
        const spot = K.along(event, Math.min(elapsed, event.duration)), at = K.screen(view.projection, spot), from = K.screen(view.projection, K.along(event, 0));
        const ground = from.y + (at.y - from.y) * WAVE_DRIFT;
        view.ctx.save();
        K.emerge(view.ctx, view.projection, event);
        view.ctx.globalAlpha *= elapsed > event.duration ? 1 - (elapsed - event.duration) / 200 : 1;
        stageSkillVfx.stamp(view.ctx, gem.map.wave, elapsed, { x: at.x + spot.face * WAVE_FRONT * at.dot, y: ground + (WAVE_BASE + Math.round(Math.sin(elapsed / 70) * 2)) * at.dot,
            face: spot.face, dot: at.dot, ramp: K.ramp(gem, event.element) });
        view.ctx.restore();
    }
    const EVENT_PLAYS = Object.freeze({ windup: rulePlayWindup, stage: rulePlayStage, travel: rulePlayMuzzle });
    /** 제 때가 된 사건을 처음 보면 그때의 클립을 튼다. 게임은 닿는 사건(stage)을 날아가는 동안부터 알려 주므로(at이 앞날이다)
     * 때가 되기 전에는 틀지 않는다: 처음 본 프레임에 틀던 때에는 유성이 떨어지기도 전에 버섯구름이 먼저 터졌다. */
    function rulePlayEvent(gem, event, now) {
        if (now < event.at || handled.has(event) || !EVENT_PLAYS[event.kind]) return;
        handled.add(event);
        const target = event.targetCells && event.targetCells[0], source = event.sourceCell || K.heroSpot();
        EVENT_PLAYS[event.kind](gem, event, { face: (target && Math.sign(target.gx - source.gx)) || K.heroFace(), ramp: K.ramp(gem, event.element) });
    }
    /** @param {object} event 그림 사건 @param {{ctx:CanvasRenderingContext2D, projection:object, now:number}} view 이번 프레임의 붓, 투영, 사건의 시계
     * @returns {boolean} 이 그림 사건을 새 연출이 맡았는가(맡았으면 예전 그림은 그리지 않는다). */
    function ruleClaimEvent(event, view) {
        const gem = stageSkillVfx.ready() ? K.gemOf(event.skillName) : null;
        if (!gem) return false;
        const cast = stageSkillCasts.claim(gem, event, view);   // 투사체의 몸, 따로 시전하는 룬, 이동기
        if (cast !== null) return cast;
        rulePlayEvent(gem, event, view.now);
        const mine = ruleTakes(gem, event.kind);
        if (mine && event.kind === 'travel') ruleDrawWave(gem, event, view);
        return mine;
    }
    // ---------------------------------------------------------------- the clips a gem may play
    const PRISM = Object.freeze(['fire', 'cold', 'light']);
    /** 연결표 안의 클립 이름을 모두 든다(값이 목록이나 표면 그 안까지). 클립이 아닌 글자(램프 이름, 'none', 'pierce')는 거른다. */
    function ruleClipNames(table) {
        const out = [], open = [table];
        while (open.length) {
            const value = open.pop();
            if (typeof value === 'string') { if (stageSkillVfx.clipOf(value)) out.push(value); }
            else if (value && typeof value === 'object') open.push(...Object.values(value));
        }
        return out;
    }
    /** 클립 하나와, 그 클립이 끝나면 이어지는 클립들(같은 램프)을 out에 넣는다. */
    function ruleFollowClips(ref, out) {
        for (let at = ref, steps = 0; at && steps < 6; steps++) {
            out.push(at);
            const clip = stageSkillVfx.clipOf(at);
            at = clip && clip.next ? clip.next + '@' + at.split('@')[1] : null;
        }
    }
    /** 그 룬이 한 속성으로 틀 수 있는 클립 이름: 연결표의 것, 정해지지 않은 근접 룬의 기본 휘두름, 타격 클립, 위습이면 위습의 타격. */
    function ruleGemClips(gem, element) {
        const names = ruleClipNames(gem.map);
        if (ruleSwings(gem) && !gem.map.swing) names.push(PLAIN_SWING);
        names.push(ruleHitRef(gem, element) || '', gem.meta.kind === 'wisp' ? stageSkillCasts.wispHit(element) : '');
        return names.filter(Boolean);
    }
    /** 그 룬이 틀 수 있는 클립('이름@램프')을 모두 든다: 낀 룬의 띠를 미리 만들어 두려고 묻는다(js/canvas-stage-warmup.js).
     * elements: 그 룬의 타격이 띨 수 있는 속성(룬의 속성은 언제나 넣는다). 실제로 트는 것보다 조금 넉넉하다(램프를 정하는 값이
     * 타격마다 달라질 수 있어, 있을 수 있는 램프를 모두 든다). 인계에 없는 룬이면 빈 목록. */
    function ruleClipsOf(skillName, elements) {
        const gem = K.gemOf(skillName), refs = [];
        if (!gem) return refs;
        const kinds = new Set([gem.meta.el].concat(elements).flatMap(element => (element === 'prism' ? PRISM : [element])).filter(Boolean));
        for (const element of kinds) {
            const ramps = new Set([K.ramp(gem, element), STAGE_SKILL_VFX.elementRamp[element] || 'phys']);
            for (const name of ruleGemClips(gem, element)) {
                if (name.includes('@')) ruleFollowClips(name, refs);
                else ramps.forEach(ramp => ruleFollowClips(name + '@' + ramp, refs));
            }
        }
        return refs;
    }
    return Object.freeze({ claim: ruleClaimEvent, hit: ruleNoteHit, windup: ruleNoteWindup, clipsOf: ruleClipsOf });
})();
safeExposeGlobals({ stageSkillRules });
