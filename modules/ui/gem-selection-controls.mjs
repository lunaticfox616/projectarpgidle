/** Support tier switch (1 · 2 · 3, locked tiers disabled) for a support gem with more than one tier. */
export function tierButtons(runtime, name) {
    const cap = (0, runtime.deps.getSupportTierCap)(name);
    if (cap <= 1) return '';
    const unlocked = Math.max(1, Math.min(cap, Math.floor((((runtime.deps.game.supportGemData || {})[name]) || {}).unlockedTier || 1)));
    const active = (0, runtime.deps.getSupportActiveTier)(name);
    return '<span class="gem-selection-tiers" aria-label="보조스킬룬 등급">' + [1, 2, 3].slice(0, cap).map(tier =>
        `<button type="button" data-gem-action="tier" data-tier="${tier}" aria-pressed="${tier === active}" ${tier <= unlocked ? '' : 'disabled'}>${(0, runtime.deps._t)('{tier}등급', { tier })}</button>`).join('') + '</span>';
}

/** The detail's own controls: equip / take off, then what used to sit on the card — summon count, support tier,
* seal — and the jump to 강화 · 각인. */
export function summonCount(runtime, name) {
    return `<span class="gem-selection-count"><button type="button" data-gem-action="summon-less" aria-label="${(0, runtime.deps._t)('소환 하나 줄이기')}">−</button><b>${(0, runtime.deps._t)('{name}기', { name: (0, runtime.deps.getSummonSkillCount)(name) })}</b><button type="button" data-gem-action="summon-more" aria-label="${(0, runtime.deps._t)('소환 하나 늘리기')}">+</button></span>`;
}

/** Controls that depend on the kind: support tier, a worn summon gem's count, the jump to 강화 · 각인. */
export function kindControls(runtime, type, name, worn) {
    if (type === 'support') return tierButtons(runtime, name);
    const summon = (runtime.deps.SKILL_DB[name].tags || []).includes('summon_attack');
    const enhance = runtime.deps.game.gemEnhanceUnlocked && (0, runtime.deps.getEquippedEnhanceableGemNames)().includes(name);
    return (summon && worn ? summonCount(runtime, name) : '') + (enhance ? '<button type="button" data-gem-action="enhance">강화와 각인</button>' : '');
}

export function actions(runtime, type, name, anchor) {
    const support = type === 'support';
    const worn = anchor.classList.contains('active');
    const canUnequip = support || runtime.deps.skillGemBoardUi.kindOf(name) === 'summon' || runtime.deps.mobilitySkill.isMobilityGem(name);
    const refusal = (0, runtime.deps.getSkillGemSealRefusal)(name, support);
    const seal = !worn && name !== '기본 공격' ? `<button type="button" data-gem-action="seal" class="gem-selection-seal" ${refusal ? `disabled data-tip="${(0, runtime.deps.escapeHTML)(refusal)}"` : ''}>${(0, runtime.deps._t)('봉인')}</button>` : '';
    return equipButton(runtime, anchor, canUnequip) + kindControls(runtime, type, name, worn) + seal + '<button type="button" data-gem-action="close" aria-label="룬 상세 닫기">닫기</button>';
}

export function equipButton(runtime, anchor, canUnequip) {
    const equipped = anchor.classList.contains('active');
    const blocked = anchor.classList.contains('equipment-blocked') && !equipped;
    const label = equipped ? (canUnequip ? (0, runtime.deps._t)('장착 해제') : (0, runtime.deps._t)('장착 중')) : (0, runtime.deps._t)('장착');
    const disabled = blocked || (equipped && !canUnequip);
    return `<button type="button" class="${equipped ? '' : 'gem-equip-primary'}" data-gem-action="equip" ${disabled ? 'disabled' : ''}>${label}</button>`;
}
