// IMPUESTOS DEL EXTRACTO Y DEL RESUMEN (Nicolas, 2026-10-23): cada banco y mes (y cada resumen de tarjeta) queda
// como una DEUDA "Impuestos extracto bancario" con su detalle para controlar. Tildarla pagada crea el pago desde
// la cuenta del banco (asi baja su saldo); destildarla lo saca. Ver domain/impuestosBancarios.
import React, { useState } from "react";
import { Panel } from "./primitives";
import { ETIQUETA_CATEGORIA, type CategoriaImpuesto, type GrupoImpuestos } from "../domain/impuestosBancarios";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "middle" };
const ddmm = (iso: string) => iso.split("-").reverse().join("/");

export function ImpuestosBancariosPanel({
  grupos,
  pagadoDe,
  cuentaDe,
  companyShort,
  money,
  onPagado,
}: {
  grupos: GrupoImpuestos[];
  pagadoDe: (clave: string) => { fecha: string } | null;
  cuentaDe: (g: GrupoImpuestos) => { id: string; nombre: string } | null;
  companyShort: (company: string) => string;
  money: (n: number) => string;
  onPagado: (g: GrupoImpuestos, pagado: boolean) => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [verPagados, setVerPagados] = useState(false);
  const pendientes = grupos.filter((g) => !pagadoDe(g.clave));
  const lista = verPagados ? grupos : pendientes;
  const totalPend = pendientes.filter((g) => g.moneda === "ARS").reduce((a, g) => a + g.total, 0);
  return (
    <Panel
      span="full"
      abierto
      title={`Impuestos y comisiones del extracto y la tarjeta (${pendientes.length} sin pagar · ${money(totalPend)})`}
      actions={
        <label style={{ fontSize: 12.5, display: "inline-flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={verPagados} onChange={(e) => setVerPagados(e.target.checked)} /> Ver también los pagados
        </label>
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Al cargar el extracto, los impuestos, comisiones e intereses que cobra el banco se juntan por banco y por mes; los del resumen de la tarjeta, por resumen. Revisá el detalle y tildalo <b>pagado</b>: ahí se asienta el pago desde la cuenta de ese banco y baja su saldo.
      </div>
      {lista.length === 0 ? (
        <div style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>✓ No hay impuestos ni comisiones sin asentar.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Deuda</th>
              <th style={th}>Empresa</th>
              <th style={{ ...th, textAlign: "right" }}>Impuestos</th>
              <th style={{ ...th, textAlign: "right" }}>Comisiones</th>
              <th style={{ ...th, textAlign: "right" }}>Intereses</th>
              <th style={{ ...th, textAlign: "right" }}>Total</th>
              <th style={th}>Sale de</th>
              <th style={th}>Pagado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((g) => {
              const pago = pagadoDe(g.clave);
              const cuenta = cuentaDe(g);
              const open = abierto === g.clave;
              return (
                <React.Fragment key={g.clave}>
                  <tr style={{ background: pago ? "#f0fdf4" : undefined }}>
                    <td style={{ ...td, fontWeight: 700, cursor: "pointer" }} onClick={() => setAbierto(open ? null : g.clave)} title="Ver el detalle">
                      {open ? "▾" : "▸"} {g.titulo}
                      <span style={{ fontWeight: 400, color: "#94a3b8" }}> · {g.lineas.length} débito(s){g.moneda === "USD" ? " · U$S" : ""}</span>
                    </td>
                    <td style={td}>{companyShort(g.company)}</td>
                    {(["impuestos", "comisiones", "intereses"] as CategoriaImpuesto[]).map((k) => (
                      <td key={k} style={{ ...td, textAlign: "right", color: g.porCategoria[k] ? "#0f172a" : "#cbd5e1" }}>{g.porCategoria[k] ? money(g.porCategoria[k]) : "—"}</td>
                    ))}
                    <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{money(g.total)}</td>
                    <td style={{ ...td, fontSize: 12, color: cuenta ? "#334155" : "#b91c1c" }}>{cuenta ? cuenta.nombre : `sin cuenta de ${g.banco || "banco"}`}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <label style={{ display: "inline-flex", gap: 5, alignItems: "center", cursor: cuenta ? "pointer" : "not-allowed" }} title={cuenta ? "" : "Primero creá la cuenta de ese banco en Cuentas"}>
                        <input
                          type="checkbox"
                          disabled={!cuenta && !pago}
                          checked={!!pago}
                          onChange={(e) => {
                            if (!e.target.checked && !window.confirm("¿Destildar? Se borra el pago asentado y la cuenta vuelve a tener esa plata.")) return;
                            onPagado(g, e.target.checked);
                          }}
                        />
                        {pago ? `✓ el ${ddmm(pago.fecha)}` : `vence ${ddmm(g.fecha)}`}
                      </label>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={8} style={{ padding: "4px 10px 10px", background: "#f8fafc" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                          <tbody>
                            {g.lineas.map((l) => (
                              <tr key={l.id}>
                                <td style={{ ...td, width: 90 }}>{ddmm(l.fecha)}</td>
                                <td style={td}>{l.descripcion}</td>
                                <td style={{ ...td, width: 110, color: "#64748b" }}>{ETIQUETA_CATEGORIA[l.categoria]}</td>
                                <td style={{ ...td, width: 130, textAlign: "right" }}>{money(l.monto)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
