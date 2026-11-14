export function practiceGearStep(runtime, before) {
    if (!before.keys.length) return runtime.handlers.practiceStep(1, 1, '빛나는 착용 장비를 눌러 어떤 능력치가 붙어 있는지 확인하세요.', ['#ui-equip-list .equipment-slot:not(.equipment-slot-empty):not([data-slot="무기"])', '#ui-equip-list .equipment-slot:not(.equipment-slot-empty)']);
    if (before.keys.includes(runtime.deps.equipmentInventoryInteraction.getFocusedKey()) && !practiceWorn(runtime)) {
        return {
            ...runtime.handlers.practiceStep(2, 2, '장비를 더블클릭, 혹은 장착 위치에 드래그 앤 드롭하거나 장착 버튼을 눌러서 장착하세요.',
                runtime.state.practiceEquipButton, '#ui-equipment-inventory-inspector .eqw-pick'),
            dock: true
        };
    }
    return runtime.handlers.practiceStep(1, 2, '가방에서 빛나는 장비를 골라 비교 화면을 여세요.', before.cards);
}

export function practiceRuneStep(runtime, before) {
    if (before.cards.some(selector => runtime.deps.document.querySelector(selector + '.is-gem-selected')) && runtime.deps.document.querySelector(runtime.state.practiceRuneEquipButton)) {
        return runtime.handlers.practiceStep(2, 2, '룬을 더블클릭하거나 장착 버튼을 눌러 장착하세요.', runtime.state.practiceRuneEquipButton, '#gem-selection:popover-open .gem-selection-actions');
    }
    const kind = runtime.deps.skillGemBoardUi.currentKind();
    const picker = before.kinds.includes(kind) ? [] : before.kinds.map(type => `#ui-skill-picker-tabs [data-picker-kind="${type}"]`);
    return runtime.handlers.practiceStep(1, 2, '빛나는 룬을 고르세요. 다른 분류에 있다면 빛나는 분류 탭부터 누르세요.',
        [...before.cards, ...picker], '#tab-skills #ui-skill-picker-tabs');
}

export function practiceSeedStep(runtime, before) {
    const touch = runtime.deps.uiDisplay.matches('(hover: none), (max-width: 680px)');
    const total = touch ? 3 : 2;
    const board = runtime.deps.document.querySelector('#stump-box-board .stump-board');
    if (board?.matches('.is-cube,.is-nursery')) {
        const side = board.matches('.is-nursery') ? 'bottom' : 'top';
        return runtime.handlers.practiceStep(1, total, '빛나는 보석을 눌러 그루터기 함을 여세요.', `#stump-box-board .stump-frame-button.is-${side}`);
    }
    if (runtime.deps.document.getElementById('stump-box-storage')?.hidden) {
        return runtime.handlers.practiceStep(1, total, '왼쪽 보석을 눌러 씨앗 보관함을 여세요.', '#stump-box-board .stump-frame-button.is-left');
    }
    if (before.cards.some(selector => runtime.deps.document.querySelector(selector + '.is-selected'))) {
        if (runtime.deps.document.querySelector(runtime.state.practicePlacement)) return runtime.handlers.practiceStep(3, 3, '미리보기에서 ‘배치’를 눌러 씨앗을 심으세요.', runtime.state.practicePlacement);
        return runtime.handlers.practiceStep(2, total, '그루터기 함의 빈 칸을 누르거나 씨앗을 더블클릭하여 장착하세요. 장착한 씨앗은 적을 처치하면 성장합니다.',
            runtime.state.practiceEmptyCell, '#stump-box-detail:popover-open .stump-detail-head');
    }
    return runtime.handlers.practiceStep(1, total, '그루터기 보관함에서 빛나는 씨앗을 고르세요.', before.cards);
}

export function practicePassiveStep(runtime) {
    if (!runtime.deps.uiDisplay.matches('(max-width: 1080px)')) {
        return runtime.handlers.practiceStep(1, 1, '이미 투자한 경로에 닿아 있는 노드만 1포인트로 열 수 있어요. 금빛 고리가 있는 노드를 눌러 투자하세요.', '#tree-canvas');
    }
    const node = runtime.deps.document.querySelector(runtime.state.practicePassivePanel)?.dataset.nodeId;
    if (node && !runtime.deps.game.passives.includes(node) && (0, runtime.deps.getPassiveActivationPath)(node).length === 1 && runtime.deps.document.querySelector(runtime.state.practicePassiveConfirm)) {
        return runtime.handlers.practiceStep(2, 2, '노드의 효과를 확인하고 ‘1포인트 사용’을 누르세요.', runtime.state.practicePassiveConfirm);
    }
    return runtime.handlers.practiceStep(1, 2, '이미 투자한 경로에 닿아 있는 금빛 고리 노드를 눌러 효과를 확인하세요.', '#tree-canvas');
}

export function createPracticeStep() {
    return function practiceStep(number, total, body, selector, inline) { return { number, total, body, selector, inline }; };
}

export function practiceSelectors(runtime, prefix, attribute, values) { return values.map(value => `${prefix}[${attribute}="${runtime.deps.CSS.escape(String(value))}"]`); }

export function practiceGearChoices(runtime) { return runtime.deps.game.inventory.filter(item => item && !runtime.deps.bagItems.isSpecial(item)
            && (0, runtime.deps.getEquipCandidateSlots)(item).some(slot => (0, runtime.deps.canEquipItemToSlot)(item, slot))); }

export function practiceEquippedKeys(runtime) { return Object.values(runtime.deps.game.equipment).filter(Boolean).map(runtime.deps.equipmentInventoryGridRuntime.getItemKey); }

export function practiceWorn(runtime) { return !!runtime.deps.equipmentInventoryInteraction.getFocusedEquipmentSlot(); }

export function practiceGearCards(runtime, keys) { return practiceSelectors(runtime, '#ui-inventory-list .equipment-grid-item', 'data-equipment-grid-key', keys); }

export function practiceEquippedRunes(runtime) { return [runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill, ...runtime.deps.game.equippedSummonSkills]; }

export function practiceRuneChoices(runtime) {
    const worn = practiceEquippedRunes(runtime);
    return runtime.deps.game.skills.filter(name => runtime.deps.SKILL_DB[name]?.isGem && !runtime.deps.SKILL_DB[name].basicSkill
            && !worn.includes(name) && (0, runtime.deps.canUseSkillWithCurrentEquipment)(name));
}

export function practiceRuneCards(runtime, names) { return practiceSelectors(runtime, '#ui-skills-list .gem-library-card:not(.active,.equipment-blocked)', 'data-attack-rune', names); }

export function practiceSeedIds(runtime) { return runtime.deps.stumpBox.storage(runtime.deps.game).filter(item => item.family === 'seed' && !runtime.deps.stumpBox.isMature(item) && !item.locked).map(item => item.id); }

export function practiceEmptyStumpCell(runtime) { return runtime.deps.game.stumpBox.board.some((id, cell) => id === null && runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)); }

export function practiceSeedCards(runtime, ids) { return practiceSelectors(runtime, '#stump-box-storage .stump-item', 'data-item', ids); }
