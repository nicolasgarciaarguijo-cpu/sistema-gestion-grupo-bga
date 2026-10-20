// RETIROS SOCIETARIOS (bloque de Balance y estado de resultados): lo que retiran los socios, por empresa
// y socio, blanco y negro separados. Cada retiro va al Calendario (EGRESOS · RETIROS SOCIETARIOS) y sale
// de su cuenta. Tambien se crean solos desde el arqueo del cierre de ejercicio.
import React from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import { resumenRetiros } from "../domain/retirosSocietarios";
import type { RetiroSocietario } from "../domain/types";
import { FirmanteCelda } from "../ui/FirmanteSelect";

import NumInput from "../ui/NumInput";
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 12.5, width: "100%", boxSizing: "border-box" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

export function RetirosSocietariosPanel({
  retiros,
  desde,
  hasta,
  periodoLabel,
  resultado,
  cuentas,
  companyOptions,
  money,
  bloqueado,
  onAdd,
  onUpdate,
  onRemove,
}: {
  retiros: RetiroSocietario[];
  desde: string;
  hasta: string;
  periodoLabel: string;
  resultado?: number; // resultado del periodo (pesos), para mostrar lo que queda despues de los retiros
  cuentas: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  money: (n: number, currency?: string) => string;
  bloqueado?: (company: string, iso: string) => boolean;
  onAdd: () => void;
  onUpdate: (id: number, field: keyof RetiroSocietario, value: unknown) => void;
  onRemove: (id: number) => void;
}) {
  const resumen = resumenRetiros(retiros as any, desde, hasta);
  const totalPesos = resumen.reduce((a, x) => a + x.total, 0);
  const totalUsd = resumen.reduce((a, x) => a + x.usd, 0);
  const delPeriodo = retiros
    .filter((r) => r.fecha >= desde && r.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const shortDe = (c: string) => companyOptions.find((o) => o.value === c)?.short || c;
  const socios = Array.from(new Set(retiros.map((r) => r.socio).filter(Boolean))).sort();

  return (
    <Panel title={`Retiros societarios · ${periodoLabel}`} span="full" actions={<ButtonLike onClick={onAdd}>+ Retiro</ButtonLike>}>
      <datalist id="retiros-socios">
        {socios.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        Lo que retiran los socios. No es un gasto de funcionamiento: sale del resultado. Cada retiro sale de su
        cuenta y va al Calendario en <strong>EGRESOS · RETIROS SOCIETARIOS</strong>. También se asientan solos desde el
        arqueo del cierre de ejercicio.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>Retirado en el período</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{money(totalPesos)}{totalUsd ? ` + ${money(totalUsd, "USD")}` : ""}</div>
        </div>
        {resultado !== undefined && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>Resultado del período − retiros (pesos)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: resultado - totalPesos >= 0 ? "#166534" : "#b91c1c" }}>
              {money(resultado)} − {money(totalPesos)} = {money(resultado - totalPesos)}
            </div>
          </div>
        )}
      </div>

      {resumen.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={th}>Empresa</th>
              <th style={th}>Socio</th>
              <th style={{ ...th, textAlign: "right" }}>Blanco</th>
              <th style={{ ...th, textAlign: "right" }}>Negro</th>
              <th style={{ ...th, textAlign: "right" }}>Total $</th>
              <th style={{ ...th, textAlign: "right" }}>U$S</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((x) => (
              <tr key={`${x.company}|${x.socio}`}>
                <td style={td}>{shortDe(x.company)}</td>
                <td style={td}>{x.socio} <span style={{ color: "#94a3b8" }}>({x.cantidad})</span></td>
                <td style={{ ...td, textAlign: "right" }}>{x.blanco ? money(x.blanco) : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>{x.negro ? money(x.negro) : "—"}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{money(x.total)}</td>
                <td style={{ ...td, textAlign: "right" }}>{x.usd ? money(x.usd, "USD") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {delPeriodo.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b" }}>No hay retiros en el período.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Empresa</th>
                <th style={th}>Socio</th>
                <th style={{ ...th, textAlign: "right" }}>Monto</th>
                <th style={th}>Moneda</th>
                <th style={th}>B/N</th>
                <th style={th}>Sale de</th>
                <th style={th}>Motivo</th>
                <th style={th}>Firmante</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {delPeriodo.map((r) => {
                const traba = bloqueado?.(r.company, r.fecha);
                return (
                  <tr key={r.id} style={traba ? { opacity: 0.6 } : undefined} title={traba ? "Ejercicio cerrado: solo el superadmin puede editarlo" : undefined}>
                    <td style={{ ...td, width: 130 }}>
                      <input style={input} type="date" disabled={traba} value={r.fecha} onChange={(e) => onUpdate(r.id, "fecha", e.target.value)} />
                    </td>
                    <td style={{ ...td, width: 110 }}>
                      <select style={input} disabled={traba} value={r.company} onChange={(e) => onUpdate(r.id, "company", e.target.value)}>
                        {companyOptions.filter((c) => c.value !== "General").map((c) => (
                          <option key={c.value} value={c.value}>{c.short || c.value}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, width: 140 }}>
                      <input style={input} disabled={traba} list="retiros-socios" value={r.socio} placeholder="Nombre del socio" onChange={(e) => onUpdate(r.id, "socio", e.target.value)} />
                    </td>
                    <td style={{ ...td, width: 120 }}>
                      <NumInput style={{ ...input, textAlign: "right" }} disabled={traba} value={r.monto || ""} onChange={(e) => onUpdate(r.id, "monto", Number(e.target.value) || 0)} />
                    </td>
                    <td style={{ ...td, width: 80 }}>
                      <select style={input} disabled={traba} value={r.moneda || "ARS"} onChange={(e) => onUpdate(r.id, "moneda", e.target.value)}>
                        <option value="ARS">$</option>
                        <option value="USD">U$S</option>
                      </select>
                    </td>
                    <td style={{ ...td, width: 90 }}>
                      <select
                        style={{ ...input, background: r.administration === "negro" ? "#1f2937" : "#fff", color: r.administration === "negro" ? "#fff" : "#0f172a" }}
                        disabled={traba}
                        value={r.administration}
                        onChange={(e) => onUpdate(r.id, "administration", e.target.value)}
                      >
                        <option value="blanco">Blanco</option>
                        <option value="negro">Negro</option>
                      </select>
                    </td>
                    <td style={{ ...td, width: 150 }}>
                      <select style={input} disabled={traba} value={r.cuentaId || ""} onChange={(e) => onUpdate(r.id, "cuentaId", e.target.value || undefined)}>
                        <option value="">Cuenta por defecto</option>
                        {cuentas
                          .filter((c) => c.company === r.company && c.activa !== false && (!c.moneda || c.moneda === (r.moneda || "ARS")))
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input style={input} disabled={traba} value={r.motivo || ""} placeholder="Ej. retiro mensual" onChange={(e) => onUpdate(r.id, "motivo", e.target.value)} />
                    </td>
                    <td style={{ ...td, width: 140 }}>
                      <FirmanteCelda value={r.firmante} firmadoEn={r.firmadoEn} />
                    </td>
                    <td style={{ ...td, width: 40 }}>
                      {!traba && (
                        <button
                          type="button"
                          style={{ border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 6, cursor: "pointer", padding: "2px 7px" }}
                          onClick={() => window.confirm("¿Borrar este retiro?") && onRemove(r.id)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
