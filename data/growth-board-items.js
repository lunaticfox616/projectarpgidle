// Growth-board bases are data-only. Runtime rolling and legacy conversion live in
// js/growth-board-crafting.js.
const GROWTH_BOARD_SHAPES = {
    line9: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0]],
    rect8: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]],
    hook7: [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3]],
    t7: [[0,0],[1,0],[2,0],[3,0],[4,0],[2,1],[2,2]],
    u7: [[0,0],[0,1],[0,2],[1,2],[2,2],[2,1],[2,0]],
    zig6: [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]],
    v5: [[0,0],[0,1],[0,2],[1,2],[2,2]],
    l5: [[0,0],[0,1],[0,2],[0,3],[1,3]],
    t5: [[0,0],[1,0],[2,0],[1,1],[1,2]],
    square4: [[0,0],[1,0],[0,1],[1,1]],
    stair4: [[0,0],[1,0],[1,1],[2,1]],
    line4: [[0,0],[1,0],[2,0],[3,0]],
    l4: [[0,0],[0,1],[0,2],[1,2]],
    line3: [[0,0],[1,0],[2,0]],
    corner3: [[0,0],[1,0],[0,1]],
    split3: [[0,0],[2,0]],
    domino: [[0,0],[1,0]],
    single: [[0,0]],
    hollow8: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]]
};

function growthBase(id, name, category, shapeKey, requiredTier, slot, stats, tags, spatialEffect) {
    let shape = GROWTH_BOARD_SHAPES[shapeKey].map(([x, y]) => ({ x, y }));
    return {
        baseId: id, name, category, shapeKey, shape, size: shape.length,
        requiredTier, baseStats: stats, tags, spatialEffect,
        allowedAffixGroups: [slot], compatibleSlot: slot,
        rarityRules: { normal: 0, magic: 2, rare: shape.length >= 7 ? 4 : shape.length >= 5 ? 3 : shape.length >= 3 ? 2 : 1 },
        rotationAllowed: true, uniqueRules: null
    };
}

const GROWTH_BOARD_ITEMS = [
    // Early, large flowers (4), branches (4), leaves (2).
    growthBase('gb_flower_ironbloom','철화','flower','line9',1,'무기',[{id:'flatDmg',base:18}],[ 'flower','physical','melee','line','large' ],{type:'wall',stat:'physPctDmg',value:10}),
    growthBase('gb_flower_embercrown','불씨 왕관','flower','t7',1,'무기',[{id:'flatDmg',base:15},{id:'firePctDmg',base:12}],[ 'flower','fire','aoe','branching','large' ],{type:'adjacentCategory',category:'leaf',stat:'firePctDmg',value:7}),
    growthBase('gb_flower_frosthook','서리 갈고리','flower','hook7',2,'무기',[{id:'flatDmg',base:16},{id:'coldPctDmg',base:10}],[ 'flower','cold','melee','bent','large' ],{type:'directionEmpty',direction:'right',stat:'resPen',value:7}),
    growthBase('gb_flower_stormfork','폭풍 갈래','flower','zig6',3,'무기',[{id:'flatDmg',base:14},{id:'lightPctDmg',base:13}],[ 'flower','lightning','chain','asymmetric','large' ],{type:'adjacentTag',tag:'lightning',stat:'aspd',value:4}),
    growthBase('gb_branch_bastion','성채 가지','branch','rect8',1,'갑옷',[{id:'flatHp',base:90},{id:'armor',base:80}],[ 'branch','armor','closed','large' ],{type:'wallFaces',stat:'dr',value:3}),
    growthBase('gb_branch_windroot','바람뿌리','branch','u7',2,'갑옷',[{id:'flatHp',base:65},{id:'evasion',base:95}],[ 'branch','evasion','bent','large' ],{type:'corner',stat:'evasionPct',value:16}),
    growthBase('gb_branch_aegis','영혼수피','branch','t7',2,'방패',[{id:'energyShield',base:85},{id:'resAll',base:7}],[ 'branch','shield','guard','branching','large' ],{type:'adjacentCategory',category:'flower',stat:'energyShieldPct',value:8}),
    growthBase('gb_branch_bloodwood','혈목','branch','hook7',3,'갑옷',[{id:'flatHp',base:105},{id:'regen',base:1.1}],[ 'branch','life','recovery','bent','large' ],{type:'surrounded',stat:'regen',value:1.5}),
    growthBase('gb_leaf_galevine','질풍덩굴','leaf','v5',2,'목걸이',[{id:'aspd',base:8},{id:'move',base:5}],[ 'leaf','speed','link','bent' ],{type:'betweenCategories',categories:['flower','branch'],stat:'aspd',value:7}),
    growthBase('gb_leaf_piercingstem','관통줄기','leaf','l5',3,'반지',[{id:'resPen',base:5},{id:'leech',base:0.6}],[ 'leaf','pierce','link','bent' ],{type:'rowEdge',edge:'right',stat:'resPen',value:5}),

    // Mid-game bases.
    growthBase('gb_flower_bloodstep','핏빛 계단꽃','flower','stair4',6,'무기',[{id:'flatDmg',base:17},{id:'bleedChance',base:9}],[ 'flower','physical','bleed','asymmetric' ],{type:'sameRowCategory',category:'flower',stat:'critDmg',value:8}),
    growthBase('gb_flower_chaosvee','혼돈의 V꽃','flower','v5',7,'무기',[{id:'flatDmg',base:18},{id:'chaosPctDmg',base:15}],[ 'flower','chaos','dot','bent' ],{type:'distanceFromWall',min:2,stat:'chaosPctDmg',value:14}),
    growthBase('gb_flower_sunlance','태양창','flower','line4',8,'무기',[{id:'flatDmg',base:21},{id:'firePctDmg',base:12}],[ 'flower','fire','projectile','line' ],{type:'directionEmpty',direction:'right',stat:'projectilePctDmg',value:16}),
    growthBase('gb_flower_thundertee','뇌정꽃','flower','t5',9,'무기',[{id:'flatDmg',base:20},{id:'lightPctDmg',base:14}],[ 'flower','lightning','aoe','branching' ],{type:'tagExact',tag:'lightning',count:3,stat:'shockChance',value:12}),
    growthBase('gb_branch_ironstep','철계단 가지','branch','stair4',6,'장갑',[{id:'armor',base:90},{id:'flatHp',base:55}],[ 'branch','armor','asymmetric' ],{type:'sameColumnCategory',category:'branch',stat:'blockChance',value:3}),
    growthBase('gb_branch_mirage','신기루 가지','branch','l4',7,'신발',[{id:'evasion',base:110},{id:'move',base:5}],[ 'branch','evasion','counter','bent' ],{type:'directionEmpty',direction:'up',stat:'deflectChance',value:5}),
    growthBase('gb_branch_prism','프리즘 가지','branch','square4',8,'방패',[{id:'energyShield',base:105},{id:'resAll',base:9}],[ 'branch','shield','symmetric' ],{type:'adjacentDifferentTags',count:3,stat:'resAll',value:7}),
    growthBase('gb_branch_thornwall','가시벽','branch','line4',9,'갑옷',[{id:'armor',base:105},{id:'evasion',base:70}],[ 'branch','counter','line' ],{type:'wall',stat:'pctDmg',value:9}),
    growthBase('gb_leaf_chainbud','연쇄눈','leaf','corner3',6,'반지',[{id:'aspd',base:6}],[ 'leaf','chain','link','small' ],{type:'connectedTag',tag:'chain',stat:'targetAny',value:1}),
    growthBase('gb_leaf_echo','메아리잎','leaf','stair4',7,'목걸이',[{id:'ds',base:6}],[ 'leaf','repeat','link','asymmetric' ],{type:'adjacentCategory',category:'flower',stat:'ds',value:3}),
    growthBase('gb_leaf_guardlink','수호잎맥','leaf','line3',8,'반지',[{id:'resAll',base:6}],[ 'leaf','guard','link','line' ],{type:'betweenCategories',categories:['branch','branch'],stat:'dr',value:4}),
    growthBase('gb_leaf_catalyst','촉매잎','leaf','l4',9,'목걸이',[{id:'ailmentPower',base:8}],[ 'leaf','ailment','conversion','bent' ],{type:'adjacentDifferentTags',count:2,stat:'dotPctDmg',value:10}),

    // Late small bases.
    growthBase('gb_flower_spark','번갯불 씨꽃','flower','single',14,'무기',[{id:'flatDmg',base:8},{id:'lightPctDmg',base:9}],[ 'flower','lightning','small' ],{type:'tagExact',tag:'lightning',count:3,stat:'aspd',value:6}),
    growthBase('gb_flower_fang','쌍니꽃','flower','domino',12,'무기',[{id:'flatDmg',base:13},{id:'crit',base:2}],[ 'flower','physical','melee','small' ],{type:'isolated',stat:'critDmg',value:18}),
    growthBase('gb_flower_splitshot','갈라진 사수꽃','flower','split3',13,'무기',[{id:'flatDmg',base:12},{id:'projectilePctDmg',base:10}],[ 'flower','projectile','split','small' ],{type:'gapOccupied',stat:'targetProjectile',value:1}),
    growthBase('gb_branch_seedshield','씨앗방패','branch','single',14,'방패',[{id:'flatHp',base:32},{id:'energyShield',base:25}],[ 'branch','shield','small' ],{type:'surrounded',stat:'blockChance',value:6}),
    growthBase('gb_branch_twigtwin','쌍둥이 잔가지','branch','domino',12,'장갑',[{id:'armor',base:50},{id:'evasion',base:50}],[ 'branch','counter','small' ],{type:'sameColumnCategory',category:'branch',stat:'dr',value:3}),
    growthBase('gb_branch_cornerseed','모서리 씨가지','branch','corner3',13,'갑옷',[{id:'flatHp',base:48},{id:'resAll',base:5}],[ 'branch','life','small' ],{type:'corner',stat:'pctHp',value:8}),
    growthBase('gb_leaf_linkseed','연결씨잎','leaf','single',14,'반지',[{id:'aspd',base:4}],[ 'leaf','link','small' ],{type:'adjacentCount',stat:'aspd',value:2}),
    growthBase('gb_leaf_vampire','흡혈잎','leaf','domino',12,'목걸이',[{id:'leech',base:0.8}],[ 'leaf','recovery','small' ],{type:'adjacentCategory',category:'flower',stat:'leech',value:0.3}),
    growthBase('gb_leaf_prismseed','삼원잎','leaf','single',15,'반지',[{id:'resAll',base:4}],[ 'leaf','conversion','small' ],{type:'distinctElements',count:3,stat:'elementalPctDmg',value:12}),
    growthBase('gb_leaf_counter','반격잎','leaf','corner3',13,'반지',[{id:'deflectChance',base:3}],[ 'leaf','counter','small' ],{type:'adjacentTag',tag:'shield',stat:'critDmg',value:12}),
    growthBase('gb_leaf_voidgap','공백잎','leaf','split3',15,'목걸이',[{id:'resPen',base:4}],[ 'leaf','chaos','split','small' ],{type:'gapEmpty',stat:'chaosPctDmg',value:15}),
    growthBase('gb_leaf_rowknot','행매듭잎','leaf','line3',12,'반지',[{id:'move',base:4}],[ 'leaf','line','small' ],{type:'fullRow',stat:'ds',value:8})
];

const GROWTH_BOARD_UNIQUES = [
    { id:'gbu_solar_heart', name:'태양의 심장꽃', baseId:'gb_flower_embercrown', effect:{type:'adjacentCategory',category:'leaf',stat:'firePctDmg',value:14}, tags:['core','fire','trigger'], uniqueEffectKey:'growthSolarHeart', uniqueEffect:'인접 잎마다 화염 피해 증가, 세 잎 이상이면 점화 폭발 등록' },
    { id:'gbu_worldroot', name:'세계뿌리 성채', baseId:'gb_branch_bastion', effect:{type:'wallFaces',stat:'dr',value:5}, tags:['core','guard','shield'], uniqueEffectKey:'growthWorldroot', uniqueEffect:'닿은 외벽 면마다 피해 감소, 둘러싸인 꽃을 보호막으로 전환' },
    { id:'gbu_hollow_nest', name:'비어 있는 둥지', baseId:'gb_branch_prism', shapeKey:'hollow8', effect:{type:'gapOccupied',stat:'summonCap',value:1}, tags:['closed','summon','core'], uniqueEffectKey:'growthHollowNest', uniqueEffect:'내부 빈칸에 아이템이 있으면 소환수 한도 +1' },
    { id:'gbu_severed_bridge', name:'끊어진 다리', baseId:'gb_leaf_voidgap', shapeKey:'split3', effect:{type:'gapOccupied',stat:'resPen',value:12}, tags:['split','link','core'], uniqueEffectKey:'growthSeveredBridge', uniqueEffect:'두 조각 사이에 다른 아이템이 있으면 관통 증가' },
    { id:'gbu_trinity', name:'삼원 공명핵', baseId:'gb_leaf_prismseed', effect:{type:'distinctElements',count:3,stat:'elementalPctDmg',value:28}, tags:['conversion','resonance','core'], uniqueEffectKey:'growthTrinity', uniqueEffect:'화염·냉기·번개 태그가 모두 있으면 삼원 공명' },
    { id:'gbu_horizon', name:'지평선의 재단사', baseId:'gb_flower_sunlance', effect:{type:'rowEdge',edge:'right',stat:'projectilePctDmg',value:30}, tags:['line','projectile','core'], uniqueEffectKey:'growthHorizon', uniqueEffect:'행의 가장 오른쪽에 있으면 투사체가 역방향으로 한 번 연쇄' }
];

safeExposeData({ GROWTH_BOARD_SHAPES, GROWTH_BOARD_ITEMS, GROWTH_BOARD_UNIQUES });
