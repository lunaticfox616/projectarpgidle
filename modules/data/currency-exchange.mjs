/**
 * 베일라의 재화 교환. 보유 재화, 입장권, 화폐를 정해진 기본 재화로 팔고, 한 번이라도 가진 재화는 더 비싸게 살 수 있다.
 * 규칙은 js/currency-exchange.js, 창은
 * js/orga-exchange-ui.js.
 *
 * prices: 재화 1개의 시세 [값을 치르는 기본 재화, 그 재화로 몇 개]. 싼 재화는 마법의 새싹, 중간은 형체 없는 이슬, 비싼 재화는 황금률로 매긴다.
 * 팔면 시세의 sell배를 받고(내림), 사면 시세의 buy배를 낸다(올림). 이번 루프의 시세는 재화마다 1 ± swing 안에서 정해진다(루프와 재화로 정해지는
 * 값이라 같은 루프에서는 바뀌지 않는다). sell과 buy 사이가 네 배라 시세가 흔들려도 되팔기로 늘릴 수는 없다.
 * 처음 매긴 값이다: 얻는 곳과 쓰임으로 어림했고, 시장 교환(MARKET_EXCHANGES)의 새싹 8개 = 이슬 1개, 황금률 1개 = 이슬 30 ~ 100개를 따랐다.
 * noBuy: 팔 수만 있는 재화. 목록에 없는 재화(옛 주얼 핵, 창공 탑의 응축된 정수처럼 지갑 밖의 값)는 다루지 않는다.
 */
const NPC_CURRENCY_EXCHANGE = Object.freeze({
    npc: 'veila',
    sell: 0.5,
    buy: 2,
    swing: 0.1,
    noBuy: Object.freeze(['ouroboros']),
    prices: Object.freeze({
        // 기본 재화: 새싹, 이슬, 황금률은 서로를 값으로 친다
        magicBud: ['formlessDew', 0.125], sapBud: ['formlessDew', 10], formlessDew: ['goldenRule', 0.02], goldenRule: ['formlessDew', 50],
        blessing: ['formlessDew', 4], blightSpore: ['formlessDew', 4], pruningShears: ['goldenRule', 1], fairyRing: ['goldenRule', 1],
        // 특수 제작
        emberBranch: ['formlessDew', 8], burningEmberBranch: ['formlessDew', 25], ouroboros: ['goldenRule', 2], enchantedHoney: ['formlessDew', 10],
        venomStinger: ['formlessDew', 8], voidChisel: ['formlessDew', 20], oceanRerollShard: ['formlessDew', 10], altarEmber: ['formlessDew', 15],
        altarIchor: ['formlessDew', 15], memoryImprint: ['goldenRule', 2],
        // 퀄리티와 기름
        deepWhetstone: ['magicBud', 4], rootIron: ['magicBud', 4], jewelPolish: ['magicBud', 4], abyssCatalyst: ['formlessDew', 2],
        catalystPhys: ['formlessDew', 1], catalystFire: ['formlessDew', 1], catalystCold: ['formlessDew', 1], catalystLight: ['formlessDew', 1],
        catalystChaos: ['formlessDew', 1], catalystCrit: ['formlessDew', 1], catalystSummon: ['formlessDew', 1],
        oilFire: ['formlessDew', 3], oilCold: ['formlessDew', 3], oilLight: ['formlessDew', 3], oilChaos: ['formlessDew', 3],
        // 화석
        fossil: ['formlessDew', 1], fossilPrimal: ['formlessDew', 8], fossilAncientPrimal: ['formlessDew', 30], fossilPrimordial: ['formlessDew', 25],
        fossilJagged: ['formlessDew', 5], fossilBound: ['formlessDew', 5], fossilGale: ['formlessDew', 5], fossilPrismatic: ['formlessDew', 5],
        fossilBulwark: ['formlessDew', 5], fossilWedge: ['formlessDew', 5], fossilAbyssal: ['formlessDew', 10], fossilOld: ['formlessDew', 4],
        fossilRift: ['formlessDew', 15],
        // 제작 뿌리
        omenPruning: ['goldenRule', 3], omenCompost: ['goldenRule', 3], omenWeave: ['goldenRule', 3], omenPyre: ['goldenRule', 3], omenHunger: ['goldenRule', 3],
        // 입장권과 열쇠
        bossKeyFlame: ['formlessDew', 20], bossKeyFrost: ['formlessDew', 20], bossKeyStorm: ['formlessDew', 20], beastKeyCerberus: ['formlessDew', 30],
        trialKey3: ['formlessDew', 25], chaosKey: ['formlessDew', 30], coreKey: ['formlessDew', 30], hiveKey: ['formlessDew', 30],
        colonyTrace: ['formlessDew', 3], rivalKey: ['goldenRule', 1], cosmosSovereignKey: ['goldenRule', 1],
        uberRootTicketFlame: ['goldenRule', 2], uberRootTicketFrost: ['goldenRule', 2], uberRootTicketStorm: ['goldenRule', 2], uberRootTicketChaos: ['goldenRule', 2],
        // 재료와 화폐
        bossCore: ['formlessDew', 20], runeShard: ['magicBud', 2], underCopper: ['formlessDew', 1], underSilver: ['formlessDew', 3],
        underGold: ['formlessDew', 8], skyEssence: ['formlessDew', 2], jewelShard: ['formlessDew', 1], pollen: ['magicBud', 2],
        beeswax: ['magicBud', 4], awakenedEcho: ['goldenRule', 1], sealShard: ['formlessDew', 2], strongSealShard: ['formlessDew', 8],
        radiantSealShard: ['formlessDew', 25], reefFragment: ['magicBud', 4], colonyShard: ['magicBud', 4]
    })
});
export { NPC_CURRENCY_EXCHANGE };
