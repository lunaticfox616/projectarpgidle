import { createBuildMemo } from './domain/build-memo.mjs';
const memo = createBuildMemo(BUILD_STAT_FIELDS, BUILD_STAT_PARTS);
const withBuildMemoPass = draw => memo.withinPass(game, draw);
const getPersistentBuildSignature = (owner, includeInventory = false) => memo.signature(owner, includeInventory);
const getBackgroundBuildMemo = state => memo.read(state);
const clearBackgroundBuildMemo = state => { memo.clear(state); };
safeExposeGlobals({ withBuildMemoPass, getPersistentBuildSignature, getBackgroundBuildMemo, clearBackgroundBuildMemo });
