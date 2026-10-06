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
        const required = levelProgression.requirements(item);
        const attributes = Object.entries(required.attributes).filter(([, value]) => value > 0)
            .map(([key, value]) => `${getStatName(key)} ${value}`);
        const level = item.inheritedLevelExempt ? '계승 · 요구 레벨 면제' : `요구 Lv.${required.level}`;
        const { reason, available } = itemRequirementStatus(item, equipped, slot);
        const warning = reason ? `<div class="tooltip-line" style="color:var(--danger,#ed8d83)">${equipped ? '효과 비활성 · ' : ''}${escapeHTML(reason)}</div>` : '';
        const grace = equipped && item.legacyRequirementGrace ? ' · 기존 장착 유예' : '';
        const slotHint = available ? `<div class="tooltip-line" style="color:var(--color-success)">장착 가능: ${escapeHTML(available)}</div>` : '';
        return `<div class="tooltip-line tooltip-meta tooltip-meta-base">${escapeHTML([level,...attributes].join(' · ') + grace)}</div>${warning}${slotHint}`;
    }
    function area(zone) {
        return `Lv.${levelProgression.areaLevel(zone)}`;
    }
    /** Area level and the experience / ordinary drop percentages an ordinary enemy of the zone gives at the hero's level. */
    function rewardRates(zone) {
        const enemy = { level: levelProgression.areaLevel(zone) };
        return { level: enemy.level, xp: Math.round(levelProgression.rewardMultiplier(zone, enemy, game.level, 'experience') * 100),
            loot: Math.round(levelProgression.rewardMultiplier(zone, enemy, game.level) * 100) };
    }
    /** The map card badge: '보상 감소' when an ordinary enemy gives under 100% experience or drops, else ''. */
    function rewardHint(zone) {
        const { xp, loot } = rewardRates(zone);
        return xp < 100 || loot < 100 ? '보상 감소' : '';
    }
    /** data-* attributes the 권장 전투력 tooltip reads (js/ui.js buildMapRewardRow). */
    function rewardData(zone) {
        const { level, xp, loot } = rewardRates(zone);
        return `data-area-level="${level}" data-reward-xp="${xp}" data-reward-loot="${loot}"`;
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
    return Object.freeze({ item, area, rewardHint, rewardData, decorateSlots });
})();
