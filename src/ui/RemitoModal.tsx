// VENTANA DE REMITO (Fase 5, 2026-10-14). La misma para los tres tipos:
//   - Recepcion de proveedor: proveedor, numero del remito, fecha, factura vinculada y los renglones
//     (cada uno vinculado a un item del stock, o uno nuevo que se da de alta). ENTRA al stock.
//   - Salida de stock por trabajo: el trabajo y lo que sale. Se puede traer la lista de materiales del
//     trabajo. SALE del stock, imputado al trabajo.
//   - Entrega al cliente: el trabajo, el cliente, el destino y lo que se entrega. No mueve stock.
import React, { useMemo, useState } from "react";
import { TIPOS_REMITO, type Remito, type RenglonRemito } from "../domain/remitos";

import NumInput from "./NumInput";
export type StockOpt = { id: number; company: string; code: string; description: string; unit: string; unitPrice: number; quantity: number; group: string };
export type TrabajoOpt = { id: number; company: string; label: string; client: string; destino: string; materiales: Array<{ descripcion: string; cantidad: number; unidad: string; stockCode?: string }> };
export type FacturaOpt = { id: number; label: string };

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a", background: "#fff" };
const celda: React.CSSProperties = { ...input, padding: "3px 6px" };
const caja: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" };
const titulo: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#475569", padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "3px 4px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };

const etiquetaStock = (s: StockOpt) => `${s.code ? s.code + " · " : ""}${s.description}`;
const norm = (s: string) => String(s || "").trim().toLowerCase();

export function RemitoModal({
  inicial,
  stock,
  proveedores,
  trabajos,
  facturas,
  companyOptions,
  gruposStock,
  money,
  onGuardar,
  onBorrar,
  onImprimir,
  onCerrar,
}: {
  inicial: Remito;
  stock: StockOpt[];
  proveedores: Array<{ name: string; taxId: string; company: string }>;
  trabajos: TrabajoOpt[];
  facturas: (company: string, proveedor: string, taxId: string) => FacturaOpt[];
  companyOptions: Array<{ value: string; label?: string }>;
  gruposStock: string[];
  money: (n: number) => string;
  onGuardar: (r: Remito) => void;
  onBorrar?: (id: number) => void;
  onImprimir: (r: Remito) => void;
  onCerrar: () => void;
}) {
  const [r, setR] = useState<Remito>(inicial);
  const set = (p: Partial<Remito>) => setR((x) => ({ ...x, ...p }));
  const setRenglon = (id: number, p: Partial<RenglonRemito>) =>
    setR((x) => ({ ...x, renglones: x.renglones.map((g) => (g.id === id ? { ...g, ...p } : g)) }));
  const nuevoRenglon = (): RenglonRemito => ({ id: Date.now() + Math.floor(Math.random() * 1000), stockItemId: null, codigo: "", descripcion: "", unidad: "u", cantidad: 0, precioUnitario: 0 });

  const stockEmpresa = useMemo(() => stock.filter((s) => s.company === r.company || s.company === "General"), [stock, r.company]);
  const porEtiqueta = useMemo(() => new Map(stockEmpresa.map((s) => [norm(etiquetaStock(s)), s])), [stockEmpresa]);
  const porCodigo = useMemo(() => new Map(stockEmpresa.filter((s) => s.code).map((s) => [norm(s.code), s])), [stockEmpresa]);
  const porDescripcion = useMemo(() => new Map(stockEmpresa.map((s) => [norm(s.description), s])), [stockEmpresa]);
  const trabajo = trabajos.find((t) => t.id === r.jobId);
  const mueveStock = r.tipo !== "entrega";
  const facturasOpt = r.tipo === "recepcion" ? facturas(r.company, r.proveedor || "", r.taxId || "") : [];

  const elegirStock = (g: RenglonRemito, texto: string) => {
    const s = porEtiqueta.get(norm(texto)) || porCodigo.get(norm(texto)) || porDescripcion.get(norm(texto));
    if (s) setRenglon(g.id, { stockItemId: s.id, codigo: s.code, descripcion: s.description, unidad: s.unit || g.unidad, precioUnitario: g.precioUnitario || s.unitPrice });
    else setRenglon(g.id, { stockItemId: null, codigo: "", descripcion: texto });
  };

  const traerMateriales = () => {
    if (!trabajo) return;
    const filas: RenglonRemito[] = trabajo.materiales
      .filter((m) => Number(m.cantidad) > 0)
      .map((m, i) => {
        const s = (m.stockCode && porCodigo.get(norm(m.stockCode))) || porDescripcion.get(norm(m.descripcion));
        return {
          id: Date.now() + i,
          stockItemId: s?.id ?? null,
          codigo: s?.code || m.stockCode || "",
          descripcion: s?.description || m.descripcion,
          unidad: s?.unit || m.unidad || "u",
          cantidad: Number(m.cantidad) || 0,
          precioUnitario: s?.unitPrice || 0,
        };
      });
    set({ renglones: [...r.renglones.filter((g) => g.descripcion.trim() || g.cantidad), ...filas] });
  };

  const validos = r.renglones.filter((g) => g.descripcion.trim() && Number(g.cantidad) > 0);
  const sinStock = mueveStock ? validos.filter((g) => g.stockItemId == null) : [];
  const total = validos.reduce((a, g) => a + Number(g.cantidad || 0) * Number(g.precioUnitario || 0), 0);
  const faltan: string[] = [];
  if (!r.fecha) faltan.push("la fecha");
  if (r.tipo === "recepcion" && !(r.proveedor || "").trim()) faltan.push("el proveedor");
  if (r.tipo !== "recepcion" && r.jobId == null) faltan.push("el trabajo");
  if (!validos.length) faltan.push("al menos un renglón con cantidad");
  if (r.tipo === "salida" && sinStock.length) faltan.push(`vincular al stock ${sinStock.length} renglón(es) (una salida solo puede sacar lo que hay en stock)`);

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(1000px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>
            {TIPOS_REMITO[r.tipo].label} {r.numero ? `· ${r.numero}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => onImprimir(r)} style={{ ...input, width: "auto", cursor: "pointer" }}>🖨 Imprimir</button>
            <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>

        <div style={caja}>
          <div style={titulo}>{r.tipo === "recepcion" ? "Del proveedor" : "Del trabajo"}</div>
          <div style={grid}>
            <label style={lbl}>Empresa
              <select style={input} value={r.company} onChange={(e) => set({ company: e.target.value })}>
                {companyOptions.filter((c) => c.value !== "General").map((c) => (
                  <option key={c.value} value={c.value}>{c.label || c.value}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Fecha
              <input style={input} type="date" value={r.fecha} onChange={(e) => set({ fecha: e.target.value })} />
            </label>
            <label style={lbl}>{r.tipo === "recepcion" ? "N.º del remito del proveedor" : "N.º de remito"}
              <input style={input} value={r.numero} onChange={(e) => set({ numero: e.target.value })} />
            </label>
            {r.tipo === "recepcion" ? (
              <>
                <label style={lbl}>Proveedor
                  <input
                    style={input}
                    list="remito-proveedores"
                    value={r.proveedor || ""}
                    onChange={(e) => {
                      const p = proveedores.find((x) => norm(x.name) === norm(e.target.value));
                      set({ proveedor: e.target.value, ...(p ? { taxId: p.taxId } : {}) });
                    }}
                  />
                </label>
                <label style={lbl}>CUIT
                  <input style={input} value={r.taxId || ""} onChange={(e) => set({ taxId: e.target.value })} />
                </label>
                <label style={{ ...lbl, gridColumn: "span 2" }}>Factura vinculada
                  <select style={input} value={r.purchaseInvoiceId ?? ""} onChange={(e) => set({ purchaseInvoiceId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— Todavía sin factura —</option>
                    {facturasOpt.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label style={{ ...lbl, gridColumn: "span 2" }}>Trabajo
                  <select
                    style={input}
                    value={r.jobId ?? ""}
                    onChange={(e) => {
                      const t = trabajos.find((x) => x.id === Number(e.target.value));
                      set({ jobId: t ? t.id : null, cliente: t?.client || r.cliente, destino: r.destino || t?.destino || "", company: t?.company || r.company });
                    }}
                  >
                    <option value="">— Elegí el trabajo —</option>
                    {trabajos.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                {r.tipo === "entrega" && (
                  <>
                    <label style={lbl}>Cliente
                      <input style={input} value={r.cliente || ""} onChange={(e) => set({ cliente: e.target.value })} />
                    </label>
                    <label style={lbl}>Lugar de entrega
                      <input style={input} value={r.destino || ""} onChange={(e) => set({ destino: e.target.value })} />
                    </label>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div style={caja}>
          <div style={{ ...titulo, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>{r.tipo === "entrega" ? "Lo que se entrega" : r.tipo === "salida" ? "Lo que sale del stock" : "Lo que llegó"}</span>
            <span style={{ display: "flex", gap: 6 }}>
              {r.tipo === "salida" && trabajo && (
                <button type="button" style={{ ...input, width: "auto", cursor: "pointer", fontSize: 12 }} onClick={traerMateriales}>
                  Traer materiales del trabajo
                </button>
              )}
              <button type="button" style={{ ...input, width: "auto", cursor: "pointer", fontSize: 12 }} onClick={() => set({ renglones: [...r.renglones, nuevoRenglon()] })}>
                + Renglón
              </button>
            </span>
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>{mueveStock ? "Item del stock (código o descripción)" : "Descripción"}</th>
                <th style={{ ...th, width: 90 }}>Cantidad</th>
                <th style={{ ...th, width: 80 }}>Unidad</th>
                {r.tipo !== "entrega" && <th style={{ ...th, width: 120 }}>Precio unit.</th>}
                {r.tipo === "recepcion" && <th style={{ ...th, width: 140 }}>Grupo (si es nuevo)</th>}
                <th style={{ ...th, width: 30 }} />
              </tr>
            </thead>
            <tbody>
              {r.renglones.map((g) => {
                const s = g.stockItemId != null ? stock.find((x) => x.id === g.stockItemId) : undefined;
                return (
                  <tr key={g.id}>
                    <td style={td}>
                      <input
                        style={{ ...celda, borderColor: mueveStock && g.descripcion.trim() && g.stockItemId == null ? "#f59e0b" : "#cbd5e1" }}
                        list={mueveStock ? "remito-stock" : undefined}
                        value={s ? etiquetaStock(s) : g.descripcion}
                        onChange={(e) => (mueveStock ? elegirStock(g, e.target.value) : setRenglon(g.id, { descripcion: e.target.value }))}
                      />
                      {mueveStock && g.descripcion.trim() && (
                        <div style={{ fontSize: 11, color: s ? "#64748b" : "#b45309" }}>
                          {s ? `En stock: ${s.quantity} ${s.unit}` : r.tipo === "recepcion" ? "No está en el stock: se da de alta al guardar" : "Elegilo de la lista del stock"}
                        </div>
                      )}
                    </td>
                    <td style={td}>
                      <NumInput style={{ ...celda, textAlign: "right" }} value={g.cantidad || ""} onChange={(e) => setRenglon(g.id, { cantidad: Number(e.target.value) || 0 })} />
                    </td>
                    <td style={td}>
                      <input style={celda} value={g.unidad} onChange={(e) => setRenglon(g.id, { unidad: e.target.value })} />
                    </td>
                    {r.tipo !== "entrega" && (
                      <td style={td}>
                        <NumInput style={{ ...celda, textAlign: "right" }} value={g.precioUnitario || ""} onChange={(e) => setRenglon(g.id, { precioUnitario: Number(e.target.value) || 0 })} />
                      </td>
                    )}
                    {r.tipo === "recepcion" && (
                      <td style={td}>
                        {g.stockItemId == null ? (
                          <input style={celda} list="remito-grupos" value={g.grupo || ""} placeholder="Melaminas" onChange={(e) => setRenglon(g.id, { grupo: e.target.value })} />
                        ) : (
                          <span style={{ fontSize: 12, color: "#64748b" }}>{s?.group}</span>
                        )}
                      </td>
                    )}
                    <td style={td}>
                      <button type="button" title="Quitar renglón" style={{ border: "none", background: "none", cursor: "pointer", color: "#b91c1c" }} onClick={() => set({ renglones: r.renglones.filter((x) => x.id !== g.id) })}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {r.tipo !== "entrega" && <div style={{ marginTop: 6, fontSize: 13, textAlign: "right" }}>Total: <b>{money(total)}</b></div>}
          <label style={{ ...lbl, marginTop: 8 }}>Notas
            <input style={input} value={r.notas} onChange={(e) => set({ notas: e.target.value })} />
          </label>
        </div>

        <datalist id="remito-stock">
          {stockEmpresa.map((s) => (
            <option key={s.id} value={etiquetaStock(s)} />
          ))}
        </datalist>
        <datalist id="remito-proveedores">
          {proveedores.filter((p) => p.company === r.company || p.company === "General").map((p) => (
            <option key={`${p.company}-${p.name}`} value={p.name} />
          ))}
        </datalist>
        <datalist id="remito-grupos">
          {gruposStock.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: faltan.length ? "#b45309" : "#166534", maxWidth: 620 }}>
            {faltan.length
              ? `Falta: ${faltan.join(", ")}.`
              : r.tipo === "recepcion"
              ? "Al guardar, el material ENTRA al stock. Si después se edita o se quita el remito, el stock se corrige solo."
              : r.tipo === "salida"
              ? "Al guardar, el material SALE del stock, imputado al trabajo."
              : "El remito de entrega no mueve stock."}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {onBorrar && (
              <button
                type="button"
                style={{ ...input, width: "auto", cursor: "pointer", color: "#b91c1c" }}
                onClick={() => {
                  if (window.confirm("¿Quitar este remito? Si movió stock, se deshace.")) onBorrar(r.id);
                }}
              >
                Quitar remito
              </button>
            )}
            <button
              type="button"
              disabled={faltan.length > 0}
              onClick={() => onGuardar({ ...r, renglones: validos })}
              style={{ ...input, width: "auto", cursor: faltan.length ? "not-allowed" : "pointer", background: faltan.length ? "#e2e8f0" : "#0f766e", color: faltan.length ? "#64748b" : "#fff", fontWeight: 800 }}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
