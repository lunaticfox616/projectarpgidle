// Full-screen moments outside the act view: choosing a class, and settling time spent away.
import { CLASS_SPRITES } from '../data/characters.ts';
import { CLASSES, MAX_OFFLINE_MS, TICK_MS } from '../data/balance.ts';
import { CURRENCY_NAMES } from '../data/names.ts';
import { actText } from '../data/acts.ts';
import { step } from '../core/game.ts';
import { loadCharacter, type CharacterArt } from './art.ts';
import { drawIdle } from './hud.ts';
import type { ClassId, CurrencyKey, GameState } from '../core/types.ts';

const el = (id: string) => document.getElementById(id)!;

const CLASS_TEXT: Record<ClassId, { weapon: string; blurb: string; traits: string[] }> = {
  warrior: { weapon: '대검', blurb: '두꺼운 생명력과 방어도로 무리 한가운데를 버티며 베어 넘긴다.', traits: ['근접', `생명력 ${CLASSES.warrior.hp}`, `방어도 ${CLASSES.warrior.armor}`] },
  arcanist: { weapon: '오브', blurb: '다가오기 전에 오브를 날려 쓰러뜨린다. 몸은 약하니 먼저 쳐야 한다.', traits: [`원거리 ${CLASSES.arcanist.range}칸`, `피해 ${CLASSES.arcanist.damage}`, `생명력 ${CLASSES.arcanist.hp}`] }
};

/** Show the title and resolve with the class the player picked. */
export async function chooseClass(note: string | null): Promise<ClassId> {
  const screen = el('title-screen'), pick = el('class-pick');
  el('title-note').hidden = !note;
  el('title-note').textContent = note ?? '';
  const ids = Object.keys(CLASSES) as ClassId[];
  const arts = await Promise.all(ids.map(id => loadCharacter(CLASS_SPRITES[id])));
  pick.innerHTML = ids.map(id => `<article class="k-panel class-card">
      <canvas width="158" height="158" data-class="${id}" aria-hidden="true"></canvas>
      <div class="weapon">${CLASS_TEXT[id].weapon}</div><h2>${CLASSES[id].name}</h2><p>${CLASS_TEXT[id].blurb}</p>
      <div class="traits">${CLASS_TEXT[id].traits.map(t => `<span>${t}</span>`).join('')}</div>
      <button type="button" class="k-button primary" data-pick="${id}">이 길로 간다</button></article>`).join('');
  screen.hidden = false;
  let frame = 0;
  const animate = (time: number) => {
    ids.forEach((id, i) => {
      const canvas = pick.querySelector<HTMLCanvasElement>(`canvas[data-class="${id}"]`)!;
      drawIdle(canvas, { character: arts[i]!.art as CharacterArt | null }, time, [19, 5, 40]);
    });
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  return new Promise(resolve => {
    pick.addEventListener('click', function onPick(event) {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-pick]');
      if (!button) return;
      pick.removeEventListener('click', onPick);
      cancelAnimationFrame(frame);
      screen.hidden = true;
      resolve(button.dataset.pick as ClassId);
    });
  });
}

interface AwaySummary { kills: Record<'normal' | 'elite' | 'boss', number>; cleared: number[]; levelFrom: number; deaths: number; currencies: Partial<Record<CurrencyKey, number>>; items: number }

function duration(ms: number): string {
  const minutes = Math.floor(ms / 60000), hours = Math.floor(minutes / 60);
  return hours ? `${hours}시간 ${minutes % 60}분` : minutes ? `${minutes}분` : `${Math.round(ms / 1000)}초`;
}

/** "3막 허공뿌리 현수림" for one act, "1~10막 (보스 66회)" for many. */
function clearedText(cleared: number[]): string {
  if (!cleared.length) return '없음';
  const acts = [...new Set(cleared)].sort((a, b) => a - b);
  if (acts.length === 1) return `${acts[0]}막 ${actText(acts[0]!).title}${cleared.length > 1 ? ` (${cleared.length}회)` : ''}`;
  return `${acts[0]}~${acts.at(-1)}막 (보스 ${cleared.length}회)`;
}

function summaryHtml(s: AwaySummary, state: GameState): string {
  const rows: [string, string][] = [
    ['처치', `일반 ${s.kills.normal} · 정예 ${s.kills.elite} · 보스 ${s.kills.boss}`],
    ['정복한 막', clearedText(s.cleared)],
    ['레벨', s.levelFrom === state.level ? String(state.level) : `${s.levelFrom} → ${state.level}`],
    ['쓰러짐', `${s.deaths}번`],
    ['확정 전리품', (Object.entries(s.currencies) as [CurrencyKey, number][]).map(([k, n]) => `${CURRENCY_NAMES[k]} ${n}`).concat(s.items ? [`장비 ${s.items}개`] : []).join(', ') || '없음']
  ];
  return rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

/**
 * Replay time spent away through the same step() as live play, in slices so the page stays
 * responsive, then show what happened. Resolves after the player closes the summary.
 */
export async function settleAway(state: GameState, awayMs: number, quiet = false): Promise<void> {
  const usable = Math.min(Math.max(0, awayMs), MAX_OFFLINE_MS), ticks = Math.floor(usable / TICK_MS);
  const summary: AwaySummary = { kills: { normal: 0, elite: 0, boss: 0 }, cleared: [], levelFrom: state.level, deaths: 0, currencies: {}, items: 0 };
  const modal = el('settle');
  if (!quiet) {
    modal.hidden = false;
    el('settle-away').textContent = `${duration(awayMs)} 동안 뿌리없는 자는 홀로 싸웠다${awayMs > MAX_OFFLINE_MS ? ` (최대 ${duration(MAX_OFFLINE_MS)}까지 정산)` : ''}.`;
    el('settle-ok').hidden = true;
    el('settle-summary').innerHTML = '';
  }
  for (let done = 0; done < ticks;) {
    const slice = Math.min(ticks - done, 4000);
    for (let i = 0; i < slice; i++) for (const e of step(state)) {
      if (e.type === 'enemyKilled') summary.kills[e.kind]++;
      else if (e.type === 'actCleared') {
        summary.cleared.push(e.act);
        for (const [k, n] of Object.entries(e.loot.currencies) as [CurrencyKey, number][]) summary.currencies[k] = (summary.currencies[k] ?? 0) + n;
        summary.items += e.loot.items.length;
      } else if (e.type === 'playerDied') summary.deaths++;
    }
    done += slice;
    if (!quiet) el('settle-fill').style.width = `${(done / ticks) * 100}%`;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (quiet) return;
  el('settle-fill').style.width = '100%';
  el('settle-summary').innerHTML = summaryHtml(summary, state);
  const ok = el('settle-ok');
  ok.hidden = false;
  ok.focus();
  await new Promise<void>(resolve => ok.addEventListener('click', () => resolve(), { once: true }));
  modal.hidden = true;
}
