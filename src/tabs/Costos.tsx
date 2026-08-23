// Solapa Costos: costos fijos y variables del ano fiscal, mes a mes.
//
// Que muestra:
//   - la grilla grupo x mes (el "para ver esta informacion" del pedido)
//   - los grupos y su tipo (el GRUPO define fijo/variable, no el item)
//   - carga manual de gastos que no viven en otra solapa (alquiler, servicios, impuestos)
//   - import del extracto bancario (Excel/PDF/CSV) con revision antes de impactar
//
// EL GASTO ES EL PAGO (regla del 2026-07-19): la factura de compra ya NO entra al resultado, es solo
// registro. Los pagos a proveedores se cargan aca y son los que alimentan el resultado.
// Caja chica y personal siguen agregandose solos desde sus solapas (grupos "auto"), asi el mismo
// gasto no se cuenta dos veces.
import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, MiniMetric, ButtonLike, FileDropButton, AmountInput, ColorTag, PillD, moneyToneColor, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija, useCeldaMarcada,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { bankEntryMissingInfo } from "../domain/bankAssignment";
import { CALENDAR_SECTIONS } from "../domain/calendarStructure";
import { money } from "../lib/format";
import { isAutoCostGroup, monthKeyLabel, composeCostEntriesByGroup, resolveGroupKind } from "../domain/costs";
import { computeSupplierAccounts } from "../domain/supplierAccounts";
import type { CostAggregation, CostSourceRow } from "../domain/costs";
import { PAYMENT_METHOD_OPTIONS } from "../domain/types";
import type {
  CompanyName,
  CostEntry,
  CostGroup,
  CostKind,
  CostRule,
  IssuedInvoice,
  PettyCashExpense,
  Supplier,
} from "../domain/types";
import type { ReconciliationSummary } from "../domain/suppliers";
import type { IntercompanyTransfer, IntercompanySummary } from "../domain/intercompany";

export type CostStatementDraftRow = {
  id: number;
  date: string;
  concept: string;
  amount: number;
  movementType: "credito" | "debito";
  group: string;
  administration: "blanco" | "negro";
  include: boolean;
  // Precompletado por el motor de reglas (para mostrar un indicio "sugerido"): quién detectó el grupo.
  suggestedVia?: "supplier" | "keyword" | "amount";
  // Proveedor detectado en el concepto (para vincular el gasto y aprender la regla al confirmar).
  supplierId?: number;
  supplierName?: string;
};

// Pill F/V: reconoce de un vistazo si un gasto es fijo o variable, en cualquier lugar de la solapa.
const KindPill = ({ kind }: { kind: CostKind }) => (
  <span
    title={kind === "fijo" ? "Costo fijo" : "Costo variable"}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 16,
      height: 16,
      padding: "0 3px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 800,
      background: kind === "fijo" ? "#dbeafe" : "#fef3c7",
      color: kind === "fijo" ? "#1e40af" : "#92400e",
    }}
  >
    {kind === "fijo" ? "F" : "V"}
  </span>
);

type CostosTabProps = {
  fiscalLabel: string;
  months: string[];
  aggregation: CostAggregation;
  costGroups: CostGroup[];
  costEntries: CostEntry[];
  pettyCashExpenses: any[];
  updatePettyCashExpense: (id: number, field: keyof PettyCashExpense, value: any) => void;
  getPettyCashAdministration: (exp: any) => "blanco" | "negro";
  // Auto-clasificacion: ubica de una los gastos sin grupo con las reglas aprendidas. Devuelve cuantos.
  autoClassifyUnassigned: () => number;
  // Cuenta corriente proveedores: facturas de compra + vincularlas a un pago.
  purchaseInvoices: any[];
  updatePurchaseInvoice: (id: number, field: any, value: any) => void;
  // Vínculo factura emitida (ARCA) -> trabajo aprobado (por número de presupuesto).
  approvedJobsForLink: { budgetNumber: string; client: string; company: string }[];
  updateIssuedInvoice: (id: number, field: any, value: any) => void;
  costRows: CostSourceRow[];
  companyScope: string;
  // Objetos { value, short, ... } del catalogo de empresas (misma forma que en las otras solapas).
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  onScopeChange: (scope: string) => void;
  onShiftFiscalYear: (delta: number) => void;
  // grupos
  addCostGroup: () => void;
  removeCostGroup: (id: number) => void;
  updateCostGroup: (id: number, field: keyof CostGroup, value: any) => void;
  // Crea un grupo "en el momento" desde el desplegable de clasificación. Devuelve el nombre creado.
  createCostGroup: (name: string, kind: CostKind) => string;
  // Bloque de Tarjetas: se renderiza DENTRO de esta solapa (orden: pago proveedores → bancos →
  // tarjetas → costos fijos/variables), no como solapa aparte.
  tarjetasSlot?: React.ReactNode;
  // gastos
  addCostEntry: () => void;
  removeCostEntry: (id: number) => void;
  updateCostEntry: (id: number, field: keyof CostEntry, value: any) => void;
  // reglas de clasificación con memoria
  costRules: CostRule[];
  updateCostRule: (id: number, field: keyof CostRule, value: any) => void;
  removeCostRule: (id: number) => void;
  // proveedores + cotejo del pago contra el extracto
  suppliers: Supplier[];
  addSupplier: () => void;
  removeSupplier: (id: number) => void;
  updateSupplier: (id: number, field: keyof Supplier, value: any) => void;
  paymentsReconciliation: ReconciliationSummary;
  // Facturas emitidas (listado de ARCA): registro, no suma al resultado.
  issuedInvoices: IssuedInvoice[];
  onImportArca: (files: FileList | File[] | null) => void;
  // Giros entre las empresas del grupo: no son pagos, pero hay que cruzarlos con factura o devolucion.
  intercompanyAccount: {
    transfers: IntercompanyTransfer[];
    summary: IntercompanySummary;
  };
  // extracto
  statementDraft: CostStatementDraftRow[];
  statementMessage: string;
  statementBusy: boolean;
  onStatementFile: (file: File | null) => void;
  updateStatementDraftRow: (id: number, field: keyof CostStatementDraftRow, value: any) => void;
  commitStatementDraft: () => void;
  discardStatementDraft: () => void;
  // Movimientos bancarios (el banco real): mudado desde Balance/Cash Flow. Es el espejo de la cuenta,
  // no suma al resultado. Se navega por mes con shiftOperationalMonth.
  bankStatementSummary: any;
  monthBankStatementEntries: any[];
  operationalMonth: string;
  monthLabel: (month: string) => string;
  shiftOperationalMonth: (delta: number) => void;
  addBankStatementEntry: () => void;
  removeBankStatementEntry: (id: number) => void;
  updateBankStatementEntry: (id: number, field: any, value: string | number | boolean) => void;
  clearBankAssignment: (id: number) => void;
  uploadBankStatementFile: (id: number, file: File | null) => void;
  // Importador MASIVO al espejo bancario.
  bankMirrorPreview: Array<{ date: string; concept: string; amount: number; movementType: "credito" | "debito"; balance: number; dup: boolean }>;
  bankMirrorCompany: string;
  setBankMirrorCompany: (v: string) => void;
  bankMirrorBank: string;
  setBankMirrorBank: (v: string) => void;
  bankMirrorCurrency: "ARS" | "USD";
  setBankMirrorCurrency: (v: "ARS" | "USD") => void;
  bankMirrorMessage: string;
  bankMirrorBusy: boolean;
  onBankMirrorFile: (file: File | null) => void;
  commitBankMirrorDraft: () => void;
  discardBankMirrorDraft: () => void;
  knownBanks: string[];
};

export function CostosTab({
  suppliers,
  addSupplier,
  removeSupplier,
  updateSupplier,
  paymentsReconciliation,
  intercompanyAccount,
  issuedInvoices,
  onImportArca,
  fiscalLabel,
  months,
  aggregation,
  costGroups,
  costEntries,
  pettyCashExpenses,
  updatePettyCashExpense,
  getPettyCashAdministration,
  autoClassifyUnassigned,
  purchaseInvoices,
  updatePurchaseInvoice,
  approvedJobsForLink,
  updateIssuedInvoice,
  companyScope,
  COMPANY_OPTIONS,
  getCompanyMeta,
  onScopeChange,
  onShiftFiscalYear,
  addCostGroup,
  removeCostGroup,
  updateCostGroup,
  createCostGroup,
  tarjetasSlot,
  addCostEntry,
  removeCostEntry,
  updateCostEntry,
  costRules,
  updateCostRule,
  removeCostRule,
  statementDraft,
  statementMessage,
  statementBusy,
  onStatementFile,
  updateStatementDraftRow,
  commitStatementDraft,
  discardStatementDraft,
  bankStatementSummary,
  monthBankStatementEntries,
  operationalMonth,
  monthLabel,
  shiftOperationalMonth,
  addBankStatementEntry,
  removeBankStatementEntry,
  updateBankStatementEntry,
  clearBankAssignment,
  uploadBankStatementFile,
  bankMirrorPreview,
  bankMirrorCompany,
  setBankMirrorCompany,
  bankMirrorBank,
  setBankMirrorBank,
  bankMirrorCurrency,
  setBankMirrorCurrency,
  bankMirrorMessage,
  bankMirrorBusy,
  onBankMirrorFile,
  commitBankMirrorDraft,
  discardBankMirrorDraft,
  knownBanks,
}: CostosTabProps) {
  // ---- PLANILLA "Costos por grupo y mes" (estetica del Calendario anual) ----------------------
  const anchosCostos = usePlanillaWidths("costos.porGrupoMes", { label: 210, col: 96, colCompact: 72 });
  const [seccionesCerradas, setSeccionesCerradas] = React.useState<Set<string>>(new Set());
  const plegarSeccion = (k: string) =>
    setSeccionesCerradas((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  // Boton derecho sobre un numero: ver los gastos que hay detras de ese grupo y mes.
  const [menuCelda, setMenuCelda] = React.useState<null | {
    x: number; y: number; group: string; month: string; total: number; pickedId?: number;
  }>(null);
  const gastosDetras = (group: string, month: string) =>
    costEntries.filter(
      (e) =>
        (companyScope === "__ALL__" || e.company === companyScope) &&
        (e.group || "") === group &&
        String(e.date || "").startsWith(`${month}-`)
    );

  // ---- PLANILLA de gastos cargados -------------------------------------------------------------
  const anchosArca = usePlanillaWidths("costos.arca", { label: 300, col: 124, colCompact: 94 });
  const anchosCcPares = usePlanillaWidths("costos.cc.pares", { label: 240, col: 124, colCompact: 94 });
  const anchosCcGiros = usePlanillaWidths("costos.cc.giros", { label: 240, col: 124, colCompact: 94 });
  const anchosProveedores = usePlanillaWidths("costos.proveedores", { label: 280, col: 150, colCompact: 112 });
  const anchosGrupos = usePlanillaWidths("costos.grupos", { label: 280, col: 120, colCompact: 92 });
  const anchosReglas = usePlanillaWidths("costos.reglas", { label: 320, col: 180, colCompact: 130 });
  const anchosGastos = usePlanillaWidths("costos.gastos", { label: 260, col: 108, colCompact: 82 });
  const marcaGastos = useCeldaMarcada();
  const [soloSinGrupo, setSoloSinGrupo] = React.useState(false);

  // ---- PLANILLA del espejo bancario ----------------------------------------------------------
  const anchosBanco = usePlanillaWidths("costos.banco", { label: 260, col: 104, colCompact: 78 });
  const marcaBanco = useCeldaMarcada();
  const [soloSinAsignar, setSoloSinAsignar] = React.useState(false);

  const fixedRows = aggregation.rows.filter((row) => row.kind === "fijo");
  const variableRows = aggregation.rows.filter((row) => row.kind === "variable");

  // Conciliación de movimientos bancarios (Fase 1): fila desplegada para asignarle un lugar a la plata.
  const [assignOpenId, setAssignOpenId] = React.useState<number | null>(null);
  // Opciones del buscador, tomadas de lo que YA existe en el sistema (trabajos + proveedores/clientes).
  const partyOptions = React.useMemo(() => {
    const set = new Set<string>();
    approvedJobsForLink.forEach((j) => j.client && set.add(j.client.trim()));
    suppliers.forEach((s) => s.name && set.add(s.name.trim()));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [approvedJobsForLink, suppliers]);

  // Solo los grupos no automaticos admiten carga manual.
  const manualGroupOptions = costGroups
    .filter((group) => group.active && !group.auto)
    .map((group) => group.name);

  // Tipo (fijo/variable) del grupo de un gasto, para la pill F/V.
  const kindOfGroup = (groupName: string): CostKind => resolveGroupKind(costGroups, groupName);

  // Menú contextual (click derecho) para clasificar rápido un gasto sin abrir toda la fila.
  const [ctxMenu, setCtxMenu] = React.useState<null | {
    x: number;
    y: number;
    kind: "pago" | "caja" | "banco";
    id: number;
  }>(null);
  const openCtxMenu = (ev: React.MouseEvent, kind: "pago" | "caja" | "banco", id: number) => {
    ev.preventDefault();
    // Sin esto, el click derecho llega a window y el propio menú que se está abriendo se cierra solo
    // (pasa al saltar de una fila a otra con el menú ya abierto).
    ev.stopPropagation();
    setCtxMenu({ x: ev.clientX, y: ev.clientY, kind, id });
  };

  // Buscador de gastos: filtra por concepto, proveedor, grupo, admin (blanco/negro), fecha o monto.
  const [search, setSearch] = React.useState("");
  const searchLc = search.trim().toLowerCase();
  const matchesSearch = (e: CostEntry) => {
    if (!searchLc) return true;
    const hay = [
      e.description,
      e.supplier,
      e.group,
      e.administration,
      e.date,
      String(e.amount),
      e.company,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(searchLc);
  };
  const filteredEntries = costEntries.filter(matchesSearch);

  // Vista jerarquica fijo/variable -> grupo (con total) -> gastos asignados debajo. Respeta el buscador.
  const composition = composeCostEntriesByGroup(filteredEntries, costGroups, companyScope);

  // Bloque de caja chica: gastos que entraron por caja chica, para clasificarlos a un grupo de costo.
  const cajaChicaList = pettyCashExpenses
    .filter((e) => (companyScope === "__ALL__" || e.company === companyScope) && Number(e.amount || 0) > 0)
    .filter((e) => {
      if (!searchLc) return true;
      return [e.description, e.category, e.supplier, e.costGroup || "", getPettyCashAdministration(e), e.date, String(e.amount)]
        .join(" ")
        .toLowerCase()
        .includes(searchLc);
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);

  // Cuenta corriente proveedores: facturas de compra por proveedor; deuda = las que no tienen pago vinculado.
  const supplierAccounts = computeSupplierAccounts(
    purchaseInvoices.map((i) => ({
      id: i.id,
      company: i.company,
      supplier: i.supplier,
      taxId: i.taxId,
      invoiceNumber: i.invoiceNumber,
      invoiceDate: i.invoiceDate,
      total: Number(i.total || 0),
      paidByCostEntryId: i.paidByCostEntryId,
      // Vinculo desde el Calendario anual: el debito del banco que paga la factura (deja de ser deuda).
      paidByBankEntryId: i.paidByBankEntryId,
    })),
    companyScope
  ).accounts.filter((a) => {
    if (!searchLc) return true;
    return `${a.supplier} ${a.taxId}`.toLowerCase().includes(searchLc);
  });
  const deudaTotalProv = supplierAccounts.reduce((s, a) => s + a.deuda, 0);
  // Pagos (CostEntry) que se pueden vincular a una factura: misma empresa; se muestran todos (el usuario
  // elige). Etiqueta con fecha, proveedor y monto para reconocerlos.
  const paymentsForInvoice = (invCompany: string, supplierName: string) =>
    costEntries.filter(
      (e) =>
        e.company === invCompany &&
        (!supplierName ||
          !e.supplier ||
          e.supplier.trim().toLowerCase() === supplierName.trim().toLowerCase())
    );

  // Helpers para el panel de reglas de clasificación.
  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]));
  const companyShortLabel = (c: string) =>
    c === "General" ? "General" : getCompanyMeta(c as CompanyName)?.short || c;
  const ruleCriterioLabel = (rule: CostRule) => {
    if (rule.matchType === "supplier") {
      return supplierNameById.get(Number(rule.matchValue)) || `proveedor #${rule.matchValue}`;
    }
    if (rule.matchType === "amount") return money(Number(rule.matchValue));
    return `"${rule.matchValue}"`;
  };
  const ruleViaLabel = (rule: CostRule) =>
    rule.matchType === "supplier" ? "Proveedor" : rule.matchType === "keyword" ? "Palabra clave" : "Monto";

  // Manejo de los desplegables de grupo: si se elige "➕ nuevo grupo", pide nombre y tipo y lo crea al
  // momento (para no tener que ir al panel de Grupos y volver). Si no, asigna el grupo elegido.
  const NEW_GROUP_OPTION = "__NEW_GROUP__";
  const pickGroupOrCreate = (raw: string, apply: (name: string) => void) => {
    if (raw !== NEW_GROUP_OPTION) {
      apply(raw);
      return;
    }
    const name = (window.prompt("Nombre del grupo nuevo (ej: Impuestos, Herrajes, Salud):") || "").trim();
    if (!name) return; // cancelado
    const esFijo = window.confirm(
      `"${name}": ¿es un costo FIJO?\n\nAceptar = FIJO (se repite todos los meses)\nCancelar = VARIABLE`
    );
    const created = createCostGroup(name, esFijo ? "fijo" : "variable");
    if (created) apply(created);
  };

  // Cotejo del pago contra el extracto. Verde = el debito esta; ambar = deberia estar y no aparece
  // (o falta cargar el extracto, o el pago esta mal); gris = no pasa por el banco, no se cerifica.
  const matchByPayment = new Map(paymentsReconciliation.matches.map((m) => [m.paymentId, m]));
  const renderCotejo = (entryId: number) => {
    const match = matchByPayment.get(entryId);
    if (!match || match.status === "no_aplica") {
      return <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>;
    }
    const ok = match.status === "conciliado";
    const montoDistinto = ok && Math.abs(match.diff || 0) > 1;
    return (
      <span
        title={match.detail}
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: ok && !montoDistinto ? "#15803d" : "#b45309",
          whiteSpace: "nowrap",
        }}
      >
        {ok ? (montoDistinto ? "≠ monto" : "✓ en el banco") : "⚠ no figura"}
      </span>
    );
  };

  const monthsWithData = months.filter((m) => (aggregation.totalByMonth[m] || 0) > 0).length;
  const fixedMonthlyAverage =
    monthsWithData > 0 ? aggregation.fixedTotal / monthsWithData : 0;

  const renderGroupRows = (rows: typeof aggregation.rows, kindLabel: string) => (
    <>
      <tr>
        <td
          colSpan={months.length + 2}
          style={{ fontWeight: 800, background: "#f1f5f9", color: "#0f172a" }}
        >
          {kindLabel}
        </td>
      </tr>
      {rows.length === 0 && (
        <tr>
          <td colSpan={months.length + 2} style={{ color: "#64748b" }}>
            Sin grupos de este tipo.
          </td>
        </tr>
      )}
      {rows.map((row) => (
        <tr key={`${kindLabel}-${row.group}`}>
          <td>
            {row.group}
            {row.auto && (
              <span style={{ ...styles.chatStatus, marginLeft: 6 }}>auto</span>
            )}
          </td>
          {months.map((month) => (
            <td key={month} style={{ textAlign: "right" }}>
              {(row.byMonth[month] || 0) > 0 ? money(row.byMonth[month]) : "-"}
            </td>
          ))}
          <td style={{ textAlign: "right", fontWeight: 700 }}>{money(row.total)}</td>
        </tr>
      ))}
    </>
  );

  return (
    <>
      <Panel
        title={`Costos fijos y variables - ${fiscalLabel}`}
        span="full"
        actions={
          <>
            <ButtonLike onClick={() => onShiftFiscalYear(-1)} secondary>
              Ano anterior
            </ButtonLike>
            <ButtonLike onClick={() => onShiftFiscalYear(1)} secondary>
              Ano siguiente
            </ButtonLike>
          </>
        }
      >
        <div style={styles.grid2}>
          <Field label="Empresa">
            <select
              style={styles.input}
              value={companyScope}
              onChange={(e) => onScopeChange(e.target.value)}
            >
              <option value="__ALL__">Todas las empresas</option>
              {COMPANY_OPTIONS.map((company) => (
                <option key={company.value} value={company.value}>
                  {company.short}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={styles.metricsRow}>
          <MiniMetric label="Costos fijos del ano" value={money(aggregation.fixedTotal)} tone="out" />
          <MiniMetric
            label="Costos variables del ano"
            value={money(aggregation.variableTotal)}
            tone="out"
          />
          <MiniMetric label="Total del ano" value={money(aggregation.total)} tone="out" />
          <MiniMetric
            label={`Promedio fijo mensual (${monthsWithData} mes/es con datos)`}
            value={money(fixedMonthlyAverage)}
          />
        </div>
        <div style={styles.sectionNote}>
          Compras, caja chica y personal se agregan solos desde sus solapas (grupos "auto"): no se
          cargan aca para no contar el mismo gasto dos veces. Aca cargas lo que no vive en ninguna
          otra solapa (alquiler, servicios, impuestos), a mano o importando el extracto.
        </div>
      </Panel>

      <Panel
        title="Importar extracto bancario" span="full"
        actions={
          statementDraft.length > 0 ? (
            <>
              <ButtonLike onClick={commitStatementDraft}>
                Confirmar {statementDraft.filter((row) => row.include).length} movimiento(s)
              </ButtonLike>
              <ButtonLike onClick={discardStatementDraft} secondary>
                Descartar
              </ButtonLike>
            </>
          ) : undefined
        }
      >
        <FileDropButton
          label={statementBusy ? "Leyendo extracto..." : "Cargar extracto (Excel, PDF o CSV)"}
          accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
          onFileSelected={onStatementFile}
        />
        {statementMessage && <div style={styles.sectionNote}>{statementMessage}</div>}

        {statementDraft.length > 0 && (
          <>
            <div style={styles.sectionNote}>
              Reviso los movimientos y te propongo un grupo. Corregi lo que haga falta y confirma:
              solo se cargan los debitos tildados. Los creditos (plata que entra) no son costos.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Cargar</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Importe</th>
                    <th>Grupo</th>
                    <th>Admin.</th>
                  </tr>
                </thead>
                <tbody>
                  {statementDraft.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) =>
                            updateStatementDraftRow(row.id, "include", e.target.checked)
                          }
                        />
                      </td>
                      <td>{row.date}</td>
                      <td>{row.concept}</td>
                      <td>{row.movementType === "debito" ? "Debito" : "Credito"}</td>
                      <td
                        style={{
                          textAlign: "right",
                          color: moneyToneColor(row.movementType === "debito" ? "out" : "in"),
                        }}
                      >
                        {money(row.amount)}
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={row.group}
                          onChange={(e) =>
                            pickGroupOrCreate(e.target.value, (name) =>
                              updateStatementDraftRow(row.id, "group", name)
                            )
                          }
                        >
                          <option value="">Sin clasificar</option>
                          {manualGroupOptions.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                          <option value={NEW_GROUP_OPTION}>➕ Crear grupo nuevo…</option>
                        </select>
                        {row.suggestedVia && row.group && (
                          <div
                            style={{ fontSize: 10, color: "#7c3aed", marginTop: 2 }}
                            title="Grupo sugerido por una regla aprendida. Confirmalo o cambialo."
                          >
                            🧠 sugerido{row.supplierName ? ` · ${row.supplierName}` : ""}
                          </div>
                        )}
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={row.administration}
                          onChange={(e) =>
                            updateStatementDraftRow(row.id, "administration", e.target.value)
                          }
                        >
                          <option value="blanco">Blanco</option>
                          <option value="negro">Negro</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Grupos de costos" span="full"
        actions={<ButtonLike onClick={addCostGroup}>Agregar grupo</ButtonLike>}
      >
        <div style={styles.sectionNote}>
          El grupo define si el gasto es fijo o variable. Los grupos "auto" se alimentan de otras
          solapas y no se pueden editar ni borrar.
        </div>
        <div style={{ ...planillaWrap, ...anchosGrupos.vars }}>
        <table style={planillaTable}>
          <colgroup>
            <col style={colLabel} />
            <col style={colDato} />
            <col style={colFlexible} />
          </colgroup>
          <thead>
            <tr>
              <th style={thEsquina}>
                Grupo
                <PlanillaManija
                  onMouseDown={(ev) => anchosGrupos.startResize(ev, "label")}
                  onDoubleClick={anchosGrupos.resetLabel}
                />
              </th>
              <th style={thColumna}>
                Tipo
                <PlanillaManija
                  onMouseDown={(ev) => anchosGrupos.startResize(ev, "col")}
                  onDoubleClick={anchosGrupos.resetCol}
                />
              </th>
              <th style={thFlexible}>Origen · observación</th>
            </tr>
          </thead>
          <tbody>
            {costGroups.map((group) => (
              <tr
                key={group.id}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  if (group.auto) return;
                  if (window.confirm(`¿Quitar el grupo "${group.name}"?`)) removeCostGroup(group.id);
                }}
                title={
                  group.auto
                    ? "Grupo automático: no se puede renombrar ni quitar."
                    : "Click derecho: quitar. El punto verde activa o desactiva."
                }
              >
                <td style={{ ...tdNombre, fontWeight: 400, padding: 0, opacity: group.active ? 1 : 0.45 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                    <span
                      title={group.active ? "Activo" : "Inactivo"}
                      onClick={() => updateCostGroup(group.id, "active", !group.active)}
                      style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                        cursor: "pointer", background: group.active ? "#16a34a" : "#cbd5f5",
                      }}
                    />
                    <input
                      style={{ ...inputCelda, color: group.auto ? "#94a3b8" : "inherit" }}
                      {...focoCelda}
                      value={group.name}
                      disabled={group.auto}
                      onChange={(e) => updateCostGroup(group.id, "name", e.target.value)}
                    />
                  </span>
                </td>
                <td style={{ ...tdDato, padding: 0 }}>
                  <select
                    style={{ ...inputCelda, width: "auto" }}
                    value={group.kind}
                    onChange={(e) => updateCostGroup(group.id, "kind", e.target.value as CostKind)}
                  >
                    <option value="fijo">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                </td>
                <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                    <span style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {group.auto ? "automático" : "manual"}
                    </span>
                    <input
                      style={{ ...inputCelda, flex: 1, minWidth: 120 }}
                      {...focoCelda}
                      value={group.notes}
                      placeholder="observación"
                      onChange={(e) => updateCostGroup(group.id, "notes", e.target.value)}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Panel>

      <Panel title="Reglas de clasificación · memoria" span="full">
        <div style={styles.sectionNote}>
          Cuando clasificás un gasto a un grupo, el sistema <strong>aprende una regla</strong> y el
          próximo gasto del mismo <strong>proveedor</strong> o <strong>concepto</strong> ya viene{" "}
          <strong>sugerido</strong> a ese grupo (siempre confirmás vos). Si un mismo criterio se
          clasificó a <strong>dos grupos distintos</strong>, la regla queda <strong>ambigua</strong> y
          deja de sugerir hasta que la resuelvas acá (elegí el grupo correcto).
        </div>
        {costRules.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            Todavía no hay reglas. Se crean solas a medida que clasificás gastos (importando el extracto
            o a mano en "Gastos cargados").
          </div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosReglas.vars }}>
          <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colFlexible} />
              </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Criterio
                  <PlanillaManija
                    onMouseDown={(ev) => anchosReglas.startResize(ev, "label")}
                    onDoubleClick={anchosReglas.resetLabel}
                  />
                </th>
                <th style={thColumna}>
                  Grupo sugerido
                  <PlanillaManija
                    onMouseDown={(ev) => anchosReglas.startResize(ev, "col")}
                    onDoubleClick={anchosReglas.resetCol}
                  />
                </th>
                <th style={thFlexible}>Estado · veces usada · empresa</th>
              </tr>
            </thead>
            <tbody>
              {[...costRules]
                .sort(
                  (a, b) =>
                    Number(b.ambiguous) - Number(a.ambiguous) ||
                    Number(b.hits || 0) - Number(a.hits || 0)
                )
                .map((rule) => (
                  <tr
                    key={rule.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (window.confirm(`¿Borrar la regla "${ruleCriterioLabel(rule)}"?`)) removeCostRule(rule.id);
                    }}
                    title="Click derecho: borrar la regla"
                    style={
                      rule.ambiguous
                        ? { background: "#fffbeb" }
                        : rule.active
                        ? undefined
                        : { opacity: 0.5 }
                    }
                  >
                    <td style={{ ...tdNombre, fontWeight: 400, background: "inherit" }}>
                      <span
                        title={rule.ambiguous ? "Ambigua: fijá el grupo" : rule.active ? "Activa" : "Inactiva"}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                          background: rule.ambiguous ? "#ca8a04" : rule.active ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      <span style={{ color: "#64748b", fontSize: 12 }}>{ruleViaLabel(rule)}:</span>{" "}
                      <strong>{ruleCriterioLabel(rule)}</strong>
                    </td>
                    <td style={{ ...tdDato, padding: 0, background: "inherit" }}>
                      <select
                        style={{ ...inputCelda, width: "100%" }}
                        value={rule.group}
                        onChange={(e) =>
                          pickGroupOrCreate(e.target.value, (name) => updateCostRule(rule.id, "group", name))
                        }
                      >
                        <option value="">(elegí grupo)</option>
                        {manualGroupOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                        <option value={NEW_GROUP_OPTION}>➕ Crear grupo nuevo…</option>
                      </select>
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b", background: "inherit" }}>
                      {rule.ambiguous ? (
                        <span style={{ color: "#b45309", fontWeight: 600 }}>⚠ Ambigua — fijá el grupo</span>
                      ) : (
                        <label style={{ cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={(e) => updateCostRule(rule.id, "active", e.target.checked)}
                          />{" "}
                          Activa
                        </label>
                      )}
                      <span style={{ color: "#94a3b8" }}>
                        {" · "}usada {rule.hits} {Number(rule.hits) === 1 ? "vez" : "veces"}
                        {" · "}{companyShortLabel(rule.company)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Facturas emitidas (listado de ARCA)"
        span="full"
        actions={
          <FileDropButton
            label="Importar listados de ARCA"
            accept=".xlsx,.xls,.csv"
            allowMultiple
            onFilesSelected={(files) => onImportArca(files)}
          />
        }
      >
        <div style={styles.sectionNote}>
          Es el export <strong>"Mis Comprobantes Emitidos"</strong> tal como lo baja ARCA. Se guardan
          los DATOS, no el PDF. <strong>La factura no suma ni resta al resultado</strong>: sirve para
          tener el listado, para cruzar las facturas entre las dos empresas contra los giros, y para
          saber lo que falta cobrar. La empresa emisora sale del CUIT del titulo del archivo, asi que
          no importa desde que empresa lo cargues. Los comprobantes repetidos no se duplican.
        </div>
        {issuedInvoices.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            Todavia no cargaste ningun listado.
          </div>
        ) : (
          <>
            <div style={styles.metricGrid}>
              <MiniMetric label="Comprobantes" value={String(issuedInvoices.length)} />
              <MiniMetric
                label="Total emitido"
                value={money(issuedInvoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0))}
              />
              <MiniMetric
                label="Periodo"
                value={`${issuedInvoices.reduce((a, i) => (a < i.date ? a : i.date), issuedInvoices[0].date)} a ${issuedInvoices.reduce((a, i) => (a > i.date ? a : i.date), issuedInvoices[0].date)}`}
              />
            </div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
                Ver los {issuedInvoices.length} comprobantes
              </summary>
              <div style={{ overflowX: "auto", marginTop: 8, maxHeight: 420, overflowY: "auto" }}>
                <table style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Factura
                        <PlanillaManija
                          onMouseDown={(ev) => anchosArca.startResize(ev, "label")}
                          onDoubleClick={anchosArca.resetLabel}
                        />
                      </th>
                      <th style={thColumna}>
                        Fecha
                        <PlanillaManija
                          onMouseDown={(ev) => anchosArca.startResize(ev, "col")}
                          onDoubleClick={anchosArca.resetCol}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Total</th>
                      <th style={thFlexible}>Trabajo vinculado · receptor · tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...issuedInvoices]
                      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                      .map((inv) => (
                        <tr key={inv.id}>
                          <td
                            style={{
                              ...tdNombre, fontWeight: 400,
                              boxShadow: `inset 4px 0 0 ${getCompanyMeta(inv.company)?.primary || "#94a3b8"}`,
                            }}
                          >
                            <span
                              title={inv.jobBudgetNumber ? "Vinculada a un trabajo" : "Sin vincular"}
                              style={{
                                display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                                background: inv.jobBudgetNumber ? "#16a34a" : "#cbd5f5",
                              }}
                            />
                            {inv.pointOfSale}-{inv.number}
                          </td>
                          <td style={{ ...tdDato, color: "#475569" }}>{inv.date}</td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(inv.total)}</td>
                          <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                              <select
                                style={{ ...inputCelda, width: "auto", minWidth: 170 }}
                                value={inv.jobBudgetNumber || ""}
                                onChange={(e) => updateIssuedInvoice(inv.id, "jobBudgetNumber", e.target.value)}
                              >
                                <option value="">— sin vincular —</option>
                                {approvedJobsForLink
                                  .filter((j) => j.company === inv.company)
                                  .map((j) => (
                                    <option key={j.budgetNumber} value={j.budgetNumber}>
                                      {j.budgetNumber} · {j.client}
                                    </option>
                                  ))}
                              </select>
                              <span style={{ color: "#94a3b8" }}>
                                {(inv.counterpartyName || "").slice(0, 46)}
                                {" · "}{inv.kind}
                                {" · "}{getCompanyMeta(inv.company)?.short || inv.company}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </Panel>

      <Panel title="Cuenta corriente entre las empresas del grupo" span="full">
        <div style={styles.sectionNote}>
          Lo que una empresa le gira a la otra <strong>no es un pago ni un cobro</strong>: para el grupo
          no entro ni salio nada, solo cambio de bolsillo. Por eso no suma al resultado. Pero cada giro
          se cruza con una <strong>factura entre las dos</strong> o con una <strong>devolucion</strong>,
          y lo que no esta cruzado es lo que hay que definir. Los giros se detectan por el CUIT de la
          otra empresa en la referencia del banco.
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric
            label="Girado entre empresas"
            value={money(intercompanyAccount.summary.totalTransferred)}
          />
          <MiniMetric
            label="Giros detectados"
            value={String(intercompanyAccount.transfers.length)}
          />
          <MiniMetric
            label="Sin declarar factura"
            value={money(
              intercompanyAccount.summary.pairs.reduce((acc, p) => acc + p.withoutBacking, 0)
            )}
            tone="out"
          />
        </div>
        {intercompanyAccount.transfers.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            No se detectaron giros entre las empresas. Se necesitan los movimientos del banco cargados
            y el CUIT de cada empresa configurado.
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <div style={{ ...planillaWrap, ...anchosCcPares.vars }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Quién le giró a quién
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCcPares.startResize(ev, "label")}
                        onDoubleClick={anchosCcPares.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Girado
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCcPares.startResize(ev, "col")}
                        onDoubleClick={anchosCcPares.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>A definir</th>
                    <th style={thFlexible}>Dice factura · sin declarar · facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {intercompanyAccount.summary.pairs.map((p) => (
                    <tr key={`${p.from}>${p.to}`}>
                      <td style={{ ...tdNombre, fontWeight: 400 }}>
                        <strong style={{ color: "#0f172a" }}>
                          {getCompanyMeta(p.from as CompanyName)?.short || p.from}
                        </strong>
                        <span style={{ color: "#94a3b8" }}> → </span>
                        <strong style={{ color: "#0f172a" }}>
                          {getCompanyMeta(p.to as CompanyName)?.short || p.to}
                        </strong>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                        {money(p.transferred)}
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: Number(p.pending || 0) > 1 ? "#b45309" : "#166534",
                        }}
                      >
                        {money(p.pending)}
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        dice factura {money(p.declaredWithInvoice)}
                        <span style={{ color: "#b45309" }}> · sin declarar {money(p.withoutBacking)}</span>
                        <span style={{ color: "#94a3b8" }}> · facturado {money(p.invoiced)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <div style={{ ...styles.noticeBox, marginTop: 10 }}>
              <strong>"Dice factura" no es prueba de que exista.</strong> Es lo que tipeo quien hizo la
              transferencia en el concepto del banco. La columna "Facturado" se llena cuando se carguen
              las facturas emitidas ENTRE las dos empresas; hasta entonces "A definir" es todo lo
              girado.
            </div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
                Ver los {intercompanyAccount.transfers.length} giros
              </summary>
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <div style={{ ...planillaWrap, ...anchosCcGiros.vars }}>
                <table style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Giro
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCcGiros.startResize(ev, "label")}
                          onDoubleClick={anchosCcGiros.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Monto
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCcGiros.startResize(ev, "col")}
                          onDoubleClick={anchosCcGiros.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Fecha</th>
                      <th style={thFlexible}>Respaldo · concepto del banco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...intercompanyAccount.transfers]
                      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                      .map((t) => (
                        <tr key={t.id}>
                          <td style={{ ...tdNombre, fontWeight: 400 }}>
                            <span
                              title={t.declaresInvoice ? "Dice factura" : "Sin declarar"}
                              style={{
                                display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                                background: t.declaresInvoice ? "#16a34a" : "#ca8a04",
                              }}
                            />
                            {getCompanyMeta(t.from as CompanyName)?.short || t.from}
                            <span style={{ color: "#94a3b8" }}> → </span>
                            {getCompanyMeta(t.to as CompanyName)?.short || t.to}
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(t.amount)}</td>
                          <td style={{ ...tdDato, color: "#475569" }}>{t.date}</td>
                          <td style={{ ...tdFlexible, color: "#64748b" }} title={t.text}>
                            <strong style={{ color: t.declaresInvoice ? "#15803d" : "#b45309" }}>
                              {t.declaresInvoice ? "dice factura" : "sin declarar"}
                            </strong>
                            <span style={{ color: "#94a3b8" }}> · {(t.text || "").slice(0, 70)}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              </div>
            </details>
          </>
        )}
      </Panel>

      <Panel
        title="Proveedores"
        span="full"
        actions={<ButtonLike onClick={addSupplier}>Agregar proveedor</ButtonLike>}
      >
        <div style={styles.sectionNote}>
          El listado sirve para vincular el pago y despues cotejarlo contra el extracto. El CUIT es lo
          que mejor funciona (el banco lo escribe en el concepto). En "Como figura en el banco" pone
          los alias con los que aparece en el resumen, separados por coma: casi nunca coincide con el
          nombre real.
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ ...planillaWrap, ...anchosProveedores.vars }}>
          <table style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Proveedor
                  <PlanillaManija
                    onMouseDown={(ev) => anchosProveedores.startResize(ev, "label")}
                    onDoubleClick={anchosProveedores.resetLabel}
                  />
                </th>
                <th style={thColumna}>
                  CUIT
                  <PlanillaManija
                    onMouseDown={(ev) => anchosProveedores.startResize(ev, "col")}
                    onDoubleClick={anchosProveedores.resetCol}
                  />
                </th>
                <th style={thFlexible}>Como figura en el banco · empresa</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ color: "#64748b" }}>
                    Todavia no cargaste proveedores. Sin listado el pago igual se carga, pero no se
                    puede cotejar automaticamente contra el banco.
                  </td>
                </tr>
              )}
              {suppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (window.confirm(`¿Quitar el proveedor "${supplier.name}"?`)) removeSupplier(supplier.id);
                  }}
                  title="Click derecho: quitar. El punto verde activa o desactiva."
                >
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400, padding: 0,
                      opacity: supplier.active !== false ? 1 : 0.45,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                      <span
                        title={supplier.active !== false ? "Activo" : "Inactivo"}
                        onClick={() => updateSupplier(supplier.id, "active", !(supplier.active !== false))}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                          cursor: "pointer",
                          background: supplier.active !== false ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      <input
                        style={inputCelda}
                        {...focoCelda}
                        value={supplier.name}
                        onChange={(e) => updateSupplier(supplier.id, "name", e.target.value)}
                      />
                    </span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <input
                      style={{ ...inputCelda, padding: "1px 6px" }}
                      {...focoCelda}
                      value={supplier.taxId}
                      placeholder="30-71234567-9"
                      onChange={(e) => updateSupplier(supplier.id, "taxId", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                      <input
                        style={{ ...inputCelda, flex: 1, minWidth: 140 }}
                        {...focoCelda}
                        value={supplier.aliases}
                        placeholder="DAC MADERAS, DACMAD"
                        onChange={(e) => updateSupplier(supplier.id, "aliases", e.target.value)}
                      />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={supplier.company}
                        onChange={(e) => updateSupplier(supplier.id, "company", e.target.value)}
                      >
                        <option value="General">Las dos</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </Panel>

      <Panel
        title="Gastos cargados"
        span="full"
        actions={
          <span style={{ display: "inline-flex", gap: 8 }}>
            <ButtonLike
              onClick={() => {
                const n = autoClassifyUnassigned();
                window.alert(
                  n > 0
                    ? `Se ubicaron ${n} gasto(s) sin clasificar usando las reglas aprendidas. Revisá que hayan quedado bien.`
                    : "No hubo gastos con una sugerencia confiable. Clasificá algunos a mano para que el sistema aprenda y la próxima los ubique solo."
                );
              }}
            >
              🧠 Auto-clasificar
            </ButtonLike>
            <ButtonLike secondary={!soloSinGrupo} onClick={() => setSoloSinGrupo((v) => !v)}>
              {soloSinGrupo ? "Ver todos" : "Solo sin grupo"}
            </ButtonLike>
            <ButtonLike onClick={anchosGastos.toggleCompacto} secondary>
              {anchosGastos.esCompacto ? "Ancho normal" : "Compacto"}
            </ButtonLike>
            <ButtonLike onClick={addCostEntry}>Agregar gasto</ButtonLike>
          </span>
        }
      >
        <div style={styles.sectionNote}>
          Los PAGOS: lo que salio de la empresa (proveedores, alquiler, servicios, impuestos). Esto es
          lo que suma al resultado; la factura es solo el respaldo. Caja chica y sueldos se agregan
          solos desde sus solapas. {costEntries.length} cargado(s).
          {paymentsReconciliation.sinMovimiento > 0 && (
            <span style={{ color: "#b45309", fontWeight: 700 }}>
              {" "}
              · {paymentsReconciliation.sinMovimiento} pago(s) por{" "}
              {money(paymentsReconciliation.montoSinMovimiento)} dicen salir del banco pero no figuran
              en el extracto.
            </span>
          )}
        </div>
        <datalist id="lista-proveedores">
          {suppliers
            .filter((s) => s.active !== false)
            .map((s) => (
              <option key={s.id} value={s.name} />
            ))}
        </datalist>
        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            style={{ ...styles.input, maxWidth: 360 }}
            placeholder="🔎 Buscar: concepto, proveedor, grupo, blanco/negro, fecha, monto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchLc && (
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {filteredEntries.length} de {costEntries.length}
              <button style={{ ...styles.smallBtn, marginLeft: 8 }} onClick={() => setSearch("")}>
                Limpiar
              </button>
            </span>
          )}
        </div>
        <div style={{ ...planillaWrap, ...anchosGastos.vars }}>
          <table style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={{ width: "var(--pl-col-w, 108px)", minWidth: 130 }} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Concepto
                    <PlanillaManija
                      onMouseDown={(ev) => anchosGastos.startResize(ev, "label")}
                      onDoubleClick={anchosGastos.resetLabel}
                    />
                </th>
                <th style={thColumna}>Fecha</th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Monto
                    <PlanillaManija
                      onMouseDown={(ev) => anchosGastos.startResize(ev, "col")}
                      onDoubleClick={anchosGastos.resetCol}
                    />
                </th>
                <th style={thColumna}>Grupo (fijo/var)</th>
                <th style={thColumna}>Proveedor</th>
                <th style={thFlexible}>Empresa · pago · factura</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "#64748b" }}>
                    {searchLc
                      ? `Ningun gasto coincide con "${search}".`
                      : "Todavia no cargaste gastos. Agrega uno a mano o importa el extracto bancario."}
                  </td>
                </tr>
              )}
              {filteredEntries
                .filter((entry) => !soloSinGrupo || !entry.group)
                .map((entry) => (
                <tr
                  key={entry.id}
                  onContextMenu={(ev) => {
                    marcaGastos.marcar(String(entry.id));
                    openCtxMenu(ev, "pago", entry.id);
                  }}
                >
                  <td
                    title={entry.description || entry.supplier}
                    style={{ ...tdNombre, ...marcaGastos.estilo(String(entry.id)), fontWeight: 400 }}
                  >
                    {entry.description || entry.supplier || "(sin concepto)"}
                  </td>
                  <td style={{ ...tdDato, color: "#64748b" }}>{entry.date}</td>
                  <td style={{ ...tdDato, textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                    {money(entry.amount)}
                  </td>
                  <td style={tdDato}>
                    {entry.group ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%" }}>
                        <KindPill kind={kindOfGroup(entry.group)} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={entry.group}>
                          {entry.group}
                        </span>
                      </span>
                    ) : (
                      <span
                        title="Sin clasificar: botón derecho para ubicarlo en un grupo"
                        style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 10, borderRadius: 999, padding: "1px 7px" }}
                      >
                        D
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdDato, color: "#334155" }} title={entry.supplier}>
                    {entry.supplier || "—"}
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
                      <span title={entry.company}>{getCompanyMeta(entry.company as any)?.short || entry.company}</span>
                      <ColorTag color={entry.administration} />
                      <span title="Cómo se pagó">
                        {(PAYMENT_METHOD_OPTIONS.find(
                          (o) =>
                            o.value ===
                            (entry.paymentMethod || (entry.source === "extracto" ? "transferencia" : "efectivo"))
                        )?.label) || ""}
                      </span>
                      {entry.invoiceRef && <span title="Factura que respalda el pago">{entry.invoiceRef}</span>}
                      {renderCotejo(entry.id)}
                      <span style={{ color: "#94a3b8" }}>{entry.source === "extracto" ? "extracto" : "manual"}</span>
                      <button
                        style={styles.smallBtn}
                        title="Quitar este gasto"
                        onClick={() => removeCostEntry(entry.id)}
                      >
                        ✕
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Importar extracto al espejo bancario (masivo)"
        span="full"
        actions={
          bankMirrorPreview.length > 0 ? (
            <>
              <ButtonLike onClick={commitBankMirrorDraft}>
                Cargar {bankMirrorPreview.filter((r) => !r.dup).length} nuevo(s)
              </ButtonLike>
              <ButtonLike onClick={discardBankMirrorDraft} secondary>
                Descartar
              </ButtonLike>
            </>
          ) : undefined
        }
      >
        <div style={styles.sectionNote}>
          Carga masiva del <strong>espejo bancario</strong> (lo que alimenta el calendario y el cruce):
          entran <strong>créditos y débitos</strong>, con su saldo. Elegí empresa, banco y moneda; reviso
          duplicados contra lo ya cargado y confirmás. (Distinto del import de arriba, que va a gastos.)
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "10px 0" }}>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 3 }}>
            Empresa
            <select style={styles.input} value={bankMirrorCompany} onChange={(e) => setBankMirrorCompany(e.target.value)}>
              {COMPANY_OPTIONS.filter((c: any) => c.value !== "General").map((c: any) => (
                <option key={c.value} value={c.value}>{c.short || c.value}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 3 }}>
            Banco / cuenta
            <input
              style={styles.input}
              list="bank-mirror-banks"
              placeholder="Ej: Patagonia, Santander"
              value={bankMirrorBank}
              onChange={(e) => setBankMirrorBank(e.target.value)}
            />
            <datalist id="bank-mirror-banks">
              {knownBanks.map((b) => <option key={b} value={b} />)}
            </datalist>
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 3 }}>
            Moneda
            <select style={styles.input} value={bankMirrorCurrency} onChange={(e) => setBankMirrorCurrency(e.target.value as "ARS" | "USD")}>
              <option value="ARS">$ (pesos)</option>
              <option value="USD">U$S (dólares)</option>
            </select>
          </label>
          <div style={{ alignSelf: "flex-end" }}>
            <FileDropButton
              label={bankMirrorBusy ? "Leyendo extracto..." : "Cargar extracto (Excel / CSV)"}
              accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
              onFileSelected={onBankMirrorFile}
            />
          </div>
        </div>
        {bankMirrorMessage && <div style={styles.sectionNote}>{bankMirrorMessage}</div>}
        {bankMirrorPreview.length > 0 && (
          <>
            <div style={styles.sectionNote}>
              {bankMirrorPreview.filter((r) => !r.dup).length} nuevo(s) ·{" "}
              {bankMirrorPreview.filter((r) => r.dup).length} ya cargado(s) (se omiten) — hacia{" "}
              <strong>{bankMirrorBank || "(elegí banco)"}</strong> · {bankMirrorCurrency}.
            </div>
            <div style={{ overflowX: "auto", maxHeight: 320 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Monto</th>
                    <th style={{ textAlign: "right" }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {bankMirrorPreview.slice(0, 60).map((r, i) => (
                    <tr key={i} style={{ opacity: r.dup ? 0.5 : 1 }}>
                      <td>{r.dup ? "· ya está" : "✓ nuevo"}</td>
                      <td>{r.date}</td>
                      <td>{r.concept}</td>
                      <td style={{ color: r.movementType === "debito" ? "#dc2626" : "#16a34a" }}>{r.movementType}</td>
                      <td style={{ textAlign: "right" }}>{money(r.amount)}</td>
                      <td style={{ textAlign: "right" }}>{money(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bankMirrorPreview.length > 60 && (
                <div style={styles.sectionNote}>… y {bankMirrorPreview.length - 60} más (se cargan todos los nuevos al confirmar).</div>
              )}
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Movimientos bancarios · el banco real"
        span="full"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ButtonLike
              secondary={!soloSinAsignar}
              onClick={() => setSoloSinAsignar((v) => !v)}
            >
              {soloSinAsignar ? "Ver todos" : "Solo sin asignar"}
            </ButtonLike>
            <ButtonLike onClick={anchosBanco.toggleCompacto} secondary>
              {anchosBanco.esCompacto ? "Ancho normal" : "Compacto"}
            </ButtonLike>
            <ButtonLike onClick={addBankStatementEntry}>Agregar movimiento</ButtonLike>
          </div>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <ButtonLike secondary onClick={() => shiftOperationalMonth(-1)}>
            ‹ Mes anterior
          </ButtonLike>
          <strong style={{ minWidth: 150, textAlign: "center", textTransform: "capitalize" }}>
            {monthLabel(operationalMonth)}
          </strong>
          <ButtonLike secondary onClick={() => shiftOperationalMonth(1)}>
            Mes siguiente ›
          </ButtonLike>
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric label="Entró (créditos)" value={money(bankStatementSummary.credits)} tone="in" />
          <MiniMetric label="Salió (débitos)" value={money(bankStatementSummary.debits)} tone="out" />
          <MiniMetric label="Neto banco" value={money(bankStatementSummary.net)} />
          <MiniMetric label="Último saldo" value={money(bankStatementSummary.lastBalance)} />
        </div>
        <div style={styles.noticeBox}>
          Las métricas son <strong>acumuladas</strong> (todos los meses); la lista muestra solo{" "}
          <strong style={{ textTransform: "capitalize" }}>{monthLabel(operationalMonth)}</strong> —
          navegá con los botones de mes. Es el <strong>espejo de la cuenta real</strong>: no suma al
          resultado, solo refleja qué entró y salió.
        </div>
        {monthBankStatementEntries.length === 0 ? (
          <div style={styles.empty}>No hay movimientos bancarios en {monthLabel(operationalMonth)}.</div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosBanco.vars }}>
            <datalist id="bank-assign-jobs">
              {approvedJobsForLink.map((j) => (
                <option key={j.budgetNumber} value={j.budgetNumber}>
                  {j.budgetNumber} — {j.client}
                </option>
              ))}
            </datalist>
            <datalist id="bank-assign-parties">
              {partyOptions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={{ width: "var(--pl-col-w, 104px)", minWidth: 150 }} />
                <col style={colFlexible} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Concepto del banco
                      <PlanillaManija
                        onMouseDown={(ev) => anchosBanco.startResize(ev, "label")}
                        onDoubleClick={anchosBanco.resetLabel}
                      />
                  </th>
                  <th style={thColumna}>Fecha</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Monto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosBanco.startResize(ev, "col")}
                        onDoubleClick={anchosBanco.resetCol}
                      />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Saldo</th>
                  <th style={thColumna}>Dónde va</th>
                  <th style={thFlexible}>Empresa · banco</th>
                </tr>
              </thead>
              <tbody>
                {monthBankStatementEntries
                  .filter((entry: any) => !soloSinAsignar || bankEntryMissingInfo(entry).length > 0)
                  .map((entry) => {
                  const missing = bankEntryMissingInfo(entry);
                  const kind = entry.assignedKind as string | undefined;
                  const open = assignOpenId === entry.id;
                  const isCobroPago = kind === "cobro" || kind === "pago";
                  return (
                  <React.Fragment key={entry.id}>
                  <tr
                    onContextMenu={(ev) => {
                      marcaBanco.marcar(String(entry.id));
                      openCtxMenu(ev, "banco", entry.id);
                    }}
                  >
                    <td
                      title={entry.concept}
                      style={{ ...tdNombre, ...marcaBanco.estilo(String(entry.id)), fontWeight: 400 }}
                    >
                      {entry.concept || "(sin concepto)"}
                    </td>
                    <td style={{ ...tdDato, color: "#64748b" }}>{entry.date}</td>
                    <td
                      style={{
                        ...tdDato,
                        textAlign: "right",
                        fontWeight: 600,
                        color: entry.movementType === "debito" ? "#dc2626" : "#0f172a",
                      }}
                    >
                      {entry.movementType === "debito" ? "− " : ""}
                      {money(entry.amount, entry.currency === "USD" ? "USD" : "ARS")}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#94a3b8" }}>
                      {money(entry.balance, entry.currency === "USD" ? "USD" : "ARS")}
                    </td>
                    <td style={{ ...tdDato, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {missing.length > 0 ? (
                          <PillD missing={missing} />
                        ) : (
                          <span title="Asignado" style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
                        )}
                        <span
                          style={{ color: kind ? "#334155" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis" }}
                          title={
                            kind
                              ? `${kind}${entry.assignedJobBudget ? " · " + entry.assignedJobBudget : ""}${entry.assignedParty ? " · " + entry.assignedParty : ""}`
                              : "Sin asignar"
                          }
                        >
                          {kind
                            ? `${kind}${entry.assignedJobBudget ? " · " + entry.assignedJobBudget : entry.assignedParty ? " · " + entry.assignedParty : ""}`
                            : "sin asignar"}
                        </span>
                        <button style={styles.smallBtn} onClick={() => setAssignOpenId(open ? null : entry.id)}>
                          {open ? "Cerrar ▲" : kind ? "Editar ▾" : "Asignar ▾"}
                        </button>
                      </div>
                    </td>
                    <td style={{ ...tdDato, color: "#64748b", whiteSpace: "nowrap" }}>
                      <span title={`${entry.company} · ${entry.bank}`}>
                        {getCompanyMeta(entry.company as any)?.short || entry.company} · {entry.bank}
                      </span>
                      <label style={{ ...styles.buttonLikeLabel, marginLeft: 6 }} title={entry.attachmentName || "Cargar resumen / comprobante"}>
                        {entry.attachmentName ? "📎✓" : "📎"}
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) => uploadBankStatementFile(entry.id, e.target.files?.[0] || null)}
                        />
                      </label>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={6} style={{ background: "rgba(2,6,23,0.04)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "10px 4px", alignItems: "flex-end" }}>
                          <Field label="¿Qué es? (de dónde viene / a dónde va)">
                            <select
                              style={styles.input}
                              value={entry.assignedKind || ""}
                              onChange={(e) => updateBankStatementEntry(entry.id, "assignedKind", e.target.value)}
                            >
                              <option value="">— Elegir —</option>
                              <option value="cobro">Cobro (entró de un trabajo/cliente)</option>
                              <option value="pago">Pago (a un proveedor)</option>
                              <option value="interno">Interno (entre cuentas/empresas)</option>
                              <option value="aporte">Aporte / préstamo del dueño</option>
                              <option value="impuesto">Impuesto / comisión bancaria</option>
                              <option value="otro">Otro</option>
                            </select>
                          </Field>
                          {kind === "cobro" && (
                            <Field label="Trabajo (buscá por ppto o cliente)">
                              <input
                                style={{ ...styles.input, minWidth: 200 }}
                                list="bank-assign-jobs"
                                placeholder="Ej: 3199"
                                value={entry.assignedJobBudget || ""}
                                onChange={(e) => updateBankStatementEntry(entry.id, "assignedJobBudget", e.target.value)}
                              />
                            </Field>
                          )}
                          {isCobroPago && (
                            <Field label={kind === "pago" ? "Proveedor" : "Cliente / tercero"}>
                              <input
                                style={{ ...styles.input, minWidth: 220 }}
                                list="bank-assign-parties"
                                placeholder="Buscá o escribí uno nuevo"
                                value={entry.assignedParty || ""}
                                onChange={(e) => updateBankStatementEntry(entry.id, "assignedParty", e.target.value)}
                              />
                            </Field>
                          )}
                          {isCobroPago && (
                            <Field label="Circuito">
                              <select
                                style={styles.input}
                                value={entry.administration || ""}
                                onChange={(e) => updateBankStatementEntry(entry.id, "administration", e.target.value)}
                              >
                                <option value="">—</option>
                                <option value="blanco">Blanco</option>
                                <option value="negro">Negro</option>
                              </select>
                            </Field>
                          )}
                          <Field label="Renglón del calendario anual">
                            <select
                              style={{ ...styles.input, minWidth: 220 }}
                              value={entry.conceptKey || ""}
                              onChange={(e) => updateBankStatementEntry(entry.id, "conceptKey", e.target.value)}
                            >
                              <option value="">— Sin clasificar —</option>
                              {CALENDAR_SECTIONS.filter((s) => s.items.length > 0).map((s) => (
                                <optgroup key={s.key} label={s.label}>
                                  {s.items.map((it) => (
                                    <option key={it.key} value={it.key}>{it.label}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </Field>
                          <Field label="Nota (opcional)">
                            <input
                              style={{ ...styles.input, minWidth: 180 }}
                              value={entry.assignmentNote || ""}
                              onChange={(e) => updateBankStatementEntry(entry.id, "assignmentNote", e.target.value)}
                            />
                          </Field>
                          {missing.length > 0 ? (
                            <div style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>
                              Falta: {missing.join(", ")}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>✓ Completo</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* TARJETAS: dentro de esta solapa, entre Bancos y el resumen de costos fijos/variables. */}
      {tarjetasSlot}

      <Panel title="Gastos de caja chica (clasificar a un grupo)" span="full">
        <div style={styles.sectionNote}>
          Compras/gastos que entraron por caja chica. Asignales un grupo de costo (fijo/variable) para que
          compongan los costos donde corresponde. Es el MISMO gasto: no se cuenta dos veces (por defecto va
          al grupo "Caja chica"). {cajaChicaList.length} gasto(s).
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Proveedor</th>
                <th style={{ textAlign: "right" }}>Monto</th>
                <th>Grupo de costo</th>
              </tr>
            </thead>
            <tbody>
              {cajaChicaList.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#64748b" }}>
                    {searchLc ? "Ningun gasto de caja chica coincide con la busqueda." : "Sin gastos de caja chica en el alcance."}
                  </td>
                </tr>
              )}
              {cajaChicaList.map((e) => (
                <tr key={e.id}>
                  <td style={{ width: 110 }}>{e.date}</td>
                  <td>{e.description || e.category || "-"}</td>
                  <td>{e.supplier || "-"}</td>
                  <td style={{ textAlign: "right", width: 120 }}>{money(e.amount)}</td>
                  <td>
                    <select
                      style={styles.input}
                      value={e.costGroup || ""}
                      onChange={(ev) =>
                        pickGroupOrCreate(ev.target.value, (name) =>
                          updatePettyCashExpense(e.id, "costGroup", name)
                        )
                      }
                    >
                      <option value="">Caja chica (sin clasificar)</option>
                      {manualGroupOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                      <option value={NEW_GROUP_OPTION}>➕ Crear grupo nuevo…</option>
                    </select>
                    <div
                      title="Click derecho: clasificar rápido"
                      onContextMenu={(ev) => openCtxMenu(ev, "caja", e.id)}
                      style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center", cursor: "context-menu" }}
                    >
                      {e.costGroup ? (
                        <KindPill kind={kindOfGroup(e.costGroup)} />
                      ) : (
                        <span
                          title="En caja chica sin clasificar a un grupo"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 16,
                            height: 16,
                            padding: "0 3px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                            background: "#fef08a",
                            color: "#854d0e",
                          }}
                        >
                          D
                        </span>
                      )}
                      <ColorTag color={getPettyCashAdministration(e)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Cuenta corriente proveedores (deuda por pagar)" span="full">
        <div style={styles.sectionNote}>
          Facturas de compra por proveedor. Una factura SIN pago vinculado queda como DEUDA hasta que le
          vincules el pago (elegilo del desplegable). Así sabés si le debemos plata a alguien.{" "}
          <strong style={{ color: deudaTotalProv > 1 ? "#b45309" : "#16a34a" }}>
            Deuda total: {money(deudaTotalProv)}
          </strong>
          .
        </div>
        {supplierAccounts.length === 0 ? (
          <div style={styles.empty}>Sin facturas de compra en el alcance seleccionado.</div>
        ) : (
          supplierAccounts.map((a) => (
            <div
              key={a.key}
              style={{ border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: a.deuda > 1 ? "#fffbeb" : "#f0fdf4",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {a.supplier}{" "}
                  {a.taxId && <span style={{ fontSize: 11, color: "#94a3b8" }}>({a.taxId})</span>}
                </span>
                <span style={{ display: "inline-flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Facturado {money(a.facturado)} · Pagado {money(a.pagado)}
                  </span>
                  <span style={{ fontWeight: 800, color: a.deuda > 1 ? "#b45309" : "#16a34a" }}>
                    {a.deuda > 1 ? `Debemos ${money(a.deuda)}` : "Al día ✓"}
                  </span>
                </span>
              </div>
              {a.pendientes.length > 0 && (
                <table style={styles.table}>
                  <tbody>
                    {a.pendientes.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ width: 100 }}>{inv.invoiceDate}</td>
                        <td>{inv.invoiceNumber || "factura"}</td>
                        <td style={{ textAlign: "right", width: 130 }}>{money(inv.total)}</td>
                        <td style={{ width: 300 }}>
                          <select
                            style={styles.input}
                            value=""
                            onChange={(e) =>
                              updatePurchaseInvoice(
                                inv.id,
                                "paidByCostEntryId",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          >
                            <option value="">🟡 Sin pago (deuda)</option>
                            {paymentsForInvoice(inv.company, inv.supplier).map((p) => (
                              <option key={p.id} value={p.id}>
                                Vincular pago: {p.date} · {money(p.amount)}
                                {p.description ? ` · ${p.description}` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </Panel>

      <Panel title="Composicion: fijos / variables → grupo → gastos" span="full">
        <div style={styles.sectionNote}>
          Cada grupo con su TOTAL y, debajo, los gastos asignados: así ves cómo se compone cada tipo de
          costo a medida que cargás. El buscador de "Gastos cargados" también filtra esta vista.
        </div>
        {[
          { title: "COSTOS FIJOS", comps: composition.fijos },
          { title: "COSTOS VARIABLES", comps: composition.variables },
        ].map((sec) => (
          <div key={sec.title} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, color: "#334155", margin: "8px 0 4px" }}>{sec.title}</div>
            {sec.comps
              .filter((c) => !(c.auto && c.entries.length === 0))
              .map((c) => (
                <div
                  key={c.group}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "#f8fafc",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                      <KindPill kind={c.kind} /> {c.group}
                      {c.auto && <span style={{ fontSize: 11, color: "#94a3b8" }}>(auto)</span>}
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>· {c.entries.length} gasto(s)</span>
                    </span>
                    <span style={{ fontWeight: 800 }}>{money(c.total)}</span>
                  </div>
                  {c.entries.length > 0 && (
                    <table style={styles.table}>
                      <tbody>
                        {c.entries.map((e) => (
                          <tr key={e.id}>
                            <td style={{ width: 92 }}>{e.date}</td>
                            <td>{e.description || "-"}</td>
                            <td>{e.supplier || "-"}</td>
                            <td style={{ width: 26 }}>
                              <ColorTag color={e.administration} />
                            </td>
                            <td style={{ textAlign: "right", width: 120 }}>{money(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
          </div>
        ))}
        {composition.sinClasificar.entries.length > 0 && (
          <div style={{ border: "1px solid #fde68a", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: "#fffbeb",
                fontWeight: 700,
              }}
            >
              <span>⚠ Sin clasificar ({composition.sinClasificar.entries.length}) — ubicalos en un grupo</span>
              <span style={{ fontWeight: 800 }}>{money(composition.sinClasificar.total)}</span>
            </div>
            <table style={styles.table}>
              <tbody>
                {composition.sinClasificar.entries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ width: 92 }}>{e.date}</td>
                    <td>{e.description || "-"}</td>
                    <td>{e.supplier || "-"}</td>
                    <td style={{ width: 26 }}>
                      <ColorTag color={e.administration} />
                    </td>
                    <td style={{ textAlign: "right", width: 120 }}>{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Costos por grupo y mes (fijos / variables)"
        span="full"
        actions={
          <ButtonLike onClick={anchosCostos.toggleCompacto} secondary>
            {anchosCostos.esCompacto ? "Ancho normal" : "Compacto"}
          </ButtonLike>
        }
      >
        <div style={{ ...styles.sectionNote, marginBottom: 8 }}>
          Fijos y variables son secciones: tocá el título para plegarlas.{" "}
          <strong>Botón derecho</strong> sobre cualquier número para ver los gastos que hay detrás y
          reclasificarlos.
        </div>
        <div style={{ ...planillaWrap, ...anchosCostos.vars }}>
          <table style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              {months.map((m) => (
                <col key={`c-${m}`} style={colDato} />
              ))}
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Grupo
                    <PlanillaManija
                      onMouseDown={(ev) => anchosCostos.startResize(ev, "label")}
                      onDoubleClick={anchosCostos.resetLabel}
                    />
                </th>
                {months.map((month, i) => (
                  <th key={month} style={{ ...thColumna, textAlign: "right" }}>
                    {i === 0 ? (
                      <>
                        {monthKeyLabel(month)}
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCostos.startResize(ev, "col")}
                          onDoubleClick={anchosCostos.resetCol}
                        />
                      </>
                    ) : (
                      monthKeyLabel(month)
                    )}
                  </th>
                ))}
                <th style={{ ...thFlexible, textAlign: "right", fontWeight: 800 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: "fijo", titulo: "COSTOS FIJOS", filas: fixedRows, porMes: aggregation.fixedByMonth, total: aggregation.fixedTotal, fondo: "#e0e7ff", tinta: "#3730a3" },
                { key: "variable", titulo: "COSTOS VARIABLES", filas: variableRows, porMes: aggregation.variableByMonth, total: aggregation.variableTotal, fondo: "#fef3c7", tinta: "#92400e" },
              ].map((sec) => {
                const plegada = seccionesCerradas.has(sec.key);
                return (
                  <React.Fragment key={sec.key}>
                    <tr>
                      <td
                        onClick={() => plegarSeccion(sec.key)}
                        title="Tocá para plegar o desplegar"
                        style={{ ...tdNombre, background: sec.fondo, color: sec.tinta, fontWeight: 800, cursor: "pointer", userSelect: "none" }}
                      >
                        {plegada ? "▸ " : "▾ "}{sec.titulo}
                      </td>
                      {months.map((month) => (
                        <td key={`${sec.key}-${month}`} style={{ ...tdDato, background: sec.fondo, color: sec.tinta, textAlign: "right", fontWeight: 800 }}>
                          {(sec.porMes[month] || 0) > 0 ? money(sec.porMes[month]) : "·"}
                        </td>
                      ))}
                      <td style={{ ...tdDato, background: sec.fondo, color: sec.tinta, textAlign: "right", fontWeight: 800 }}>
                        {money(sec.total)}
                      </td>
                    </tr>
                    {!plegada && sec.filas.length === 0 && (
                      <tr>
                        <td style={{ ...tdNombre, paddingLeft: 24, color: "#94a3b8", fontWeight: 400 }}>
                          Sin grupos de este tipo
                        </td>
                        {months.map((m) => (
                          <td key={`v-${sec.key}-${m}`} style={tdDato}></td>
                        ))}
                        <td style={tdDato}></td>
                      </tr>
                    )}
                    {!plegada &&
                      sec.filas.map((row) => (
                        <tr key={`${sec.key}-${row.group}`}>
                          <td style={{ ...tdNombre, paddingLeft: 24, fontWeight: 400 }} title={row.group}>
                            {row.group}
                            {row.auto && <span style={{ ...styles.chatStatus, marginLeft: 6 }}>auto</span>}
                          </td>
                          {months.map((month) => {
                            const v = row.byMonth[month] || 0;
                            return (
                              <td
                                key={`${row.group}-${month}`}
                                onContextMenu={(ev) => {
                                  if (v <= 0) return;
                                  ev.preventDefault();
                                  ev.stopPropagation();
                                  setMenuCelda({ x: ev.clientX, y: ev.clientY, group: row.group, month, total: v });
                                }}
                                style={{ ...tdDato, textAlign: "right", color: v > 0 ? "#0f172a" : "#e2e8f0", cursor: v > 0 ? "context-menu" : "default" }}
                              >
                                {v > 0 ? money(v) : "·"}
                              </td>
                            );
                          })}
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: "#475569" }}>
                            {money(row.total)}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}

              {composition.sinClasificar.entries.length > 0 && (
                <tr>
                  <td style={{ ...tdNombre, background: "#fef9c3", color: "#854d0e", fontWeight: 800 }}>
                    ⚠ Sin clasificar ({composition.sinClasificar.entries.length})
                  </td>
                  {months.map((month) => {
                    const v = composition.sinClasificar.entries
                      .filter((e: any) => String(e.date || "").startsWith(`${month}-`))
                      .reduce((a: number, e: any) => a + Number(e.amount || 0), 0);
                    return (
                      <td key={`sc-${month}`} style={{ ...tdDato, background: "#fef9c3", color: "#854d0e", textAlign: "right", fontWeight: 700 }}>
                        {v > 0 ? money(v) : "·"}
                      </td>
                    );
                  })}
                  <td style={{ ...tdDato, background: "#fef9c3", color: "#854d0e", textAlign: "right", fontWeight: 800 }}>
                    {money(composition.sinClasificar.total)}
                  </td>
                </tr>
              )}

              <tr>
                <td style={{ ...tdNombre, background: "#f1f5f9", fontWeight: 900 }}>TOTAL</td>
                {months.map((month) => (
                  <td key={`t-${month}`} style={{ ...tdDato, background: "#f1f5f9", textAlign: "right", fontWeight: 900 }}>
                    {(aggregation.totalByMonth[month] || 0) > 0 ? money(aggregation.totalByMonth[month]) : "·"}
                  </td>
                ))}
                <td style={{ ...tdDato, background: "#f1f5f9", textAlign: "right", fontWeight: 900 }}>
                  {money(aggregation.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {menuCelda && (() => {
        const lista = gastosDetras(menuCelda.group, menuCelda.month);
        const sumaLista = lista.reduce((a, e) => a + Number(e.amount || 0), 0);
        const faltante = menuCelda.total - sumaLista;
        const cerrar = () => setMenuCelda(null);
        const elegido = menuCelda.pickedId ? lista.find((e) => e.id === menuCelda.pickedId) : undefined;
        return (
          <QuickMenu x={menuCelda.x} y={menuCelda.y} onClose={cerrar}>
            <QuickMenuTitle>
              {menuCelda.group} · {monthKeyLabel(menuCelda.month)} · {money(menuCelda.total)}
            </QuickMenuTitle>
            {!elegido && lista.length === 0 && (
              <div style={{ fontSize: 12, color: "#94a3b8", padding: "4px 8px" }}>
                Este número no viene de gastos cargados (puede ser caja chica o tarjeta).
              </div>
            )}
            {!elegido &&
              lista.map((e) => (
                <button key={e.id} style={quickMenuItem} onClick={() => setMenuCelda({ ...menuCelda, pickedId: e.id })}>
                  <span style={{ fontWeight: 700 }}>{money(e.amount)}</span>
                  <span style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.date} · {e.description || e.supplier || "gasto"}
                  </span>
                </button>
              ))}
            {!elegido && Math.abs(faltante) > 1 && lista.length > 0 && (
              <div style={{ fontSize: 11, color: "#b45309", padding: "2px 8px" }}>
                {money(Math.abs(faltante))} de este número vienen de caja chica o tarjeta.
              </div>
            )}
            {elegido && (
              <>
                <div style={{ fontSize: 11, color: "#64748b", padding: "0 8px 4px" }}>
                  {elegido.date} · {elegido.description || elegido.supplier} · {money(elegido.amount)}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", padding: "2px 8px" }}>Mover a otro grupo</div>
                {manualGroupOptions
                  .filter((g) => g !== menuCelda.group)
                  .map((g) => (
                    <button
                      key={g}
                      style={quickMenuItem}
                      onClick={() => {
                        updateCostEntry(elegido.id, "group", g);
                        cerrar();
                      }}
                    >
                      {g}
                    </button>
                  ))}
                <QuickMenuSep />
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    updateCostEntry(elegido.id, "group", "");
                    cerrar();
                  }}
                >
                  Sacar del grupo (queda sin clasificar)
                </button>
              </>
            )}
          </QuickMenu>
        );
      })()}

      {ctxMenu &&
        (() => {
          // Movimiento del banco: la pill D solo marca que falta algo; las acciones salen de acá.
          if (ctxMenu.kind === "banco") {
            const entry: any = monthBankStatementEntries.find((e: any) => e.id === ctxMenu.id);
            if (!entry) return null;
            const assigned = Boolean(
              entry.assignedKind || entry.assignedJobBudget || entry.assignedParty || entry.conceptKey
            );
            const close = () => setCtxMenu(null);
            return (
              <QuickMenu x={ctxMenu.x} y={ctxMenu.y} onClose={close}>
                <QuickMenuTitle>
                  {entry.movementType === "credito" ? "Entró" : "Salió"}{" "}
                  {money(Math.abs(Number(entry.amount) || 0))}
                </QuickMenuTitle>
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    setAssignOpenId(entry.id);
                    close();
                  }}
                >
                  {assigned ? "Editar asignación…" : "Asignar…"}
                </button>
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    updateBankStatementEntry(
                      entry.id,
                      "administration",
                      entry.administration === "negro" ? "blanco" : "negro"
                    );
                    close();
                  }}
                >
                  <ColorTag color={entry.administration === "negro" ? "blanco" : "negro"} /> Cambiar a{" "}
                  {entry.administration === "negro" ? "BLANCO (B)" : "NEGRO (N)"}
                </button>
                {assigned && (
                  <>
                    <QuickMenuSep />
                    <button
                      style={quickMenuItem}
                      title="Borra clasificación, trabajo, tercero y renglón. El importe y el saldo no se tocan: vuelve a quedar sin asignar (D)."
                      onClick={() => {
                        clearBankAssignment(entry.id);
                        close();
                      }}
                    >
                      Limpiar asignación
                    </button>
                  </>
                )}
                <QuickMenuSep />
                <button
                  style={{ ...quickMenuItem, color: "#b91c1c" }}
                  onClick={() => {
                    if (window.confirm("¿Borrar este movimiento del banco?")) removeBankStatementEntry(entry.id);
                    close();
                  }}
                >
                  Borrar movimiento
                </button>
              </QuickMenu>
            );
          }
          const isPago = ctxMenu.kind === "pago";
          const entry: any = isPago
            ? costEntries.find((e) => e.id === ctxMenu.id)
            : pettyCashExpenses.find((e: any) => e.id === ctxMenu.id);
          if (!entry) return null;
          const currentGroup = isPago ? entry.group : entry.costGroup;
          const setGroup = (name: string) => {
            if (isPago) updateCostEntry(ctxMenu.id, "group", name);
            else updatePettyCashExpense(ctxMenu.id, "costGroup", name);
          };
          return (
            <QuickMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)}>
              <QuickMenuTitle>Clasificar en un grupo…</QuickMenuTitle>
              <button
                style={quickMenuItem}
                onClick={() => {
                  setGroup("");
                  setCtxMenu(null);
                }}
              >
                {isPago ? "Sin clasificar" : "Caja chica (sin clasificar)"}
              </button>
              {manualGroupOptions.map((g) => (
                <button
                  key={g}
                  style={{ ...quickMenuItem, ...(g === currentGroup ? { background: "#eff6ff", fontWeight: 700 } : {}) }}
                  onClick={() => {
                    setGroup(g);
                    setCtxMenu(null);
                  }}
                >
                  <KindPill kind={kindOfGroup(g)} /> {g}
                </button>
              ))}
              {isPago && (
                <>
                  <QuickMenuSep />
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      updateCostEntry(
                        ctxMenu.id,
                        "administration",
                        entry.administration === "negro" ? "blanco" : "negro"
                      );
                      setCtxMenu(null);
                    }}
                  >
                    Cambiar a {entry.administration === "negro" ? "BLANCO (B)" : "NEGRO (N)"}
                  </button>
                </>
              )}
            </QuickMenu>
          );
        })()}
    </>
  );
}

// Reexport util para App.tsx (evita importar el dominio dos veces en el monolito).
export { isAutoCostGroup };
