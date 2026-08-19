if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/endgame-progression.js');

const WORLD_CARD_UNLOCK_LOOP = 40;
const WORLD_CARD_PRUNING_LOOP = 50;
const WORLD_CARD_MAX_RANK = 3;

const WORLD_CARD_DB = Object.freeze([
    { id:'marked_hunt', name:'표식된 사냥', family:'equipment',
      boon:'장비 드랍 확률이 증가합니다.', burden:'적이 더 큰 피해를 줍니다.',
      boonMods:{ equipmentDropMul:1.22 }, burdenMods:{ enemyDamageMul:1.12 }, pruneCost:3 },
    { id:'white_mycelium', name:'백색 균사림', family:'growth',
      boon:'생장판 드랍 확률이 증가합니다.', burden:'적의 생명력이 증가합니다.',
      boonMods:{ growthDropMul:1.32 }, burdenMods:{ enemyHpMul:1.14 }, pruneCost:3 },
    { id:'crown_road', name:'왕관으로 가는 길', family:'boss',
      boon:'보스의 장비·생장판 드랍 확률이 증가합니다.', burden:'보스의 생명력과 피해가 증가합니다.',
      boonMods:{ bossDropMul:1.28 }, burdenMods:{ bossHpMul:1.16, bossDamageMul:1.10 }, pruneCost:4 },
    { id:'iron_procession', name:'쇠붙이 행렬', family:'equipment',
      boon:'정예의 장비 드랍 확률이 크게 증가합니다.', burden:'정예의 피해가 증가합니다.',
      boonMods:{ eliteDropMul:1.35 }, burdenMods:{ eliteDamageMul:1.14 }, pruneCost:4 },
    { id:'root_dividend', name:'뿌리의 배당', family:'balanced',
      boon:'장비와 생장판 드랍 확률이 함께 증가합니다.', burden:'모든 적의 생명력이 증가합니다.',
      boonMods:{ equipmentDropMul:1.12, growthDropMul:1.16 }, burdenMods:{ enemyHpMul:1.10 }, pruneCost:4 },
    { id:'quiet_execution', name:'고요한 집행', family:'boss',
      boon:'보스 드랍 확률이 크게 증가합니다.', burden:'일반·정예 장비 드랍 확률이 감소합니다.',
      boonMods:{ bossDropMul:1.45 }, burdenMods:{ nonBossDropMul:0.82 }, pruneCost:5 },
    { id:'thorn_census', name:'가시의 호구조사', family:'growth',
      boon:'정예와 보스의 생장판 드랍이 증가합니다.', burden:'정예와 보스의 생명력이 증가합니다.',
      boonMods:{ eliteBossGrowthDropMul:1.42 }, burdenMods:{ eliteBossHpMul:1.15 }, pruneCost:5 },
    { id:'unwritten_oath', name:'기록되지 않은 맹세', family:'balanced',
      boon:'모든 아이템 드랍 확률이 증가합니다.', burden:'모든 적의 생명력과 피해가 증가합니다.',
      boonMods:{ equipmentDropMul:1.16, growthDropMul:1.16 }, burdenMods:{ enemyHpMul:1.12, enemyDamageMul:1.08 }, pruneCost:5 }
]);

const HIDEOUT_UNLOCK_ACT = 5;
const HIDEOUT_GRID_COLUMNS = 6;
const HIDEOUT_GRID_ROWS = 4;
const HIDEOUT_DECOR_DB = Object.freeze([
    { id:'stash', name:'방랑자의 보관함', kind:'station', asset:'assets/items/root-armor-v1.png', action:{ tabId:'tab-items', subtab:'item-tab-equip' }, unlock:{ act:5 }, defaultCell:18 },
    { id:'forge', name:'뿌리 제련대', kind:'station', asset:'assets/items/root-sword-v1.png', action:{ tabId:'tab-items', subtab:'item-tab-craft' }, unlock:{ act:5 }, defaultCell:20 },
    { id:'map_device', name:'상처의 지도대', kind:'station', asset:'assets/items/cosmic-slab-v1.png', action:{ tabId:'tab-map' }, unlock:{ act:5 }, defaultCell:22 },
    { id:'gem_altar', name:'공명 제단', kind:'station', asset:'assets/items/chaos-jewel-v1.png', action:{ tabId:'tab-skills' }, unlock:{ loop:2 }, defaultCell:14 },
    { id:'condition_loom', name:'조건 직조기', kind:'station', asset:'assets/items/violet-amulet-v1.png', action:{ tabId:'tab-skills', subtab:'skill-tab-condition' }, unlock:{ loop:10 }, defaultCell:16 },
    { id:'growth_basin', name:'생장 수반', kind:'station', asset:'assets/items/flower-growth-v1.png', action:{ tabId:'tab-growthboard' }, unlock:{ loop:25 }, defaultCell:8 },
    { id:'woodsman_trophy', name:'나무꾼의 부러진 날', kind:'trophy', asset:'assets/items/claw-gauntlets-v1.png', unlock:{ journal:'woodsman' } },
    { id:'astra_trophy', name:'아스트라의 꺼진 별', kind:'trophy', asset:'assets/items/violet-amulet-v1.png', unlock:{ journal:'cosmos_astra' } },
    { id:'underking_trophy', name:'모르그란의 심핵', kind:'trophy', asset:'assets/items/tower-shield-v1.png', unlock:{ journal:'pinnacle_underking' } },
    { id:'leviathan_trophy', name:'탈라사의 무광 비늘', kind:'trophy', asset:'assets/items/thorn-growth-v1.png', unlock:{ journal:'pinnacle_leviathan' } },
    { id:'observer_trophy', name:'베일라의 관측안', kind:'trophy', asset:'assets/items/cosmic-slab-v1.png', unlock:{ journal:'pinnacle_observer' } },
    { id:'last_breath_trophy', name:'꺼지지 않은 심장', kind:'trophy', asset:'assets/items/ruby-ring-v1.png', unlock:{ journal:'hidden_last_breath' } },
    { id:'unscarred_trophy', name:'무흠의 방패', kind:'trophy', asset:'assets/items/tower-shield-v1.png', unlock:{ journal:'hidden_unscarred' } },
    { id:'dry_vial_trophy', name:'봉인된 약병', kind:'trophy', asset:'assets/items/violet-amulet-v1.png', unlock:{ journal:'hidden_dry_vial' } },
    { id:'fourfold_trophy', name:'사중 공명석', kind:'trophy', asset:'assets/items/chaos-jewel-v1.png', unlock:{ journal:'hidden_fourfold_affliction' } }
]);

safeExposeData({ WORLD_CARD_UNLOCK_LOOP, WORLD_CARD_PRUNING_LOOP, WORLD_CARD_MAX_RANK, WORLD_CARD_DB, HIDEOUT_UNLOCK_ACT, HIDEOUT_GRID_COLUMNS, HIDEOUT_GRID_ROWS, HIDEOUT_DECOR_DB });
