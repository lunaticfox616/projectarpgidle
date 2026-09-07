# Android 시험판

대상: 사용자의 Galaxy S24+, Android 16. 게임 파일을 포함한 Capacitor APK이며 웹 패치가
자동으로 반영되지 않는다. 이번 APK는 개인 설치·검증용으로, 스토어 출시 빌드가 아니다.
웹과 앱은 같은 도메인 코드·저장 형식을 사용한다. 앱의 로컬 저장소는 웹 브라우저와 별개다.

## 설치 및 업데이트

- 최신 산출물: `artifacts/android/RIGNIN-android16-test.3.apk`, 옆의 SHA-256 파일로 무결성 확인.
- 휴대폰으로 APK를 옮긴 후 파일 앱에서 열어 설치한다. 요청되는 경우 해당 파일 앱의
  '출처를 알 수 없는 앱 설치'를 허용한다.
- 같은 서명으로 만든 후속 APK는 덮어 설치한다. 삭제 후 재설치하면 게스트 저장이 사라진다.
- 패키지 ID: `com.rignin.game`, 테스트 버전 `0.2.0-test.3` (versionCode 3), target/compile SDK 36, min SDK 24.
- 디버그 서명 시험판이다. 배포용 서명 키와 스토어 정책 검토는 별도 작업이다.

## 앱 연결과 미검증 영역

test.3에는 정산 가속·즉시 종료, 가지치기 독립 메뉴, 지하계·심해·낚시 테마 정리와 우주계 목적지
목록 중심의 탐사 화면이 포함된다. 지도는 펼쳐볼 수 있고 탐사·성도술·우주석의 기존 규칙을 사용한다.
기본 방치 효율은 유지하며, 사용자가 가속·종료를 선택한 경우에만 남은 시간과 보상 기회를 포기한다.

test.2는 기존 APK와 동일한 인증서로 서명했다. 삭제 없이 덮어 설치한다. 상시 전투의 툴팁 계산을
제거하고 모바일 전장은 약 30fps·캔버스 최대 1.5배로 제한했다. 메뉴·폰트 해상도는 유지한다.
Android 비활성 이벤트만 먼저 도착해도 전투와 PiP 렌더를 멈추고, 진행 중인 정산도 쉬었다가
복귀 시 재개한다. 실제 S24+의 발열 감소량은 아직 측정하지 못했다.

- Google/카카오 인증은 시스템 브라우저(Custom Tab)에서 진행한다. WebView 내부 OAuth를 사용하지 않는다.
- PKCE 인증 코드가 `rignin://auth/callback`으로 돌아오면 앱의 기존 클라우드 세션 경계에서 복원한다.
- **Supabase Authentication → URL Configuration → Redirect URLs에
  `rignin://auth/callback` 등록이 필요하다.** 현재 작업에는 서버 관리 권한이 없어 등록 여부를
  확인하거나 변경하지 않았다. 실제 계정으로 소셜 로그인·계정 연결의 왕복 인증은 아직 미검증이다.
  자동 검사는 시스템 브라우저 호출, 리디렉션 설정, 취소와 무관한 딥링크 거부를 확인한다.
- 거래·채팅·PvP 등 계정이 필요한 기능은 기존 로그인 게이트를 유지한다. 실제 다중 계정 거래와
  서버 장애·충돌 상황의 실서비스 검증을 완료했다고 간주하지 않는다.
- S24+ 실물의 발열·배터리·장시간 FPS, 삼성 키보드와 One UI 설정별 차이는 사용자가 설치한 뒤
  확인해야 한다. 데스크톱 모바일 브라우저와 Android 16 에뮬레이터는 실제 S24+ 성능 측정이 아니다.
- 초기 방치 정산 기준 60초와 기존 효율을 유지한다. 앱 밖에서 렌더링을 계속 돌리지 않는다.

## 구현 경계

- `scripts/build-mobile-web.js`: Git이 관리하는 런타임 파일과 이용약관, 고정 버전 Supabase SDK를
  `www/`에 복사한다. classic script 순서를 보존하고 시안·테스트·원본 이미지 백업을 제외한다.
- APK에서는 서비스 워커를 등록하지 않는다. APK 갱신과 웹 캐시 버전이 충돌하지 않도록 한다.
- `js/app-platform.js`가 UI를 참조하지 않는 SDK 경계이고, `js/android-app-ui.js`가 앱 이벤트와
  기존 UI·저장을 연결한다. UI에서 이 이벤트 조립 모듈을 역으로 호출하지 않는다.
  전투 규칙과 저장 shape는 변경하지 않는다.
- Activity에서 시스템 바·카메라 구멍 여백을 한 번 적용하여 고정 모달과 하단 메뉴까지 같은 영역을 쓴다.
- 모바일 장비 관리 패널 접기, 스크롤/배치 모드 구분, 지도 메뉴 너비 수정은 웹 모바일에도 적용된다.
- 기능 해금·보상·난이도·재화 밸런스는 변경하지 않는다.

## 재빌드

Node 22 이상, JDK 21, Android SDK platform 36 및 build-tools 36.0.0이 필요하다.
JDK/SDK를 표준 위치에 설치했다면 환경 변수 `JAVA_HOME`, `ANDROID_HOME`을 지정한다.
이 작업의 휴대용 도구는 Git에서 제외한 `artifacts/android-toolchain/`에 있다.

```powershell
npm ci
npm run android:sync
./android/gradlew.bat -p android :app:assembleDebug
```

결과는 `android/app/build/outputs/apk/debug/app-debug.apk`다. 디버그 키를 유지해야 기존 설치 위에
업데이트할 수 있다. 키 파일을 저장소에 커밋하지 않는다. 새 버전을 배포할 때 `versionCode`를 올린다.

샌드박스 실행 계정의 기본 디버그 키는 최초 설치본의 키와 다를 수 있다. test.2는 최초 빌드에
사용한 `C:/Users/pjh46/.android/debug.keystore`로 `apksigner sign --ks`를 실행해 최종 APK를
다시 서명했다. 다음 빌드도 이 키를 유지하고 `apksigner verify --print-certs`로 기존 APK와
인증서 SHA-256이 같은지 확인한 뒤 전달한다. 현재 인증서 지문은
`93d1645e7d7332a1e8c0d0097d041102557cfd23b5eeaa22623c40387e1d5b4e`다.
서명이 다른 APK를 설치하려고 기존 앱을 삭제하지 않는다.

## 검증 범위

| 영역 | 검사 |
| --- | --- |
| 기존 모바일 흐름 | 시작·장비·젬·해금·패시브·거래소·플라스크·지도·전투·채팅 UI 등의 브라우저 회귀 |
| S24+에 가까운 논리 해상도 | 412 CSS px 폭에서 실제 터치 스크롤·장착, 배치 모드, 전체 해금 탭 진입 |
| 스킬트리 | 손가락 이동·두 손가락 확대가 포인트를 소모하지 않음 |
| Android 플랫폼 | API 36 WebView에 APK 설치, 실제 전투·뒤로가기·홈 전환·60초 초과 복귀 정산 |
| 저장/도메인 | 전체 Node 스모크, 기존 중복 정산·저장 실패 회귀 포함 |
| 패키징 | 로컬 SDK/자산, 서명 검증, 버전/권한/ABI 확인; 런타임 외부 CDN 의존 제거 |

```powershell
npm test
npm run check:architecture
npx playwright test --project=mobile-chromium
npx playwright test tests/browser/inventory-density.spec.js tests/browser/login-presentation.spec.js --project=desktop-chromium
# 실행 중인 일회용 에뮬레이터만 대상으로 한다. 실제 휴대폰에 테스트 상태를 쓰지 않는다.
node scripts/check-android-device.js
```

검사 로그·화면은 `artifacts/android-mobile-audit/`, `artifacts/android-device-review/`에 보관한다.
Android 화면은 `adb screencap`으로 확인한다. WebView의 CDP 캡처에는 가속 캔버스 표면이 빠질 수 있다.
각 실제 계정 기능의 미검증 상태와 사용자가 수행할 실물 확인을 위의 앱 연결 항목과 함께 판단한다.

2026-09-07 검증 결과: 모바일 회귀 118개 통과(실패 항목 수정 후 재검사 포함), PC 전용 등 10개
제외. 별도 PC/모바일 변경 흐름 15개와 플랫폼 연결 최종 검사 9개 통과. 전체 스모크 172개,
구조 검사, npm 의존성 감사(취약점 0건) 통과. Android 16 에뮬레이터에서 전투·뒤로가기·홈 전환 후
1분 3초의 방치 시간을 기존 효율에 따른 6초 전투로 정산하는 것을 확인했다.

test.2 추가 검증: 전체 스모크 174개, 구조 검사, 모바일 플랫폼·로그인 브라우저 검사 10개,
데스크톱 회귀 3개 통과. APK 서명·정렬·버전과 변경된 런타임 자산 포함을 확인했다.
이번 수정본은 실기기 및 에뮬레이터에 새로 설치해 검증하지 않았다.

test.3 추가 검증: 전체 스모크 175개, 구조 검사, PC·모바일 관련 브라우저 흐름 18개 통과.
기존 인증서 일치, versionCode 3, APK 정렬과 변경된 런타임 자산 11개의 원본 일치를 확인했다.
실기기 설치 및 발열 검증은 별도다.

참고: [Capacitor Android](https://capacitorjs.com/docs/android),
[App 플러그인](https://capacitorjs.com/docs/apis/app),
[Google OAuth 정책](https://developers.google.com/identity/protocols/oauth2/policies).
