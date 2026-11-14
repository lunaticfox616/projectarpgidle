export const heroParts = [
    { x: 212, y: 402, width: 161, height: 206 },
    { x: 438, y: 402, width: 167, height: 205 },
    { x: 676, y: 402, width: 218, height: 205 },
    { x: 899, y: 402, width: 223, height: 204 },
    { x: 1204, y: 402, width: 195, height: 205 }
];

export const heroPartsV2 = [
    { x: 174, y: 331, width: 132, height: 169 },
    { x: 360, y: 331, width: 137, height: 169 },
    { x: 556, y: 331, width: 179, height: 169 },
    { x: 740, y: 331, width: 183, height: 168 },
    { x: 991, y: 331, width: 160, height: 169 }
];

export const enemyParts = {
    slime: { x: 471, y: 312, width: 193, height: 102 },
    wraith: { x: 762, y: 231, width: 177, height: 217 },
    knight: { x: 1017, y: 222, width: 294, height: 233 },
    bandit: { x: 214, y: 624, width: 152, height: 207 },
    shadow: { x: 451, y: 605, width: 156, height: 219 },
    boss: { x: 603, y: 497, width: 376, height: 342 },
    skeleton: { x: 1024, y: 561, width: 297, height: 271 }
};

export const tileParts = [
    { x: 151, y: 180, width: 170, height: 186 },
    { x: 364, y: 181, width: 174, height: 185 },
    { x: 581, y: 181, width: 179, height: 184 },
    { x: 800, y: 180, width: 188, height: 185 },
    { x: 1023, y: 181, width: 176, height: 184 },
    { x: 1234, y: 185, width: 165, height: 180 },
    { x: 153, y: 399, width: 170, height: 192 },
    { x: 363, y: 404, width: 178, height: 187 },
    { x: 581, y: 404, width: 179, height: 187 },
    { x: 799, y: 405, width: 189, height: 186 },
    { x: 1024, y: 404, width: 175, height: 187 },
    { x: 1238, y: 417, width: 171, height: 127 },
    { x: 151, y: 628, width: 170, height: 189 },
    { x: 366, y: 628, width: 172, height: 189 },
    { x: 581, y: 629, width: 179, height: 190 },
    { x: 800, y: 628, width: 188, height: 189 },
    { x: 1024, y: 630, width: 175, height: 187 }
];

export const heroStripFrameCounts = {
    hero1Idle: 1, hero1Walk: 15, hero1Attack: 7, hero1Hurt: 1, hero1Death: 1,
    hero2Idle: 1, hero2Walk: 17, hero2Attack: 7, hero2Hurt: 1, hero2Death: 1,
    hero3Idle: 1, hero3Walk: 17, hero3Attack: 7, hero3Hurt: 1, hero3Death: 1,
    hero4Idle: 1, hero4Walk: 13, hero4Attack: 7, hero4Hurt: 1, hero4Death: 1,
    hero5Idle: 1, hero5Walk: 17, hero5Attack: 7, hero5Hurt: 1, hero5Death: 1,
    hero6Idle: 1, hero6Walk: 10, hero6Attack: 7, hero6Hurt: 1, hero6Death: 1,
    hero7Idle: 1, hero7Walk: 17, hero7Attack: 7, hero7Hurt: 1, hero7Death: 1,
    hero8Idle: 1, hero8Walk: 15, hero8Attack: 7, hero8Hurt: 1, hero8Death: 1,
    hero9Idle: 1, hero9Walk: 13, hero9Attack: 7, hero9Hurt: 1, hero9Death: 1,
    hero10Idle: 1, hero10Walk: 11, hero10Attack: 7, hero10Hurt: 1, hero10Death: 1,
    playerClassOccultistIdle: 1, playerClassOccultistWalk: 9, playerClassOccultistAttack: 9, playerClassOccultistAttack2: 9,
    playerClassWandererIdle: 1, playerClassWandererWalk: 9, playerClassWandererAttack: 7, playerClassWandererAttack2: 7,
    playerClassClericIdle: 1, playerClassClericWalk: 9, playerClassClericAttack: 9,
    playerClassArcherIdle: 1, playerClassArcherWalk: 9, playerClassArcherAttack: 9, playerClassArcherAttack2: 9,
    playerClassAlchemistIdle: 1, playerClassAlchemistWalk: 9, playerClassAlchemistAttack: 8,
    playerClassAlchemistAttack2: 9, playerClassAlchemistAttack3: 4,
    playerClassWarriorIdle: 1, playerClassWarriorWalk: 9, playerClassWarriorAttack: 8,
    playerClassWarriorAttack2: 9, playerClassWarriorAttack3: 9,
    playerClassOccultistWalkSouth: 7,
    playerClassArcherWalkSouth: 8
};

/** Atlas consumers may annotate fallback rectangles; a rebuild receives fresh rectangles as before. */
export function createLegacyAtlasParts() {
    return {
        heroParts: heroParts.map(part => ({ ...part })),
        heroPartsV2: heroPartsV2.map(part => ({ ...part })),
        enemyParts: Object.fromEntries(Object.entries(enemyParts).map(([key, part]) => [key, { ...part }])),
        tileParts: tileParts.map(part => ({ ...part }))
    };
}

export function getBattleHero1SafeClipDefs() {
    return {
        bodyFrames: legacyHeroBodyFrames(),
        characterAnimations: {
            idle: ['B_IDLE_01', 'B_IDLE_02', 'B_IDLE_03', 'B_IDLE_04'],
            walk_or_run: ['B_WALK_01', 'B_WALK_02', 'B_WALK_03', 'B_WALK_04', 'B_WALK_05', 'B_WALK_06', 'B_WALK_07', 'B_WALK_08'],
            sword_attack_body: ['B_SWORD_01', 'B_SWORD_02', 'B_SWORD_03'],
            cast_body: ['B_CAST_01', 'B_CAST_02', 'B_CAST_03', 'B_CAST_04', 'B_CAST_05', 'B_CAST_06'],
            hurt: ['B_HURT_01', 'B_HURT_02', 'B_HURT_03', 'B_HURT_04', 'B_HURT_05', 'B_HURT_06'],
            down_or_knockdown: ['B_DOWN_01', 'B_DOWN_02', 'B_DOWN_03', 'B_DOWN_04'],
            bow_attack_body: ['B_BOW_01', 'B_BOW_02', 'B_BOW_03', 'B_BOW_04', 'B_BOW_05', 'B_BOW_06', 'B_BOW_07', 'B_BOW_08', 'B_BOW_09']
        },
        clipLoop: {
            idle: true,
            walk_or_run: true,
            sword_attack_body: false,
            cast_body: false,
            hurt: false,
            down_or_knockdown: false,
            bow_attack_body: false
        }
    };
}

function legacyHeroBodyFrames() { return {
        B_IDLE_01: { x: 30, y: 16, width: 74, height: 90 },
        B_IDLE_02: { x: 140, y: 16, width: 76, height: 90 },
        B_IDLE_03: { x: 348, y: 16, width: 78, height: 90 },
        B_IDLE_04: { x: 452, y: 16, width: 70, height: 90 },
        B_WALK_01: { x: 26, y: 118, width: 76, height: 94 },
        B_WALK_02: { x: 130, y: 118, width: 90, height: 94 },
        B_WALK_03: { x: 248, y: 118, width: 78, height: 94 },
        B_WALK_04: { x: 356, y: 118, width: 74, height: 94 },
        B_WALK_05: { x: 458, y: 118, width: 82, height: 94 },
        B_WALK_06: { x: 576, y: 118, width: 74, height: 94 },
        B_WALK_07: { x: 680, y: 118, width: 76, height: 94 },
        B_WALK_08: { x: 776, y: 118, width: 78, height: 94 },
        B_SWORD_01: { x: 368, y: 302, width: 88, height: 100 },
        B_SWORD_02: { x: 522, y: 302, width: 90, height: 100 },
        B_SWORD_03: { x: 706, y: 302, width: 94, height: 100 },
        B_CAST_01: { x: 32, y: 510, width: 72, height: 92 },
        B_CAST_02: { x: 122, y: 510, width: 78, height: 92 },
        B_CAST_03: { x: 216, y: 510, width: 74, height: 92 },
        B_CAST_04: { x: 310, y: 510, width: 86, height: 92 },
        B_CAST_05: { x: 412, y: 510, width: 88, height: 92 },
        B_CAST_06: { x: 526, y: 510, width: 96, height: 92 },
        B_HURT_01: { x: 28, y: 870, width: 76, height: 94 },
        B_HURT_02: { x: 152, y: 870, width: 80, height: 94 },
        B_HURT_03: { x: 276, y: 870, width: 78, height: 94 },
        B_HURT_04: { x: 378, y: 870, width: 88, height: 94 },
        B_HURT_05: { x: 494, y: 870, width: 70, height: 94 },
        B_HURT_06: { x: 618, y: 870, width: 82, height: 94 },
        B_DOWN_01: { x: 42, y: 968, width: 78, height: 96 },
        B_DOWN_02: { x: 184, y: 968, width: 88, height: 96 },
        B_DOWN_03: { x: 330, y: 968, width: 90, height: 96 },
        B_DOWN_04: { x: 458, y: 968, width: 94, height: 96 },
        B_BOW_01: { x: 38, y: 975, width: 74, height: 79 },
        B_BOW_02: { x: 158, y: 975, width: 84, height: 79 },
        B_BOW_03: { x: 274, y: 976, width: 81, height: 78 },
        B_BOW_04: { x: 387, y: 978, width: 90, height: 76 },
        B_BOW_05: { x: 508, y: 977, width: 84, height: 76 },
        B_BOW_06: { x: 616, y: 980, width: 89, height: 75 },
        B_BOW_07: { x: 728, y: 982, width: 95, height: 73 },
        B_BOW_08: { x: 843, y: 982, width: 95, height: 74 },
        B_BOW_09: { x: 962, y: 982, width: 81, height: 74 }
    }; }
