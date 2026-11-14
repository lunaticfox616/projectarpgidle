import { TALENT_CARD_MAX_LEVEL } from '../data/talent-card-settings.mjs';
import { bloomGetUnlockedTalentSlotCount } from './talent-card-slots.mjs';

export function bloomIsTalentCardActive(env, owner, comboKey) {
    let owned = (owner.talentCards && typeof owner.talentCards === 'object') ? owner.talentCards : {};
    let loadout = Array.isArray(owner.talentCardLoadout) ? owner.talentCardLoadout : [];
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        if (loadout[i] === comboKey && owned[comboKey]) return Math.max(1, Math.floor(owned[comboKey].level || 1));
    }
    return bloomGetGrantedBloomMechanics(env, owner).has(comboKey) ? TALENT_CARD_MAX_LEVEL : 0;
}

export function bloomCollectGrantedBloomMechanics(env, owner) {
    const keys = new Set();
    if (typeof env.deps.forEachActiveKeystoneDef === 'function') env.deps.forEachActiveKeystoneDef(owner, def => { if (def.bloomMechanic) keys.add(def.bloomMechanic); });
    const rows = typeof env.deps.collectSocketedJewels === 'function' && typeof env.deps.UNIQUE_JEWEL_DB !== 'undefined' ? env.deps.collectSocketedJewels(owner.equipment) : [];
    rows.forEach(row => {
        const unique = row.jewel && row.jewel.uniqueId ? env.deps.UNIQUE_JEWEL_DB.find(entry => entry.id === row.jewel.uniqueId) : null;
        if (unique && unique.bloomMechanic) keys.add(unique.bloomMechanic);
    });
    return keys;
}

export function bloomRefreshGrantedBloomMechanics(env, owner) {
    const keys = bloomCollectGrantedBloomMechanics(env, owner);
    env.talentGrantedMechanicsByOwner.set(owner, keys);
    return keys;
}

export function bloomGetGrantedBloomMechanics(env, owner) {
    return owner && typeof owner === 'object' ? (env.talentGrantedMechanicsByOwner.get(owner) || bloomRefreshGrantedBloomMechanics(env, owner)) : new Set();
}
