# 장비 선택창·공통 확인창 겹침 수정

## 원인과 적용

장비 검사창은 `popover="manual"`의 브라우저 top layer를 사용하지만,
반지·장갑·무기 선택창과 베이스 업그레이드, 공통 확인창은 일반 DOM overlay였다.
일반 overlay의 z-index를 높여도 기존 장비 검사창 위로 올라오지 않았다.

- 네 장비 관련 창과 `requestGameDialog`를 native `dialog.showModal()`로 통일한다.
- 새 modal이 입력·포커스를 소유하고 이전 창은 유지한다. 기존 확인 요청 대기열은 순서를 유지한다.
- 장비 검사창의 비동기 비교·resize 갱신은 modal 위로 검사창을 재오픈하지 않는다.
- Esc는 native cancel로 현재 modal만 취소한다. 장비창·모바일 메뉴·창 관리자의 전역 키 처리는 modal에 양보한다.
- Android 뒤로가기는 포커스된 dialog의 cancel을 전달해 취소 처리와 대기열을 보존한다.
- CSS 소유자는 `css/ui-feedback.css`: 공통 금색 테두리, 테마 토큰, 서체, 버튼과 본문 스크롤.
  작은 화면에서도 제목·행동 버튼은 유지하고 본문만 스크롤한다.
- 입력 오류는 modal 본문에 표시한다. 낮은 화면에서 오류 위치까지 스크롤한다.

저장 shape, 장비 능력치·장착 조건, 보상 계산은 변경하지 않는다.
기존 튜토리얼/전투 알림을 전부 입력 차단 modal로 바꾸지는 않는다.
새 파일의 프로덕션 로드나 새 전역 공개 API도 없다.

## 검증

- `tests/browser/popup-layering.spec.js`: 908×480 PC, 모바일, 200% 배율,
  반지 선택·실제 장착·취소 후 선택 보존, 열기 순서를 뒤집은 modal 중첩,
  다크/라이트, 입력 오류, 확인 요청 대기열, Enter 취소, native close.
- `tests/browser/mobile-menu-focus.spec.js`: 확인창의 Esc가 뒤의 전체 메뉴까지 닫지 않는지 검사.
- `tests/browser/core-ui.spec.js`의 custom dialog focus 복귀 검사.
- 전체 스모크: `npm test`.
- 구조 검사: `npm run check:architecture`.

브라우저 검증은 Chromium PC/모바일 에뮬레이션이다. 실제 Android 기기 뒤로가기 버튼은 별도 확인 필요.
