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
