// PAGO DE HABERES (desde la ficha de pago de la persona). Es lo unico de Personal que va al cash flow:
// EGRESOS · Haberes, en el renglon de la persona, el dia del pago, baja la cuenta de donde sale. Firma el
// usuario que lo carga (no se elige).
import React, { useState } from "react";
import { FirmanteFijo } from "./FirmanteSelect";

import NumInput from "./NumInput";
export type PagoHaberForm = {
  id?: number;
  periodo: string; // yyyy-mm al que corresponde
  fecha: string;
  monto: number;
  administration: "blanco" | "negro";
  metodo: "transferencia" | "efectivo" | "cheque" | "debito";
  cuentaId?: string;
  notas: string;
  comprobante?: File | null; // el archivo nuevo a subir (el ya cargado se ve abajo)
  comprobanteNombre?: string;
  firmanteAnterior?: string;
};

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a" };

export function PagoHaberModal({
  inicial,
  persona,
  empresaCorta,
  cuentas,
  sugerido,
  money,
  onGuardar,
  onBorrar,
  onCerrar,
}: {
  inicial: PagoHaberForm;
  persona: string;
  empresaCorta: string;
  cuentas: Array<{ id: string; nombre: string; moneda?: string; activa?: boolean }>; // de la empresa de la persona
  // Lo que falta pagar del periodo, por circuito (para proponer el monto).
  sugerido: (periodo: string, administration: "blanco" | "negro") => number;
  money: (n: number) => string;
  onGuardar: (f: PagoHaberForm) => void;
  onBorrar?: (id: number) => void;
  onCerrar: () => void;
}) {
  const [f, setF] = useState<PagoHaberForm>(inicial);
  const set = (patch: Partial<PagoHaberForm>) => setF((x) => ({ ...x, ...patch }));
  const ok = !!f.fecha && !!f.periodo && Number(f.monto) > 0;
  const falta = sugerido(f.periodo, f.administration);
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(640px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{f.id ? "Pago de haberes" : "Cargar pago de haberes"} · {persona}</div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>
            {empresaCorta} · va al cash flow en EGRESOS · Haberes, en el renglón de {persona}, el día del pago.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <label style={lbl}>Período (mes que se paga)
            <input style={input} type="month" value={f.periodo} onChange={(e) => set({ periodo: e.target.value })} />
          </label>
          <label style={lbl}>Fecha del pago
            <input style={input} type="date" value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} />
          </label>
          <label style={lbl}>Circuito
            <select style={{ ...input, background: f.administration === "negro" ? "#1f2937" : "#fff", color: f.administration === "negro" ? "#fff" : "#0f172a" }} value={f.administration} onChange={(e) => set({ administration: e.target.value as any })}>
              <option value="blanco">Blanco</option>
              <option value="negro">Negro</option>
            </select>
          </label>
          <label style={lbl}>Monto
            <NumInput style={input} value={f.monto || ""} onChange={(e) => set({ monto: Number(e.target.value) || 0 })} autoFocus />
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
              {cuentas.filter((c) => c.activa !== false && (!c.moneda || c.moneda === "ARS")).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
        </div>
        {falta > 0.5 && Math.abs(falta - Number(f.monto || 0)) > 0.5 && (
          <div style={{ fontSize: 12.5, color: "#b45309" }}>
            Falta pagar de {f.periodo.slice(5, 7)}/{f.periodo.slice(0, 4)} en {f.administration}: <strong>{money(falta)}</strong>{" "}
            <button type="button" style={{ ...input, width: "auto", padding: "2px 8px", cursor: "pointer", fontSize: 12 }} onClick={() => set({ monto: falta })}>
              usar ese monto
            </button>
          </div>
        )}
        <label style={lbl}>Comprobante del pago (transferencia, recibo firmado, foto)
          <input style={input} type="file" accept="image/*,application/pdf" onChange={(e) => set({ comprobante: e.target.files?.[0] || null })} />
          {f.comprobanteNombre && !f.comprobante && <span style={{ fontSize: 12, color: "#166534", fontWeight: 400 }}>Cargado: {f.comprobanteNombre}</span>}
        </label>
        <label style={lbl}>Notas
          <input style={input} value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder="Ej. adelanto, aguinaldo, horas extra" />
        </label>
        <FirmanteFijo previo={f.firmanteAnterior} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            {f.id && onBorrar && (
              <button type="button" style={{ ...input, width: "auto", cursor: "pointer", color: "#b91c1c", borderColor: "#fecaca" }} onClick={() => window.confirm("¿Eliminar este pago? (sale del cash flow)") && onBorrar(f.id!)}>
                Eliminar pago
              </button>
            )}
          </div>
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
