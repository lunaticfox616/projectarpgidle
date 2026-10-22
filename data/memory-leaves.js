// 기억의 잎: 최초 발견 시 저널과 작은 영구 효과. 반복 교환/보유 수량은 폐지(2026-10-22).
// 문구: Gemini Argon 응답 중 한 문장씩. 원본과 요청은 artifacts/game-cohesion-20261022/leaf-journal-gemini-*.
// 24종 전체: 최대 생명력 증가 +2.4%, 방어도 증가 +3%, 모든 저항 +1.2% (기존 증가 수치에 합산).
const MEMORY_LEAVES = Object.freeze({
    chance: Object.freeze({ regular: 0.012, elite: 0.08, boss: 0.35 }),
    treasureMul: 20, goldenMul: 4, countCap: 1, tone: '#9fe0c0',
    list: Object.freeze([
        {"id":"roots_spring","name":"검은 수액 샘의 잎","weight":4,"source":{"node":"roots_6","region":"roots"},"journal":"memory_leaf_roots_spring","title":"검은 수액 샘","lines":["위로 길어 올리지 못한 수액이 바닥에 고여 검게 썩어간다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"roots_hive","name":"균사 여왕의 잎","weight":5,"source":{"node":"roots_2","region":"roots"},"journal":"memory_leaf_roots_hive","title":"균사 군락","lines":["수액이 마른 잔뿌리 사이로 하얀 곰팡이가 실처럼 엉켜 자란다."],"bonus":{"stat":"armorPct","value":0.5,"label":"방어도 +0.5%"}},
        {"id":"roots_heart","name":"뿌리 심장의 잎","weight":4,"minTier":10,"source":{"node":"roots_8","region":"roots"},"journal":"memory_leaf_roots_heart","title":"뿌리의 심장","lines":["가장 깊은 어둠 속에서 아직 멎지 않은 둔탁한 진동이 발바닥을 울린다."],"bonus":{"stat":"resAll","value":0.2,"label":"모든 저항 +0.2%"}},
        {"id":"trunk_ring","name":"나이테 기록관의 잎","weight":4,"source":{"node":"trunk_1","region":"trunk"},"journal":"memory_leaf_trunk_ring","title":"나이테 회랑","lines":["창백한 목질 위로 좁고 뒤틀린 테가 겹겹이 새겨져 있다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"trunk_knight","name":"쪼개진 기사의 잎","weight":5,"source":{"node":"trunk_5","region":"trunk"},"journal":"memory_leaf_trunk_knight","title":"쪼개진 파수터","lines":["회백색 나무껍질에 깊게 박힌 검날이 수액과 함께 굳어 있다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"trunk_throne","name":"줄기 옥좌의 잎","weight":4,"minTier":10,"source":{"node":"trunk_8","region":"trunk"},"journal":"memory_leaf_trunk_throne","title":"줄기의 빈 옥좌","lines":["속이 텅 빈 거목 한가운데에 나무뿌리로 엮은 높은 의자가 놓여 있다."],"bonus":{"stat":"armorPct","value":0.5,"label":"방어도 +0.5%"}},
        {"id":"canopy_nest","name":"폭풍 둥지의 잎","weight":4,"source":{"node":"canopy_7","region":"canopy"},"journal":"memory_leaf_canopy_nest","title":"폭풍 둥지","lines":["거센 바람에 부러진 황금빛 잔가지들이 둥지 모양으로 얽혀 있다."],"bonus":{"stat":"resAll","value":0.2,"label":"모든 저항 +0.2%"}},
        {"id":"canopy_star","name":"별가지 사수의 잎","weight":5,"source":{"node":"canopy_6","region":"canopy"},"journal":"memory_leaf_canopy_star","title":"가지 끝 망루","lines":["구름 위로 솟은 나뭇가지 끝에 시위가 끊어진 활 한 자루가 걸려 있다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"canopy_altar","name":"꼭대기 제단의 잎","weight":4,"minTier":10,"source":{"node":"canopy_8","region":"canopy"},"journal":"memory_leaf_canopy_altar","title":"하늘 꼭대기 제단","lines":["아래에서 끌어올린 수액이 황금빛 그릇을 채우다 못해 넘쳐흐른다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"garden_ash","name":"잿빛 화원의 잎","weight":4,"source":{"node":"garden_5","region":"garden"},"journal":"memory_leaf_garden_ash","title":"잿빛 화원","lines":["쓸모없는 가지들을 모아 태우던 자리에 차가운 재만 남았다."],"bonus":{"stat":"armorPct","value":0.5,"label":"방어도 +0.5%"}},
        {"id":"garden_wall","name":"불꽃 덩굴 성벽의 잎","weight":5,"source":{"node":"garden_7","region":"garden"},"journal":"memory_leaf_garden_wall","title":"불꽃 덩굴 성벽","lines":["수액이 끊긴 정원 외곽을 가시 돋친 마른 덩굴이 겹겹이 에워싸고 있다."],"bonus":{"stat":"resAll","value":0.2,"label":"모든 저항 +0.2%"}},
        {"id":"garden_tomb","name":"첫 정원사의 잎","weight":4,"minTier":10,"source":{"node":"garden_8","region":"garden"},"journal":"memory_leaf_garden_tomb","title":"정원사의 무덤","lines":["시든 화단 한구석에 날이 다 닳은 전정가위가 비석처럼 꽂혀 있다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"sanctum_library","name":"봉인 서고의 잎","weight":4,"source":{"node":"sanctum_4","region":"sanctum"},"journal":"memory_leaf_sanctum_library","title":"봉인 서고","lines":["성소의 차가운 서가마다 밀랍으로 입을 막은 기록들이 꽂혀 있다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"sanctum_court","name":"빙결 재판관의 잎","weight":5,"source":{"node":"sanctum_5","region":"sanctum"},"journal":"memory_leaf_sanctum_court","title":"얼어붙은 재판정","lines":["판결문이 놓인 단상 위에는 성에가 하얗게 내려앉아 글씨를 가렸다."],"bonus":{"stat":"armorPct","value":0.5,"label":"방어도 +0.5%"}},
        {"id":"sanctum_eye","name":"잠든 눈의 잎","weight":4,"minTier":10,"source":{"node":"sanctum_8","region":"sanctum"},"journal":"memory_leaf_sanctum_eye","title":"성소의 감긴 눈","lines":["가장 깊숙한 예배당 천장에 눈 모양으로 파인 거대한 나무 옹이가 있다."],"bonus":{"stat":"resAll","value":0.2,"label":"모든 저항 +0.2%"}},
        {"id":"boss_crown","name":"쓰러진 왕관의 잎","weight":4,"source":{"boss":true},"journal":"memory_leaf_boss_crown","title":"부서진 왕관","lines":["한 구역을 호령하던 거대한 존재가 무너져 내린 자리에 황동빛 파편이 흩어져 있다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"boss_shadow","name":"그림자 뿌리의 잎","weight":3,"minTier":13,"source":{"boss":true},"journal":"memory_leaf_boss_shadow","title":"드리운 그림자","lines":["빛이 닿지 않는 뿌리 밑바닥에 거대한 형상이 지나간 자국이 남았다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"golden_harvest","name":"황금 수확의 잎","weight":3,"source":{"golden":true},"journal":"memory_leaf_golden_harvest","title":"황금빛 수확","lines":["성소로 보내기 위해 모아둔 황금 잎과 수액 단지가 방 안 가득 쌓여 있다."],"bonus":{"stat":"armorPct","value":0.5,"label":"방어도 +0.5%"}},
        {"id":"treasure_belt","name":"보물 운반자의 잎","weight":1,"source":{"treasure":true},"journal":"memory_leaf_treasure_belt","title":"짐꾼의 보따리","lines":["수액과 귀중품을 나르던 이가 급히 도망치며 흘린 가죽 주머니가 흩어져 있다."],"bonus":{"stat":"resAll","value":0.2,"label":"모든 저항 +0.2%"}},
        {"id":"treasure_ring","name":"요정 고리의 잎","weight":1,"source":{"treasure":true},"journal":"memory_leaf_treasure_ring","title":"버섯 고리","lines":["죽은 나무그루터기 둘레로 작은 버섯들이 둥근 고리를 그리며 피어났다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"map_maker","name":"지도 제작자의 잎","weight":1.2,"source":{"any":true},"journal":"memory_leaf_map_maker","title":"지워진 지도","lines":["가지가 자라고 잘려 나갈 때마다 어제 그린 길은 쓸모가 없어진다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}},
        {"id":"workshop","name":"공방의 잎","weight":1.5,"source":{"any":true},"journal":"memory_leaf_workshop","title":"버려진 공방","lines":["모루 위에는 담금질을 끝내지 못한 칼날 하나가 외로이 놓여 있다."],"bonus":{"stat":"armorPct","value":0.5,"label":"방어도 +0.5%"}},
        {"id":"lighthouse","name":"등대지기의 잎","weight":1.5,"minTier":14,"source":{"any":true},"journal":"memory_leaf_lighthouse","title":"안개 속 등불","lines":["자욱한 포자와 안개 너머로 흐릿한 불빛 하나가 위태롭게 깜빡인다."],"bonus":{"stat":"resAll","value":0.2,"label":"모든 저항 +0.2%"}},
        {"id":"chase","name":"돌아오지 않은 길의 잎","weight":0.9,"minTier":16,"source":{"any":true},"journal":"memory_leaf_chase","title":"돌아오지 않은 길","lines":["앞서간 이들이 남긴 옷자락과 발자국이 희미하게 이어진 좁은 길목이다."],"bonus":{"stat":"pctHp","value":0.2,"label":"최대 생명력 +0.2%"}}
    ].map(row => Object.freeze(row)))
});
for (const leaf of MEMORY_LEAVES.list) {
    JOURNAL_DB[leaf.journal] = { title: leaf.title, lines: leaf.lines, source: '(' + leaf.name + ')',
        hidden: true, hint: '관련 장소에서 기억의 잎 발견', bonus: leaf.bonus };
    JOURNAL_ENTRY_ORDER.push(leaf.journal);
}
safeExposeData({ MEMORY_LEAVES });
