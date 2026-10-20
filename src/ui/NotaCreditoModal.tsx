// VENTANA DE NOTA DE CREDITO de un proveedor (desde su ficha). Es registro: no mueve plata. Baja lo que le
// debemos y el credito fiscal de IVA; si se aplica a una factura, esa factura debe solo la diferencia.
import React, { useState } from "react";
import type { NotaCreditoCompra } from "../domain/notasCredito";

import NumInput from "./NumInput";
const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a" };

export function NotaCreditoModal({
  inicial,
  companyOptions,
  facturas,
  money,
  onGuardar,
  onBorrar,
  onCerrar,
}: {
  inicial: NotaCreditoCompra;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  // Facturas del proveedor a las que se puede aplicar.
  facturas: Array<{ id: number; label: string; company: string }>;
  money: (n: number) => string;
  onGuardar: (n: NotaCreditoCompra) => void;
  onBorrar?: (id: number) => void;
  onCerrar: () => void;
}) {
  const [n, setN] = useState<NotaCreditoCompra>(inicial);
  const set = (patch: Partial<NotaCreditoCompra>) => setN((x) => ({ ...x, ...patch }));
  // Neto + IVA arman el total (se puede pisar el total a mano).
  const setImporte = (patch: Partial<NotaCreditoCompra>) =>
    setN((x) => {
      const y = { ...x, ...patch };
      if ("net" in patch || "vat" in patch) y.total = Math.round((Number(y.net || 0) + Number(y.vat || 0)) * 100) / 100;
      return y;
    });
  const ok = !!n.date && Number(n.total) > 0 && !!n.company;
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(640px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Nota de crédito · {n.supplier || "proveedor"}</div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>
            No mueve plata. Baja lo que le debemos y el crédito fiscal de IVA. Si ya estaba pagado, el proveedor queda a favor.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <label style={lbl}>Empresa
            <select style={input} value={n.company} onChange={(e) => set({ company: e.target.value, facturaId: null })}>
              {companyOptions.filter((c) => c.value !== "General").map((c) => (
                <option key={c.value} value={c.value}>{c.short || c.label || c.value}</option>
              ))}
            </select>
          </label>
          <label style={lbl}>Letra
            <select style={input} value={n.receiptLetter} onChange={(e) => set({ receiptLetter: e.target.value })}>
              {["A", "B", "C", "M", "X"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <label style={lbl}>Número
            <input style={input} value={n.number} placeholder="0003-00001234" onChange={(e) => set({ number: e.target.value })} />
          </label>
          <label style={lbl}>Fecha
            <input style={input} type="date" value={n.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label style={lbl}>Neto
            <NumInput style={input} value={n.net || ""} onChange={(e) => setImporte({ net: Number(e.target.value) || 0 })} />
          </label>
          <label style={lbl}>IVA
            <NumInput style={input} value={n.vat || ""} onChange={(e) => setImporte({ vat: Number(e.target.value) || 0 })} />
          </label>
          <label style={lbl}>Total
            <NumInput style={input} value={n.total || ""} onChange={(e) => set({ total: Number(e.target.value) || 0 })} />
          </label>
          <label style={lbl}>Circuito
            <select style={input} value={n.administration} onChange={(e) => set({ administration: e.target.value as any })}>
              <option value="blanco">Blanco</option>
              <option value="negro">Negro</option>
            </select>
          </label>
        </div>
        <label style={lbl}>Se aplica a la factura (opcional)
          <select style={input} value={n.facturaId ?? ""} onChange={(e) => set({ facturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— a la cuenta del proveedor (sin factura puntual) —</option>
            {facturas.filter((f) => f.company === n.company).map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </label>
        <label style={lbl}>Motivo
          <input style={input} value={n.motivo} placeholder="Ej. devolución de material, descuento, error de facturación" onChange={(e) => set({ motivo: e.target.value })} />
        </label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            {onBorrar && inicial.id && inicial.total > 0 && (
              <button type="button" style={{ ...input, width: "auto", cursor: "pointer", color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => window.confirm("¿Eliminar esta nota de crédito?") && onBorrar(inicial.id)}>
                Eliminar
              </button>
            )}
          </div>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            {Number(n.total) > 0 && <span style={{ fontSize: 12.5, color: "#166534", fontWeight: 700 }}>Descuenta {money(Number(n.total))}</span>}
            <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cancelar</button>
            <button
              type="button"
              disabled={!ok}
              onClick={() => onGuardar(n)}
              style={{ border: "1px solid #15803d", background: ok ? "#16a34a" : "#bbf7d0", color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: ok ? "pointer" : "not-allowed" }}
            >
              Guardar
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
