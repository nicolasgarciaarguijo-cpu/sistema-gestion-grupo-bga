// PAGO A CUENTA SIN FACTURA (desde la ficha del proveedor). El pago va al cash flow y baja la cuenta de
// donde sale; en la ficha el proveedor queda A FAVOR y se avisa hasta que llegue la factura y se le vincule
// este pago (ver domain/pagosACuenta).
import React, { useState } from "react";

export type PagoACuentaForm = {
  supplier: string;
  taxId: string;
  company: string; // empresa que paga
  fecha: string;
  monto: number;
  metodo: "transferencia" | "efectivo" | "cheque" | "debito";
  cuentaId?: string;
  administration: "blanco" | "negro";
  pagadoPor?: string;
  firmante?: string; // responsable del pago (obligatorio)
  notas: string;
};

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a" };

export function PagoACuentaModal({
  inicial,
  companyOptions,
  cuentas,
  personas = [],
  money,
  onGuardar,
  onCerrar,
}: {
  inicial: PagoACuentaForm;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  cuentas: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
  personas?: string[];
  money: (n: number) => string;
  onGuardar: (f: PagoACuentaForm) => void;
  onCerrar: () => void;
}) {
  const [f, setF] = useState<PagoACuentaForm>(inicial);
  const set = (patch: Partial<PagoACuentaForm>) => setF((p) => ({ ...p, ...patch }));
  const ok = !!f.fecha && Number(f.monto) > 0 && !!f.company && !!String(f.firmante || "").trim();
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(640px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Pago sin factura · {f.supplier || "proveedor"}</div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>
            Va al cash flow ahora. En la ficha el proveedor queda a favor y avisa hasta que llegue la factura: al cargarla,
            elegí "Vincular un pago ya cargado" y este pago.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <label style={lbl}>Fecha del pago
            <input style={input} type="date" value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} />
          </label>
          <label style={lbl}>Monto
            <input style={input} type="number" value={f.monto || ""} onChange={(e) => set({ monto: Number(e.target.value) || 0 })} autoFocus />
          </label>
          <label style={lbl}>Empresa que paga
            <select style={input} value={f.company} onChange={(e) => set({ company: e.target.value, cuentaId: undefined })}>
              {companyOptions.filter((c) => c.value !== "General").map((c) => (
                <option key={c.value} value={c.value}>{c.short || c.label || c.value}</option>
              ))}
            </select>
          </label>
          <label style={lbl}>Cómo se pagó
            <select style={input} value={f.metodo} onChange={(e) => set({ metodo: e.target.value as any })}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="debito">Débito</option>
            </select>
          </label>
          <label style={lbl}>De qué cuenta salió
            <select style={input} value={f.cuentaId || ""} onChange={(e) => set({ cuentaId: e.target.value || undefined })}>
              <option value="">Cuenta por defecto</option>
              {cuentas.filter((c) => c.company === f.company && c.activa !== false && (!c.moneda || c.moneda === "ARS")).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label style={lbl}>Circuito
            <select style={input} value={f.administration} onChange={(e) => set({ administration: e.target.value as any })}>
              <option value="blanco">Blanco</option>
              <option value="negro">Negro</option>
            </select>
          </label>
          <label style={lbl} title="Persona que responde por este pago: queda como firmante.">Responsable / firmante *
            <select style={{ ...input, ...(!f.firmante ? { borderColor: "#f59e0b", background: "#fffbeb" } : {}) }} value={f.firmante || ""} onChange={(e) => set({ firmante: e.target.value || undefined })}>
              <option value="">— elegí quién responde —</option>
              {personas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          {f.metodo === "efectivo" && f.administration === "negro" && (
            <label style={lbl}>Quién pagó
              <select style={input} value={f.pagadoPor || ""} onChange={(e) => set({ pagadoPor: e.target.value || undefined })}>
                <option value="">— la empresa (sin persona) —</option>
                {personas.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label style={lbl}>Por qué (qué se pagó, qué factura falta)
          <input style={input} value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="Ej. seña de la compra de placas, falta la factura" />
        </label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "#b45309", fontWeight: 700 }}>{Number(f.monto) > 0 ? `Queda a favor ${money(Number(f.monto))} hasta la factura` : ""}</span>
          <span style={{ display: "inline-flex", gap: 8 }}>
            <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cancelar</button>
            <button
              type="button"
              disabled={!ok}
              onClick={() => onGuardar(f)}
              style={{ border: "1px solid #15803d", background: ok ? "#16a34a" : "#bbf7d0", color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: ok ? "pointer" : "not-allowed" }}
            >
              Guardar pago
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
