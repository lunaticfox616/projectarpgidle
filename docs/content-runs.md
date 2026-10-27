# 콘텐츠 도전 계약

나무꾼 전투, 지역을 바꾸는 콘텐츠 시작, 콘텐츠 전용 고유를 고칠 때 지키는 규칙이다.
2026-10-27 회고에서 `AGENTS.md`에 있던 규칙을 그대로 옮겼다. `AGENTS.md`에는 이 문서를 가리키는 줄만 남는다.

## 나무꾼 전투 잠금

나무꾼 전투 중(`game.woodsmanBuildLock`)에는 장비, 가방, 룬 기록, 패시브가 매 틱 전투 전으로 돌아가고 재화는 그대로다
(`enforceWoodsmanBuildLock`). 값을 치르고 이것들을 바꾸는 동작은 잠금 중에 거절한다(제작은 `equipmentCrafting.buildLockReason`).
혼돈 밖, 군락지, 대균열을 떠나면 다음 틱에 그 도전이 끝난다(`holdZoneBoundRuns`, 나무꾼 잠금도 이때 풀린다).

## 지역을 바꾸는 콘텐츠 시작

현재 지역을 직접 바꾸는 콘텐츠 시작(군락지, 벌집, 혼돈 밖, 심해, 잔상, 대균열 같은)은 값을 치르기 전에
`getContentStartBlockReason`(`js/items.js`)을 묻는다. 벌집 원정과 경계 너머 안에서, 아틀라스 지도 안에서(지도를 포털 없이
빠져나가지 않게), 루프 진행 대기(시간 정지) 중에는 거절한다. `changeZone`을 거치는 입장은 `getHeldRunBlockReason`만 묻는다.
루프 정산은 진행 중인 도전(벌집, 군락지, 대균열, 경계 너머)을 끝낸다(`resetLoopContents`).

## 콘텐츠 전용 고유

콘텐츠 전용 고유(`dropOnly.type`)는 그 지역에서 고유를 굴릴 때만 나온다. 장비가 드문 콘텐츠는
`REALM_BOSS_UNIQUE_DROP_RULES.chance`(`data/items.js`)에 그 지역 종류를 넣어 보스 처치 때 굴리게 한다.
