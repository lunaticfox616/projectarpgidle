# LIGNIN(리그닌) — 보안 강화 비동기 하이브리드 중앙 경매장 확정 설계안 (루프 20+)

> **상태: 보안 보강 확정 시안 (실제 게임 런타임 미반영 · 구현 대기)**
> 기준일: 2026-11-21 (`origin/main` `34e96be` 기준)
> 인터랙티브 프리뷰: [`artifacts/auction-house/preview.html`](../artifacts/auction-house/preview.html)

---

## 1. 왜 일반 MMO식 경매장은 위험한가 — 보안 현실 직시

이 게임은 전투·드랍·제작·저장이 브라우저 클라이언트에서 실행되고 `cloud_saves` JSON으로 동기화되는 **클라이언트 실행 구조**입니다.
이 구조에서 **유저↔유저 직접 거래(P2P), 자유 가격 설정, 재화 송금**을 여는 순간 아래 3가지 치명적 구멍이 생깁니다(기존 `player_trade_listings`를 [`db/equipment-hall.sql`](../db/equipment-hall.sql)에서 폐기하고 `장비 전당`으로 전환한 이유와 동일).

1. **합법 수치 극옵 에디트 저가 살포**: [`hall_affix_table`](../db/hall-watch-20261030.sql)은 불법 범위(`+99999%`)는 막지만, 치터가 로컬에서 합법 범위 내 100% 종결 T20 장비를 만들어 `10 이슬`에 뿌리면 전 서버 진행이 하루 만에 붕괴한다.
2. **부계정 밀어주기 / RMT / 황금률 세탁**: 자유 가격 P2P 거래는 부계정 간 재화 이동 통로가 된다.
3. **재료 단타 / 기기 시계 조작 무한 증식**: 매수가보다 높은 매도가 구간이 조금이라도 열려 있으면(예: 저점 `0.78x` 매수 → 고점 `1.28x` 매도), 전투 없이 시세 차익이나 시계 조작만으로 재화가 지수적으로 무한 증식한다.

따라서 본 설계는 **일반 P2P 경매장을 포기**하고, 현재 운영 중인 **장비 전당과 동급(또는 그 이상)의 보안선 안에서만 “살아있는 중앙 거래소”를 구현하는 하드 제약**을 적용합니다.

---

## 2. 핵심 확정 방향 (5대 불변 계약)

1. **위치 · 해금**: 거래 창(`tab-trade`, [`modules/ui/market-view.mjs`](../modules/ui/market-view.mjs)) 4번째 탭 **「경매장」**, **루프 20+ 해금 노드**.
   - 기존 탭 역할 분리: `NPC`(암거래·베일라) / `나의 가판대`(초반 4칸 흥정) / `장비 전당`(명예 복제 전시) / **`경매장`(엔드게임 중앙 즉시 거래소)**.
2. **입찰·낙찰 대기 없음 (100% 즉시 체결)**:
   - 메이플·로아·PoE식 중앙 거래소. 입찰전·마감 연장·에스크로 환불을 두지 않아 UX 스트레스와 **1초 타이머 CPU 부하를 동시에 제거**합니다.
3. **P2P 재화 송금 0% · 자유 저가 덤핑 0%**:
   - **다른 유저에게 노출되는 유저 출품 스냅샷**: [`db/equipment-hall.sql`](../db/equipment-hall.sql)과 동일하게 **서버 감정가(`quote_hall_item`)로 가격을 강제 고정**합니다. 구매자가 지불한 재화는 서버로 **소각**되며, 출품자는 재화가 아닌 **명예(Honor)**만 얻습니다.
   - **내 출품(3칸)**: 지정가 등록 후 **오직 본인의 싱글 NPC 수요에게만** 지연 정산됩니다(타 유저에게 덤핑 불가, 수익은 서버 감정가 밴드·버킷 상한 내 제한).
4. **재료 거래소 수학적 무차익 밴드 + 버킷 쿼터 강제**:
   - 시세 배율 하드 클램프: **`0.85x ~ 1.15x`** (시장 사건 포함).
   - **즉시 매수**: `기준가 × 1.15 × 시세` → **`0.98x ~ 1.32x`** (베일라 매수가 `1.80x~2.20x`보다 크게 저렴해 제작 수급에 유리).
   - **즉시 매도 (수수료 8% 올림 공제 후 실수령)**: `기준가 × 0.85 × 시세 × 0.92` → **`0.66x ~ 0.90x`** (베일라 매도가 `0.45x~0.55x`보다 크게 높아 파밍 잉여 처분에 유리).
   - **무차익 불변식**: `최고 실수령 매도(0.90x) < 최저 매수(0.98x)` → **저점 매수 → 고점 매도 단타, 기기 시계 돌리기, 베일라 왕복 차익이 수학적으로 0%.**
   - **버킷 거래 쿼터**: 15분 버킷당 품목별 매수/매도 각각 최대 `20`묶음 제한.
5. **초안전 모드 스위치 (잔여 리스크 0% 옵션)**:
   - 하이브리드 모드에서 남는 유일한 잔여 리스크는 **“치터가 합법 수치 극옵 장비를 로컬 에디트해 정상 고가(전당 수준)로 스냅샷 노출”**하는 경우(현재 `장비 전당`과 동일한 수준)입니다.
   - 운영 설정 플래그 하나로 **「초안전 모드(서버는 10분 단위 시세 펄스 1행만 제공 · 매물은 100% NPC 전용, 유저 스냅샷 0)」**으로 즉시 전환할 수 있도록 설계해, 필요 시 타 유저 장비 유입 리스크 자체를 0으로 만들 수 있습니다.

---

## 3. 소숫점 · 정수 · 반올림 수학 계약

기존 [`modules/domain/currency-exchange-rules.mjs`](../modules/domain/currency-exchange-rules.mjs) 및 [`modules/domain/item-appraisal-rules.mjs`](../modules/domain/item-appraisal-rules.mjs)와 동일한 정수 지갑 계약을 따릅니다.

| 항목 | 공식 (`EPSILON = 1e-9`) | 목적 |
| --- | --- | --- |
| 시세 배율 (`pulseFactor`) | `Math.round(v * 100) / 100` (`0.85 ~ 1.15`) | Postgres `numeric(4,2)` · JS 완전 일치 |
| 지불 금액 (장비 구매 · 재료 매수) | `Math.max(1, Math.ceil(raw - 1e-9))` (**올림**) | 반올림 저가 차익 차단 |
| 수령 금액 (재료 매도 · 판매 정산) | `Math.floor(raw + 1e-9)` (**내림**) | 소액 분할 증식 차단 |
| 거래 수수료 (8%) | `gross <= 1 ? 0 : Math.max(1, Math.ceil(gross * 0.08 - 1e-9))` | 소액 수수료 `0` 회피 차단 (최소 출품가 2) |
| 개당 `1` 미만 저가 재료 (`magicBud` 등) | **묶음(번들) 전용** (`×20 / ×40` 등) | 끝까지 소수 계산 후 최종 총액만 1회 정수화 |
| 통화 자동 등급제 | 이슬 환산 `250 미만 → 형체 없는 이슬` / `250 이상 → 황금률` | `sub-gold` 최소값 `1` 절사 왜곡 방지 |
| 해금 게이트 | `currencySeen`에 기록된 재료만 노출 (`ouroboros`·입장권 제외) | 미해금 엔드게임 재료 우회 차단 |

---

## 4. 치트(핵) 8중 방어 체계 (기존 DB 보안과 100% 통합)

| # | 공격 시나리오 | 방어 계층 |
| --- | --- | --- |
| 1 | 사기 옵션 / 소켓 중첩 장비 출품 | [`validate_hall_item`](../db/system-hardening-20261107.sql) + [`hall_affix_table`](../db/hall-watch-20261030.sql) + `validate_hall_sockets`(빈 소켓만 허용) 100% 재사용 |
| 2 | 저가 덤핑 / 부계정 RMT / 황금률 세탁 | 유저 스냅샷 서버 감정가 강제 고정 + 구매 재화 소각 + 출품자 명예만 지급 (P2P 송금 경로 0) |
| 3 | 다계정 봇 시세 조작 (`market_pulse`) | 집계 자격(`season >= 20`, 계정 생성 7일+, `cheat_holds` 미등재, 최근 14일 `cheat_flags` 없음) + **1계정 1표 캡** + **유효 참여 20명 미만 시 기본 시드 유지** + `0.85x~1.15x` 하드 클램프 |
| 4 | PC 시계 조작 (버킷 스킵·단타 파밍) | 온라인은 서버 UTC `now()` 기준 버킷 고정, 오프라인은 `lastAuctionBucket` 단조 증가 + 12시간(48버킷) 정산 캡 + 무차익 밴드(`max_sell < min_buy`) |
| 5 | 세이브 롤백 · 다중 탭 중복 수령 | `CLOUD_SESSION_SUPERSEDED` + `CLOUD_SAVE_HALL_HISTORY_CONFLICT` + 정산함 `settledIds` 멱등 원장 + 낙찰품 `auctionBound` 재출품 차단 |
| 6 | DevTools 가격 변조 구매 요청 | 유저 스냅샷 구매 RPC는 `lot_id`만 수신하고 가격·잔액·차감을 서버 Postgres에서 직접 계산. 로컬 거래 이상치는 기존 `cloud_save_rates` + `cheat_flags` 자동 탐지 |
| 7 | 소액 쪼개기 · 소숫점 반올림 증식 | 비대칭 올림/내림 + 수수료 8% 올림 + 저가 번들 전용 + 버킷 쿼터(20묶음) |
| 8 | 치트 의심 계정 격리 | [`cheat_holds`](../db/anti-cheat.sql) 등재 계정은 출품·스냅샷 노출·시세 집계에서 자동 제외 (`cheat_flags.kind`에 `auction_list`, `auction_buy` 추가) |

---

## 5. 성능 · 세이브 예산

| 항목 | 목표 상한 | 보장 장치 |
| --- | --- | --- |
| 경매장 닫힘 시 CPU | **0 ms** | 백그라운드 루프·타이머 없음 |
| 경매장 열림 시 틱 CPU | **0 ms (1초 타이머 0개)** | 버킷 전환·클릭 시점 지연 평가, DOM 고정 16~24행 |
| 스탯 비교 (`ratingHtml`) | **선택 1건만 캐시** | [`modules/ui/equipment-hall-view.mjs`](../modules/ui/equipment-hall-view.mjs)와 동일하게 `getPersistentBuildSignature` 키 재사용 |
| Supabase 읽기 | **10분당 1회** | `auction_market_pulse` 단일 캐시 행 + 버킷 캐시 (`cloud_saves` 락 없음) |
| 세이브 JSON 증가 | **< 2 KB** | NPC 매물 미저장(`seed`, `lastBucket`, `myLots[3]`, `inbox[20]`, `boughtIds`, `bucketQuotaUsed`만 저장) |

---

## 6. 저장소 모듈 · DB 구현 지도 (`AGENTS.md` 계층 준수)

- **해금 정의**: [`modules/data/content-progression.mjs`](../modules/data/content-progression.mjs) — `id: 'auction'`, `minLoop: 20`, `after: 'market'`, `cost: 2`, `action: { tab: 'tab-trade', section: 'auction' }`.
- **신규 모듈** (`data -> common -> state -> persistence -> domain -> ui`, 서버 호출은 UI 계층 전용):
  - `modules/data/auction-house.mjs` — 시장 사건 6종, 재료 화이트리스트·번들 크기, 무차익 밴드(`0.85~1.15`, `1.15x / 0.85x`, 수수료 `8%`, 쿼터 `20`), 보안 모드 플래그
  - `modules/state/auction-house.mjs` — 세이브 기본값(`default-game.mjs`) + 세션 상태
  - `modules/persistence/saved-auction.mjs` — 마이그레이션·손상 데이터 복구·중복 수령 차단(`settledIds`)
  - `modules/domain/auction-pulse.mjs` — 18계열·9부위·재료 시세 배율(`0.85~1.15`) + 24구간 히스토리
  - `modules/domain/auction-engine.mjs` — 버킷 매물 생성, 지연 품절, 즉시 구매/매수/매도, 버킷 쿼터, 내 출품 지연 정산
  - `modules/ui/auction-house-service.mjs` — `cloudJsonRequest` 네트워크 경계 (서버 오류 시 무중단 로컬 폴백)
  - `modules/ui/auction-house-view.mjs`, `modules/ui/auction-house-actions.mjs` — [`modules/ui/market-view.mjs`](../modules/ui/market-view.mjs) 4번째 탭 연결, `pixel.css` 테마, `data-tip`, `_t()` i18n
- **Supabase SQL**: `db/auction-hybrid-20261121.sql`
  - `public.auction_market_pulse` (단일 행 캐시, 자격 필터 포함 10분 지연 집계)
  - `public.auction_user_lots` (정규화 컬럼 + 부분 인덱스 `WHERE status = 'open'`, `validate_hall_item` · `quote_hall_item` · `cheat_holds` 연동)
  - `public.get_auction_snapshot(...)` / `public.publish_auction_lot(...)` / `public.buy_auction_snapshot(...)`
