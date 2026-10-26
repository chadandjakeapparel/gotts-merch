"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { GarmentArt } from "@/components/garment-art";
import {
  blankLayer,
  FONTS,
  INK_COLORS,
  PRODUCTS,
  type CustomDesign,
  type DesignLayer,
  type DesignProduct,
} from "@/lib/design-constants";

/** Where layers live within the stage, as a percentage box matching the garment's chest area. */
const PRINT_AREA = { left: 37.5, top: 43.75, width: 25, height: 39.58 };

let layerSeq = 0;
function newLayerId() {
  layerSeq += 1;
  return `layer-${Date.now()}-${layerSeq}`;
}

type DragState = { id: string; startX: number; startY: number; originX: number; originY: number };

export function CustomDesignerApp({ initialDesign }: { initialDesign: CustomDesign | null }) {
  const router = useRouter();
  const [product, setProduct] = useState<DesignProduct>(initialDesign?.product || "black-tee");
  const [layers, setLayers] = useState<DesignLayer[]>(initialDesign?.layers || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(initialDesign?.code || null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);

  const selected = layers.find((l) => l.id === selectedId) || null;

  function addLayer() {
    // Defaults to an ink color that reads clearly against whichever garment is selected.
    const defaultColor = product === "black-tee" ? INK_COLORS[0].hex : INK_COLORS[1].hex;
    const layer = blankLayer(newLayerId(), defaultColor);
    setLayers((current) => [...current, layer]);
    setSelectedId(layer.id);
  }

  function updateLayer(id: string, patch: Partial<DesignLayer>) {
    setLayers((current) => current.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLayer(id: string) {
    setLayers((current) => current.filter((l) => l.id !== id));
    setSelectedId((current) => (current === id ? null : current));
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
    const x = Math.min(100, Math.max(0, state.originX + (dxPct / PRINT_AREA.width) * 100));
    const y = Math.min(100, Math.max(0, state.originY + (dyPct / PRINT_AREA.height) * 100));
    updateLayer(state.id, { x, y });
  }

  function onLayerPointerUp() {
    dragState.current = null;
    setDraggingId(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setJustSaved(false);
    try {
      const response = code
        ? await fetch(`/api/custom-designer/${code}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product, layers }),
          })
        : await fetch("/api/custom-designer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product, layers }),
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
          <p className="designer-lead">Pick a blank, add your text, choose a font and ink color, and drag it into place.</p>
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
            {PRODUCTS.map((p) => (
              <button
                aria-pressed={product === p.key}
                className="designer-product"
                key={p.key}
                onClick={() => setProduct(p.key)}
                type="button"
              >
                <span className="designer-product-swatch" style={{ background: p.base }} />
                {p.label}
              </button>
            ))}
          </div>

          <div className="designer-stage" ref={stageRef}>
            <div className="designer-garment"><GarmentArt product={product} /></div>
            {layers.map((layer) => (
              <div
                className={`designer-layer${selectedId === layer.id ? " selected" : ""}${draggingId === layer.id ? " dragging" : ""}`}
                key={layer.id}
                onPointerCancel={onLayerPointerUp}
                onPointerDown={(e) => onLayerPointerDown(e, layer)}
                onPointerMove={onLayerPointerMove}
                onPointerUp={onLayerPointerUp}
                style={{
                  left: `${PRINT_AREA.left + (layer.x / 100) * PRINT_AREA.width}%`,
                  top: `${PRINT_AREA.top + (layer.y / 100) * PRINT_AREA.height}%`,
                  transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                  fontFamily: `"${layer.fontFamily}"`,
                  fontSize: layer.fontSize,
                  color: layer.color,
                  fontWeight: layer.bold ? 700 : 400,
                  fontStyle: layer.italic ? "italic" : "normal",
                }}
              >
                {layer.content || "Your text here"}
              </div>
            ))}
          </div>
          <p className="designer-hint">Drag your text to move it. Click it to edit the font, color, size and angle.</p>
        </div>

        <div className="designer-sidebar">
          <button className="gm-btn gm-btn--primary" onClick={addLayer} type="button">+ Add text</button>

          {selected ? (
            <div className="designer-panel">
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
            </div>
          ) : (
            <p className="designer-hint">{layers.length ? "Click a text layer to edit it." : "Add text to get started."}</p>
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
