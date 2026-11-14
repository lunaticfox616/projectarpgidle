import { TALENT_CARD_SLOT_UNLOCKS, TALENT_CARD_SLOT_COUNT } from '../data/talent-card-settings.mjs';

export function bloomGetOwnedTalentCardCount(owner) {
    return (owner.talentCards && typeof owner.talentCards === 'object') ? Object.keys(owner.talentCards).length : 0;
}

export function bloomEnsureTalentCardLoadout(owner) {
    if (!Array.isArray(owner.talentCardLoadout)) owner.talentCardLoadout = [];
    while (owner.talentCardLoadout.length < TALENT_CARD_SLOT_COUNT) owner.talentCardLoadout.push(null);
    if (owner.talentCardLoadout.length > TALENT_CARD_SLOT_COUNT) owner.talentCardLoadout.length = TALENT_CARD_SLOT_COUNT;
    // 보유하지 않은 카드가 슬롯에 남아있으면 비운다.
    let owned = (owner.talentCards && typeof owner.talentCards === 'object') ? owner.talentCards : {};
    for (let i = 0; i < owner.talentCardLoadout.length; i++) {
        if (owner.talentCardLoadout[i] && !owned[owner.talentCardLoadout[i]]) owner.talentCardLoadout[i] = null;
    }
    return owner.talentCardLoadout;
}

export function bloomGetUnlockedTalentSlotCount(owner) {
    let owned = bloomGetOwnedTalentCardCount(owner);
    let count = 0;
    for (let i = 0; i < TALENT_CARD_SLOT_UNLOCKS.length; i++) if (owned >= TALENT_CARD_SLOT_UNLOCKS[i]) count++;
    return count;
}

export function bloomGetTalentCardSlotIndex(owner, comboKey) {
    let loadout = bloomEnsureTalentCardLoadout(owner);
    return loadout.indexOf(comboKey);
}
