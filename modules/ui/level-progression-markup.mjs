export function itemRequirementStatus(runtime, item, equipped, slot) {
    if (equipped) return { reason: (runtime.deps.combatEquipmentStats.evaluate(runtime.deps.game).disabled[slot] || []).join(', ') };
    const slots = (0, runtime.deps.getEquipCandidateSlots)(item);
    const checks = slots.map(target => runtime.deps.combatEquipmentStats.inspect(item, target));
    const available = slots.filter((_, index) => checks[index].ok);
    return { reason: available.length ? '' : [...new Set(checks.map(check => check.reason))].join(' / '),
        available: available.length < slots.length ? available.map(runtime.deps.getDualSlotDisplayLabel).join(', ') : '' };
}

export function item(runtime, item, equipped, slot) {
    const required = runtime.deps.levelProgression.requirements(item);
    const attributes = Object.entries(required.attributes).filter(([, value]) => value > 0)
        .map(([key, value]) => `${(0, runtime.deps.getStatName)(key)} ${value}`);
    const level = (0, runtime.deps._t)('요구 Lv.{level}', { level: required.level });
    const { reason, available } = itemRequirementStatus(runtime, item, equipped, slot);
    const warning = reason ? `<div class="tooltip-line" style="color:var(--danger,#ed8d83)">${equipped ? `${(0, runtime.deps._t)('효과 비활성')}, ` : ''}${(0, runtime.deps.escapeHTML)(reason)}</div>` : '';
    const grace = equipped && item.legacyRequirementGrace ? `, ${(0, runtime.deps._t)('기존 장착 유예')}` : '';
    const slotHint = available ? `<div class="tooltip-line" style="color:var(--color-success)">${(0, runtime.deps._t)('장착 가능')}: ${(0, runtime.deps.escapeHTML)(available)}</div>` : '';
    return `<div class="tooltip-line tooltip-meta tooltip-meta-base">${(0, runtime.deps.escapeHTML)([level,...attributes].join(', ') + grace)}</div>${warning}${slotHint}`;
}

export function area(runtime, zone) {
    return `Lv.${runtime.deps.levelProgression.areaLevel(zone)}`;
}

/** Area level and the experience / rune experience / ordinary drop percentages an ordinary enemy of the zone gives at the hero's level. */
export function rewardRates(runtime, zone) {
    const enemy = { level: runtime.deps.levelProgression.areaLevel(zone) };
    const rate = kind => Math.round(runtime.deps.levelProgression.rewardMultiplier(zone, enemy, runtime.deps.game.level, kind) * 100);
    return { level: enemy.level, xp: rate('experience'), rune: rate('gemExperience'), loot: rate('loot') };
}

/** The map card badge: '보상 감소' when an ordinary enemy gives under 100% experience or drops, else ''. */
export function rewardHint(runtime, zone) {
    const { xp, loot } = rewardRates(runtime, zone);
    return xp < 100 || loot < 100 ? (0, runtime.deps._t)('보상 감소') : '';
}

/** data-* attributes the 권장 전투력 tooltip reads (js/ui.js buildMapRewardRow). */
export function rewardData(runtime, zone) {
    const { level, xp, rune, loot } = rewardRates(runtime, zone);
    return `data-area-level="${level}" data-reward-xp="${xp}" data-reward-rune="${rune}" data-reward-loot="${loot}"`;
}

/** 착용 조건이 모자라 꺼진 장비의 칸은 회색으로만 보인다(2026-11-10 사용자: '조건 부족' 꼬리표는 지우고 그냥 회색으로). 까닭은 장비 설명의 요구 줄에 있다. */
export function decorateSlots(runtime, root) {
    const disabled = runtime.deps.combatEquipmentStats.evaluate(runtime.deps.game).disabled;
    root.querySelectorAll('.equipment-slot').forEach(card => card.classList.toggle('equipment-requirements-unmet', !!disabled[card.dataset.slot]));
}
