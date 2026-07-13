const GROWTH_SYNERGY_STAGES = [
    { id:'basic', minTier:1, label:'기본 인접', rules:['adjacent','category','wall'] },
    { id:'direction', minTier:5, label:'벽과 방향', rules:['direction','corner','between'] },
    { id:'rows', minTier:9, label:'행과 열', rules:['row','column','symmetry'] },
    { id:'tags', minTier:12, label:'태그 시너지', rules:['tag','connected'] },
    { id:'deep', minTier:15, label:'복합 시너지', rules:['distance','enclosed','diversity'] }
];

const GROWTH_GLOBAL_SYNERGIES = [
    { id:'mixed_garden', minTier:5, label:'혼합 정원', condition:{type:'categories',values:['flower','branch','leaf']}, stats:[{id:'resAll',val:5}] },
    { id:'elemental_resonance', minTier:12, label:'삼원소 공명', condition:{type:'tags',values:['fire','cold','lightning']}, stats:[{id:'elementalPctDmg',val:15}] },
    { id:'size_diversity', minTier:15, label:'크기 다양성', condition:{type:'distinctSizes',count:4}, stats:[{id:'pctDmg',val:10},{id:'dr',val:4}] },
    { id:'living_space', minTier:15, label:'살아 있는 여백', condition:{type:'emptyCells',min:8}, stats:[{id:'move',val:8},{id:'regen',val:0.8}] },
    { id:'four_seeds', minTier:15, label:'네 개의 씨앗', condition:{type:'exactSizeCount',size:1,count:4}, stats:[{id:'aspd',val:10}] }
];

safeExposeData({ GROWTH_SYNERGY_STAGES, GROWTH_GLOBAL_SYNERGIES });
