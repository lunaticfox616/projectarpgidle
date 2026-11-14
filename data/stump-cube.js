// GENERATED from modules/data/stump-cube.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/stump-cube.mjs
  var STUMP_CUBE_SIZE = 5;
  var STUMP_CUBE_MERGE = Object.freeze({ step: Object.freeze([1, 10]), bestChance: 0.1, overChance: 0.05, over: 0.11 });
  var STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE = 0.1;
  var STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE = 0.1;
  var STUMP_CUBE_CATALYST_EXCHANGE = 3;
  var STUMP_CUBE_RECIPES = Object.freeze([
    {
      id: "equip_magic_upgrade",
      reveal: { harvest: ["flower", "fruit"] },
      group: "장비",
      need: "마법 장비 1 + 꽃이나 열매 1",
      name: "마법 장비 승급",
      result: "희귀 장비 1",
      note: "베이스 유지 및 옵션 리롤",
      inputs: [{ kind: "equipment", rarity: "magic", count: 1 }, { kind: "stump", family: "seed", path: ["flower", "fruit"], ripe: true, count: 1 }],
      cost: {}
    },
    {
      id: "equip_rare_tier",
      reveal: { harvest: ["root"] },
      group: "장비",
      need: "희귀 장비 1 + 뿌리 2",
      name: "희귀 장비 단련",
      result: "같은 부위의 티어 +1 희귀 장비",
      note: "티어 상한: 현재",
      inputs: [{ kind: "equipment", rarity: "rare", count: 1 }, { kind: "stump", family: "seed", path: "root", ripe: true, count: 2 }],
      cost: { formlessDew: 1 }
    },
    {
      id: "equip_rare_exceptional",
      group: "장비",
      need: "같은 베이스 희귀 장비 3",
      name: "희귀 장비 특출 베이스",
      result: "같은 베이스 희귀 장비 1",
      note: `옵션 리롤 (특출난 베이스가 될 확률 ${Math.round(STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE * 100)}%)`,
      inputs: [{ kind: "equipment", rarity: "rare", count: 3, same: ["base"] }],
      cost: {}
    },
    {
      id: "equip_unique_remake",
      group: "장비",
      need: "같은 고유 장비 2",
      name: "고유 장비 리롤",
      result: "같은 고유 장비 1",
      note: `옵션 리롤 (특출난 베이스가 될 확률 ${Math.round(STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE * 100)}%)`,
      inputs: [{ kind: "equipment", rarity: "unique", count: 2, same: ["name"] }],
      cost: {}
    },
    {
      id: "equip_unique_reroll",
      reveal: { harvest: ["flower", "fruit"] },
      group: "장비",
      need: "고유 장비 1 + 꽃이나 열매 3",
      name: "고유 장비 순환",
      result: "같은 부위의 무작위 고유 장비로 변환",
      inputs: [{ kind: "equipment", rarity: "unique", count: 1 }, { kind: "stump", family: "seed", path: ["flower", "fruit"], ripe: true, count: 3 }],
      cost: {}
    },
    // 히든 조합(2026-11-03 사용자): 조합법 책에 나오지 않는다(reveal.hidden). 네 수확물 고유(uniqueKey: 효과 키, 2026-11-04 덩굴 고유를 더했다)가
    // 풍작의 갑주가 된다. 뿌리에 얽힌 시간의 효과 키 amberTime은 옛 이름(호박에 갇힌 시간) 그대로다: 저장된 장비가 그 키를 들고 있다.
    {
      id: "equip_harvest_armour",
      reveal: { hidden: true },
      group: "장비",
      need: "마른 꽃잎 고리 + 떨어지지 않는 열매 + 감기는 덩굴손 + 뿌리에 얽힌 시간",
      name: "풍작의 갑주",
      result: "풍작의 갑주 1(꽃, 열매, 덩굴, 뿌리 소켓)",
      note: "네 고유의 소켓에 든 것은 돌려받습니다.",
      inputs: [
        { kind: "equipment", rarity: "unique", uniqueKey: "witheredEcho", count: 1 },
        { kind: "equipment", rarity: "unique", uniqueKey: "fruitSocket", count: 1 },
        { kind: "equipment", rarity: "unique", uniqueKey: "vineSocket", count: 1 },
        { kind: "equipment", rarity: "unique", uniqueKey: "amberTime", count: 1 }
      ],
      cost: {}
    },
    {
      id: "equip_socket_jewel",
      reveal: { content: "jewel" },
      group: "장비",
      need: "장신구 1 + 주얼 3",
      name: "장신구 주얼 융합",
      result: "세 개의 주얼 중 하나가 끼워진 장신구, 주얼 해제 불가능",
      note: "공허 소켓을 하나 뚫어 끼움(뚫을 수 있는 장신구만)",
      inputs: [{ kind: "equipment", socketable: true, count: 1 }, { kind: "jewel", count: 3 }],
      cost: {}
    },
    // 씨앗은 자라는 것끼리만(2026-11-04): 다 자란 것은 종류가 정해져 합치면 그 종류를 잃는다. 보관함 위 [자동합성]이 같은 묶음을 모두 합친다.
    {
      id: "stump_merge",
      group: "그루터기",
      need: "같은 색 씨앗 3",
      name: "씨앗 합치기",
      result: "같은 색 씨앗 1, 품질은 평균 +1~10%",
      note: "낮은 확률로 더 좋은 결과 가능",
      inputs: [{ kind: "stump", family: "seed", ripe: false, count: 3, same: ["color"] }],
      cost: {}
    },
    {
      id: "stump_recolor",
      group: "그루터기",
      need: "씨앗 1 + 다른 색 씨앗 2",
      name: "씨앗 색 바꾸기",
      result: "두 씨앗 색의 씨앗 1",
      note: "품질 유지, 성장 초기화",
      inputs: [{ kind: "stump", family: "seed", ripe: false, count: 2, same: ["color"] }, { kind: "stump", family: "seed", ripe: false, count: 1, unlike: "color" }],
      cost: {}
    },
    {
      id: "root_catalyst",
      reveal: { harvest: ["root"], loop: 32 },
      group: "그루터기",
      need: "같은 색 뿌리 2",
      name: "뿌리 기폭제",
      result: "그 색의 기폭제 1",
      note: "장비 품질 속성(물리, 화염, 냉기, 번개, 카오스), 루프 32부터",
      inputs: [{ kind: "stump", family: "seed", path: "root", ripe: true, count: 2, same: ["color"] }],
      cost: {}
    },
    {
      id: "fruit_oil",
      reveal: { harvest: ["fruit"], loop: 36 },
      group: "그루터기",
      need: "같은 색 열매 2",
      name: "열매 기름",
      result: "그 색의 정원 기름 1",
      note: "목걸이에 바르는 기름, 루프 36부터",
      inputs: [{ kind: "stump", family: "seed", path: "fruit", ripe: true, count: 2, same: ["color"] }],
      cost: {}
    },
    // costText: 조합할 때 정해지는 비용의 글(기폭제 바꾸기는 덩굴 색이 아닌 기폭제 셋을 무작위로 낸다, js/sap-catalysts.js).
    {
      id: "catalyst_exchange",
      reveal: { harvest: ["vine"], loop: 32 },
      group: "그루터기",
      need: "덩굴 1",
      name: "기폭제 바꾸기",
      result: `그 색의 기폭제 ${STUMP_CUBE_CATALYST_EXCHANGE}`,
      costText: `덩굴 색이 아닌 기폭제 ${STUMP_CUBE_CATALYST_EXCHANGE} (무작위)`,
      inputs: [{ kind: "stump", family: "seed", path: "vine", ripe: true, count: 1 }],
      cost: {}
    },
    {
      id: "talisman_upgrade",
      reveal: { content: "talisman" },
      group: "부적",
      need: "부적 3(고유 제외)",
      name: "부적 리롤",
      result: "새 부적 1",
      note: "강력한 기운의 봉인편린 등급, 셋 다 희귀면 찬란한 봉인편린 등급",
      inputs: [{ kind: "stump", family: "talisman", rarity: ["magic", "rare"], count: 3 }],
      cost: {}
    },
    {
      id: "talisman_reroll_line",
      reveal: { content: "talisman", harvest: ["vine"] },
      group: "부적",
      need: "부적 1(고유 제외) + 덩굴 1",
      name: "부적 옵션 리롤",
      result: "부적의 일반 옵션 1줄 다시 굴림",
      note: "강력한 기운의 봉인편린 배율",
      inputs: [{ kind: "stump", family: "talisman", rarity: ["magic", "rare"], count: 1 }, { kind: "stump", family: "seed", path: "vine", ripe: true, count: 1 }],
      cost: { sealShard: 1 }
    },
    {
      id: "talisman_unique_reroll",
      reveal: { content: "talisman" },
      group: "부적",
      need: "고유 부적 2",
      name: "고유 부적 순환",
      result: "다른 고유 부적 1",
      inputs: [{ kind: "stump", family: "talisman", rarity: "unique", count: 2 }],
      cost: { strongSealShard: 1 }
    },
    {
      id: "jewel_fuse",
      reveal: { content: "jewel" },
      group: "주얼",
      need: "주얼 3(고유 제외)",
      name: "주얼 융합",
      result: "희귀 주얼 1(옵션 3~4줄)",
      note: "재료 가운데 가장 높은 등급 범위",
      inputs: [{ kind: "jewel", rarity: ["magic", "rare"], count: 3 }],
      cost: { jewelShard: 10 }
    },
    {
      id: "core_reroll",
      reveal: { content: "cube" },
      group: "코어",
      need: "코어 3(완전한 코어 제외)",
      name: "코어 리롤",
      result: "새 코어 1",
      inputs: [{ kind: "core", rarity: ["rare"], count: 3 }],
      cost: {}
    },
    {
      id: "core_reroll_line",
      reveal: { content: "cube", harvest: ["vine"] },
      group: "코어",
      need: "코어 1(완전한 코어 제외) + 덩굴 1",
      name: "코어 옵션 리롤",
      result: "코어의 옵션 1줄 다시 굴림",
      inputs: [{ kind: "core", rarity: ["rare"], count: 1 }, { kind: "stump", family: "seed", path: "vine", ripe: true, count: 1 }],
      cost: {}
    }
  ]);

  // modules/data/stump-cube.mjs:classic
  Object.assign(globalThis, { STUMP_CUBE_SIZE, STUMP_CUBE_MERGE, STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE, STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE, STUMP_CUBE_CATALYST_EXCHANGE, STUMP_CUBE_RECIPES });
  if (typeof safeExposeData === "function") safeExposeData({ STUMP_CUBE_SIZE, STUMP_CUBE_MERGE, STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE, STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE, STUMP_CUBE_CATALYST_EXCHANGE, STUMP_CUBE_RECIPES });
})();
