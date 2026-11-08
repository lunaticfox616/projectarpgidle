// 한국어: 원문 언어(docs/i18n.md). 코드와 index.html에 적힌 한국어가 그대로 열쇠이자 글이라 strings는 거의 비어 있고, 이름과 숫자·시각
// 표기 로캘만 둔다. 다른 언어는 같은 모양의 data/locales/<언어>.js에 적고 js/i18n.js의 LANGUAGE_PACKS에 더한다.
// strings에는 저장 열쇠라 바꿀 수 없는 이름의 한국어 화면 글만 둔다(2026-11-08 사용자: 이미 나온 스킬룬 이름 띄어쓰기).
const LANGUAGE_PACK_KO = Object.freeze({ code: 'ko', name: '한국어', locale: 'ko-KR', strings: Object.freeze({
    '파문심판': '파문 심판', '차원찢기': '차원 찢기', '향로구름': '향로 구름', '작살화살': '작살 화살'
}) });

safeExposeData({ LANGUAGE_PACK_KO });
