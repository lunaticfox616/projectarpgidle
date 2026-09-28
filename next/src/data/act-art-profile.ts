// Shape of an old-game biome art profile (data/act-art.ts). Paths are relative to the repository root.
export interface ActArtProfile {
  /** 2x2 texture sheet: paving, path, dense growth, open ground. */
  material: string;
  /** Prop atlas; `regions` are its sprite boxes [x, y, w, h]. */
  props: string;
  regions: [number, number, number, number][];
  /** Each region cropped to its visible pixels (alpha >= 12), measured by tools/import-acts.ts. */
  propBounds: [number, number, number, number][];
  /** Share of paving under the open ground (0..1). */
  paving?: number;
  /** "suspended": rooms are platforms over a void, joined by narrow bridges. */
  surface?: 'suspended';
  /** Prop widths in tiles, for props placed beside rooms. */
  landmarkWidths?: number[];
  /** Prop widths in tiles, for roots hung under suspended platforms. */
  platformWidths?: number[];
}
