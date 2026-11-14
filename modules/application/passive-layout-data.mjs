export function initializePassiveLayout(ctx) {
    ctx.edgeKeys = new Set();
    ctx.nId = 0;
    ctx.genericPathStats = ['aspd', 'move', 'flatHp', 'crit', 'pctDmg', 'flatDmg', 'regen'];
    ctx.regionalPathDefenseStats = {
        templar: ['energyShield', 'energyShieldPct'],
        witch: ['energyShield', 'energyShieldPct'],
        shadow: ['evasion', 'evasionPct'],
        ranger: ['evasion', 'evasionPct'],
        duelist: ['armor', 'armorPct'],
        marauder: ['armor', 'armorPct']
    };
    ctx.centralCoreSpecs = createCoreSpecs(ctx);
    ctx.clusterThemeBySector = createClusterThemes(ctx);
    ctx.sectorThemes = ['templar', 'witch', 'shadow', 'ranger', 'duelist', 'marauder', 'marauder', 'marauder'];
    ctx.sectorCount = ctx.sectorThemes.length;
    ctx.spokesPerSector = 2;
    ctx.webSpokeCount = ctx.sectorCount * ctx.spokesPerSector;
    ctx.maxDepth = 12;
    ctx.innerRadius = 285;
    ctx.ringSpacing = 142;
    ctx.webYScale = 1;
    ctx.angleStep = Math.PI * 2 / ctx.webSpokeCount;
}

export function initializePassiveClusters(ctx) {
    ctx.webCellClusterBlueprints = [
        { role: 'defense', label: ctx.deps._t('방어'), length: 4, spread: 0.34 },
        { role: 'offense', label: ctx.deps._t('화력'), length: 5, spread: 0.42 },
        { role: 'utility', label: ctx.deps._t('운용'), length: 4, spread: 0.50 },
        { role: 'mastery', label: ctx.deps._t('숙련'), length: 5, spread: 0.58 },
        { role: 'survival', label: ctx.deps._t('생존'), length: 4, spread: 0.38 }
    ];
    ctx.tagGemClusterSpecs = [
        { stat: 'firePctDmg', endStat: 'fireGemLevel', title: ctx.deps._t('화염 룬 단련'), length: 5 },
        { stat: 'coldPctDmg', endStat: 'coldGemLevel', title: ctx.deps._t('냉기 룬 단련'), length: 5 },
        { stat: 'lightPctDmg', endStat: 'lightGemLevel', title: ctx.deps._t('번개 룬 단련'), length: 5 },
        { stat: 'chaosPctDmg', endStat: 'chaosGemLevel', title: ctx.deps._t('카오스 룬 단련'), length: 5 },
        { stat: 'physPctDmg', endStat: 'physGemLevel', title: ctx.deps._t('물리 룬 단련'), length: 5 },
        { stat: 'projectilePctDmg', endStat: 'projectileGemLevel', title: ctx.deps._t('투사체 룬 단련'), length: 5 },
        { stat: 'meleePctDmg', endStat: 'meleeGemLevel', title: ctx.deps._t('근접 룬 단련'), length: 5 },
        { stat: 'slamPctDmg', endStat: 'slamGemLevel', title: ctx.deps._t('강타 룬 단련'), length: 5 },
        { stat: 'spellFlatPct', endStat: 'spellGemLevel', title: ctx.deps._t('주문 룬 단련'), length: 5 },
        { stat: 'dotPctDmg', endStat: 'dotGemLevel', title: ctx.deps._t('지속 룬 단련'), length: 5 },
        { stat: 'aoePctDmg', endStat: 'aoeGemLevel', title: ctx.deps._t('범위 룬 단련'), length: 5 },
        { stat: 'elementalPctDmg', endStat: 'elementalGemLevel', title: ctx.deps._t('원소 룬 단련'), length: 5 }
    ];
    ctx.retainedGlobalGemLevelCluster = false;
    ctx.clusterAnchorsById = {};
}

function createCoreSpecs(ctx) {
    return {
        templar: [
            { stat: 'energyShieldPct', title: ctx.deps._t('성역 보호막 관문'), desc: ctx.deps._t('핵심 성좌입니다.') },
            { stat: 'spellFlatPct', title: ctx.deps._t('성광 주문 관문'), desc: ctx.deps._t('핵심 성좌입니다.') }
        ],
        witch: [
            { stat: 'energyShieldPct', title: ctx.deps._t('비전 보호막 관문'), desc: ctx.deps._t('핵심 성좌입니다.') },
            { stat: 'chaosPctDmg', title: ctx.deps._t('공허 부패 관문'), desc: ctx.deps._t('핵심 성좌입니다.') }
        ],
        shadow: [
            { stat: 'evasionPct', title: ctx.deps._t('그림자 회피 관문'), desc: ctx.deps._t('핵심 성좌입니다.') },
            { stat: 'crit', title: ctx.deps._t('급소 절개 관문'), desc: ctx.deps._t('핵심 성좌입니다.') }
        ],
        ranger: [
            { stat: 'evasionPct', title: ctx.deps._t('바람 회피 관문'), desc: ctx.deps._t('핵심 성좌입니다.') },
            { stat: 'projectilePctDmg', title: ctx.deps._t('탄도 개시 관문'), desc: ctx.deps._t('핵심 성좌입니다.') }
        ],
        duelist: [
            { stat: 'armorPct', title: ctx.deps._t('결투 방어 관문'), desc: ctx.deps._t('핵심 성좌입니다.') },
            { stat: 'meleePctDmg', title: ctx.deps._t('연격 개시 관문'), desc: ctx.deps._t('핵심 성좌입니다.') }
        ],
        marauder: [
            { stat: 'armorPct', title: ctx.deps._t('철갑 생존 관문'), desc: ctx.deps._t('핵심 성좌입니다.') },
            { stat: 'physPctDmg', title: ctx.deps._t('대지 강타 관문'), desc: ctx.deps._t('핵심 성좌입니다.') }
        ]
    };
}

function createClusterThemes(ctx) {
    return {
        templar: [
            { stat: 'energyShieldPct', title: ctx.deps._t('성역 보호막') },
            { stat: 'spellFlatPct', title: ctx.deps._t('성광 주문') },
            { stat: 'aoePctDmg', title: ctx.deps._t('신성 범위') },
            { stat: 'resAll', title: ctx.deps._t('원소 수호') },
            { stat: 'firePctDmg', title: ctx.deps._t('정화의 불꽃') }
        ],
        witch: [
            { stat: 'coldPctDmg', title: ctx.deps._t('서리 비전') },
            { stat: 'lightPctDmg', title: ctx.deps._t('번개 비전') },
            { stat: 'chaosPctDmg', title: ctx.deps._t('공허 비전') },
            { stat: 'dotPctDmg', title: ctx.deps._t('지속 부패') },
            { stat: 'gemLevel', title: ctx.deps._t('룬 각성') }
        ],
        shadow: [
            { stat: 'crit', title: ctx.deps._t('급소 조준') },
            { stat: 'critDmg', title: ctx.deps._t('치명 배율') },
            { stat: 'leechRateCap', title: ctx.deps._t('흡혈 가속') },
            { stat: 'chaosPctDmg', title: ctx.deps._t('독성 그림자') },
            { stat: 'evasionPct', title: ctx.deps._t('그림자 회피') }
        ],
        ranger: [
            { stat: 'projectilePctDmg', title: ctx.deps._t('투사체 숙련') },
            { stat: 'projectileExtraShots', title: ctx.deps._t('추가 발사') },
            { stat: 'evasionPct', title: ctx.deps._t('바람 회피') },
            { stat: 'coldPctDmg', title: ctx.deps._t('냉기 사격') },
            { stat: 'coldPctDmg', title: ctx.deps._t('냉기 사격') }
        ],
        duelist: [
            { stat: 'meleePctDmg', title: ctx.deps._t('근접 결투') },
            { stat: 'ds', title: ctx.deps._t('연속 타격') },
            { stat: 'leechInstanceCap', title: ctx.deps._t('깊은 흡혈') },
            { stat: 'aspd', title: ctx.deps._t('쌍검 속도') },
            { stat: 'physPctDmg', title: ctx.deps._t('정밀 물리') }
        ],
        marauder: [
            { stat: 'physPctDmg', title: ctx.deps._t('물리 파쇄') },
            { stat: 'slamPctDmg', title: ctx.deps._t('강타 충격') },
            { stat: 'armorPct', title: ctx.deps._t('철갑 강화') },
            { stat: 'pctHp', title: ctx.deps._t('거인의 생명') },
            { stat: 'leechTotalCap', title: ctx.deps._t('피의 저수지') }
        ]
    };
}
