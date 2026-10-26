"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { GarmentArt } from "@/components/garment-art";
import {
  blankLayer,
  fitImageWidthPct,
  FONTS,
  imageLayerHeightPct,
  INK_COLORS,
  MAX_ART_BYTES,
  MAX_LAYERS,
  type CustomDesign,
  type DesignLayer,
  type DesignProductOption,
  type ImageLayer,
  type TextLayer,
} from "@/lib/design-constants";
import { removeBackgroundFromJpeg } from "@/lib/remove-background";

const ART_TYPES: Record<string, boolean> = { "image/jpeg": true, "image/png": true, "image/webp": true };

let layerSeq = 0;
function newLayerId() {
  layerSeq += 1;
  return `layer-${Date.now()}-${layerSeq}`;
}

type DragState = { id: string; startX: number; startY: number; originX: number; originY: number };

/** Every field either layer kind might take -- callers only ever set fields that match the
 *  layer's own kind, so a narrow cast back to DesignLayer at the merge site is safe. */
type LayerPatch = Partial<Omit<TextLayer, "id" | "kind">> & Partial<Omit<ImageLayer, "id" | "kind">>;

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    img.src = url;
  });
}

export function CustomDesignerApp({
  initialDesign,
  products,
}: {
  initialDesign: CustomDesign | null;
  products: DesignProductOption[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState<number | null>(
    initialDesign?.product?.id ?? products[0]?.id ?? null,
  );
  const [layers, setLayers] = useState<DesignLayer[]>(initialDesign?.layers || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(initialDesign?.code || null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);
  const [bgError, setBgError] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selected = layers.find((l) => l.id === selectedId) || null;
  const product = products.find((p) => p.id === productId) || initialDesign?.product || null;
  const printArea = product?.printArea || { left: 37, top: 28, width: 26, height: 38 };

  function addLayer() {
    // Defaults to an ink color that reads clearly against whichever garment is selected.
    const defaultColor = product?.placeholder === "black-tee" ? INK_COLORS[0].hex : INK_COLORS[1].hex;
    const layer = blankLayer(newLayerId(), defaultColor);
    setLayers((current) => [...current, layer]);
    setSelectedId(layer.id);
  }

  function updateLayer(id: string, patch: LayerPatch) {
    setLayers((current) => current.map((l) => (l.id === id ? ({ ...l, ...patch } as DesignLayer) : l)));
  }

  function removeLayer(id: string) {
    setLayers((current) => current.filter((l) => l.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  async function addImageFromFile(file: File) {
    setUploadingImage(true);
    setUploadError("");
    try {
      if (layers.length >= MAX_LAYERS) throw new Error("You've reached the layer limit.");
      if (!ART_TYPES[file.type]) throw new Error("Use a JPG, PNG, or WEBP image.");
      if (file.size > MAX_ART_BYTES) throw new Error("Image is too large (max 5MB).");

      const { width: naturalWidth, height: naturalHeight } = await readImageDimensions(file);
      const aspectRatio = naturalHeight / naturalWidth;
      const widthPct = fitImageWidthPct(aspectRatio, printArea);

      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/custom-designer/upload", { method: "POST", body: formData });
      const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.ok || !data.url) throw new Error(data.error || "Couldn't upload that image. Try again.");

      const layer: ImageLayer = {
        id: newLayerId(),
        kind: "image",
        imageUrl: data.url,
        aspectRatio,
        widthPct,
        x: 50,
        y: 50,
        rotation: 0,
        bgRemovable: file.type === "image/jpeg",
      };
      setLayers((current) => [...current, layer]);
      setSelectedId(layer.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't upload that image. Try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function removeBackground(layer: ImageLayer) {
    setRemovingBgId(layer.id);
    setBgError("");
    try {
      const blob = await removeBackgroundFromJpeg(layer.imageUrl);
      const file = new File([blob], "design-art.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/custom-designer/upload", { method: "POST", body: formData });
      const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.ok || !data.url) throw new Error(data.error || "Couldn't remove the background. Try again.");
      updateLayer(layer.id, { imageUrl: data.url, bgRemovable: false });
    } catch (err) {
      setBgError(err instanceof Error ? err.message : "Couldn't remove the background. Try again.");
    } finally {
      setRemovingBgId(null);
    }
  }

  function onLayerPointerDown(e: React.PointerEvent<HTMLDivElement>, layer: DesignLayer) {
    e.preventDefault();
    setSelectedId(layer.id);
    setDraggingId(layer.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { id: layer.id, startX: e.clientX, startY: e.clientY, originX: layer.x, originY: layer.y };
  }

  function onLayerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    const stage = stageRef.current;
    if (!state || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dxPct = ((e.clientX - state.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - state.startY) / rect.height) * 100;
    const x = Math.min(100, Math.max(0, state.originX + (dxPct / printArea.width) * 100));
    const y = Math.min(100, Math.max(0, state.originY + (dyPct / printArea.height) * 100));
    updateLayer(state.id, { x, y });
  }

  function onLayerPointerUp() {
    dragState.current = null;
    setDraggingId(null);
  }

  async function handleSave() {
    if (!productId) {
      setSaveError("Choose a product first.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setJustSaved(false);
    try {
      const response = code
        ? await fetch(`/api/custom-designer/${code}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, layers }),
          })
        : await fetch("/api/custom-designer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, layers }),
          });
      const data = (await response.json().catch(() => ({ ok: false }))) as { ok: boolean; code?: string; error?: string };
      if (!data.ok) throw new Error(data.error || "Couldn't save your design. Try again.");
      if (!code && data.code) {
        setCode(data.code);
        router.replace(`/custom-designer/${data.code}`);
      }
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save your design. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/custom-designer/${code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="designer">
      <div className="designer-head">
        <div>
          <span className="gm-eyebrow">Design it yourself</span>
          <h1>Custom Designer</h1>
          <p className="designer-lead">Pick a blank, add your text or your own art, and drag it into place.</p>
        </div>
        {code ? (
          <div className="designer-link">
            <span className="gm-eyebrow">Your design&rsquo;s link</span>
            <div>
              <input aria-label="Your design's link" onFocus={(e) => e.target.select()} readOnly value={`gottsmerch.com/custom-designer/${code}`} />
              <button className="gm-btn gm-btn--ghost" onClick={copyLink} type="button">{copied ? "Copied" : "Copy"}</button>
            </div>
            <p className="designer-hint">Bookmark or save this link to come back and keep editing.</p>
          </div>
        ) : null}
      </div>

      <div className="designer-layout">
        <div className="designer-stage-col">
          <div className="designer-products" role="group" aria-label="Choose a product">
            {products.map((p) => (
              <button
                aria-pressed={productId === p.id}
                className="designer-product"
                key={p.id}
                onClick={() => setProductId(p.id)}
                type="button"
              >
                <span className="designer-product-swatch">
                  {p.imageUrl ? (
                    <img alt="" src={p.imageUrl} />
                  ) : p.placeholder ? (
                    <GarmentArt product={p.placeholder} />
                  ) : null}
                </span>
                {p.label}
              </button>
            ))}
            {!products.length ? <p className="designer-hint">No products are available yet.</p> : null}
          </div>

          <div className="designer-stage" ref={stageRef}>
            <div className="designer-garment">
              {product?.imageUrl ? (
                <img alt="" src={product.imageUrl} />
              ) : product?.placeholder ? (
                <GarmentArt product={product.placeholder} />
              ) : null}
            </div>
            {layers.map((layer) => {
              const isImage = layer.kind === "image";
              const style: React.CSSProperties = {
                left: `${printArea.left + (layer.x / 100) * printArea.width}%`,
                top: `${printArea.top + (layer.y / 100) * printArea.height}%`,
                transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
              };
              if (isImage) {
                style.width = `${layer.widthPct}%`;
                style.height = `${imageLayerHeightPct(layer.widthPct, layer.aspectRatio)}%`;
              } else {
                style.fontFamily = `"${layer.fontFamily}"`;
                style.fontSize = layer.fontSize;
                style.color = layer.color;
                style.fontWeight = layer.bold ? 700 : 400;
                style.fontStyle = layer.italic ? "italic" : "normal";
              }
              return (
                <div
                  className={`designer-layer${isImage ? " designer-layer--image" : ""}${selectedId === layer.id ? " selected" : ""}${draggingId === layer.id ? " dragging" : ""}`}
                  key={layer.id}
                  onPointerCancel={onLayerPointerUp}
                  onPointerDown={(e) => onLayerPointerDown(e, layer)}
                  onPointerMove={onLayerPointerMove}
                  onPointerUp={onLayerPointerUp}
                  style={style}
                >
                  {isImage ? <img alt="" draggable={false} src={layer.imageUrl} /> : layer.content || "Your text here"}
                </div>
              );
            })}
          </div>
          <p className="designer-hint">Drag a layer to move it. Click it to edit it.</p>
        </div>

        <div className="designer-sidebar">
          <div className="designer-add-row">
            <button className="gm-btn gm-btn--primary" onClick={addLayer} type="button">+ Add text</button>
            <button
              className="gm-btn gm-btn--ghost"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
              type="button"
            >
              {uploadingImage ? "Uploading…" : "+ Add your art"}
            </button>
            <input
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void addImageFromFile(file);
              }}
              ref={imageInputRef}
              type="file"
            />
          </div>
          {uploadError ? <p className="designer-error">{uploadError}</p> : null}

          {selected ? (
            <div className="designer-panel">
              {selected.kind === "text" ? (
                <>
                  <label className="designer-field">
                    Text
                    <input
                      autoFocus
                      onChange={(e) => updateLayer(selected.id, { content: e.target.value.slice(0, 200) })}
                      value={selected.content}
                    />
                  </label>

                  <label className="designer-field">
                    Font
                    <select onChange={(e) => updateLayer(selected.id, { fontFamily: e.target.value })} value={selected.fontFamily}>
                      {FONTS.map((f) => (
                        <option key={f.family} style={{ fontFamily: `"${f.family}"` }} value={f.family}>{f.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="designer-field">
                    Ink color
                    <div className="designer-swatches" role="group">
                      {INK_COLORS.map((c) => (
                        <button
                          aria-label={c.name}
                          aria-pressed={selected.color === c.hex}
                          className="designer-swatch"
                          key={c.hex}
                          onClick={() => updateLayer(selected.id, { color: c.hex })}
                          style={{ background: c.hex }}
                          title={c.name}
                          type="button"
                        />
                      ))}
                    </div>
                  </label>

                  <label className="designer-field">
                    Size
                    <input
                      max={160}
                      min={12}
                      onChange={(e) => updateLayer(selected.id, { fontSize: Number(e.target.value) })}
                      type="range"
                      value={selected.fontSize}
                    />
                  </label>

                  <label className="designer-field">
                    Angle
                    <input
                      max={180}
                      min={-180}
                      onChange={(e) => updateLayer(selected.id, { rotation: Number(e.target.value) })}
                      type="range"
                      value={selected.rotation}
                    />
                  </label>

                  <div className="designer-row-actions">
                    <button
                      aria-pressed={selected.bold}
                      className="gm-btn gm-btn--ghost"
                      onClick={() => updateLayer(selected.id, { bold: !selected.bold })}
                      type="button"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      aria-pressed={selected.italic}
                      className="gm-btn gm-btn--ghost"
                      onClick={() => updateLayer(selected.id, { italic: !selected.italic })}
                      type="button"
                    >
                      <em>I</em>
                    </button>
                    <button className="gm-btn gm-btn--ghost designer-danger" onClick={() => removeLayer(selected.id)} type="button">
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="designer-field">
                    Size
                    <input
                      max={90}
                      min={5}
                      onChange={(e) => updateLayer(selected.id, { widthPct: Number(e.target.value) })}
                      type="range"
                      value={selected.widthPct}
                    />
                  </label>

                  <label className="designer-field">
                    Angle
                    <input
                      max={180}
                      min={-180}
                      onChange={(e) => updateLayer(selected.id, { rotation: Number(e.target.value) })}
                      type="range"
                      value={selected.rotation}
                    />
                  </label>

                  {selected.bgRemovable ? (
                    <button
                      className="gm-btn gm-btn--ghost"
                      disabled={removingBgId === selected.id}
                      onClick={() => removeBackground(selected)}
                      type="button"
                    >
                      {removingBgId === selected.id ? "Removing background…" : "Remove background"}
                    </button>
                  ) : null}
                  {bgError ? <p className="designer-error">{bgError}</p> : null}

                  <div className="designer-row-actions">
                    <button className="gm-btn gm-btn--ghost designer-danger" onClick={() => removeLayer(selected.id)} type="button">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="designer-hint">{layers.length ? "Click a layer to edit it." : "Add text or your own art to get started."}</p>
          )}

          <div className="designer-save">
            <button className="gm-btn gm-btn--primary" disabled={saving} onClick={handleSave} type="button">
              {saving ? "Saving…" : code ? "Save changes" : "Save design & get my link"}
            </button>
            {justSaved ? <p className="designer-saved">Saved ✓</p> : null}
            {saveError ? <p className="designer-error">{saveError}</p> : null}
          </div>

          {code ? <Link className="gm-link" href="/custom-designer">Start a new design</Link> : null}
        </div>
      </div>
    </div>
  );
}
