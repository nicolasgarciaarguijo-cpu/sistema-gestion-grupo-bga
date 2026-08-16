import React, { useMemo, useState } from "react";
import { styles } from "../ui/styles";
import { Panel } from "../ui/primitives";
import { CALENDAR_SECTIONS, CALENDAR_ITEM_INDEX } from "../domain/calendarStructure";

// Calendario anual = la planilla de cash flow adentro del sistema. Estructura FIJA (chart of accounts):
// secciones → ítems, con total por sección. Días en columnas (año fiscal, scroll ←→). Cada movimiento
// se clasifica a un renglón (conceptKey); la sección Cobranzas es dinámica (por ppto · cliente).
// Lo que no está clasificado cae en "SIN CLASIFICAR" (ahí se enganchará el cruce con el banco).

type Entry = {
  id: string;
  date: string; // yyyy-mm-dd
  company: string;
  title: string;
  kind: string;
  amount: number;
  statusLabel?: string;
  subcat?: string;
  conceptKey?: string;
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

type AddForm = {
  date: string;
  company: string;
  sectionKey: string;
  itemKey: string;
  ppto: string;
  cliente: string;
  amount: number;
  administration: "blanco" | "negro";
  notes: string;
};

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
    conceptKey?: string;
    incomeCategory?: "trabajo" | "prestamo" | "financiero" | "varios";
  }) => void;
  money: (n: number, currency?: string) => string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState<null | AddForm>(null);
  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const months = useMemo(() => fiscalMonths(fiscalStartMonth || 11, fiscalStartYear), [fiscalStartMonth, fiscalStartYear]);
  const dayCols = useMemo(() => {
    const cols: Array<{ iso: string; day: number; monthIdx: number }> = [];
    months.forEach((m, monthIdx) => {
      for (let d = 1; d <= m.days; d += 1) cols.push({ iso: `${m.year}-${pad(m.month)}-${pad(d)}`, day: d, monthIdx });
    });
    return cols;
  }, [months]);

  const agg = useMemo(() => {
    const firstIso = dayCols[0]?.iso || "";
    const lastIso = dayCols[dayCols.length - 1]?.iso || "";
    const byConcept = new Map<string, Map<string, number>>(); // itemKey -> date -> monto
    const cobranzaDetail = new Map<string, Map<string, number>>(); // título -> date -> monto
    const cobranzaByDate = new Map<string, number>();
    const unclDetail = new Map<string, Map<string, number>>();
    const unclByDate = new Map<string, number>();
    const incomeByDate = new Map<string, number>();
    const egresoByDate = new Map<string, number>();
    const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) || 0) + v);
    const addDeep = (m: Map<string, Map<string, number>>, a: string, d: string, v: number) => {
      if (!m.has(a)) m.set(a, new Map());
      add(m.get(a)!, d, v);
    };
    entries.forEach((e) => {
      if (companyScope !== "__ALL__" && e.company !== companyScope) return;
      if (!e.date || e.date < firstIso || e.date > lastIso) return;
      const amt = Number(e.amount || 0);
      const title = (e.title || "—").trim();
      const isCobranza = e.kind === "cobranza" || e.conceptKey === "cobranzas";
      if (isCobranza) {
        addDeep(cobranzaDetail, title, e.date, amt);
        add(cobranzaByDate, e.date, amt);
        add(incomeByDate, e.date, amt);
        return;
      }
      const idx = e.conceptKey ? CALENDAR_ITEM_INDEX[e.conceptKey] : undefined;
      if (idx) {
        addDeep(byConcept, e.conceptKey!, e.date, amt);
        add(idx.dir === "in" ? incomeByDate : egresoByDate, e.date, amt);
        return;
      }
      // sin clasificar (acá caerá el banco hasta que se asigne a un renglón)
      addDeep(unclDetail, title, e.date, amt);
      add(unclByDate, e.date, amt);
    });
    return { byConcept, cobranzaDetail, cobranzaByDate, unclDetail, unclByDate, incomeByDate, egresoByDate };
  }, [entries, companyScope, dayCols]);

  const openAdd = (sectionKey: string, itemKey: string, iso: string) =>
    setAddForm({
      date: iso,
      company: companyScope !== "__ALL__" ? companyScope : companyOptions[0]?.value || "",
      sectionKey,
      itemKey,
      ppto: "",
      cliente: "",
      amount: 0,
      administration: "blanco",
      notes: "",
    });

  const confirmAdd = () => {
    if (!addForm || !(Number(addForm.amount) > 0) || !addForm.company) return;
    const section = CALENDAR_SECTIONS.find((s) => s.key === addForm.sectionKey);
    if (!section) return;
    const isCob = section.dynamic === "cobranzas";
    const type: "cobranza" | "pago" = section.dir === "in" ? "cobranza" : "pago";
    const cliente = addForm.cliente.trim();
    const ppto = addForm.ppto.trim();
    const itemLabel = isCob
      ? `${ppto ? ppto + " · " : ""}${cliente || "Cliente"}`
      : CALENDAR_ITEM_INDEX[addForm.itemKey]?.label || section.label;
    onAddMovement({
      company: addForm.company,
      date: addForm.date,
      type,
      amount: Number(addForm.amount),
      administration: addForm.administration,
      title: itemLabel,
      client: isCob ? cliente : "",
      jobCode: isCob ? ppto : "",
      notes: addForm.notes,
      conceptKey: isCob ? "cobranzas" : addForm.itemKey,
      incomeCategory: isCob ? "trabajo" : undefined,
    });
    setAddForm(null);
  };

  const cell = (m: Map<string, number> | undefined, iso: string) => (m ? m.get(iso) || 0 : 0);
  const sumItemsByDate = (itemKeys: string[]) => {
    const out = new Map<string, number>();
    itemKeys.forEach((k) => {
      const row = agg.byConcept.get(k);
      if (row) row.forEach((v, d) => out.set(d, (out.get(d) || 0) + v));
    });
    return out;
  };

  const detailRow = (label: string, drow: Map<string, number>, key: string, isOut: boolean) => (
    <tr key={key} style={{ background: "#f8fafc" }}>
      <td style={{ ...tdStickyLabel, background: "#f8fafc", paddingLeft: 38, fontWeight: 400, color: "#475569" }}>{label}</td>
      {dayCols.map((c) => {
        const v = drow.get(c.iso) || 0;
        return (
          <td key={`${key}-${c.iso}`} style={{ ...tdCell, color: v ? (isOut ? "#dc2626" : "#334155") : "#e2e8f0" }}>
            {v ? money(v) : "·"}
          </td>
        );
      })}
    </tr>
  );

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
          </div>
        }
      >
        <div style={{ ...styles.noticeBox, marginBottom: 10 }}>
          Tu planilla completa: secciones y renglones fijos, días en columnas (scroll ←→). Tocá cualquier
          celda para <strong>cargar</strong> en ese día/renglón. Cada sección muestra su <strong>total</strong>.
          Lo que aún no está clasificado cae en <strong>“Sin clasificar”</strong> (ahí se cruza el banco).
        </div>
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: "72vh" }}>
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
              {CALENDAR_SECTIONS.map((section) => {
                const isOut = section.dir === "out";
                const isCob = section.dynamic === "cobranzas";
                const totalByDate = isCob ? agg.cobranzaByDate : sumItemsByDate(section.items.map((i) => i.key));
                return (
                  <React.Fragment key={section.key}>
                    <tr>
                      <td style={{ ...tdStickyLabel, background: isOut ? "#fee2e2" : "#dcfce7", fontWeight: 800, color: isOut ? "#991b1b" : "#065f46" }}>
                        {section.label}
                      </td>
                      {dayCols.map((c) => <td key={`sh-${section.key}-${c.iso}`} style={{ ...tdCell, background: isOut ? "#fee2e2" : "#dcfce7" }}></td>)}
                    </tr>
                    {isCob
                      ? Array.from(agg.cobranzaDetail.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([title, drow]) =>
                          detailRow(title, drow, `cob-${title}`, false)
                        )
                      : section.items.map((it) => {
                          const drow = agg.byConcept.get(it.key);
                          return (
                            <tr key={it.key}>
                              <td style={{ ...tdStickyLabel, paddingLeft: 20, fontWeight: 500 }}>{it.label}</td>
                              {dayCols.map((c) => {
                                const v = drow?.get(c.iso) || 0;
                                return (
                                  <td
                                    key={`${it.key}-${c.iso}`}
                                    onClick={() => openAdd(section.key, it.key, c.iso)}
                                    title="Cargar en este día"
                                    style={{ ...tdCell, cursor: "pointer", fontWeight: 600, color: v ? (isOut ? "#dc2626" : "#16a34a") : "#cbd5e1" }}
                                  >
                                    {v ? money(v) : "+"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                    {isCob && (
                      <tr>
                        <td style={{ ...tdStickyLabel, paddingLeft: 20, color: "#065f46" }}>
                          <button style={miniAdd} onClick={() => openAdd(section.key, "", dayCols[0]?.iso || "")}>+ cargar cobranza</button>
                        </td>
                        {dayCols.map((c) => <td key={`cobadd-${c.iso}`} style={tdCell}></td>)}
                      </tr>
                    )}
                    <tr>
                      <td style={{ ...tdStickyLabel, fontWeight: 800, background: "#f1f5f9" }}>{section.totalLabel}</td>
                      {dayCols.map((c) => {
                        const v = totalByDate.get(c.iso) || 0;
                        return (
                          <td key={`st-${section.key}-${c.iso}`} style={{ ...tdCell, fontWeight: 800, background: "#f1f5f9", color: v ? (isOut ? "#dc2626" : "#16a34a") : "#cbd5e1" }}>
                            {v ? money(v) : "·"}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* SIN CLASIFICAR */}
              {agg.unclDetail.size > 0 && (
                <>
                  <tr>
                    <td
                      style={{ ...tdStickyLabel, background: "#fef9c3", fontWeight: 800, color: "#854d0e", cursor: "pointer" }}
                      onClick={() => toggle("uncl")}
                    >
                      {expanded.has("uncl") ? "▾ " : "▸ "}SIN CLASIFICAR · falta ubicar (D)
                    </td>
                    {dayCols.map((c) => {
                      const v = agg.unclByDate.get(c.iso) || 0;
                      return (
                        <td key={`unclh-${c.iso}`} style={{ ...tdCell, background: "#fef9c3", fontWeight: 700, color: v ? "#854d0e" : "#e2e8f0" }}>
                          {v ? money(v) : "·"}
                        </td>
                      );
                    })}
                  </tr>
                  {expanded.has("uncl") &&
                    Array.from(agg.unclDetail.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([title, drow]) =>
                      detailRow(title, drow, `uncl-${title}`, false)
                    )}
                </>
              )}

              {/* TOTALES */}
              <tr>
                <td style={{ ...tdStickyLabel, fontWeight: 800, background: "#ecfdf5", color: "#065f46" }}>TOTAL INGRESOS</td>
                {dayCols.map((c) => {
                  const v = agg.incomeByDate.get(c.iso) || 0;
                  return <td key={`ti-${c.iso}`} style={{ ...tdCell, fontWeight: 800, background: "#ecfdf5", color: v ? "#16a34a" : "#cbd5e1" }}>{v ? money(v) : "·"}</td>;
                })}
              </tr>
              <tr>
                <td style={{ ...tdStickyLabel, fontWeight: 800, background: "#fef2f2", color: "#991b1b" }}>TOTAL EGRESOS</td>
                {dayCols.map((c) => {
                  const v = agg.egresoByDate.get(c.iso) || 0;
                  return <td key={`te-${c.iso}`} style={{ ...tdCell, fontWeight: 800, background: "#fef2f2", color: v ? "#dc2626" : "#cbd5e1" }}>{v ? money(v) : "·"}</td>;
                })}
              </tr>
              <tr>
                <td style={{ ...tdStickyLabel, fontWeight: 900, background: "#e2e8f0" }}>NETO DEL DÍA</td>
                {dayCols.map((c) => {
                  const v = (agg.incomeByDate.get(c.iso) || 0) - (agg.egresoByDate.get(c.iso) || 0);
                  return <td key={`nd-${c.iso}`} style={{ ...tdCell, fontWeight: 900, background: "#e2e8f0", color: v > 0 ? "#16a34a" : v < 0 ? "#dc2626" : "#94a3b8" }}>{v ? money(v) : "·"}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {addForm && (() => {
        const section = CALENDAR_SECTIONS.find((s) => s.key === addForm.sectionKey);
        const isCob = section?.dynamic === "cobranzas";
        return (
          <div style={overlayStyle} onClick={() => setAddForm(null)}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>Cargar movimiento — {addForm.date}</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={lblStyle}>
                  Empresa
                  <select style={styles.input} value={addForm.company} onChange={(e) => setAddForm({ ...addForm, company: e.target.value })}>
                    {companyOptions.map((c) => <option key={c.value} value={c.value}>{c.short || c.value}</option>)}
                  </select>
                </label>
                <label style={lblStyle}>
                  Sección
                  <select style={styles.input} value={addForm.sectionKey} onChange={(e) => {
                    const s = CALENDAR_SECTIONS.find((x) => x.key === e.target.value);
                    setAddForm({ ...addForm, sectionKey: e.target.value, itemKey: s?.items[0]?.key || "" });
                  }}>
                    {CALENDAR_SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </label>
                {isCob ? (
                  <>
                    <label style={lblStyle}>N° presupuesto
                      <input style={styles.input} value={addForm.ppto} placeholder="Ej: 3199" onChange={(e) => setAddForm({ ...addForm, ppto: e.target.value })} />
                    </label>
                    <label style={lblStyle}>Cliente
                      <input style={styles.input} value={addForm.cliente} onChange={(e) => setAddForm({ ...addForm, cliente: e.target.value })} />
                    </label>
                  </>
                ) : (
                  <label style={lblStyle}>Renglón
                    <select style={styles.input} value={addForm.itemKey} onChange={(e) => setAddForm({ ...addForm, itemKey: e.target.value })}>
                      {(section?.items || []).map((it) => <option key={it.key} value={it.key}>{it.label}</option>)}
                    </select>
                  </label>
                )}
                <label style={lblStyle}>Monto ($)
                  <input style={styles.input} type="number" value={addForm.amount || ""} onChange={(e) => setAddForm({ ...addForm, amount: Number(e.target.value) })} />
                </label>
                <label style={lblStyle}>Circuito
                  <select style={styles.input} value={addForm.administration} onChange={(e) => setAddForm({ ...addForm, administration: e.target.value as "blanco" | "negro" })}>
                    <option value="blanco">Blanco</option>
                    <option value="negro">Negro</option>
                  </select>
                </label>
                <label style={lblStyle}>Notas (opcional)
                  <input style={styles.input} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                <button style={btnSecondary} onClick={() => setAddForm(null)}>Cancelar</button>
                <button style={btnPrimary} onClick={confirmAdd} disabled={!(Number(addForm.amount) > 0) || !addForm.company || (isCob ? false : !addForm.itemKey)}>
                  Guardar en el sistema
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const thStickyCorner: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 3, background: "#f1f5f9", textAlign: "left",
  padding: "6px 10px", borderBottom: "1px solid #e2e8f0", minWidth: 230,
};
const thMonth: React.CSSProperties = {
  padding: "4px 8px", background: "#e2e8f0", borderLeft: "2px solid #cbd5e1", fontWeight: 800, textAlign: "center",
};
const thDay: React.CSSProperties = {
  padding: "4px 6px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", minWidth: 56, textAlign: "right",
};
const tdStickyLabel: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 2, background: "#ffffff", padding: "5px 10px",
  borderBottom: "1px solid #f1f5f9", fontWeight: 600, minWidth: 230,
};
const tdCell: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", textAlign: "right", minWidth: 56,
};
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 18, width: "min(460px, 96vw)", maxHeight: "90vh",
  overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
};
const lblStyle: React.CSSProperties = { display: "grid", gap: 4, fontSize: 13, fontWeight: 600 };
const miniAdd: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 6, border: "1px dashed #86efac", background: "#f0fdf4", cursor: "pointer", fontSize: 12,
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600,
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "none", background: "#14213d", color: "#fff", cursor: "pointer", fontWeight: 700,
};
