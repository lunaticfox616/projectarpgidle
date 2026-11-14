import { passiveRuleFindAllocatedPassiveKeystone, passiveRuleHasAuthoredPassiveKeystone } from './passive-keystone-lookup.mjs';

/** 칼날 다발(2026-11-01 사용자 글): 힘과 민첩이 같으면 둘의 합 100마다 한손검 투사체가 1개 는다. */
export function passiveRuleGetBladeBundleShots(env, owner, strength, dexterity, stance) {
    if (stance !== 'sword' || !passiveRuleFindAllocatedPassiveKeystone(env, owner, '칼날 다발')) return 0;
    return Math.floor(strength) === Math.floor(dexterity) ? Math.floor((strength + dexterity) / 100) : 0;
}

export function passiveRuleGetPassiveKeystoneCombatFlags(env, owner, skillTags) {
    const tags = new Set(Array.isArray(skillTags) ? skillTags : []);
    return {
        threeBranchLight: passiveRuleHasAuthoredPassiveKeystone(env, owner, '세 갈래 불빛'),
        criticalLimit: passiveRuleHasAuthoredPassiveKeystone(env, owner, '회심의 일격'),
        fleshResonance: passiveRuleHasAuthoredPassiveKeystone(env, owner, '육신의 공명'),
        willResonance: passiveRuleHasAuthoredPassiveKeystone(env, owner, '의지의 공명'),
        farshot: tags.has('projectile') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '최후방 사격'),
        duel: tags.has('attack') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '결투의 규율'),
        bloodCradle: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '피빛 요람'),
        channelPath: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '몰아의 통로'),
        erosionLegacy: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '남겨진 잠식'),
        proxyCovenant: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '대리 성약'),
        maximumRoll: tags.has('attack') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '한 번의 중량'),
        fullEvasion: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '완전 회피'),
        projectileFormation: tags.has('projectile') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '관통 행렬'),
        explosiveDistill: tags.has('potion') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '폭발성 증류'),
        soulSanctuary: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '혼의 성소'),
        movingWall: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '움직이는 성벽'),
        bloodAcceleration: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '피의 가속'),
        openingHunt: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '선제 사냥'),
        taintedWarhead: tags.has('projectile') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '오염된 탄두'),
        blackDistill: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '검은 증류'),
        singleMystique: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '단일 해석'),
        soleMinion: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '단 하나의 사역'),
        potionOverdose: tags.has('potion') && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '과잉 투여'),
        selfExperiment: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '자가실험'),
        absolution: !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '면죄의 복음')
    };
}
