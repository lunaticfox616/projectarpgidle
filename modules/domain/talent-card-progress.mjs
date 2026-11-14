import { TALENT_CARD_LEVEL_THRESHOLDS, TALENT_CARD_MAX_LEVEL, TALENT_BLOOM_DPS_BASE } from '../data/talent-card-settings.mjs';


export function bloomGetTalentBloomScore(env, owner) {
    const { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm } = bloomGetTalentBloomScoreBreakdown(env, owner);
    return deepChaos + labyrinth + chaosFloor + underFloor + cosmos + dpsTerm;
}

export function bloomGetTalentBloomScoreBreakdown(env, owner) {
    let deepChaos = Math.max(0, Math.floor(Number(owner.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(owner.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof env.deps.ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(env.deps.ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(owner.underworldProgress && owner.underworldProgress.highestFloor) || 0));
    const cosmos = cosmosProgressScore(owner);
    const dpsTerm = woodsmanProgressScore(owner);
    return { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm };
}

function cosmosProgressScore(owner) {
    return (owner.cosmosAtlas && Array.isArray(owner.cosmosAtlas.cleared))
        ? owner.cosmosAtlas.cleared.length + ((owner.cosmosAtlas.bossClears || []).length) : 0;
}

function woodsmanProgressScore(owner) {
    const bestDps = Math.max(0, Number((owner.woodsmanEchoRun && owner.woodsmanEchoRun.bestDps) || 0));
    const dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return Math.max(0, dpsTerm);
}

export function bloomGetTalentCardLevel(score) {
    let s = Math.max(0, Math.floor(Number(score) || 0));
    let level = 1;
    for (let i = 0; i < TALENT_CARD_LEVEL_THRESHOLDS.length; i++) {
        if (s >= TALENT_CARD_LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return Math.min(TALENT_CARD_MAX_LEVEL, level);
}

export function bloomRecordTalentBloomCard(env, owner, comboKey) {
    if (!owner.talentCards || typeof owner.talentCards !== 'object') owner.talentCards = {};
    let score = bloomGetTalentBloomScore(env, owner);
    let card = owner.talentCards[comboKey] || { score: 0, level: 1, count: 0 };
    card.count = Math.max(0, Math.floor(card.count || 0)) + 1;
    if (score > (card.score || 0)) card.score = score;
    let prevLevel = Math.max(1, Math.floor(card.level || 1));
    card.level = bloomGetTalentCardLevel(card.score);
    owner.talentCards[comboKey] = card;
    return { card, leveledUp: card.level > prevLevel, score };
}
