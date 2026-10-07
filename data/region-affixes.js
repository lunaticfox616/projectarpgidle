// 세계수 기운(12번 루프 27, 2026-10-08, docs/loop-content-12-plan-20261008.md): 아틀라스 지도에서 떨어진 장비는 그 지역을 기억하고
// (item.dropRegion), 그 장비의 옵션 풀에 그 지역 전용 줄이 더해진다. 줄 수는 그대로(접두 3, 접미 3)라 더 다는 것이 아니라 나올 수
// 있는 것이다(사용자: 줄을 더 다는 것은 밸붕). 줄은 MOD_DB 끝에 regions와 함께 들어간다(무기 대분류 줄과 같은 방식).
// 수치만 높은 줄이 아니라 조건이나 발동이 있는 특색 있는 효과로 지역마다 4줄.
const REGION_AFFIX_RULES = Object.freeze({ minLoop: 27 });

const REGION_AFFIX_MODS = Object.freeze([]);

if (typeof safeExposeData === 'function') safeExposeData({ REGION_AFFIX_RULES, REGION_AFFIX_MODS });
