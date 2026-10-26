"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminDesignProduct } from "@/lib/design-products";
import type { GarmentPlaceholder } from "@/lib/design-constants";
import { GarmentArt } from "@/components/garment-art";

type LoadState = "loading" | "needs-login" | "ready";

const PLACEHOLDER_OPTIONS: { value: GarmentPlaceholder | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "black-tee", label: "Built-in: Classic tee" },
  { value: "white-hoodie", label: "Built-in: Hooded sweatshirt" },
  { value: "grey-crewneck", label: "Built-in: Crewneck sweatshirt" },
];

export default function AdminDesignerProductsPage() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [products, setProducts] = useState<AdminDesignProduct[]>([]);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [uploading, setUploading] = useState<Set<number>>(new Set());

  async function loadProducts() {
    const response = await fetch("/api/admin/design-products");
    if (response.status === 401) {
      setLoadState("needs-login");
      return;
    }
    const data = (await response.json()) as { products: AdminDesignProduct[] };
    setProducts(data.products);
    setLoadState("ready");
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setLoginError("Incorrect password.");
      return;
    }
    setPassword("");
    setLoadState("loading");
    await loadProducts();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoadState("needs-login");
  }

  function update(id: number, patch: Partial<AdminDesignProduct>) {
    setProducts((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function updatePrintArea(id: number, patch: Partial<AdminDesignProduct["printArea"]>) {
    setProducts((current) =>
      current.map((p) => (p.id === id ? { ...p, printArea: { ...p.printArea, ...patch } } : p)),
    );
  }

  async function addProduct() {
    const response = await fetch("/api/admin/design-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "New product",
        imageUrl: "",
        placeholder: null,
        printArea: { left: 37, top: 28, width: 26, height: 38 },
        active: false,
      }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      alert(data.error || "Couldn't add a product.");
      return;
    }
    await loadProducts();
  }

  async function saveProduct(product: AdminDesignProduct) {
    setBusyIds((s) => new Set(s).add(product.id));
    setErrors((e) => ({ ...e, [product.id]: "" }));
    try {
      const response = await fetch(`/api/admin/design-products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: product.label,
          imageUrl: product.imageUrl,
          placeholder: product.placeholder,
          printArea: product.printArea,
          active: product.active,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "Couldn't save that product.");
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
    await fetch(`/api/admin/design-products/${id}`, { method: "DELETE" });
    await loadProducts();
  }

  async function uploadPhoto(id: number, file: File) {
    setUploading((s) => new Set(s).add(id));
    setErrors((e) => ({ ...e, [id]: "" }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "designer");
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = (await response.json()) as { ok?: boolean; url?: string; error?: string };
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
    await fetch("/api/admin/design-products/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((p) => p.id) }),
    });
  }

  if (loadState === "loading") {
    return (
      <div className="gm-admin gm-admin--centered">
        <p>Loading…</p>
      </div>
    );
  }

  if (loadState === "needs-login") {
    return (
      <div className="gm-admin gm-admin--centered">
        <form className="gm-admin-login" onSubmit={handleLogin}>
          <h1>Gotts Merch — Designer Products Editor</h1>
          <label>
            <span>Password</span>
            <input autoFocus onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          {loginError ? <p className="gm-admin-error">{loginError}</p> : null}
          <button className="gm-btn gm-btn--primary" type="submit">Log in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="gm-admin">
      <header className="gm-admin-bar">
        <h1>Gotts Merch — Designer Products Editor</h1>
        <div className="gm-admin-bar__actions">
          <Link href="/admin">← Back to Site Editor</Link>
          <a href="/custom-designer" rel="noreferrer" target="_blank">View Custom Designer ↗</a>
          <button className="gm-btn gm-btn--ghost" onClick={handleLogout} type="button">Log out</button>
        </div>
      </header>

      <div className="gm-admin-body">
        <section className="gm-admin-section">
          <h2>
            Products ({products.length}{products.length === 1 ? " entry" : " entries"})
          </h2>
          <p className="gm-admin-hint">
            Only products marked &quot;Shown to customers&quot; appear in the Custom Designer. The printable area is
            the box customer text is placed within -- left/top/width/height are all percentages of the photo.
          </p>

          {products.map((product, index) => (
            <div className="gm-admin-card" key={product.id}>
              <div className="gm-admin-card__header">
                <p className="gm-admin-card__label">Product {index + 1}</p>
                <div className="gm-admin-reorder">
                  <button aria-label="Move up" disabled={index === 0} onClick={() => moveProduct(index, -1)} type="button">↑</button>
                  <button aria-label="Move down" disabled={index === products.length - 1} onClick={() => moveProduct(index, 1)} type="button">↓</button>
                </div>
              </div>

              <div className="designer-admin-grid">
                <div className="designer-admin-preview">
                  {product.imageUrl ? (
                    <img alt="" src={product.imageUrl} />
                  ) : product.placeholder ? (
                    <GarmentArt product={product.placeholder} />
                  ) : (
                    <p className="portal-muted small">No photo yet</p>
                  )}
                  <span
                    className="designer-admin-print-box"
                    style={{
                      left: `${product.printArea.left}%`,
                      top: `${product.printArea.top}%`,
                      width: `${product.printArea.width}%`,
                      height: `${product.printArea.height}%`,
                    }}
                  />
                </div>

                <div className="designer-admin-fields">
                  <label>
                    <span>Name</span>
                    <input onChange={(e) => update(product.id, { label: e.target.value })} value={product.label} />
                  </label>

                  <label>
                    <span>Photo</span>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading.has(product.id)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadPhoto(product.id, file);
                      }}
                      type="file"
                    />
                  </label>

                  <label>
                    <span>Fallback (while no photo is uploaded)</span>
                    <select
                      onChange={(e) => update(product.id, { placeholder: (e.target.value || null) as GarmentPlaceholder | null })}
                      value={product.placeholder || ""}
                    >
                      {PLACEHOLDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>

                  <div className="gm-admin-print-inputs">
                    <label>
                      <span>Left %</span>
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { left: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.left}
                      />
                    </label>
                    <label>
                      <span>Top %</span>
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { top: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.top}
                      />
                    </label>
                    <label>
                      <span>Width %</span>
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { width: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.width}
                      />
                    </label>
                    <label>
                      <span>Height %</span>
                      <input
                        max={100}
                        min={0}
                        onChange={(e) => updatePrintArea(product.id, { height: Number(e.target.value) })}
                        type="number"
                        value={product.printArea.height}
                      />
                    </label>
                  </div>

                  <label className="gm-admin-check">
                    <input checked={product.active} onChange={(e) => update(product.id, { active: e.target.checked })} type="checkbox" />
                    Shown to customers
                  </label>

                  <div className="gm-admin-bar__actions">
                    <button className="gm-btn gm-btn--primary" disabled={busyIds.has(product.id)} onClick={() => saveProduct(product)} type="button">
                      {busyIds.has(product.id) ? "Saving…" : "Save"}
                    </button>
                    <button className="gm-form-restart" onClick={() => removeProduct(product.id)} type="button">Remove product</button>
                  </div>
                  {saved[product.id] ? <p className="gm-admin-saved">Saved ✓</p> : null}
                  {errors[product.id] ? <p className="gm-admin-error">{errors[product.id]}</p> : null}
                </div>
              </div>
            </div>
          ))}

          <button className="gm-btn gm-btn--ghost" onClick={addProduct} type="button">Add a product</button>
        </section>
      </div>
    </div>
  );
}
