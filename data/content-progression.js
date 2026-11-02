// Prices are paid once. Ascension trials also require the matching growth unlock.
// cost: the 해금 points the unlock tab takes. cost 0: it opens by itself once its conditions are met. No unlock comes from an NPC for free
// (2026-11-02 사용자: NPC에게서 무료로 받는 해금 삭제).
// The catalog is one tree (2026-11-02 사용자: 선행 조건 2~3개에서 갈래로 뻗어, 다음 해금만 고민하게): three roots (장비 제련, 보조스킬룬, 루프 패시브),
// every other board row grows from after, with requires for a second prerequisite. 심화 혼돈 alone hangs on nothing: from loop 11 the loop
// condition is 혼돈 심화 (js/state.js getSeasonAbyssDepthCap) and points only come by looping, so a gate there could stop a player for good.
// A row with no progress of its own keeps the rows behind it reachable: never put a row that needs world progress (재능, 코어) on the way to others.
// since 11: the row took a price or joined the catalog with the tree, so a save from before keeps it free (js/content-progression.js inheritTreeAccess);
// formerLoop: the loop it opened at then, where that differs from minLoop.
// Points a loop gives from loop 2 (js/content-progression.js earnedBy): loop L gives early[L - 2], every later loop perLoop.
// 2026-10-25 사용자: 해금 포인트는 루프마다 일관되게 2점, so early is empty. Before then loops 2~10 gave 2, 2, 3, 3, 2, 1, 1, 1, 2
// (paced to the paid unlocks 4, 2, 4, 2, 3 at loops 2~6 and 4 at loop 10), and before 2026-10-21 loops 2~5 gave 4, 4, 3, 3. Saves from
// then keep what those tables gave them (contentProgression ledger carry and paceCarry).
const CONTENT_UNLOCK_POINT_AWARDS = Object.freeze({ early: Object.freeze([]), perLoop: 2 });
// 강화(2026-10-25 사용자: 영구 방치 성장의 시간 인식과 전투 효율, 가방 확장, 그루터기 함 보관함을 해금 탭으로): 단계마다 해금 한 줄
// (id = series + 단계, n단계는 n-1단계 뒤). ranks: [루프, 점수]. 효과는 단계 수로 읽는다(contentProgression.rank): 방치 시간과
// 효율은 data/offline-progress.js의 표, 가방은 1쪽 + 단계, 그루터기 보관함은 단계마다 storage칸. 단계별 루프는 예전에 저절로 늘던
// 루프와 같다(가방: 루프 5, 10, … 30, 40, … 80). 이 줄들이 들어오기 전의 장부(버전 10 미만)는 가진 것을 물려받는다(js/content-progression.js).
const CONTENT_UNLOCK_SERIES_VERSION = 10;
const CONTENT_UNLOCK_TREE_VERSION = 11;
const CONTENT_UNLOCK_SERIES = Object.freeze([
    { series: 'offlineHours', rail: 'idle', name: '시간 인식', art: 'ui/pixel/buttons/loop.png',
        description: '방치 한도가 늘어납니다.',
        ranks: [[2, 1], [3, 1], [4, 1], [6, 1], [9, 2], [12, 2], [16, 2]] },
    { series: 'offlineRate', rail: 'idle', name: '전투 효율', art: 'ui/currency/fairy-ring.png',
        description: '방치 중 전투 효율이 늘어납니다.',
        ranks: [[3, 1], [5, 1], [8, 1], [12, 2], [16, 2]] },
    { series: 'bagPage', rail: 'store', name: '가방 확장', art: 'ui/pixel/buttons/bag.png',
        description: '장비 가방이 1페이지(100칸) 늘어납니다.',
        ranks: [[5, 1], [10, 1], [15, 1], [20, 1], [25, 1], [30, 1], [40, 1], [50, 1], [60, 1], [70, 1], [80, 1]] },
    { series: 'stumpStorage', rail: 'store', name: '그루터기 보관함', art: 'ui/pixel/buttons/stump.png', storage: 25,
        description: '그루터기 함 보관함이 25칸 늘어납니다.',
        ranks: [[2, 1], [6, 1], [10, 1], [15, 1], [20, 2], [30, 2]] },
    // 그루터기 함의 봉인 칸과 품질 상한(data/stump-box.js STUMP_BOX_UNLOCKS). 2026-11-02 전에는 루프가 닿으면 저절로 열렸다.
    { series: 'stumpSeal', rail: 'stumpUp', since: 11, name: '봉인 칸', art: 'ui/grove/slot-socket-v1.png',
        description: '루프가 바뀌어도 성장 상태를 유지하는 칸이 하나 늘어납니다. 첫 칸에는 포식이 함께 해금됩니다.',
        ranks: [[23, 1], [29, 1], [37, 1], [55, 1], [70, 1], [90, 1]] },
    { series: 'stumpQuality', rail: 'stumpUp', since: 11, name: '품질 상한', art: 'ui/currency/omen-compost-v4.png',
        description: '그루터기 함 품질 상한이 올라갑니다. 150%부터 접붙이기 단계도 함께 올라갑니다.',
        ranks: [[35, 1], [45, 1], [60, 1], [80, 1], [100, 1]] }
]);
// 강화 줄(2026-11-02): 성격이 같은 강화를 루프 차례로 이어 나무의 한 줄로 쓴다. 줄 안에서는 앞 단계가 다음 단계의 선행이다.
const CONTENT_UNLOCK_RAILS = Object.freeze([
    { rail: 'store', name: '보관 강화', after: 'craft' },
    { rail: 'idle', name: '방치 강화', after: 'loopTree' },
    { rail: 'stumpUp', name: '그루터기 강화', after: 'graft' }
]);
// gain: what the unlock gives, a few words under its name in the unlock tree (2026-10-27 사용자: 짧게, 필요한 것만).
// lifecycle describes loop transitions, not spending, deaths or individual expedition resets.
// after: growth predecessor. progress: existing world condition. minLoop: earliest eligibility.
const CONTENT_UNLOCK_CATALOG = Object.freeze([
    ...CONTENT_UNLOCK_RAILS.flatMap(rail => {
        const steps = CONTENT_UNLOCK_SERIES.filter(spec => spec.rail === rail.rail)
            .flatMap(spec => spec.ranks.map(([minLoop, cost], index) => ({ spec, minLoop, cost, rank: index + 1 }))).sort((a, b) => a.minLoop - b.minLoop);
        return steps.map(({ spec, minLoop, cost, rank }, index) => Object.freeze({
            id: spec.series + rank, series: spec.series, rail: rail.rail, rank, name: `${spec.name} ${rank}단계`, group: '강화', minLoop, cost,
            after: index ? steps[index - 1].spec.series + steps[index - 1].rank : rail.after, ...(spec.since ? { since: spec.since } : {}),
            description: spec.description, art: spec.art, lifecycle: { label: '성장 영구 유지' } }));
    }),
    { id: 'knitting', name: '뜨개질', gain: '실타래로 보상', art: 'ui/currency/omen-weave-v4.png', group: '수집', minLoop: 40, hardMinLoop: true, cost: 1, since: 11, after: 'garden',
        description: '같은 실타래를 모아 정해진 보상을 뜨개질할 수 있습니다. 발견한 종류만 보관함에 나타납니다.', routes: ['item-tab-knitting'],
        action: { tab: 'tab-items', subtab: 'item-tab-knitting' },
        lifecycle: { label: '일부 유지', kept: '실타래 발견 기록과 뜨개질 기록', reset: '실타래 보유 수량' } },
    {"id":"tactics","name":"전투 전술","group":"전술","minLoop":1,"cost":0,"progress":"tactics","description":"액트 3을 클리어하면 무료로 해금됩니다. 기본 공격 대상과 전투 거리를 정하고, 조건에 따라 행동하는 규칙을 만들 수 있습니다.","routes":["skill-tab-condition"],"flags":["combatTacticsUnlocked"],"action":{"tab":"tab-skills","skillSubtab":"skill-tab-condition"},"art":"gems/active/abyss-contagion-v1.png","lifecycle":{"label":"영구 유지","kept":"전투 전술 해금, 기본 전술과 조건부 규칙","reset":""}},
    {"id":"support","gain":"스킬 보조 효과","name":"보조스킬룬","rewardChoices":[{"key":"가속","label":"가속, 공격 속도"},{"key":"무자비","label":"무자비, 치명타 피해"},{"key":"생명력 흡수","label":"생명력 흡수, 적중 회복"}],"rewardText":"선택한 보조스킬룬 1개 지급","action":{"tab":"tab-skills","skillSubtab":"skill-tab-equip"},"group":"룬","minLoop":2,"cost":2,"description":"장착한 스킬룬 세 칸에 보조 효과를 걸 수 있습니다. 태그가 맞는 스킬에만 적용됩니다.","sections":[".support-library",".support-slots"],"art":"gems/active/tri-element-wave-v1.png","lifecycle":{"label":"루프 초기화","kept":"","reset":"보조스킬룬 보유/레벨/장착. 첫 해금 보상은 다시 지급되지 않습니다."}},
    {"id":"craft","gain":"장비 옵션 추가","name":"장비 제련","rewardChoices":[{"key":"magicBud","label":"마법의 새싹"}],"rewardText":"마법의 새싹 1개","action":{"tab":"tab-items","subtab":"item-tab-craft"},"group":"장비","minLoop":2,"cost":2,"description":"일반 장비를 마법 장비로 진화시켜 옵션을 더할 수 있습니다.","routes":["item-tab-craft"],"art":"ui/currency/magic-bud.png","lifecycle":{"label":"루프 초기화","kept":"","reset":"제련 재료/장비. 루프 봉인 장비는 유지됩니다."},"since":11},
    {"id":"craftSimulator","gain":"제작 확률 시험","name":"제작 시뮬레이터","group":"장비","minLoop":6,"cost":1,"after":"fossilRestore","description":"재화를 쓰지 않고 제작 결과와 목표 확률을 시험할 수 있습니다.","action":{"tab":"tab-items","subtab":"item-tab-craft"},"art":"ui/currency/formless-dew.png"},
    {"id":"gemForge","gain":"룬 피해, 속도","art":"gems/active/molten-slam-v1.png","after":"support","name":"룬 강화","action":{"tab":"tab-skills","skillSubtab":"skill-tab-enhance"},"group":"룬","minLoop":4,"cost":2,"description":"창공의 정수로 룬을 20강까지 강화할 수 있습니다. 군주의 핵을 함께 쓰면 성공 확률이 오릅니다.","routes":["skill-tab-enhance"],"flags":["gemEnhanceUnlocked"],"lifecycle":{"label":"일부 유지","kept":"응축된 창공의 정수로 올린 영구 룬 강화","reset":"군주의 핵/창공의 정수 재료와 해당 강화 레벨"},"features":[{"name":"군주의 핵","description":"강화마다 피해 4% 증폭. 5강이면 룬 레벨 +1. 재료와 강화는 루프마다 초기화됩니다."},{"name":"창공의 정수","description":"강화마다 공격 속도와 시전 속도 2% 증폭. 5강이면 룬 레벨 +1. 재료와 강화는 루프마다 초기화됩니다."},{"name":"응축된 창공의 정수","description":"창공의 탑에서 얻는 별도 재화입니다. 창공을 해금한 뒤 영구 강화에 사용할 수 있습니다. 보유량과 영구 룬 강화는 유지됩니다."}]},
    {"id":"gemAwakening","gain":"각성 룬","art":"gems/active/immortal-vibration-v1.png","after":"engraving","name":"룬 각성","group":"룬","minLoop":14,"cost":2,"description":"정예와 보스가 각성 잔향과 각성 룬을 떨어뜨립니다. Lv.20 공격 룬을 각성 룬으로 바꾸고 각성 각인을 사용할 수 있습니다.","action":{"tab":"tab-skills","skillSubtab":"skill-tab-enhance"},"requires":["trials"]},
    {"id":"engraving","gain":"공격 방식 변경","art":"gems/active/heavenly-branch-v1.png","after":"gemForge","name":"룬 각인","group":"룬","minLoop":4,"cost":2,"description":"각인 슬롯에 특수 옵션을 넣어 룬의 공격 방식을 바꿀 수 있습니다.","sections":[".gem-inscription-section",".gem-current-inscriptions",".gem-engrave-status"],"action":{"tab":"tab-skills","skillSubtab":"skill-tab-enhance"},"lifecycle":{"label":"루프 초기화","kept":"","reset":"룬에 부여한 각인과 확장한 각인 슬롯"}},
    {"id":"market","name":"거래소","group":"편의","minLoop":2,"cost":1,"after":"craft","description":"재화 교환, 암거래, 나의 가판대를 사용할 수 있습니다.","routes":["item-tab-market"],"since":11,"art":"ui/currency/golden-rule.png","gain":"재화 교환, 가판대"},
    {"id":"hall","name":"장비 전당","group":"편의","minLoop":2,"cost":0,"after":"codex","description":"로그인하면 장비를 전시하고 소장품을 구매할 수 있습니다.","routes":["item-tab-hall"],"art":"items/ruby-ring-v3.png","gain":"장비 전시"},
    {"id":"codex","gain":"수집 보너스","art":"px/items/illustrated/constellation_core.png","after":"market","name":"고유 도감","group":"장비","minLoop":3,"cost":1,"description":"고유 장비를 등록해 도감 보너스를 얻을 수 있습니다.","routes":["tab-codex"],"gate":"codex","lifecycle":{"label":"성장 영구 유지","kept":"등록한 고유 장비의 도감 기록과 수집 보너스","reset":"일반 인벤토리/장착 장비. 루프 봉인 장비는 유지됩니다."},"since":11,"formerLoop":5},
    {"id":"journal","name":"저널","group":"기록","minLoop":1,"cost":0,"description":"발견한 기록과 영구 보상을 확인합니다.","routes":["tab-journal"],"gate":"journal"},
    {"id":"stump","name":"그루터기 함","group":"영구 성장","minLoop":1,"cost":0,"progress":"stump","description":"씨앗과 수액을 그루터기 함에 배치해 처치로 키웁니다.","routes":["tab-stump"],"gate":"stump","lifecycle":{"label":"일부 유지","kept":"그루터기 함, 열린 칸, 그루터기 아이템, 배치, 성장 중인 경험치","reset":"성장 완료된 그루터기 아이템의 경험치(뿌리 기억이 열리면 일부 유지)"}},
    {"id":"records","name":"전적","group":"기록","minLoop":1,"cost":0,"description":"루프와 전투 기록을 비교합니다.","routes":["tab-records"]},
    {"id":"loopTree","gain":"영구 능력치","name":"루프 패시브","group":"영구 성장","minLoop":2,"cost":2,"description":"루프 포인트로 영구 노드에 투자할 수 있습니다. 해금 전에도 포인트는 쌓입니다.","sections":["#trait-season-section"],"art":"ui/currency/ouroboros.png","action":{"tab":"tab-season","section":"trait-season-section"},"lifecycle":{"label":"성장 영구 유지","kept":"루프 포인트와 투자한 패시브","reset":""}},
    {"id":"trials","gain":"전직 노드","art":"gems/active/shield-charge-v1.png","after":"loopTree","name":"전직","group":"영구 성장","minLoop":3,"cost":2,"description":"시련 포인트로 직업의 전직 셋 중 하나를 고르고 전직 노드를 할당할 수 있습니다. 전직 시련 입장도 함께 해금됩니다.","routes":["tab-traits"],"gate":"traits","lifecycle":{"label":"루프 초기화","kept":"","reset":"전직 선택, 패시브, 시련 포인트, 시련 클리어"}},
    {"id":"fossilRestore","gain":"화석 옵션 장비","art":"px/items/cosmic-slab-v3.png","after":"fossil","name":"화석 복원","group":"장비","minLoop":5,"cost":1,"description":"고대 미궁에서 원시 화석과 고대 원시 화석이 떨어집니다. 제작실에서 원시 화석을 복원하고 남는 화석을 정제할 수 있습니다. 화석 전용 옵션 장비도 떨어집니다.","action":{"tab":"tab-items","subtab":"item-tab-fossil"},"since":11},
    {"id":"advancedSpores","gain":"새 홀씨 제작","art":"ui/currency/blight-spore.png","after":"craftSimulator","name":"고급 홀씨","group":"장비","minLoop":8,"cost":1,"description":"부패 홀씨, 균열 홀씨, 혼돈 홀씨, 피해 홀씨 제작이 해금됩니다.","action":{"tab":"tab-items","subtab":"item-tab-craft"},"since":11},
    {"id":"fossil","gain":"옵션 방향 조절","art":"gems/active/earthquake-shatter-v1.png","after":"craft","name":"화석 제작","group":"장비","minLoop":3,"cost":1,"description":"화석으로 장비의 옵션 방향을 조절할 수 있습니다.","routes":["item-tab-fossil"],"lifecycle":{"label":"루프 초기화","kept":"","reset":"화석/속성 홀씨와 제작 장비. 루프 봉인 장비는 유지됩니다."},"features":[{"name":"속성 홀씨","description":"화염/냉기/번개 태그로 제작 방향을 조절합니다. 화석 제작을 해금하면 관련 드랍이 나오며 보유량은 루프마다 초기화됩니다."}],"since":11},
    {"id":"labyrinth","name":"고대 미궁","group":"전투","minLoop":3,"cost":0,"description":"고대 미궁이 해금됩니다. 미궁을 등반해 전용 보상을 얻을 수 있습니다.","routes":["map-explore-labyrinth"],"after":"fossil","art":"ui/currency/fairy-ring.png","gain":"화석, 봉인편린"},
    {"id":"jewel","gain":"장비 소켓","art":"items/chaos-jewel-v3.png","after":"fossilRestore","name":"주얼","group":"장비","minLoop":5,"cost":2,"description":"장비 소켓에 끼우는 주얼이 떨어집니다. 반지, 목걸이, 허리띠에는 소켓이 있고 다른 장비는 공허의 끌로 뚫을 수 있습니다.","action":{"tab":"tab-items","subtab":"item-tab-equip"},"lifecycle":{"label":"루프 초기화","kept":"","reset":"주얼 보관함, 장비 소켓의 주얼(루프 봉인 장비는 유지), 주얼 재료"}},
    {"id":"talisman","gain":"그루터기 함 옵션","art":"items/stump-pixel-v1/talisman-rare.png","after":"jewel","name":"부적","group":"장비","minLoop":6,"cost":2,"description":"고대 미궁의 봉인편린으로 부적을 풀고, 그루터기 함에 배치해 처치로 깨울 수 있습니다.","action":{"tab":"tab-stump"},"lifecycle":{"label":"일부 유지","kept":"그루터기 함의 부적과 배치(루프마다 다시 잠듦)","reset":"봉인편린"}},
    {"id":"beehive","name":"벌집 원정","group":"전투","minLoop":8,"cost":0,"description":"벌집 원정이 해금됩니다. 위험과 보상을 골라 도전할 수 있습니다.","routes":["map-explore-beehive"],"lifecycle":{"label":"일부 유지","kept":"벌집 개방/클리어 기록","reset":"꿀/꽃가루/밀랍/벌침/벌집 열쇠 등 보상 재료"},"after":"labyrinth","art":"ui/currency/blessing-petal.png","gain":"꿀, 밀랍"},
    {"id":"voidrift","name":"공허 균열","group":"전투","minLoop":9,"cost":0,"description":"공허 균열이 해금됩니다. 도전해서 전용 재료를 모을 수 있습니다.","routes":["map-explore-voidrift"],"lifecycle":{"label":"일부 유지","kept":"균열 클리어 횟수/대균열 개방 및 클리어 기록","reset":"공허 끌 등 보상 재료"},"after":"jewel","art":"items/chaos-jewel-v3.png","gain":"공허의 끌"},
    {"id":"timerift","name":"시간의 균열","group":"전투","minLoop":13,"cost":0,"description":"시간의 균열이 해금됩니다. 시간압을 조절하고 장비 융합에 도전할 수 있습니다.","routes":["map-explore-timerift"],"lifecycle":{"label":"일부 유지","kept":"시간압, 융합 횟수, 최근 융합 기록","reset":"제단과 제단 장비, 일반 인벤토리 장비. 루프 봉인 장비는 유지됩니다."},"after":"meteorSite","art":"ui/pixel/buttons/loop.png","gain":"장비 융합"},
    {"id":"colony","name":"군락지","group":"전투","minLoop":15,"cost":0,"description":"군락지가 해금됩니다. 몰려오는 웨이브를 막아 낼 수 있습니다.","routes":["map-explore-colony"],"lifecycle":{"label":"루프 초기화","kept":"","reset":"군락지 웨이브/군락 수호판/수호 아이템과 관련 재료"},"after":"fishing","art":"ui/currency/blight-spore.png","gain":"웨이브 방어"},
    {"id":"sky","name":"창공","group":"전투","minLoop":15,"cost":0,"description":"입장 조건을 달성하면 창공의 탑을 등반할 수 있습니다.","routes":["map-tab-sky"],"progress":"sky","lifecycle":{"label":"성장 영구 유지","kept":"응축된 창공의 정수/영구 룬 강화/창공석 성장","reset":"루프별 등반 횟수 제한"},"after":"deepChaos","requires":["gemForge"],"art":"gems/active/heavenly-branch-v1.png","gain":"창공의 정수"},
    {"id":"cube","gain":"코어 슬롯","art":"px/cores/core-offense.png","after":"talisman","name":"코어","group":"장비","minLoop":20,"cost":2,"description":"지하계 10층을 넘기면 지하계 적에게서 코어가 떨어집니다. 장비창 왼쪽 위에 코어 슬롯이 생깁니다.","action":{"tab":"tab-items","subtab":"item-tab-equip"},"progress":"cube","lifecycle":{"label":"루프 초기화","kept":"","reset":"코어 칸과 코어 보관함. 다음 루프에 다시 모읍니다."},"requires":["underworld"]},
    {"id":"talent","gain":"5차 특화","art":"ui/currency/blessing-petal.png","after":"battleTrials","name":"재능","group":"영구 성장","minLoop":10,"cost":2,"description":"재능 개화 조건을 달성하면 재능을 관리할 수 있습니다.","routes":["tab-talent"],"gate":"talent","progress":"talent","lifecycle":{"label":"일부 유지","kept":"개화 카드/카드 레벨/개화 조합 기록","reset":"이번 루프의 개화 직업/5차 특화 포인트와 투자"},"features":[{"name":"재능 개화","description":"시련에서 얻는 개화 카드와 레벨은 영구 성장입니다. 해당 루프의 5차 특화는 다음 루프에 다시 개화해야 합니다."}]},
    {"id":"chaosRealm","name":"혼돈계","group":"전투","minLoop":10,"cost":0,"description":"관문 조건을 달성하면 영구 혼돈계를 등반할 수 있습니다.","routes":["map-tab-chaos-realm","map-explore-worldtree"],"progress":"chaosRealm","after":"gemForge","art":"gems/active/tri-element-wave-v1.png","gain":"영구 혼돈계"},
    {"id":"underworld","name":"지하계","group":"전투","minLoop":10,"cost":0,"description":"혼돈계와 미궁 진행 조건을 달성하면 지하계에서 지하석을 모을 수 있습니다.","routes":["map-tab-underworld"],"progress":"underworld","lifecycle":{"label":"성장 영구 유지","kept":"지하계 등반 기록/룬 보유/장착/강화/룬 슬롯","reset":"룬 파편과 지하 광석"},"features":[{"name":"지하계의 룬","description":"룬 보유, 장착, 강화와 열린 슬롯은 유지됩니다. 강화 재료인 룬 파편과 광석은 초기화됩니다."}],"after":"chaosRealm","requires":["labyrinth"],"art":"gems/active/earthquake-shatter-v1.png","gain":"지하석, 룬"},
    {"id":"cosmos","name":"우주계","group":"전투","minLoop":10,"cost":0,"description":"지하계 30층과 나무꾼 기록을 달성하면 우주를 탐험할 수 있습니다.","routes":["map-tab-cosmos"],"progress":"cosmos","after":"underworld","art":"px/items/cosmic-slab-v3.png","gain":"행성 탐험"},
    {"id":"ocean","name":"심해","group":"전투","minLoop":11,"cost":0,"description":"심해가 해금됩니다. 심해를 탐사하고 수압에 도전할 수 있습니다.","routes":["map-tab-ocean"],"lifecycle":{"label":"성장 영구 유지","kept":"심해 체크포인트/영구 업그레이드/낚시 성장","reset":""},"after":"deepTree","art":"ui/currency/formless-dew.png","gain":"수압 탐사"},
    {"id":"fishing","name":"낚시","group":"전투","minLoop":11,"cost":0,"description":"낚시가 해금됩니다. 낚시터에서 어획물을 모을 수 있습니다.","routes":["map-tab-fishing"],"lifecycle":{"label":"성장 영구 유지","kept":"보유 어획물/누적 어획 기록/수집 보상/인공 어초","reset":""},"after":"ocean","art":"items/thorn-bow-v3.png","gain":"어획물"},
    {"id":"duel","name":"대전","group":"전투","minLoop":3,"cost":0,"description":"대전이 해금됩니다. 다른 플레이어의 기록에 도전할 수 있습니다.","routes":["map-tab-pvp"],"after":"support","art":"items/root-sword-v3.png","gain":"기록에 도전"},
    {"id":"beyond","name":"경계 너머","group":"전투","minLoop":31,"cost":0,"description":"최종 관문 이후의 도전과 인장이 해금됩니다.","routes":["map-explore-beyond"],"progress":"beyond","after":"memoryDungeon","art":"ui/loop-passive-ouroboros-v3.png","gain":"인장"},
    {"id":"deepTree","gain":"영구 능력치","art":"gems/active/abyss-contagion-v1.png","after":"battleTrials","name":"심화 패시브","group":"영구 성장","minLoop":10,"cost":2,"description":"심화 포인트로 영구 능력치를 강화할 수 있습니다. 해금 전에도 등반 보상 포인트는 쌓입니다.","sections":["#loop-deep-growth"],"action":{"tab":"tab-season","section":"loop-deep-growth"},"lifecycle":{"label":"성장 영구 유지","kept":"심화 포인트와 투자한 능력치","reset":""}},
    {"id":"battleTrials","name":"전직 시련","group":"전투","minLoop":3,"after":"trials","cost":0,"progress":"trials","description":"전직을 해금하고 액트 3을 클리어하면 전직 시련에 도전할 수 있습니다. 후속 시련의 조건은 유지됩니다.","routes":["map-explore-trials"],"art":"items/tower-shield-v3.png","gain":"시련 입장"},
    {"id":"meteorSite","name":"운석 낙하 지점","group":"전투","minLoop":7,"cost":0,"progress":"meteor","description":"사냥으로 하늘 균열 게이지를 채우면 한 번 들어가 희귀 이상 장비를 얻을 수 있습니다. 운석 고유 장비도 이곳에서만 떨어집니다.","routes":["map-explore-meteor"],"after":"codex","art":"px/items/cosmic-slab-v3.png","gain":"운석 고유 장비"},
    {"id":"deepChaos","name":"심화 혼돈","group":"전투","minLoop":10,"cost":0,"progress":"deepChaos","description":"혼돈 20층 이후의 심화 등반이 해금됩니다.","routes":["map-explore-chaos"],"art":"gems/active/immortal-vibration-v1.png","gain":"루프 조건"},
    // 2026-11-02: 루프가 닿으면 저절로 열리던 기능을 나무에 올렸다. 값은 SEASON_CONTENT_ROADMAP 줄과 같은 루프다. 코드는 contentProgression.isUnlocked로 읽는다.
    { id: 'wildTalisman', name: '야생 부적 드랍', gain: '적이 부적을 떨굼', art: 'px/items/seed-talisman-v3.png', group: '장비', minLoop: 25, cost: 1, since: 11, after: 'talisman', description: '적이 부적을 떨어뜨립니다.' },
    { id: 'regionAffix', name: '세계수 기운', gain: '지역 전용 옵션', art: 'ui/currency/sap-bud.png', group: '아틀라스', minLoop: 27, cost: 1, since: 11, after: 'wildTalisman', description: '지역 지도 장비에 그 지역 전용 옵션이 붙습니다.' },
    { id: 'emberField', name: '잿불 터', gain: '한 번 더 타락', art: 'ui/currency/burning-ember-branch.png', group: '아틀라스', minLoop: 30, cost: 1, since: 11, after: 'regionAffix', description: '타오른 잿불가지로 장비를 한 번 더 타락시킬 수 있습니다.' },
    { id: 'sapWound', name: '수액 상처', gain: '품질 속성 고르기', art: 'ui/currency/omen-pyre-v4.png', group: '아틀라스', minLoop: 32, cost: 1, since: 11, after: 'emberField', description: '기폭제로 장비의 품질 속성을 고른 태그로 바꿀 수 있습니다.' },
    { id: 'garden', name: '시든 정원', gain: '목걸이에 노드 새김', art: 'ui/currency/omen-pruning-v4.png', group: '아틀라스', minLoop: 36, cost: 1, since: 11, after: 'sapWound', description: '목걸이에 기름 셋을 발라 패시브 노드 하나를 새길 수 있습니다.' },
    { id: 'oilSecond', name: '기름 둘째 자리', gain: '둘째 자리', art: 'items/engraved-belt-v3.png', group: '아틀라스', minLoop: 48, cost: 1, since: 11, after: 'garden', description: '목걸이 기름 둘째 자리가 해금됩니다.' },
    { id: 'memoryDungeon', name: '기억 던전', gain: '보스 다시 도전', art: 'ui/currency/memory-imprint-v2.png', group: '아틀라스', minLoop: 21, cost: 1, since: 11, after: 'sky', description: '보스가 남긴 기억으로 그 보스에게 다시 도전할 수 있습니다. 1~3단계까지 해금됩니다.' },
    { id: 'bossVariant', name: '보스 변이체', gain: '처음 잡을 때 보상', art: 'ui/currency/omen-hunger-v3.png', group: '아틀라스', minLoop: 33, cost: 1, since: 11, after: 'memoryDungeon', description: '모든 보스가 드물게 변이체로 나오고, 처음 잡은 변이마다 보상을 줍니다.' },
    { id: 'memoryDeep', name: '기억 던전 4, 5', gain: '더 깊은 단계', art: 'ui/currency/memory-imprint-v2.png', group: '아틀라스', minLoop: 44, cost: 1, since: 11, after: 'bossVariant', description: '기억 던전 4, 5단계가 해금됩니다.' },
    { id: 'ringRoute', name: '나이테 원정', gain: '주사위 원정', art: 'ui/pixel/buttons/map.png', group: '아틀라스', minLoop: 34, cost: 1, since: 11, after: 'colony', description: '길잡이에게서 얻은 주사위로 이동하고, 보스를 처치해 지도 보상을 받을 수 있습니다.' },
    { id: 'nursery', name: '묘목장', gain: '지역 색 씨앗', art: 'items/thorn-growth-v3.png', group: '아틀라스', minLoop: 39, cost: 1, since: 11, after: 'ringRoute', description: '그 지역 색의 씨앗과 수액, 불씨의 흉터를 얻을 수 있습니다.' },
    { id: 'roomOne', name: '콘텐츠 방 +1', gain: '지도마다 방 +1', art: 'ui/pixel/buttons/map.png', group: '아틀라스', minLoop: 50, cost: 1, since: 11, after: 'nursery', description: '지도마다 콘텐츠 방이 하나 늘어납니다.' },
    { id: 'roomTwo', name: '콘텐츠 방 +2', gain: '지도마다 방 +2', art: 'ui/pixel/buttons/map.png', group: '아틀라스', minLoop: 75, cost: 1, since: 11, after: 'roomOne', description: '지도마다 콘텐츠 방이 하나 더 늘어납니다.' },
    { id: 'rootMemory', name: '뿌리 기억', gain: '경험치 25% 유지', art: 'ui/currency/memory-imprint-v4.png', group: '그루터기', minLoop: 10, cost: 1, since: 11, after: 'deepTree', description: '루프가 바뀌어도 그루터기 함 경험치 25%를 유지합니다.' },
    { id: 'graft', name: '접붙이기', gain: '루프마다 3점', art: 'ui/currency/pruning-shears.png', group: '그루터기', minLoop: 18, cost: 1, since: 11, after: 'rootMemory', description: '루프마다 3점을 받아 그루터기 아이템을 접붙일 수 있습니다.' },
    { id: 'ancientSeed', name: '고대 씨앗', gain: '모든 색 공명', art: 'items/flower-growth-v3.png', group: '그루터기', minLoop: 42, cost: 1, since: 11, after: 'nursery', requires: ['stumpQuality1'], description: '모든 색과 공명하고 이웃 접붙이기가 +1 되는 씨앗이 묘목장과 최종 보스에서 나옵니다.' }
]);
safeExposeData({ CONTENT_UNLOCK_CATALOG, CONTENT_UNLOCK_POINT_AWARDS, CONTENT_UNLOCK_SERIES, CONTENT_UNLOCK_RAILS, CONTENT_UNLOCK_SERIES_VERSION, CONTENT_UNLOCK_TREE_VERSION });
