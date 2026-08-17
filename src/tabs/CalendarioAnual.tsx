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
  administration?: "blanco" | "negro";
  currency?: "ARS" | "USD";
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
  costKind: "" | "fijo" | "variable";
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
  onAssignConcept,
  bnaCompra,
  money,
}: {
  entries: Entry[];
  companyScope: string;
  setCompanyScope: (v: string) => void;
  fiscalStartYear: number;
  setFiscalStartYear: (v: number) => void;
  fiscalYearOptions: Array<{ value: number; label: string }>;
  companyOptions: Array<{ value: string; short?: string; primary?: string }>;
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
    costKind?: "fijo" | "variable";
  }) => void;
  onAssignConcept: (bankIds: number[], conceptKey: string) => void;
  bnaCompra: number;
  money: (n: number, currency?: string) => string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState<null | AddForm>(null);
  const [monthMode, setMonthMode] = useState(true); // un mes por vez (liviano); off = año completo
  const [monthIdx, setMonthIdx] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); // secciones minimizadas (solo total)
  const toggleCollapse = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const allCollapsed = collapsed.size >= 16;
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

  // Columnas a MOSTRAR: un mes (liviano) o todo el año. La agregación se hace sobre el año completo
  // (dayCols); acá solo cambia lo que se pinta.
  const idx = Math.min(Math.max(0, monthIdx), months.length - 1);
  const visibleMonths = monthMode ? [months[idx]] : months;
  const visibleDayCols = useMemo(
    () => (monthMode ? dayCols.filter((c) => c.monthIdx === idx) : dayCols),
    [dayCols, monthMode, idx]
  );

  const agg = useMemo(() => {
    const firstIso = dayCols[0]?.iso || "";
    const lastIso = dayCols[dayCols.length - 1]?.iso || "";
    const byConcept = new Map<string, Map<string, number>>(); // itemKey -> date -> monto
    const cobranzaDetail = new Map<string, Map<string, number>>(); // título -> date -> monto
    const cobranzaByDate = new Map<string, number>();
    const unclDetail = new Map<string, Map<string, number>>();
    const unclByDate = new Map<string, number>();
    const unclTitleTotal = new Map<string, number>(); // título -> total firmado (para ver el impacto)
    const unclBankIds = new Map<string, number[]>(); // título -> ids de bankStatementEntry (para asignar en bloque)
    const incomeByDate = new Map<string, number>();
    const egresoByDate = new Map<string, number>();
    // Totales SIEMPRE separados blanco/negro (el "×4" se completa con el selector de empresa).
    const incB = new Map<string, number>(); const incN = new Map<string, number>();
    const egrB = new Map<string, number>(); const egrN = new Map<string, number>();
    // USD aparte: $ y U$S NUNCA se suman. Se muestran con pill U$S + estimado en pesos (compra BNA).
    const usdDetail = new Map<string, Map<string, number>>();
    const usdTitleTotal = new Map<string, number>();
    const usdByDate = new Map<string, number>();
    // Comisiones (egreso comercial), por nombre de trabajo.
    const comisionDetail = new Map<string, Map<string, number>>();
    const comisionByDate = new Map<string, number>();
    // Totales por SECCIÓN separados blanco/negro (para mostrar debajo del total de cada sección).
    const secB = new Map<string, Map<string, number>>();
    const secN = new Map<string, Map<string, number>>();
    // Cuando scope=Todas: desglose de los grandes totales POR EMPRESA (el "×4" a la vista, con color).
    const compIncB = new Map<string, Map<string, number>>();
    const compIncN = new Map<string, Map<string, number>>();
    const compEgrB = new Map<string, Map<string, number>>();
    const compEgrN = new Map<string, Map<string, number>>();
    const companiesSeen = new Set<string>();
    const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) || 0) + v);
    const addDeep = (m: Map<string, Map<string, number>>, a: string, d: string, v: number) => {
      if (!m.has(a)) m.set(a, new Map());
      add(m.get(a)!, d, v);
    };
    // Registra el movimiento (ya firmado por dirección) en los mapas por sección y por empresa.
    const track = (sectionKey: string, dir: "in" | "out", neg: boolean, company: string, date: string, amt: number) => {
      addDeep(neg ? secN : secB, sectionKey, date, amt);
      if (company) {
        companiesSeen.add(company);
        const cm = dir === "in" ? (neg ? compIncN : compIncB) : (neg ? compEgrN : compEgrB);
        addDeep(cm, company, date, amt);
      }
    };
    entries.forEach((e) => {
      if (companyScope !== "__ALL__" && e.company !== companyScope) return;
      if (!e.date || e.date < firstIso || e.date > lastIso) return;
      // El calendario se alimenta de la plata REAL: movimientos del banco + cobranzas + lo cargado a
      // mano (con renglón). NO metemos compras/caja chica/facturación/desendeudamiento: esa misma plata
      // ya viene por el débito del banco, así evitamos duplicar en "Sin clasificar" y en los totales.
      const isCalendarSource = e.kind === "banco" || e.kind === "cobranza" || e.kind === "comision" || !!e.conceptKey;
      if (!isCalendarSource) return;
      const amt = Number(e.amount || 0);
      const title = (e.title || "—").trim();
      // USD: se acumula aparte (firmado por crédito/débito), nunca en los mapas de pesos.
      if (e.currency === "USD") {
        const signedUsd = e.statusLabel === "debito" ? -amt : amt;
        addDeep(usdDetail, title, e.date, signedUsd);
        add(usdTitleTotal, title, signedUsd);
        add(usdByDate, e.date, signedUsd);
        return;
      }
      const isCobranza = e.kind === "cobranza" || e.conceptKey === "cobranzas";
      const neg = e.administration === "negro";
      if (e.kind === "comision") {
        addDeep(comisionDetail, title, e.date, amt);
        add(comisionByDate, e.date, amt);
        add(egresoByDate, e.date, amt);
        add(neg ? egrN : egrB, e.date, amt);
        track("gastos_comerciales", "out", neg, e.company, e.date, amt);
        return;
      }
      if (isCobranza) {
        addDeep(cobranzaDetail, title, e.date, amt);
        add(cobranzaByDate, e.date, amt);
        add(incomeByDate, e.date, amt);
        add(neg ? incN : incB, e.date, amt);
        track("cobranzas", "in", neg, e.company, e.date, amt);
        return;
      }
      const idx = e.conceptKey ? CALENDAR_ITEM_INDEX[e.conceptKey] : undefined;
      if (idx) {
        addDeep(byConcept, e.conceptKey!, e.date, amt);
        add(idx.dir === "in" ? incomeByDate : egresoByDate, e.date, amt);
        if (idx.dir === "in") add(neg ? incN : incB, e.date, amt);
        else add(neg ? egrN : egrB, e.date, amt);
        track(idx.sectionKey, idx.dir, neg, e.company, e.date, amt);
        return;
      }
      // sin clasificar (acá cae el banco hasta que se asigne a un renglón). Firmamos el monto por el
      // tipo de movimiento: crédito = ingreso (+, negro), débito = egreso (−, rojo), para ver el impacto.
      const signed = e.statusLabel === "debito" ? -amt : amt;
      addDeep(unclDetail, title, e.date, signed);
      add(unclByDate, e.date, signed);
      add(unclTitleTotal, title, signed);
      if (e.kind === "banco" && e.id.startsWith("bank-")) {
        const bankId = Number(e.id.slice(5));
        if (bankId) {
          if (!unclBankIds.has(title)) unclBankIds.set(title, []);
          unclBankIds.get(title)!.push(bankId);
        }
      }
    });
    return { byConcept, cobranzaDetail, cobranzaByDate, unclDetail, unclByDate, unclTitleTotal, unclBankIds, incomeByDate, egresoByDate, incB, incN, egrB, egrN, usdDetail, usdTitleTotal, usdByDate, comisionDetail, comisionByDate, secB, secN, compIncB, compIncN, compEgrB, compEgrN, companiesSeen };
  }, [entries, companyScope, dayCols]);

  // Color y sigla por empresa para el desglose cuando scope=Todas.
  const companyMeta = useMemo(() => {
    const m = new Map<string, { short: string; color: string }>();
    companyOptions.forEach((c) => m.set(c.value, { short: c.short || c.value, color: c.primary || "#64748b" }));
    return m;
  }, [companyOptions]);
  const showByCompany = companyScope === "__ALL__" && agg.companiesSeen.size > 1;

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
      costKind: "",
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
      costKind: type === "pago" && addForm.costKind ? addForm.costKind : undefined,
    });
    setAddForm(null);
  };

  const cell = (m: Map<string, number> | undefined, iso: string) => (m ? m.get(iso) || 0 : 0);
  // Una fila dinámica (cliente/trabajo) solo se muestra si tiene MOVIMIENTO en el período visible.
  // Así un cliente que terminó su trabajo no ocupa espacio en los meses siguientes; si vuelve a comprar
  // (nueva cobranza), reaparece solo en el mes en que se mueve.
  const activeInView = (drow: Map<string, number>) => visibleDayCols.some((c) => (drow.get(c.iso) || 0) !== 0);
  const sumItemsByDate = (itemKeys: string[]) => {
    const out = new Map<string, number>();
    itemKeys.forEach((k) => {
      const row = agg.byConcept.get(k);
      if (row) row.forEach((v, d) => out.set(d, (out.get(d) || 0) + v));
    });
    return out;
  };

  // Sub-fila compacta de subtotal (blanco/negro o por empresa), con marca de color a la izquierda.
  const subtotalRow = (
    label: string,
    drow: Map<string, number> | undefined,
    key: string,
    isOut: boolean,
    dotColor: string,
    bg: string
  ) => {
    if (!drow || !visibleDayCols.some((c) => (drow.get(c.iso) || 0) !== 0)) return null;
    return (
      <tr key={key} style={{ background: bg }}>
        <td style={{ ...tdStickyLabel, background: bg, paddingLeft: 30, fontWeight: 600, fontSize: 11, color: "#475569" }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: dotColor, marginRight: 6 }} />
          {label}
        </td>
        {visibleDayCols.map((c) => {
          const v = drow.get(c.iso) || 0;
          return (
            <td key={`${key}-${c.iso}`} style={{ ...tdCell, fontSize: 11, background: bg, color: v ? (isOut ? "#dc2626" : "#334155") : "#e2e8f0" }}>
              {v ? money(v) : "·"}
            </td>
          );
        })}
      </tr>
    );
  };

  const detailRow = (label: string, drow: Map<string, number>, key: string, isOut: boolean) => (
    <tr key={key} style={{ background: "#f8fafc" }}>
      <td style={{ ...tdStickyLabel, background: "#f8fafc", paddingLeft: 38, fontWeight: 400, color: "#475569" }}>{label}</td>
      {visibleDayCols.map((c) => {
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
            {monthMode && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button style={btnSecondary} onClick={() => setMonthIdx((v) => Math.max(0, v - 1))} disabled={idx <= 0}>‹</button>
                <strong style={{ minWidth: 120, textAlign: "center", textTransform: "capitalize" }}>{months[idx]?.label}</strong>
                <button style={btnSecondary} onClick={() => setMonthIdx((v) => Math.min(months.length - 1, v + 1))} disabled={idx >= months.length - 1}>›</button>
              </div>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={!monthMode} onChange={(e) => setMonthMode(!e.target.checked)} />
              Año completo
            </label>
            <button
              style={btnSecondary}
              onClick={() => setCollapsed(allCollapsed ? new Set() : new Set([...CALENDAR_SECTIONS.map((s) => s.key), "uncl"]))}
            >
              {allCollapsed ? "Expandir todo" : "Minimizar todo"}
            </button>
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
                {visibleMonths.map((m) => {
                  const mi = months.indexOf(m);
                  const span = visibleDayCols.filter((c) => c.monthIdx === mi).length;
                  if (span === 0) return null;
                  return <th key={`m-${mi}`} colSpan={span} style={thMonth}>{m.label}</th>;
                })}
              </tr>
              <tr>
                <th style={thStickyCorner}></th>
                {visibleDayCols.map((c) => <th key={`d-${c.iso}`} style={thDay}>{c.day}</th>)}
              </tr>
            </thead>
            <tbody>
              {CALENDAR_SECTIONS.map((section) => {
                const isOut = section.dir === "out";
                const isCob = section.dynamic === "cobranzas";
                const isComerciales = section.key === "gastos_comerciales";
                const isCol = collapsed.has(section.key);
                const totalByDate = isCob
                  ? agg.cobranzaByDate
                  : (() => {
                      const m = sumItemsByDate(section.items.map((i) => i.key));
                      if (isComerciales) agg.comisionByDate.forEach((v, d) => m.set(d, (m.get(d) || 0) + v));
                      return m;
                    })();
                return (
                  <React.Fragment key={section.key}>
                    <tr>
                      <td
                        style={{ ...tdStickyLabel, background: isOut ? "#fee2e2" : "#dcfce7", fontWeight: 800, color: isOut ? "#991b1b" : "#065f46", cursor: "pointer", userSelect: "none" }}
                        onClick={() => toggleCollapse(section.key)}
                        title="Minimizar / expandir la sección"
                      >
                        {isCol ? "▸ " : "▾ "}{section.label}
                      </td>
                      {visibleDayCols.map((c) => <td key={`sh-${section.key}-${c.iso}`} style={{ ...tdCell, background: isOut ? "#fee2e2" : "#dcfce7" }}></td>)}
                    </tr>
                    {!isCol && (isCob
                      ? Array.from(agg.cobranzaDetail.entries()).filter(([, drow]) => activeInView(drow)).sort((a, b) => a[0].localeCompare(b[0])).map(([title, drow]) =>
                          detailRow(title, drow, `cob-${title}`, false)
                        )
                      : section.items.map((it) => {
                          const drow = agg.byConcept.get(it.key);
                          return (
                            <tr key={it.key}>
                              <td style={{ ...tdStickyLabel, paddingLeft: 20, fontWeight: 500 }}>{it.label}</td>
                              {visibleDayCols.map((c) => {
                                const v = drow?.get(c.iso) || 0;
                                return (
                                  <td
                                    key={`${it.key}-${c.iso}`}
                                    onClick={() => openAdd(section.key, it.key, c.iso)}
                                    title="Cargar en este día"
                                    style={{ ...tdCell, cursor: "pointer", fontWeight: 600, color: v ? (isOut ? "#dc2626" : "#0f172a") : "#cbd5e1" }}
                                  >
                                    {v ? money(v) : "+"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                    )}
                    {!isCol && isCob && (
                      <tr>
                        <td style={{ ...tdStickyLabel, paddingLeft: 20, color: "#065f46" }}>
                          <button style={miniAdd} onClick={() => openAdd(section.key, "", visibleDayCols[0]?.iso || "")}>+ cargar cobranza</button>
                        </td>
                        {visibleDayCols.map((c) => <td key={`cobadd-${c.iso}`} style={tdCell}></td>)}
                      </tr>
                    )}
                    {!isCol && isComerciales &&
                      Array.from(agg.comisionDetail.entries())
                        .filter(([, drow]) => activeInView(drow))
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([title, drow]) => detailRow(`Comisión · ${title}`, drow, `com-${title}`, true))}
                    <tr>
                      <td style={{ ...tdStickyLabel, fontWeight: 800, background: "#f1f5f9" }}>{section.totalLabel}</td>
                      {visibleDayCols.map((c) => {
                        const v = totalByDate.get(c.iso) || 0;
                        return (
                          <td key={`st-${section.key}-${c.iso}`} style={{ ...tdCell, fontWeight: 800, background: "#f1f5f9", color: v ? (isOut ? "#dc2626" : "#0f172a") : "#cbd5e1" }}>
                            {v ? money(v) : "·"}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Subtotal de la sección separado blanco / negro (solo si la sección está expandida) */}
                    {!isCol && subtotalRow(`${section.totalLabel} · blanco`, agg.secB.get(section.key), `stb-${section.key}`, isOut, "#cbd5e1", "#f8fafc")}
                    {!isCol && subtotalRow(`${section.totalLabel} · negro`, agg.secN.get(section.key), `stn-${section.key}`, isOut, "#334155", "#eef2f7")}
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
                    {visibleDayCols.map((c) => {
                      const v = agg.unclByDate.get(c.iso) || 0;
                      return (
                        <td key={`unclh-${c.iso}`} style={{ ...tdCell, background: "#fef9c3", fontWeight: 700, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#e2e8f0" }}>
                          {v ? money(Math.abs(v)) : "·"}
                        </td>
                      );
                    })}
                  </tr>
                  {expanded.has("uncl") &&
                    Array.from(agg.unclDetail.entries()).filter(([, drow]) => activeInView(drow)).sort((a, b) => a[0].localeCompare(b[0])).map(([title, drow]) => {
                      const ids = agg.unclBankIds.get(title) || [];
                      return (
                        <tr key={`uncl-${title}`} style={{ background: "#fffbeb" }}>
                          <td style={{ ...tdStickyLabel, background: "#fffbeb", paddingLeft: 24 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {(() => {
                                const tot = agg.unclTitleTotal.get(title) || 0;
                                return (
                                  <span style={{ fontWeight: 400, color: "#475569" }}>
                                    {title}{ids.length > 1 ? ` · ${ids.length} mov.` : ""}
                                    {" "}
                                    <strong style={{ color: tot > 0 ? "#0f172a" : tot < 0 ? "#dc2626" : "#94a3b8" }}>
                                      ({tot > 0 ? "ingreso" : "egreso"} {money(Math.abs(tot))})
                                    </strong>
                                  </span>
                                );
                              })()}
                              {ids.length > 0 && (
                                <select
                                  style={{ ...styles.input, fontSize: 11, padding: "2px 4px", minWidth: 200 }}
                                  value=""
                                  onChange={(e) => { if (e.target.value) onAssignConcept(ids, e.target.value); }}
                                >
                                  <option value="">→ asignar a renglón…</option>
                                  {CALENDAR_SECTIONS.filter((s) => s.items.length > 0).map((s) => (
                                    <optgroup key={s.key} label={s.label}>
                                      {s.items.map((it) => <option key={it.key} value={it.key}>{it.label}</option>)}
                                    </optgroup>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          {visibleDayCols.map((c) => {
                            const v = drow.get(c.iso) || 0;
                            return (
                              <td key={`uncl-${title}-${c.iso}`} style={{ ...tdCell, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#e2e8f0" }}>
                                {v ? money(Math.abs(v)) : "·"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </>
              )}

              {/* ===== MOVIMIENTOS EN U$S (nunca se suman con pesos) ===== */}
              {agg.usdDetail.size > 0 && (
                <>
                  <tr>
                    <td style={{ ...tdStickyLabel, background: "#e0f2fe", fontWeight: 800, color: "#075985" }}>
                      <span style={usdPill}>U$S</span> MOVIMIENTOS EN DÓLARES
                      {bnaCompra ? ` · compra BNA $${bnaCompra.toLocaleString("es-AR")}` : ""}
                    </td>
                    {visibleDayCols.map((c) => {
                      const v = agg.usdByDate.get(c.iso) || 0;
                      return (
                        <td key={`usdh-${c.iso}`} style={{ ...tdCell, background: "#e0f2fe", fontWeight: 700, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#cbd5e1" }}>
                          {v ? money(Math.abs(v), "USD") : "·"}
                        </td>
                      );
                    })}
                  </tr>
                  {Array.from(agg.usdDetail.entries()).filter(([, drow]) => activeInView(drow)).sort((a, b) => a[0].localeCompare(b[0])).map(([title, drow]) => {
                    const tot = agg.usdTitleTotal.get(title) || 0;
                    const pesos = Math.abs(tot) * (bnaCompra || 0);
                    return (
                      <tr key={`usd-${title}`} style={{ background: "#f0f9ff" }}>
                        <td style={{ ...tdStickyLabel, background: "#f0f9ff", paddingLeft: 24 }}>
                          <span style={usdPill}>U$S</span> {title}{" "}
                          <strong style={{ color: tot > 0 ? "#0f172a" : "#dc2626" }}>
                            ({tot > 0 ? "ingreso" : "egreso"} {money(Math.abs(tot), "USD")})
                          </strong>
                          {bnaCompra ? <span style={{ color: "#64748b" }}> (≈ {money(pesos)})</span> : null}
                        </td>
                        {visibleDayCols.map((c) => {
                          const v = drow.get(c.iso) || 0;
                          return (
                            <td key={`usd-${title}-${c.iso}`} style={{ ...tdCell, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#e2e8f0" }}>
                              {v ? money(Math.abs(v), "USD") : "·"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}

              {/* ===== TOTALES SEPARADOS BLANCO / NEGRO ===== */}
              {([
                { lbl: "TOTAL INGRESOS · BLANCO", m: agg.incB, comp: agg.compIncB, isOut: false, bg: "#f8fafc", color: "#0f172a", kp: "tib" },
                { lbl: "TOTAL INGRESOS · NEGRO", m: agg.incN, comp: agg.compIncN, isOut: false, bg: "#e5e7eb", color: "#0f172a", kp: "tin" },
                { lbl: "TOTAL EGRESOS · BLANCO", m: agg.egrB, comp: agg.compEgrB, isOut: true, bg: "#f8fafc", color: "#dc2626", kp: "teb" },
                { lbl: "TOTAL EGRESOS · NEGRO", m: agg.egrN, comp: agg.compEgrN, isOut: true, bg: "#e5e7eb", color: "#dc2626", kp: "ten" },
              ] as const).map((row) => (
                <React.Fragment key={row.kp}>
                  <tr>
                    <td style={{ ...tdStickyLabel, fontWeight: 800, background: row.bg, color: row.color }}>{row.lbl}</td>
                    {visibleDayCols.map((c) => {
                      const v = row.m.get(c.iso) || 0;
                      return <td key={`${row.kp}-${c.iso}`} style={{ ...tdCell, fontWeight: 700, background: row.bg, color: v ? row.color : "#cbd5e1" }}>{v ? money(v) : "·"}</td>;
                    })}
                  </tr>
                  {/* Desglose por empresa (con su color) cuando se ven todas — el "×4" a la vista */}
                  {showByCompany &&
                    Array.from(row.comp.entries())
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([company, drow]) => {
                        const meta = companyMeta.get(company);
                        return subtotalRow(meta?.short || company, drow, `${row.kp}-${company}`, row.isOut, meta?.color || "#64748b", row.bg);
                      })}
                </React.Fragment>
              ))}
              {([
                { lbl: "NETO DÍA · BLANCO", inc: agg.incB, egr: agg.egrB, bg: "#e2e8f0", kp: "ndb" },
                { lbl: "NETO DÍA · NEGRO", inc: agg.incN, egr: agg.egrN, bg: "#cbd5e1", kp: "ndn" },
              ] as const).map((row) => (
                <tr key={row.kp}>
                  <td style={{ ...tdStickyLabel, fontWeight: 900, background: row.bg }}>{row.lbl}</td>
                  {visibleDayCols.map((c) => {
                    const v = (row.inc.get(c.iso) || 0) - (row.egr.get(c.iso) || 0);
                    return <td key={`${row.kp}-${c.iso}`} style={{ ...tdCell, fontWeight: 900, background: row.bg, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#94a3b8" }}>{v ? money(v) : "·"}</td>;
                  })}
                </tr>
              ))}
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
                {section?.dir === "out" && (
                  <label style={lblStyle}>Categoría (para marcadores)
                    <select style={styles.input} value={addForm.costKind} onChange={(e) => setAddForm({ ...addForm, costKind: e.target.value as "" | "fijo" | "variable" })}>
                      <option value="">— Sin categoría —</option>
                      <option value="fijo">Costo fijo</option>
                      <option value="variable">Costo variable</option>
                    </select>
                  </label>
                )}
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
const usdPill: React.CSSProperties = {
  display: "inline-block", background: "#0284c7", color: "#fff", fontWeight: 800, fontSize: 10,
  borderRadius: 999, padding: "1px 6px", marginRight: 4, verticalAlign: "middle",
};
const miniAdd: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 6, border: "1px dashed #86efac", background: "#f0fdf4", cursor: "pointer", fontSize: 12,
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600,
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "none", background: "#14213d", color: "#fff", cursor: "pointer", fontWeight: 700,
};
