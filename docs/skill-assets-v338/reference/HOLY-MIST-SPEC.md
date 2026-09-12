# 신성한 안개 — 향로 화염 주문과 화염 취약 v3.29

> **v3.36 최신 시각 수정:** 사용자 요청에 따라 향로와 사슬을 은색으로 바꾸고 사슬을 40px 늘려 실제 공격 범위보다 크게 휘두른다. 아래의 짧은 청동 사슬 제안은 시각 이력이다. 주변 1칸 판정·화염 주문·안개·디버프는 유지한다. 상세 [31_HOLY_MIST_SILVER_CENSER_SPEC.md](31_HOLY_MIST_SILVER_CENSER_SPEC.md).

## 요청과 적용 상태

- `[최신 사용자 요청]` 신성한 안개 신규 스킬. **주문**으로 분류하며 향로를 휘둘러 플레이어 주위 1칸의 몬스터에게 화염 피해와 **받는 화염 피해 증가 디버프**를 부여한다.
- `[WORKING: 적용 기본안]` 대각선을 포함한 인접 8칸, 시전당 1회 타격. 받는 화염 피해 **20% 증가·4초**, 같은 효과는 중첩 없이 재적중 시 갱신한다. 선택 질문 후 제작 기본안으로 안내했으며 명시적 사용자 확정과 구분한다.
- `[WORKING: 제작 번호]` 전체 젬 58번째, 이펙트 카탈로그 50번. 실제 MZ 데이터베이스 ID는 별도다.
- `[제안: 조형]` 잿빛 향이 피어오르는 둥근 화염 씨앗, 짧은 사슬의 청동 향로, 중앙이 빈 따뜻한 잿빛 안개, 적 머리 위 불꽃 표식. 신규 종교·성직자 클래스·제조법을 정사로 추가하지 않는다.
- `[OPEN]` 디버프 기본 수치와 타격 방식의 최종 선택, 조형 채택, 피해량·성장·재사용 시간·소모량·실제 전투 DB 및 피해 계산 연결.

## 타격과 디버프

9×8 보드의 48px 논리 셀을 사용한다. 시전자 셀과의 체비쇼프 거리가 정확히 1인 칸을 대상으로 하며 시전자 자신의 칸과 보드 밖 칸은 제외한다. 중앙에서는 8칸, 모서리에서는 3칸이다. 대상 수 제한 없이 범위 안의 살아 있는 몬스터를 모두 검사하며 같은 ID는 한 번만 판정한다.

기본 재생 속도에서 향로가 약 0.52초 동안 플레이어의 손 위치를 축으로 회전한다. 0.33초에 화염 주문 피해를 1회 처리하고, 몬스터 아래에 낮은 밝기의 안개가 약 0.7초 동안 나타났다 사라진다. 안개가 사라져도 불꽃 표식과 디버프는 타격 시점부터 4초간 유지된다. 별도의 지속 피해·치유·가속 효과는 추가하지 않는다.

타격 직전 `getSource(at)`로 플레이어 위치를 조회할 수 있다. 최초 피해 콜백 이후 몬스터를 다시 조회해 살아남은 적에게만 디버프를 적용한다. 새 디버프는 이번 최초 타격을 소급 증폭하지 않는다. 이미 적용된 디버프는 호스트의 기존 화염 피해 계산에 반영할 수 있다. 범위를 벗어나 이동해도 적용된 디버프는 유지되고 표식이 따라가며, 사망·해제·만료 시 제거한다.

`increasedFireDamageTakenPercent`는 호스트의 **받는 화염 피해 증가** 항목에 더할 백분율 포인트다. 화염 저항 감소나 별도 곱연산인 ‘피해 증폭’으로 바꾸지 않는다. 다른 피해 속성에 적용하지 않는다. 같은 신성한 안개 효과는 강도를 더하지 않고 가장 최근 적중의 수치와 만료 시각으로 갱신한다. 속도 조절은 향로와 타격 연출을 바꾸며 디버프 4초는 유지한다.

## 전투 연결 API

`WT_HOLY_MIST` 및 MZ의 `WorldTreePixelLabFX.holyMist`를 제공한다.

```js
const holy = WorldTreePixelLabFX.holyMist;
const statuses = holy.createDebuffStore(); // 전투 전체에서 공유
const emit = event => layer.fx.emit(event);
const cast = holy.createCast({
  source: playerCell,
  getSource: at => getPlayerCellAt(at),
  getEnemies: at => getLivingEnemySnapshotAt(at),
  emit,
  debuffStore: statuses,
  startAt: now,
  channelId: uniqueCastId,
  increasePercent: 20,
  debuffDurationMs: 4000,
  onImpact(hit) {
    // 각 대상의 현재 화염 피해 증가 수치를 조회하고 호스트가 HP를 계산한다.
    for (const target of hit.targets) {
      const contribution = statuses.getFireTakenIncreasePercent(target.id, hit.at);
      resolveFireSpellHit(target, contribution);
    }
  },
  onDebuff: batch => synchronizeHostStatusUI(batch.records)
});

// 동일한 시계로 모든 시전과 상태를 갱신한 다음 시각 이벤트를 정리한다.
cast.update(now);
statuses.update(now, { getEnemies: getLivingEnemySnapshotAt, emit });
layer.tick(now);
```

예제의 전투 함수는 **호스트에서 구현할 연결 지점**이다. DB 스킬을 등록하거나 실제 피해량을 확정하는 코드가 아니다. 여러 시전은 예정된 타격 시간 순서로 처리하고 `getSource(at)`·`getEnemies(at)`에는 해당 시각의 권위 있는 스냅샷을 제공한다. 과거 위치를 임의로 복원하지 않는다.

- `createCast`는 `update(now)`, `cancel(at)`, `impactAt`, `endAt`, `impacts`, `debuffStore`를 제공한다. 시전 전 중단은 타격을 막고, 이미 적중했다면 적용된 상태는 유지한다.
- `onImpact`는 `category:'spell'`, `element:'fire'`, `damageType:'hit'`, `damage:null`, 대상 ID와 셀을 전달한다. 호스트가 HP를 계산한다.
- 상태 저장소의 `apply`, `get`, `getFireTakenIncreasePercent`, `snapshot`, `remove`, `clear`, `update`로 적용·조회·해제·만료를 처리한다. 만료 시각부터 증가 수치는 0이다. 반환 기록은 복사본이다.
- 시전이 중단되거나 연출이 끝난 뒤에도 상태 저장소의 `update`를 호스트 프레임에서 호출한다. 상태 표식은 공유 저장소당 하나의 시각 배치로 유지하며 갱신 적중으로 중복 생성하지 않는다.
- 렌더러 실패는 전투 타격을 막지 않는다. 피해·디버프 콜백은 재진입 또는 예외 뒤 재호출되더라도 동일 타격을 중복 처리하지 않는다. 호스트 자체의 피해 계산 오류 복구는 호스트 책임이다.
- 표식을 한 칸당 하나로 묶어 그려도 해당 칸의 모든 대상에게 개별 상태 기록이 남는다. Sprite 예산으로 시각 효과가 생략되어도 실제 타격·디버프 수를 줄이지 않는다.
- 전투 종료 시 상태 저장소와 FX를 함께 정리한다. 외부에서 FX만 강제로 초기화하면 상태 기록과 표시가 분리될 수 있으므로 새 전투에서는 새 저장소와 시각 레이어를 사용한다.

## 픽셀 원화와 검수

PixelLab Pixen으로 향로 32px, 안개 64px, 불꽃 표식 16px, 씨앗 젬 32px를 생성했다. 초기 안개 중앙의 소용돌이를 PixelLab에서 제거하고 제한 팔레트를 적용했다. 원본 알파를 복원한 뒤 손실 없이 아틀라스에 배치한다. 생성물을 확대 재샘플링하여 원화로 저장하지 않는다.

- 향로는 2배 정수 크기, 회전은 π/32 단위. 사슬의 위쪽을 손 위치에 고정한다.
- 안개는 2배 정수 크기로 배우 아래에 표시하고 최대 알파 0.64로 부드럽게 나타났다 사라진다. 화면 섬광·반복 명멸·화면 흔들림·가산 합성을 사용하지 않는다.
- 불꽃 표식은 1배 원본 크기로 적 머리 위에 유지하며 처음과 끝만 부드럽게 표시한다.
- 새 64px 슬롯 2개를 사용한다. 향로와 표식은 한 슬롯의 서로 다른 영역을 공유한다. 총 **464슬롯·1024×1856·7.25MiB·1텍스처·48Sprite 풀·이벤트 상한 128개** 유지. 아틀라스 RGBA 메모리 증가 **0바이트**.
- 기본 8마리 장면 최대 10Sprite. 여러 동시 시전은 기존 48Sprite 예산 안에서 표시한다. 전체 게임의 저사양 장치 벤치마크 결과를 의미하지 않는다.
- 12개 동작 검증 그룹, 9개 플레이어 위치, 기본 장면 456개 MZ 시점, 기존 49종의 98개 시퀀스·196개 Canvas 장면·98개 MZ 장면 보존을 확인한다. 재적중 갱신·만료·사망·해제·이동·중단·200개 대상 판정을 포함한다.

원화 `pixellab/holy-mist-v329/`, 단독 검수 `holy-mist.html`, QA `qa/holy-mist/`, 배포 젬 `assets/gems/active/holy-mist-seed-32-v1.png`, 이펙트 아이콘 `icons/50.png`. 단독 미리보기는 처음에 정지하며 버튼으로 한 번 재생한다.

## 정사와 미확정 항목

사용한 정사: `docs/world/00_CANON_INDEX.md`, `01_WORLD_PREMISE.md`, `02_PLAYER_AND_TIME_LOOP.md`, `05_PLAYER_CLASSES.md`, `06_VISUAL_REFERENCE_MANIFEST.md`. 관련 아이템 규격 01·02 및 변경 기록 08을 함께 갱신한다. LOCKED 설정 변경과 정사 충돌은 없다. 신성하다는 명칭만으로 새로운 종교·빛 속성·클래스 전용 능력을 추정하지 않는다. 디버프 수치·타격 방식의 최종 선택, 조형 채택 및 전투 수치·DB 연결은 OPEN이다.
