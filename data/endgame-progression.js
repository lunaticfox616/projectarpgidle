if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/endgame-progression.js');

const ARCANA_DECK_SLOT_COUNT = 4;
const ARCANA_SEALED_CARD_DROP_CHANCE = 0.0025;
const ARCANA_GALAXY_BOSS_DROP_CHANCE = 0.01;
const ARCANA_CAPSTONE_DROP_CHANCE = 0.02;
const ARCANA_QUEST_EXPLORATION_TARGET = 12;
const ARCANA_EQUIPMENT_SLOT_KEYS = Object.freeze([
    '무기', '투구', '갑옷', '방패', '장갑1', '장갑2',
    '신발', '목걸이', '반지1', '반지2', '반지3', '허리띠'
]);

const ARCANA_CARD_DB = Object.freeze([
    { id:'wanderer', no:0, name:'방랑자', glyph:'✦', deckEffect:'이동 속도 +1%', deckStats:[{ id:'move', val:1 }], slotEffect:'이동 속도 옵션 10% 증폭', slotAmp:{ statIds:['move'], pct:10 } },
    { id:'magician', no:1, name:'마술사', glyph:'✧', deckEffect:'주문 피해 +2%', deckStats:[{ id:'spellPctDmg', val:2 }], slotEffect:'주문 피해 옵션 8% 증폭', slotAmp:{ statIds:['spellPctDmg','spellFlatDmg','spellFlatPct'], pct:8 } },
    { id:'priestess', no:2, name:'여사제', glyph:'☾', deckEffect:'에너지 보호막 +2%', deckStats:[{ id:'energyShieldPct', val:2 }], slotEffect:'에너지 보호막 옵션 8% 증폭', slotAmp:{ statIds:['energyShield','energyShieldPct','energyShieldRegen'], pct:8 } },
    { id:'empress', no:3, name:'여제', glyph:'❀', deckEffect:'최대 생명력 +1.5%', deckStats:[{ id:'pctHp', val:1.5 }], slotEffect:'생명력·재생 옵션 8% 증폭', slotAmp:{ statIds:['flatHp','pctHp','regen','regenFlat'], pct:8 } },
    { id:'emperor', no:4, name:'황제', glyph:'♜', deckEffect:'방어도 +2%', deckStats:[{ id:'armorPct', val:2 }], slotEffect:'방어도·막기 옵션 8% 증폭', slotAmp:{ statIds:['armor','armorPct','baseBlockChance','blockChance','blockChancePct'], pct:8 } },
    { id:'hierophant', no:5, name:'교황', glyph:'♢', deckEffect:'모든 저항 +0.5%', deckStats:[{ id:'resAll', val:0.5 }], slotEffect:'저항 옵션 8% 증폭', slotAmp:{ statIds:['resAll','resF','resC','resL','resChaos'], pct:8 } },
    { id:'lovers', no:6, name:'연인', glyph:'∞', deckEffect:'치명타 확률 +0.5%', deckStats:[{ id:'crit', val:0.5 }], slotEffect:'치명타·정확도 옵션 8% 증폭', slotAmp:{ statIds:['crit','critDmg','accuracy','accuracyBonusPct'], pct:8 } },
    { id:'chariot', no:7, name:'전차', glyph:'➶', deckEffect:'공격 속도 +0.75%', deckStats:[{ id:'aspd', val:0.75 }], slotEffect:'공격 속도·이동 속도 옵션 8% 증폭', slotAmp:{ statIds:['aspd','move'], pct:8 } },
    { id:'strength', no:8, name:'힘', glyph:'♞', deckEffect:'물리 피해 +2%', deckStats:[{ id:'physPctDmg', val:2 }], slotEffect:'물리·근접 피해 옵션 7% 증폭', slotAmp:{ statIds:['physFlatDmg','physPctDmg','meleePctDmg'], pct:7 } },
    { id:'hermit', no:9, name:'은둔자', glyph:'⌁', deckEffect:'회피 +2%', deckStats:[{ id:'evasionPct', val:2 }], slotEffect:'회피·비껴내기 옵션 8% 증폭', slotAmp:{ statIds:['evasion','evasionPct','deflectChance','deflectDamageReduce'], pct:8 } },
    { id:'fortune', no:10, name:'운명의 수레바퀴', glyph:'◉', deckEffect:'최소·최대 피해 보정 +0.5%', deckStats:[{ id:'minDmgRoll', val:0.5 },{ id:'maxDmgRoll', val:0.5 }], slotEffect:'피해 보정 옵션 10% 증폭', slotAmp:{ statIds:['minDmgRoll','maxDmgRoll'], pct:10 } },
    { id:'justice', no:11, name:'정의', glyph:'⚖', deckEffect:'정확도 효과 +2%', deckStats:[{ id:'accuracyBonusPct', val:2 }], slotEffect:'관통·정확도 옵션 8% 증폭', slotAmp:{ statIds:['resPen','physIgnore','accuracy','accuracyBonusPct'], pct:8 } },
    { id:'hanged', no:12, name:'매달린 자', glyph:'⌇', deckEffect:'카오스 피해 +2%', deckStats:[{ id:'chaosPctDmg', val:2 }], slotEffect:'카오스·중독 옵션 8% 증폭', slotAmp:{ statIds:['chaosFlatDmg','chaosPctDmg','poisonChance','dotPctDmg'], pct:8 } },
    { id:'death', no:13, name:'죽음', glyph:'♠', deckEffect:'지속 피해 +2%', deckStats:[{ id:'dotPctDmg', val:2 }], slotEffect:'지속 피해·상태이상 옵션 8% 증폭', slotAmp:{ statIds:['dotPctDmg','bleedChance','poisonChance','igniteChance'], pct:8 } },
    { id:'temperance', no:14, name:'절제', glyph:'⚗', deckEffect:'초당 재생 +0.2%', deckStats:[{ id:'regen', val:0.2 }], slotEffect:'재생·흡수 옵션 8% 증폭', slotAmp:{ statIds:['regen','regenFlat','leech'], pct:8 } },
    { id:'devil', no:15, name:'악마', glyph:'♈', deckEffect:'치명타 피해 +4%', deckStats:[{ id:'critDmg', val:4 }], slotEffect:'치명타·공격 속도 옵션 7% 증폭', slotAmp:{ statIds:['crit','critDmg','aspd'], pct:7 } },
    { id:'tower', no:16, name:'탑', glyph:'♜', deckEffect:'물리 피해 감소 +0.5%', deckStats:[{ id:'dr', val:0.5 }], slotEffect:'방어 수치 옵션 5% 증폭', slotAmp:{ statIds:['armor','armorPct','evasion','evasionPct','energyShield','energyShieldPct'], pct:5 } },
    { id:'star', no:17, name:'별', glyph:'★', deckEffect:'원소 피해 +1.5%', deckStats:[{ id:'elementalPctDmg', val:1.5 }], slotEffect:'장비의 유효 젬 레벨 1당 해당 젬 피해 3% 증가 (최대 15%)', slotGemDamage:{ perLevelPct:3, capPct:15 } },
    { id:'moon', no:18, name:'달', glyph:'☽', deckEffect:'비껴내기 확률 +0.5%', deckStats:[{ id:'deflectChance', val:0.5 }], slotEffect:'회피·카오스 방어 옵션 8% 증폭', slotAmp:{ statIds:['evasion','evasionPct','resChaos','deflectChance'], pct:8 } },
    { id:'sun', no:19, name:'태양', glyph:'☼', deckEffect:'화염 피해 +2%', deckStats:[{ id:'firePctDmg', val:2 }], slotEffect:'화염 피해 옵션 8% 증폭', slotAmp:{ statIds:['fireFlatDmg','firePctDmg','igniteChance'], pct:8 } },
    { id:'judgment', no:20, name:'심판', glyph:'♬', deckEffect:'보스 피해 +2%', deckStats:[{ id:'bossDamagePct', val:2 }], slotEffect:'보스·정예 피해 옵션 8% 증폭', slotAmp:{ statIds:['bossDamagePct','eliteDamagePct'], pct:8 } },
    { id:'world', no:21, name:'세계', glyph:'◎', deckEffect:'피해·생명력 +1%, 모든 저항 +0.25%', deckStats:[{ id:'pctDmg', val:1 },{ id:'pctHp', val:1 },{ id:'resAll', val:0.25 }], slotEffect:'피해 종류 옵션 4% 증폭', slotAmp:{ statIds:['pctDmg','physPctDmg','elementalPctDmg','firePctDmg','coldPctDmg','lightPctDmg','chaosPctDmg'], pct:4 } }
]);

const PRUNING_TREE_UNLOCK_LOOP = 18;
const PRUNING_TREE_DB = Object.freeze([
    { id:'first_ring', name:'첫 나이테', maxRank:5, cost:1, x:50, y:89, stats:[{ id:'flatHp', val:4 }], penaltyStats:[{ id:'move', val:-0.05 }], effect:'최대 생명력 +4/단계', penaltyEffect:'이동 속도 -0.05%/부담' },
    { id:'deep_root', name:'깊은 뿌리', maxRank:5, cost:1, x:29, y:72, requires:{ first_ring:3 }, stats:[{ id:'resAll', val:0.15 }], penaltyStats:[{ id:'pctDmg', val:-0.1 }], effect:'모든 저항 +0.15%/단계', penaltyEffect:'피해 -0.1%/부담' },
    { id:'red_root', name:'붉은 뿌리', maxRank:5, cost:1, x:71, y:72, requires:{ first_ring:3 }, stats:[{ id:'flatDmg', val:0.35 }], penaltyStats:[{ id:'pctHp', val:-0.1 }], effect:'기본 피해 +0.35/단계', penaltyEffect:'최대 생명력 -0.1%/부담' },
    { id:'iron_bark', name:'철빛 껍질', maxRank:5, cost:1, x:14, y:52, requires:{ deep_root:3 }, stats:[{ id:'armorPct', val:0.4 }], penaltyStats:[{ id:'move', val:-0.08 }], effect:'방어도 +0.4%/단계', penaltyEffect:'이동 속도 -0.08%/부담' },
    { id:'wind_bark', name:'바람 껍질', maxRank:5, cost:1, x:34, y:52, requires:{ deep_root:3 }, stats:[{ id:'evasionPct', val:0.4 }], penaltyStats:[{ id:'armorPct', val:-0.2 }], effect:'회피 +0.4%/단계', penaltyEffect:'방어도 -0.2%/부담' },
    { id:'moon_sap', name:'달빛 수액', maxRank:5, cost:1, x:50, y:36, requires:{ deep_root:3 }, stats:[{ id:'energyShieldPct', val:0.4 }], penaltyStats:[{ id:'pctHp', val:-0.15 }], effect:'에너지 보호막 +0.4%/단계', penaltyEffect:'최대 생명력 -0.15%/부담' },
    { id:'thorn_tip', name:'가시 끝', maxRank:5, cost:1, x:66, y:52, requires:{ red_root:3 }, stats:[{ id:'critDmg', val:0.8 }], penaltyStats:[{ id:'resAll', val:-0.08 }], effect:'치명타 피해 +0.8%/단계', penaltyEffect:'모든 저항 -0.08%/부담' },
    { id:'quick_leaf', name:'빠른 잎', maxRank:5, cost:1, x:86, y:52, requires:{ red_root:3 }, stats:[{ id:'aspd', val:0.2 }], penaltyStats:[{ id:'pctDmg', val:-0.15 }], effect:'공격 속도 +0.2%/단계', penaltyEffect:'피해 -0.15%/부담' },
    { id:'broad_leaf', name:'넓은 잎', maxRank:5, cost:1, x:24, y:30, requires:{ iron_bark:3, wind_bark:3 }, stats:[{ id:'pctHp', val:0.25 }], penaltyStats:[{ id:'move', val:-0.1 }], effect:'최대 생명력 +0.25%/단계', penaltyEffect:'이동 속도 -0.1%/부담' },
    { id:'red_flower', name:'붉은 꽃', maxRank:5, cost:1, x:76, y:30, requires:{ thorn_tip:3, quick_leaf:3 }, stats:[{ id:'pctDmg', val:0.3 }], penaltyStats:[{ id:'resAll', val:-0.1 }], effect:'피해 +0.3%/단계', penaltyEffect:'모든 저항 -0.1%/부담' },
    { id:'quiet_crown', name:'고요한 수관', maxRank:5, cost:2, x:50, y:10, requires:{ broad_leaf:3, moon_sap:3, red_flower:3 }, stats:[{ id:'dr', val:0.15 }], penaltyStats:[{ id:'aspd', val:-0.12 }], effect:'물리 피해 감소 +0.15%/단계', penaltyEffect:'공격 속도 -0.12%/부담' }
]);

const HIDEOUT_UNLOCK_ACT = 5;
const HIDEOUT_GRID_COLUMNS = 6;
const HIDEOUT_GRID_ROWS = 4;
const HIDEOUT_DECOR_DB = Object.freeze([
    { id:'stash', name:'방랑자의 보관함', kind:'station', asset:'assets/items/root-armor-v3.png', action:{ tabId:'tab-items', subtab:'item-tab-equip' }, unlock:{ act:5 }, defaultCell:18 },
    { id:'forge', name:'뿌리 제련대', kind:'station', asset:'assets/items/root-sword-v3.png', action:{ tabId:'tab-items', subtab:'item-tab-craft' }, unlock:{ act:5 }, defaultCell:20 },
    { id:'map_device', name:'상처의 지도대', kind:'station', asset:'assets/items/cosmic-slab-v3.png', action:{ tabId:'tab-map' }, unlock:{ act:5 }, defaultCell:22 },
    { id:'gem_altar', name:'공명 제단', kind:'station', asset:'assets/items/chaos-jewel-v3.png', action:{ tabId:'tab-skills' }, unlock:{ loop:2 }, defaultCell:14 },
    { id:'condition_loom', name:'조건 직조기', kind:'station', asset:'assets/items/violet-amulet-v3.png', action:{ tabId:'tab-skills', subtab:'skill-tab-condition' }, unlock:{ loop:10 }, defaultCell:16 },
    { id:'growth_basin', name:'생장 수반', kind:'station', asset:'assets/items/flower-growth-v3.png', action:{ tabId:'tab-growthboard' }, unlock:{ loop:25 }, defaultCell:8 },
    { id:'woodsman_trophy', name:'나무꾼의 부러진 날', kind:'trophy', asset:'assets/items/claw-gauntlets-v3.png', unlock:{ journal:'woodsman' } },
    { id:'astra_trophy', name:'아스트라의 꺼진 별', kind:'trophy', asset:'assets/items/violet-amulet-v3.png', unlock:{ journal:'cosmos_astra' } },
    { id:'underking_trophy', name:'모르그란의 심핵', kind:'trophy', asset:'assets/items/tower-shield-v3.png', unlock:{ journal:'pinnacle_underking' } },
    { id:'leviathan_trophy', name:'탈라사의 무광 비늘', kind:'trophy', asset:'assets/items/thorn-growth-v3.png', unlock:{ journal:'pinnacle_leviathan' } },
    { id:'observer_trophy', name:'베일라의 관측안', kind:'trophy', asset:'assets/items/cosmic-slab-v3.png', unlock:{ journal:'pinnacle_observer' } },
    { id:'last_breath_trophy', name:'꺼지지 않은 심장', kind:'trophy', asset:'assets/items/ruby-ring-v3.png', unlock:{ journal:'hidden_last_breath' } },
    { id:'unscarred_trophy', name:'무흠의 방패', kind:'trophy', asset:'assets/items/tower-shield-v3.png', unlock:{ journal:'hidden_unscarred' } },
    { id:'dry_vial_trophy', name:'봉인된 약병', kind:'trophy', asset:'assets/items/violet-amulet-v3.png', unlock:{ journal:'hidden_dry_vial' } },
    { id:'fourfold_trophy', name:'사중 공명석', kind:'trophy', asset:'assets/items/chaos-jewel-v3.png', unlock:{ journal:'hidden_fourfold_affliction' } }
]);

safeExposeData({
    ARCANA_DECK_SLOT_COUNT, ARCANA_SEALED_CARD_DROP_CHANCE, ARCANA_GALAXY_BOSS_DROP_CHANCE,
    ARCANA_CAPSTONE_DROP_CHANCE, ARCANA_QUEST_EXPLORATION_TARGET, ARCANA_EQUIPMENT_SLOT_KEYS, ARCANA_CARD_DB,
    PRUNING_TREE_UNLOCK_LOOP, PRUNING_TREE_DB,
    HIDEOUT_UNLOCK_ACT, HIDEOUT_GRID_COLUMNS, HIDEOUT_GRID_ROWS, HIDEOUT_DECOR_DB
});
