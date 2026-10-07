// 세계수 연대기(2026-10-08, docs/late-game-review-20261008.md 6절): 흩어진 수집과 기록을 한 화면에 모은 완성도. 장마다 지금 수와 목표가
// 있고(js/chronicle.js가 저장 상태에서 센다), 무게를 곱해 더한 완성도가 10%씩 오를 때마다 나이테가 하나 감긴다. 나이테마다 방치 효율
// (data/offline-progress.js)이 오른다. 감긴 나이테는 저장하고 다시 풀리지 않는다.
// 장: id, 이름, 무게, 목표(없으면 그 수집의 전체 수), 다음 할 일을 알려 주는 한 줄. 몬스터 외형(처치당 0.002%)은 운이라 넣지 않았다.
const CHRONICLE = Object.freeze({
    chapters: Object.freeze([
        { id: 'codex', name: '고유 도감', weight: 3, hint: '처음 얻은 고유 장비가 기록됩니다.' },
        { id: 'mastery', name: '무기 숙련', weight: 3, hint: '여섯 무기의 숙련 레벨 합계입니다(최대 300).' },
        { id: 'talismans', name: '부적 도감', weight: 2, hint: '고유 부적과 야생 고유 부적을 처음 얻으면 기록됩니다.' },
        { id: 'journal', name: '일지', weight: 2, hint: '이야기, 정점, 경쟁자, 숨은 기록을 모읍니다.' },
        { id: 'depth', name: '혼돈 깊이', weight: 2, goal: 80, hint: '역대 최고 혼돈 깊이에서 20을 뺀 값입니다(깊이 100이 끝).' },
        { id: 'loops', name: '완료 루프', weight: 2, goal: 100, hint: '루프를 마칠 때마다 하나씩 오릅니다(100이 끝).' },
        { id: 'harvest', name: '수확 일지', weight: 1, hint: '그루터기 함에서 꽃, 열매, 호박을 네 색씩 키웁니다.' },
        { id: 'fishing', name: '낚시', weight: 1, hint: '바다에서 처음 낚은 어종이 기록됩니다.' },
        { id: 'variants', name: '보스 변형', weight: 1, hint: '루프 33부터 나오는 변이체를 종류별로 잡습니다.' },
        { id: 'memory', name: '기억 던전', weight: 1, goal: 5, hint: '기억 던전에서 이긴 가장 높은 단계입니다.' },
        { id: 'epochs', name: '시대 재생', weight: 1, goal: 5, hint: '아틀라스 시대 재생 횟수입니다.' }
    ].map(Object.freeze)),
    // 나이테 수와 나이테 하나의 방치 효율.
    rings: 10,
    offlinePerRing: 0.01
});

if (typeof safeExposeData === 'function') safeExposeData({ CHRONICLE });
