const assert = require('assert');
const fs = require('fs');

const combat = fs.readFileSync('js/combat.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const canvas = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
const items = fs.readFileSync('data/items.js', 'utf8');
const skills = fs.readFileSync('js/skills.js', 'utf8');

assert(combat.includes('function applyDamageToEnemyResource(enemy, damage, options)'), 'enemy damage must route through resource-layer helper');
assert(combat.includes('enemy.energyShield = Math.max(0'), 'enemy damage helper must deplete energy shield before life');
assert(ui.includes('hp-bar-fill enemy-es'), 'focused enemy DOM card must include an energy-shield layer');
assert(canvas.includes('enemy.maxEnergyShield') && canvas.includes("rgba(92, 184, 255"), 'battlefield canvas must render enemy energy shield bars');
assert(combat.includes('function getCosmosExclusiveEnemyTrait') && combat.includes('우주계 한정:'), 'cosmos monsters must have cosmos-only special traits');
assert(combat.includes("plan.push({ at: 100, count: 1, boss: true })"), 'cosmos map encounters must retain normal packs plus a boss marker rather than single-boss only');
assert(passives.includes('function getRealmEquipmentHiddenTierCap(zone)') && passives.includes('return Math.min(15, 11 + Math.floor((cosmosTier - 1) / 5))'), 'cosmos tier should map to hidden equipment tiers 11~15');
assert(skills.includes("getCraftTierRangeForItem(item, 'fossil')"), 'fossil crafting must use high-tier crafting range helper');
assert(passives.includes("getCraftTierRangeForItem(item, 'spore')"), 'spore crafting must use high-tier crafting range helper');
assert(items.includes("annulment: { name: '소멸의 오브'"), 'annulment currency must be defined');
assert(passives.includes("zone.type === 'cosmos'") && passives.includes("drops.push(['annulment', 1])"), 'annulment must drop only from cosmos currency drops');
assert(passives.includes('function getAnnulmentRemovableStats(item)') && passives.includes("currencyKey === 'annulment'"), 'annulment must remove eligible explicit options only');

console.log('cosmos energy shield, hidden-tier, and annulment smoke checks passed');
