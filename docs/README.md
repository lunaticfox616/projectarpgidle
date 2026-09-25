# 문서 색인

현재 코드와 작업 범위는 [개발본 안내](../README.md), 필수 규칙은
[AGENTS.md](../AGENTS.md)에서 먼저 확인합니다. 이 폴더에는 현재 계약,
진행 기록, 예전 검토 자료가 함께 있으므로 문서의 상태와 코드 구현을 대조하세요.

## 기능과 런타임을 찾을 때

| 주제 | 시작 문서 |
| --- | --- |
| 콘텐츠 진행·해금 | [진행 구조](content-progression.md), [기존 해금 순서](unlock-original-order.md) |
| 능력치 계산 | [플레이어 능력치 파이프라인](player-stats-pipeline.md) |
| 저장과 방치 성능 | [방치 성능](offline-performance.md) |
| 넓은 맵 탐험 | [실제 게임 이관 및 남은 작업](act-exploration-integration.md) |
| 브라우저 검사 | [브라우저 CI 운영](browser-ci.md) |
| Android 검사 | [Android 테스트](android-testing.md) |
| 모바일 UI | [모바일 재설계](mobile-redesign.md) |

## 설계안과 작업 기록

- [그루터기 함](stump-cube-game-design.md): **미구현 제품 설계안**입니다.
  제안된 수치와 저장 규칙을 사용자 확정 사항으로 간주하지 않습니다.
- [그루브 UI 자산](grove-ui-assets.md): 나무·매듭 UI 부품, 둥근 HP 게이지, 그루터기 함 판.
  **자산만 준비됐고 게임에는 미반영**입니다. 시안은 `artifacts/grove-ui/preview.html`입니다.
- [게임 품질 점검](game-quality-audit-20260914.md): 2026-09-14 시점의 점검 기록입니다.
  현재 결함 목록으로 사용하기 전에 코드와 최근 기록을 확인합니다.
- 날짜가 붙은 UI·밸런스·콘텐츠 문서는 그 시점의 결정 또는 검토 기록입니다.
  현재 동작의 단일 출처는 코드와 관련 행동 검사입니다.

파일을 찾을 때는 `rg -n "기능명|심볼명" data js scripts tests index.html docs`로
생산자, 호출부, 저장 경계, 검사를 함께 찾으세요.

로컬 `artifacts/`의 과거 캡처·검사 결과 일부는 용량 정리로 제거되었습니다.
삭제한 폴더와 보존 이유는 [산출물 정리 기록](artifact-cleanup-manifest-20260923.md)에 있습니다.
