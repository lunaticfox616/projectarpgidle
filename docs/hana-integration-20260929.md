# Hana 캐릭터 · 스킬 이펙트 · 소환수 연결 (2026-09-28~29)

인계 자료: `리그닌_캐릭터_에셋킷_2026-09-28.zip`, `리그닌_캐릭터_스킬_인계_2026-09-29.zip`,
`리그닌_스킬이펙트_변경분_2026-09-29.zip`(3 흡혈 타격 · 18 불멸의 진동 · 38 원소 포션 투척 · 46 시간 가속).

> Hana Caraka 라이선스: 팀 내부용. 스프라이트가 든 파일을 공개 배포·재판매·배포용 도구에 넣거나 AI 학습에 쓰지 않는다.
> 코어 키퍼·세피리아 자료는 측정용으로만 썼고 픽셀을 옮기지 않았다.

## 한 도트 = 칸의 1/16

캐릭터·소환수·이펙트가 모두 같은 격자를 쓴다. 전장 한 칸(48 CSS px 기준)이 16도트, 도트 하나 = 칸/16.
탐험 화면은 칸을 48/64/80 px(×3/×4/×5)로 정수 확대하고, 휴대폰은 렌더 배율에서 도트가 캔버스 정수 픽셀이
되도록 칸 크기를 맞춘다(`js/canvas-act-exploration.js`, `uiDisplay.battleRenderScale`).

## 파일

| 파일 | 하는 일 |
|---|---|
| `scripts/import-hana-characters.cjs` | 킷 결과물 → `assets/playable/hana/<직업>/<모션>.png`, `assets/summon/hana/<시안>/`, `data/hana-sprites.js` |
| `scripts/import-hana-weapon-combos.cjs` | 시뮬레이터 HTML 안의 직업 × 무기 36조합 레이어 시트 → `assets/playable/hana/combos/<직업>/<무기>.png`, `data/hana-weapon-combos.js` |
| `scripts/import-hana-skill-fx.cjs` | 82색 팔레트·OKLab 색표·투사체 도안 → `data/hana-skill-fx.js`, 원본 JS를 `docs/skill-assets-hana/reference/` |
| `js/canvas-hana-actors.js` | 플레이어·소환수 시트 그리기(장치 픽셀 맞춤, 타격 프레임을 impactAt에 맞춤, 피격·흡혈 물들임) |
| `js/canvas-battle-units.js` | 전장의 플레이어 모습과 소환수 그리기(Hana → 없으면 기존 스트립) |
| `js/canvas-fx-remake.js` | 리메이크 패스: v3.38 이펙트를 전장 좌표 버퍼에 그린 뒤 3×3 블록마다 한 도트로 다시 찍음 |
| `js/canvas-redrawn-skill-art.js` | 인계 `void_fx.js` 17개 모듈을 규칙에 맞게 옮긴 것(그림만) |
| `js/canvas-redrawn-skill-fx.js` | 새로 그린 17젬을 실제 전투 이벤트에 연결(아래) |
| `js/canvas-act-title-card.js` | 액트·보스 제목 카드 |
| `js/dev-test-panel-ui.js` | `127.0.0.1/?dev=1` 전용 테스트 패널 |

## 무기별 캐릭터 (직업 × 무기 36조합)

- 시트: 79×79 칸에서 crop(62×53)만 잘라 둔 것. 열 = 레이어(무기_뒤·몸·무기_앞·빈손_뒤·빈손_앞) × 10프레임,
  행 = 모션(대기·달리기·공격·피격) × 방향(옆·아래·위). 왼쪽은 옆 행을 좌우 반전. 걷기는 달리기 주기를 씀.
- 드는 무기(`hanaActors.weaponFor`): **착용한 무기 아이템**이 정한다(스킬 젬과 무관). 이름·베이스의 낱말로 계열을 읽어
  활·궁·석궁·발사기 → 단궁, 대검·창·글레이브 → 대검, 검·송곳·도끼 → 곡도, 완드·봉·홀·지팡이·초점 → 시전 소품
  (직업 무기가 오브·향로·플라스크면 그것, 아니면 오브). 무기가 없거나 모르는 이름이면 직업 기본 무기.
  `settings.heroWeaponMode`: 'auto'(기본, 착용 무기) · 'class'(직업 기본) · 무기 slug(테스트 패널).
- 병을 던지는 젬은 놓는 프레임부터 빈손, 신성한 안개·파문심판의 향로 단계와 암살의 단검 단계는 무기를 숨김.
  그 향로는 이번 프레임에 그린 손 좌표(`hanaActors.handBoard`)에 매달린다.

## 새로 그린 이펙트가 전투에 붙는 방식

1. 월드트리 렌더러가 이벤트(windup/travel/stage/hit)를 그리기 직전 `redrawnSkillFx.claim(event, spec)`에 묻는다.
   새 그림이 그 이벤트를 대신하면(인계의 `customSkip`) true → 원래 스프라이트는 그리지 않는다.
2. 한 공격의 이벤트는 피해 묶음 id(`damageTextGroupId`의 앞부분)나 집중 id(`channelId`)로 하나의 "시전"이 된다.
   단계형 젬의 적중은 개별 스프라이트가 없어서 전투의 `hit` 기록(칸·시각·반복 번호)을 읽어 같은 시전에 넣는다.
3. 매 프레임 `drawLayer('ground')`(액터 아래)와 `drawLayer('fore')`(전경)가 시전마다 젬별 그리기 함수를 부른다.
   점은 리메이크 버퍼에 찍히고 `fxRemake.end()`가 한 번에 화면에 합성한다.
4. 캐릭터가 등을 보일 때(북쪽 공격)는 앞으로 나가는 그림이 이번 프레임 스프라이트의 불투명 픽셀 아래에서 지워진다
   (`hanaActors.drawnBody`). 몸을 감싸는 회오리바람·진동과 흡혈 피줄기는 예외.

그리기 쪽 타이머는 피해를 만들지 않는다. 모든 시각은 전투가 이미 정한 스냅샷을 읽기만 한다.

### 젬을 하나 더 새로 그리려면

`canvas-redrawn-skill-art.js`에 그림 모듈 추가 → `scripts/smoke-redrawn-skill-art.js`에 원본 대비 검사 추가 →
`canvas-redrawn-skill-fx.js`의 `IDS`·`REPLACED`(대신할 이벤트 종류)·`DRAWERS`(ground/fore)에 등록.

## 설정 키

| 키 | 값 | 기본 |
|---|---|---|
| `game.settings.heroSpriteSet` | `'hana'` · `'legacy'` | Hana |
| `game.settings.skillFxStyle` | `'remake'` · `'original'` | 리메이크 |
| `game.settings.heroWeaponMode` | `'auto'` · `'class'` · 무기 slug | auto |
| `game.settings.summonArtStyle` | `'glow'`(코어키퍼식) · `'dark'` · `'simple'` · `'cute'` | glow |

## 검증

- `npm test` — `smoke-hana-actors`(시트 규격·타격 프레임), `smoke-redrawn-skill-art`(원본과 도트 단위 동일),
  `smoke-redrawn-skill-fx`(대신하는 이벤트·시전 묶기·회전/물들임 시각), `smoke-story-quotes`.
- 눈으로 확인: 테스트 메뉴 1번 → 왼쪽 아래 `🧪 테스트` → 스킬 젬 장착 → 무적 · 배속.
- 성능(데스크톱 1440×900, `renderBattlefield` 평균): 원본 0.47~0.62ms → 리메이크 0.52~1.25ms(무거운 젬 ×4 배속).
