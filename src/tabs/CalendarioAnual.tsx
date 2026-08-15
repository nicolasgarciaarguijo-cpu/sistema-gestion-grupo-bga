import React, { useMemo, useState } from "react";
import { styles } from "../ui/styles";
import { Panel } from "../ui/primitives";

// Calendario anual (solapa propia): la planilla de cash flow adentro del sistema.
// Días en COLUMNAS (año fiscal completo, scroll horizontal) y conceptos en FILAS. Se puebla con los
// movimientos que ya tiene el sistema. ZOOM: cada concepto se expande y discrimina sus ítems
// (proveedor/descripción + monto diferenciado). Fase 2 (próxima): editar celdas → clasificar → crear.

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

// Tipo de movimiento por defecto según la fila donde se carga (el usuario lo puede cambiar).
const KIND_TO_TYPE: Record<string, "facturacion" | "cobranza" | "pago"> = {
  cobranza: "cobranza",
  trabajo: "cobranza",
  facturacion: "facturacion",
  pago: "pago",
  compra: "pago",
  "caja-chica": "pago",
  desendeudamiento: "pago",
  banco: "pago",
};

const MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const pad = (n: number) => String(n).padStart(2, "0");

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

export function CalendarioAnualTab({
  entries,
  companyScope,
  setCompanyScope,
  fiscalStartYear,
  setFiscalStartYear,
  fiscalYearOptions,
  companyOptions,
  fiscalStartMonth = 11,
  onAddMovement,
  money,
}: {
  entries: Entry[];
  companyScope: string;
  setCompanyScope: (v: string) => void;
  fiscalStartYear: number;
  setFiscalStartYear: (v: number) => void;
  fiscalYearOptions: Array<{ value: number; label: string }>;
  companyOptions: Array<{ value: string; short?: string }>;
  fiscalStartMonth?: number;
  onAddMovement: (m: {
    company: string;
    date: string;
    type: "facturacion" | "cobranza" | "pago";
    amount: number;
    administration: "blanco" | "negro";
    title: string;
    client: string;
    jobCode: string;
    notes: string;
  }) => void;
  money: (n: number, currency?: string) => string;
}) {
  const [onlyWithData, setOnlyWithData] = useState(true);
  const [addForm, setAddForm] = useState<null | {
    date: string;
    company: string;
    type: "facturacion" | "cobranza" | "pago";
    amount: number;
    administration: "blanco" | "negro";
    party: string;
    notes: string;
  }>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (kind: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });
  const openAdd = (kind: string, iso: string) =>
    setAddForm({
      date: iso,
      company: companyScope !== "__ALL__" ? companyScope : companyOptions[0]?.value || "",
      type: KIND_TO_TYPE[kind] || "pago",
      amount: 0,
      administration: "blanco",
      party: "",
      notes: "",
    });
  const confirmAdd = () => {
    if (!addForm || !(Number(addForm.amount) > 0) || !addForm.company) return;
    const party = addForm.party.trim();
    onAddMovement({
      company: addForm.company,
      date: addForm.date,
      type: addForm.type,
      amount: Number(addForm.amount),
      administration: addForm.administration,
      title: party || (addForm.type === "cobranza" ? "Cobranza" : addForm.type === "pago" ? "Pago" : "Facturación"),
      client: party,
      jobCode: "",
      notes: addForm.notes,
    });
    setAddForm(null);
  };

  const months = useMemo(() => fiscalMonths(fiscalStartMonth || 11, fiscalStartYear), [fiscalStartMonth, fiscalStartYear]);

  const dayCols = useMemo(() => {
    const cols: Array<{ iso: string; day: number; monthIdx: number }> = [];
    months.forEach((m, monthIdx) => {
      for (let d = 1; d <= m.days; d += 1) cols.push({ iso: `${m.year}-${pad(m.month)}-${pad(d)}`, day: d, monthIdx });
    });
    return cols;
  }, [months]);

  // Agregación: total por (kind, día) + detalle por (kind, título, día) para el zoom.
  const { byKindDate, detailByKind, dayNet, hasData } = useMemo(() => {
    const firstIso = dayCols[0]?.iso || "";
    const lastIso = dayCols[dayCols.length - 1]?.iso || "";
    const byKindDate = new Map<string, Map<string, number>>();
    const detailByKind = new Map<string, Map<string, Map<string, number>>>();
    const dayNet = new Map<string, number>();
    const hasData = new Set<string>();
    entries.forEach((e) => {
      if (companyScope !== "__ALL__" && e.company !== companyScope) return;
      if (!e.date || e.date < firstIso || e.date > lastIso) return;
      const amt = Number(e.amount || 0);
      if (!byKindDate.has(e.kind)) byKindDate.set(e.kind, new Map());
      const row = byKindDate.get(e.kind)!;
      row.set(e.date, (row.get(e.date) || 0) + amt);
      // detalle por título (proveedor / descripción)
      if (!detailByKind.has(e.kind)) detailByKind.set(e.kind, new Map());
      const det = detailByKind.get(e.kind)!;
      const title = (e.title || "—").trim();
      if (!det.has(title)) det.set(title, new Map());
      const drow = det.get(title)!;
      drow.set(e.date, (drow.get(e.date) || 0) + amt);
      hasData.add(e.kind);
      const dir = ROW_ORDER.find((r) => r.kind === e.kind)?.dir || "none";
      if (dir !== "none") dayNet.set(e.date, (dayNet.get(e.date) || 0) + (dir === "in" ? amt : -amt));
    });
    return { byKindDate, detailByKind, dayNet, hasData };
  }, [entries, companyScope, dayCols]);

  const rows = ROW_ORDER.filter((r) => !onlyWithData || hasData.has(r.kind));
  const cell = (kind: string, iso: string): number => byKindDate.get(kind)?.get(iso) || 0;

  return (
    <div style={styles.column}>
      <Panel
        title="Calendario anual · la planilla de cash flow"
        span="full"
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select style={{ ...styles.input, width: "auto" }} value={companyScope} onChange={(e) => setCompanyScope(e.target.value)}>
              <option value="__ALL__">Todas las empresas</option>
              {companyOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.short || c.value}</option>
              ))}
            </select>
            <select style={{ ...styles.input, width: "auto" }} value={fiscalStartYear} onChange={(e) => setFiscalStartYear(Number(e.target.value))}>
              {fiscalYearOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={onlyWithData} onChange={(e) => setOnlyWithData(e.target.checked)} />
              Solo filas con datos
            </label>
          </div>
        }
      >
        <div style={{ ...styles.noticeBox, marginBottom: 10 }}>
          Días en columnas, conceptos en filas — a lo largo del año fiscal (scroll ←→). Tocá una fila
          para <strong>hacer zoom</strong> y ver cada ítem (proveedor/descripción) con su monto
          diferenciado. Se puebla con lo cargado. (Edición de celdas: próxima fase.)
        </div>
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={thStickyCorner}>Concepto</th>
                {months.map((m, i) => {
                  const span = dayCols.filter((c) => c.monthIdx === i).length;
                  if (span === 0) return null;
                  return <th key={`m-${i}`} colSpan={span} style={thMonth}>{m.label}</th>;
                })}
              </tr>
              <tr>
                <th style={thStickyCorner}></th>
                {dayCols.map((c) => <th key={`d-${c.iso}`} style={thDay}>{c.day}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = expanded.has(r.kind);
                const det = detailByKind.get(r.kind);
                return (
                  <React.Fragment key={r.kind}>
                    <tr>
                      <td
                        style={{ ...tdStickyLabel, cursor: "pointer", userSelect: "none" }}
                        onClick={() => toggle(r.kind)}
                        title="Zoom: ver el detalle"
                      >
                        {det && det.size > 0 ? (isOpen ? "▾ " : "▸ ") : ""}
                        {KIND_LABEL[r.kind] || r.kind}
                      </td>
                      {dayCols.map((c) => {
                        const v = cell(r.kind, c.iso);
                        return (
                          <td
                            key={`${r.kind}-${c.iso}`}
                            onClick={() => openAdd(r.kind, c.iso)}
                            title="Cargar un movimiento en este día"
                            style={{ ...tdCell, cursor: "pointer", fontWeight: 600, color: v ? (r.dir === "out" ? "#dc2626" : "#0f172a") : "#cbd5e1" }}
                          >
                            {v ? money(v) : "+"}
                          </td>
                        );
                      })}
                    </tr>
                    {isOpen && det &&
                      Array.from(det.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([title, drow]) => (
                          <tr key={`${r.kind}::${title}`} style={{ background: "#f8fafc" }}>
                            <td style={{ ...tdStickyLabel, background: "#f8fafc", paddingLeft: 24, fontWeight: 400, color: "#475569" }}>
                              {title}
                            </td>
                            {dayCols.map((c) => {
                              const v = drow.get(c.iso) || 0;
                              return (
                                <td key={`${title}-${c.iso}`} style={{ ...tdCell, color: v ? (r.dir === "out" ? "#dc2626" : "#334155") : "#e2e8f0" }}>
                                  {v ? money(v) : "·"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                  </React.Fragment>
                );
              })}
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

      {addForm && (
        <div style={overlayStyle} onClick={() => setAddForm(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Cargar movimiento — {addForm.date}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={lblStyle}>
                Empresa
                <select style={styles.input} value={addForm.company} onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}>
                  {companyOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.short || c.value}</option>
                  ))}
                </select>
              </label>
              <label style={lblStyle}>
                ¿Qué es?
                <select style={styles.input} value={addForm.type} onChange={(e) => setAddForm({ ...addForm, type: e.target.value as any })}>
                  <option value="cobranza">Cobranza (entra plata)</option>
                  <option value="pago">Pago (sale plata)</option>
                  <option value="facturacion">Facturación (registro)</option>
                </select>
              </label>
              <label style={lblStyle}>
                Monto ($)
                <input style={styles.input} type="number" value={addForm.amount || ""} onChange={(e) => setAddForm({ ...addForm, amount: Number(e.target.value) })} />
              </label>
              <label style={lblStyle}>
                Circuito
                <select style={styles.input} value={addForm.administration} onChange={(e) => setAddForm({ ...addForm, administration: e.target.value as "blanco" | "negro" })}>
                  <option value="blanco">Blanco</option>
                  <option value="negro">Negro</option>
                </select>
              </label>
              <label style={lblStyle}>
                {addForm.type === "pago" ? "Proveedor / a quién" : "Cliente / de quién"}
                <input style={styles.input} value={addForm.party} placeholder="Nombre" onChange={(e) => setAddForm({ ...addForm, party: e.target.value })} />
              </label>
              <label style={lblStyle}>
                Notas (opcional)
                <input style={styles.input} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button style={btnSecondary} onClick={() => setAddForm(null)}>Cancelar</button>
              <button style={btnPrimary} onClick={confirmAdd} disabled={!(Number(addForm.amount) > 0) || !addForm.company}>
                Guardar en el sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 18, width: "min(440px, 96vw)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};
const lblStyle: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13, fontWeight: 600 };
const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600,
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "none", background: "#14213d", color: "#fff", cursor: "pointer", fontWeight: 700,
};

const thStickyCorner: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 3, background: "#f1f5f9", textAlign: "left",
  padding: "6px 10px", borderBottom: "1px solid #e2e8f0", minWidth: 180,
};
const thMonth: React.CSSProperties = {
  padding: "4px 8px", background: "#e2e8f0", borderLeft: "2px solid #cbd5e1", fontWeight: 800, textAlign: "center",
};
const thDay: React.CSSProperties = {
  padding: "4px 6px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", minWidth: 56, textAlign: "right",
};
const tdStickyLabel: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 2, background: "#ffffff", padding: "6px 10px",
  borderBottom: "1px solid #f1f5f9", fontWeight: 600, minWidth: 180,
};
const tdCell: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", textAlign: "right", minWidth: 56,
};
