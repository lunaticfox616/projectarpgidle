import { summon } from './saved-support-runes.mjs';

/** The main gem and the 이동 스킬 slot (스킬 변경분 2). A summon gem is never the main gem; a mobility gem worn as the main
 * gem moves to its own slot (unless one is already there) and the main gem falls back to 기본 공격; the slot keeps only an
 * owned mobility gem. Idempotent. */
export function normalizeSkillSlotsSave(deps, merged) {
    merged.activeSkill = deps.SKILL_DB[merged.activeSkill] ? merged.activeSkill : (merged.skills[0] || '기본 공격');
    if (summon(deps, merged.activeSkill)) {
        if (!merged.gemEnhanceTargetSkill) merged.gemEnhanceTargetSkill = merged.activeSkill;
        merged.activeSkill = '기본 공격';
    }
    const worn = name => deps.mobilitySkill.isMobilityGem(name) && merged.skills.includes(name);
    moveAttackSlotMobilityGem(deps, merged, worn);
    keepBlockedMobilityGem(deps, merged, worn);
    merged.mobilitySkill = worn(merged.mobilitySkill) ? merged.mobilitySkill : '';
}

/** The loop start (2026-11-09 스킬 전달본 V3.14): the first kill's weapon drop flag, the first loop's starter weapon waiting for its equip guide
 * (an item id still in the bag, else none), this loop's basic skill elements ({ loop, elements }, valid and distinct, else none) and the
 * element picked last (the auto loop keeps it). A save from the starter rune days (until 2026-11-09) loses its rune guide mark: the rune it
 * named is worn when the hero still fights with 기본 공격 (as closing that guide did), and its first-kill flag carries over. */
export function normalizeStarterWeaponSave(deps, state) {
    wearOldStarterGem(deps, state, state.starterGemTutorialPending);
    state.loopStarterWeaponGranted = state.loopStarterWeaponGranted === true || state.loopStarterGemGranted === true;
    for (const key of ['starterGemTutorialPending', 'loopStarterGemGranted', 'pendingStarterRuneChoice']) delete state[key];
    const pending = state.starterWeaponTutorialPending, bag = Array.isArray(state.inventory) ? state.inventory : [];
    state.starterWeaponTutorialPending = Number.isSafeInteger(pending) && bag.some(item => item && item.id === pending) ? pending : null;
    normalizeBasicSkillOfferSave(deps, state);
}

export function wearOldStarterGem(deps, state, name) {
    if (typeof name === 'string' && state.activeSkill === '기본 공격' && state.skills.includes(name) && deps.SKILL_DB[name]?.isGem) state.activeSkill = name;
}

export function normalizeBasicSkillOfferSave(deps, state) {
    const offer = state.basicSkillOffer, elements = deps.BASIC_SKILL_ELEMENTS.map(row => row.ele);
    const picked = offer && Number.isInteger(offer.loop) && Array.isArray(offer.elements) ? offer.elements.filter(ele => elements.includes(ele)) : [];
    state.basicSkillOffer = picked.length && new Set(picked).size === picked.length ? { loop: offer.loop, elements: picked } : null;
    if (!elements.includes(state.basicSkillElement)) state.basicSkillElement = '';
}

/** Ownership lists and the base resonance capacity are normalized together before rune operations. Zero is a valid capacity. */
export function normalizeOwnedGemLibrariesSave(deps, state) {
    state.skills = (0, deps.dedupeList)(Array.isArray(state.skills) ? state.skills.filter(name => !!deps.SKILL_DB[name]) : []);
    if (!state.skills.includes('기본 공격')) state.skills.unshift('기본 공격');
    state.sealedSkills = (0, deps.dedupeList)(Array.isArray(state.sealedSkills) ? state.sealedSkills.filter(name => !!deps.SKILL_DB[name] && name !== '기본 공격' && !state.skills.includes(name)) : []);
    state.supports = (0, deps.dedupeList)(Array.isArray(state.supports) ? state.supports.filter(name => !!deps.SUPPORT_GEM_DB[name]) : []);
    state.sealedSupports = (0, deps.dedupeList)(Array.isArray(state.sealedSupports) ? state.sealedSupports.filter(name => !!deps.SUPPORT_GEM_DB[name] && !state.supports.includes(name)) : []);
    state.equippedSupports = Array.isArray(state.equippedSupports) ? (0, deps.dedupeList)(state.equippedSupports.filter(name => state.supports.includes(name))) : [];
    state.resonancePower = Number.isFinite(state.resonancePower) ? Math.max(0, Math.floor(state.resonancePower)) : deps.defaultGame.resonancePower;
}

/** Before saveVersion 21 every seal added 1 to resonancePower and a restore took it back. The base now leaves the seals out and
 * gemDropRewards.sealResonance adds 1 per two sealed runes (2026-11-09 사용자). Once, after the rune lists are normalized. */
export function removeOldSealResonanceSave(state) {
    state.resonancePower = Math.max(0, state.resonancePower - state.sealedSkills.length - state.sealedSupports.length);
}

/** A mobility gem in the main slot goes to the empty mobility slot, unless the save wears 칼이 된 발걸음 (data/items.js), which keeps
 * it there as the attack gem. Idempotent. */
export function moveAttackSlotMobilityGem(deps, merged, worn) {
    if (!deps.mobilitySkill.isMobilityGem(merged.activeSkill) || (0, deps.isMobilityRuneAttackWorn)(merged)) return;
    if (!worn(merged.mobilitySkill)) merged.mobilitySkill = merged.activeSkill;
    merged.activeSkill = '기본 공격';
}

/** A main gem held back for the weapon (js/skills.js fitActiveSkillToWeapon) that is a mobility gem now (전도성 난격 of 0.3.8) goes to
 * the empty mobility slot, never back to the main attack. Idempotent. */
export function keepBlockedMobilityGem(deps, merged, worn) {
    if (!deps.mobilitySkill.isMobilityGem(merged.weaponBlockedSkill)) return;
    if (!worn(merged.mobilitySkill) && worn(merged.weaponBlockedSkill)) merged.mobilitySkill = merged.weaponBlockedSkill;
    merged.weaponBlockedSkill = '';
}

/** The gem the enhance screen opens on: one that is worn — the main gem, the mobility gem or a summon gem. */
export function normalizeGemEnhanceTargetSave(deps, merged) {
    const worn = [merged.activeSkill, merged.mobilitySkill, ...merged.equippedSummonSkills].filter(name => deps.SKILL_DB[name]?.isGem);
    if (worn.includes(merged.gemEnhanceTargetSkill)) return;
    merged.gemEnhanceTargetSkill = worn[0] || null;
}

/** Removed support runes (data/skills.js RETIRED_SUPPORT_GEMS) leave every saved place before validation: their record, the run's
 * rune rewards, rune rows on the floor and in encounter buffers, NPC shelves and the woodsman snapshot. The rune lists are filtered by
 * SUPPORT_GEM_DB below. A saved row naming one failed the exploration loot check and with it the whole load. Idempotent. */
export function dropRetiredSupportGems(deps, merged) {
    const retired = name => deps.RETIRED_SUPPORT_GEMS.includes(name);
    const keepRune = row => !(row && row.gem && row.gem.kind === 'support' && retired(row.gem.name));
    const filterRows = (owner, key) => { if (owner && Array.isArray(owner[key])) owner[key] = owner[key].filter(keepRune); };
    if (merged.supportGemData && typeof merged.supportGemData === 'object') deps.RETIRED_SUPPORT_GEMS.forEach(name => delete merged.supportGemData[name]);
    const run = merged.actExploration;
    if (run?.loot && Array.isArray(run.loot.gems)) run.loot.gems = run.loot.gems.filter(row => !(row && row.kind === 'support' && retired(row.name)));
    filterRows(run, 'groundLoot');
    filterRows(merged.colony, 'pendingLoot');
    filterRows(merged.voidRift?.grandRun, 'pendingLoot');
    Object.values(merged.npcShops && typeof merged.npcShops === 'object' ? merged.npcShops : {}).forEach(shop => filterRows(shop, 'offers'));
    dropRetiredSupportsFrom(deps, merged.woodsmanBuildSnapshot, retired);
}

/** Remove old shop stock without touching owned, sealed or uncollected runes. */
export function removeDropOnlyShopWares(deps, state) {
    for (const shop of Object.values(state.npcShops)) {
        if (Array.isArray(shop?.offers)) {
            shop.offers = shop.offers.filter(ware => !deps.SKILL_DB[ware?.gem?.name]?.dropOnly);
        }
    }
    const market = state.blackMarket;
    if (Array.isArray(market?.offers)) {
        // The black market keys locks by slot, so do not move the other offers.
        market.offers = market.offers.map(offer =>
            offer?.type === 'skillGem' && deps.SKILL_DB[offer.name]?.dropOnly ? null : offer);
    }
}

export function dropRetiredSupportsFrom(deps, build, retired) {
    if (!build || typeof build !== 'object') return;
    ['supports', 'sealedSupports', 'equippedSupports'].forEach(key => { if (Array.isArray(build[key])) build[key] = build[key].filter(name => !retired(name)); });
    if (build.supportGemData && typeof build.supportGemData === 'object') deps.RETIRED_SUPPORT_GEMS.forEach(name => delete build.supportGemData[name]);
}

/** 가호 룬에 남은 각인을 지우고, 쓴 창공의 정수를 돌려준다: 각인마다 1, 넓힌 각인 칸마다 그때 낸 값(2칸째 2 ... 5칸째 5).
 * 지운 뒤에는 남은 각인도 넓힌 칸도 없어 다시 돌려주지 않는다. */
export function refundBlessingEngravings(deps, merged) {
    const refund = blessingRuneNamesForSave(deps).reduce((sum, name) => sum + clearBlessingEngraving(merged, name), 0);
    if (refund > 0) merged.currencies.skyEssence = (Number(merged.currencies.skyEssence) || 0) + refund;
}

/** One 가호 rune: its engravings and widened slots go, and what they cost comes back. */
export function clearBlessingEngraving(merged, name) {
    const slots = merged.skyGemEnhancements[name], record = merged.gemData && merged.gemData[name];
    let refund = Array.isArray(slots) ? slots.filter(Boolean).length : 0;
    delete merged.skyGemEnhancements[name];
    const cap = record ? Math.min(5, Math.floor(Number(record.skyEnhanceCap) || 1)) : 1;
    if (cap > 1) {
        refund += cap * (cap + 1) / 2 - 1;
        record.skyEnhanceCap = 1;
    }
    return refund;
}

/** 가호 룬(summon_buff)의 이름들: 2026-11-04부터 각인을 받지 않는다. */
export const blessingRuneNamesForSave = (deps) => Object.keys(deps.SKILL_DB).filter(name => (deps.SKILL_DB[name].tags || []).includes('summon_buff'));
