// PAGO A CUENTA SIN FACTURA (desde la ficha del proveedor). El pago va al cash flow y baja la cuenta de
// donde sale; en la ficha el proveedor queda A FAVOR y se avisa hasta que llegue la factura y se le vincule
// este pago (ver domain/pagosACuenta).
import React, { useState } from "react";
import { FirmanteFijo } from "./FirmanteSelect";

import NumInput from "./NumInput";
import { OPCIONES_MEDIO_PAGO } from "../domain/types";
import { SelectorTarjeta, esPagoConTarjeta, type TarjetaOpt } from "./SelectorTarjeta";
import { TIPOS_IMPUESTO_BANCO, esImpuestoDeTarjeta } from "../domain/impuestoManual";
export type PagoACuentaForm = {
  // Si viene, la ventana EDITA ese pago (CostEntry) en vez de crear uno nuevo. aCuenta: si es un pago sin factura.
  id?: number;
  aCuenta?: boolean;
  supplier: string;
  taxId: string;
  company: string; // empresa que paga
  fecha: string;
  monto: number;
  metodo: "transferencia" | "efectivo" | "cheque" | "debito" | "tarjeta_debito" | "tarjeta_credito";
  cuentaId?: string;
  administration: "blanco" | "negro";
  pagadoPor?: string;
  firmante?: string; // lo graba App: el usuario que opera
  notas: string;
  // Pago con tarjeta: cual (y en cuantas cuotas si es de credito).
  tarjetaId?: number;
  cuotas?: number;
  // IMPUESTOS, TASAS E INTERESES DEL BANCO (23/11/2026): no espera factura; el proveedor es el banco de la cuenta o
  // de la tarjeta. `notas` lleva la descripcion (obligatoria) y `metodo` dice el bloque: debito = cuenta,
  // tarjeta_credito = tarjeta.
  impuestoBanco?: boolean;
  impuestoTipo?: string;
  // Se concilia a fin de mes con el extracto o el resumen (debito automatico, pago de la tarjeta): no espera factura.
  conciliaFinDeMes?: boolean;
  // Pago a ARCA a constatar contra su VEP: avisa hasta que el VEP este cargado y vinculado.
  esperaVep?: boolean;
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
  onBorrar,
  tarjetas = [],
}: {
  tarjetas?: TarjetaOpt[];
  inicial: PagoACuentaForm;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  cuentas: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
  personas?: string[];
  money: (n: number) => string;
  onGuardar: (f: PagoACuentaForm) => void;
  onCerrar: () => void;
  // Borrar el pago (sale del cash flow y de la cuenta de donde salio).
  onBorrar?: (id: number) => void;
}) {
  const [f, setF] = useState<PagoACuentaForm>(inicial);
  const set = (patch: Partial<PagoACuentaForm>) => setF((p) => ({ ...p, ...patch }));
  const imp = !!f.impuestoBanco;
  const conc = !imp && !!f.conciliaFinDeMes;
  const vep = !imp && !conc && !!f.esperaVep;
  const ok = !!f.fecha && Number(f.monto) > 0 && !!f.company && !!f.cuentaId && !(esPagoConTarjeta(f.metodo) && f.administration !== "negro" && !f.tarjetaId) && (!(imp || conc) || !!f.notas.trim());
  const opcion = (activa: boolean): React.CSSProperties => ({ border: `1px solid ${activa ? "#1d4ed8" : "#cbd5e1"}`, background: activa ? "#eff6ff" : "#fff", color: activa ? "#1d4ed8" : "#475569", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" });
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(640px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {f.id ? "Editar pago" : "Pago sin factura"} · {imp ? `impuestos, tasas e intereses · ${f.supplier || "banco"}` : f.supplier || "proveedor"}
          </div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>
            {vep
              ? "Para un pago a ARCA del que todavía no está cargado el VEP. Baja la cuenta ahora y queda avisando «falta cargar el VEP» hasta que se cargue en Compras y se le vincule este pago."
              : conc
              ? "Para lo que no lleva factura y se corrobora con el extracto o el resumen: un débito automático, el pago de la tarjeta. Baja la cuenta ahora y no avisa que falta la factura; avisa que falta conciliarlo hasta que se linkee con su renglón del extracto."
              : imp
              ? "Baja la cuenta el día que se cobró (o al vencimiento del resumen, si es de la tarjeta) y suma a la cuenta corriente del proveedor (si es un banco, la del banco de la cuenta). Sirve también para los intereses de un plan de pago. No espera factura: cuando subas el extracto o el resumen, se linkea con su renglón para corroborar."
              : f.id
              ? "Corregí lo que haga falta: el cambio se ve en el cash flow, en la cuenta de donde salió y en la ficha. Queda firmado por vos."
              : 'Va al cash flow ahora. En la ficha el proveedor queda a favor y avisa hasta que llegue la factura: al cargarla, elegí "Vincular un pago ya cargado" y este pago.'}
          </div>
        </div>
        {!f.id && (
          <div data-tipo-pago-sin-factura style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" data-opcion="a-cuenta" style={opcion(!imp && !conc && !vep)} onClick={() => set({ impuestoBanco: false, conciliaFinDeMes: false, esperaVep: false, metodo: "transferencia", tarjetaId: undefined })}>
              Pago a cuenta (falta la factura)
            </button>
            <button type="button" data-opcion="impuestos" style={opcion(imp)} onClick={() => set({ impuestoBanco: true, conciliaFinDeMes: false, metodo: "debito", administration: "blanco", tarjetaId: undefined, pagadoPor: undefined })}>
              Impuestos, tasas e intereses (sin factura)
            </button>
            <button type="button" data-opcion="concilia" style={opcion(conc)} onClick={() => set({ impuestoBanco: false, conciliaFinDeMes: true, metodo: "debito", administration: "blanco", tarjetaId: undefined, pagadoPor: undefined })}>
              Conciliación a fin de mes
            </button>
            <button type="button" data-opcion="vep" style={opcion(vep)} onClick={() => set({ impuestoBanco: false, conciliaFinDeMes: false, esperaVep: true, metodo: "debito", administration: "blanco", tarjetaId: undefined, pagadoPor: undefined })}>
              Constatación contra VEP
            </button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <label style={lbl}>{imp ? "Fecha en que se cobró" : "Fecha del pago"}
            <input style={input} type="date" min="2015-01-01" max="2100-12-31" value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} />
          </label>
          <label style={lbl}>Monto
            <NumInput style={input} value={f.monto || ""} onChange={(e) => set({ monto: Number(e.target.value) || 0 })} autoFocus />
          </label>
          <label style={lbl}>Empresa que paga
            <select style={input} value={f.company} onChange={(e) => set({ company: e.target.value, cuentaId: undefined })}>
              {companyOptions.filter((c) => c.value !== "General").map((c) => (
                <option key={c.value} value={c.value}>{c.short || c.label || c.value}</option>
              ))}
            </select>
          </label>
          {imp ? (
            <label style={lbl}>Dónde se cobró
              <select data-donde-impuesto style={input} value={esImpuestoDeTarjeta(f.metodo) ? "tarjeta_credito" : "debito"} onChange={(e) => set({ metodo: e.target.value as any, cuentaId: undefined, tarjetaId: undefined, cuotas: 1 })}>
                <option value="debito">En la cuenta del banco (baja ese día)</option>
                <option value="tarjeta_credito">En la tarjeta de crédito (se paga al vencimiento)</option>
              </select>
            </label>
          ) : (
            <label style={lbl}>Medio de pago
              <select style={input} value={f.metodo} disabled={f.administration === "negro"} onChange={(e) => set({ metodo: e.target.value as any })}>
                {OPCIONES_MEDIO_PAGO.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
          {f.administration !== "negro" && (
            <SelectorTarjeta
              tarjetas={tarjetas}
              company={f.company}
              metodo={f.metodo}
              tarjetaId={f.tarjetaId}
              cuotas={f.cuotas}
              labelStyle={lbl}
              inputStyle={input}
              onChange={(x) => set({ ...("tarjetaId" in x ? { tarjetaId: x.tarjetaId } : {}), ...(x.cuentaId ? { cuentaId: x.cuentaId } : {}), ...(x.cuotas ? { cuotas: x.cuotas } : {}) })}
            />
          )}
          <label style={lbl}>De qué cuenta salió
            <select style={{ ...input, ...(f.cuentaId ? {} : { borderColor: "#f87171", background: "#fef2f2" }) }} value={f.cuentaId || ""} onChange={(e) => set({ cuentaId: e.target.value || undefined })}>
              <option value="">— Elegí la cuenta —</option>
              {cuentas.filter((c) => c.company === f.company && c.activa !== false && (!c.moneda || c.moneda === "ARS") && (!imp || (c as any).tipo === "banco")).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          {imp ? (
            <label style={lbl}>Tipo de cargo
              <select data-tipo-impuesto style={input} value={f.impuestoTipo || ""} onChange={(e) => set({ impuestoTipo: e.target.value || undefined })}>
                <option value="">— sin aclarar —</option>
                {TIPOS_IMPUESTO_BANCO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          ) : (
            <label style={lbl}>Administración
              <select style={input} value={f.administration} onChange={(e) => set(e.target.value === "negro" ? { administration: "negro", metodo: "efectivo" } : { administration: e.target.value as any })}>
                <option value="blanco">Blanco</option>
                <option value="negro">Negro</option>
              </select>
            </label>
          )}
          <FirmanteFijo labelStyle={lbl} />
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
        <label style={lbl}>{imp || conc ? "Descripción (para reconocer el gasto)" : f.id && !f.aCuenta ? "Notas" : "Por qué (qué se pagó, qué factura falta)"}
          <input data-descripcion-pago style={{ ...input, ...((imp || conc) && !f.notas.trim() ? { borderColor: "#f87171", background: "#fef2f2" } : {}) }} value={f.notas} onChange={(e) => set({ notas: e.target.value })} placeholder={vep ? "Ej. débito automático de ARCA del 16/10, falta saber qué VEP es" : conc ? "Ej. débito automático que paga la Visa Santander, resumen de octubre" : imp ? "Ej. impuesto al crédito por la transferencia de Pérez del 23/11" : "Ej. seña de la compra de placas, falta la factura"} />
        </label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, color: "#b45309", fontWeight: 700 }}>{imp || conc ? "" : vep ? (Number(f.monto) > 0 ? `Falta cargar el VEP de ${money(Number(f.monto))}` : "") : Number(f.monto) > 0 && (!f.id || f.aCuenta) ? `Queda a favor ${money(Number(f.monto))} hasta la factura` : ""}</span>
          <span style={{ display: "inline-flex", gap: 8 }}>
            {f.id && onBorrar && (
              <button
                type="button"
                onClick={() => window.confirm(`¿Borrar este pago de ${money(Number(f.monto) || 0)}? Sale del cash flow y de la cuenta de donde salió.`) && onBorrar(f.id!)}
                style={{ ...input, width: "auto", cursor: "pointer", color: "#b91c1c", borderColor: "#fecaca" }}
              >
                🗑 Borrar pago
              </button>
            )}
            <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cancelar</button>
            <button
              type="button"
              disabled={!ok}
              onClick={() => onGuardar(f)}
              style={{ border: "1px solid #15803d", background: ok ? "#16a34a" : "#bbf7d0", color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: ok ? "pointer" : "not-allowed" }}
            >
              {f.id ? "Guardar cambios" : "Guardar pago"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
