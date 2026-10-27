// 무기 숙련(2026-10-08, docs/late-game-review-20261008.md 6절): 여섯 무기 대분류(data/weapon-categories.js)마다 루프를 넘어 남는 숙련
// 레벨. 그 무기를 들고 잡을 때마다 경험치를 얻고(방치 정산 포함), 레벨마다 그 무기를 들었을 때 피해가 오른다. 10단위 레벨마다 그 무기다운
// 특전이 하나씩 열리고, 여섯 레벨의 합이 이정표를 넘을 때마다 방치 효율(data/offline-progress.js)이 오른다. 규칙은 js/weapon-mastery.js.
const WEAPON_MASTERY = Object.freeze({
    maxLevel: 50,
    // 레벨 L에서 L+1까지 경험치 = base × growth^(L-1). 10까지 약 1만, 20까지 약 5만 3천, 30까지 약 22만 6천, 50까지 약 377만.
    // 2026-10-25 사용자 "레벨이 올라갈수록 더 올리기 힘들게": growth 1.12에서 1.15. 10까지는 거의 같고(전 약 8,900) 30까지 약 1.8배,
    // 50까지 약 2.9배다(전 약 129만). 방치 정산 측정으로 시간당 경험치가 시작 무렵 약 2,500, 후반 약 5,000이라 50까지 후반 빌드로 약
    // 750시간이다. 2026-10-09 사용자 "무기 숙련 지금보다 훨씬 어렵게"로 판 1(base 150, growth 1.13)에서 판 2(base 600, growth 1.12)가 됐다.
    // 앞 판으로 쌓인 경험치는 레벨과 그 레벨 안의 진행 비율을 그대로 옮긴다(js/weapon-mastery.js upgrade, 저장 v).
    curve: Object.freeze({ base: 600, growth: 1.15 }),
    pastCurves: Object.freeze({ 1: Object.freeze({ base: 150, growth: 1.13 }), 2: Object.freeze({ base: 600, growth: 1.12 }) }),
    curveVersion: 3,
    // 처치 한 번의 경험치: 보스, 정예, 일반.
    killXp: Object.freeze({ boss: 20, elite: 4, normal: 1 }),
    // 레벨 2부터 레벨마다 그 무기를 들었을 때(50에서 피해 +24.5%). 경험치가 없는 레벨 1은 아무것도 붙지 않는다.
    perLevel: Object.freeze({ stat: 'pctDmg', val: 0.5 }),
    // 레벨 10, 20, 30, 40, 50의 특전. 그 무기를 들었을 때만 붙는다. 무기 바탕의 성격을 따른다(한손검 치명타와 공격 속도, 단궁 투사체,
    // 오브 주문과 소환, 플라스크 포션과 중독, 향로 번개와 재생).
    milestones: Object.freeze({
        greatsword: Object.freeze([[['meleePctDmg', 8]], [['pctHp', 5]], [['aoePctDmg', 10]], [['dr', 3]], [['meleeGemLevel', 1]]]),
        scimitar: Object.freeze([[['aspd', 4]], [['crit', 1.5]], [['meleePctDmg', 10]], [['critDmg', 15]], [['meleeGemLevel', 1]]]),
        shortbow: Object.freeze([[['projectilePctDmg', 8]], [['move', 4]], [['crit', 1.5]], [['evasionPct', 10]], [['projectileGemLevel', 1]]]),
        orb: Object.freeze([[['spellPctDmg', 8]], [['summonPctDmg', 12]], [['energyShieldPct', 8]], [['resPen', 3]],
            [['spellGemLevel', 1], ['summonGemLevel', 1]]]),
        flask: Object.freeze([[['potionPctDmg', 10]], [['poisonChance', 5]], [['aoePctDmg', 10]], [['ailmentDamagePct', 12]], [['aoeGemLevel', 1]]]),
        censer: Object.freeze([[['lightPctDmg', 8]], [['regen', 0.3]], [['shockChance', 5]], [['resAll', 6]], [['lightGemLevel', 1]]])
    }),
    // 여섯 레벨 합의 이정표: 넘을 때마다 방치 효율 +1%p(최대 +6%p).
    totalSteps: Object.freeze([30, 60, 100, 150, 200, 300]),
    offlinePerStep: 0.01
});

if (typeof safeExposeData === 'function') safeExposeData({ WEAPON_MASTERY });
