# UI 배율

PC에서는 `최종 CSS 배율 = 설정 uiScale / 100 / devicePixelRatio`를 사용한다.
같은 물리 픽셀 영역, 같은 게임 배율이면 Windows 100/125/150%에서 주요 UI 크기가 유지된다.
창이 작아져도 사용자 설정을 자동으로 바꾸지 않는다. 가용 공간이 부족하면 기존 반응형 배치와
스크롤을 사용한다. 스마트폰·태블릿의 높은 DPR은 Windows 배율이 아니므로 역보정하지 않는다.

브라우저는 OS 배율과 브라우저 줌을 합친 DPR을 제공한다. 웹판의 기준은 브라우저 줌 100%이며,
크기는 게임 설정에서 변경한다. 모니터의 물리적 크기(mm)까지 같게 만드는 기능은 아니다.
향후 Steam 셸에서 OS 배율 API를 제공하면 DPR 읽기 경계만 교체한다.

## 소유와 좌표

- `js/utils.js`: 저장된 사용자 배율 정규화(80, 90, 100, 110, 125, 150; 기본 100).
- `js/state.js`, `js/save-migrations.js`: `settings.uiScale`. 모니터 배율 자체는 저장하지 않는다.
- `js/ui-display.js`: 디스플레이 배율, 루트 CSS zoom, 논리 화면 기준 media query, 설정 이벤트.
- 기존 창 관리자는 논리 좌표로 위치를 저장한다. 포인터/getBoundingClientRect 값은 화면 좌표다.
  CSS left/top에 넣을 때는 최종 배율로 나눈다. 캔버스 클릭은 표시 사각형과 논리 크기의 비로 변환한다.
- 전투·패시브 캔버스는 논리 크기와 실제 표시 배율을 함께 써서 불필요한 이중 고해상도 버퍼를 피한다.

레거시 CSS가 사용하는 vw/vh와 media query도 같은 논리 화면을 봐야 한다. 어댑터는 최초 로드와
head에 스타일시트가 추가될 때 기존 CSSOM 선언을 변환하고, 원래 media query는 별도로 보관한다.
매 프레임 DOM을 순회하지 않으며 스타일 속성 변경도 관찰하지 않는다. authored cascade는 그대로다.
새 인라인 스타일의 viewport 단위는 `calc(95vw / var(--ui-display-factor, 1))`처럼 작성한다.
JS의 UI 너비 조건은 `uiDisplay.matches()`를 사용한다. 컨테이너 질의로 전체 이전하면 CSSOM 변환을 제거한다.

## 검증

- `tests/browser/ui-display.spec.js`: 동일 물리 영역의 DPR 1/1.25/1.5 비교, 설정 변경·저장 복원,
  모니터 변경, 캔버스 포인터, 창 이동, PC/모바일.
- `tests/browser/display-scaling.spec.js`: 작은 창, 기존 창 위치 복원, 다크/라이트.
- `npm test`, `npm run check:architecture`.

CSS 테두리와 네이티브 컨트롤의 소수점 픽셀 반올림은 허용한다. 게임 UI 설정은 보존하며,
테스트를 위해 사용자의 실제 저장이나 Windows 디스플레이 설정을 변경하지 않는다.
