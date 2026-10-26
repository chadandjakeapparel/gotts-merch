/**
 * A hand-rolled, in-browser background remover: no API, no cost, no external
 * model. It samples the color at the image's edges, then flood-fills inward
 * from the border through pixels close to that color, feathering the edge
 * of the cut so it doesn't look hard-clipped. Works well for art shot on a
 * solid or near-solid backdrop; won't cleanly separate a busy photo background.
 */

const LOW_THRESHOLD = 32;
const HIGH_THRESHOLD = 70;
const MAX_DIMENSION = 1600;
const EDGE_SAMPLE_RING = 2;

export async function removeBackgroundFromJpeg(imageUrl: string): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(img, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    throw new Error("Couldn't process that image.");
  }

  const data = imageData.data;
  const [br, bg, bb] = sampleBorderColor(data, width, height);
  floodFillFromEdges(data, width, height, br, bg, bb);

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't process that image.");
  return blob;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load that image."));
    img.src = url;
  });
}

function sampleBorderColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const add = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    r += data[idx];
    g += data[idx + 1];
    b += data[idx + 2];
    count += 1;
  };

  for (let x = 0; x < width; x++) {
    for (let d = 0; d < EDGE_SAMPLE_RING; d++) {
      add(x, d);
      add(x, height - 1 - d);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let d = 0; d < EDGE_SAMPLE_RING; d++) {
      add(d, y);
      add(width - 1 - d, y);
    }
  }

  const n = Math.max(1, count);
  return [r / n, g / n, b / n];
}

function colorDistance(data: Uint8ClampedArray, idx: number, br: number, bg: number, bb: number): number {
  const dr = data[idx] - br;
  const dg = data[idx + 1] - bg;
  const db = data[idx + 2] - bb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function alphaForDistance(distance: number): number {
  if (distance <= LOW_THRESHOLD) return 0;
  if (distance >= HIGH_THRESHOLD) return 255;
  return Math.round((255 * (distance - LOW_THRESHOLD)) / (HIGH_THRESHOLD - LOW_THRESHOLD));
}

/** BFS from every border pixel, expanding through anything close to the sampled background color. */
function floodFillFromEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  br: number,
  bg: number,
  bb: number,
) {
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const visit = (x: number, y: number) => {
    const pos = y * width + x;
    if (visited[pos]) return;
    const idx = pos * 4;
    const distance = colorDistance(data, idx, br, bg, bb);
    if (distance >= HIGH_THRESHOLD) return;
    visited[pos] = 1;
    data[idx + 3] = alphaForDistance(distance);
    queue.push(pos);
  };

  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    visit(0, y);
    visit(width - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const pos = queue[head++];
    const x = pos % width;
    const y = Math.floor(pos / width);
    if (x > 0) visit(x - 1, y);
    if (x < width - 1) visit(x + 1, y);
    if (y > 0) visit(x, y - 1);
    if (y < height - 1) visit(x, y + 1);
  }
}
