# PC판(데스크톱 실행 파일)

2026-11-03 사용자: 스팀 출시에 데스크톱 실행 파일이 필요하다. 웹 묶음(`dist`)을 Electron 창에 띄운 윈도우용 `Rignin.exe`다.
게임 코드와 저장 형식은 웹, Android와 같고, PC 쪽 코드는 `desktop/`에만 있다.

## 만들기와 실행

- 처음 한 번 `npm --prefix desktop install`(Electron과 묶는 도구는 루트 `npm install`과 CI에 들어가지 않는다).
- `npm run desktop:build`: 웹 묶음을 만들고 `desktop/out/Rignin-win32-x64/`에 묶는다. 이 폴더째로 배포한다(스팀에는 이 폴더를 올린다).
  버전은 `changelog.md` 맨 위 버전이다. 언어 파일은 한국어와 영어만 남긴다.
- 구입한 이펙트 그림(`assets/stage-vfx/vfx.png`, `vfx2.png`, `vfx3.png`)은 git에 없지만 게임 묶음에는 들어가야 하므로, 없으면 빌드가 멈춘다.
  비공개 저장소 `projectarpgidle-assets`의 것과 같아야 한다.
- 개발 실행: `npm run build` 뒤 `npm run desktop`(지금의 `dist`를 띄운다, F12 개발 도구). 묶은 exe에는 개발 도구와 메뉴가 없다.
- 화면 모드: 처음에는 전체 화면으로 뜬다. 설정의 화면과 소리 칸 "화면 모드"(PC판에서만 보인다), F11, Alt+Enter로 바꾸고,
  고른 모드는 프로필 폴더의 `window.json`에 남아 다음 실행에 쓴다(저장 파일이 아니다). 창 모드는 최대화된 창이다.

## 바꾸면 안 되는 것

- 게임은 `rignin-app://game/`에서 열리고, 이 기기 저장은 `%APPDATA%\Rignin`에 있다(`desktop/main.cjs`). 주소의 이름이나 폴더 이름을
  바꾸면 플레이어의 이 기기 저장이 사라진다. 개발 실행은 `Rignin-dev` 폴더를 쓴다.

## 로그인과 갱신

- 구글과 카카오는 기본 브라우저에서 로그인하고 `rignin://auth/callback`으로 돌아온다. Android 앱과 같은 주소와 PKCE 흐름이다
  (`js/app-platform.js`가 `window.rigninDesktop`을 보면 앱으로 친다, 돌아온 주소는 `js/android-app-ui.js receiveOAuth`).
- 실행할 때 `rignin://` 연결을 그 exe로 등록한다. 창은 하나만 뜨고, 두 번째 실행은 받은 주소를 첫 창에 넘기고 끝난다.
- 서비스 워커와 새 배포 알림(`js/app-update-ui.js`)은 PC판에서 끈다. 갱신은 스팀이 한다.

## 아직 없는 것

스팀 SDK(업적, 오버레이, 스팀 클라우드), 맥과 리눅스 빌드(스팀 덱은 윈도우판을 Proton으로 돌린다), 코드 서명,
전용 아이콘(지금은 `assets/ui/pixel/rignin-logo-120.png`를 키운 것).

## 패키징 의존성 보안 확인 (2026-11-07)

`desktop/`에서 실행한 `npm audit --json --ignore-scripts`는 moderate 패키지 항목 5개, high/critical 0개다.
`@electron/asar` 4.3.1이 `glob ^13.0.2`와 `minimatch ^10.0.1`을 요구해, 각각 수정 버전 14.0.2와 11.0.1이 선언 범위 밖이다.
[glob 취소 후 탐색 지속 권고](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)와
[minimatch 패턴 증폭 권고](https://github.com/advisories/GHSA-g3hv-75wg-m249)는 PC 묶음 생성 경로의 전이 의존성에 해당한다.
현재 빌드는 로컬 코드·자산과 고정된 포장 옵션만 받으며, 플레이어 채팅·저장 데이터를 glob 패턴으로 받지 않는다.
게임 실행 파일에 이 개발용 패키지들을 포함하지 않는다(`desktop/build.cjs`가 만드는 stage의 package.json에는 런타임 의존성이 없다).

감사 도구가 제안하는 packager 20 → 18 강제 하향이나 범위를 넘긴 전이 의존성 치환은 적용하지 않았다.
상위 도구의 수정 의존성 채택을 2026-11-14 또는 다음 PC 배포 직전 중 빠른 시점에 다시 확인하고, 변경 시 실제 포장·기동을 검증한다.
이 기록은 웹 루트 잠금 파일의 감사 결과와 별개이며, 현재 게임 코드 전체의 안전성을 인증하는 결과가 아니다.
