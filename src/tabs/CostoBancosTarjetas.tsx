// COSTO REAL DE BANCOS Y TARJETAS por empresa: comisiones, impuestos, intereses y consumos de cada
// cuenta y de cada tarjeta, en el mes o en el ejercicio. Ver domain/costoBancosTarjetas.
import React, { useMemo, useState } from "react";
import { Panel } from "../ui/primitives";
import { costoBancosYTarjetas, type FilaCosto, type Totales4 } from "../domain/costoBancosTarjetas";

const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const CAT_LABEL = { comisiones: "Comisión", impuestos: "Impuesto", intereses: "Interés", consumos: "Consumo" } as const;

const sumarMes = (mes: string, delta: number) => {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};
const ultimoDia = (mes: string) => {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const fmt = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

const th: React.CSSProperties = { textAlign: "right", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { textAlign: "right", padding: "5px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#ffffff", borderRadius: 6, padding: "3px 9px", cursor: "pointer", fontSize: 12.5 };

export function CostoBancosTarjetas({
  bancos,
  tarjetas,
  resumenes,
  consumos,
  companyOptions,
  money,
}: {
  bancos: Parameters<typeof costoBancosYTarjetas>[0]["bancos"];
  tarjetas: Parameters<typeof costoBancosYTarjetas>[0]["tarjetas"];
  resumenes: Parameters<typeof costoBancosYTarjetas>[0]["resumenes"];
  consumos: Parameters<typeof costoBancosYTarjetas>[0]["consumos"];
  companyOptions: Array<{ value: string; label?: string; short?: string; primary?: string }>;
  money: (n: number, currency?: string) => string;
}) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [modo, setModo] = useState<"mes" | "ejercicio">("mes");
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  // Ejercicio: noviembre a octubre (el del mes elegido).
  const [y, m] = mes.split("-").map(Number);
  const inicioEj = m >= 11 ? `${y}-11-01` : `${y - 1}-11-01`;
  const finEj = m >= 11 ? `${y + 1}-10-31` : `${y}-10-31`;
  const desde = modo === "mes" ? `${mes}-01` : inicioEj;
  const hasta = modo === "mes" ? ultimoDia(mes) : finEj;
  const filas = useMemo(
    () => costoBancosYTarjetas({ bancos, tarjetas, resumenes, consumos }, desde, hasta),
    [bancos, tarjetas, resumenes, consumos, desde, hasta]
  );
  const empresas = Array.from(new Set(filas.map((f) => f.company)));
  const meta = (c: string) => companyOptions.find((o) => o.value === c);
  const toggle = (k: string) =>
    setAbiertas((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const sumaFilas = (fs: FilaCosto[]): Totales4 =>
    fs.reduce(
      (t, f) => ({
        comisiones: t.comisiones + f.ars.comisiones,
        impuestos: t.impuestos + f.ars.impuestos,
        intereses: t.intereses + f.ars.intereses,
        consumos: t.consumos + f.ars.consumos,
        total: t.total + f.ars.total,
      }),
      { comisiones: 0, impuestos: 0, intereses: 0, consumos: 0, total: 0 }
    );
  const celdas = (t: Totales4, fuerte = false) => (
    <>
      {(["comisiones", "impuestos", "intereses", "consumos"] as const).map((k) => (
        <td key={k} style={{ ...td, fontWeight: fuerte ? 700 : 400 }}>{t[k] ? money(t[k]) : "—"}</td>
      ))}
      <td style={{ ...td, fontWeight: 800 }}>{t.total ? money(t.total) : "—"}</td>
    </>
  );

  return (
    <Panel
      span="full"
      title="Costo real de bancos y tarjetas · por empresa"
      actions={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <select style={btn} value={modo} onChange={(e) => setModo(e.target.value as any)}>
            <option value="mes">Mes</option>
            <option value="ejercicio">Ejercicio (nov–oct)</option>
          </select>
          <button type="button" style={btn} onClick={() => setMes(sumarMes(mes, modo === "mes" ? -1 : -12))}>◀</button>
          <strong style={{ minWidth: 130, textAlign: "center" }}>
            {modo === "mes" ? `${NOMBRE_MES[m - 1]} ${y}` : `nov ${inicioEj.slice(0, 4)} – oct ${finEj.slice(0, 4)}`}
            {modo === "mes" && m === 11 && <span style={{ color: "#7c3aed", fontSize: 11, marginLeft: 4 }} title="Salto de año: primer mes del ejercicio">◆</span>}
          </strong>
          <button type="button" style={btn} onClick={() => setMes(sumarMes(mes, modo === "mes" ? 1 : 12))}>▶</button>
        </span>
      }
    >
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        Cuentas: lo que cobró el banco (comisiones, impuestos, intereses) según el renglón de cada débito del extracto.
        Tarjetas: los resúmenes que cierran en el período, con sus cargos y sus consumos (los consumos se analizan por
        tipo de gasto; en el cash flow la plata sale una sola vez, con el pago del resumen). Click en una fila: el detalle.
        <strong> ⚠ revisar</strong> = el texto del banco no parece de ese renglón (corregilo en el movimiento).
      </div>
      {filas.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b" }}>No hay costos bancarios ni resúmenes de tarjeta en el período.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}>Cuenta / tarjeta</th>
                <th style={th}>Comisiones</th>
                <th style={th}>Impuestos</th>
                <th style={th}>Intereses</th>
                <th style={th}>Consumos</th>
                <th style={th}>Total</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => {
                const deEmp = filas.filter((f) => f.company === emp);
                return (
                  <React.Fragment key={emp}>
                    <tr style={{ background: "#f1f5f9" }}>
                      <td style={{ ...td, textAlign: "left", fontWeight: 800, boxShadow: `inset 4px 0 0 ${meta(emp)?.primary || "#94a3b8"}` }}>
                        {meta(emp)?.label || emp}
                      </td>
                      {celdas(sumaFilas(deEmp), true)}
                    </tr>
                    {deEmp.map((f) => {
                      const k = `${f.company}|${f.tipo}|${f.nombre}`;
                      const abierta = abiertas.has(k);
                      const resumenTotal = (f.resumenes || []).reduce((a, s) => a + s.totalArs, 0);
                      return (
                        <React.Fragment key={k}>
                          <tr onClick={() => toggle(k)} style={{ cursor: "pointer" }}>
                            <td style={{ ...td, textAlign: "left", paddingLeft: 22 }}>
                              {abierta ? "▾ " : "▸ "}
                              {f.tipo === "cuenta" ? "🏦 " : "💳 "}
                              {f.nombre}
                              {f.aRevisar > 0 && (
                                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: 999, padding: "0 6px" }}>
                                  ⚠ revisar {money(f.aRevisar)}
                                </span>
                              )}
                              {f.usd.total > 0 && (
                                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#065f46", background: "#d1fae5", borderRadius: 999, padding: "0 6px" }}>
                                  + {money(f.usd.total, "USD")}
                                </span>
                              )}
                            </td>
                            {celdas(f.ars)}
                          </tr>
                          {abierta && (
                            <tr>
                              <td colSpan={6} style={{ padding: "6px 10px 10px 40px", background: "#fcfcfd", borderBottom: "1px solid #e2e8f0" }}>
                                {f.tipo === "tarjeta" && (
                                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, marginBottom: 6 }}>
                                    {(f.resumenes || []).map((s) => (
                                      <span key={s.id}>
                                        Resumen cierre {fmt(s.cierre)}: <strong>{money(s.totalArs)}</strong>
                                        {s.totalUsd ? ` + ${money(s.totalUsd, "USD")}` : ""} · vence {fmt(s.vencimiento)}{" "}
                                        <span style={{ color: s.pagado ? "#16a34a" : "#b45309", fontWeight: 700 }}>{s.pagado ? "pagado" : "a pagar"}</span>
                                      </span>
                                    ))}
                                    {resumenTotal > 0 && Math.abs(resumenTotal - f.ars.total) > 1 && (
                                      <span style={{ color: "#b45309" }}>
                                        Cargado en detalle {money(f.ars.total)} · diferencia con el resumen {money(resumenTotal - f.ars.total)}
                                        {f.ars.total === 0 ? " (faltan cargar los consumos de este cierre)" : ""}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {f.tipo === "tarjeta" && (f.consumosPorTipo || []).length > 0 && (
                                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                                    <strong>Consumos por tipo de gasto:</strong>{" "}
                                    {(f.consumosPorTipo || []).map((c) => `${c.tipo} ${money(c.monto)}`).join(" · ")}
                                  </div>
                                )}
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                  <tbody>
                                    {f.lineas.map((l) => (
                                      <tr key={l.id} style={{ background: l.revisar ? "#fffbeb" : undefined }}>
                                        <td style={{ padding: "2px 6px", color: "#94a3b8", width: 50 }}>{fmt(l.fecha)}</td>
                                        <td style={{ padding: "2px 6px" }}>
                                          {l.descripcion}
                                          {l.titular ? <span style={{ color: "#94a3b8" }}> · {l.titular}</span> : null}
                                          {l.revisar ? <span style={{ color: "#b45309", fontWeight: 700 }}> ⚠ revisar renglón</span> : null}
                                        </td>
                                        <td style={{ padding: "2px 6px", color: "#64748b" }}>
                                          {CAT_LABEL[l.categoria]}
                                          {l.categoria === "consumos" ? ` · ${l.tipoGasto || "sin tipo de gasto"}` : ""}
                                        </td>
                                        <td style={{ padding: "2px 6px", textAlign: "right", fontWeight: 600 }}>{money(l.monto, l.moneda)}</td>
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
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
