import React, { useMemo, useState } from "react";
import { styles } from "../ui/styles";
import { Panel } from "../ui/primitives";

// Calendario anual (Fase 1, solo lectura): la planilla de cash flow adentro del sistema.
// Días en COLUMNAS (todo el año fiscal, scroll horizontal) y conceptos en FILAS. Se puebla con los
// movimientos que ya tiene el sistema (annualCashFlowEntries), agregados por (concepto, día).
// Fases próximas: edición de celdas con el formulario de clasificación (crea el movimiento en el sistema).

type Entry = {
  id: string;
  date: string; // yyyy-mm-dd
  company: string;
  title: string;
  kind: string;
  amount: number;
  statusLabel?: string;
};

const KIND_LABEL: Record<string, string> = {
  facturacion: "Facturación",
  cobranza: "Cobranzas (entra)",
  pago: "Pagos (sale)",
  compra: "Compras",
  "caja-chica": "Caja chica",
  desendeudamiento: "Desendeudamiento",
  banco: "Banco",
  trabajo: "Trabajos",
};
// Orden de las filas y si el concepto suma (in) o resta (out) al neto del día.
const ROW_ORDER: Array<{ kind: string; dir: "in" | "out" | "none" }> = [
  { kind: "cobranza", dir: "in" },
  { kind: "facturacion", dir: "none" },
  { kind: "pago", dir: "out" },
  { kind: "compra", dir: "out" },
  { kind: "caja-chica", dir: "out" },
  { kind: "desendeudamiento", dir: "out" },
  { kind: "banco", dir: "none" },
  { kind: "trabajo", dir: "none" },
];

const MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

// 12 meses del año fiscal desde (startMonth 1-12, startYear).
function fiscalMonths(startMonth: number, startYear: number) {
  const out: Array<{ year: number; month: number; days: number; label: string }> = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    out.push({ year, month, days: new Date(year, month, 0).getDate(), label: `${MES[month - 1]} ${year}` });
  }
  return out;
}

export function CalendarioAnualPanel({
  entries,
  companyScope,
  fiscalStartMonth,
  fiscalStartYear,
  money,
}: {
  entries: Entry[];
  companyScope: string; // "__ALL__" o el nombre de empresa
  fiscalStartMonth: number;
  fiscalStartYear: number;
  money: (n: number, currency?: string) => string;
}) {
  const [onlyWithData, setOnlyWithData] = useState(true);

  const months = useMemo(
    () => fiscalMonths(fiscalStartMonth || 11, fiscalStartYear),
    [fiscalStartMonth, fiscalStartYear]
  );

  // Columnas: todos los días del año fiscal en orden.
  const dayCols = useMemo(() => {
    const cols: Array<{ iso: string; day: number; monthIdx: number }> = [];
    months.forEach((m, monthIdx) => {
      for (let d = 1; d <= m.days; d += 1) {
        cols.push({ iso: `${m.year}-${pad(m.month)}-${pad(d)}`, day: d, monthIdx });
      }
    });
    return cols;
  }, [months]);

  // Agregación: monto por (kind, día). Solo entradas del scope y del rango fiscal.
  const { byKindDate, dayNet, hasData } = useMemo(() => {
    const firstIso = dayCols[0]?.iso || "";
    const lastIso = dayCols[dayCols.length - 1]?.iso || "";
    const byKindDate = new Map<string, Map<string, number>>();
    const dayNet = new Map<string, number>();
    const hasData = new Set<string>();
    entries.forEach((e) => {
      if (companyScope !== "__ALL__" && e.company !== companyScope) return;
      if (!e.date || e.date < firstIso || e.date > lastIso) return;
      const amt = Number(e.amount || 0);
      if (!byKindDate.has(e.kind)) byKindDate.set(e.kind, new Map());
      const row = byKindDate.get(e.kind)!;
      row.set(e.date, (row.get(e.date) || 0) + amt);
      hasData.add(e.kind);
      const dir = ROW_ORDER.find((r) => r.kind === e.kind)?.dir || "none";
      if (dir !== "none") dayNet.set(e.date, (dayNet.get(e.date) || 0) + (dir === "in" ? amt : -amt));
    });
    return { byKindDate, dayNet, hasData };
  }, [entries, companyScope, dayCols]);

  const rows = ROW_ORDER.filter((r) => !onlyWithData || hasData.has(r.kind));

  const cell = (kind: string, iso: string): number => byKindDate.get(kind)?.get(iso) || 0;

  return (
    <Panel
      title="Calendario anual · la planilla de cash flow"
      span="full"
      actions={
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={onlyWithData} onChange={(e) => setOnlyWithData(e.target.checked)} />
          Solo filas con datos
        </label>
      }
    >
      <div style={{ ...styles.noticeBox, marginBottom: 10 }}>
        Días en columnas, conceptos en filas — a lo largo del año fiscal. Scrolleá ←→. Se puebla con lo
        que ya está cargado. (Fase 1: solo lectura; la edición de celdas viene después.)
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
          <thead>
            {/* Fila de meses */}
            <tr>
              <th style={thStickyCorner}>Concepto</th>
              {months.map((m, i) => {
                const span = dayCols.filter((c) => c.monthIdx === i).length;
                if (span === 0) return null;
                return (
                  <th key={`m-${i}`} colSpan={span} style={{ ...thMonth, textAlign: "center" }}>
                    {m.label}
                  </th>
                );
              })}
            </tr>
            {/* Fila de días */}
            <tr>
              <th style={thStickyCorner2}></th>
              {dayCols.map((c) => (
                <th key={`d-${c.iso}`} style={thDay}>{c.day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kind}>
                <td style={tdStickyLabel}>{KIND_LABEL[r.kind] || r.kind}</td>
                {dayCols.map((c) => {
                  const v = cell(r.kind, c.iso);
                  return (
                    <td key={`${r.kind}-${c.iso}`} style={{ ...tdCell, color: v ? (r.dir === "out" ? "#dc2626" : "#0f172a") : "#cbd5e1" }}>
                      {v ? money(v) : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Saldo/neto del día */}
            <tr>
              <td style={{ ...tdStickyLabel, fontWeight: 800 }}>Neto del día</td>
              {dayCols.map((c) => {
                const v = dayNet.get(c.iso) || 0;
                return (
                  <td key={`net-${c.iso}`} style={{ ...tdCell, fontWeight: 700, color: v > 0 ? "#16a34a" : v < 0 ? "#dc2626" : "#cbd5e1" }}>
                    {v ? money(v) : "·"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const thStickyCorner: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 3, background: "#f1f5f9", textAlign: "left",
  padding: "6px 10px", borderBottom: "1px solid #e2e8f0", minWidth: 160,
};
const thStickyCorner2: React.CSSProperties = { ...thStickyCorner, top: 0 };
const thMonth: React.CSSProperties = {
  padding: "4px 8px", background: "#e2e8f0", borderLeft: "2px solid #cbd5e1", fontWeight: 800,
};
const thDay: React.CSSProperties = {
  padding: "4px 6px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", minWidth: 54, textAlign: "right",
};
const tdStickyLabel: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 2, background: "#ffffff", padding: "6px 10px",
  borderBottom: "1px solid #f1f5f9", fontWeight: 600, minWidth: 160,
};
const tdCell: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", textAlign: "right", minWidth: 54,
};
