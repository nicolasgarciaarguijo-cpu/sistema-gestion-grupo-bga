// RENDIR UN GASTO DE CAJA CHICA (Nicolas, 2026-10-14): la misma estructura que una factura de Pago a
// proveedores, pero la plata sale de la CAJA CHICA de una persona. El proveedor es uno habitual (de la
// lista) o uno nuevo (se lo da de alta). Se elige en que GRUPO DE COSTO va dentro del cash flow; si el
// proveedor tiene candado, va siempre a su grupo y no se puede cambiar.
// La caja chica en si NO va al cash flow: van estos gastos, como pago a proveedor.
import React, { useMemo, useState } from "react";

export type GastoCajaForm = {
  id?: number;
  fundId: number | null;
  company: string;
  supplier: string;
  taxId: string;
  altaProveedor: boolean;
  date: string;
  amount: number;
  administration: "blanco" | "negro";
  grupoCosto?: string; // "tipo|nombre"
  description: string;
  invoiceNumber: string;
  notes: string;
  // Factura (solo blanco): queda en Compras y en la ficha del proveedor, pagada por la caja chica.
  receiptLetter?: string;
  net21?: number;
  vat?: number;
  attachmentName?: string; // archivo leido por el lector de tickets
};

type ProveedorOpt = {
  id: number;
  name: string;
  taxId: string;
  company: string;
  currentAccount?: boolean;
  grupoCosto?: string;
  tipoGastoLocked?: boolean;
};

type CajaOpt = { id: number; company: string; empresaImputada?: string; description: string; responsible: string; closed?: boolean };

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a" };
const caja: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" };
const titulo: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };

export function GastoCajaChicaModal({
  inicial,
  cajas,
  proveedores,
  grupos,
  onGuardar,
  onBorrar,
  onCerrar,
}: {
  inicial: GastoCajaForm;
  cajas: CajaOpt[];
  proveedores: ProveedorOpt[];
  grupos: Array<{ key: string; label: string }>; // grupos de costo: key "tipo|nombre"
  onGuardar: (g: GastoCajaForm) => void;
  onBorrar?: (id: number) => void;
  onCerrar: () => void;
}) {
  const [g, setG] = useState<GastoCajaForm>(inicial);
  const set = (patch: Partial<GastoCajaForm>) => setG((p) => ({ ...p, ...patch }));

  const delaEmpresa = useMemo(
    () => proveedores.filter((p) => p.company === g.company || p.company === "General").sort((a, b) => a.name.localeCompare(b.name)),
    [proveedores, g.company]
  );
  const elegido = delaEmpresa.find((p) => p.name.trim().toLowerCase() === g.supplier.trim().toLowerCase());
  const esNuevo = !!g.supplier.trim() && !elegido;
  const candado = !!(elegido?.tipoGastoLocked && elegido?.grupoCosto);
  const grupoEfectivo = candado ? elegido!.grupoCosto : g.grupoCosto || elegido?.grupoCosto || "";
  const cajaElegida = cajas.find((c) => c.id === g.fundId);

  const elegirProveedor = (nombre: string) => {
    const p = delaEmpresa.find((x) => x.name === nombre);
    if (!p) return set({ supplier: "", taxId: "" });
    set({ supplier: p.name, taxId: p.taxId || "", altaProveedor: false, grupoCosto: g.grupoCosto || p.grupoCosto });
  };

  const faltan: string[] = [];
  if (g.fundId == null) faltan.push("la caja chica de origen");
  if (!g.supplier.trim()) faltan.push("el proveedor");
  if (!g.date) faltan.push("la fecha");
  if (!(Number(g.amount) > 0)) faltan.push("el monto");
  if (g.administration === "blanco" && !g.invoiceNumber.trim()) faltan.push("el número de factura (blanco = con factura; si no tiene, es negro)");

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4600, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(820px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{g.id ? "Gasto de caja chica" : "Rendir gasto de caja chica"}</div>
          <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cerrar</button>
        </div>

        <div style={caja}>
          <div style={titulo}>1 · De qué caja sale la plata</div>
          <div style={grid}>
            <label style={{ ...lbl, gridColumn: "span 2" }}>Caja chica (persona)
              <select
                style={input}
                value={g.fundId ?? ""}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const c = cajas.find((x) => x.id === id);
                  // El gasto es de la empresa a la que CORRESPONDE la caja (la plata puede salir de otra).
                  set({ fundId: id, company: c?.empresaImputada || c?.company || g.company });
                }}
              >
                <option value="">— Elegí la caja —</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {(c.responsible || "Sin responsable") + " · " + (c.description || "Caja chica") + (c.closed ? " (cerrada)" : "")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {cajaElegida && <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>Rinde: <b>{cajaElegida.responsible || "sin responsable"}</b></div>}
        </div>

        <div style={caja}>
          <div style={titulo}>2 · Proveedor</div>
          <div style={grid}>
            <label style={lbl}>Proveedor habitual
              <select style={input} value={elegido?.name || ""} onChange={(e) => elegirProveedor(e.target.value)}>
                <option value="">— Elegí de la lista (o escribí uno nuevo) —</option>
                {delaEmpresa.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}{p.currentAccount ? " · cta cte" : ""}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>Nombre / razón social
              <input style={input} value={g.supplier} placeholder="Proveedor" onChange={(e) => set({ supplier: e.target.value })} />
            </label>
            <label style={lbl}>CUIT
              <input style={input} value={g.taxId} placeholder="30-00000000-0" onChange={(e) => set({ taxId: e.target.value })} />
            </label>
          </div>
          {esNuevo && (
            <label style={{ marginTop: 8, display: "inline-flex", gap: 6, alignItems: "center", color: "#b45309", fontWeight: 700, fontSize: 12.5 }}>
              <input type="checkbox" checked={g.altaProveedor} onChange={(e) => set({ altaProveedor: e.target.checked })} />
              Proveedor NUEVO: abrirle una ficha en el listado de proveedores
            </label>
          )}
        </div>

        <div style={caja}>
          <div style={titulo}>3 · Gasto</div>
          <div style={grid}>
            <label style={lbl}>Fecha
              <input style={input} type="date" value={g.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <label style={lbl}>Monto
              <input style={{ ...input, fontWeight: 800 }} type="number" value={g.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) || 0 })} />
            </label>
            <label style={lbl}>Circuito
              <select
                style={{ ...input, background: g.administration === "negro" ? "#1f2937" : "#fff", color: g.administration === "negro" ? "#fff" : "#0f172a" }}
                value={g.administration}
                onChange={(e) => set(e.target.value === "negro" ? { administration: "negro", invoiceNumber: "" } : { administration: "blanco" })}
              >
                <option value="blanco">Blanco (con factura)</option>
                <option value="negro">Negro (sin factura)</option>
              </select>
            </label>
            {g.administration === "blanco" && (
              <>
                <label style={lbl}>Letra
                  <select style={input} value={g.receiptLetter || "B"} onChange={(e) => set({ receiptLetter: e.target.value })}>
                    {["A", "B", "C", "M"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label style={lbl}>Número de factura
                  <input style={input} value={g.invoiceNumber} placeholder="0001-00001234" onChange={(e) => set({ invoiceNumber: e.target.value })} />
                </label>
                <label style={lbl}>Neto gravado
                  <input style={input} type="number" value={g.net21 || ""} onChange={(e) => set({ net21: Number(e.target.value) || 0 })} />
                </label>
                <label style={lbl}>IVA
                  <input style={input} type="number" value={g.vat || ""} onChange={(e) => set({ vat: Number(e.target.value) || 0 })} />
                </label>
              </>
            )}
            <label style={{ ...lbl, gridColumn: "span 2" }}>
              Dónde va en el cash flow (grupo de costo)
              <select
                style={{ ...input, background: candado ? "#f1f5f9" : "#fff" }}
                disabled={candado}
                value={candado ? grupoEfectivo : g.grupoCosto || ""}
                onChange={(e) => set({ grupoCosto: e.target.value || undefined })}
              >
                <option value="">— El del proveedor —</option>
                {grupos.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              {candado && <span style={{ fontSize: 11.5, color: "#92400e" }}>🔒 Este proveedor tiene candado: siempre va a su grupo.</span>}
            </label>
            <label style={{ ...lbl, gridColumn: "span 2" }}>Descripción
              <input style={input} value={g.description} onChange={(e) => set({ description: e.target.value })} />
            </label>
          </div>
          <label style={{ ...lbl, marginTop: 8 }}>Notas
            <input style={input} value={g.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: faltan.length ? "#b45309" : "#166534" }}>
            {faltan.length
              ? `Falta: ${faltan.join(", ")}.`
              : g.administration === "blanco"
              ? "La factura queda en Compras y en la ficha del proveedor, pagada por la caja chica. El pago va al cash flow como pago a este proveedor."
              : "Va al cash flow en EGRESOS como pago a este proveedor (no como caja chica)."}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {g.id != null && onBorrar && (
              <button type="button" onClick={() => onBorrar(g.id!)} style={{ ...input, width: "auto", cursor: "pointer", color: "#b91c1c" }}>Quitar gasto</button>
            )}
            <button
              type="button"
              disabled={faltan.length > 0}
              onClick={() => onGuardar({ ...g, grupoCosto: candado ? elegido!.grupoCosto : g.grupoCosto })}
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
