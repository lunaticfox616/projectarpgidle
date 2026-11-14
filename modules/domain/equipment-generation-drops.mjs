import { gearPickWeightedMod } from './equipment-mod-selection.mjs';
import { gearChooseItemBase, gearCreateItemFromBase, gearMaybeApplyExceptionalBase } from './equipment-generation-bases.mjs';
import { gearGenerateUniqueItem } from './equipment-generation-uniques.mjs';

export function gearApplyEncroachmentToItem(item, sourceFloor) {
    if (!item || item.rarity === 'unique' || item.encroached) return item;
    item.encroached = {
        liberated: false,
        sourceFloor: Math.max(1, Math.floor(sourceFloor || 1)),
        pendingOptions: [],
        chosen: null
    };
    return item;
}

export function gearGetEncroachmentDropChance(enemy) {
    if (!enemy) return 0;
    if (enemy.isBoss) return 0.10;
    if (enemy.isElite) return 0.04;
    return 0.012;
}

export function gearMaybeApplyChaosRealmEncroachment(item, enemy, zone) {
    if (!item || !zone || zone.type !== 'chaosRealm' || item.rarity === 'unique') return item;
    if (Math.random() >= gearGetEncroachmentDropChance(enemy)) return item;
    gearApplyEncroachmentToItem(item, Math.max(1, Math.floor(zone.floor || 1)));
    return item;
}

/** The region an equipment drop remembers: an atlas map's region once 세계수 기운 is open, none elsewhere. */
export function gearGetEquipmentDropRegion(env, zone, state) {
    if (!zone || zone.type !== 'atlasMap' || !env.deps.contentProgression.holds('regionAffix', state)) return null;
    return env.deps.normalizeDropRegion(zone.atlasRegion);
}

export function gearMaybeApplyDroppedFossilExclusiveAffix(env, item, enemy, zoneTier, owner) {
    if (!env.deps.contentProgression.isUnlocked('fossilRestore', owner) || !item || item.rarity === 'unique') return item;
    let chance = fossilAffixChance(enemy);
    if (Math.random() >= chance) return item;
    let pool = typeof env.deps.getFossilExclusivePool === 'function'
        ? env.deps.getFossilExclusivePool(item)
        : env.deps.FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return item;
    return appendDroppedFossilAffix(env, item, pool, zoneTier);
}

function fossilAffixChance(enemy) {
    return enemy && enemy.isBoss ? 0.12 : (enemy && enemy.isElite ? 0.06 : 0.018);
}

function appendDroppedFossilAffix(env, item, pool, zoneTier) {
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= env.deps.EXPLICIT_AFFIX_LINE_CAP) item.stats.pop();
    let tierRange = env.deps.getDroppedAffixTierRange(zoneTier);
    let roll = env.deps.rollAffixValueInTierRange(
        gearPickWeightedMod(pool), tierRange.min, tierRange.max, env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
    );
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    if (item.rarity === 'normal') item.rarity = 'magic';
    env.deps.updateItemName(item);
    return item;
}

/** 정해 준 칸, 아니면 아무 칸(지도 기운이 부위 가중치를 주면 그 가중치로, js/loot-omens.js slotWeights). 뿌리촉수의 제 무기는 따로
 * 굴린다(js/combat-kill-rewards.js grantRootWeaponPick, data/bosses.js). */
export function gearGetEquipmentDropSlot(env, options, zone) {
    if (env.deps.EQUIPMENT_DROP_SLOTS.includes(options?.slot)) return options.slot;
    const weights = env.deps.lootOmens.slotWeights(zone);
    if (!weights) return env.deps.rndChoice(env.deps.EQUIPMENT_DROP_SLOTS);
    let roll = Math.random() * env.deps.EQUIPMENT_DROP_SLOTS.reduce((sum, slot) => sum + (weights[slot] || 1), 0);
    return env.deps.EQUIPMENT_DROP_SLOTS.find(slot => (roll -= weights[slot] || 1) < 0) || env.deps.EQUIPMENT_DROP_SLOTS[env.deps.EQUIPMENT_DROP_SLOTS.length - 1];
}

export function* gearGenerateEquipmentDrop(env, enemy, options, owner) {
    let zone = options && options.zone ? options.zone : (env.deps.getZone(owner.currentZoneId) || {});
    const itemLevel = env.deps.levelProgression.itemLevel(zone, enemy);
    let hiddenTierCap = Math.min(env.deps.getRealmEquipmentHiddenTierCap(zone), env.deps.levelProgression.maxDropTier(itemLevel));
    let dropTier = Math.min(env.deps.rollRealmItemDropTier(zone, enemy), env.deps.levelProgression.maxDropTier(itemLevel));
    let affixTierCap = Math.min(env.deps.levelProgression.affixCap(itemLevel), env.deps.getRealmEquipmentAffixTierCap(zone, dropTier));
    let affixTierRange = env.deps.getDroppedAffixTierRange(affixTierCap);
    let slot = gearGetEquipmentDropSlot(env, options, zone);
    let base = gearChooseItemBase(env, slot, dropTier, zone, env.deps.getRootMonsterWeapon(enemy));
    let rarity = env.deps.getEquipmentDropRarity(enemy, Math.random());
    if (rarity === 'unique') return env.deps.levelProgression.stampItem((yield* gearGenerateUniqueItem(env, hiddenTierCap, slot, null, zone, owner)), itemLevel);
    let minimumRarity = options && ['normal', 'magic', 'rare'].includes(options.minimumRarity) ? options.minimumRarity : null;
    if (minimumRarity && env.deps.getRarityRank(rarity) < env.deps.getRarityRank(minimumRarity)) rarity = minimumRarity;
    let item = gearCreateItemFromBase(env, base, rarity, dropTier, gearGetEquipmentDropOrigin(env, zone, affixTierCap, affixTierRange, options, owner));
    gearMaybeApplyExceptionalBase(env, item);
    env.deps.equipmentSockets.rollDropSocket(item, owner);
    item = gearMaybeApplyDroppedFossilExclusiveAffix(env, item, enemy, dropTier, owner);
    return env.deps.levelProgression.stampItem(env.deps.itemInfluences.onDrop(gearMaybeApplyChaosRealmEncroachment(item, enemy, zone), enemy, zone), itemLevel);
}

/** createItemFromBase's origin for a drop in zone; options.weigh reweighs the explicit lines (the NPC shops, js/npc-shop.js). */
export function gearGetEquipmentDropOrigin(env, zone, affixTierCap, affixTierRange, ...selection) {
    const [options, owner] = selection;
    return { dropRealm: zone.type || null, dropRegion: gearGetEquipmentDropRegion(env, zone, owner), affixTierCap, affixTierFloor: affixTierRange.min,
        tierWeightFalloff: env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF, weigh: options && options.weigh };
}
