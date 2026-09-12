const levelProgressionUi = (() => {
    function itemRequirementStatus(item, equipped, slot) {
        if (equipped) return { reason: (combatEquipmentStats.evaluate(game).disabled[slot] || []).join(' · ') };
        const slots = getEquipCandidateSlots(item);
        const checks = slots.map(target => combatEquipmentStats.inspect(item, target));
        const available = slots.filter((_, index) => checks[index].ok);
        return { reason: available.length ? '' : [...new Set(checks.map(check => check.reason))].join(' / '),
            available: available.length < slots.length ? available.map(getDualSlotDisplayLabel).join(' · ') : '' };
    }
    function item(item, equipped, slot) {
        if (isGrowthItem(item)) return '';
        const required = levelProgression.requirements(item);
        const attributes = Object.entries(required.attributes).filter(([, value]) => value > 0)
            .map(([key, value]) => `${getStatName(key)} ${value}`);
        const level = item.inheritedLevelExempt ? '계승 · 요구 레벨 면제' : `요구 Lv.${required.level}`;
        const { reason, available } = itemRequirementStatus(item, equipped, slot);
        const warning = reason ? `<div class="tooltip-line" style="color:var(--danger,#ed8d83)">${equipped ? '효과 비활성 · ' : ''}${escapeHTML(reason)}</div>` : '';
        const grace = equipped && item.legacyRequirementGrace ? ' · 기존 장착 유예' : '';
        const slotHint = available ? `<div class="tooltip-line" style="color:var(--ui-success)">장착 가능: ${escapeHTML(available)}</div>` : '';
        return `<div class="tooltip-line" style="color:var(--copy-muted)">${escapeHTML([level,...attributes].join(' · ') + grace)}</div>${warning}${slotHint}`;
    }
    function area(zone) {
        return `Lv.${levelProgression.areaLevel(zone)}`;
    }
    function rewardHint(zone, compact = false) {
        const enemy = { level: levelProgression.areaLevel(zone) };
        const xp = Math.round(levelProgression.rewardMultiplier(zone, enemy, game.level, 'experience') * 100);
        const loot = Math.round(levelProgression.rewardMultiplier(zone, enemy, game.level) * 100);
        if (compact) return xp < 100 || loot < 100 ? '보상 감소' : '';
        return `${area(zone)} · 일반 적 기준 경험치 ${xp}% · 일반 드랍 ${loot}%`;
    }
    function decorateSlots(root) {
        const disabled = combatEquipmentStats.evaluate(game).disabled;
        root.querySelectorAll('.equipment-slot').forEach(card => {
            const reason = disabled[card.dataset.slot];
            card.classList.toggle('equipment-requirements-unmet', !!reason);
            let badge = card.querySelector('.equipment-requirement-badge');
            if (!reason) { if (badge) badge.remove(); return; }
            if (!badge) { badge = document.createElement('span'); badge.className = 'equipment-requirement-badge'; card.append(badge); }
            badge.textContent = '조건 부족'; badge.title = reason.join(' · ');
        });
    }
    return Object.freeze({ item, area, rewardHint, decorateSlots });
})();
