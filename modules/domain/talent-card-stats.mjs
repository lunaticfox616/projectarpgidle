import { TALENT_CARD_MAX_LEVEL } from '../data/talent-card-settings.mjs';
import { bloomGetUnlockedTalentSlotCount } from './talent-card-slots.mjs';
import { bloomIsTalentCardActive, bloomGetGrantedBloomMechanics } from './talent-card-mechanics.mjs';
import { bloomGetTalentCardRuntimeDefinition, bloomParseTalentComboKey, bloomGetTalentCardStatBonuses, bloomGetTalentPreciseRule, bloomGetTalentCardUniqEffects } from './talent-card-definitions.mjs';
import { bloomGetTalentMistralStackCount } from './talent-card-runtime.mjs';

export function bloomGetActiveTalentCardStatBonuses(env, owner, tick) {
    let owned = (owner.talentCards && typeof owner.talentCards === 'object') ? owner.talentCards : {};
    let loadout = Array.isArray(owner.talentCardLoadout) ? owner.talentCardLoadout : [];
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = bloomParseTalentComboKey(key);
        let level = Math.max(1, Math.floor(owned[key].level || 1));
        bloomGetTalentCardStatBonuses(env, heroId, classKey, level).forEach(b => out.push({ id: b.stat, val: b.val }));
    }
    bloomPushGrantedBloomMechanicStats(env, owner, out);
    appendMistralStats(env, owner, tick, out);
    return out;
}

function appendMistralStats(env, owner, tick, out) {
    let mistralLevel = bloomIsTalentCardActive(env, owner, 'hero1__ranger');
    let mistralRuntime = bloomGetTalentCardRuntimeDefinition(env, 'hero1__ranger');
    let mistralStacks = bloomReadTalentMistralStacks(env, owner, tick);
    if (mistralLevel > 0 && mistralRuntime && mistralStacks > 0) {
        let ratio = mistralLevel / TALENT_CARD_MAX_LEVEL;
        out.push({ id: 'aspd', val: mistralStacks * mistralRuntime.aspdPerStackAtLevel10 * ratio });
        out.push({ id: 'move', val: mistralStacks * mistralRuntime.movePerStackAtLevel10 * ratio });
    }
}

export function bloomReadTalentMistralStacks(env, owner, tick) {
    return tick ? tick.get('mistralStacks') : bloomGetTalentMistralStackCount(env, owner);
}

export function bloomPushGrantedBloomMechanicStats(env, owner, out) {
    bloomGetGrantedBloomMechanics(env, owner).forEach(key => {
        const rule = bloomGetTalentPreciseRule(env, key);
        Object.entries((rule && rule.stats) || {}).forEach(([stat, value]) => out.push({ id: stat, val: Number(value) || 0 }));
    });
}

export function bloomGetActiveTalentStatMap(env, owner) {
    let map = {};
    bloomGetActiveTalentCardStatBonuses(env, owner).forEach(b => { map[b.id] = (map[b.id] || 0) + b.val; });
    return map;
}

export function bloomGetActiveTalentKeystoneUniqueEffects(env, owner) {
    let owned = (owner.talentCards && typeof owner.talentCards === 'object') ? owner.talentCards : {};
    let loadout = Array.isArray(owner.talentCardLoadout) ? owner.talentCardLoadout : [];
    let unlocked = bloomGetUnlockedTalentSlotCount(owner);
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = bloomParseTalentComboKey(key);
        out.push(...bloomGetTalentCardUniqEffects(env, heroId, classKey, owned[key].level));
    }
    // 키스톤과 고유 주얼이 켠 옛 카드 효과의 고유 효과 줄(최대 레벨)
    bloomGetGrantedBloomMechanics(env, owner).forEach(key => {
        let { heroId, classKey } = bloomParseTalentComboKey(key);
        out.push(...bloomGetTalentCardUniqEffects(env, heroId, classKey, TALENT_CARD_MAX_LEVEL));
    });
    return out;
}
