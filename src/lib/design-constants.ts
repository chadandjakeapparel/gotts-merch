/** A built-in SVG stand-in, used while a product has no uploaded photo yet. */
export type GarmentPlaceholder = "black-tee" | "white-hoodie" | "grey-crewneck";

export type PrintArea = {
  /** All percentages (0-100) of the product image's own box. */
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DesignProductOption = {
  id: number;
  label: string;
  imageUrl: string;
  placeholder: GarmentPlaceholder | null;
  printArea: PrintArea;
};

export const FONTS: { family: string; google: string; label: string }[] = [
  { family: "Anton", google: "Anton", label: "Anton (bold)" },
  { family: "Bebas Neue", google: "Bebas+Neue", label: "Bebas Neue (condensed)" },
  { family: "Oswald", google: "Oswald:wght@400;600", label: "Oswald" },
  { family: "Montserrat", google: "Montserrat:wght@400;700", label: "Montserrat" },
  { family: "Playfair Display", google: "Playfair+Display:wght@400;700", label: "Playfair Display (serif)" },
  { family: "Pacifico", google: "Pacifico", label: "Pacifico (script)" },
  { family: "Permanent Marker", google: "Permanent+Marker", label: "Permanent Marker" },
  { family: "Caveat", google: "Caveat:wght@400;700", label: "Caveat (handwriting)" },
];

export const GOOGLE_FONTS_HREF = `https://fonts.googleapis.com/css2?${FONTS.map((f) => `family=${f.google}`).join("&")}&display=swap`;

export const INK_COLORS: { name: string; hex: string }[] = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#1b1b1b" },
  { name: "Red", hex: "#c0392b" },
  { name: "Royal Blue", hex: "#2a4fbf" },
  { name: "Navy", hex: "#1f2a4d" },
  { name: "Kelly Green", hex: "#2a9d4a" },
  { name: "Gold", hex: "#d4a017" },
  { name: "Orange", hex: "#e67e22" },
  { name: "Purple", hex: "#6b3fa0" },
  { name: "Pink", hex: "#f2a7c3" },
  { name: "Grey", hex: "#8a8f98" },
];

type LayerPlacement = {
  /** Percent (0-100) within the garment's print area. */
  x: number;
  y: number;
  /** Degrees. */
  rotation: number;
};

export type TextLayer = LayerPlacement & {
  id: string;
  kind: "text";
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
};

export type ImageLayer = LayerPlacement & {
  id: string;
  kind: "image";
  imageUrl: string;
  /** Natural image height / width -- keeps it from stretching when resized. */
  aspectRatio: number;
  /** Percent of the design stage's own width. */
  widthPct: number;
  /** True right after uploading a JPG, until "Remove background" has been run. */
  bgRemovable: boolean;
};

export type DesignLayer = TextLayer | ImageLayer;

export type CustomDesign = {
  code: string;
  /** Null if the product was deleted, or never set. */
  product: DesignProductOption | null;
  layers: DesignLayer[];
  createdAt: string;
  updatedAt: string;
};

export const MAX_LAYERS = 40;
export const MAX_TEXT_LENGTH = 200;
export const MAX_ART_BYTES = 5 * 1024 * 1024;

export const blankLayer = (id: string, color: string = INK_COLORS[1].hex): TextLayer => ({
  id,
  kind: "text",
  content: "Your text here",
  fontFamily: FONTS[0].family,
  fontSize: 32,
  color,
  bold: false,
  italic: false,
  x: 50,
  y: 50,
  rotation: 0,
});

/** The design stage is always rendered at this pixel size (see .designer-stage's aspect-ratio). */
export const STAGE_WIDTH = 400;
export const STAGE_HEIGHT = 480;

/** Picks a widthPct (percent of the stage's own width) so an image of the given aspect
 *  ratio fits inside the product's print area without stretching. */
export function fitImageWidthPct(aspectRatio: number, printArea: PrintArea): number {
  const pxPerPctW = STAGE_WIDTH / 100;
  const pxPerPctH = STAGE_HEIGHT / 100;
  const boxWidthPx = printArea.width * pxPerPctW;
  const boxHeightPx = printArea.height * pxPerPctH;
  const widthPx = Math.min(boxWidthPx, boxHeightPx / aspectRatio);
  return Math.max(5, Math.min(100, widthPx / pxPerPctW));
}

/** The height (percent of the stage's own height) that keeps an image layer's aspect ratio. */
export function imageLayerHeightPct(widthPct: number, aspectRatio: number): number {
  const pxPerPctW = STAGE_WIDTH / 100;
  const pxPerPctH = STAGE_HEIGHT / 100;
  const widthPx = widthPct * pxPerPctW;
  const heightPx = widthPx * aspectRatio;
  return heightPx / pxPerPctH;
}
