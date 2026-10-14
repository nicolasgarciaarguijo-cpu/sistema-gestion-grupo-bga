// VIATICOS (solapa "Caja chica y viaticos"): los EVENTUALES (anticipo por viaje o trabajo, se rinde) y
// los FIJOS (parte del acuerdo de cada empleado; se fijan en su ficha de Personal y salen solos cada
// mes). Los dos van al renglon "Viaticos" del Calendario y a Compras y analisis de gastos.
import React from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import type { Viatico } from "../domain/types";

const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 12.5, width: "100%", boxSizing: "border-box" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

export function ViaticosPanel({
  viaticos,
  empleados,
  cuentas,
  companyOptions,
  money,
  onAdd,
  onUpdate,
  onRemove,
}: {
  viaticos: Viatico[];
  empleados: Array<{ id: number; name: string; company: string; viaticoFijo?: { blanco: number; negro: number; desde: string }; terminationDate?: string }>;
  cuentas: Array<{ id: string; company: string; nombre: string; activa?: boolean }>;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  money: (n: number) => string;
  onAdd: () => void;
  onUpdate: (id: number, field: keyof Viatico, value: unknown) => void;
  onRemove: (id: number) => void;
}) {
  const fijos = empleados.filter(
    (e) => !e.terminationDate && e.viaticoFijo && (Number(e.viaticoFijo.blanco || 0) > 0 || Number(e.viaticoFijo.negro || 0) > 0)
  );
  const totalFijoB = fijos.reduce((a, e) => a + Number(e.viaticoFijo?.blanco || 0), 0);
  const totalFijoN = fijos.reduce((a, e) => a + Number(e.viaticoFijo?.negro || 0), 0);
  const sinRendir = viaticos.filter((v) => !v.rendido);
  const nombres = Array.from(new Set(empleados.filter((e) => !e.terminationDate).map((e) => e.name))).sort();

  return (
    <>
      <datalist id="viaticos-personas">
        {nombres.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <Panel
        span="full"
        title="Viáticos eventuales (anticipos por viaje o trabajo)"
        actions={<ButtonLike onClick={onAdd}>+ Viático</ButtonLike>}
      >
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          La plata sale el día del anticipo, de la cuenta elegida, y va al renglón <strong>Viáticos</strong> del
          Calendario (gastos de personal en Compras y análisis de gastos). Blanco y negro por separado.
          {sinRendir.length > 0 && (
            <span style={{ color: "#b45309", fontWeight: 700 }}>
              {" "}· {sinRendir.length} sin rendir ({money(sinRendir.reduce((a, v) => a + Number(v.monto || 0), 0))})
            </span>
          )}
        </div>
        {viaticos.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>No hay viáticos cargados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={th}>Fecha</th>
                  <th style={th}>Empresa</th>
                  <th style={th}>Persona</th>
                  <th style={th}>Motivo / trabajo</th>
                  <th style={{ ...th, textAlign: "right" }}>Monto</th>
                  <th style={th}>B/N</th>
                  <th style={th}>Sale de</th>
                  <th style={th}>Rendido</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {viaticos.map((v) => (
                  <tr key={v.id} style={{ background: v.rendido ? undefined : "#fffbeb" }}>
                    <td style={{ ...td, width: 130 }}>
                      <input style={input} type="date" value={v.fecha} onChange={(e) => onUpdate(v.id, "fecha", e.target.value)} />
                    </td>
                    <td style={{ ...td, width: 120 }}>
                      <select style={input} value={v.company} onChange={(e) => onUpdate(v.id, "company", e.target.value)}>
                        {companyOptions.filter((c) => c.value !== "General").map((c) => (
                          <option key={c.value} value={c.value}>{c.short || c.label || c.value}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, width: 150 }}>
                      <input style={input} list="viaticos-personas" value={v.persona} placeholder="Nombre" onChange={(e) => onUpdate(v.id, "persona", e.target.value)} />
                    </td>
                    <td style={td}>
                      <input style={input} value={v.motivo} placeholder="Ej. viaje a obra Pilar" onChange={(e) => onUpdate(v.id, "motivo", e.target.value)} />
                    </td>
                    <td style={{ ...td, width: 120 }}>
                      <input style={{ ...input, textAlign: "right" }} type="number" value={v.monto || ""} onChange={(e) => onUpdate(v.id, "monto", Number(e.target.value) || 0)} />
                    </td>
                    <td style={{ ...td, width: 90 }}>
                      <select
                        style={{ ...input, background: v.administration === "negro" ? "#1f2937" : "#ffffff", color: v.administration === "negro" ? "#ffffff" : "#0f172a" }}
                        value={v.administration}
                        onChange={(e) => onUpdate(v.id, "administration", e.target.value)}
                      >
                        <option value="blanco">Blanco</option>
                        <option value="negro">Negro</option>
                      </select>
                    </td>
                    <td style={{ ...td, width: 150 }}>
                      <select style={input} value={v.cuentaId || ""} onChange={(e) => onUpdate(v.id, "cuentaId", e.target.value || undefined)}>
                        <option value="">Cuenta por defecto</option>
                        {cuentas.filter((c) => c.company === v.company && c.activa !== false).map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, width: 70, textAlign: "center" }}>
                      <input type="checkbox" checked={!!v.rendido} onChange={(e) => onUpdate(v.id, "rendido", e.target.checked)} />
                    </td>
                    <td style={{ ...td, width: 40 }}>
                      <button
                        type="button"
                        style={{ border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 6, cursor: "pointer", padding: "2px 7px" }}
                        onClick={() => window.confirm("¿Borrar este viático?") && onRemove(v.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel span="full" title="Viáticos fijos del personal (parte del acuerdo)">
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          Se fijan en la ficha de cada empleado (Personal → acuerdo: viático fijo mensual en blanco y en negro, desde
          qué mes). Salen solos cada mes, el día de pago del sueldo, al renglón <strong>Viáticos</strong>.
        </div>
        {fijos.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Nadie tiene viático fijo en su acuerdo.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={th}>Empleado</th>
                <th style={th}>Empresa</th>
                <th style={th}>Desde</th>
                <th style={{ ...th, textAlign: "right" }}>Blanco / mes</th>
                <th style={{ ...th, textAlign: "right" }}>Negro / mes</th>
              </tr>
            </thead>
            <tbody>
              {fijos.map((e) => (
                <tr key={e.id}>
                  <td style={td}>{e.name}</td>
                  <td style={td}>{companyOptions.find((c) => c.value === e.company)?.short || e.company}</td>
                  <td style={td}>{e.viaticoFijo?.desde ? `${e.viaticoFijo.desde.slice(5, 7)}/${e.viaticoFijo.desde.slice(0, 4)}` : "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{money(Number(e.viaticoFijo?.blanco || 0))}</td>
                  <td style={{ ...td, textAlign: "right" }}>{money(Number(e.viaticoFijo?.negro || 0))}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 800 }}>
                <td style={td} colSpan={3}>Total mensual</td>
                <td style={{ ...td, textAlign: "right" }}>{money(totalFijoB)}</td>
                <td style={{ ...td, textAlign: "right" }}>{money(totalFijoN)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
