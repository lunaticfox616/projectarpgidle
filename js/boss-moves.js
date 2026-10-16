/** Boss pattern moves (2026-10-16 사용자: "지금은 땅바닥에 쏘는 패턴(장판 패턴)만 있는데, 투사체 방식으로 날리는 패턴, 빔 형식으로
 * 특정 칸에 유지되는 패턴, 장판이 순차적으로 폭발하는 패턴 등등 ... 적들의 패턴이 단조롭지 않게"). A boss special keeps the cells it
 * warned of (its area, js/combat-patterns.js) and lands on them over time instead of all at once, in the way the boss's own
 * effects fight (data/boss-fx.js kind, GPT's art):
 *   volley  갈래 사격: a shot down each ray of a fan, cell by cell from the boss; a shot stops at the first one it hits.
 *   chain   연쇄 폭발: the cells of a line (or of each ray of a fan, for bosses that fight on the ground) burst one after another,
 *           outward from the boss.
 *   beam    관통 광선: a line held for a while, hitting what stands in it at every tick (a share of the special's damage).
 *   rings   이중 파동: the inner cells of a wide diamond burst first, its outer ring a little later (step out, then back in).
 *   cross   십자 강타: the middle first, then the four arms.
 *   scatter 흩뿌리기: the cells of a square burst in three waves, in a random order.
 * A special left as it was (one cell, a melee boss's square) lands at once as before. A cell hits what stands in it when it
 * lands, at the special's damage multiplier (a beam's tick at tickShare of it), so standing still takes one hit as before.
 * The pending attack (js/combat.js) carries the move: each stage resolves as one hit and the rest goes back in the queue with
 * the cells still to land as its area (warnings and the hero's escape see them). Rendering: js/canvas-boss-moves.js. */
const BOSS_MOVE_RULES = Object.freeze({
    volley: Object.freeze({ firstMs: 140, stepMs: 110 }),
    chain: Object.freeze({ firstMs: 280, stepMs: 150 }),
    beam: Object.freeze({ firstMs: 320, tickMs: 450, ticks: 4, tickShare: 0.45 }),
    rings: Object.freeze({ firstMs: 500, gapMs: 650 }),
    cross: Object.freeze({ firstMs: 500, gapMs: 300 }),
    scatter: Object.freeze({ firstMs: 420, gapMs: 300, waves: 3 })
});
// The first loops' specials of each boss style (data/boss-fx.js kind): three shapes (data/constants.js bossPatternProfiles) in turn,
// the gentlest first. A boss with no style keeps the old pair (one cell, then the cross).
const BOSS_MOVE_INTRO = Object.freeze({
    melee: Object.freeze(['impact', 'lane', 'pulse']),
    ground: Object.freeze(['pulse', 'lane', 'ring']),
    projectile: Object.freeze(['impact', 'fan', 'beam']),
    wave: Object.freeze(['fan', 'wave', 'lane']),
    beam: Object.freeze(['beam', 'impact', 'fan']),
    fall: Object.freeze(['ring', 'impact', 'pulse']),
    none: Object.freeze(['impact', 'wave'])
});
// The names those specials show (cast bar, log): by shape, and for some shapes by style.
const BOSS_MOVE_NAMES = Object.freeze({
    impact: '지면 강타', wave: '십자 강타', pulse: '이중 파동',
    beam: Object.freeze({ beam: '관통 광선', other: '집중 사격' }),
    fan: Object.freeze({ melee: '세 갈래 균열', ground: '세 갈래 분출', other: '갈래 사격' }),
    lane: Object.freeze({ ground: '뿌리 분출', other: '연쇄 폭발' }),
    ring: Object.freeze({ fall: '낙하 공격', other: '흩뿌리기' })
});

const bossMoves = (() => {
    const live = [];
    const LINGER_MS = 900;   // a move stays drawn this long after its last stage (the last burst plays out)

    /** The boss's effect row (data/boss-fx.js): the look it shows on the stage (js/canvas-stage-roster.js actorFor), else its asset. */
    function bossFxOf(enemy) {
        if (typeof BOSS_FX !== 'object' || !enemy) return null;
        const roster = typeof MONSTER_STAGE_ROSTER === 'object' ? MONSTER_STAGE_ROSTER : null;
        const look = enemy.spriteVariantId || enemy.monsterVisualId;
        const id = (roster && roster.wears[look]) || look;
        return BOSS_FX.actors[id] ? { id, row: BOSS_FX.actors[id] }
            : (BOSS_FX.actors[enemy.bossAssetKey] ? { id: enemy.bossAssetKey, row: BOSS_FX.actors[enemy.bossAssetKey] } : null);
    }
    const styleOf = enemy => (bossFxOf(enemy) || { row: { kind: null } }).row.kind;

    /** The first loops' special number n (1, 2, ...) of this boss: { label, telegraphKind }. */
    function introSpecial(enemy, n) {
        const style = styleOf(enemy), shapes = BOSS_MOVE_INTRO[style] || BOSS_MOVE_INTRO.none;
        const shape = shapes[(n - 1) % shapes.length];
        return { label: specialName(shape, style), telegraphKind: shape };
    }
    /** How many special shapes this boss takes turns with (BOSS_MOVE_INTRO by its fighting style). */
    function introCount(enemy) { return (BOSS_MOVE_INTRO[styleOf(enemy)] || BOSS_MOVE_INTRO.none).length; }
    function specialName(shape, style) {
        const names = BOSS_MOVE_NAMES[shape];
        return typeof names === 'string' ? names : names[style] || names.other;
    }

    function moveKind(area, telegraph, style) {
        if (area.kind === 'fan') return ['melee', 'ground'].includes(style) ? 'chain' : 'volley';
        if (area.kind === 'line') return telegraph === 'beam' ? 'beam' : 'chain';
        return area.kind === 'blast' ? blastMove(area, style) : null;
    }
    function blastMove(area, style) {
        if (area.shape === 'cross') return 'cross';
        if (area.shape === 'diamond' && area.radius >= 2) return 'rings';
        return area.radius >= 1 && style !== 'melee' ? 'scatter' : null;
    }

    const steps = (from, cell) => Math.max(Math.abs(cell.gx - from.gx), Math.abs(cell.gy - from.gy));
    /** The area's lanes from the boss outward: a fan's rays, or a line's cells; only cells the warning covered. */
    function lanesOf(area, source) {
        const keys = new Set(area.cells.map(cell => gridCellKey(cell.gx, cell.gy)));
        if (area.kind === 'fan') {
            return (area.rays || []).map(tip => gridLineCells(source.gx, source.gy, tip.gx, tip.gy, 16)
                .filter(cell => keys.has(gridCellKey(cell.gx, cell.gy))));
        }
        return [area.cells.slice().sort((a, b) => steps(source, a) - steps(source, b))];
    }
    /** Lanes advancing together: the k-th cell of every lane lands at firstMs + k × stepMs. */
    function laneStages(lanes, rule) {
        const length = Math.max(0, ...lanes.map(lane => lane.length));
        return Array.from({ length }, (_, k) => ({ ms: rule.firstMs + k * rule.stepMs,
            cells: lanes.flatMap((lane, index) => (lane[k] ? [{ gx: lane[k].gx, gy: lane[k].gy, lane: index }] : [])) }));
    }
    function beamStages(area, source) {
        const rule = BOSS_MOVE_RULES.beam, cells = lanesOf(area, source)[0].map(cell => ({ gx: cell.gx, gy: cell.gy, lane: 0 }));
        return Array.from({ length: rule.ticks }, (_, k) => ({ ms: rule.firstMs + k * rule.tickMs, cells, share: rule.tickShare }));
    }
    const plain = cell => ({ gx: cell.gx, gy: cell.gy, lane: 0 });
    function ringStages(area) {
        const rule = BOSS_MOVE_RULES.rings, centre = area.center, near = cell => Math.abs(cell.gx - centre.gx) + Math.abs(cell.gy - centre.gy) <= 1;
        return [{ ms: rule.firstMs, cells: area.cells.filter(near).map(plain) },
            { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter(cell => !near(cell)).map(plain) }];
    }
    function crossStages(area) {
        const rule = BOSS_MOVE_RULES.cross, centre = area.center, middle = cell => cell.gx === centre.gx && cell.gy === centre.gy;
        return [{ ms: rule.firstMs, cells: area.cells.filter(middle).map(plain) },
            { ms: rule.firstMs + rule.gapMs, cells: area.cells.filter(cell => !middle(cell)).map(plain) }];
    }
    function scatterStages(area) {
        const rule = BOSS_MOVE_RULES.scatter, cells = area.cells.map(plain);
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        const size = Math.ceil(cells.length / rule.waves);
        return Array.from({ length: rule.waves }, (_, k) => ({ ms: rule.firstMs + k * rule.gapMs, cells: cells.slice(k * size, (k + 1) * size) }))
            .filter(stage => stage.cells.length);
    }
    function stagesOf(kind, area, source) {
        if (kind === 'volley' || kind === 'chain') return laneStages(lanesOf(area, source), BOSS_MOVE_RULES[kind]);
        if (kind === 'beam') return beamStages(area, source);
        if (kind === 'rings') return ringStages(area);
        return kind === 'cross' ? crossStages(area) : scatterStages(area);
    }

    /** Puts a move on a special about to be released (consumeBossPatternAttack): state.move, or nothing (lands at once). */
    function planBossMove(state, enemy) {
        if (!state || !state.area || !state.isSpecial || !enemy) return null;
        const style = styleOf(enemy), kind = moveKind(state.area, state.telegraphKind, style);
        if (!kind) return null;
        const source = state.area.source || { gx: enemy.gx, gy: enemy.gy }, stages = stagesOf(kind, state.area, source).filter(stage => stage.cells.length);
        if (!stages.length) return null;
        state.move = { kind, style, source, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
        return state.move;
    }

    /** The boss lets the special go (queueEnemyCombatAttack): its first stage lands after the stage's own time. */
    function beginBossMove(attack, now) {
        const move = attack.bossPattern && attack.bossPattern.move;
        if (!move) return;
        move.releasedAt = now;
        attack.at = now + move.stages[0].ms;
        live.push({ move, source: attack.source, element: attack.source.ele || 'phys', endsAt: now + move.stages[move.stages.length - 1].ms + LINGER_MS });
    }

    /** A volley's shots that hit someone this stage stop there (their later cells drop out). */
    function spendHitLanes(move, cells, now, ms) {
        for (const cell of cells) {
            const probe = { delivery: 'patternArea', bossPattern: { area: { cells: [cell] } } };
            if (move.spent.includes(cell.lane) || !enemyAttackRules.impactTargets(probe, game).length) continue;
            move.spent.push(cell.lane);
            move.hits.push({ lane: cell.lane, gx: cell.gx, gy: cell.gy, at: now, ms });
        }
    }

    function restArea(pattern, move) {
        const cells = move.stages.slice(move.next).flatMap(stage => stage.cells).filter(cell => !move.spent.includes(cell.lane));
        const unique = new Map(cells.map(cell => [gridCellKey(cell.gx, cell.gy), { gx: cell.gx, gy: cell.gy }]));
        return { ...pattern.area, cells: [...unique.values()] };
    }

    /** The landing attack's stage (takePendingEnemyCombatAttack): its pattern becomes this stage's cells and damage, the rest goes back
     * in the queue. null when the attack has no move. { cells, burst }: burst → a ground burst (rings, cross, scatter: the slam's
     * flash, shake and sound). */
    function takeBossMoveStage(attack, queue, now) {
        const pattern = attack.bossPattern, move = pattern && pattern.move;
        if (!move || move.next >= move.stages.length) return null;
        const stage = move.stages[move.next++], cells = stage.cells.filter(cell => !move.spent.includes(cell.lane));
        if (move.kind === 'volley') spendHitLanes(move, cells, now, stage.ms);
        queueRestOfMove(attack, move, queue);
        attack.bossPattern = { ...pattern, area: { ...pattern.area, cells: cells.map(cell => ({ gx: cell.gx, gy: cell.gy })) },
            damageMul: (Number(pattern.damageMul) || 1) * (stage.share || 1), isSpecial: pattern.isSpecial && move.next === 1 };
        return { cells, burst: ['rings', 'cross', 'scatter'].includes(move.kind) };
    }
    /** The stages still to land go back in the queue as one attack (not a special any more: no cast bar, no second log line). A volley
     * whose every shot hit has nothing left. */
    function queueRestOfMove(attack, move, queue) {
        const rest = move.stages.slice(move.next), pattern = attack.bossPattern;
        if (!rest.length || (move.kind === 'volley' && move.spent.length >= laneCount(move))) return;
        queue.push({ ...attack, at: move.releasedAt + rest[0].ms, bossPattern: { ...pattern, isSpecial: false, area: restArea(pattern, move) } });
    }
    const laneCount = move => new Set(move.stages.flatMap(stage => stage.cells.map(cell => cell.lane))).size;

    /** Moves still to draw (js/canvas-boss-moves.js): { move, source, element, endsAt }. */
    function liveBossMoves(now) {
        for (let i = live.length - 1; i >= 0; i--) if (now > live[i].endsAt || now < live[i].move.releasedAt) live.splice(i, 1);
        return live;
    }

    return Object.freeze({ rules: BOSS_MOVE_RULES, fxOf: bossFxOf, styleOf, intro: introSpecial, introCount, plan: planBossMove, begin: beginBossMove,
        takeStage: takeBossMoveStage, live: liveBossMoves });
})();
safeExposeGlobals({ BOSS_MOVE_RULES, bossMoves });
