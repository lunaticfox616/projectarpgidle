# 문서 색인

기준: 2026-10-06, main `1d335b4d`(#1041 재화·#1043 주얼·코어·야생 부적 바닥 줍기, #1042 플레이테스트 수정 포함).
[개발본 안내](../README.md)와 [작업 규칙](../AGENTS.md)을 확인한 뒤 **아래에서 해당 주제만** 읽습니다.
전체 문서나 과거 기록을 매 작업마다 읽지 않습니다. 다른 브랜치에서는 현재 코드와 차이를 확인합니다.

## 기능과 런타임을 찾을 때

| 주제 | 시작 문서 |
| --- | --- |
| 콘텐츠 진행·해금 | [현재 진행 구조](content-progression.md), 정의는 [해금 카탈로그](../data/content-progression.js) |
| 능력치 계산 | [플레이어 능력치 파이프라인](player-stats-pipeline.md) |
| NPC 가판대 | [현재 거래 규칙과 변경 이력](balance-and-player-stall-20260929.md) |
| 그루터기 함·조합창 | [현재 구조와 초기 설계 이력](stump-cube-game-design.md), [보조 콘텐츠 통합 이력](aux-consolidation-20260930.md) |
| 루프 밸런스·경험치 | [전투·보상 조정](loop-balance-20261004.md), [몹팩·요구 경험치](pack-balance-20261004.md). 측정치는 해당 실험 조건에 한정 |
| 저장과 방치 성능 | [방치 성능](offline-performance.md) |
| 탐험·바닥 줍기 | [현재 보상·진행 계약](act-exploration-integration.md) |
| 탐험 상자·파괴물 | [클릭 조작, 배치와 후반 사건](exploration-objects-20261005.md) |
| 아틀라스·특수 콘텐츠 지도 | [현재 구현과 후반부 이력](atlas-pinnacles-20261002.md), [초기 아틀라스 설계 이력](atlas-endgame-20260930.md) |
| 전투·보상 피드백 | [타격·처치·개봉 표현과 검토 방법](game-feel-20261005.md) |
| 생성 효과음 | [게임용 52개 효과음·보스 등장·클리어·희귀 드롭 무음과 제작·재생 계약](game-audio-20261006.md) |
| 탐험 맵 그림 | [현재 그린 화풍과 제작 경로](act-maps-painted-20261002.md) |
| 캐릭터·몬스터 | [Hana 연결](hana-integration-20260929.md), [액트 몬스터](act-monsters-20261002.md), [위습](wisp-monsters-20260929.md) |
| 전직·스킬 | [전직 개편 기록](ascendancy-18-20261002.md), [이동 스킬·소환 변경](skill-delta2-20260930.md) |
| UI·CSS | [CSS 구조와 이전 이관 기록](css-architecture-20260915.md), [도트 UI 작업 기록](pixel-ui-20260929.md) |
| 브라우저 검사·CI | [현재 실행 방법](browser-ci.md) |
| Android 검사 | [빌드 경로와 과거 시험판 기록](android-testing.md) |
| 공개·비공개 자산 | [배포 경계](github-publish-20261001.md) |
| 최근 플레이테스트 | [2026-10-06 보고서](main-playtest-20261006.json). 실행 기준·수동 확인 범위·미검증 항목 포함 |

## 현재 규칙과 이력을 구분하기

- 현재 동작은 해당 브랜치의 **코드·데이터·행동 검사**로 확인합니다. 문서가 다르면 현재 설명을 고치며,
  제안·조건부 결정·미구현 항목을 구현 완료로 올리지 않습니다.
- 날짜별 설계·검증 절은 당시 이력입니다. 검사 통과 수, 성능, 화면 평가, 체험 포트는 최신 상태의 보장이 아닙니다.
  이 표에 없는 문서도 개별 주제의 제작·조사 기록이며, 현재 규칙으로 쓰기 전에 소유 코드를 대조합니다.
- [이전 해금 순서](unlock-original-order.md), [해금 검토안](unlock-inventory.md),
  [초기 그루터기 설계](stump-cube-game-design.md)의 과거 생장판·별쐐기·플라스크 설명은 현재 독립 기능 목록이 아닙니다.
- [예전 디오라마](act-maps-20260929.md), [그루브 부품 시안](grove-ui-assets.md),
  [모바일 재설계 기록](mobile-redesign.md), [과거 품질 점검](game-quality-audit-20260914.md)은 당시 화면·채택 상태의 기록입니다.
  자산 파일이 남아 있어도 현재 화면에서 사용한다는 뜻은 아닙니다.
- `skill-assets-v338/reference/`는 납품 원본 규격입니다. 현재 게임 수치로 덮어쓰지 않습니다.
  실제 연결은 [게임 이관 기록](skill-assets-v338/production-integration-20260912.md)과 현재 `js/skill-gem-*.js`를 대조합니다.

파일을 찾을 때는 `rg -n "기능명|심볼명" data js scripts tests index.html docs`로
생산자, 호출부, 저장 경계, 검사를 함께 찾으세요.

로컬 `artifacts/`의 과거 캡처·검사 결과 일부는 용량 정리로 제거되었습니다.
삭제한 폴더와 보존 이유는 [산출물 정리 기록](artifact-cleanup-manifest-20260923.md)에 있습니다.
