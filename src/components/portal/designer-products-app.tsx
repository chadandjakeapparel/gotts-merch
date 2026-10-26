"use client";

import { useState } from "react";
import { GarmentArt } from "@/components/garment-art";
import type { GarmentPlaceholder } from "@/lib/design-constants";
import type { AdminDesignProduct } from "@/lib/design-products";
import { api } from "@/components/portal/api";

const PLACEHOLDER_OPTIONS: { value: GarmentPlaceholder | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "black-tee", label: "Built-in: Classic tee" },
  { value: "white-hoodie", label: "Built-in: Hooded sweatshirt" },
  { value: "grey-crewneck", label: "Built-in: Crewneck sweatshirt" },
];

const BLANK_PRINT_AREA = { left: 37, top: 28, width: 26, height: 38 };

export function DesignerProductsApp({ initialProducts }: { initialProducts: AdminDesignProduct[] }) {
  const [products, setProducts] = useState<AdminDesignProduct[]>(initialProducts);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [uploading, setUploading] = useState<Set<number>>(new Set());
  const [listError, setListError] = useState("");

  function update(id: number, patch: Partial<AdminDesignProduct>) {
    setProducts((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function updatePrintArea(id: number, patch: Partial<AdminDesignProduct["printArea"]>) {
    setProducts((current) =>
      current.map((p) => (p.id === id ? { ...p, printArea: { ...p.printArea, ...patch } } : p)),
    );
  }

  async function addProduct() {
    setListError("");
    try {
      const data = await api<{ id: number }>("POST", "/api/portal/admin/design-products", {
        label: "New product",
        imageUrl: "",
        placeholder: null,
        printArea: BLANK_PRINT_AREA,
        active: false,
      });
      setProducts((current) => [
        ...current,
        {
          id: data.id,
          label: "New product",
          imageUrl: "",
          placeholder: null,
          printArea: { ...BLANK_PRINT_AREA },
          active: false,
          sortOrder: current.length + 1,
        },
      ]);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Couldn't add a product.");
    }
  }

  async function saveProduct(product: AdminDesignProduct) {
    setBusyIds((s) => new Set(s).add(product.id));
    setErrors((e) => ({ ...e, [product.id]: "" }));
    try {
      await api("PATCH", `/api/portal/admin/design-products/${product.id}`, {
        label: product.label,
        imageUrl: product.imageUrl,
        placeholder: product.placeholder,
        printArea: product.printArea,
        active: product.active,
      });
      setSaved((s) => ({ ...s, [product.id]: true }));
      window.setTimeout(() => setSaved((s) => ({ ...s, [product.id]: false })), 2000);
    } catch (error) {
      setErrors((e) => ({ ...e, [product.id]: error instanceof Error ? error.message : "Couldn't save that product." }));
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(product.id);
        return next;
      });
    }
  }

  async function removeProduct(id: number) {
    if (!confirm("Remove this product? Any saved customer designs using it will just lose their product picture.")) return;
    try {
      await api("DELETE", `/api/portal/admin/design-products/${id}`);
      setProducts((current) => current.filter((p) => p.id !== id));
    } catch (error) {
      setErrors((e) => ({ ...e, [id]: error instanceof Error ? error.message : "Couldn't remove that product." }));
    }
  }

  async function uploadPhoto(id: number, file: File) {
    setUploading((s) => new Set(s).add(id));
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/portal/admin/design-products/upload", { method: "POST", body: formData });
      const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; url?: string; error?: string };
      if (!response.ok || !data.ok || !data.url) throw new Error(data.error || "Upload failed");
      update(id, { imageUrl: data.url });
    } catch (error) {
      setErrors((e) => ({ ...e, [id]: error instanceof Error ? error.message : "Upload failed" }));
    } finally {
      setUploading((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function moveProduct(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= products.length) return;
    const next = [...products];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setProducts(next);
    try {
      await api("POST", "/api/portal/admin/design-products/reorder", { ids: next.map((p) => p.id) });
    } catch {
      // Best-effort -- a refresh shows the server's real order if this happened to fail.
    }
  }

  return (
    <div className="portal-designer-products-page">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Custom Designer products</h1>
        </div>
      </div>
      <p className="portal-hint">
        Only products marked &quot;Shown to customers&quot; appear in the Custom Designer. The printable area is
        the box customer text and art are placed within — left/top/width/height are all percentages of the photo.
      </p>
      {listError ? <p className="portal-msg err" role="alert">{listError}</p> : null}

      <section className="portal-panel">
        <div className="portal-panel-head">
          <h2>Products ({products.length}{products.length === 1 ? " entry" : " entries"})</h2>
          <button className="portal-btn" onClick={addProduct} type="button">Add a product</button>
        </div>

        <div className="portal-designer-products">
          {products.map((product, index) => (
            <div className="portal-designer-product" key={product.id}>
              <div className="portal-designer-head">
                <p className="portal-eyebrow">Product {index + 1}</p>
                <div className="portal-reorder">
                  <button aria-label="Move up" disabled={index === 0} onClick={() => moveProduct(index, -1)} type="button">↑</button>
                  <button aria-label="Move down" disabled={index === products.length - 1} onClick={() => moveProduct(index, 1)} type="button">↓</button>
                </div>
              </div>

              <div className="portal-designer-grid">
                <div className="portal-designer-preview">
                  {product.imageUrl ? (
                    <img alt="" src={product.imageUrl} />
                  ) : product.placeholder ? (
                    <GarmentArt product={product.placeholder} />
                  ) : (
                    <p className="portal-muted small">No photo yet</p>
                  )}
                  <span
                    className="portal-designer-print-box"
                    style={{
                      left: `${product.printArea.left}%`,
                      top: `${product.printArea.top}%`,
                      width: `${product.printArea.width}%`,
                      height: `${product.printArea.height}%`,
                    }}
                  />
                </div>

                <div className="portal-designer-fields">
                  <label className="portal-field">
                    Name
                    <input onChange={(e) => update(product.id, { label: e.target.value })} value={product.label} />
                  </label>

                  <label className="portal-field">
                    Photo
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading.has(product.id)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadPhoto(product.id, file);
                      }}
                      type="file"
                    />
                  </label>

                  <label className="portal-field">
                    Fallback (while no photo is uploaded)
                    <select
                      onChange={(e) => update(product.id, { placeholder: (e.target.value || null) as GarmentPlaceholder | null })}
                      value={product.placeholder || ""}
                    >
                      {PLACEHOLDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>

                  <div className="portal-row">
                    <label className="portal-field">
                      Left %
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { left: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.left}
                      />
                    </label>
                    <label className="portal-field">
                      Top %
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { top: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.top}
                      />
                    </label>
                    <label className="portal-field">
                      Width %
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { width: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.width}
                      />
                    </label>
                    <label className="portal-field">
                      Height %
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { height: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.height}
                      />
                    </label>
                  </div>

                  <label className="portal-check">
                    <input checked={product.active} onChange={(e) => update(product.id, { active: e.target.checked })} type="checkbox" />
                    Shown to customers
                  </label>

                  <div className="portal-row">
                    <button className="portal-btn primary small" disabled={busyIds.has(product.id)} onClick={() => saveProduct(product)} type="button">
                      {busyIds.has(product.id) ? "Saving…" : "Save"}
                    </button>
                    <button className="portal-link small" onClick={() => removeProduct(product.id)} type="button">Remove product</button>
                  </div>
                  {saved[product.id] ? <p className="portal-msg ok">Saved ✓</p> : null}
                  {errors[product.id] ? <p className="portal-msg err">{errors[product.id]}</p> : null}
                </div>
              </div>
            </div>
          ))}
          {!products.length ? (
            <div className="portal-empty">
              <p>No products yet. Add one to let customers pick it in the Custom Designer.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
