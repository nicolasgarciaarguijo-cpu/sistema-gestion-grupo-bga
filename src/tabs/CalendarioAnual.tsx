import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { styles } from "../ui/styles";
import { Panel, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { todayIso } from "../lib/format";
import { CALENDAR_SECTIONS, CALENDAR_ITEM_INDEX, DEFAULT_CALENDAR_ROW_CONFIG, esCobranzaReal, extraRowsOf, type CalendarRowConfig } from "../domain/calendarStructure";
import { suggestCalendarConcept } from "../domain/calendarBankRules";
import { findSupplierInText } from "../domain/suppliers";
import { invoiceCandidates, type LinkableInvoice } from "../domain/bankLinking";

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
  costKind?: "fijo" | "variable";
};

// De que tipo es la plata que entra, segun la seccion de la planilla donde se carga. Sirve para que
// un prestamo no se cuente como cobranza de un trabajo.
const incomeCategoryOfSection = (sectionKey: string): "trabajo" | "prestamo" | "financiero" | "varios" => {
  if (sectionKey === "prestamos") return "prestamo";
  if (sectionKey === "inversiones") return "financiero";
  if (sectionKey === "ingresos_varios") return "varios";
  return "trabajo";
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
  // Si viene, el modal edita ese movimiento en vez de crear uno nuevo (id de la Entry: bank-… / financial-…).
  editId?: string;
  date: string;
  company: string;
  sectionKey: string;
  itemKey: string;
  ppto: string;
  cliente: string;
  customLabel: string;
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
  employees = [],
  jobs = [],
  onAssignToJob,
  suppliers = [],
  purchaseInvoices = [],
  onAssignToSupplier,
  onUnlinkInvoice,
  onEditEntry,
  onDeleteEntry,
  rowConfig = DEFAULT_CALENDAR_ROW_CONFIG,
  onRowConfigChange,
}: {
  entries: Entry[];
  companyScope: string;
  setCompanyScope: (v: string) => void;
  fiscalStartYear: number;
  setFiscalStartYear: (v: number) => void;
  fiscalYearOptions: Array<{ value: number; label: string }>;
  companyOptions: Array<{ value: string; short?: string; primary?: string }>;
  employees?: Array<{ name: string; company: string }>;
  jobs?: Array<{ budgetNumber: string; client: string; company: string; active?: boolean; falta?: string }>;
  onAssignToJob?: (bankIds: number[], budgetNumber: string, client: string) => void;
  // Proveedores y facturas de COMPRA del sistema: con esto un débito sin clasificar se vincula a
  // quién le pagamos y, si corresponde, a la factura que cancela.
  suppliers?: Array<{ name: string; taxId: string; aliases?: string; active?: boolean }>;
  purchaseInvoices?: LinkableInvoice[];
  onAssignToSupplier?: (
    bankIds: number[],
    args: { supplier: string; conceptKey: string; invoiceId?: number | null }
  ) => void;
  // Soltar el vínculo con la factura de compra: esa factura vuelve a ser deuda con el proveedor.
  onUnlinkInvoice?: (bankIds: number[]) => void;
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
  // Editar / borrar el movimiento que está DETRÁS de un número (click derecho). Devuelven false si ese
  // movimiento vive en otra solapa (compras, caja chica, comisiones) y hay que editarlo allá.
  onEditEntry?: (
    entryId: string,
    patch: {
      amount?: number;
      date?: string;
      company?: string;
      administration?: "blanco" | "negro";
      conceptKey?: string;
      title?: string;
      client?: string;
      jobCode?: string;
      // Texto del renglón como se lee en la columna Concepto (en el banco, el concepto del extracto).
      concept?: string;
      notes?: string;
      costKind?: "fijo" | "variable";
    }
  ) => boolean;
  onDeleteEntry?: (entryId: string) => boolean;
  // Renglones fijos renombrados u ocultos por el usuario. Es estado del SISTEMA (lo ven todos), a
  // diferencia del ancho de las columnas, que es preferencia del navegador.
  rowConfig?: CalendarRowConfig;
  onRowConfigChange?: (next: CalendarRowConfig) => void;
  bnaCompra: number;
  money: (n: number, currency?: string) => string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState<null | AddForm>(null);
  const [monthMode, setMonthMode] = useState(true); // un mes por vez (liviano); off = año completo
  // Arranca en el mes de HOY si cae dentro del año fiscal (así se ve de una lo que pasa hoy).
  const [monthIdx, setMonthIdx] = useState(() => {
    const [ty, tm] = todayIso().split("-").map(Number);
    const ms = fiscalMonths(fiscalStartMonth || 11, fiscalStartYear);
    const i = ms.findIndex((m) => m.year === ty && m.month === tm);
    return i >= 0 ? i : 0;
  });
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
    const cobranzaDetailB = new Map<string, Map<string, number>>(); // título -> date -> blanco
    const cobranzaDetailN = new Map<string, Map<string, number>>(); // título -> date -> negro
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
    // Costos fijos vs variables (egresos con clasificación), por día. Y por concepto, qué tipo(s) tiene.
    const fijoByDate = new Map<string, number>();
    const varByDate = new Map<string, number>();
    const conceptCostKind = new Map<string, { fijo: boolean; variable: boolean }>(); // itemKey -> tipos vistos
    // Renglones personalizados por sección: sección -> label -> date -> monto.
    const customRows = new Map<string, Map<string, Map<string, number>>>();
    // Movimientos internos (entre cuentas propias / pasaje de moneda): NO cuentan como ingreso/egreso.
    const internoDetail = new Map<string, Map<string, number>>();
    const internoByDate = new Map<string, number>();
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
      // COBRANZA de verdad = plata de un trabajo. Un ingreso clasificado en OTRO renglón (préstamo,
      // rescate de inversión, ingreso vario) NO es una cobranza aunque se haya cargado como tal: tiene
      // que sumar en SU sección. Si no, todo termina impactando en Cobranzas y el número no es real.
      const isCobranza = esCobranzaReal(e.kind, e.conceptKey);
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
        addDeep(neg ? cobranzaDetailN : cobranzaDetailB, title, e.date, amt);
        add(cobranzaByDate, e.date, amt);
        add(incomeByDate, e.date, amt);
        add(neg ? incN : incB, e.date, amt);
        track("cobranzas", "in", neg, e.company, e.date, amt);
        return;
      }
      // Movimiento interno: neutral, no suma a ingresos/egresos. Se muestra aparte (informativo).
      if (e.conceptKey === "__interno__") {
        const signed = e.statusLabel === "debito" ? -amt : amt;
        addDeep(internoDetail, title, e.date, signed);
        add(internoByDate, e.date, signed);
        return;
      }
      // Renglón PERSONALIZADO agregado por el usuario: conceptKey = "custom:<seccion>:<label>".
      // Se suma a su sección (por dir) igual que un renglón fijo, y se muestra como fila propia.
      if (e.conceptKey && e.conceptKey.startsWith("custom:")) {
        const rest = e.conceptKey.slice(7);
        const sep = rest.indexOf(":");
        const sectionKey = sep >= 0 ? rest.slice(0, sep) : rest;
        const label = (sep >= 0 ? rest.slice(sep + 1) : title) || "Otro";
        const sec = CALENDAR_SECTIONS.find((s) => s.key === sectionKey);
        const dir = sec?.dir === "in" ? "in" : "out";
        if (!customRows.has(sectionKey)) customRows.set(sectionKey, new Map());
        const secMap = customRows.get(sectionKey)!;
        if (!secMap.has(label)) secMap.set(label, new Map());
        add(secMap.get(label)!, e.date, amt);
        add(dir === "in" ? incomeByDate : egresoByDate, e.date, amt);
        if (dir === "in") add(neg ? incN : incB, e.date, amt);
        else add(neg ? egrN : egrB, e.date, amt);
        track(sectionKey, dir, neg, e.company, e.date, amt);
        if (dir === "out" && (e.costKind === "fijo" || e.costKind === "variable")) {
          add(e.costKind === "fijo" ? fijoByDate : varByDate, e.date, amt);
        }
        return;
      }
      const idx = e.conceptKey ? CALENDAR_ITEM_INDEX[e.conceptKey] : undefined;
      if (idx) {
        addDeep(byConcept, e.conceptKey!, e.date, amt);
        add(idx.dir === "in" ? incomeByDate : egresoByDate, e.date, amt);
        if (idx.dir === "in") add(neg ? incN : incB, e.date, amt);
        else add(neg ? egrN : egrB, e.date, amt);
        track(idx.sectionKey, idx.dir, neg, e.company, e.date, amt);
        // Costos fijos/variables: solo egresos con clasificación explícita.
        if (idx.dir === "out" && (e.costKind === "fijo" || e.costKind === "variable")) {
          add(e.costKind === "fijo" ? fijoByDate : varByDate, e.date, amt);
          const ck = conceptCostKind.get(e.conceptKey!) || { fijo: false, variable: false };
          if (e.costKind === "fijo") ck.fijo = true; else ck.variable = true;
          conceptCostKind.set(e.conceptKey!, ck);
        }
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
    return { byConcept, cobranzaDetail, cobranzaDetailB, cobranzaDetailN, cobranzaByDate, unclDetail, unclByDate, unclTitleTotal, unclBankIds, incomeByDate, egresoByDate, incB, incN, egrB, egrN, usdDetail, usdTitleTotal, usdByDate, comisionDetail, comisionByDate, secB, secN, compIncB, compIncN, compEgrB, compEgrN, companiesSeen, fijoByDate, varByDate, conceptCostKind, customRows, internoDetail, internoByDate };
  }, [entries, companyScope, dayCols]);

  // Color y sigla por empresa para el desglose cuando scope=Todas.
  const companyMeta = useMemo(() => {
    const m = new Map<string, { short: string; color: string }>();
    companyOptions.forEach((c) => m.set(c.value, { short: c.short || c.value, color: c.primary || "#64748b" }));
    return m;
  }, [companyOptions]);
  const showByCompany = companyScope === "__ALL__" && agg.companiesSeen.size > 1;
  const selectedColor = companyScope !== "__ALL__" ? companyMeta.get(companyScope)?.color : undefined;

  // Sugerencia de renglón para los movimientos del banco sin clasificar (mecánica bancaria).
  const suggestedCount = useMemo(() => {
    let n = 0;
    agg.unclBankIds.forEach((ids, title) => { if (suggestCalendarConcept(title)) n += ids.length; });
    return n;
  }, [agg]);
  const applyBankSuggestions = () => {
    const byKey = new Map<string, number[]>();
    agg.unclBankIds.forEach((ids, title) => {
      const sug = suggestCalendarConcept(title);
      if (!sug) return;
      byKey.set(sug, (byKey.get(sug) || []).concat(ids));
    });
    byKey.forEach((ids, key) => onAssignConcept(ids, key));
  };

  // Empleados a mostrar como renglones de HABERES (uno por empleado). Filtra por empresa si hay scope.
  const employeesInScope = useMemo(() => {
    const seen = new Set<string>();
    return employees
      .filter((e) => companyScope === "__ALL__" || e.company === companyScope)
      .filter((e) => {
        const k = `${e.company}|${e.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, companyScope]);

  // Trabajos para el selector "cobro → trabajo" en Sin clasificar (filtra por empresa si hay scope).
  const jobsInScope = useMemo(
    () =>
      jobs
        .filter((j) => companyScope === "__ALL__" || j.company === companyScope)
        .slice()
        .sort((a, b) => String(b.budgetNumber).localeCompare(String(a.budgetNumber))),
    [jobs, companyScope]
  );

  // ---- VINCULAR lo que quedó sin clasificar --------------------------------------------------
  // La plata del banco que no tiene lugar: un CRÉDITO es el cobro de un trabajo; un DÉBITO es un pago
  // a un proveedor (y, si se elige, la factura de compra que cancela). Lo abre el botón derecho, como
  // todo lo demás: el número solo muestra, la acción sale del menú.
  type LinkForm = {
    bankIds: number[];
    entryIds: string[]; // los movimientos de atrás (para moverlos de día / renglón)
    moveDate: string; // vacío = no cambiar el día
    title: string;
    total: number; // firmado: + ingreso / − egreso
    company: string;
    date: string;
    mode: "trabajo" | "proveedor" | "renglon";
    job: string;
    supplier: string;
    invoiceId: number | null;
    sectionKey: string;
    itemKey: string; // "__own__" = renglón propio con el nombre del proveedor
    conceptKey: string;
  };
  const [linkForm, setLinkForm] = useState<LinkForm | null>(null);
  const DEFAULT_PAY_SECTION = "compra_materiales";
  const bankIdsOf = (list: Entry[]) =>
    list.filter((e) => e.id.startsWith("bank-")).map((e) => Number(e.id.slice(5))).filter(Boolean);
  const signedTotal = (list: Entry[]) =>
    list.reduce((acc, e) => {
      const amt = Math.abs(Number(e.amount) || 0);
      return acc + (e.statusLabel === "debito" ? -amt : amt);
    }, 0);
  // Abre el vinculador para esos movimientos. El tipo arranca según el signo (entró = cobro, salió =
  // pago) y el proveedor viene pre-cargado si el texto del banco lo nombra (nombre, alias o CUIT).
  const openLink = (list: Entry[], title: string) => {
    const bankIds = bankIdsOf(list);
    if (bankIds.length === 0) return;
    const total = signedTotal(list);
    const prov = findSupplierInText(title, suppliers);
    setLinkForm({
      bankIds,
      entryIds: list.map((e) => e.id),
      moveDate: "",
      title,
      total,
      company: list[0]?.company || "",
      date: list[0]?.date || "",
      mode: total >= 0 ? "trabajo" : "proveedor",
      job: "",
      supplier: prov?.name || "",
      invoiceId: null,
      sectionKey: DEFAULT_PAY_SECTION,
      itemKey: "__own__",
      conceptKey: "",
    });
    setCellMenu(null);
    setRowMenu(null);
  };
  // Facturas impagas que ese débito podría estar cancelando (mismo importe primero).
  const linkInvoiceOptions = useMemo(() => {
    if (!linkForm || linkForm.mode !== "proveedor") return [];
    const prov = linkForm.supplier.trim()
      ? { name: linkForm.supplier.trim(), taxId: findSupplierInText(linkForm.supplier, suppliers)?.taxId || "" }
      : null;
    return invoiceCandidates(
      { company: linkForm.company, date: linkForm.date, amount: linkForm.total },
      prov,
      purchaseInvoices
    ).slice(0, 30);
  }, [linkForm, suppliers, purchaseInvoices]);
  const confirmLink = () => {
    if (!linkForm) return;
    const { bankIds, mode } = linkForm;
    if (mode === "trabajo") {
      const ppto = linkForm.job.split("·")[0].trim();
      const job = jobsInScope.find((j) => String(j.budgetNumber) === ppto) || jobs.find((j) => String(j.budgetNumber) === ppto);
      if (!onAssignToJob) return;
      if (!job) {
        window.alert("Ese trabajo no existe. Elegí uno de la lista (empieza por el número de presupuesto).");
        return;
      }
      onAssignToJob(bankIds, job.budgetNumber, job.client);
    } else if (mode === "proveedor") {
      const supplier = linkForm.supplier.trim();
      if (!onAssignToSupplier || !supplier) return;
      const conceptKey =
        linkForm.itemKey === "__own__" ? `custom:${linkForm.sectionKey}:${supplier}` : linkForm.itemKey;
      onAssignToSupplier(bankIds, { supplier, conceptKey, invoiceId: linkForm.invoiceId });
    } else {
      if (!linkForm.conceptKey) return;
      const dia = linkForm.moveDate.trim();
      // Mover = cambiar el renglón y, si se eligió un día, también la columna. Va por onEditEntry para
      // que sirva igual con lo cargado a mano (financial-) que con el banco (bank-).
      if (dia && onEditEntry) {
        const fallaron = linkForm.entryIds.filter(
          (id) => !onEditEntry(id, { conceptKey: linkForm.conceptKey, date: dia })
        ).length;
        if (fallaron) {
          window.alert(
            `${fallaron} de ${linkForm.entryIds.length} movimientos se editan en su solapa (compras, caja chica, comisiones o trabajos) y quedaron como estaban.`
          );
        }
      } else if (bankIds.length > 0) {
        onAssignConcept(bankIds, linkForm.conceptKey);
      } else if (onEditEntry) {
        linkForm.entryIds.forEach((id) => onEditEntry(id, { conceptKey: linkForm.conceptKey }));
      }
    }
    setLinkForm(null);
  };

  // Filas de COBRANZAS: los trabajos ACTIVOS (algo falta para cerrar) SIEMPRE se muestran —aunque no
  // tengan movimiento este mes— como alerta; más las cobranzas con movimiento en el mes visible.
  const cobranzaRows = useMemo(() => {
    const budgetOf = (key: string) => key.split("·")[0].trim();
    const rows: Array<{ title: string; drowB: Map<string, number>; drowN: Map<string, number>; falta?: string }> = [];
    const usedKeys = new Set<string>();
    const mergeByBudget = (src: Map<string, Map<string, number>>, budget: string) => {
      const merged = new Map<string, number>();
      src.forEach((drow, key) => {
        if (budgetOf(key) === String(budget)) {
          drow.forEach((v, d) => merged.set(d, (merged.get(d) || 0) + v));
          usedKeys.add(key);
        }
      });
      return merged;
    };
    jobs
      .filter((j) => j.active && (companyScope === "__ALL__" || j.company === companyScope))
      .forEach((job) => {
        rows.push({
          title: `${job.budgetNumber} · ${job.client}`,
          drowB: mergeByBudget(agg.cobranzaDetailB, String(job.budgetNumber)),
          drowN: mergeByBudget(agg.cobranzaDetailN, String(job.budgetNumber)),
          falta: job.falta || "",
        });
      });
    const hasMove = (m?: Map<string, number>) => !!m && visibleDayCols.some((c) => (m.get(c.iso) || 0) !== 0);
    Array.from(agg.cobranzaDetail.keys())
      .filter((key) => !usedKeys.has(key) && (hasMove(agg.cobranzaDetailB.get(key)) || hasMove(agg.cobranzaDetailN.get(key))))
      .forEach((key) => rows.push({
        title: key,
        drowB: agg.cobranzaDetailB.get(key) || new Map(),
        drowN: agg.cobranzaDetailN.get(key) || new Map(),
      }));
    return rows.sort((a, b) => a.title.localeCompare(b.title));
  }, [jobs, companyScope, agg, visibleDayCols]);

  const openAdd = (sectionKey: string, itemKey: string, iso: string, presetLabel = "", presetCompany = "") =>
    setAddForm({
      date: iso,
      company: presetCompany || (companyScope !== "__ALL__" ? companyScope : companyOptions[0]?.value || ""),
      sectionKey,
      itemKey,
      ppto: "",
      cliente: "",
      customLabel: presetLabel,
      amount: 0,
      administration: "blanco",
      costKind: "",
      notes: "",
    });

  // ---- Ancho de las columnas (como en una planilla) ---------------------------------------------
  // Se arrastra el borde del encabezado: "Concepto" cambia la columna de la izquierda, cualquier día
  // cambia el ancho de TODOS los días (son la misma columna repetida). Doble click vuelve al original.
  // Es preferencia de VISTA, así que se guarda en el navegador (no en el estado del sistema).
  const readW = (key: string, fallback: number) => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const [labelW, setLabelW] = useState(() => readW("calendarioAnual.labelW", LABEL_W_DEFAULT));
  const [dayW, setDayW] = useState(() => readW("calendarioAnual.dayW", DAY_W_DEFAULT));
  useEffect(() => {
    window.localStorage.setItem("calendarioAnual.labelW", String(labelW));
  }, [labelW]);
  useEffect(() => {
    window.localStorage.setItem("calendarioAnual.dayW", String(dayW));
  }, [dayW]);
  // Vista compacta: un solo botón para achicar todo de una (el arrastre sigue estando para el fino).
  const esCompacto = labelW <= LABEL_W_COMPACT && dayW <= DAY_W_COMPACT;
  // Encabezado inmovilizado: la fila de MESES queda arriba de todo y la de DÍAS pegada abajo de ella,
  // así al bajar por la planilla se sigue viendo en qué día estás. La altura de la fila de meses se mide
  // (no se hardcodea) porque cambia con el zoom del navegador y el tamaño de fuente.
  const monthRowRef = useRef<HTMLTableRowElement | null>(null);
  const [monthRowH, setMonthRowH] = useState(24);
  useLayoutEffect(() => {
    const h = monthRowRef.current?.getBoundingClientRect().height;
    if (h && Math.round(h) !== monthRowH) setMonthRowH(Math.round(h));
  });

  const startResize = (ev: React.MouseEvent, which: "label" | "day") => {
    ev.preventDefault();
    ev.stopPropagation();
    const startX = ev.clientX;
    const startW = which === "label" ? labelW : dayW;
    const min = which === "label" ? 60 : 22;
    const max = which === "label" ? 700 : 240;
    const apply = (clientX: number) => {
      const next = Math.min(max, Math.max(min, startW + (clientX - startX)));
      if (which === "label") setLabelW(next);
      else setDayW(next);
    };
    const onMove = (m: MouseEvent) => apply(m.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

    // ---- Click derecho sobre CUALQUIER número de la planilla -------------------------------------
  // La pill D solo MARCA que a un número le falta algo. Las acciones (editar, blanco/negro, borrar,
  // cargar) salen de acá: se abre el menú en el cursor y muestra los movimientos que hay detrás de ese
  // número. Si hay más de uno, primero se elige cuál.
  type CellMenu = {
    x: number;
    y: number;
    label: string;
    iso: string;
    sectionKey: string;
    itemKey: string;
    match: (e: Entry) => boolean;
    pickedId?: string;
  };
  const [cellMenu, setCellMenu] = useState<CellMenu | null>(null);
  const openCellMenu = (
    ev: React.MouseEvent,
    label: string,
    iso: string,
    sectionKey: string,
    itemKey: string,
    match: (e: Entry) => boolean
  ) => {
    ev.preventDefault();
    ev.stopPropagation();
    setCellMenu({ x: ev.clientX, y: ev.clientY, label, iso, sectionKey, itemKey, match });
  };
  // Los movimientos que hay detrás de un número (los mismos que sumó la agregación de esa celda).
  const entriesOfCell = (m: CellMenu) =>
    entries.filter(
      (e) => e.date === m.iso && (companyScope === "__ALL__" || e.company === companyScope) && m.match(e)
    );
  const sameTitle = (e: Entry, title: string) => (e.title || "—").trim() === title.trim();
  const isCobranzaEntry = (e: Entry) => e.kind === "cobranza" || e.conceptKey === "cobranzas";

  // Abre el modal con los datos del movimiento cargados (mismo formulario que para cargar).
  const openEdit = (e: Entry) => {
    const ck = e.conceptKey || "";
    let sectionKey = "";
    let itemKey = "";
    let customLabel = "";
    let ppto = "";
    let cliente = "";
    if (isCobranzaEntry(e)) {
      sectionKey = CALENDAR_SECTIONS.find((s2) => s2.dynamic === "cobranzas")?.key || "";
      // El título de una cobranza es "ppto · cliente" (o "cliente · (D) falta ppto").
      const clean = (e.title || "").replace(/·?\s*\(D\)[^·]*$/i, "").trim();
      const parts = clean.split("·").map((x) => x.trim()).filter(Boolean);
      if (parts.length > 1 && /^\d/.test(parts[0])) {
        ppto = parts[0];
        cliente = parts.slice(1).join(" · ");
      } else {
        cliente = parts.join(" · ");
      }
    } else if (ck.startsWith("custom:")) {
      const rest = ck.slice(7);
      const sep = rest.indexOf(":");
      sectionKey = sep >= 0 ? rest.slice(0, sep) : rest;
      itemKey = "__custom__";
      customLabel = (sep >= 0 ? rest.slice(sep + 1) : e.title) || "";
    } else {
      const idx = CALENDAR_ITEM_INDEX[ck];
      sectionKey = idx?.sectionKey || CALENDAR_SECTIONS[0]?.key || "";
      itemKey = idx
        ? ck
        : CALENDAR_SECTIONS.find((s2) => s2.key === sectionKey)?.items[0]?.key || "";
    }
    setAddForm({
      editId: e.id,
      date: e.date,
      company: e.company,
      sectionKey,
      itemKey,
      ppto,
      cliente,
      customLabel,
      amount: Math.abs(Number(e.amount) || 0),
      administration: e.administration === "negro" ? "negro" : "blanco",
      costKind: e.costKind === "fijo" || e.costKind === "variable" ? e.costKind : "",
      notes: "",
    });
    setCellMenu(null);
  };

  // ---- Renglones fijos: renombrados u ocultos por el usuario -----------------------------------
  const rowLabels = rowConfig.labels || {};
  const hiddenRows = useMemo(() => new Set(rowConfig.hidden || []), [rowConfig.hidden]);
  const labelOf = (itemKey: string, fallback: string) => rowLabels[itemKey] || fallback;
  const setRowLabel = (itemKey: string, label: string | null) => {
    if (!onRowConfigChange) return;
    const labels = { ...rowLabels };
    if (label) labels[itemKey] = label;
    else delete labels[itemKey];
    onRowConfigChange({ labels, hidden: [...(rowConfig.hidden || [])], extra: [...(rowConfig.extra || [])] });
  };
  const setRowHidden = (itemKey: string, hidden: boolean) => {
    if (!onRowConfigChange) return;
    const next = new Set(rowConfig.hidden || []);
    if (hidden) next.add(itemKey);
    else next.delete(itemKey);
    onRowConfigChange({ labels: { ...rowLabels }, hidden: Array.from(next), extra: [...(rowConfig.extra || [])] });
  };
  // ---- Renglones PROPIOS: existen aunque esten vacios ------------------------------------------
  // Antes un renglón propio solo existía mientras tuviera plata cargada, así que "+ renglón" en
  // realidad no creaba nada: te pedía un movimiento. Ahora el renglón se declara en rowConfig.extra
  // (estado del sistema, lo ve todo el mundo) y se muestra vacío, listo para cargarle.
  const addExtraRow = (sectionKey: string) => {
    if (!onRowConfigChange) return;
    const nombre = ask("Nombre del renglón nuevo:", "");
    if (!nombre) return;
    const yaEsta = (rowConfig.extra || []).some(
      (r) => r.sectionKey === sectionKey && r.label.trim().toLowerCase() === nombre.toLowerCase()
    );
    if (yaEsta) {
      window.alert(`Ya hay un renglón "${nombre}" en esta sección.`);
      return;
    }
    onRowConfigChange({
      labels: { ...rowLabels },
      hidden: [...(rowConfig.hidden || [])],
      extra: [...(rowConfig.extra || []), { sectionKey, label: nombre }],
    });
  };
  const renameExtraRow = (sectionKey: string, anterior: string, nuevo: string) => {
    if (!onRowConfigChange) return;
    onRowConfigChange({
      labels: { ...rowLabels },
      hidden: [...(rowConfig.hidden || [])],
      extra: (rowConfig.extra || []).map((r) =>
        r.sectionKey === sectionKey && r.label === anterior ? { ...r, label: nuevo } : r
      ),
    });
  };
  const removeExtraRow = (sectionKey: string, label: string) => {
    if (!onRowConfigChange) return;
    onRowConfigChange({
      labels: { ...rowLabels },
      hidden: [...(rowConfig.hidden || [])],
      extra: (rowConfig.extra || []).filter(
        (r) => !(r.sectionKey === sectionKey && r.label === label)
      ),
    });
  };
  // Los renglones propios de una sección: los declarados + los que tienen plata cargada (de antes de
  // que existieran los declarados, o cargados desde "Otro renglón" en el modal). Sin repetidos.
  const customRowsOfSection = (sectionKey: string): Array<{ label: string; declarado: boolean }> => {
    const declarados = extraRowsOf(rowConfig, sectionKey);
    const conPlata = Array.from(agg.customRows.get(sectionKey)?.keys() || []);
    const vistos = new Set(declarados);
    const sueltos = conPlata.filter((label) => !vistos.has(label));
    return [
      ...declarados.map((label) => ({ label, declarado: true })),
      ...sueltos.sort((a, b) => a.localeCompare(b)).map((label) => ({ label, declarado: false })),
    ];
  };

  // Todos los renglones fijos ocultos, con el nombre que corresponda (para poder devolverlos).
  const hiddenRowList = useMemo(() => {
    const out: Array<{ key: string; label: string; section: string }> = [];
    CALENDAR_SECTIONS.forEach((sec) =>
      sec.items.forEach((it) => {
        if (hiddenRows.has(it.key)) out.push({ key: it.key, label: rowLabels[it.key] || it.label, section: sec.label });
      })
    );
    return out;
  }, [hiddenRows, rowLabels]);
  const [hiddenMenu, setHiddenMenu] = useState<null | { x: number; y: number }>(null);

    // ---- Click derecho sobre el NOMBRE del renglón (columna Concepto) -----------------------------
  // Mismo criterio que con los números: acá se corrige el renglón entero (su nombre, el ppto/cliente
  // de una cobranza, el texto que trajo el banco) o se lo borra con todos sus movimientos.
  type RowMenu = {
    x: number;
    y: number;
    label: string;
    kind: "fijo" | "cobranza" | "custom" | "haberes" | "uncl" | "texto";
    sectionKey: string;
    itemKey: string;
    match: (e: Entry) => boolean;
  };
  const [rowMenu, setRowMenu] = useState<RowMenu | null>(null);
  const openRowMenu = (
    ev: React.MouseEvent,
    kind: RowMenu["kind"],
    label: string,
    sectionKey: string,
    itemKey: string,
    match: (e: Entry) => boolean
  ) => {
    ev.preventDefault();
    ev.stopPropagation();
    setRowMenu({ x: ev.clientX, y: ev.clientY, kind, label, sectionKey, itemKey, match });
  };
  // Todos los movimientos de un renglón (de cualquier día, no solo el que se ve).
  const entriesOfRow = (match: (e: Entry) => boolean) =>
    entries.filter((e) => (companyScope === "__ALL__" || e.company === companyScope) && match(e));
  // Aplica un cambio a TODO el renglón. Los que viven en otra solapa quedan como estaban y se avisa.
  const patchRow = (match: (e: Entry) => boolean, build: (e: Entry) => Parameters<NonNullable<typeof onEditEntry>>[1]) => {
    const list = entriesOfRow(match);
    if (!onEditEntry || list.length === 0) return;
    const fail = list.filter((e) => !onEditEntry(e.id, build(e))).length;
    if (fail) {
      window.alert(
        `${fail} de ${list.length} movimientos de este renglón se editan en su solapa (compras, caja chica, comisiones o trabajos) y quedaron como estaban.`
      );
    }
  };
  const ask = (question: string, current: string) => {
    const v = window.prompt(question, current);
    if (v === null) return null;
    const clean = v.trim();
    return clean || null;
  };
  // Día donde cae "Cargar acá…" desde el nombre del renglón: hoy si está a la vista, si no el primero.
  const defaultLoadDay = () =>
    visibleDayCols.find((c) => c.iso === todayIso())?.iso || visibleDayCols[0]?.iso || "";

  const editable = (e: Entry) => e.id.startsWith("bank-") || e.id.startsWith("financial-");
  // De dónde sale un movimiento que NO se puede editar acá (para decirlo en el menú).
  const sourceLabel = (e: Entry) =>
    e.id.startsWith("purchase-invoice-") ? "Compras (factura)"
      : e.id.startsWith("purchase-") ? "Compras"
      : e.id.startsWith("petty-cash-") ? "Caja chica"
      : e.id.startsWith("comm-") ? "Comisiones"
      : e.id.startsWith("debt-") ? "Deudas"
      : e.id.startsWith("job-") ? "Trabajos aprobados"
      : "otra solapa";

  const toggleAdmin = (e: Entry) => {
    if (!onEditEntry) return;
    onEditEntry(e.id, { administration: e.administration === "negro" ? "blanco" : "negro" });
    setCellMenu(null);
  };
  const removeEntry = (e: Entry) => {
    if (!onDeleteEntry) return;
    const ok = window.confirm(
      `¿Borrar este movimiento?
${e.title} — ${money(Math.abs(Number(e.amount) || 0))} (${e.date})`
    );
    if (ok && !onDeleteEntry(e.id)) {
      window.alert(`Este movimiento se borra desde ${sourceLabel(e)}.`);
    }
    setCellMenu(null);
  };

  const confirmAdd = () => {
    if (!addForm || !(Number(addForm.amount) > 0) || !addForm.company) return;
    const section = CALENDAR_SECTIONS.find((s) => s.key === addForm.sectionKey);
    if (!section) return;
    const isCob = section.dynamic === "cobranzas";
    const isCustom = addForm.itemKey === "__custom__";
    const type: "cobranza" | "pago" = section.dir === "in" ? "cobranza" : "pago";
    const cliente = addForm.cliente.trim();
    const ppto = addForm.ppto.trim();
    const customLabel = (addForm.customLabel || "").trim();
    if (isCustom && !customLabel) return; // el renglón propio necesita un nombre
    const itemLabel = isCob
      ? `${ppto ? ppto + " · " : ""}${cliente || "Cliente"}`
      : isCustom
      ? customLabel
      : CALENDAR_ITEM_INDEX[addForm.itemKey]?.label || section.label;
    const conceptKey = isCob
      ? "cobranzas"
      : isCustom
      ? `custom:${addForm.sectionKey}:${customLabel}`
      : addForm.itemKey;
    // Editando: el mismo formulario patchea el movimiento de origen (banco o carga manual). Si el
    // movimiento vive en otra solapa, avisamos y no tocamos nada.
    if (addForm.editId) {
      const ok = onEditEntry
        ? onEditEntry(addForm.editId, {
            company: addForm.company,
            date: addForm.date,
            amount: Number(addForm.amount),
            administration: addForm.administration,
            title: itemLabel,
            client: isCob ? cliente : undefined,
            jobCode: isCob ? ppto : undefined,
            notes: addForm.notes,
            conceptKey,
            costKind: type === "pago" && addForm.costKind ? addForm.costKind : undefined,
          })
        : false;
      if (!ok) {
        window.alert("Este movimiento se edita en la solapa de donde salió (compras, caja chica, comisiones o trabajos).");
        return;
      }
      setAddForm(null);
      return;
    }
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
      conceptKey,
      incomeCategory: type === "cobranza" ? incomeCategoryOfSection(addForm.sectionKey) : undefined,
      costKind: type === "pago" && addForm.costKind ? addForm.costKind : undefined,
    });
    setAddForm(null);
  };

  // Hoy: sombreamos su columna con dos líneas verticales ámbar (se ven aunque la fila tenga color de
  // fondo) para ubicar rápido lo que ya pasó (izquierda) y lo que se viene (derecha).
  const today = todayIso();
  const hi = (iso: string): React.CSSProperties =>
    iso === today ? { boxShadow: "inset 2px 0 0 #f59e0b, inset -2px 0 0 #f59e0b" } : {};
  // Al abrir (o cambiar de vista) posicionamos el scroll horizontal en la columna de hoy.
  const todayCellRef = useRef<HTMLTableCellElement | null>(null);
  useEffect(() => {
    if (todayCellRef.current) {
      todayCellRef.current.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [monthMode, monthIdx, companyScope, fiscalStartYear, today]);

  const cell = (m: Map<string, number> | undefined, iso: string) => (m ? m.get(iso) || 0 : 0);
  // Una fila dinámica (cliente/trabajo) solo se muestra si tiene MOVIMIENTO en el período visible.
  // Así un cliente que terminó su trabajo no ocupa espacio en los meses siguientes; si vuelve a comprar
  // (nueva cobranza), reaparece solo en el mes en que se mueve.
  const activeInView = (drow: Map<string, number>) => visibleDayCols.some((c) => (drow.get(c.iso) || 0) !== 0);

  // Contenido de una celda de TOTAL para un día: el blanco y el negro con su pill B/N.
  // Si el día tiene los dos, se ven los dos números (uno debajo del otro), cada uno con su pill.
  const bnCell = (bMap: Map<string, number> | undefined, nMap: Map<string, number> | undefined, iso: string, isOut: boolean) => {
    const b = bMap?.get(iso) || 0;
    const n = nMap?.get(iso) || 0;
    if (!b && !n) return <span style={{ color: "#cbd5e1" }}>·</span>;
    const col = isOut ? "#b91c1c" : "#065f46";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end", lineHeight: 1.15 }}>
        {b !== 0 && (
          <span style={{ color: col, whiteSpace: "nowrap" }}>
            <span style={{ ...bnPill, background: "#e2e8f0", color: "#334155" }}>B</span>{money(b)}
          </span>
        )}
        {n !== 0 && (
          <span style={{ color: col, whiteSpace: "nowrap" }}>
            <span style={{ ...bnPill, background: "#334155", color: "#fff" }}>N</span>{money(n)}
          </span>
        )}
      </div>
    );
  };

  const detailRow = (
    label: string,
    drow: Map<string, number>,
    key: string,
    isOut: boolean,
    menu?: {
      label: string;
      sectionKey: string;
      itemKey: string;
      match: (e: Entry) => boolean;
      rowKind?: "custom" | "texto";
    }
  ) => {
    // Si el título trae el marcador "(D) falta ...", lo mostramos como pill D (falta completar).
    const dMatch = label.match(/·?\s*\(D\)\s*(.*)$/i);
    const cleanLabel = dMatch ? label.slice(0, label.indexOf("(D)")).replace(/·\s*$/, "").trim() : label;
    return (
    <tr key={key} style={{ background: "#f8fafc" }}>
      <td
        onContextMenu={
          menu
            ? (ev) => openRowMenu(ev, menu.rowKind || "texto", menu.label, menu.sectionKey, menu.itemKey, menu.match)
            : undefined
        }
        title={cleanLabel}
        style={{ ...tdStickyLabel, background: "#f8fafc", paddingLeft: 38, fontWeight: 400, color: "#475569" }}
      >
        {cleanLabel}
        {dMatch && <span style={dPill} title={`Falta completar: ${dMatch[1] || "dato"}`}>D</span>}
      </td>
      {visibleDayCols.map((c) => {
        const v = drow.get(c.iso) || 0;
        return (
          <td
            key={`${key}-${c.iso}`}
            onContextMenu={menu ? (ev) => openCellMenu(ev, menu.label, c.iso, menu.sectionKey, menu.itemKey, menu.match) : undefined}
            style={{ ...tdCell, color: v ? (isOut ? "#dc2626" : "#334155") : "#e2e8f0", ...hi(c.iso) }}
          >
            {v ? money(v) : "·"}
          </td>
        );
      })}
    </tr>
    );
  };

  return (
    <div style={styles.column}>
      <Panel
        title="Calendario anual · la planilla de cash flow"
        span="full"
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px 2px 6px", borderRadius: 8, border: `2px solid ${selectedColor || "#cbd5e1"}`, background: selectedColor ? `${selectedColor}18` : "#f8fafc" }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: selectedColor || "linear-gradient(90deg,#2563eb 50%,#059669 50%)", display: "inline-block" }} />
              <select style={{ ...styles.input, width: "auto", border: "none", background: "transparent", padding: 0, fontWeight: 700, color: selectedColor || "#334155" }} value={companyScope} onChange={(e) => setCompanyScope(e.target.value)}>
                <option value="__ALL__">Todas las empresas</option>
                {companyOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.short || c.value}</option>
                ))}
              </select>
            </div>
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
            <button
              style={btnSecondary}
              title={
                esCompacto
                  ? "Vuelve al ancho normal de las columnas"
                  : "Achica la columna Concepto y los días para que entre más planilla en la pantalla"
              }
              onClick={() => {
                setLabelW(esCompacto ? LABEL_W_DEFAULT : LABEL_W_COMPACT);
                setDayW(esCompacto ? DAY_W_DEFAULT : DAY_W_COMPACT);
              }}
            >
              {esCompacto ? "Ancho normal" : "Compacto"}
            </button>
            {hiddenRowList.length > 0 && (
              <button
                style={btnSecondary}
                title="Renglones que sacaste de la planilla: desde acá los devolvés"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setHiddenMenu({ x: ev.clientX, y: ev.clientY });
                }}
              >
                Renglones ocultos ({hiddenRowList.length})
              </button>
            )}
          </div>
        }
      >
        <div style={{ ...styles.noticeBox, marginBottom: 10 }}>
          Tu planilla completa: secciones y renglones fijos, días en columnas (scroll ←→). Tocá cualquier
          celda para <strong>cargar</strong> en ese día/renglón, y <strong>botón derecho</strong> sobre un
          número (o sobre el nombre del renglón) para <strong>editar, corregir o borrar</strong>. El ancho de
          las columnas se cambia arrastrando el borde de “Concepto” o de los días (doble click vuelve al
          original), o de una con el botón <strong>“Compacto”</strong>. Si un nombre no entra se corta
          con “…” y se lee completo pasando el mouse por encima. Lo que aún no está clasificado cae en <strong>“Sin clasificar”</strong>: ahí, con
          <strong> botón derecho → Vincular</strong>, la plata que entró se engancha a un <strong>trabajo</strong> y
          la que salió a un <strong>proveedor</strong> (y a la factura de compra que cancela).
        </div>
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            borderTop: `3px solid ${selectedColor || "#cbd5e1"}`,
            maxHeight: "72vh",
            ["--cal-label-w" as any]: `${labelW}px`,
            ["--cal-day-w" as any]: `${dayW}px`,
          } as React.CSSProperties}
        >
          {/* tableLayout "fixed" + colgroup: sin esto el ancho de la columna lo decide el texto más
              largo (con white-space: nowrap el navegador ignora width/max-width en una tabla auto) y
              un concepto largo se comía media pantalla. Acá el ancho lo mandan las dos variables CSS. */}
          <table style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap", tableLayout: "fixed" }}>
            <colgroup>
              <col style={labelColWidth} />
              {visibleDayCols.map((c) => (
                <col key={`col-${c.iso}`} style={dayColWidth} />
              ))}
            </colgroup>
            <thead>
              <tr ref={monthRowRef}>
                <th
                  style={{
                    ...thStickyCorner,
                    top: 0,
                    zIndex: 6,
                    boxShadow: selectedColor
                      ? `inset 4px 0 0 ${selectedColor}, inset 0 -1px 0 #e2e8f0`
                      : "inset 0 -1px 0 #e2e8f0",
                  }}
                >
                  Concepto
                  <span
                    onMouseDown={(ev) => startResize(ev, "label")}
                    onDoubleClick={() => setLabelW(LABEL_W_DEFAULT)}
                    title="Arrastrá para achicar o agrandar la columna · doble click vuelve al ancho original"
                    style={resizeHandle}
                  />
                </th>
                {visibleMonths.map((m) => {
                  const mi = months.indexOf(m);
                  const span = visibleDayCols.filter((c) => c.monthIdx === mi).length;
                  if (span === 0) return null;
                  return (
                    <th key={`m-${mi}`} colSpan={span} style={{ ...thMonth, top: 0 }}>
                      {m.label}
                    </th>
                  );
                })}
              </tr>
              <tr>
                <th style={{ ...thStickyCorner, top: monthRowH, zIndex: 6, boxShadow: "inset 0 -1px 0 #e2e8f0" }}></th>
                {visibleDayCols.map((c) => (
                  <th
                    key={`d-${c.iso}`}
                    ref={c.iso === today ? todayCellRef : undefined}
                    title={c.iso === today ? "Hoy" : undefined}
                    style={
                      c.iso === today
                        ? { ...thDay, top: monthRowH, background: "#f59e0b", color: "#fff", fontWeight: 800 }
                        : { ...thDay, top: monthRowH }
                    }
                  >
                    {c.day}
                    <span
                      onMouseDown={(ev) => startResize(ev, "day")}
                      onDoubleClick={() => setDayW(DAY_W_DEFAULT)}
                      title="Arrastrá para achicar o agrandar los días · doble click vuelve al ancho original"
                      style={resizeHandle}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CALENDAR_SECTIONS.map((section) => {
                const isOut = section.dir === "out";
                const isCob = section.dynamic === "cobranzas";
                const isComerciales = section.key === "gastos_comerciales";
                const isHaberes = section.key === "haberes";
                const isCol = collapsed.has(section.key);
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
                      {visibleDayCols.map((c) => (
                        <td key={`sh-${section.key}-${c.iso}`} style={{ ...tdCell, fontWeight: 700, background: isOut ? "#fee2e2" : "#dcfce7", ...hi(c.iso) }}>
                          {bnCell(agg.secB.get(section.key), agg.secN.get(section.key), c.iso, isOut)}
                        </td>
                      ))}
                    </tr>
                    {!isCol && (isCob
                      ? cobranzaRows.map(({ title, drowB, drowN, falta }) => (
                          <tr key={`cob-${title}`} style={{ background: falta ? "#fff7ed" : "#f8fafc" }}>
                            <td
                              onContextMenu={(ev) =>
                                openRowMenu(ev, "cobranza", title, section.key, "", (e) => isCobranzaEntry(e) && sameTitle(e, title))
                              }
                              title={falta ? `${title} — falta ${falta}` : title}
                              style={{ ...tdStickyLabel, background: falta ? "#fff7ed" : "#f8fafc", paddingLeft: 38, fontWeight: 400, color: "#475569" }}
                            >
                              {title}
                              {falta ? <span style={alertPill} title={`Falta para cerrar: ${falta}`}>⚠ falta {falta}</span> : null}
                            </td>
                            {visibleDayCols.map((c) => (
                              <td
                                key={`cob-${title}-${c.iso}`}
                                onContextMenu={(ev) =>
                                  openCellMenu(ev, title, c.iso, section.key, "", (e) => isCobranzaEntry(e) && sameTitle(e, title))
                                }
                                style={{ ...tdCell, ...hi(c.iso) }}
                              >
                                {bnCell(drowB, drowN, c.iso, false)}
                              </td>
                            ))}
                          </tr>
                        ))
                      : section.items.filter((it) => !hiddenRows.has(it.key)).map((it) => {
                          const itLabel = labelOf(it.key, it.label);
                          const drow = agg.byConcept.get(it.key);
                          const ck = agg.conceptCostKind.get(it.key);
                          return (
                            <tr key={it.key}>
                              <td
                                onContextMenu={(ev) =>
                                  openRowMenu(ev, "fijo", itLabel, section.key, it.key, (e) => e.conceptKey === it.key)
                                }
                                title={itLabel}
                                style={{ ...tdStickyLabel, paddingLeft: 20, fontWeight: 500 }}
                              >
                                {itLabel}
                                {ck?.fijo && <span style={{ ...costChip, background: "#e0e7ff", color: "#3730a3" }} title="Costo fijo">F</span>}
                                {ck?.variable && <span style={{ ...costChip, background: "#fef3c7", color: "#92400e" }} title="Costo variable">V</span>}
                              </td>
                              {visibleDayCols.map((c) => {
                                const v = drow?.get(c.iso) || 0;
                                return (
                                  <td
                                    key={`${it.key}-${c.iso}`}
                                    onClick={() => openAdd(section.key, it.key, c.iso)}
                                    onContextMenu={(ev) =>
                                      openCellMenu(ev, itLabel, c.iso, section.key, it.key, (e) => e.conceptKey === it.key)
                                    }
                                    title="Click: cargar en este día · Click derecho: editar / borrar"
                                    style={{ ...tdCell, cursor: "pointer", fontWeight: 600, color: v ? (isOut ? "#dc2626" : "#0f172a") : "#cbd5e1", ...hi(c.iso) }}
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
                        {visibleDayCols.map((c) => <td key={`cobadd-${c.iso}`} style={{ ...tdCell, ...hi(c.iso) }}></td>)}
                      </tr>
                    )}
                    {!isCol && isComerciales &&
                      Array.from(agg.comisionDetail.entries())
                        .filter(([, drow]) => activeInView(drow))
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([title, drow]) => detailRow(`Comisión · ${title}`, drow, `com-${title}`, true))}
                    {/* HABERES: una fila por empleado (del módulo Personal). Cargás el haber tocando el día. */}
                    {!isCol && isHaberes && (employeesInScope.length === 0 ? (
                      <tr>
                        <td style={{ ...tdStickyLabel, paddingLeft: 20, color: "#94a3b8", fontWeight: 400 }}>Sin empleados cargados en Personal</td>
                        {visibleDayCols.map((c) => <td key={`hab-empty-${c.iso}`} style={{ ...tdCell, ...hi(c.iso) }}></td>)}
                      </tr>
                    ) : employeesInScope.map((emp) => {
                      const drow = agg.customRows.get("haberes")?.get(emp.name);
                      const meta = companyMeta.get(emp.company);
                      return (
                        <tr key={`hab-${emp.company}-${emp.name}`}>
                          <td
                            onContextMenu={(ev) =>
                              openRowMenu(ev, "haberes", emp.name, "haberes", "__custom__", (e) => e.conceptKey === `custom:haberes:${emp.name}`)
                            }
                            title={emp.name}
                            style={{ ...tdStickyLabel, paddingLeft: 20, fontWeight: 500 }}
                          >
                            {showByCompany && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: meta?.color || "#64748b", marginRight: 6 }} />}
                            {emp.name}
                          </td>
                          {visibleDayCols.map((c) => {
                            const v = drow?.get(c.iso) || 0;
                            return (
                              <td
                                key={`hab-${emp.name}-${c.iso}`}
                                onClick={() => openAdd("haberes", "__custom__", c.iso, emp.name, emp.company)}
                                onContextMenu={(ev) =>
                                  openCellMenu(ev, emp.name, c.iso, "haberes", "__custom__", (e) => e.conceptKey === `custom:haberes:${emp.name}`)
                                }
                                title={`Click: cargar haber de ${emp.name} · Click derecho: editar / borrar`}
                                style={{ ...tdCell, cursor: "pointer", fontWeight: 600, color: v ? "#dc2626" : "#cbd5e1", ...hi(c.iso) }}
                              >
                                {v ? money(v) : "+"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    }))}
                    {/* Renglones PROPIOS de esta sección: los declarados (existen aunque estén vacíos,
                        para poder cargarles) más los que ya tienen plata. Botón derecho: renombrar / borrar. */}
                    {!isCol &&
                      customRowsOfSection(section.key)
                        .map((fila) => {
                          const drow = agg.customRows.get(section.key)?.get(fila.label) || new Map<string, number>();
                          // Un renglón declarado se muestra SIEMPRE (aunque no tenga movimientos este
                          // mes): es el lugar donde el usuario quiere cargar. Uno suelto, solo si tiene.
                          if (!fila.declarado && !activeInView(drow)) return null;
                          return detailRow(`✎ ${fila.label}`, drow, `cst-${section.key}-${fila.label}`, isOut, {
                            label: fila.label,
                            sectionKey: section.key,
                            itemKey: "__custom__",
                            match: (e) => e.conceptKey === `custom:${section.key}:${fila.label}`,
                            rowKind: "custom",
                          });
                        })
                        .filter(Boolean)}
                    {/* Agregar un renglón propio a esta sección. Solo pide el NOMBRE: el renglón queda
                        creado y vacío, y la plata se carga tocando el día que corresponda. */}
                    {!isCol && !isCob && onRowConfigChange && (
                      <tr>
                        <td style={{ ...tdStickyLabel, paddingLeft: 20 }}>
                          <button style={miniAdd} title="Crea un renglón nuevo en esta sección (vacío). Después tocás el día para cargarle plata." onClick={() => addExtraRow(section.key)}>+ renglón</button>
                        </td>
                        {visibleDayCols.map((c) => <td key={`cadd-${section.key}-${c.iso}`} style={{ ...tdCell, ...hi(c.iso) }}></td>)}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {/* SIN CLASIFICAR */}
              {agg.unclDetail.size > 0 && (
                <>
                  <tr>
                    <td style={{ ...tdStickyLabel, background: "#fef9c3", fontWeight: 800, color: "#854d0e" }}>
                      <span style={{ cursor: "pointer" }} onClick={() => toggle("uncl")}>
                        {expanded.has("uncl") ? "▾ " : "▸ "}SIN CLASIFICAR · falta ubicar (D)
                      </span>
                      {suggestedCount > 0 && (
                        <button
                          style={{ ...miniAdd, marginLeft: 8, borderColor: "#a78bfa", background: "#f5f3ff", color: "#5b21b6" }}
                          title="Clasifica automáticamente la mecánica bancaria conocida (impuestos, IVA, comisiones, sellos, intereses, tarjeta)"
                          onClick={applyBankSuggestions}
                        >
                          🧠 Clasificar {suggestedCount} sugeridos
                        </button>
                      )}
                    </td>
                    {visibleDayCols.map((c) => {
                      const v = agg.unclByDate.get(c.iso) || 0;
                      return (
                        <td key={`unclh-${c.iso}`} style={{ ...tdCell, background: "#fef9c3", fontWeight: 700, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#e2e8f0", ...hi(c.iso) }}>
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
                          <td
                            onContextMenu={(ev) =>
                              openRowMenu(ev, "uncl", title, "", "", (e) => sameTitle(e, title) && !e.conceptKey && !isCobranzaEntry(e))
                            }
                            title={title}
                            style={{ ...tdStickyLabel, background: "#fffbeb", paddingLeft: 24 }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, overflow: "hidden" }}>
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
                              {ids.length > 0 && (() => {
                                const sug = suggestCalendarConcept(title);
                                const label = sug === "__interno__" ? "Movimiento interno (no cuenta)" : CALENDAR_ITEM_INDEX[sug || ""]?.label;
                                return sug && label ? (
                                  <button
                                    style={{ ...miniAdd, borderColor: "#a78bfa", background: "#f5f3ff", color: "#5b21b6", textAlign: "left" }}
                                    title="Aplicar la clasificación sugerida"
                                    onClick={() => onAssignConcept(ids, sug)}
                                  >
                                    🧠 → {label}
                                  </button>
                                ) : null;
                              })()}
                              {ids.length > 0 && (
                                <span style={{ fontSize: 10, color: "#a16207" }}>
                                  botón derecho → Vincular
                                </span>
                              )}
                            </div>
                          </td>
                          {visibleDayCols.map((c) => {
                            const v = drow.get(c.iso) || 0;
                            return (
                              <td
                                key={`uncl-${title}-${c.iso}`}
                                onContextMenu={(ev) =>
                                  openCellMenu(ev, title, c.iso, "", "", (e) => sameTitle(e, title) && !e.conceptKey && !isCobranzaEntry(e))
                                }
                                style={{ ...tdCell, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#e2e8f0", ...hi(c.iso) }}
                              >
                                {v ? money(Math.abs(v)) : "·"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </>
              )}

              {/* ===== MOVIMIENTOS INTERNOS (entre cuentas propias / pasaje; NO cuentan) ===== */}
              {agg.internoDetail.size > 0 && (
                <>
                  <tr>
                    <td style={{ ...tdStickyLabel, background: "#f1f5f9", fontWeight: 800, color: "#475569" }}>
                      ↔ MOVIMIENTOS INTERNOS <span style={{ fontWeight: 400 }}>(no cuentan como ingreso/egreso)</span>
                    </td>
                    {visibleDayCols.map((c) => {
                      const v = agg.internoByDate.get(c.iso) || 0;
                      return (
                        <td key={`inth-${c.iso}`} style={{ ...tdCell, background: "#f1f5f9", fontWeight: 700, color: v ? "#475569" : "#cbd5e1", ...hi(c.iso) }}>
                          {v ? money(Math.abs(v)) : "·"}
                        </td>
                      );
                    })}
                  </tr>
                  {Array.from(agg.internoDetail.entries()).filter(([, drow]) => activeInView(drow)).sort((a, b) => a[0].localeCompare(b[0])).map(([title, drow]) => (
                    <tr key={`int-${title}`} style={{ background: "#f8fafc" }}>
                      <td
                        onContextMenu={(ev) =>
                          openRowMenu(ev, "texto", title, "", "", (e) => e.conceptKey === "__interno__" && sameTitle(e, title))
                        }
                        title={title}
                        style={{ ...tdStickyLabel, background: "#f8fafc", paddingLeft: 24, fontWeight: 400, color: "#64748b" }}
                      >
                        ↔ {title}
                      </td>
                      {visibleDayCols.map((c) => {
                        const v = drow.get(c.iso) || 0;
                        return (
                          <td
                            key={`int-${title}-${c.iso}`}
                            onContextMenu={(ev) =>
                              openCellMenu(ev, title, c.iso, "", "", (e) => e.conceptKey === "__interno__" && sameTitle(e, title))
                            }
                            style={{ ...tdCell, color: v ? "#64748b" : "#e2e8f0", ...hi(c.iso) }}
                          >
                            {v ? money(Math.abs(v)) : "·"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
                        <td key={`usdh-${c.iso}`} style={{ ...tdCell, background: "#e0f2fe", fontWeight: 700, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#cbd5e1", ...hi(c.iso) }}>
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
                        <td
                          onContextMenu={(ev) =>
                            openRowMenu(ev, "texto", title, "", "", (e) => e.currency === "USD" && sameTitle(e, title))
                          }
                          title={title}
                          style={{ ...tdStickyLabel, background: "#f0f9ff", paddingLeft: 24 }}
                        >
                          <span style={usdPill}>U$S</span> {title}{" "}
                          <strong style={{ color: tot > 0 ? "#0f172a" : "#dc2626" }}>
                            ({tot > 0 ? "ingreso" : "egreso"} {money(Math.abs(tot), "USD")})
                          </strong>
                          {bnaCompra ? <span style={{ color: "#64748b" }}> (≈ {money(pesos)})</span> : null}
                        </td>
                        {visibleDayCols.map((c) => {
                          const v = drow.get(c.iso) || 0;
                          return (
                            <td
                              key={`usd-${title}-${c.iso}`}
                              onContextMenu={(ev) =>
                                openCellMenu(ev, title, c.iso, "", "", (e) => e.currency === "USD" && sameTitle(e, title))
                              }
                              style={{ ...tdCell, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#e2e8f0", ...hi(c.iso) }}
                            >
                              {v ? money(Math.abs(v), "USD") : "·"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}

              {/* ===== TOTALES (blanco/negro con pill en la misma fila) ===== */}
              {([
                { lbl: "TOTAL INGRESOS", b: agg.incB, n: agg.incN, compB: agg.compIncB, compN: agg.compIncN, isOut: false, bg: "#ecfdf5", kp: "ti" },
                { lbl: "TOTAL EGRESOS", b: agg.egrB, n: agg.egrN, compB: agg.compEgrB, compN: agg.compEgrN, isOut: true, bg: "#fef2f2", kp: "te" },
              ] as const).map((row) => (
                <React.Fragment key={row.kp}>
                  <tr>
                    <td style={{ ...tdStickyLabel, fontWeight: 800, background: row.bg, color: row.isOut ? "#991b1b" : "#065f46" }}>{row.lbl}</td>
                    {visibleDayCols.map((c) => (
                      <td key={`${row.kp}-${c.iso}`} style={{ ...tdCell, fontWeight: 700, background: row.bg, ...hi(c.iso) }}>
                        {bnCell(row.b, row.n, c.iso, row.isOut)}
                      </td>
                    ))}
                  </tr>
                  {/* Desglose por empresa (con su color) cuando se ven todas — el "×4" a la vista */}
                  {showByCompany &&
                    Array.from(new Set(Array.from(row.compB.keys()).concat(Array.from(row.compN.keys()))))
                      .sort((a, b) => a.localeCompare(b))
                      .map((company) => {
                        const meta = companyMeta.get(company);
                        const bMap = row.compB.get(company);
                        const nMap = row.compN.get(company);
                        if (!bMap && !nMap) return null;
                        if (![...visibleDayCols].some((c) => (bMap?.get(c.iso) || 0) !== 0 || (nMap?.get(c.iso) || 0) !== 0)) return null;
                        return (
                          <tr key={`${row.kp}-${company}`} style={{ background: row.bg }}>
                            <td style={{ ...tdStickyLabel, background: row.bg, paddingLeft: 30, fontWeight: 700, fontSize: 11 }}>
                              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: meta?.color || "#64748b", marginRight: 6 }} />
                              {meta?.short || company}
                            </td>
                            {visibleDayCols.map((c) => (
                              <td key={`${row.kp}-${company}-${c.iso}`} style={{ ...tdCell, fontSize: 11, background: row.bg, ...hi(c.iso) }}>
                                {bnCell(bMap, nMap, c.iso, row.isOut)}
                              </td>
                            ))}
                          </tr>
                        );
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
                    return <td key={`${row.kp}-${c.iso}`} style={{ ...tdCell, fontWeight: 900, background: row.bg, color: v > 0 ? "#0f172a" : v < 0 ? "#dc2626" : "#94a3b8", ...hi(c.iso) }}>{v ? money(v) : "·"}</td>;
                  })}
                </tr>
              ))}
              {/* ===== EGRESOS por tipo de costo (solo los clasificados fijo/variable) ===== */}
              {(agg.fijoByDate.size > 0 || agg.varByDate.size > 0) &&
                ([
                  { lbl: "COSTOS FIJOS (F)", m: agg.fijoByDate, bg: "#eef2ff", color: "#3730a3", kp: "cfij" },
                  { lbl: "COSTOS VARIABLES (V)", m: agg.varByDate, bg: "#fffbeb", color: "#92400e", kp: "cvar" },
                ] as const).map((row) => (
                  <tr key={row.kp}>
                    <td style={{ ...tdStickyLabel, fontWeight: 800, background: row.bg, color: row.color }}>{row.lbl}</td>
                    {visibleDayCols.map((c) => {
                      const v = row.m.get(c.iso) || 0;
                      return <td key={`${row.kp}-${c.iso}`} style={{ ...tdCell, fontWeight: 700, background: row.bg, color: v ? row.color : "#cbd5e1", ...hi(c.iso) }}>{v ? money(v) : "·"}</td>;
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {hiddenMenu && (
        <QuickMenu x={hiddenMenu.x} y={hiddenMenu.y} onClose={() => setHiddenMenu(null)}>
          <QuickMenuTitle>Renglones ocultos — tocá uno para devolverlo</QuickMenuTitle>
          {hiddenRowList.map((r) => (
            <button
              key={r.key}
              style={quickMenuItem}
              onClick={() => {
                setRowHidden(r.key, false);
                setHiddenMenu(null);
              }}
            >
              <span style={{ fontWeight: 600 }}>{r.label}</span>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>{r.section}</span>
            </button>
          ))}
          <QuickMenuSep />
          <button
            style={quickMenuItem}
            onClick={() => {
              if (onRowConfigChange) onRowConfigChange({ labels: { ...rowLabels }, hidden: [], extra: [...(rowConfig.extra || [])] });
              setHiddenMenu(null);
            }}
          >
            Devolver todos
          </button>
        </QuickMenu>
      )}

      {rowMenu && (() => {
        const close = () => setRowMenu(null);
        const list = entriesOfRow(rowMenu.match);
        // Para decidir si un renglón se puede quitar miramos TODAS las empresas, no solo la que se ve:
        // si tiene plata cargada en la otra, esconderlo la haría desaparecer de la vista.
        const listAll = entries.filter(rowMenu.match);
        return (
          <QuickMenu x={rowMenu.x} y={rowMenu.y} onClose={close}>
            <QuickMenuTitle>
              {rowMenu.label} · {list.length} mov.
            </QuickMenuTitle>
            {rowMenu.kind === "uncl" && bankIdsOf(list).length > 0 && (
              <>
                <button style={{ ...quickMenuItem, fontWeight: 700 }} onClick={() => openLink(list, rowMenu.label)}>
                  Vincular… <span style={{ color: "#94a3b8", fontSize: 11 }}>(trabajo / proveedor / renglon)</span>
                </button>
                <QuickMenuSep />
              </>
            )}
            {rowMenu.kind === "custom" && (
              <>
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    const nuevo = ask("Nombre del renglón:", rowMenu.label);
                    if (nuevo && nuevo !== rowMenu.label) {
                      // El nombre ES la identidad del renglón: hay que renombrarlo en la configuración
                      // Y mover los movimientos que ya tenía al conceptKey nuevo.
                      renameExtraRow(rowMenu.sectionKey, rowMenu.label, nuevo);
                      if (list.length > 0) {
                        patchRow(rowMenu.match, () => ({
                          conceptKey: `custom:${rowMenu.sectionKey}:${nuevo}`,
                          title: nuevo,
                        }));
                      }
                    }
                    close();
                  }}
                >
                  Renombrar renglón…
                </button>
                <QuickMenuSep />
                <button
                  style={{ ...quickMenuItem, color: "#b91c1c" }}
                  onClick={() => {
                    const pregunta =
                      list.length > 0
                        ? `¿Borrar el renglón "${rowMenu.label}" y sus ${list.length} movimientos?`
                        : `¿Borrar el renglón "${rowMenu.label}"? Está vacío.`;
                    if (window.confirm(pregunta)) {
                      const fail = onDeleteEntry
                        ? list.filter((e) => !onDeleteEntry(e.id)).length
                        : list.length;
                      if (fail) {
                        window.alert(`${fail} movimientos se borran desde su solapa y quedaron como estaban.`);
                      }
                      removeExtraRow(rowMenu.sectionKey, rowMenu.label);
                    }
                    close();
                  }}
                >
                  {list.length > 0 ? "Borrar renglón (y sus movimientos)" : "Borrar renglón"}
                </button>
              </>
            )}
            {rowMenu.kind === "cobranza" && (
              <button
                style={quickMenuItem}
                onClick={() => {
                  // "3199 · Cliente" o "Cliente · (D) falta ppto"
                  const clean = rowMenu.label.replace(/·?\s*\(D\)[^·]*$/i, "").trim();
                  const parts = clean.split("·").map((x) => x.trim()).filter(Boolean);
                  const pptoActual = parts.length > 1 && /^\d/.test(parts[0]) ? parts[0] : "";
                  const clienteActual = pptoActual ? parts.slice(1).join(" · ") : parts.join(" · ");
                  const ppto = window.prompt("Presupuesto (ppto):", pptoActual);
                  if (ppto === null) return close();
                  const cliente = window.prompt("Cliente:", clienteActual);
                  if (cliente === null) return close();
                  const p = ppto.trim();
                  const c = cliente.trim();
                  patchRow(rowMenu.match, () => ({
                    conceptKey: "cobranzas",
                    jobCode: p,
                    client: c,
                    title: `${p ? p + " · " : ""}${c || "Cliente"}`,
                  }));
                  close();
                }}
              >
                Corregir presupuesto / cliente…
              </button>
            )}
            {rowMenu.kind === "texto" || rowMenu.kind === "uncl" ? (
              <button
                style={quickMenuItem}
                onClick={() => {
                  const nuevo = ask("Texto del renglón:", rowMenu.label);
                  if (nuevo) patchRow(rowMenu.match, () => ({ concept: nuevo }));
                  close();
                }}
              >
                Corregir el texto…
              </button>
            ) : null}
            {rowMenu.kind === "fijo" && (
              <>
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    const nuevo = ask("Nombre del renglón:", rowMenu.label);
                    if (nuevo) setRowLabel(rowMenu.itemKey, nuevo);
                    close();
                  }}
                >
                  Renombrar renglón…
                </button>
                {rowLabels[rowMenu.itemKey] && (
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      setRowLabel(rowMenu.itemKey, null);
                      close();
                    }}
                  >
                    Volver al nombre original
                  </button>
                )}
                <QuickMenuSep />
                <button
                  style={{ ...quickMenuItem, color: listAll.length ? "#94a3b8" : "#b91c1c" }}
                  title={
                    listAll.length
                      ? "Tiene movimientos cargados: si se pudiera esconder, esa plata dejaría de verse."
                      : "Saca el renglón de la planilla (se puede devolver desde “Renglones ocultos”)."
                  }
                  onClick={() => {
                    if (listAll.length) {
                      window.alert(
                        `Este renglón tiene ${listAll.length} movimientos cargados. Movelos o borralos antes de quitarlo, así no se esconde plata.`
                      );
                    } else {
                      setRowHidden(rowMenu.itemKey, true);
                    }
                    close();
                  }}
                >
                  Quitar renglón de la planilla
                </button>
              </>
            )}
            {rowMenu.kind === "haberes" && (
              <div style={{ fontSize: 12, color: "#64748b", padding: "4px 8px" }}>
                El nombre del empleado sale de la solapa Personal.
              </div>
            )}
            {rowMenu.sectionKey && (
              <>
                <QuickMenuSep />
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    openAdd(rowMenu.sectionKey, rowMenu.itemKey, defaultLoadDay());
                    close();
                  }}
                >
                  Cargar acá…
                </button>
              </>
            )}
          </QuickMenu>
        );
      })()}

      {cellMenu && (() => {
        const list = entriesOfCell(cellMenu);
        const picked = cellMenu.pickedId ? list.find((e) => e.id === cellMenu.pickedId) : list.length === 1 ? list[0] : undefined;
        const close = () => setCellMenu(null);
        const [yy, mm, dd] = cellMenu.iso.split("-");
        const dayLabel = `${dd}/${mm}/${yy}`;
        return (
          <QuickMenu x={cellMenu.x} y={cellMenu.y} onClose={close}>
            <QuickMenuTitle>
              {cellMenu.label} · {dayLabel}
            </QuickMenuTitle>
            {!picked && list.length === 0 && (
              <div style={{ fontSize: 12, color: "#94a3b8", padding: "4px 8px" }}>Sin movimientos este día</div>
            )}
            {/* Más de un movimiento en el mismo número: primero se elige cuál. */}
            {!picked &&
              list.map((e) => (
                <button
                  key={e.id}
                  style={quickMenuItem}
                  onClick={() => setCellMenu({ ...cellMenu, pickedId: e.id })}
                >
                  <span style={{ fontWeight: 700 }}>{money(Math.abs(Number(e.amount) || 0))}</span>
                  <span style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.title}
                  </span>
                </button>
              ))}
            {picked && (
              <>
                {list.length > 1 && (
                  <div style={{ fontSize: 11, color: "#64748b", padding: "0 8px 4px" }}>
                    {money(Math.abs(Number(picked.amount) || 0))} · {picked.title}
                  </div>
                )}
                {(() => {
                  // Si este débito cancela una factura de compra, se dice acá (y se puede soltar).
                  const bankId = picked.id.startsWith("bank-") ? Number(picked.id.slice(5)) : 0;
                  const inv = bankId ? purchaseInvoices.find((i) => i.paidByBankEntryId === bankId) : undefined;
                  if (!inv) return null;
                  return (
                    <>
                      <div style={{ fontSize: 11, color: "#166534", padding: "2px 8px" }}>
                        Paga la factura {inv.invoiceNumber || "de compra"} de {inv.supplier} ({money(inv.total)})
                      </div>
                      {onUnlinkInvoice && (
                        <button
                          style={quickMenuItem}
                          onClick={() => {
                            onUnlinkInvoice([bankId]);
                            close();
                          }}
                        >
                          Soltar la factura <span style={{ color: "#94a3b8", fontSize: 11 }}>(vuelve a ser deuda)</span>
                        </button>
                      )}
                      <QuickMenuSep />
                    </>
                  );
                })()}
                {picked.id.startsWith("bank-") && !picked.conceptKey && !isCobranzaEntry(picked) && (
                  <>
                    <button style={{ ...quickMenuItem, fontWeight: 700 }} onClick={() => openLink([picked], cellMenu.label)}>
                      Vincular… <span style={{ color: "#94a3b8", fontSize: 11 }}>(trabajo / proveedor / renglon)</span>
                    </button>
                    <QuickMenuSep />
                  </>
                )}
                {editable(picked) ? (
                  <>
                    <button style={quickMenuItem} onClick={() => openEdit(picked)}>
                      Editar… <span style={{ color: "#94a3b8", fontSize: 11 }}>(monto, día, renglón)</span>
                    </button>
                    <button style={quickMenuItem} onClick={() => toggleAdmin(picked)}>
                      Cambiar a {picked.administration === "negro" ? "BLANCO (B)" : "NEGRO (N)"}
                    </button>
                    <QuickMenuSep />
                    <button style={{ ...quickMenuItem, color: "#b91c1c" }} onClick={() => removeEntry(picked)}>
                      Borrar movimiento
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "#b45309", padding: "4px 8px" }}>
                    Se edita en {sourceLabel(picked)}.
                  </div>
                )}
              </>
            )}
            {cellMenu.sectionKey && (
              <>
                <QuickMenuSep />
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    openAdd(cellMenu.sectionKey, cellMenu.itemKey, cellMenu.iso);
                    close();
                  }}
                >
                  Cargar acá…
                </button>
              </>
            )}
          </QuickMenu>
        );
      })()}

      {linkForm && (() => {
        const esEgreso = linkForm.total < 0;
        const monto = Math.abs(linkForm.total);
        const varios = linkForm.bankIds.length > 1;
        const section = CALENDAR_SECTIONS.find((x) => x.key === linkForm.sectionKey);
        const tab = (mode: LinkForm["mode"], label: string) => (
          <button
            key={mode}
            style={{
              ...btnSecondary,
              fontWeight: linkForm.mode === mode ? 800 : 500,
              borderColor: linkForm.mode === mode ? "#0f172a" : "#cbd5e1",
              background: linkForm.mode === mode ? "#0f172a" : "#fff",
              color: linkForm.mode === mode ? "#fff" : "#334155",
            }}
            onClick={() => setLinkForm({ ...linkForm, mode })}
          >
            {label}
          </button>
        );
        const puedeGuardar =
          linkForm.mode === "trabajo"
            ? !!linkForm.job.trim()
            : linkForm.mode === "proveedor"
            ? !!linkForm.supplier.trim()
            : !!linkForm.conceptKey;
        return (
          <div style={overlayStyle} onClick={() => setLinkForm(null)}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>Vincular movimiento{varios ? "s" : ""} del banco</h3>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                {linkForm.title}
                {varios ? ` · ${linkForm.bankIds.length} mov.` : linkForm.date ? ` · ${linkForm.date}` : ""}
                {" · "}
                <strong style={{ color: esEgreso ? "#dc2626" : "#0f172a" }}>
                  {esEgreso ? "salió" : "entró"} {money(monto)}
                </strong>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {tab("trabajo", "Cobro de un trabajo")}
                {tab("proveedor", "Pago a proveedor")}
                {tab("renglon", "Mover a un renglón")}
              </div>

              {linkForm.mode === "trabajo" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <label style={lblStyle}>
                    Trabajo (presupuesto · cliente)
                    <input
                      style={styles.input}
                      list="link-jobs"
                      value={linkForm.job}
                      autoFocus
                      placeholder="Ej: 3199 · Pérez"
                      onChange={(e) => setLinkForm({ ...linkForm, job: e.target.value })}
                    />
                    <datalist id="link-jobs">
                      {jobsInScope.map((j) => (
                        <option key={`${j.company}-${j.budgetNumber}`} value={`${j.budgetNumber} · ${j.client}`}>
                          {j.falta ? `falta: ${j.falta}` : ""}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Queda como cobranza de ese trabajo: sale de Sin clasificar y aparece en COBRANZAS, agrupado por
                    presupuesto · cliente.
                  </div>
                </div>
              )}

              {linkForm.mode === "proveedor" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <label style={lblStyle}>
                    Proveedor
                    <input
                      style={styles.input}
                      list="link-suppliers"
                      value={linkForm.supplier}
                      autoFocus
                      placeholder="Nombre del proveedor (o escribí uno nuevo)"
                      onChange={(e) => setLinkForm({ ...linkForm, supplier: e.target.value, invoiceId: null })}
                    />
                    <datalist id="link-suppliers">
                      {suppliers.filter((x) => x.active !== false).map((x) => (
                        <option key={x.name} value={x.name}>{x.taxId}</option>
                      ))}
                    </datalist>
                  </label>
                  {!varios && (
                    <label style={lblStyle}>
                      ¿Qué factura de compra cancela? <span style={{ color: "#94a3b8", fontSize: 11 }}>(opcional)</span>
                      <select
                        style={styles.input}
                        value={linkForm.invoiceId ?? ""}
                        onChange={(e) =>
                          setLinkForm({ ...linkForm, invoiceId: e.target.value ? Number(e.target.value) : null })
                        }
                      >
                        <option value="">— Ninguna (solo dejar el proveedor) —</option>
                        {linkInvoiceOptions.map((c) => (
                          <option key={c.invoice.id} value={c.invoice.id}>
                            {c.invoice.invoiceDate} · {c.invoice.invoiceNumber || "factura"} · {money(c.invoice.total)}
                            {c.sameAmount ? "  ✓ mismo importe" : ""}
                            {linkForm.supplier.trim() ? "" : ` · ${c.invoice.supplier}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {!varios && linkForm.supplier.trim() && linkInvoiceOptions.length === 0 && (
                    <div style={{ fontSize: 11, color: "#b45309" }}>
                      Ese proveedor no tiene facturas de compra impagas cargadas. Se vincula igual: queda el pago con su
                      nombre.
                    </div>
                  )}
                  {varios && (
                    <div style={{ fontSize: 11, color: "#b45309" }}>
                      Son {linkForm.bankIds.length} movimientos juntos. Para cancelar una factura puntual, entrá con el
                      botón derecho sobre el número del día (un movimiento paga una factura).
                    </div>
                  )}
                  <label style={lblStyle}>
                    Sección de la planilla
                    <select
                      style={styles.input}
                      value={linkForm.sectionKey}
                      onChange={(e) => setLinkForm({ ...linkForm, sectionKey: e.target.value, itemKey: "__own__" })}
                    >
                      {CALENDAR_SECTIONS.filter((x) => x.dir === "out").map((x) => (
                        <option key={x.key} value={x.key}>{x.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={lblStyle}>
                    Renglón
                    <select
                      style={styles.input}
                      value={linkForm.itemKey}
                      onChange={(e) => setLinkForm({ ...linkForm, itemKey: e.target.value })}
                    >
                      <option value="__own__">
                        ➕ Renglón propio: {linkForm.supplier.trim() || "(escribí el proveedor)"}
                      </option>
                      {(section?.items || []).filter((it) => !hiddenRows.has(it.key)).map((it) => (
                        <option key={it.key} value={it.key}>{labelOf(it.key, it.label)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {linkForm.mode === "renglon" && (
                <div style={{ display: "grid", gap: 10 }}>
                <label style={lblStyle}>
                  Renglón de la planilla
                  <select
                    style={styles.input}
                    value={linkForm.conceptKey}
                    autoFocus
                    onChange={(e) => setLinkForm({ ...linkForm, conceptKey: e.target.value })}
                  >
                    <option value="">— Elegí dónde va —</option>
                    <option value="__interno__">↔ Movimiento interno (no cuenta)</option>
                    {CALENDAR_SECTIONS.filter((x) => x.items.length > 0).map((x) => (
                      <optgroup key={x.key} label={x.label}>
                        {x.items.filter((it) => !hiddenRows.has(it.key)).map((it) => (
                          <option key={it.key} value={it.key}>{labelOf(it.key, it.label)}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label style={lblStyle}>
                  Día <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 400 }}>(opcional: mover el importe a otra columna)</span>
                  <input
                    style={styles.input}
                    type="date"
                    value={linkForm.moveDate}
                    onChange={(e) => setLinkForm({ ...linkForm, moveDate: e.target.value })}
                  />
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                    Vacío = cada movimiento se queda en su día. Si ponés una fecha, {linkForm.entryIds.length === 1 ? "el movimiento se mueve" : `los ${linkForm.entryIds.length} movimientos se mueven`} a esa columna.
                  </span>
                </label>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                <button style={btnSecondary} onClick={() => setLinkForm(null)}>Cancelar</button>
                <button style={btnPrimary} onClick={confirmLink} disabled={!puedeGuardar}>
                  Vincular
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {addForm && (() => {
        const section = CALENDAR_SECTIONS.find((s) => s.key === addForm.sectionKey);
        const isCob = section?.dynamic === "cobranzas";
        return (
          <div style={overlayStyle} onClick={() => setAddForm(null)}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>
                {addForm.editId ? "Editar movimiento" : "Cargar movimiento"} — {addForm.date}
              </h3>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={lblStyle}>
                  Día <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 400 }}>(cambialo para mover el importe a otra columna)</span>
                  <input
                    style={styles.input}
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  />
                </label>
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
                  <>
                    <label style={lblStyle}>Renglón
                      <select style={styles.input} value={addForm.itemKey} onChange={(e) => setAddForm({ ...addForm, itemKey: e.target.value })}>
                        {(section?.items || []).filter((it) => !hiddenRows.has(it.key)).map((it) => (
                          <option key={it.key} value={it.key}>{labelOf(it.key, it.label)}</option>
                        ))}
                        <option value="__custom__">➕ Otro renglón (escribir)…</option>
                      </select>
                    </label>
                    {addForm.itemKey === "__custom__" && (
                      <label style={lblStyle}>Nombre del renglón nuevo
                        <input style={styles.input} value={addForm.customLabel} placeholder="Ej: Fletes especiales" autoFocus
                          onChange={(e) => setAddForm({ ...addForm, customLabel: e.target.value })} />
                      </label>
                    )}
                  </>
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
                <button style={btnPrimary} onClick={confirmAdd} disabled={!(Number(addForm.amount) > 0) || !addForm.company || (isCob ? false : !addForm.itemKey) || (addForm.itemKey === "__custom__" && !addForm.customLabel.trim())}>
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

// Ancho de las columnas: sale de dos variables CSS que pone el contenedor (--cal-label-w para la
// columna Concepto y --cal-day-w para los días). Así se cambia el ancho de TODA la planilla de una,
// arrastrando el borde del encabezado, sin tocar celda por celda.
const LABEL_W_DEFAULT = 230;
const DAY_W_DEFAULT = 56;
// Vista compacta (botón "Compacto"): entra mucha más planilla en la misma pantalla.
const LABEL_W_COMPACT = 130;
const DAY_W_COMPACT = 40;
// Las columnas de la tabla (<col>): con tableLayout "fixed" son las que fijan el ancho real.
const labelColWidth = { width: `var(--cal-label-w, ${LABEL_W_DEFAULT}px)` } as const;
const dayColWidth = { width: `var(--cal-day-w, ${DAY_W_DEFAULT}px)` } as const;
const labelWidth = {
  width: `var(--cal-label-w, ${LABEL_W_DEFAULT}px)`,
  minWidth: `var(--cal-label-w, ${LABEL_W_DEFAULT}px)`,
  maxWidth: `var(--cal-label-w, ${LABEL_W_DEFAULT}px)`,
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;
const dayWidth = {
  width: `var(--cal-day-w, ${DAY_W_DEFAULT}px)`,
  minWidth: `var(--cal-day-w, ${DAY_W_DEFAULT}px)`,
  maxWidth: `var(--cal-day-w, ${DAY_W_DEFAULT}px)`,
  overflow: "hidden",
} as const;
const thStickyCorner: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 3, background: "#f1f5f9", textAlign: "left",
  padding: "6px 10px", borderBottom: "1px solid #e2e8f0", ...labelWidth,
};
const thMonth: React.CSSProperties = {
  padding: "4px 8px", background: "#e2e8f0", borderLeft: "2px solid #cbd5e1", fontWeight: 800, textAlign: "center",
  position: "sticky", zIndex: 4,
};
const thDay: React.CSSProperties = {
  padding: "4px 6px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b",
  textAlign: "right", position: "sticky", zIndex: 4, boxShadow: "inset 0 -1px 0 #e2e8f0", ...dayWidth,
};
const tdStickyLabel: React.CSSProperties = {
  position: "sticky", left: 0, zIndex: 2, background: "#ffffff", padding: "5px 10px",
  borderBottom: "1px solid #f1f5f9", fontWeight: 600, ...labelWidth,
};
const tdCell: React.CSSProperties = {
  padding: "4px 6px", borderBottom: "1px solid #f1f5f9", textAlign: "right", ...dayWidth,
};
// Manija para arrastrar el borde de una columna (como en una planilla). Doble click vuelve al original.
// Se VE (una rayita gris en el borde del encabezado): si es invisible, nadie se entera de que existe.
const resizeHandle: React.CSSProperties = {
  position: "absolute", top: 0, right: 0, width: 7, height: "100%", cursor: "col-resize",
  userSelect: "none", background: "transparent", borderRight: "2px solid #94a3b8",
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
const costChip: React.CSSProperties = {
  display: "inline-block", fontWeight: 800, fontSize: 9, borderRadius: 4, padding: "0px 4px", marginLeft: 5, verticalAlign: "middle",
};
const bnPill: React.CSSProperties = {
  display: "inline-block", fontWeight: 800, fontSize: 8, borderRadius: 3, padding: "0px 3px", marginRight: 3, verticalAlign: "middle",
};
const dPill: React.CSSProperties = {
  display: "inline-block", fontWeight: 800, fontSize: 9, borderRadius: 999, padding: "0px 6px", marginLeft: 6,
  background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", verticalAlign: "middle",
};
const alertPill: React.CSSProperties = {
  display: "inline-block", fontWeight: 700, fontSize: 10, borderRadius: 6, padding: "0px 6px", marginLeft: 8,
  background: "#ffedd5", color: "#9a3412", border: "1px solid #fdba74", verticalAlign: "middle",
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
