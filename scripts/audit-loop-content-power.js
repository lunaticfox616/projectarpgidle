'use strict';
// Read-only runtime audit (2026-10-06): does the power that loops open keep up with the loop difficulty curve?
// The same zone, level, gear and main passive tree at every loop; only what loop N opens changes:
//   permanent growth  loop points (loop passive tree, loop-10 stats), deep points (deep passive, --deep-per-loop from loop 10)
//   unlock points     2 per loop from loop 2, bought power-first (craft, support gems, loop tree, trials, deep tree ...)
//   in-loop rebuild   support gems and the ascendancy the player re-earns each loop (levels/points per zone below)
// Usage extra: --talismans N caps the awake talismans (default 8).
// Points go where the game's own readiness model (getMapPowerReadiness) gains most (geometric mean of DPS and EHP).
// A synthetic build: read the ratios between loops, not the absolute numbers. Keystones, engraving, jewels, codex,
// talent cards, runes and other systems are not modelled here. Cores: one core of four average lines from loop 20.
// Talismans (stump box board, from the talisman unlock): min(8, loop - 5) awake talismans of two general lines at their average
// roll (x1.35 from loop 20, strong seal shards), lines picked power-first like the other points.
// Unlock prerequisites (after/requires) are bought first when the budget and their minimum loop allow.
// Seeds and saps (--stump, 2026-10-08 for the box's 16번 unlocks): the open cells the talismans leave hold grown seeds and saps,
// picked power-first per cell (never beside their opposite colour; resonance counts). Grafting is not modelled.
//   none      no seeds or saps (the default, as before)
//   main      main line only at 100% quality (the drops' average): the box before 16번
//   expected  plus the ripening roll at its average: every pool line × (expected extra lines at 100% / pool size),
//             bumper and golden as their average quality gain
//   max       every item at the reached quality cap + bumper, golden, three extra lines at 130%, and one awake scar holding
//             every main stat on the board at its cap (the ceiling after many loops of devouring)
// Usage: node scripts/audit-loop-content-power.js [--loops 1,5,10] [--zones act10,chaos20] [--deep-per-loop 4] [--stump expected]
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const args = process.argv.slice(2);
const option = (flag, fallback) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const loops = option('--loops', '1,3,5,10,15,20,30,40,50').split(',').map(Number);
const deepPerLoop = Number(option('--deep-per-loop', '4'));
const zones = option('--zones', 'act10,chaos20').split(',');
const maxTalismans = Number(option('--talismans', '8')); // awake talismans at most (sensitivity: 0 = none)
const stumpMode = option('--stump', 'none');
if (!['none', 'main', 'expected', 'max'].includes(stumpMode)) throw new Error(`unknown --stump ${stumpMode}`);
// What a player has re-earned by this zone in any loop: support gem level and ascendancy points (trials 1-2 by act 10,
// trials 1-4 by chaos 20).
const STAGES = { act10: { supportLevel: 8, ascendPoints: 4 }, chaos20: { supportLevel: 18, ascendPoints: 7 } };

const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
run(`
var auditSeed = 17;
Math.random = () => { auditSeed = (Math.imul(auditSeed, 1664525) + 1013904223) >>> 0; return auditSeed / 4294967296; };
function auditZoneId(name) {
    if (name === 'act10') return 9;
    const match = /^chaos(\\d+)$/.exec(name);
    if (match) return getAbyssZoneIdForDepth(Number(match[1]));
    throw new Error('unknown zone ' + name);
}
function auditGear(tier) {
    for (const slot of Object.keys(game.equipment)) {
        const baseSlot = slot.replace(/[123]$/, '');
        const base = BASE_ITEM_DB.filter(row => row.slot === baseSlot && (row.reqTier || 1) <= tier).at(-1);
        if (!base) continue;
        const item = { id: ++itemIdCounter, slot: baseSlot, baseId: base.id, baseName: base.name, name: base.name, rarity: 'rare',
            itemTier: tier, hiddenTier: tier, quality: 0, baseStats: rollBaseStats(base, tier), stats: [] };
        rerollExplicitMods(item, 'rare', tier);
        game.equipment[slot] = item;
    }
}
/** Loop 1 character for a zone: its level, gear of its drop tier, a fixed main tree. Nothing a later loop opens. */
function auditBase(zoneName) {
    auditSeed = 17;
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior' });
    window.game = game;
    const zone = getZone(auditZoneId(zoneName)), level = levelProgression.areaLevel(zone);
    Object.assign(game, { season: 1, loopCount: 0, level, maxZoneId: 100 });
    game.contentProgression.inherited = [];
    game.actRewardBonuses = ['strength', 'dexterity', 'intelligence'].map(stat => ({ stat, value: 200 }));
    auditGear(levelProgression.maxDropTier(level));
    game.passives = Object.values(PASSIVE_TREE.nodes).filter(node => node.kind !== 'void' && !node.keystone && !node.intentionalNoEffect)
        .slice(0, Math.max(1, level - 1)).map(node => node.id);
    game.skills = ['연속 베기']; game.activeSkill = '연속 베기';
    game.gemData['연속 베기'] = { level: Math.max(1, Math.min(20, Math.round(level / 4))), exp: 0, quality: 0 };
    return zone;
}
function auditPower(zone) {
    const readiness = getMapPowerReadiness(getPlayerStats(), estimateMapZonePowerRequirements(zone));
    return { dps: readiness.playerDps, ehp: readiness.playerEhp, needDps: readiness.recommendedDps, needEhp: readiness.recommendedEhp };
}
function auditScore(zone) { const p = auditPower(zone); return Math.sqrt(Math.max(1e-9, p.dps) * Math.max(1e-9, p.ehp)); }
/** Spend points where the score gains most per point, looking one step past a pick that only opens others.
 * An option is {cost, apply, undo}; options() is asked again after every pick. */
function auditSpend(zone, options, budget, lookahead = true) {
    let left = budget;
    for (;;) {
        const base = auditScore(zone);
        let best = null;
        for (const option of options()) {
            if (option.cost > left) continue;
            option.apply();
            let gain = (auditScore(zone) / base - 1) / option.cost;
            for (const next of lookahead ? options() : []) {
                if (option.cost + next.cost > left) continue;
                next.apply();
                gain = Math.max(gain, (auditScore(zone) / base - 1) / (option.cost + next.cost));
                next.undo();
            }
            option.undo();
            if (!best || gain > best.gain) best = { option, gain };
        }
        if (!best || best.gain <= 1e-9) return left;
        best.option.apply();
        left -= best.option.cost;
    }
}
function auditSeasonOptions() {
    const rows = [];
    for (const id of getAllSeasonPassiveNodeIds()) {
        const node = getSeasonPassiveNodeDef(id), lv = getSeasonNodeLevel(id);
        if (!canInvestSeasonNode(node, id) || lv >= getSeasonNodeCap(node)) continue;
        rows.push({ cost: 1, apply() { if (lv <= 0) game.seasonNodes.push(id); game.seasonNodeLevels[id] = lv + 1; },
            undo() { if (lv <= 0) { game.seasonNodes = game.seasonNodes.filter(row => row !== id); delete game.seasonNodeLevels[id]; } else game.seasonNodeLevels[id] = lv; } });
    }
    if ((game.season || 1) >= 10) for (const key of ['flatHp', 'flatDmg', 'aspd', 'move']) {
        const lv = game.loop10BonusStats[key] || 0;
        rows.push({ cost: getLoop10StatCost(key), apply() { game.loop10BonusStats[key] = lv + 1; }, undo() { game.loop10BonusStats[key] = lv; } });
    }
    return rows;
}
function auditDeepOptions() {
    return LOOP_DEEP_STATS.map(def => {
        const lv = game.loopDeepStats[def.key] || 0;
        return { cost: getLoopDeepStatCost(def.key), apply() { game.loopDeepStats[def.key] = lv + 1; }, undo() { game.loopDeepStats[def.key] = lv; } };
    });
}
function auditSupportOptions(level) {
    if ((game.equippedSupports || []).length >= 2) return [];
    return Object.keys(SUPPORT_GEM_DB).filter(name => !game.equippedSupports.includes(name)).map(name => ({ cost: 1,
        apply() { game.supports.push(name); game.equippedSupports.push(name); game.supportGemData[name] = { level, exp: 0, quality: 0 }; },
        undo() { game.supports = game.supports.filter(row => row !== name); game.equippedSupports = game.equippedSupports.filter(row => row !== name); } }));
}
function auditAscendOptions() {
    const tree = getClassTreeDef(game.ascendClass);
    return Object.entries(tree).filter(([id, node]) => !game.ascendNodes.includes(id) && node.stat && isAscendNodeRequirementMet(node))
        .map(([id]) => ({ cost: 1, apply() { game.ascendNodes.push(id); }, undo() { game.ascendNodes = game.ascendNodes.filter(row => row !== id); } }));
}
/** One core (loop 20+): the best four lines of the pool at their average roll. */
function auditCoreOptions() {
    const lines = (game.cores.equipped && game.cores.equipped.lines) || [];
    if (lines.length >= CORE_ITEM_RULES.lines) return [];
    const make = rows => rows.length ? coreItems.normalizeCore({ id: 1, lines: rows }) : null;
    return CORE_OPTION_POOL.filter(def => !lines.some(line => line.id === def.id)).map(def => ({ cost: 1,
        apply() { game.cores.equipped = make([...lines, { id: def.id, value: (def.min + def.max) / 2, extraValue: def.extraMin ? (def.extraMin + def.extraMax) / 2 : undefined }]); },
        undo() { game.cores.equipped = make(lines); } }));
}
/** Unlock points (2 per loop from loop 2) bought power-first, as far as loop and order allow; a pick buys its missing
 * prerequisites (after/requires) first, or is skipped when they do not fit. */
function auditUnlocks(season) {
    const order = ['craft', 'support', 'loopTree', 'trials', 'deepTree', 'talent', 'talisman', 'cube', 'engraving', 'jewel', 'gemForge', 'codex'];
    let budget = Math.max(0, season - 1) * CONTENT_UNLOCK_POINTS_PER_LOOP;
    const owned = [];
    const chain = (id, out) => {
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        if (!def || owned.includes(id) || out.includes(id)) return out;
        [def.after, ...(def.requires || [])].filter(Boolean).forEach(key => chain(key, out));
        out.push(id);
        return out;
    };
    for (const id of order) {
        const plan = chain(id, []), defs = plan.map(key => CONTENT_UNLOCK_CATALOG.find(row => row.id === key));
        const cost = defs.reduce((sum, def) => sum + def.cost, 0);
        if (!plan.length || defs.some(def => season < def.minLoop) || cost > budget) continue;
        owned.push(...plan);
        budget -= cost;
    }
    return owned;
}
const AUDIT_TALISMAN_LINES = ['pctDmg', 'physPctDmg', 'crit', 'critDmg', 'aspd', 'resPen', 'minDmgRoll', 'maxDmgRoll',
    'flatHp', 'pctHp', 'dr', 'resAll', 'armorPct', 'evasionPct'];
var auditTalismanLines = [];
/** Puts the chosen lines on the board as awake two-line talismans (cells in the box's opening order). */
function auditTalismanBoard() {
    const box = stumpBox.of(game);
    box.items = box.items.filter(item => item.family !== 'talisman');
    box.board = box.board.map(id => (box.items.some(item => item.id === id) ? id : null));
    for (let k = 0; k < auditTalismanLines.length; k += 2) {
        const item = stumpBox.addTalisman(game, { name: '감사 부적', rarity: 'rare', lines: auditTalismanLines.slice(k, k + 2).map(line => ({ kind: 'stat', ...line })) }, true);
        const cell = STUMP_BOX_CELL_ORDER.find(at => stumpBox.isOpen(game, at) && box.board[at] === null);
        if (!item || cell === undefined) break;
        box.board[cell] = item.id;
        item.xp = STUMP_BOX_GROWTH.need.talisman; item.ripe = true;
    }
}
function auditTalismanOptions(slots, mul) {
    if (auditTalismanLines.length >= slots) return [];
    return AUDIT_TALISMAN_LINES.map(id => TALISMAN_STAT_POOL.find(def => def.id === id)).map(def => ({ cost: 1,
        apply() { auditTalismanLines.push({ id: def.id, value: Math.round((def.min + def.max) / 2 * mul * 10) / 10 }); auditTalismanBoard(); },
        undo() { auditTalismanLines.pop(); auditTalismanBoard(); } }));
}
var auditStumpMode = ${JSON.stringify(stumpMode)};
var auditStumpPicks = [];
const AUDIT_STUMP_KINDS = [['seed', 'flower'], ['seed', 'fruit'], ['sap', null]];
/** The ripening a picked item carries in this mode (see --stump above). */
function auditRipen(item) {
    const r = STUMP_BOX_RIPENING, pool = STUMP_BOX_EXTRA_LINES[item.family === 'sap' ? 'amber' : item.path][item.color];
    if (auditStumpMode === 'expected') {
        const count = r.lineOdds.find(row => row.roll === 1).odds.reduce((sum, odd, k) => sum + odd * k, 0);
        item.roll = 1 + r.bumper.chance * r.bumper.quality + r.golden.chance * (r.golden.mul - 1);
        item.harvest = { bonus: 0, golden: false, lines: pool.map(line => ({ stat: line.stat, value: line.value * count / pool.length })) };
    } else if (auditStumpMode === 'max') {
        item.roll = stumpBox.rollCap(game); item.golden = true;
        item.harvest = { bonus: r.bumper.quality, golden: false, lines: pool.map(line => ({ stat: line.stat, value: line.value * r.lineValue.max })) };
    }
}
function auditStumpCell(box, color) {
    const near = at => stumpBox.neighbors(at).map(next => box.items.find(item => item.id === box.board[next])).filter(Boolean);
    return STUMP_BOX_CELL_ORDER.find(at => stumpBox.isOpen(game, at) && box.board[at] === null
        && !(color && near(at).some(item => item.color === STUMP_BOX_OPPOSITES[color])));
}
/** Talismans stay; the picks go on the board in order (a pick with no cell clear of its opposite is left out). */
function auditStumpBoard() {
    const box = stumpBox.of(game);
    box.items = box.items.filter(item => item.family === 'talisman');
    box.board = box.board.map(id => (box.items.some(item => item.id === id) ? id : null));
    if (auditStumpMode === 'max' && auditStumpPicks.length) {
        const caps = stumpBox.scarCaps(), stats = [...new Set(auditStumpPicks.map(pick => STUMP_BOX_YIELDS[pick.path || 'amber'][pick.color].stat))];
        const scar = { id: box.nextId++, family: 'scar', color: null, path: null, xp: STUMP_BOX_GROWTH.need.scar, ripe: true, roll: 1,
            absorbed: Object.fromEntries(stats.map(stat => [stat, caps[stat]])), meals: 0, misses: 0 };
        const at = auditStumpCell(box, null);
        if (at !== undefined) { box.items.push(scar); box.board[at] = scar.id; }
    }
    for (const pick of auditStumpPicks) {
        const cell = auditStumpCell(box, pick.color);
        if (cell === undefined) continue;
        const item = { id: box.nextId++, family: pick.family, color: pick.color, path: pick.path, xp: STUMP_BOX_GROWTH.need[pick.family], ripe: true, roll: 1 };
        auditRipen(item);
        box.items.push(item); box.board[cell] = item.id;
    }
}
function auditStumpOptions() {
    const box = stumpBox.of(game);
    if (!STUMP_BOX_CELL_ORDER.some(at => stumpBox.isOpen(game, at) && box.board[at] === null)) return [];
    return AUDIT_STUMP_KINDS.flatMap(([family, path]) => Object.keys(STUMP_BOX_COLORS).map(color => ({ cost: 1,
        apply() { auditStumpPicks.push({ family, path, color }); auditStumpBoard(); },
        undo() { auditStumpPicks.pop(); auditStumpBoard(); } })));
}
/** What loop N gives the zone's character: content bought with unlock points, its in-loop rebuild and the permanent points. */
function auditLoop(zone, season, deepPerLoop, stage) {
    Object.assign(game, { season, loopCount: season - 1, seasonNodes: [], seasonNodeLevels: {}, supports: [], equippedSupports: [],
        ascendClass: null, ascendNodes: [], loop10BonusStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 },
        loopDeepStats: { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 0, move: 0, dr: 0, crit: 0 } });
    const owned = auditUnlocks(season);
    game.contentProgression.inherited = owned;
    contentProgression.sync(game);
    if (owned.includes('support')) auditSpend(zone, () => auditSupportOptions(stage.supportLevel), 2);
    if (owned.includes('trials')) {
        let best = null;
        for (const cls of ASCENDANCIES_BY_PLAYER_CLASS.warrior) {
            game.ascendClass = cls; game.ascendNodes = [];
            auditSpend(zone, auditAscendOptions, stage.ascendPoints);
            const score = auditScore(zone);
            if (!best || score > best.score) best = { cls, nodes: game.ascendNodes.slice(), score };
        }
        game.ascendClass = best.cls; game.ascendNodes = best.nodes;
    }
    game.cores = { equipped: null, owned: [] };
    if (owned.includes('cube')) auditSpend(zone, auditCoreOptions, CORE_ITEM_RULES.lines);
    auditTalismanLines = [];
    stumpBox.sync(game, 'audit');
    const talismans = owned.includes('talisman') ? Math.max(0, Math.min(${maxTalismans}, season - 5)) : 0;
    if (talismans > 0) auditSpend(zone, () => auditTalismanOptions(talismans * 2, season >= 20 ? 1.35 : 1), talismans * 2, false);
    auditStumpPicks = [];
    if (auditStumpMode !== 'none' && game.stumpBox.acquired) auditSpend(zone, auditStumpOptions, STUMP_BOX_CELL_ORDER.length, false);
    const loopPoints = Math.max(0, season - 1), deepPoints = owned.includes('deepTree') ? Math.max(0, season - 9) * deepPerLoop : 0;
    if (owned.includes('loopTree')) auditSpend(zone, auditSeasonOptions, loopPoints);
    auditSpend(zone, auditDeepOptions, deepPoints);
    const talismanTally = {};
    auditTalismanLines.forEach(line => { talismanTally[line.id] = (talismanTally[line.id] || 0) + 1; });
    const stumpTally = {};
    stumpBox.of(game).items.filter(item => game.stumpBox.board.includes(item.id) && item.family !== 'talisman')
        .forEach(item => { const key = item.family === 'scar' ? 'scar' : (item.path || 'amber') + '-' + item.color; stumpTally[key] = (stumpTally[key] || 0) + 1; });
    return { owned, loopPoints, deepPoints, ascend: game.ascendClass, supports: game.equippedSupports.slice(),
        deep: { ...game.loopDeepStats }, loop10: { ...game.loop10BonusStats }, talismans: talismanTally, stump: stumpTally };
}
`);

const fmt = value => value >= 100 ? value.toFixed(0) : value.toFixed(2);
for (const zoneName of zones) {
    const stage = JSON.stringify(STAGES[zoneName] || STAGES.chaos20);
    const base = JSON.parse(run(`(() => { const zone = auditBase(${JSON.stringify(zoneName)}); return JSON.stringify(auditPower(zone)); })()`));
    console.log(`\n${zoneName}  loop 1 character: DPS ${base.dps.toFixed(0)} (need ${base.needDps.toFixed(0)}), EHP ${base.ehp.toFixed(0)} (need ${base.needEhp.toFixed(0)})`);
    console.log('loop | unlocked | power DPS x | power EHP x | need DPS x | need EHP x | DPS kept | EHP kept | DPS/need | EHP/need');
    for (const season of loops) {
        const row = JSON.parse(run(`(() => { const zone = auditBase(${JSON.stringify(zoneName)});
            const spent = auditLoop(zone, ${season}, ${deepPerLoop}, ${stage}); return JSON.stringify({ ...auditPower(zone), ...spent }); })()`));
        const pd = row.dps / base.dps, pe = row.ehp / base.ehp, nd = row.needDps / base.needDps, ne = row.needEhp / base.needEhp;
        const tally = rows => Object.entries(rows).filter(([, n]) => n > 0).map(([k, n]) => k + n).join(' ');
        console.log(`${String(season).padStart(4)} | ${String(row.owned.length).padStart(8)} | ${fmt(pd).padStart(11)} | ${fmt(pe).padStart(11)} | ${fmt(nd).padStart(10)} | ${fmt(ne).padStart(10)} | ${fmt(pd / nd).padStart(8)} | ${fmt(pe / ne).padStart(8)} | ${fmt(row.dps / row.needDps).padStart(8)} | ${fmt(row.ehp / row.needEhp).padStart(8)}`
            + `  ${row.ascend || '-'} deep[${tally(row.deep)}] l10[${tally(row.loop10)}] tal[${tally(row.talismans)}]`
            + (stumpMode === 'none' ? '' : ` stump[${tally(row.stump)}]`));
    }
}
