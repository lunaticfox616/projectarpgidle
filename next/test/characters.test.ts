import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CLASS_SPRITES, parseKitSheet, sheetPath } from '../src/data/characters.ts';
import { CLASSES } from '../src/data/balance.ts';

const facing = <T>(value: T) => ({ 하: value, 좌: value, 우: value, 상: value });
const motion = (frames: number, extra: Record<string, unknown> = {}) => ({
  프레임수: frames, 프레임ms: new Array(frames).fill(100), 표시영역: { 설명: '', 범위: [1, 2, 3, 4] },
  '손(2x2 안쪽 좌상단)': facing(new Array(frames).fill([34, 30])), ...extra
});
/** Same shape as the kit's <직업>_규격.json. */
const kitSpec = (attack: Record<string, unknown> = { 타격프레임: 2 }) => ({
  무기: '대검', 셀: [79, 79], 행: ['하', '좌', '우', '상'],
  모션: { 대기: motion(4), 걷기: motion(8), 달리기: motion(8), 피격: motion(4, { 몸이동: { 값: facing(new Array(4).fill([0, -1])) } }), 공격: motion(6, attack) }
});

test('a kit spec becomes a typed sheet', () => {
  const sheet = parseKitSheet('warrior', kitSpec({ 타격프레임: 2, 발사점: facing([38.5, 30]) }));
  assert.equal(sheet.cell, 79);
  assert.equal(sheet.weapon, '대검');
  assert.equal(sheet.motions.attack.hitFrame, 2);
  assert.deepEqual(sheet.motions.attack.muzzle?.up, [38.5, 30]);
  assert.deepEqual(sheet.motions.hit.bodyOffset?.left[0], [0, -1]);
  assert.equal(sheet.motions.idle.bodyOffset, null);
  assert.equal(sheet.projectile, null);
  assert.equal(sheetPath('warrior', 'attack', 'composite'), 'warrior/attack-composite.png');
});

test('a broken kit spec is rejected with the failing path', () => {
  assert.throws(() => parseKitSheet('warrior', kitSpec({ 타격프레임: 6 })), /전사_규격\.json\.attack: hit frame out of range/);
  assert.throws(() => parseKitSheet('warrior', kitSpec({})), /attack needs a hit frame/);
  assert.throws(() => parseKitSheet('arcanist', { ...kitSpec(), 행: ['하', '우', '좌', '상'] }), /비술사_규격\.json: rows/);
  const short = kitSpec();
  short.모션.걷기.프레임ms.pop();
  assert.throws(() => parseKitSheet('warrior', short), /walk\.frameMs: expected 8 numbers/);
});

test('every playable class has a sprite job', () => {
  for (const classId of Object.keys(CLASSES)) assert.ok(CLASS_SPRITES[classId as keyof typeof CLASS_SPRITES]);
});
