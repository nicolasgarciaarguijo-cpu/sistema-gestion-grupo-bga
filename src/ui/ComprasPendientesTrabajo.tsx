// COMPRAS PENDIENTES PARA FABRICACION, POR TRABAJO (Nicolas, 2026-10-23). El mismo bloque se ve en la ficha
// de cada trabajo y en el reporte de Compras (una ficha por trabajo). El contador de dias restantes sale de
// los bloques de fabricacion: el primer rubro del Gantt que arranca (ver domain/ganttFabricacion
// `fechaLimiteCompra`). El faltante es el de domain/materialNeeds: el stock ya repartido entre los
// trabajos abiertos, primero los que arrancan antes.
import React from "react";
import type { JobMaterialNeedRow } from "../domain/materialNeeds";
import { nivelDias, type FechaLimiteCompra } from "../domain/ganttFabricacion";

export type CompraPendienteTrabajo = {
  jobId: number;
  company: string;
  budgetNumber: string;
  client: string;
  faltantes: JobMaterialNeedRow[];
  estimado: number;
  limite: FechaLimiteCompra;
  dias: number | null;
};

const COLOR = {
  rojo: { bg: "#fef2f2", fg: "#b91c1c", borde: "#fecaca" },
  amarillo: { bg: "#fefce8", fg: "#a16207", borde: "#fde68a" },
  verde: { bg: "#f0fdf4", fg: "#166534", borde: "#bbf7d0" },
  gris: { bg: "#f8fafc", fg: "#475569", borde: "#e2e8f0" },
};
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "3px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5 };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
const ddmmaa = (iso: string) => iso.split("-").reverse().join("/");

export function ContadorDias({ dias, limite }: { dias: number | null; limite: FechaLimiteCompra }) {
  const c = COLOR[nivelDias(dias)];
  return (
    <span
      title={limite ? `Hay que tener el material para el ${ddmmaa(limite.fecha)} (${limite.origen})` : "Sin fecha: planificalo en el Gantt de fabricación"}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: 74, padding: "3px 8px", borderRadius: 8, background: c.bg, color: c.fg, border: `1px solid ${c.borde}`, lineHeight: 1.15 }}
    >
      <strong style={{ fontSize: 17 }}>{dias == null ? "—" : dias < 0 ? `${-dias}` : dias}</strong>
      <span style={{ fontSize: 10, fontWeight: 700 }}>{dias == null ? "sin fecha" : dias < 0 ? "días vencida" : dias === 1 ? "día" : "días"}</span>
    </span>
  );
}

export function ComprasPendientesTrabajo({
  c,
  money,
  companyShort,
  onAbrirTrabajo,
  onIrAFabricacion,
  mostrarEncabezado = true,
}: {
  c: CompraPendienteTrabajo;
  money: (n: number) => string;
  companyShort?: (company: string) => string;
  onAbrirTrabajo?: (jobId: number) => void;
  onIrAFabricacion?: () => void;
  mostrarEncabezado?: boolean;
}) {
  const nivel = nivelDias(c.dias);
  return (
    <div style={{ border: `1px solid ${COLOR[nivel].borde}`, borderLeft: `4px solid ${COLOR[nivel].fg}`, borderRadius: 8, background: "#fff", padding: "8px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ContadorDias dias={c.dias} limite={c.limite} />
          <div>
            {mostrarEncabezado ? (
              <strong>
                {c.budgetNumber} · {c.client}
                {companyShort && <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11.5 }}> {companyShort(c.company)}</span>}
              </strong>
            ) : (
              <strong>Compras pendientes para fabricación</strong>
            )}
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {c.faltantes.length} material(es) por comprar · estimado {money(c.estimado)}
              {c.limite ? ` · para el ${ddmmaa(c.limite.fecha)} (${c.limite.origen})` : " · sin fecha: planificalo en el Gantt de fabricación"}
            </div>
          </div>
        </div>
        <span style={{ display: "inline-flex", gap: 6 }}>
          {onIrAFabricacion && <button type="button" style={btn} onClick={onIrAFabricacion}>Ver en el Gantt</button>}
          {onAbrirTrabajo && <button type="button" style={btn} onClick={() => onAbrirTrabajo(c.jobId)}>Abrir la ficha del trabajo</button>}
        </span>
      </div>
      {c.faltantes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#166534", fontWeight: 700 }}>✓ No falta nada: el stock alcanza para este trabajo.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Material</th>
              <th style={{ ...th, textAlign: "right" }}>Necesita</th>
              <th style={{ ...th, textAlign: "right" }}>De stock</th>
              <th style={{ ...th, textAlign: "right" }}>Falta</th>
              <th style={{ ...th, textAlign: "right" }}>Estimado</th>
            </tr>
          </thead>
          <tbody>
            {c.faltantes.map((r, i) => (
              <tr key={`${r.description}-${i}`}>
                <td style={td}>{r.description}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.required} <span style={{ color: "#94a3b8" }}>{r.unit}</span></td>
                <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{r.allocated}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, color: r.allocated > 0 ? "#a16207" : "#b91c1c" }}>{r.missing} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{r.unit}</span></td>
                <td style={{ ...td, textAlign: "right" }}>{money(r.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
