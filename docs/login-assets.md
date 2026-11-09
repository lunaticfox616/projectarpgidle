# 로그인 화면 자산 · 2026-09-07

로그인 표현은 `css/startup.css`가 소유하고, 도트 UI(`css/themes/pixel.css`)의 돌판·청동 도트 테를 얹는다.
인증 처리, 저장 선택, 회원가입 동의, 계정 연결 화면은 기존 구현을 유지한다.

## 배경

- 2026-10-21: `assets/background/title-worldtree-v1.webp`(GPT가 그린 성소 터의 세계수, 16:9 1672×941, 원본 PNG를 WebP 품질 86으로
  옮겼다)를 화면을 덮게(`center / cover`) 깔고 가장자리와 위아래를 어둡게 덮는다. `index.html`이 미리 받는다. 그림은 로고(왼쪽 위),
  로그인 판(오른쪽), 저장 요약(왼쪽 아래) 자리를 어둡게 비워 두었다. 원본, 그림 요청문, 장면 메모는 로컬 `artifacts/title-worldtree-20261021/`
  (저장소에 넣지 않는다, 원본 sha256 855e57e9…).
- 검수(같은 날): 글자, 워터마크, 나무의 얼굴 같은 결함 없음. 목질은 탁한 백색, 잎은 금빛과 황동빛으로 세계수 색 결정과 맞고 초록은
  0.5%다. 로고 자리 뒤는 하늘이 밝지만(평균 밝기 103/255) 로고 판이 덮고 위쪽 어둠이 눌러 준다.
- 그 전(2026-09-29~10-21)의 `assets/background/act1.png`(예전 전장의 판 그림, 512×512)는 무대로 바뀐 뒤 예전 전투로 보여 뺐다(사용자 요청).
- 이전 배경 `assets/ui/login-world-tree.webp`(손그림 세계수)는 도트 UI와 결이 달라 뺐다(깃 기록에 남아 있음).

- 2026-11-05: 금빛 나뭇잎 `assets/ui/title-leaves.png`(`scripts/build-title-leaves.cjs`가 만든다, 15도트 칸 12개 × 잎 두 종류)이
  배경 위, 판들 뒤에서 흩날린다. 색은 배경 세계수 잎의 금빛에서 골랐다. 움직임과 그 비용은 [로그인 대기](login-loading-resources.md).

## 화면 구성

- 화면 가운데의 한 판(`.startup-entry`, 2026-11-05 사용자 요청으로 따로 있던 로고 판과 로그인 판을 합쳤다): 위에 도트 로고, 아래에 로그인 판.
  다른 탭 대기 판도 이 안에서 로그인 판 자리에 선다. 로고 크기는 도트 하나가 기기 화소의 정수배가 되게 `js/ui-game-shell.js`가 준다.
  낮은 화면(높이 600px 이하, 가로 휴대폰)에서는 로고가 "로그인" 제목 옆의 작은 표시가 되어 게스트 단추가 첫 화면에 든다.
- 이 기기 저장 요약(패치노트 링크 포함)은 왼쪽 아래, 세로 휴대폰에서는 판 아래.
- 로그인 판: 이메일·비밀번호(칸 이름은 화면 읽기용으로만) → 로그인 · 회원가입 → 게스트로 시작(한 줄 경고) → 접힌 "소셜 로그인" → 약관 링크.
- 상태 줄(#startup-status)은 오류·진행 결과가 있을 때만 보인다. 가만히 있을 때의 안내("로그인하면 …")는 적지 않는다(js/startup-screen-ui.js `getStartupStatusText`).

## 공식 소셜 로그인 자료

확인일: 2026-09-07. 두 컨테이너는 같은 폭·44 CSS px 높이로 표시한다. 인증 SDK는 변경하지 않는다.
2026-09-29부터 두 버튼은 접어 둔 "소셜 로그인"(`<details id="startup-social-login">`) 안에 있다. 버튼 모양·글꼴·공식 그림은 그대로다.

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

## 게임 소개 팝업(삭제)

"잠깐, RIGNIN은 어떤 게임인가요?" 링크와 영상 대화상자(`js/startup-ui.js`, `assets/ui/gameplay-intro.*`)는 2026-09-29에 뺐다.
