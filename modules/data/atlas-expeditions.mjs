// Each row is one stop between the entrance and the regional miniboss.
// [action at the site, enemies guarding it, distinct sites, uninterrupted milliseconds per site].
export const hiveBroods = /* @__PURE__ */ Object.freeze([
    { id:'hive-worker', label:'일벌 고치', escort:'일벌 {count}마리', count:4 },
    { id:'hive-guard', label:'호위벌 고치', escort:'정예 호위벌 {count}마리', count:1 }
]);
export const atlasExpeditions = /* @__PURE__ */ Object.freeze({
    hive: [['밀랍 봉인 깨기', 2, 2, 400], ['깨뜨릴 고치 선택', 0, 2, 500, 'brood']],
    meteor: [['운석 파편 회수', 0, 3, 380], ['충돌핵 식히기', 2, 1, 1800]],
    breach: [['균열 닻 파괴', 3, 2, 350], ['균열 추격', 4, 0, 0]],
    underworld: [['광맥 발굴', 2, 3, 600]],
    ocean: [['공기 방울 확보', 0, 2, 250], ['암초 매복 돌파', 4, 0, 0], ['잠수종 인양', 0, 1, 1600]],
    colony: [['전초지 탈환', 4, 0, 0], ['신호탑 재가동', 4, 1, 1600, 'ambush']],
    labyrinth: [['첫 갈림길 표식 찾기', 0, 1, 350], ['부서진 이정표 복원', 2, 2, 550], ['출구 봉인 풀기', 0, 1, 750]],
    sky: [['상승 기류 타기', 1, 2, 350], ['첨탑 보초 돌파', 3, 0, 0]],
    cosmos: [['별자리 관측', 0, 3, 700], ['궤도핵 정렬', 2, 1, 1200]],
    timerift: [['과거의 시침 고정', 1, 1, 800], ['현재의 진자 멈추기', 3, 1, 550], ['미래의 봉인 풀기', 0, 1, 400]],
    trials: [['시련의 불 점화', 0, 2, 550], ['첫 시험 통과', 3, 0, 0]],
    fossil: [['화석층 조사', 0, 3, 550], ['덮개암 파쇄', 2, 1, 1000]],
    memoryDungeon: [['흩어진 기억 수습', 1, 3, 500], ['잔영 추적', 2, 0, 0]],
    ringRoute: [['바깥 나이테 읽기', 0, 2, 500], ['안쪽 나이테 열기', 2, 1, 900]],
    fishing: [['물결 살피기', 0, 2, 500], ['숨은 어군 유인', 2, 1, 1700, 'ambush']],
    duel: [['도전자와 일대일 결투', 1, 0, 0]],
    battleTrials: [['선봉 돌파', 2, 0, 0], ['중갑대 돌파', 3, 0, 0], ['결전의 종 울리기', 0, 1, 500]],
    chaosRealm: [['혼돈의 매듭 끊기', 2, 2, 650], ['균열 너머 추격', 3, 0, 0]],
    beyond: [['경계석 맞추기', 0, 2, 850], ['척후대 추적', 4, 0, 0]],
    deepChaos: [['침식핵 파괴', 4, 1, 550], ['심층 봉인 복원', 1, 2, 1000]],
    emberField: [['꺼진 화로 점화', 2, 3, 450]],
    sapWound: [['기생 무리 제거', 5, 0, 0], ['수액 상처 봉합', 3, 2, 950, 'ambush']],
    nursery: [['묘목에 수액 주기', 0, 3, 600], ['묘목장 습격 저지', 5, 0, 0]],
    witheredGarden: [['마른 수로 열기', 2, 2, 650], ['정원 중심에 물 대기', 0, 1, 1300]]
});
