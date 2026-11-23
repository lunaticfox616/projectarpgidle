// [stage region, miniboss name, legacy side-room rule, live expedition miniboss sprite].
export const atlasChallenges = Object.freeze({
    hive: ['beehive', '왕실 육아실의 문지기', 'swarm', 'hive-royal'],
    meteor: ['meteor', '낙성의 파수자', 'fracture', 'meteor-sentinel'],
    breach: ['void', '균열의 포식자', 'drain', 'breach-veil'],
    underworld: ['underworld', '흑요 광맥의 파수꾼', 'fracture', 'underworld-obsidian-centipede'],
    ocean: ['ocean-shallow', '암초의 점술사', 'ebb', 'ocean-oracle'],
    colony: ['colony', '전초지의 병정대장', 'rally', 'colony-carapace-beetle'],
    labyrinth: ['labyrinth', '막다른 길의 감시자', 'fracture', 'atlas-trunk-2'],
    sky: ['sky', '첨탑의 그리핀', 'swarm', 'sky-griffin'],
    cosmos: ['cosmos', '성운의 파수체', 'flare', 'cosmos-sentinel'],
    timerift: ['rift-past', '멈춘 시각의 기사', 'ebb', 'rift-oath-warden'],
    trials: ['trial-01', '첫 시험의 집행자', 'swarm', 'atlas-garden-4'],
    fossil: ['underworld', '화석층의 등껍질', 'fracture', 'ocean-shell'],
    memoryDungeon: ['beyond', '잊힌 회랑의 잔영', 'drain', 'atlas-roots-8'],
    ringRoute: ['act-07', '나이테의 고목지기', 'regrow', 'atlas-trunk-1'],
    fishing: ['fishing', '여울의 잠복자', 'swarm', 'ocean-angler'],
    duel: ['trial-02', '야영지의 결투사', 'rally', 'atlas-trunk-5'],
    battleTrials: ['trial-03', '관문의 무장', 'rally', 'atlas-garden-7'],
    chaosRealm: ['chaos-realm', '혼돈의 문지기', 'drain', 'atlas-roots-0'],
    beyond: ['beyond', '경계의 척후대장', 'fracture', 'ashveil-stalker'],
    deepChaos: ['deep-chaos', '심화 혼돈의 탐식자', 'drain', 'atlas-garden-5'],
    emberField: ['act-07', '잿불의 불씨지기', 'flare', 'atlas-garden-3'],
    sapWound: ['act-05', '상처에 깃든 기생목', 'drain', 'act5-worm'],
    nursery: ['act-03', '묘목장의 접목수', 'regrow', 'act10-graft-beast'],
    witheredGarden: ['act-09', '말라붙은 정원지기', 'fracture', 'atlas-garden-0']
});

export const challengeType = id => typeof id === 'string' && id.startsWith('bonus-') ? id.slice(6) : '';
