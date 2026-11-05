// FICHA DEL PASE ENTRE CUENTAS: de donde sale la plata y a donde va, las dos obligatorias, en la misma empresa o entre dos.
// Firma el usuario que lo carga (no se elige). Si cruza de empresa, queda en la cuenta corriente entre las empresas.
import React, { useState } from "react";
import { FirmanteFijo } from "./FirmanteSelect";
import { AmountInput } from "./primitives";
import { SelectorCuenta } from "../tabs/CuentasPanel";
import { faltantesDelPase, type PaseForm } from "../domain/pases";
import type { Cuenta } from "../domain/cuentas";

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box" };
const caja: React.CSSProperties = { border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", display: "grid", gap: 8 };

export function PaseModal({
  inicial,
  firmanteAnterior,
  empresas,
  cuentas,
  money,
  onGuardar,
  onCerrar,
}: {
  inicial: PaseForm;
  firmanteAnterior?: string;
  empresas: Array<{ value: string; short: string }>;
  cuentas: Cuenta[];
  money: (n: number, moneda?: "ARS" | "USD") => string;
  onGuardar: (f: PaseForm) => void;
  onCerrar: () => void;
}) {
  const [f, setF] = useState<PaseForm>(inicial);
  const set = (cambio: Partial<PaseForm>) => setF((prev) => ({ ...prev, ...cambio }));
  const faltan = faltantesDelPase(f);
  const misma = !!f.cuentaId && f.cuentaId === f.cuentaDestinoId;
  const corta = (c: string) => empresas.find((e) => e.value === c)?.short || c;
  const entreEmpresas = !!f.company && !!f.companyDestino && f.company !== f.companyDestino;

  const punta = (titulo: string, company: string, cuentaId: string, cambio: (c: string, id: string) => void) => (
    <div style={caja}>
      <strong style={{ fontSize: 13, color: "#0f172a" }}>{titulo}</strong>
      <label style={lbl}>
        Empresa
        <select style={input} value={company} onChange={(e) => cambio(e.target.value, "")}>
          {empresas.map((e) => (
            <option key={e.value} value={e.value}>{e.short}</option>
          ))}
        </select>
      </label>
      <SelectorCuenta cuentas={cuentas} company={company} moneda={f.currency} value={cuentaId} onChange={(id) => cambio(company, id)} />
    </div>
  );

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: "100%", maxWidth: 640, display: "grid", gap: 10 }}>
        <strong style={{ fontSize: 16, color: "#0f172a" }}>Pase entre cuentas</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {punta("Sale de", f.company, f.cuentaId, (company, cuentaId) => set({ company, cuentaId }))}
          {punta("Va a", f.companyDestino, f.cuentaDestinoId, (companyDestino, cuentaDestinoId) => set({ companyDestino, cuentaDestinoId }))}
        </div>
        {entreEmpresas && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#92400e" }}>
            <strong>Es entre dos empresas:</strong> queda registrado que {corta(f.companyDestino)} le debe {Number(f.amount) > 0 ? money(Number(f.amount), f.currency) : "ese monto"} a{" "}
            {corta(f.company)}, en la cuenta corriente entre las empresas, hasta que se cruce con una factura o una devolución.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <label style={lbl}>
            Fecha
            <input style={input} type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label style={lbl}>
            Monto
            <AmountInput style={input} value={f.amount} onChange={(n) => set({ amount: n })} />
          </label>
          <label style={lbl}>
            Moneda
            <select style={input} value={f.currency} onChange={(e) => set({ currency: e.target.value as PaseForm["currency"], cuentaId: "", cuentaDestinoId: "" })}>
              <option value="ARS">$ Pesos</option>
              <option value="USD">U$S Dólares</option>
            </select>
          </label>
        </div>
        <label style={lbl}>
          Descripción
          <input style={input} value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <label style={lbl}>
          Notas
          <input style={input} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
        <FirmanteFijo previo={firmanteAnterior} />
        {(faltan.length > 0 || misma) && (
          <div style={{ fontSize: 12.5, color: "#b91c1c", fontWeight: 600 }}>
            {misma ? "La plata tiene que salir de una cuenta y entrar a otra." : `Falta completar: ${faltan.join(", ")}.`}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onCerrar} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={faltan.length > 0 || misma}
            onClick={() => onGuardar(f)}
            style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: faltan.length > 0 || misma ? "#94a3b8" : "#0f172a", color: "#fff", fontWeight: 700, cursor: faltan.length > 0 || misma ? "not-allowed" : "pointer" }}
          >
            Guardar pase
          </button>
        </div>
      </div>
    </div>
  );
}
