# 시간 가속 DPS 리뷰 수정

- 실제 판정은 1초마다 5회이며 각 피해는 `baseDmg * dotDamageScale`다. 일반 타격의 치명타·중복 공격과 일반 DoT 중첩은 적용하지 않는다.
- 표시 DPS를 `1회 피해 × 틱 수 / max(전체 틱 시간, 공격 간격)`으로 계산한다. 공격 속도가 높아도 중복 시전은 불가능하며, 매우 느린 공격 간격은 대기 시간을 포함한다.
- 실행 스케줄과 예상 DPS가 기존 `combatPattern`의 틱 수·간격을 함께 사용한다. 기본 전투 수치, 저장 형식, 스크립트 순서는 변경하지 않는다.
- 장비 비교의 간소화 스탯 계산도 동일한 값을 사용한다. DPS 상세에는 실제 틱 주기를 표시한다. 적의 저항과 피해 반올림은 실제 피격 단계에 적용되므로 표시 DPS는 저항 적용 전 예상치다.

검증:

- 수정 전 회귀 실패 확인: 시간 가속 DPS 88.661071125, 실제 틱 기준 81.
- `node scripts/smoke-native-skill-gems.js`: 실제 5회 피해, 첫 틱 지연, 공격 속도·치명타 장비, 지속 피해 투자, 느린 공격 간격, 일반 DoT 보존 통과.
- `npm test`: 194/194 통과.
- `npm run check:architecture`: 통과.
- `npx playwright test tests/browser/native-skill-gems.spec.js --workers=1`: PC·모바일 2개 통과. 실제 런타임 DPS와 상세 설명 포함.
