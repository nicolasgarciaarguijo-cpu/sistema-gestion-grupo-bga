// CONTROL DE LOS RESUMENES DE TARJETA (Nicolas, 2026-10-23): por cada tarjeta, cada resumen con un tilde si
// cierra (lo cargado en el sistema como compra con esa tarjeta + sus impuestos = el monto a pagar) y, si no,
// lo que falta: renglones del resumen que no estan cargados y compras cargadas que no aparecen.
// Ver domain/controlTarjetas.
import React, { useState } from "react";
import { Panel } from "./primitives";
import type { ControlResumen } from "../domain/controlTarjetas";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "3px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5 };
const ddmm = (iso?: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export function ControlResumenesTarjeta({
  tarjetas,
  controles,
  money,
}: {
  tarjetas: Array<{ id: number; name: string; company: string }>;
  controles: ControlResumen[];
  money: (n: number) => string;
}) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const conProblemas = controles.filter((c) => !c.cierra).length;
  return (
    <Panel span="full" abierto title={`Control de resúmenes de tarjeta (${conProblemas} sin cerrar)`}>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Las compras pagadas con tarjeta se cargan en la factura con la tarjeta y las cuotas. Cada cuota se busca en su resumen (mismo monto y fecha de compra cerca) y descuenta del banco el día del vencimiento. ✓ = el renglón está cargado en el sistema; ✗ = falta cargarlo; los impuestos y comisiones van a su deuda de impuestos.
      </div>
      {tarjetas.length === 0 && <div style={{ fontSize: 13, color: "#64748b" }}>No hay tarjetas cargadas.</div>}
      {tarjetas.map((t) => {
        const deTarjeta = controles.filter((c) => c.resumen.cardId === t.id).sort((a, b) => b.resumen.closingDate.localeCompare(a.resumen.closingDate));
        return (
          <div key={t.id} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>{t.name}</div>
            {deTarjeta.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin resúmenes cargados.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Resumen</th>
                    <th style={{ ...th, textAlign: "right" }}>A pagar (resumen)</th>
                    <th style={{ ...th, textAlign: "right" }}>Cargado en el sistema + impuestos</th>
                    <th style={{ ...th, textAlign: "right" }}>Diferencia</th>
                    <th style={th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {deTarjeta.map((c) => {
                    const open = abierto === c.resumen.id;
                    const faltan = c.renglones.filter((r) => r.estado === "falta");
                    const dif = Math.round((c.totalResumen - c.totalSistema) * 100) / 100;
                    return (
                      <React.Fragment key={c.resumen.id}>
                        <tr style={{ cursor: "pointer", background: c.cierra ? "#f0fdf4" : "#fef2f2" }} onClick={() => setAbierto(open ? null : c.resumen.id)}>
                          <td style={{ ...td, fontWeight: 700 }}>{open ? "▾" : "▸"} cierre {ddmm(c.resumen.closingDate)} · vence {ddmm(c.resumen.dueDate)}</td>
                          <td style={{ ...td, textAlign: "right" }}>{money(c.totalResumen)}</td>
                          <td style={{ ...td, textAlign: "right" }}>{money(c.totalSistema)}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: Math.abs(dif) <= 1 ? "#166534" : "#b91c1c" }}>{Math.abs(dif) <= 1 ? "—" : money(dif)}</td>
                          <td style={{ ...td, fontWeight: 700, color: c.cierra ? "#166534" : "#b91c1c" }}>
                            {c.cierra ? "✓ cierra" : `✗ ${[faltan.length && `${faltan.length} renglón(es) sin cargar`, c.noAparecen.length && `${c.noAparecen.length} cargada(s) que no aparecen`, !faltan.length && !c.noAparecen.length && "no cierra el total"].filter(Boolean).join(" · ")}`}
                          </td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={5} style={{ padding: "4px 10px 10px", background: "#f8fafc" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...th, width: 34 }}></th>
                                    <th style={th}>Fecha</th>
                                    <th style={th}>Renglón del resumen</th>
                                    <th style={{ ...th, textAlign: "right" }}>Monto</th>
                                    <th style={th}>En el sistema</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.renglones.map((r) => (
                                    <tr key={r.linea.id} style={{ background: r.estado === "falta" ? "#fef2f2" : undefined }}>
                                      <td style={{ ...td, fontWeight: 800, color: r.estado === "falta" ? "#b91c1c" : "#166534" }}>{r.estado === "falta" ? "✗" : "✓"}</td>
                                      <td style={td}>{ddmm(r.linea.date)}</td>
                                      <td style={td}>{r.linea.description}</td>
                                      <td style={{ ...td, textAlign: "right" }}>{money(Number(r.linea.amount || 0))}</td>
                                      <td style={{ ...td, color: "#475569" }}>
                                        {r.estado === "ok" && r.cuota ? `${r.cuota.descripcion}${r.cuota.de > 1 ? ` · cuota ${r.cuota.cuota}/${r.cuota.de}` : ""}` : r.estado === "cargo" ? "impuesto / comisión (va a su deuda)" : <b style={{ color: "#b91c1c" }}>falta cargar la compra con esta tarjeta</b>}
                                      </td>
                                    </tr>
                                  ))}
                                  {c.noAparecen.map((q) => (
                                    <tr key={`na-${q.compraId}-${q.cuota}`} style={{ background: "#fff7ed" }}>
                                      <td style={{ ...td, fontWeight: 800, color: "#b45309" }}>✗</td>
                                      <td style={td}>{ddmm(q.fechaCompra)}</td>
                                      <td style={{ ...td, color: "#b45309" }}>— no aparece en el resumen —</td>
                                      <td style={{ ...td, textAlign: "right" }}>{money(q.monto)}</td>
                                      <td style={{ ...td, color: "#b45309" }}>
                                        cargada: {q.descripcion}{q.de > 1 ? ` · cuota ${q.cuota}/${q.de}` : ""} (revisá la tarjeta, el monto o la fecha)
                                      </td>
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
          </div>
        );
      })}
    </Panel>
  );
}
