import { createWorldTreeNativeFx } from './rendering/world-tree-native.mjs';

const worldTreeNativeFx = createWorldTreeNativeFx(event => structuredClone(event));
safeExposeGlobals({ worldTreeNativeFx });
