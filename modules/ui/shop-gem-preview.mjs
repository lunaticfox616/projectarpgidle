/** The bag analysis' verdict on wearing item ('' while it cannot be worn): the shop card's, and the hall's comparison of the chosen
* show (js/player-exchange.js hallCompareHtml). */
export function gearRatingHtml(runtime, item) {
    const wearable = (0, runtime.deps.getEquipCandidateSlots)(item).some(slot => runtime.deps.combatEquipmentStats.inspect(item, slot).ok);
    const rating = wearable ? runtime.deps.equipmentTriage.rate(item) : null;
    if (!rating) return '';
    const chips = [rating.dpsGainPct >= 1 ? `<span class="is-damage">${(0, runtime.deps._t)('공격 +{dpsGainPct}%', { dpsGainPct: rating.dpsGainPct })}</span>` : '',
        rating.ehpGainPct >= 1 ? `<span class="is-defense">${(0, runtime.deps._t)('생존 +{ehpGainPct}%', { ehpGainPct: rating.ehpGainPct })}</span>` : ''].join('');
    return `<p class="shop-rating">${chips || (0, runtime.deps._t)('<span>현 세팅 유지</span>')}</p>`;
}

/** A rune's picture: a support rune's sigil or the attack rune's art. gem: { kind: 'attack' | 'support', name, tier }. */
export function gemArtHtml(runtime, gem) {
    return gem.kind === 'support' ? runtime.deps.supportGemSigil.html(gem.name, 'shop-gem', 0) : (0, runtime.deps.renderSkillGemArt)(gem.name, 'shop-gem', { eager: true, plain: true });
}

/** A rune's card: its kind and text, and for an attack rune why the weapon in hand cannot use it, else what wearing it brings. */
export function gemCardHtml(runtime, gem) {
    const support = gem.kind === 'support', def = (support ? runtime.deps.SUPPORT_GEM_DB : runtime.deps.SKILL_DB)[gem.name] || {};
    const need = (0, runtime.deps.getRuneLevelReq)(gem.name, support);
    const copies = support ? 0 : runtime.deps.gemDropRewards.copyCount(runtime.deps.game, gem.name);
    const kind = `${support ? (0, runtime.deps._t)('보조스킬룬, {name}', { name: (0, runtime.deps.getSupportTierLabel)(gem.name, gem.tier) }) : (0, runtime.deps._t)('공격 룬')}${need ? `, Lv.${need}` : ''}${copies ? (0, runtime.deps._t)(', 보유 {copies}개', { copies }) : ''}`;
    return `<div class="shop-gem-card"><div class="shop-gem-head">${gemArtHtml(runtime, gem)}<div><small>${(0, runtime.deps.escapeHTML)(kind)}</small>
            <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(gem.name))}</strong></div></div><p>${runtime.deps.statToneText.html((0, runtime.deps._t)(def.desc) || '')}</p>${support ? supportFitHtml(runtime, gem) : runeFitHtml(runtime, gem.name)}</div>`;
}

/** An attack rune against the hero now: why the weapon in hand cannot use it (as its loot line says, js/currency-acquisition-ui.js),
* or what wearing it brings. Wisp runes summon instead of striking, and mobility runes go to their own slot (not the main attack's):
* neither shows a line. */
export function runeFitHtml(runtime, name) {
    const note = (0, runtime.deps.getSkillRuneBlockedLine)(name);
    if (note) return `<p class="shop-note">${(0, runtime.deps.escapeHTML)(note)}</p>`;
    return (runtime.deps.SKILL_DB[name]?.tags || []).includes('summon') || (0, runtime.deps.isMobilityRuneName)(name) ? '' : wearPreviewHtml(runtime, copy => { copy.activeSkill = name; });
}

/** A support rune the hero could wear at its shelf tier now: what wearing it brings (buying only grants it). */
export function supportFitHtml(runtime, gem) {
    const levelNote = (0, runtime.deps.getRuneLevelNote)(gem.name, true);
    if (levelNote) return `<p class="shop-note">${(0, runtime.deps._t)('지금 쓸 수 없음: {levelNote}', { levelNote })}</p>`;
    return supportFits(runtime, gem) ? wearPreviewHtml(runtime, copy => wearSupportOnCopy(runtime, copy, gem)) : '';
}

/** A free support place and enough 공명력 for the shelf tier, as toggleSupport checks (a worn one frees its own cost first). */
export function supportFits(runtime, gem) {
    const worn = Array.isArray(runtime.deps.game.equippedSupports) ? runtime.deps.game.equippedSupports : [], wearing = worn.includes(gem.name);
    const stats = (0, runtime.deps.getUiPlayerStats)(), used = worn.reduce((sum, name) => sum + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    if (!wearing && worn.length >= Math.floor(stats.suppCap || 0)) return false;
    if (runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return true;
    const freed = wearing ? (0, runtime.deps.getSupportTierResonanceCost)(gem.name) : 0;
    return (0, runtime.deps.getEffectiveResonanceCap)(stats) - used + freed >= (0, runtime.deps.getSupportResonanceCostAtTier)(gem.name, gem.tier);
}

/** The support owned at the shelf tier, that tier active, and worn: on the game copy only. */
export function wearSupportOnCopy(runtime, copy, gem) {
    const record = (copy.supportGemData || {})[gem.name] || { level: 1, exp: 0 };
    copy.supports = [...new Set([...(copy.supports || []), gem.name])];
    copy.supportGemData = { ...copy.supportGemData, [gem.name]: { ...record, unlockedTier: gem.tier, activeTier: gem.tier } };
    copy.equippedSupports = [...new Set([...(copy.equippedSupports || []), gem.name])];
}

/** "장착하면 DPS 60 → 64, 생명력 …" with edit made on a copy of the game (js/passives.js previewBuildStats), in the words and colours of
* the skill tree and act reward previews; nothing when nothing changes. */
export function wearPreviewHtml(runtime, edit) {
    const parts = (0, runtime.deps.buildStatPreviewParts)((0, runtime.deps.previewBuildStats)(edit));
    return parts ? `<p class="shop-gem-dps">${(0, runtime.deps._t)('장착하면 {parts}', { parts })}</p>` : '';
}
