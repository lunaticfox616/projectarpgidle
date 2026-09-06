# 로그인 화면 자산 · 2026-09-07

로그인 표현은 `css/startup.css`가 소유한다. 게임 테마와 무관하게 같은 녹색·금색 시작 화면을 사용한다.
인증 처리, 저장 선택, 회원가입 동의, 계정 연결 화면은 기존 구현을 유지한다.

## 배경

- 파일: `assets/ui/login-world-tree.webp` (1672×941, 약 187 KiB).
- 제작: 내장 imagegen, 새 이미지 생성. 원본은 Codex generated_images에 보관.
- 납품 변환: 생성 PNG를 Sharp로 WebP quality 90 인코딩. 그림·색상·구도는 변경하지 않음.
- 프롬프트:

> Use case: stylized-concept. Asset type: production full-screen background for the title/login screen of RIGNIN, a dark fantasy idle ARPG about an ancient world tree, roots and recurring journeys. Create one beautiful premium hand-painted game environment, wide 16:9 composition, 2560x1440 if possible. A vast weathered world tree grows around an ancient abandoned sanctuary, seen from a stone terrace, twisting roots and moss-clad steps leading toward a small warm golden light deep among the roots, distant desaturated jade forest and mist. Monumental but quiet, melancholy, refined art direction, tactile brushwork, carefully composed large shapes rather than excessive tiny details. The tree and architectural focal point occupy the central-left area around x42%, with soft atmospheric light entering from the upper left. The leftmost upper quarter must be subdued to accommodate a readable gold game wordmark, and the rightmost 35 percent must be dark, low-detail deep green-black shadow to accommodate a login panel; no panel or UI drawn into the image. Dark charcoal, muted forest green, aged bronze highlights and ivory mist. Not a glowing circular portal. No characters, no people, no weapons, no text, no letters, no symbols, no logo, no watermark, no border, no interface. Full bleed environment painting, crisp and rich but not photoreal, no purple/blue neon, no excessive bloom or particles. Intended result is a new usable background asset, not a UI mockup.

## 공식 소셜 로그인 자료

확인일: 2026-09-07. 두 컨테이너는 같은 폭·44 CSS px 높이로 표시한다. 인증 SDK는 변경하지 않는다.

### Google

- [공식 디자인 가이드](https://developers.google.com/identity/branding-guidelines)
- 심볼: [공식 G 원본](https://developers.google.com/static/identity/images/g-logo.png) → `assets/ui/login-google-mark.png`.
- [공식 사전 승인 버튼 ZIP](https://developers.google.com/static/identity/images/signin-assets.zip)도 비교 확인했으며 다운로드 원본은 로컬 artifacts에 보관한다.
- 가이드의 custom button 방식을 사용: 흰색 #FFFFFF, 테두리 #747775 1px, 글자 #1F1F1F, Google Sans Medium 14/20, 표준 컬러 G, 심볼 뒤 10px 간격. 문구는 Sign in with Google.
- G는 20×20 영역에서 object-fit:contain으로 원본 비율을 보존한다. 다른 제공자보다 작게 표시하지 않는다.
- 글꼴은 [Google Fonts CSS](https://fonts.googleapis.com/css2?family=Google+Sans:wght@500&text=Sign%20in%20with%20Google&display=swap)가 반환한 문구 전용 TTF를 `assets/fonts/GoogleSans-Medium.ttf`에 보관한다. 로그인 버튼에만 적용한다. 문구를 바꿀 때는 같은 공식 API에서 해당 글자를 포함한 폰트를 다시 받아야 한다.
- [공식 저장소 OFL](https://raw.githubusercontent.com/googlefonts/googlesans/main/OFL.txt) → `assets/fonts/GoogleSans-OFL.txt`.

### Kakao

- [공식 디자인 가이드](https://developers.kakao.com/docs/ko/kakaologin/design-guide), [공식 다운로드 페이지](https://developers.kakao.com/tool/resource/login).
- [완성형·한국어·큰 사이즈·좁은 폭 PNG](https://developers.kakao.com/tool/resource/static/img/button/login/full/ko/kakao_login_large_narrow.png) → `assets/ui/login-kakao.png` (366×90).
- 공식 PNG 자체는 수정하지 않는다. 44px 높이에 비례 축소하고 #FEE500 컨테이너의 좌우만 동일하게 확장한다. 심볼·레이블 비율과 색상을 유지한다.
- 둥근 정도는 원본 12px를 표시 배율에 맞춘 약 6px. Google 사각형은 4px로 각 제공자의 형태를 존중한다.

PC·모바일 및 게임의 다크·라이트 설정에서 배치, 이미지 로드, 회원가입 동의/로그인 복귀, 게스트 시작을 검증한다.
OAuth 제공자 연결은 외부 서비스 경계를 테스트 응답으로 대체하므로 실제 계정 로그인 성공을 검증했다고 간주하지 않는다.

## 게임 소개 팝업

`js/startup-ui.js`는 로그인 소개 버튼의 DOM 이벤트와 native dialog, 영상 수명만 담당한다. 게임 상태나 저장을 변경하지 않는다.
`assets/ui/gameplay-intro.webm`은 Playwright로 실제 전투 화면을 녹화하고 몬스터 처치와 레벨업이 포함된 2초 구간을 VP8 무음 영상으로 인코딩한 것이다. 새 액트 1 배경과 하단 생명력 HUD를 함께 담는다. `gameplay-intro.webp`은 같은 녹화의 레벨업 프레임이다.
별도의 브라우저 컨텍스트에서 새 비술사를 시작하고 기존 `grantLoopStarterGemOnFirstKill`/`changeSkill`로 해당 직업의 시작 젬을 먼저 장착한 예시다.
예시 캐릭터의 경험치는 다음 레벨까지 1 남도록 준비했다. 레벨업 자체를 강제로 호출하지 않고 실제 몬스터 처치 보상으로 발생시킨다.
적 생성·공격 주기·판정·대미지·렌더링은 게임 구현 그대로이며 사용자 저장은 사용하지 않았다.
첫 클릭에만 미디어 경로를 지정하며 닫기·Escape 시 정지하고 처음으로 되돌린다. 동영상 플레이어 컨트롤은 숨긴다. 동작 줄이기 설정에서는 레벨업 정지 이미지를 표시하며, 자동재생 제한 시에도 정지 이미지로 안내한다.

끊김 피드백 후 녹화 중 스크린샷 촬영을 제거하고 다시 녹화했다. 포스터는 완성된 영상에서 추출한다. 파일 URL의 버전을 변경해 이전 영상 캐시를 갱신한다. 로컬 Chromium 재생 검사에서 150프레임 중 드롭은 0이었으나, 실제 사용자 환경의 체감 끊김 원인은 확정하지 않았다.
