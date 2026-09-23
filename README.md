# Project ARPG Idle — 현재 개발본

이 폴더가 게임의 **현재 개발본**입니다. 상위 폴더의 같은 이름을 가진 `js/`,
`data/`, `index.html`은 이전 사본입니다. 작업 전 [개발 규칙](AGENTS.md)과
[문서 색인](docs/README.md)을 읽고 `git status --short`로 기존 변경을 확인하세요.

## 실행 구조

빌드 단계가 없는 브라우저 JavaScript 게임입니다. `index.html`이 classic script를
순서대로 로드하며, 그 순서와 명시적으로 노출된 전역이 런타임 계약입니다.
모듈 import/export 구조로 가정하지 마세요. 모바일 패키지는 이 웹 게임을
Capacitor로 감쌉니다.

| 경로 | 확인할 내용 |
| --- | --- |
| `index.html` | 화면 뼈대와 스크립트 로드 순서 |
| `data/` | 게임 상수, 콘텐츠, 맵 정의 |
| `js/utils.js`, `js/state.js` | 공용 도구, 런타임 상태와 초기화 |
| `js/save.js`, `js/save-migrations.js` | 저장·복원과 이전 저장 데이터 이관 |
| `js/items.js`, `js/skills.js`, `js/passives.js`, `js/core-cube.js` | 장비·스킬·패시브·코어 큐브 규칙 |
| `js/combat-grid.js`, `js/combat-clock.js`, `js/combat-replay.js`, `js/combat.js` | 전장과 전투 진행 |
| `js/canvas-*.js`, `js/ui.js`, `js/*-ui.js`, `js/main.js` | 그리기, DOM 입력, 최종 시작 흐름 |
| `assets/`, `css/` | 게임 이미지·소리와 스타일 |
| `db/`, `cloud-save-config.js` | 서버 데이터와 클라우드 저장 연결 |
| `android/`, `capacitor.config.json` | Android 앱 래퍼 |
| `scripts/`, `tests/browser/` | Node 스모크 검사와 Playwright 브라우저 검사 소스 |
| `tools/` | 패시브 트리·스킬 효과 편집 도구 |
| `docs/` | 기능 계약, 진행 중인 이관 기록, 과거 검토 자료 |
| `artifacts/` | 로컬 시안·측정·도구 산출물. 일부 루트 도구가 직접 참조하므로 일괄 삭제 금지 |

코드의 기본 의존 방향은 `data → utils → state/save → domain → combat → UI → main`입니다.
정확한 소유 경계와 변경·저장 규칙은 [AGENTS.md](AGENTS.md)를 따릅니다.

## 검사

이 폴더에서 실행합니다. 변경한 기능에 맞는 검사를 골라 실행하고 범위를 기록하세요.

```powershell
npm test                    # scripts/smoke-*.js 전체
npm run check:architecture  # 런타임 계층·전역·로드 순서 검사
npm run test:browser        # tests/browser/ Playwright 검사
```

`scripts/`와 `tests/browser/`는 실행 검사 **소스**이며 CI에서도 사용합니다.
생성되는 `debug.log`, `test-results/`, `playwright-report/` 등은 `.gitignore` 대상입니다.
로컬 의존성·도구 체인이 들어 있는 `node_modules/`, `.npm-cache/`, `artifacts/`는
삭제 전 참조 여부를 확인하세요.

## 현재 작업을 이어받을 때

작업 트리에는 진행 중인 변경과 추적되지 않은 파일이 있습니다. 일괄 초기화하지 말고
관련 기능과 호출부를 검색한 뒤 기존 변경을 이어받으세요. 예를 들어 넓은 맵 탐험은
[이관 기록](docs/act-exploration-integration.md)에 남아 있고, 그루터기 함은
[미구현 설계안](docs/stump-cube-game-design.md)입니다. 설계안의 수치를 확정된 게임 규칙으로
취급하지 마세요.
