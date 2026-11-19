# Project ARPG Idle

브라우저에서 도는 방치형 ARPG입니다. 이 폴더가 현재 개발본입니다.
작업 전에 [개발 규칙](AGENTS.md)을 읽고, 필요한 주제만 [문서 색인](docs/README.md)에서 찾아 읽습니다.
과거의 모듈 전환 기록과 측정값은 이 파일의 git 이력에 있습니다(2026-11-19에 줄였습니다).

## 실행

```powershell
npm run setup:worktree   # 새 작업본에서 한 번: node_modules 연결, 비공개 그림 준비
npm run dev              # 개발 서버
npm run build            # 웹 배포 빌드(dist/)
npm run probe -- --save <저장.json> --size 390x844 --script <파일.js>   # 정해진 상태로 띄워 스크립트 실행, 스크린숏
```

Android는 [android-testing.md](docs/android-testing.md), PC 실행 파일은 [desktop-app-20261103.md](docs/desktop-app-20261103.md)를 봅니다.
작업을 이어받을 때는 `git status --short --branch`로 브랜치와 남은 변경부터 확인합니다. 다른 작업본의 코드나 체험 주소를 이 작업본의 상태로 보지 않습니다.

## ES module 원본과 생성 규칙

- 게임 원본은 `modules/`의 ES module입니다. 계층 폴더는 `data`, `common`, `browser`, `state`, `persistence`, `domain`, `combat`, `rendering`, `ui`, `application`이고, 왼쪽 계층만 import합니다.
- 개발 페이지는 `index.html`의 classic script를 순서대로 읽습니다. `modules/*-classic.mjs` 어댑터가 원본을 기존 전역 이름에 연결합니다. 소비자가 모두 import로 바뀐 어댑터는 `scripts/build-modules.js`의 항목과 함께 지웁니다.
- `js/`와 `data/`의 파일은 `npm run build:modules`가 만드는 출력이고 저장소에 없습니다. 손으로 관리하는 파일은 `js/bootstrap.js`, `data/pixel-icons.js`, `data/boss-fx-links.json` 셋뿐입니다. 생성 파일은 고치거나 커밋하지 않습니다.
- 검사, 개발 서버, 빌드는 실행 전에 원본이 달라졌을 때만 다시 만듭니다(`scripts/lib/ensure-modules.js`). 개발 서버를 켠 채 원본을 고쳤으면 `npm run build:modules` 뒤 새로고침합니다.
- 생성 파일을 저장소에서 빼기 전(2026-11-15)에 갈라진 브랜치는 main을 병합할 때 `node scripts/resolve-generated-conflicts.js`로 충돌을 정리합니다.
- 빌드는 entry마다 import한 원본 전체를 검사합니다. 계산 원본은 브라우저와 게임 전역을 쓸 수 없고, 어댑터는 `scripts/build-modules.js`의 그 항목에 적은 전역만 씁니다. 새 전역을 쓰면 그 목록에 더해야 빌드가 통과합니다.
- 개발 전용 코드는 `/*! @dev-only */`와 `/*! @end-dev-only */` 사이에 둡니다. 배포 빌드가 이 구간을 지웁니다.
- 표와 언어팩의 원본은 `modules/data/*.mjs`이고 `modules/data/entries.json`이 출력 경로를 정합니다. 외국어 팩 넷은 고를 때만 불러옵니다. 대사, 패시브, 그림 가져오기 도구는 `scripts/lib/data-authoring.cjs`로 원본을 고치고 출력을 다시 만듭니다.
- 배포는 `scripts/lib/classic-bundles.js`가 HTML 순서대로 classic script를 esbuild로 묶습니다. 공개 전역과 프로퍼티 이름은 그대로 두고, tree shaking과 프로퍼티 이름 변경은 하지 않습니다. 콜백은 `Function.name`이나 `toString()`에 기대지 않습니다. 배포본 검사는 `npm run probe -- --root dist ...`입니다.

## 코드만 읽어서는 알기 어려운 규칙

- **저장 불러오기는 종료가 아닙니다.** 불러오기, 미리보기, 방치 재생은 현재 `game` 객체만 바꿉니다. 모듈은 `game`을 붙잡아 두지 않고 부를 때마다 받거나 읽습니다. `application.dispose()`만 최종 종료이고, 종료한 인스턴스는 다시 시작하지 않습니다.
- **기다린 뒤에는 저장을 다시 확인합니다.** 확인 창, 예약 타이머, 서버 응답 뒤에는 요청할 때의 저장 객체(필요하면 루프, 계정, 대상)가 그대로일 때만 적용합니다.
- **생성자는 아무것도 시작하지 않습니다.** 서비스 생성자와 모듈 최상위는 리스너와 타이머를 걸지 않고 DOM이나 뒤에 읽히는 표도 읽지 않습니다. `start()`나 `install()`이 해제 함수를 돌려주고, 늦게 만들어지는 표는 함수로 넘깁니다.
- **도메인 명령은 그 자리에서 실행합니다.** 로그, 연출, 저장 명령을 끝에 몰아 처리하면 난수와 보상, 알림의 순서가 달라집니다.
- **미리보기와 시뮬레이션은 아이템 번호와 재화를 건드리지 않습니다.** 번호를 올리는 경로를 거쳤다면 `finally`에서 되돌립니다.
- **시각은 인자로 받습니다.** 도메인은 전투 시계(ms)와 벽시계(UTC ms)를 섞지 않습니다. 가판대 난수는 저장된 `stall.rng`만 씁니다.
- **전투 목록을 도는 동안에는 시작 길이를 고정합니다.** 도는 중의 처치와 소환이 범위를 늘리지 않습니다. 연쇄 처치(시체 폭발, 초과 피해)는 새 희생자의 정산을 끝낸 뒤 원래 타격으로 돌아갑니다.
- **쓰는 곳이 없어 보여도 지우면 안 되는 전역이 있습니다.** `rollEnemyGemReward`와 `receiveKnittingYarn`은 드랍 시뮬레이터(`scripts/lib/drop-simulation-context.js`)가 바꿔 끼웁니다. `drawBattleGroundLayer`, `drawBattlePlayerActor`, `drawBattleEnemyActor`, `drawSkillGemVfxLayer`는 스킬 실험실이 바꿔 끼우므로 전장은 부르는 시점의 전역을 읽습니다.
- **UI의 `getSupportActiveTier`는 읽으면서 기록을 고쳐 저장합니다.** 읽기만 할 때는 `modules/common/support-gems.mjs`의 `activeSupportTier`를 씁니다.
- **시험에서 전투만 멈출 때**는 `window.GameModules.application.timers.stopCombat()`을 씁니다.

## 폴더

| 경로 | 내용 |
| --- | --- |
| `modules/` | 게임 원본(ES module)과 classic 어댑터 |
| `js/`, `data/` | 위 원본의 생성 출력 |
| `index.html`, `css/`, `assets/` | 화면 뼈대와 스크립트 순서, 스타일, 그림과 소리 |
| `db/`, `cloud-save-config.js` | 서버 SQL과 클라우드 저장 연결 |
| `android/`, `desktop/` | Android 앱과 PC 실행 파일 래퍼 |
| `scripts/`, `tests/browser/` | Node 검사와 개발 도구, Playwright 브라우저 검사 |
| `tools/` | 패시브 트리와 스킬 효과 편집 도구 |
| `docs/` | 기능 계약과 날짜별 기록 |
| `artifacts/` | 로컬 시안과 측정 결과. 일부 도구가 읽으므로 한꺼번에 지우지 않습니다 |

## 검사

```powershell
npm test                    # Node 스모크 전체, 끝에 구조, DB, 언어, 타입 검사
npm run check:architecture  # 계층, 전역, 함수 크기
npm run check:css
npm run check:i18n
npm run build               # 배포 파일과 자산 경로
npm run test:browser        # tests/browser/ (한 번에 하나만 실행)
npm run pr:check            # PR을 만들기 직전
```

CI는 Node 스모크와 구조, CSS, 빌드를 돌립니다. 브라우저 검사는 로컬에서 돌립니다([검사 안내](docs/browser-ci.md)).

## 아직 확인하지 못한 것

실물 휴대전화, 네이티브 앱(Android의 복귀와 뒤로 가기, 로그인 콜백, PC 셸), 운영 서버에서의 거래와 고스트 대결, 실제 CDN에서의 로딩 시간.
