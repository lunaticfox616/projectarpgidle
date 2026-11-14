import { bloomEnsureTalentCardLoadout, bloomGetUnlockedTalentSlotCount } from './talent-card-slots.mjs';
import { bloomClearTalentCardRuntimeState } from './talent-card-runtime.mjs';









export function* bloomEquipTalentCard(env, owner, comboKey) {
    let owned = (owner.talentCards && typeof owner.talentCards === 'object') ? owner.talentCards : {};
    if (!owned[comboKey]) return;
    let loadout = bloomEnsureTalentCardLoadout(owner);
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    if (unlocked <= 0) { yield { kind: 'talentLog', args: [env.deps._t('🔒 아직 장착 슬롯이 열리지 않았습니다.'), 'attack-monster'] }; return; }
    // 이미 장착돼 있으면 해제(토글)
    let existing = loadout.indexOf(comboKey);
    if (existing >= 0) { loadout[existing] = null; yield* bloomAfterTalentLoadoutChange(owner); return; }
    // 빈 슬롯 우선, 없으면 마지막 열린 슬롯 교체
    let target = -1;
    for (let i = 0; i < unlocked; i++) { if (!loadout[i]) { target = i; break; } }
    if (target < 0) target = unlocked - 1;
    loadout[target] = comboKey;
    yield* bloomAfterTalentLoadoutChange(owner);
}

export function* bloomAfterTalentLoadoutChange(owner) {
    bloomClearTalentCardRuntimeState(owner);
    yield { kind: 'talentRefresh', args: [] };
    yield { kind: 'talentSave', args: [200] };
}
