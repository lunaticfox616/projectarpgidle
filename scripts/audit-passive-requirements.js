// Connected, attribute-focused example builds. Greedy choices are not claimed to be optimal.
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();

const findAttributeRoute = require('./lib/passive-attribute-route');

function auditClassRequirements(classId, stat) {
    game = mergeDefaults({}); window.game = game;
    game.selectedClassId = classId; game.passives = [getPassiveTreeRootNodeId()];
    game.level = 100; game.passivePoints = 99;
    const rows = [];
    const stats = Array.isArray(stat) ? stat : [stat];
    for (const target of [36, 78, 130]) {
        const targets = Object.fromEntries(stats.map(key => [key, Math.round(target / Math.sqrt(stats.length))]));
        let totals = getPlayerStats(false).requirementAttributes;
        while (stats.some(key => totals[key] < targets[key])) {
            const choice = findAttributeRoute(targets, totals);
            if (!choice) break;
            const result = activatePassivePath(choice.id, { forcePulseNodeId: '' });
            if (!result.activated) throw new Error(`${classId}: selected route failed to activate`);
            totals = getPlayerStats(false).requirementAttributes;
        }
        rows.push({ classId, targets, points: 99 - game.passivePoints,
            actual: Object.fromEntries(stats.map(key => [key, totals[key]])),
            reached: stats.every(key => totals[key] >= targets[key]), nodeIds: game.passives.slice() });
    }
    return rows;
}

function auditEarlyMixedEquipment(classId, stats) {
    game = mergeDefaults({}); window.game = game;
    game.selectedClassId = classId; game.passives = [getPassiveTreeRootNodeId()];
    game.level = 21; game.passivePoints = 20;
    const base = BASE_ITEM_DB.find(row => row.slot === '갑옷' && row.reqTier === 8
        && stats.every(stat => levelProgression.requirements({baseId:row.id}).attributes[stat] > 0));
    const target = createItemFromBase(base, 'normal', 8);
    const requirements = levelProgression.requirements(target);
    const ringBase = BASE_ITEM_DB.find(row => row.slot === '반지' && row.reqTier === 1 && !row.realmBase);
    for (const slot of ['반지1','반지2']) {
        const ring = createItemFromBase(ringBase,'normal',1);
        const mod = getAvailableMods(ring).find(row => (row.statId || row.id) === stats[1]);
        ring.rarity = 'magic'; ring.stats = [rollAffixValue(mod,1)]; updateItemName(ring);
        game.inventory.push(ring);
        if (!equipItemById(ring.id,slot)) throw new Error('Early ring equip failed');
    }
    let totals = getPlayerStats(false).requirementAttributes;
    while (stats.some(stat => totals[stat] < requirements.attributes[stat])) {
        const choice = findAttributeRoute(requirements.attributes,totals);
        if (!choice || !activatePassivePath(choice.id,{forcePulseNodeId:''}).activated) break;
        totals = getPlayerStats(false).requirementAttributes;
    }
    game.inventory.push(target);
    const equipped = equipItemById(target.id,'갑옷');
    return {classId,base:base.id,level:game.level,requirements,actual:totals,
        points:20-game.passivePoints,equipped,nodeIds:game.passives.slice(),
        attributeRolls:['반지1','반지2'].map(slot => game.equipment[slot].stats[0])};
}

vm.runInContext(`${findAttributeRoute.toString()}\n${auditClassRequirements.toString()}\n${auditEarlyMixedEquipment.toString()}`, runtime);
runtime.hideItemTooltip = () => {}; // DOM-only tooltip closure; equip and stat rules stay real.
const classes = { warrior: 'strength', archer: 'dexterity', wanderer: 'dexterity',
    occultist: 'intelligence', alchemist: 'intelligence', cleric: 'strength' };
const rows = Object.entries(classes).flatMap(([classId, stat]) =>
    vm.runInContext(`auditClassRequirements(${JSON.stringify(classId)},${JSON.stringify(stat)})`, runtime));
const mixed = {warrior:['strength','dexterity'], archer:['dexterity','intelligence'],
    wanderer:['dexterity','strength'], occultist:['intelligence','dexterity'],
    alchemist:['intelligence','strength'], cleric:['strength','intelligence']};
const mixedRows = Object.entries(mixed).flatMap(([classId, stats]) =>
    vm.runInContext(`auditClassRequirements(${JSON.stringify(classId)},${JSON.stringify(stats)})`, runtime));
let equippedRows;
const random = runtime.Math.random;
try {
    runtime.Math.random = () => 0; // Lowest legal T1 roll; availability is not a drop-frequency claim.
    equippedRows = Object.entries(mixed).map(([classId,stats]) =>
        vm.runInContext(`auditEarlyMixedEquipment(${JSON.stringify(classId)},${JSON.stringify(stats)})`,runtime));
} finally { runtime.Math.random = random; }
console.log(JSON.stringify({ method: 'connected greedy paths; rows/mixedRows without equipment; equippedRows use two T1 attribute rings', rows, mixedRows, equippedRows }, null, 2));
if (equippedRows.some(row => !row.equipped)) process.exitCode = 1;
