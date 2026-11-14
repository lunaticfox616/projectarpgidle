import { bloomGetTalentCardEffectParts, bloomGetTalentCardName } from './talent-card-text.mjs';

export function createTalentCardPresentation(deps) {
    const env = { deps };
    return {
        getTalentCardEffectParts: (...args) => bloomGetTalentCardEffectParts(env, ...args),
        getTalentCardName: (...args) => bloomGetTalentCardName(env, ...args)
    };
}
