// Story text and enemy element of the ten acts, from the old game's data/maps.js (STORY_ACTS).
import type { Element } from '../core/types.ts';

/** element: what the act's enemies hit with (old STORY_ACTS ele). */
export interface ActText { act: number; title: string; subtitle: string; boss: string; clearText: string; element: Element }

export const ACT_TEXT: readonly ActText[] = [
  { act: 1, element: 'phys', title: "뿌리끝 성소", subtitle: "썩은 잔뿌리를 베며 중간계로 돌아갈 길을 연다.", boss: "썩은갈기의 잔뿌리", clearText: "썩은 잔뿌리가 잘려나가자, 오래 막혀 있던 뿌리길이 다시 열린다." },
  { act: 2, element: 'fire', title: "가지치기의 중정", subtitle: "정원사의 중정을 지키는 부제녀와 맞선다.", boss: "부정한 은총의 부제녀", clearText: "중정의 부제녀는 뿌리없는 자를 다시 아래로 떨어뜨렸다. 복수로 향하는 다른 길을 찾아야 한다." },
  { act: 3, element: 'cold', title: "허공뿌리 현수림", subtitle: "허공뿌리를 건너 중정에 힘을 보내는 자들을 추적한다.", boss: "기근의 맹수", clearText: "허공뿌리의 맹수가 쓰러졌다. 중정에 영원의 힘을 보내는 두 존재를 향한 길이 열린다." },
  { act: 4, element: 'light', title: "갈림뿌리 미궁", subtitle: "황금 길의 운반자와 부제녀를 차례로 쓰러뜨린다.", boss: "부정한 은총의 부제녀", clearText: "운반자와 부제녀가 쓰러지며 중정에 깃든 영원의 힘이 사라졌다. 부제녀가 조력자의 정체를 밝힌다." },
  { act: 5, element: 'fire', title: "지주근의 침묵 성소", subtitle: "지주근의 조력자를 찾아 중정으로 돌아갈 길을 연다.", boss: "지주근의 드루이드", clearText: "드루이드의 손끝에서 뻗어난 뿌리가 맞물리며 중정으로 돌아가는 길이 열렸다." },
  { act: 6, element: 'cold', title: "가지치기의 중정", subtitle: "이번에는 정원사의 불멸성이 사라졌다.", boss: "정원사", clearText: "마침내 정원사를 쓰러뜨렸다. 세계수의 수액이 위로 솟구치고, 익숙한 보랏빛이 다음 길을 비춘다." },
  { act: 7, element: 'light', title: "말라가는 큰 줄기", subtitle: "속 빈 줄기를 따라 위로 솟구치는 수액의 행방을 쫓는다.", boss: "줄기의 전령", clearText: "줄기의 전령이 쓰러졌다. 위로 흐르는 수액과 보랏빛은 장막 너머로 이어졌다." },
  { act: 8, element: 'chaos', title: "끝없는 장막의 줄기", subtitle: "장막의 성소를 지나 황금빛 수관으로 향한다.", boss: "끝없는 줄기의 순례자", clearText: "순례자가 쓰러지자 겹겹의 장막이 빛을 잃었다. 그 너머 황금빛 수관이 드러났다." },
  { act: 9, element: 'chaos', title: "비탄의 교차", subtitle: "고치를 품은 접목의 어머니와 맞선다.", boss: "비탄하는 접목의 어머니", clearText: "접목의 어머니가 쓰러지자 고치가 열렸다. 옅은 금빛 후광에 둘러싸인 존재가 세계수의 끝으로 올라간다." },
  { act: 10, element: 'chaos', title: "합일의 차륜", subtitle: "고치에서 태어난 존재를 따라 세계수의 끝에 도달한다.", boss: "고치에서 태어난 존재", clearText: "쓰러진 존재가 손을 뻗었다. 뿌리없는 자도 손을 내밀었지만, 두 손끝 사이에는 아직 작은 틈이 남았다." },
];

export function actText(act: number): ActText {
  const text = ACT_TEXT[act - 1];
  if (!text) throw new Error(`no story text for act ${act}`);
  return text;
}
