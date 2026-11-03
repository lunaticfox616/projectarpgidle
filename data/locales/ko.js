// 한국어: 원문 언어(docs/i18n.md). 코드와 index.html에 적힌 한국어가 그대로 열쇠이자 글이라 strings는 비어 있고, 이름과 숫자·시각
// 표기 로캘만 둔다. 다른 언어는 같은 모양의 data/locales/<언어>.js에 적고 js/i18n.js의 LANGUAGE_PACKS에 더한다.
const LANGUAGE_PACK_KO = Object.freeze({ code: 'ko', name: '한국어', locale: 'ko-KR', strings: Object.freeze({}) });

safeExposeData({ LANGUAGE_PACK_KO });
