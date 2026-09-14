# 세계수 탐험 — 첫 권역

엔드게임을 하나의 탐험 목표로 연결하는 첫 구현이다. `지도 → 탐험 → 세계수 탐험`에서
혼돈 수호자를 목적지로 고르면 연결된 길을 실제 전투로 진행한다. 기존 콘텐츠 화면은 유지한다.

- 혼돈의 입구 → 숲길 또는 균열길 → 회랑 → 수호자. 전투 지역 5개, 심도 3단계.
- 숲길 첫 완료 시 벌집 거점 발견 및 정지. 거점은 기존 벌집 준비 화면을 열며 입장권과
  갈림길 선택, 여왕전은 기존 규칙을 따른다. 숲길에도 기존 혼돈 사냥의 양봉·열쇠 드랍을 적용한다.
- 균열길은 기존 공허 증원 9마리와 균열 완료 보상을 사용한다. 대균열 발견은 유지하되
  탐험 도중 강제 자동 진입하지 않는다.
- 수호자 처치는 다음 심도를 열고 정지한다. 재사냥 가능. 고유 보상은 기존 혼돈계 보스
  전용 드랍 경로를 사용하며 확정 보상을 추가하지 않는다.
- 혼돈계와 같은 입장 조건: 루프 10 이상, 혼돈계 해금, 이번 루프 혼돈 20 클리어.
- 혼돈계 1~15층에 대응하는 기존 난이도를 사용한다. 기존 혼돈계 층 돌파 보너스를 중복 지급하지 않는다.

## 상태와 경계

정의는 `data/world-tree-journey.js`, 상태 기본값·지역 생성은 `js/state.js`, 지도 기록과 경로는
`js/world-tree-journey.js`, 전투 연결은 `js/combat.js`, 화면은 `js/world-tree-journey-ui.js`가 소유한다.
새 스크립트 순서는 index.html과 공용 테스트 런타임에 함께 등록했다. 새 공개 전역은 인라인
버튼의 UI 어댑터 `worldTreeJourneyUi` 하나다.

`worldTreeJourney.cleared`는 `심도:지역ID` 목록이며 `hiveDiscovered`와 함께 영구 유지한다.
`active`는 `{id, stage}` 또는 null, `queue`는 남은 지역 ID 배열이다. 실패·귀환·루프 전환은
진행 중 탐험만 종료한다. 새 루프의 혼돈 입장 조건은 다시 충족해야 한다.
저장 복원은 정의된 ID와 단계만 인정하며 선택 경로와 완료 후 정지 예약을 보존한다.
유효한 진행 기록 없는 탐험 전투는 자동 재개하지 않는다. 발견 대기 시 방치 재생도 정지한다.

지도는 상태 변화 시 DOM을 갱신하며 상시 애니메이션이나 새 게임 타이머를 추가하지 않는다.
기존 지도 전투력 계산을 재사용한다. 창 너비에 따른 컨테이너 배치와 모바일 노드 범위를 검사한다.

## 체험 및 검증

`/artifacts/world-tree-journey/index.html`은 실제 전투 코드를 사용하는 격리된 체험 페이지다.
메모리 저장소·네트워크 차단과 진행 확인용 강화 장비를 사용한다. 실제 계정/저장을 바꾸지 않는다.
처음부터, 발견한 지도, 전투 1/4배, 실패 체험, 전투/지도 보기 버튼을 제공한다.

- `node scripts/smoke-world-tree-journey.js`: 입장 차단, 경로, 발견 정지, 중복 완료,
  심도 제한, 저장 복원, 패배·귀환·루프, 숲길 열쇠 드랍.
- `npx playwright test tests/browser/world-tree-journey.spec.js --workers=1`: PC/모바일
  실제 공격으로 탐험 완료, 균열 정리, 실패·재도전, 벌집 화면 연결, 노드 가림·이탈 검사.
- 전체 `npm test`, `npm run check:architecture`를 함께 실행한다.

검증 결과: 전체 스모크 189/189, 브라우저 PC·모바일 2/2, 구조·린트 래칫 통과.
수동 시연에서도 숲길 전투 후 벌집 발견 시 멈추고 지도에 거점이 나타나는 것을 확인했다.

모든 계를 이 구조로 이전한 것은 아니다. 첫 권역에서 탐험과 파밍 흐름을 직접 평가한 뒤
지하계·심해·창공·우주계의 고유 거점과 최종 목적지를 확장할 기반이다.
강화 캐릭터 테스트는 기능 검증이며, 실전 난이도와 시간당 보상·재미 검증을 대신하지 않는다.

## 아이콘 없는 지도 개선

원형 노드·지형 아이콘·완료 체크 표시를 제거했다. 숲·뿌리 균열·회랑·수호자의 둥지가 하나의
지형 삽화로 이어지고, 해당 위치의 지역 이름을 직접 누른다. 선택 경로는 금색, 완료한 길은
녹색으로 구분하며 탐험 완료와 전투 중 상태는 짧은 텍스트로 표시한다.

세계수 탐험에서는 보조 사냥터 목록을 접어 지도 너비를 확보했다. 상단 `사냥터 목록`으로 나가면
기존 목록을 그대로 사용한다. 모바일 목적지 선택으로도 왕복할 수 있다. 지도 상단 메뉴의
이모지와 창 제목의 장식도 제거했다. 기본 창 닫기·크기 조절 버튼은 유지한다.

목적지·보상·화력/생존력과 경로 선택·탐험 버튼은 지도 바로 아래에 모았다. 숲길의 거점을 이미
발견했다면 `벌집 발견` 대신 `벌집 재료`를 보여준다. 경로 선택은 의미가 있는 목적지에만
표시하고 탐험 중에는 변경할 수 없다. 버튼 재렌더링 시 키보드 포커스를 보존한다.
모바일에서는 경로 선택과 출발 버튼을 한 줄에 두고 지도 높이를 줄여 제목부터 행동까지 읽게 했다.

이번 표현 변경은 난이도·보상·저장 shape·해금 비용을 변경하지 않는다. 기존 UI 어댑터와 CSS,
지역 좌표만 수정하며 스크립트 순서·공개 전역은 유지한다. 추가 자산은 WebP 한 장 311,126바이트다.
상시 애니메이션·새 타이머·프레임별 캔버스 렌더링은 추가하지 않는다. 이미지에는 기존 지도 이미지
숨김 규칙을 덮는 좁은 예외를 두었으며 브라우저 검사에서 실제 표시와 디코딩 성공을 확인한다.

### 시각 평가

아래는 UI를 직접 보고 매긴 주관적인 설계 평가다. 게임 전체의 완성도나 실제 플레이어 재미 점수가 아니다.

| 평가 기준 | 이전 | 수정 후 | 근거와 남은 한계 |
| --- | ---: | ---: | --- |
| 목적지의 매력 | 10/20 | 18/20 | 하나의 지형과 수호자 둥지가 보인다. 다른 권역의 고유 지형은 아직 없다. |
| 선택의 의미 | 11/20 | 16/20 | 숲길·균열길의 보상 차이와 실제 이동 경로가 연결된다. 경로 구성은 아직 5개 지역이다. |
| 가독성 | 12/20 | 17/20 | 아이콘 해석 없이 이름과 역할을 읽는다. 작은 화면에서는 긴 지명이 두 줄이 된다. |
| 공간 활용 | 10/20 | 18/20 | 보조 목록을 접고 아래 정보와 조작을 통합했다. 가로·세로 비율별 삽화 왜곡은 남는다. |
| 조작과 상태 전달 | 12/20 | 17/20 | PC·모바일 목록 왕복, 경로 선택, 발견·패배·재도전을 검사했다. 실사용자 검증은 필요하다. |
| 합계 | **55/100** | **86/100** | 첫 권역 UI 평가이며 실제 난이도와 파밍 지속성은 별도 검증 대상이다. |

PC 1440×900, 중간 창 900×740, 모바일 Pixel 5에서 초기·거점 발견·심도 완료 화면을 확인했다.
검사 결과: 전체 스모크 189/189, 세계수 브라우저 검사 2/2. 브라우저 검사는 지도 자산 표시,
아이콘 없는 지역 버튼, 목록 왕복, 포커스, 실제 경로별 전투, 실패 후 기록 보존까지 포함한다.

### 지도 삽화 출처

내장 이미지 생성 도구를 사용했다(CLI/API 스크립트 미사용). 프로젝트 적용 파일:
`assets/maps/chaos-roots.webp` (1536×1024). 원본 생성 PNG는 Codex generated_images에 보존하고
게임 파일만 WebP quality 87로 변환했다.

생성 프롬프트:

```text
Use case: stylized-concept. Asset type: production background for a premium dark fantasy exploration map in the game RIGNIN. Create ONE wide landscape illustration, 1536x1024 or wider, seen from high above at a shallow isometric angle. A single continuous landscape beneath the roots of an ancient world tree, painted as a restrained, exquisite atmospheric atlas plate: fine engraved bark lines, softly painted moss, stone and muted mist; tactile, crisp, deliberate visual hierarchy, no photo realism. Deep charcoal green, muted sage, tarnished bronze, small amber sap accents. Composition designed for selectable text labels added later: an entrance valley around x14% y57%; a quiet luminous moss-and-sap grove around x36% y32%; a dark cleft in the roots with subtle cold violet depth around x36% y76%; woven monumental roots forming a pass around x61% y54%; a memorable guardian sanctuary naturally formed INSIDE a huge hollow root, with tall elegant ribbed root architecture and a small warm light, around x84% y32%. Root trails connect these geographic places organically; readable land forms, each area's silhouette distinct, serene negative space around them for UI labels. The guardian destination should draw the eye, not dominate the entire picture. The map occupies the full canvas; fade outer margins into charcoal green atmosphere. Top-left area quiet for small UI title. Medium dark values, subtle depth and illumination, never murky or scary, avoid tiny noise. This is a real continuous terrain illustration, NOT a diagram or a collection of icons. STRICTLY no icons, glyphs, emblems, map pins, nodes, badges, circles, buttons, UI, labels, letters, text, logos, borders, compass roses, dashed route lines, characters, gore, skulls, or tentacles.
```
