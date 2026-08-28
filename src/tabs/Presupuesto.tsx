import React from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike, Field, MiniMetric, SummaryRow, TwoCol, AmountInput, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { money, pct, formatDateDisplay } from "../lib/format";
import { resolveAdvancePct } from "../domain/budgetTerms";
import { findClientByName } from "../domain/clients";
import { matchStockForMaterial } from "../domain/stockMatch";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  useCeldaMarcada, inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { WORK_TYPE_OPTIONS } from "../domain/types";
import type { CompanyName, WorkTypeName } from "../domain/types";

// Buscador de clientes del CRM: reemplaza al <datalist> nativo (que en varios navegadores no abre al
// clickear, solo al tipear). Este SIEMPRE abre al enfocar, filtra por nombre y se elige con un clic.
const pickerDropdown: React.CSSProperties = {
  position: "absolute",
  zIndex: 40,
  top: "100%",
  left: 0,
  right: 0,
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
  maxHeight: 260,
  overflowY: "auto",
  marginTop: 4,
};
const pickerItem: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  background: "#fff",
  cursor: "pointer",
};
const pickerEmpty: React.CSSProperties = { padding: "10px", fontSize: 13, color: "#64748b" };

function ClientPicker({
  value,
  clients,
  onPick,
  onType,
}: {
  value: string;
  clients: any[];
  onPick: (client: any) => void;
  onType: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const norm = (s: string) => (s || "").toLowerCase().trim();
  const q = norm(query);
  const filtered = (clients || [])
    .filter((c) => c && c.name && (q === "" || norm(c.name).includes(q)))
    .slice(0, 60);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        style={styles.input}
        value={value}
        placeholder="Buscá o escribí el cliente…"
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          onType(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div style={pickerDropdown}>
          {filtered.length === 0 ? (
            <div style={pickerEmpty}>
              {clients && clients.length
                ? "Sin coincidencias."
                : "No hay clientes en el CRM todavía — cargalos o generalos desde la solapa CRM."}
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                style={pickerItem}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
              >
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                {(c.taxId || c.contactName) && (
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {[c.taxId, c.contactName].filter(Boolean).join(" · ")}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type PresupuestoTabProps = {
  budget: any;
  crmClients: any[];
  materials: any[];
  labor: any[];
  fixedCosts: any[];
  basicSupplies: any[];
  budgetDiscounts: any[];
  budgetIncreases: any[];
  subBudgets: any[];
  subBudgetTitle: string;
  subBudgetNotes: string;
  subBudgetCurrency: "ARS" | "USD";
  setSubBudgetCurrency: (c: "ARS" | "USD") => void;
  subBudgetQuantity: number;
  setSubBudgetQuantity: React.Dispatch<React.SetStateAction<number>>;
  consolidatedBudgetTotalsUsd: any;
  hasUsdBudgetSections: boolean;
  markupPct: number;
  deviationPct: number;
  laborDeviationPct: number;
  vatPct: number;
  commissionPct: number;
  manualAllocationPct: number;
  allocationMode: any;
  editingBudgetId: any;
  consolidatedBudgetTotals: any;
  consolidatedCommissionAmount: number;
  currentClientHistory: any;
  totalMaterials: number;
  totalLabor: number;
  totalBasicSupplies: number;
  totalJobHours: number;
  totalAvailableHours: number;
  currentWorkingSectionTotals: any;
  workingBudgetSections: any[];
  companyTheme: any;
  employeesSortedByPay: any[];
  COMPANY_OPTIONS: any[];
  STOCK_GENERAL_GROUP_OPTIONS: readonly string[];
  LOGO_IMAGE_OPTS: any;
  effectiveIsAdmin: any;
  allowedCompaniesForSession: any;
  canAccessCompany: any;
  budgetEstimatedDeliveryDate: any;
  approvedJobs: any[];
  occupancyPct: any;
  allocationPctUsed: any;
  totalLaborDeviationAmount: any;
  deviationAmount: any;
  markupAmount: any;
  fixedCostsApplied: any;
  preDiscountNetPrice: any;
  totalIncreaseAmount: any;
  totalDiscountAmount: any;
  billedPctNormalized: any;
  budgetWhiteTotal: any;
  budgetBlackTotal: any;
  stockSearchOptions: any;
  displayedMaterials: any[];
  stockByCode: any;
  stockByDescription: any;
  laborRows: any[];
  nominalLaborHoursPerEmployee: any;
  totalFixedCosts: any;
  getCompanyMeta: (company: CompanyName) => any;
  getCompanyBankingLines: (company: any) => any;
  getCompanyTaxId: (company: any) => any;
  getEmployeePayrollSummary: any;
  getSavedBudgetDisplayLabel: (item: any) => string;
  renderBudgetHistoryBlock: () => React.ReactNode;
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  setBudget: React.Dispatch<React.SetStateAction<any>>;
  setMaterials: React.Dispatch<React.SetStateAction<any[]>>;
  setLabor: React.Dispatch<React.SetStateAction<any[]>>;
  setFixedCosts: React.Dispatch<React.SetStateAction<any[]>>;
  setBasicSupplies: React.Dispatch<React.SetStateAction<any[]>>;
  setBudgetDiscounts: React.Dispatch<React.SetStateAction<any[]>>;
  setBudgetIncreases: React.Dispatch<React.SetStateAction<any[]>>;
  setSubBudgetTitle: React.Dispatch<React.SetStateAction<string>>;
  setSubBudgetNotes: React.Dispatch<React.SetStateAction<string>>;
  setMarkupPct: React.Dispatch<React.SetStateAction<number>>;
  setDeviationPct: React.Dispatch<React.SetStateAction<number>>;
  setLaborDeviationPct: React.Dispatch<React.SetStateAction<number>>;
  setVatPct: React.Dispatch<React.SetStateAction<number>>;
  setCommissionPct: React.Dispatch<React.SetStateAction<number>>;
  setManualAllocationPct: React.Dispatch<React.SetStateAction<number>>;
  setAllocationMode: React.Dispatch<React.SetStateAction<any>>;
  addMaterial: any;
  removeMaterial: any;
  moveMaterial: any;
  addMaterialToStock: any;
  applyStockSuggestionToMaterial: any;
  removeLabor: any;
  removeFixedCost: any;
  removeBasicSupply: any;
  addBudgetDiscount: any;
  removeBudgetDiscount: any;
  addBudgetIncrease: any;
  removeBudgetIncrease: any;
  loadBudgetFromSnapshot: any;
  loadSubBudgetIntoEditor: any;
  removeSubBudget: any;
  saveCurrentAsSubBudget: any;
  clearCurrentBlock: () => void;
  restoreAllBudgetBlocksFromMarkers: any;
  restoreBasicSuppliesFromMarkers: any;
  restoreFixedCostsFromMarkers: any;
  restoreLaborFromMarkers: any;
  exportPrint: any;
  uploadBudgetImage: any;
};

function modoOpuesto(modo: string) {
  return modo === "porcentaje" ? "monto" : "porcentaje";
}

export function PresupuestoTab(props: PresupuestoTabProps) {
  const {
    budget, crmClients, materials, labor, fixedCosts, basicSupplies, budgetDiscounts,
    budgetIncreases, subBudgets, subBudgetTitle, subBudgetNotes, markupPct,
    subBudgetCurrency, setSubBudgetCurrency, subBudgetQuantity, setSubBudgetQuantity,
    consolidatedBudgetTotalsUsd, hasUsdBudgetSections,
    deviationPct, laborDeviationPct, vatPct, commissionPct, manualAllocationPct,
    allocationMode, editingBudgetId, consolidatedBudgetTotals,
    consolidatedCommissionAmount, currentClientHistory, totalMaterials,
    totalLabor, totalBasicSupplies, totalJobHours, totalAvailableHours,
    currentWorkingSectionTotals, workingBudgetSections, companyTheme,
    employeesSortedByPay, COMPANY_OPTIONS, STOCK_GENERAL_GROUP_OPTIONS,
    LOGO_IMAGE_OPTS, getCompanyMeta, getCompanyBankingLines, getCompanyTaxId,
    getEmployeePayrollSummary, getSavedBudgetDisplayLabel, renderBudgetHistoryBlock,
    updateArrayItem, setBudget, setMaterials, setLabor, setFixedCosts,
    setBasicSupplies, setBudgetDiscounts, setBudgetIncreases, setSubBudgetTitle,
    setSubBudgetNotes, setMarkupPct, setDeviationPct, setLaborDeviationPct,
    setVatPct, setCommissionPct, setManualAllocationPct, setAllocationMode,
    addMaterial, removeMaterial, moveMaterial, addMaterialToStock,
    applyStockSuggestionToMaterial, removeLabor, removeFixedCost, removeBasicSupply,
    addBudgetDiscount, removeBudgetDiscount, addBudgetIncrease, removeBudgetIncrease,
    loadBudgetFromSnapshot, loadSubBudgetIntoEditor, removeSubBudget,
    saveCurrentAsSubBudget, clearCurrentBlock, restoreAllBudgetBlocksFromMarkers,
    restoreBasicSuppliesFromMarkers, restoreFixedCostsFromMarkers,
    restoreLaborFromMarkers, exportPrint, uploadBudgetImage,
    effectiveIsAdmin, allowedCompaniesForSession, canAccessCompany,
    budgetEstimatedDeliveryDate, approvedJobs, occupancyPct, allocationPctUsed,
    totalLaborDeviationAmount, deviationAmount, markupAmount, fixedCostsApplied,
    preDiscountNetPrice, totalIncreaseAmount, totalDiscountAmount,
    billedPctNormalized, budgetWhiteTotal, budgetBlackTotal, stockSearchOptions,
    displayedMaterials, stockByCode, stockByDescription, laborRows,
    nominalLaborHoursPerEmployee, totalFixedCosts,
  } = props;
  // ---- PLANILLAS del presupuesto (estetica del Calendario anual) ------------------------------
  const anchosMateriales = usePlanillaWidths("ppto.materiales", { label: 320, col: 104, colCompact: 80 });
  const marcaMateriales = useCeldaMarcada();
  const [menuMateriales, setMenuMateriales] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosInsumos = usePlanillaWidths("ppto.insumos", { label: 320, col: 104, colCompact: 80 });
  const marcaInsumos = useCeldaMarcada();
  const [menuInsumos, setMenuInsumos] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosFijos = usePlanillaWidths("ppto.fijos", { label: 340, col: 120, colCompact: 92 });
  const marcaFijos = useCeldaMarcada();
  const [menuFijos, setMenuFijos] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosMO = usePlanillaWidths("ppto.manodeobra", { label: 260, col: 104, colCompact: 80 });
  const marcaMO = useCeldaMarcada();
  const [menuMO, setMenuMO] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosCrm = usePlanillaWidths("ppto.crm", { label: 220, col: 110, colCompact: 84 });
  const [menuCrm, setMenuCrm] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosRefPersonal = usePlanillaWidths("ppto.personalref", { label: 240, col: 116, colCompact: 88 });
  const anchosAumentos = usePlanillaWidths("ppto.aumentos", { label: 240, col: 110, colCompact: 84 });
  const [menuAumentos, setMenuAumentos] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosDescuentos = usePlanillaWidths("ppto.descuentos", { label: 240, col: 130, colCompact: 100 });
  const [menuDescuentos, setMenuDescuentos] = React.useState<null | { x: number; y: number; id: number }>(null);
  return (
        <div style={styles.budgetLayout}>
          <div style={styles.budgetMainTop}>
            <Panel title="Datos del presupuesto">
              <TwoCol>
                <Field label="Empresa">
                  <select
                    style={{
                      ...styles.input,
                      borderColor: companyTheme.primary,
                      color: companyTheme.primary,
                      fontWeight: 700,
                    }}
                    value={budget.company}
                    disabled={!effectiveIsAdmin && allowedCompaniesForSession.length <= 1}
                    onChange={(e) => {
                      const company = e.target.value as CompanyName;
                      setBudget({ ...budget, company, cuit: getCompanyTaxId(company) });
                    }}
                  >
                    {COMPANY_OPTIONS.filter((option) => canAccessCompany(option.value)).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="CUIT empresa">
                  <input
                    style={styles.input}
                    value={budget.cuit}
                    readOnly
                  />
                </Field>
                <Field label="Numero">
                  <input
                    style={styles.input}
                    value={budget.number}
                    onChange={(e) => setBudget({ ...budget, number: e.target.value })}
                  />
                </Field>
                <Field label="Fecha">
                  <input
                    style={styles.input}
                    type="date"
                    value={budget.date}
                    onChange={(e) => setBudget({ ...budget, date: e.target.value })}
                  />
                </Field>
                <Field label="Fecha de entrega estimada">
                  <input style={styles.input} value={formatDateDisplay(budgetEstimatedDeliveryDate)} readOnly />
                </Field>
                <Field label="Cliente">
                  <ClientPicker
                    value={budget.client}
                    clients={crmClients}
                    onPick={(match) => {
                      // Al elegir un cliente existente se traen sus datos y se fija el clientId.
                      setBudget({
                        ...budget,
                        client: match.name,
                        clientId: match.id,
                        clientTaxId: match.taxId || budget.clientTaxId,
                        contactName: match.contactName || budget.contactName,
                        contactPhone: match.contactPhone || budget.contactPhone,
                        contactEmail: match.contactEmail || budget.contactEmail,
                        clientNotes: match.notes || budget.clientNotes,
                      });
                    }}
                    onType={(name) => {
                      const match = findClientByName(crmClients, name);
                      if (match) {
                        setBudget({
                          ...budget,
                          client: name,
                          clientId: match.id,
                          clientTaxId: match.taxId || budget.clientTaxId,
                          contactName: match.contactName || budget.contactName,
                          contactPhone: match.contactPhone || budget.contactPhone,
                          contactEmail: match.contactEmail || budget.contactEmail,
                          clientNotes: match.notes || budget.clientNotes,
                        });
                      } else {
                        setBudget({ ...budget, client: name, clientId: undefined });
                      }
                    }}
                  />
                  {findClientByName(crmClients, budget.client) ? (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ ...styles.statusPill, ...styles.statusGreen }}>
                        ✓ Cliente reconocido del CRM — datos autocompletados
                      </span>
                    </div>
                  ) : budget.client.trim() ? (
                    <div style={{ marginTop: 6 }}>
                      <span style={styles.muted}>Cliente nuevo — se registrará en el CRM al guardar</span>
                    </div>
                  ) : null}
                </Field>
                <Field label="Contacto">
                  <input
                    style={styles.input}
                    value={budget.contactName}
                    onChange={(e) => setBudget({ ...budget, contactName: e.target.value })}
                  />
                </Field>
                <Field label="Telefono">
                  <input
                    style={styles.input}
                    value={budget.contactPhone}
                    onChange={(e) => setBudget({ ...budget, contactPhone: e.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <input
                    style={styles.input}
                    value={budget.contactEmail}
                    onChange={(e) => setBudget({ ...budget, contactEmail: e.target.value })}
                  />
                </Field>
                <Field label="CUIT/CUIL cliente">
                  <input
                    style={styles.input}
                    value={budget.clientTaxId}
                    onChange={(e) => setBudget({ ...budget, clientTaxId: e.target.value })}
                  />
                </Field>
                <Field label="Proyecto">
                  <input
                    style={styles.input}
                    value={budget.project}
                    onChange={(e) => setBudget({ ...budget, project: e.target.value })}
                  />
                </Field>
                <Field label="Tipo de trabajo">
                  <select
                    style={styles.input}
                    value={budget.workType}
                    onChange={(e) => setBudget({ ...budget, workType: e.target.value as WorkTypeName })}
                  >
                    {WORK_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Forma de pago">
                  <input
                    style={styles.input}
                    value={budget.paymentTerms}
                    onChange={(e) => setBudget({ ...budget, paymentTerms: e.target.value })}
                  />
                </Field>
                <Field label="% anticipo">
                  <input
                    style={styles.input}
                    type="number"
                    value={resolveAdvancePct(budget.advancePct, budget.paymentTerms)}
                    onChange={(e) =>
                      setBudget({
                        ...budget,
                        advancePct: Math.max(0, Math.min(100, Number(e.target.value))),
                      })
                    }
                  />
                </Field>
                <Field label="% facturado / blanco">
                  <input
                    style={styles.input}
                    type="number"
                    value={budget.billedPct}
                    onChange={(e) =>
                      setBudget({
                        ...budget,
                        billedPct: Math.max(0, Math.min(100, Number(e.target.value))),
                      })
                    }
                  />
                </Field>
                <Field label="Plazo">
                  <input
                    style={styles.input}
                    value={budget.deliveryTerm}
                    onChange={(e) => setBudget({ ...budget, deliveryTerm: e.target.value })}
                  />
                </Field>
                <Field label="Validez">
                  <input
                    style={styles.input}
                    value={budget.validity}
                    onChange={(e) => setBudget({ ...budget, validity: e.target.value })}
                  />
                </Field>
                <Field label="Destino entrega">
                  <input
                    style={styles.input}
                    value={budget.deliveryDestination}
                    onChange={(e) => setBudget({ ...budget, deliveryDestination: e.target.value })}
                  />
                </Field>
                <Field label="Encargado">
                  <input
                    style={styles.input}
                    value={budget.projectManager}
                    onChange={(e) => setBudget({ ...budget, projectManager: e.target.value })}
                  />
                </Field>
                <Field label="Fecha maxima requerimiento">
                  <input
                    style={styles.input}
                    type="date"
                    value={budget.maxRequirementDate}
                    onChange={(e) => setBudget({ ...budget, maxRequirementDate: e.target.value })}
                  />
                </Field>
              </TwoCol>

              <Field label="Datos bancarios empresa">
                <textarea
                  style={{ ...styles.textarea, minHeight: 96 }}
                  value={
                    getCompanyBankingLines(budget.company).join("\n") ||
                    "Sin datos bancarios cargados para esta empresa."
                  }
                  readOnly
                />
              </Field>

              <Field label="Descripcion">
                <textarea
                  style={styles.textarea}
                  value={budget.notes}
                  onChange={(e) => setBudget({ ...budget, notes: e.target.value })}
                />
              </Field>
              <Field label="Alcance">
                <textarea
                  style={styles.textarea}
                  value={budget.scope}
                  onChange={(e) => setBudget({ ...budget, scope: e.target.value })}
                />
              </Field>
              <Field label="Notas CRM del cliente">
                <textarea
                  style={styles.textarea}
                  value={budget.clientNotes}
                  onChange={(e) => setBudget({ ...budget, clientNotes: e.target.value })}
                />
              </Field>
            </Panel>

            {false && (
            <Panel title="Imagenes">
              <div style={styles.grid2}>
                <Field label="Logos">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(
                        files.map((file) => uploadBudgetImage(file, LOGO_IMAGE_OPTS))
                      );
                      setBudget((prev) => ({ ...prev, logos: [...prev.logos, ...images] }));
                    }}
                  />
                </Field>
                <Field label="Referencias">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(files.map((file) => uploadBudgetImage(file)));
                      setBudget((prev) => ({
                        ...prev,
                        referenceImages: [...prev.referenceImages, ...images],
                      }));
                    }}
                  />
                </Field>
              </div>
              {budget.referenceImages.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.referenceImages.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            referenceImages: prev.referenceImages.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {budget.logos.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.logos.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <div style={styles.muted}>
                        {index === 0 ? "Logo principal / marca de agua" : "Logo adicional"}
                      </div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            logos: prev.logos.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            )}

            <Panel span="full" title="CRM del cliente">
              {budget.client.trim() === "" ? (
                <div style={styles.empty}>Carga el nombre del cliente para ver si ya cotizo antes con ustedes.</div>
              ) : currentClientHistory.length === 0 ? (
                <div style={styles.empty}>No hay antecedentes para este cliente. Quedara como nuevo cliente en CRM.</div>
              ) : (
                <>
                  <div style={styles.metricGrid}>
                    <MiniMetric
                      label="Tipo de cliente"
                      value={currentClientHistory.length > 1 ? "Cliente habitual" : "Nuevo cliente"}
                    />
                    <MiniMetric label="Presupuestos previos" value={String(currentClientHistory.length)} />
                    <MiniMetric
                      label="Ultimo presupuesto"
                      value={getSavedBudgetDisplayLabel(currentClientHistory[0])}
                    />
                    <MiniMetric
                      label="Ultima fecha"
                      value={formatDateDisplay(currentClientHistory[0].date)}
                    />
                  </div>
                  <div style={{ ...planillaWrap, ...anchosCrm.vars }}>
                  <table className="planilla" style={planillaTable}>
                    <colgroup>
                      <col style={colLabel} />
                      <col style={colDato} />
                      <col style={colDato} />
                      <col style={colFlexible} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thEsquina}>
                          Presupuesto
                          <PlanillaManija
                            onMouseDown={(ev) => anchosCrm.startResize(ev, "label")}
                            onDoubleClick={anchosCrm.resetLabel}
                          />
                        </th>
                        <th style={thColumna}>
                          Fecha
                          <PlanillaManija
                            onMouseDown={(ev) => anchosCrm.startResize(ev, "col")}
                            onDoubleClick={anchosCrm.resetCol}
                          />
                        </th>
                        <th style={thColumna}>Estado</th>
                        <th style={thFlexible}>Proyecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClientHistory.slice(0, 5).map((item) => {
                        const wasBought = approvedJobs.some(
                          (job) => job.rootBudgetId === item.rootBudgetId || job.budgetId === item.id
                        );
                        return (
                          <tr
                            key={item.id}
                            onContextMenu={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              setMenuCrm({ x: ev.clientX, y: ev.clientY, id: item.id });
                            }}
                          >
                            <td style={{ ...tdNombre, fontWeight: 400 }} title={getSavedBudgetDisplayLabel(item)}>
                              <span
                                title={wasBought ? "Compro" : "No compro"}
                                style={{
                                  display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                                  background: wasBought ? "#16a34a" : "#cbd5f5",
                                }}
                              />
                              {getSavedBudgetDisplayLabel(item)}
                            </td>
                            <td style={{ ...tdDato, color: "#475569" }}>{formatDateDisplay(item.date)}</td>
                            <td style={{ ...tdDato, color: "#475569" }}>{item.status}</td>
                            <td style={{ ...tdFlexible, color: "#64748b" }} title={item.project}>{item.project}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  {menuCrm && (() => {
                    const it = currentClientHistory.find((x: any) => x.id === menuCrm.id);
                    const cerrar = () => setMenuCrm(null);
                    if (!it) return null;
                    return (
                      <QuickMenu x={menuCrm.x} y={menuCrm.y} onClose={cerrar}>
                        <QuickMenuTitle>{getSavedBudgetDisplayLabel(it)}</QuickMenuTitle>
                        <button
                          style={quickMenuItem}
                          onClick={() => {
                            loadBudgetFromSnapshot(it.snapshot, it.id);
                            cerrar();
                          }}
                        >
                          Cargar para editar
                        </button>
                      </QuickMenu>
                    );
                  })()}
                </>
              )}
            </Panel>

            {false && (
            <>
            <Panel
              title="Parametros economicos"
              actions={<ButtonLike onClick={restoreAllBudgetBlocksFromMarkers}>Restaurar todo desde marcadores</ButtonLike>}
            >
              <TwoCol>
                <Field label="Desvio %">
                  <input
                    style={styles.input}
                    type="number"
                    value={deviationPct}
                    onChange={(e) => setDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Markup %">
                  <input
                    style={styles.input}
                    type="number"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="IVA %">
                  <input
                    style={styles.input}
                    type="number"
                    value={vatPct}
                    onChange={(e) => setVatPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Desvio mano de obra %">
                  <input
                    style={styles.input}
                    type="number"
                    value={laborDeviationPct}
                    onChange={(e) => setLaborDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Costo fijo">
                  <select
                    style={styles.input}
                    value={allocationMode}
                    onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}
                  >
                    <option value="auto">Automatico por ocupacion</option>
                    <option value="manual">Manual</option>
                  </select>
                </Field>
                {allocationMode === "manual" && (
                  <Field label="% costo fijo manual">
                    <input
                      style={styles.input}
                      type="number"
                      value={manualAllocationPct}
                      onChange={(e) => setManualAllocationPct(Number(e.target.value))}
                    />
                  </Field>
                )}
              </TwoCol>
              <div style={styles.metricGrid}>
                <MiniMetric label="% ocupacion real" value={pct(occupancyPct)} />
                <MiniMetric label="% imputado" value={pct(allocationPctUsed)} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Desvio" value={money(deviationAmount)} />
                <MiniMetric label="Resultado markup" value={money(markupAmount)} />
                <MiniMetric label="Costo fijo imputado" value={money(fixedCostsApplied)} />
              </div>
            </Panel>

            <Panel span="full"
              title="Comisiones y descuentos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={addBudgetIncrease} secondary>Agregar aumento</ButtonLike>
                  <ButtonLike onClick={addBudgetDiscount}>Agregar descuento</ButtonLike>
                </div>
              }
            >
              {editingBudgetId && (
                <div style={styles.noticeBox}>
                  Estás editando un presupuesto ya guardado. Al actualizarlo también se refresca el trabajo aprobado vinculado.
                </div>
              )}
              <TwoCol>
                <Field label="Comision % sobre neto">
                  <input
                    style={styles.input}
                    type="number"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Comision total presupuesto">
                  <input style={styles.input} value={money(consolidatedCommissionAmount)} readOnly />
                </Field>
              </TwoCol>
              {budgetIncreases.length === 0 ? (
                <div style={styles.empty}>No hay aumentos cargados para esta actualizacion.</div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosAumentos.vars, marginBottom: 12 }}>
                <table className="planilla" style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Descripción interna
                        <PlanillaManija
                          onMouseDown={(ev) => anchosAumentos.startResize(ev, "label")}
                          onDoubleClick={anchosAumentos.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        % aumento
                        <PlanillaManija
                          onMouseDown={(ev) => anchosAumentos.startResize(ev, "col")}
                          onDoubleClick={anchosAumentos.resetCol}
                        />
                      </th>
                      <th style={{ ...thFlexible, textAlign: "right" }}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetIncreases.map((item) => (
                      <tr
                        key={item.id}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setMenuAumentos({ x: ev.clientX, y: ev.clientY, id: item.id });
                        }}
                      >
                        <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }}>
                          <input
                            style={{ ...inputCelda, padding: "1px 8px" }}
                            {...focoCelda}
                            value={item.description}
                            onChange={(e) => updateArrayItem(setBudgetIncreases, item.id, "description", e.target.value)}
                          />
                        </td>
                        <td style={{ ...tdDato, padding: 0 }}>
                          <input
                            style={inputCeldaDerecha}
                            {...focoCelda}
                            type="number"
                            value={item.pct}
                            onChange={(e) => updateArrayItem(setBudgetIncreases, item.id, "pct", Number(e.target.value))}
                          />
                        </td>
                        <td style={{ ...tdFlexible, textAlign: "right", fontWeight: 700 }}>
                          {money(preDiscountNetPrice * (Number(item.pct || 0) / 100))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
              {menuAumentos && (() => {
                const it = budgetIncreases.find((x: any) => x.id === menuAumentos.id);
                const cerrar = () => setMenuAumentos(null);
                if (!it) return null;
                return (
                  <QuickMenu x={menuAumentos.x} y={menuAumentos.y} onClose={cerrar}>
                    <QuickMenuTitle>{it.description || "aumento"}</QuickMenuTitle>
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        removeBudgetIncrease(it.id);
                        cerrar();
                      }}
                    >
                      Quitar aumento
                    </button>
                  </QuickMenu>
                );
              })()}
              {budgetDiscounts.length === 0 ? (
                <div style={styles.empty}>No hay descuentos cargados.</div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosDescuentos.vars }}>
                <table className="planilla" style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Descripción visible
                        <PlanillaManija
                          onMouseDown={(ev) => anchosDescuentos.startResize(ev, "label")}
                          onDoubleClick={anchosDescuentos.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Valor
                        <PlanillaManija
                          onMouseDown={(ev) => anchosDescuentos.startResize(ev, "col")}
                          onDoubleClick={anchosDescuentos.resetCol}
                        />
                      </th>
                      <th style={thFlexible}>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetDiscounts.map((item) => (
                      <tr
                        key={item.id}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setMenuDescuentos({ x: ev.clientX, y: ev.clientY, id: item.id });
                        }}
                      >
                        <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }}>
                          <input
                            style={{ ...inputCelda, padding: "1px 8px" }}
                            {...focoCelda}
                            value={item.description}
                            onChange={(e) => updateArrayItem(setBudgetDiscounts, item.id, "description", e.target.value)}
                          />
                        </td>
                        <td style={{ ...tdDato, padding: 0 }}>
                          {item.mode === "porcentaje" ? (
                            <input
                              style={inputCeldaDerecha}
                              {...focoCelda}
                              type="number"
                              value={item.pct ?? 0}
                              onChange={(e) => updateArrayItem(setBudgetDiscounts, item.id, "pct", Number(e.target.value))}
                            />
                          ) : (
                            <AmountInput
                              style={inputCeldaDerecha}
                              {...focoCelda}
                              value={item.amount}
                              onChange={(n) => updateArrayItem(setBudgetDiscounts, item.id, "amount", n)}
                            />
                          )}
                        </td>
                        <td style={{ ...tdFlexible, color: "#64748b" }}>
                          {item.mode === "porcentaje" ? "porcentaje (%)" : "monto fijo ($)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
              {menuDescuentos && (() => {
                const it = budgetDiscounts.find((x: any) => x.id === menuDescuentos.id);
                const cerrar = () => setMenuDescuentos(null);
                if (!it) return null;
                return (
                  <QuickMenu x={menuDescuentos.x} y={menuDescuentos.y} onClose={cerrar}>
                    <QuickMenuTitle>{it.description || "descuento"}</QuickMenuTitle>
                    <button
                      style={quickMenuItem}
                      onClick={() => {
                        updateArrayItem(
                          setBudgetDiscounts,
                          it.id,
                          "mode",
                          modoOpuesto(it.mode)
                        );
                        cerrar();
                      }}
                    >
                      {it.mode === "porcentaje" ? "Pasar a monto fijo ($)" : "Pasar a porcentaje (%)"}
                    </button>
                    <QuickMenuSep />
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        removeBudgetDiscount(it.id);
                        cerrar();
                      }}
                    >
                      Quitar descuento
                    </button>
                  </QuickMenu>
                );
              })()}
              <div style={styles.metricGrid}>
                <MiniMetric label="Neto base bloque" value={money(preDiscountNetPrice)} />
                <MiniMetric label="Aumentos internos" value={money(totalIncreaseAmount)} />
                <MiniMetric label="Descuentos bloque" value={money(totalDiscountAmount)} />
                <MiniMetric label="Neto total" value={money(consolidatedBudgetTotals.netPrice)} />
                <MiniMetric label="Comision total" value={money(consolidatedCommissionAmount)} />
                <MiniMetric label="% blanco" value={pct(billedPctNormalized)} />
                <MiniMetric label="Circuito blanco" value={money(budgetWhiteTotal)} />
                <MiniMetric label="Circuito negro" value={money(budgetBlackTotal)} />
              </div>
            </Panel>
            </>)}
          </div>

          <div style={styles.budgetMainBottom}>
            <Panel
              span="full"
              title="Materiales"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={addMaterial}>Agregar</ButtonLike>
                  <ButtonLike onClick={anchosMateriales.toggleCompacto} secondary>
                    {anchosMateriales.esCompacto ? "Ancho normal" : "Compacto"}
                  </ButtonLike>
                </div>
              }
            >
              <datalist id="materials-stock-options">
                {stockSearchOptions.flatMap((stockItem) => [
                  <option
                    key={`${stockItem.id}-combo`}
                    value={`${stockItem.code} - ${stockItem.description}`}
                  />,
                  <option key={`${stockItem.id}-code`} value={stockItem.code} />,
                  <option key={`${stockItem.id}-desc`} value={stockItem.description} />,
                ])}
              </datalist>
              <datalist id="stock-general-group-options">
                {STOCK_GENERAL_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
              <div style={{ ...planillaWrap, ...anchosMateriales.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Descripción
                      <PlanillaManija
                        onMouseDown={(ev) => anchosMateriales.startResize(ev, "label")}
                        onDoubleClick={anchosMateriales.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Cant.
                      <PlanillaManija
                        onMouseDown={(ev) => anchosMateriales.startResize(ev, "col")}
                        onDoubleClick={anchosMateriales.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>$ Unit.</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Subtotal</th>
                    <th style={thFlexible}>Stock · grupo · ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMaterials.map((item) => {
                    const stockMatch = matchStockForMaterial(item, stockByCode, stockByDescription);
                    const alcanza = stockMatch ? Number(stockMatch.quantity || 0) >= Number(item.qty || 0) : false;
                    return (
                      <tr
                        key={item.id}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          marcaMateriales.marcar(String(item.id));
                          setMenuMateriales({ x: ev.clientX, y: ev.clientY, id: item.id });
                        }}
                      >
                        <td style={{ ...tdNombre, ...marcaMateriales.estilo(String(item.id)), fontWeight: 400, padding: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                            <span
                              title={stockMatch ? (alcanza ? "Hay stock suficiente" : "Stock insuficiente") : "No esta en stock"}
                              style={{
                                display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                                background: !stockMatch ? "#cbd5f5" : alcanza ? "#16a34a" : "#ca8a04",
                              }}
                            />
                            <input
                              style={inputCelda}
                              {...focoCelda}
                              list="materials-stock-options"
                              value={item.description}
                              onChange={(e) => applyStockSuggestionToMaterial(item.id, e.target.value)}
                            />
                          </span>
                        </td>
                        <td style={{ ...tdDato, padding: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                            <input
                              style={inputCeldaDerecha}
                              {...focoCelda}
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateArrayItem(setMaterials, item.id, "qty", Number(e.target.value))}
                            />
                            <input
                              style={{ ...inputCelda, width: 44, color: "#94a3b8" }}
                              {...focoCelda}
                              value={item.unit}
                              onChange={(e) => updateArrayItem(setMaterials, item.id, "unit", e.target.value)}
                            />
                          </span>
                        </td>
                        <td style={{ ...tdDato, padding: 0 }}>
                          <AmountInput
                            style={inputCeldaDerecha}
                            {...focoCelda}
                            value={item.unitPrice}
                            onChange={(n) => updateArrayItem(setMaterials, item.id, "unitPrice", n)}
                          />
                        </td>
                        <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                          {money(item.qty * item.unitPrice)}
                        </td>
                        <td style={{ ...tdFlexible, color: "#64748b" }}>
                          {stockMatch ? (
                            <span style={{ color: alcanza ? "#166534" : "#ca8a04", fontWeight: 600 }}>
                              {stockMatch.quantity} {stockMatch.unit}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>sin stock</span>
                          )}
                          <span style={{ color: "#94a3b8" }}>
                            {" · "}{item.stockGroup || stockMatch?.group || "sin grupo"}
                            {" · "}{stockMatch?.location || item.stockLocation || "sin ubicación"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {menuMateriales && (() => {
                const it = displayedMaterials.find((x: any) => x.id === menuMateriales.id);
                const cerrar = () => {
                  setMenuMateriales(null);
                  marcaMateriales.marcar(null);
                };
                if (!it) return null;
                const stockMatch = matchStockForMaterial(it, stockByCode, stockByDescription);
                return (
                  <QuickMenu x={menuMateriales.x} y={menuMateriales.y} onClose={cerrar}>
                    <QuickMenuTitle>{it.description || "material"}</QuickMenuTitle>
                    <button
                      style={quickMenuItem}
                      onClick={() => {
                        const v = window.prompt("Grupo de stock:", String(it.stockGroup || stockMatch?.group || ""));
                        if (v !== null) updateArrayItem(setMaterials, it.id, "stockGroup", v.trim());
                        cerrar();
                      }}
                    >
                      Editar grupo de stock…
                    </button>
                    <QuickMenuSep />
                    <button
                      style={quickMenuItem}
                      onClick={() => {
                        moveMaterial(it.id, -1);
                        cerrar();
                      }}
                    >
                      Subir un lugar
                    </button>
                    <button
                      style={quickMenuItem}
                      onClick={() => {
                        moveMaterial(it.id, 1);
                        cerrar();
                      }}
                    >
                      Bajar un lugar
                    </button>
                    {!stockMatch && it.description.trim() ? (
                      <>
                        <QuickMenuSep />
                        <button
                          style={quickMenuItem}
                          onClick={() => {
                            addMaterialToStock(it.id);
                            cerrar();
                          }}
                        >
                          Agregar a stock
                        </button>
                      </>
                    ) : null}
                    <QuickMenuSep />
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        removeMaterial(it.id);
                        cerrar();
                      }}
                    >
                      Quitar del presupuesto
                    </button>
                  </QuickMenu>
                );
              })()}
              <div style={styles.rightStrong}>Total materiales: {money(totalMaterials)}</div>
            </Panel>

            <Panel span="full"
              title="Insumos y fletes"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreBasicSuppliesFromMarkers} secondary>Restaurar</ButtonLike>
                  <ButtonLike onClick={anchosInsumos.toggleCompacto} secondary>
                    {anchosInsumos.esCompacto ? "Ancho normal" : "Compacto"}
                  </ButtonLike>
                </div>
              }
            >
              <div style={{ ...planillaWrap, ...anchosInsumos.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Descripción
                      <PlanillaManija
                        onMouseDown={(ev) => anchosInsumos.startResize(ev, "label")}
                        onDoubleClick={anchosInsumos.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Cant.
                      <PlanillaManija
                        onMouseDown={(ev) => anchosInsumos.startResize(ev, "col")}
                        onDoubleClick={anchosInsumos.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>$ Unit.</th>
                    <th style={thFlexible}>Subtotal · origen</th>
                  </tr>
                </thead>
                <tbody>
                  {basicSupplies.map((item) => (
                    <tr
                      key={item.id}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        marcaInsumos.marcar(String(item.id));
                        setMenuInsumos({ x: ev.clientX, y: ev.clientY, id: item.id });
                      }}
                    >
                      <td
                        style={{
                          ...tdNombre, ...marcaInsumos.estilo(String(item.id)), fontWeight: 400, padding: 0,
                          boxShadow: item.sourceCompany ? `inset 4px 0 0 ${getCompanyMeta(item.sourceCompany).primary}` : undefined,
                        }}
                      >
                        <input
                          style={{ ...inputCelda, padding: "1px 8px" }}
                          {...focoCelda}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setBasicSupplies, item.id, "description", e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                          <input
                            style={inputCeldaDerecha}
                            {...focoCelda}
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateArrayItem(setBasicSupplies, item.id, "qty", Number(e.target.value))}
                          />
                          <input
                            style={{ ...inputCelda, width: 44, color: "#94a3b8" }}
                            {...focoCelda}
                            value={item.unit}
                            onChange={(e) => updateArrayItem(setBasicSupplies, item.id, "unit", e.target.value)}
                          />
                        </span>
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <AmountInput
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          value={item.unitPrice}
                          onChange={(n) => updateArrayItem(setBasicSupplies, item.id, "unitPrice", n)}
                        />
                      </td>
                      <td style={tdFlexible}>
                        <strong>{money(item.qty * item.unitPrice)}</strong>
                        {item.sourceCompany ? (
                          <span style={{ color: "#94a3b8" }}> · {getCompanyMeta(item.sourceCompany).short}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {menuInsumos && (() => {
                const it = basicSupplies.find((x: any) => x.id === menuInsumos.id);
                const cerrar = () => {
                  setMenuInsumos(null);
                  marcaInsumos.marcar(null);
                };
                if (!it) return null;
                return (
                  <QuickMenu x={menuInsumos.x} y={menuInsumos.y} onClose={cerrar}>
                    <QuickMenuTitle>{it.description || "insumo"}</QuickMenuTitle>
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        removeBasicSupply(it.id);
                        cerrar();
                      }}
                    >
                      Quitar del presupuesto
                    </button>
                  </QuickMenu>
                );
              })()}
              <div style={styles.rightStrong}>Total insumos y fletes: {money(totalBasicSupplies)}</div>
            </Panel>

            <Panel span="full"
              title="Mano de obra"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreLaborFromMarkers} secondary>Restaurar</ButtonLike>
                  <ButtonLike onClick={anchosMO.toggleCompacto} secondary>
                    {anchosMO.esCompacto ? "Ancho normal" : "Compacto"}
                  </ButtonLike>
                </div>
              }
            >
              <div style={{ ...planillaWrap, ...anchosMO.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Categoría
                      <PlanillaManija
                        onMouseDown={(ev) => anchosMO.startResize(ev, "label")}
                        onDoubleClick={anchosMO.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Empleados
                      <PlanillaManija
                        onMouseDown={(ev) => anchosMO.startResize(ev, "col")}
                        onDoubleClick={anchosMO.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>$ Hora base</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Hs trabajo</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Subtotal</th>
                    <th style={thFlexible}>$ Hora final · capacidad · origen</th>
                  </tr>
                </thead>
                <tbody>
                  {laborRows.map((item) => (
                    <tr
                      key={item.id}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        marcaMO.marcar(String(item.id));
                        setMenuMO({ x: ev.clientX, y: ev.clientY, id: item.id });
                      }}
                    >
                      <td
                        style={{
                          ...tdNombre, ...marcaMO.estilo(String(item.id)), fontWeight: 400, padding: 0,
                          boxShadow: item.sourceCompany ? `inset 4px 0 0 ${getCompanyMeta(item.sourceCompany).primary}` : undefined,
                        }}
                      >
                        <input
                          style={{ ...inputCelda, padding: "1px 8px" }}
                          {...focoCelda}
                          value={item.category}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "category", e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <input
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          type="number"
                          value={item.employees}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "employees", Number(e.target.value))}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <AmountInput
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          value={item.hourlyRate}
                          onChange={(n) => updateArrayItem(setLabor, item.id, "hourlyRate", n)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <input
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          type="number"
                          value={item.jobHours}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "jobHours", Number(e.target.value))}
                        />
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(item.subtotal)}</td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        <strong style={{ color: "#0f172a" }}>{money(item.adjustedHourlyRate)}</strong>
                        <span style={{ color: "#94a3b8" }}> ({pct(laborDeviationPct)})</span>
                        <span style={{ color: "#94a3b8" }}>
                          {" · "}{Number(item.totalMonthlyHours.toFixed(2))} hs de capacidad
                          {" · "}{nominalLaborHoursPerEmployee} hs base c/u
                        </span>
                        {item.sourceCompany ? (
                          <span style={{ color: "#94a3b8" }}> · {getCompanyMeta(item.sourceCompany).short}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {menuMO && (() => {
                const it = laborRows.find((x: any) => x.id === menuMO.id);
                const cerrar = () => {
                  setMenuMO(null);
                  marcaMO.marcar(null);
                };
                if (!it) return null;
                return (
                  <QuickMenu x={menuMO.x} y={menuMO.y} onClose={cerrar}>
                    <QuickMenuTitle>{it.category || "mano de obra"}</QuickMenuTitle>
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        removeLabor(it.id);
                        cerrar();
                      }}
                    >
                      Quitar del presupuesto
                    </button>
                  </QuickMenu>
                );
              })()}
              <div style={styles.metricGrid}>
                <MiniMetric label="Horas disponibles" value={String(Number(totalAvailableHours.toFixed(2)))} />
                <MiniMetric label="Horas trabajo" value={String(Number(totalJobHours.toFixed(2)))} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Total mano de obra" value={money(totalLabor)} />
              </div>
            </Panel>

            <Panel span="full" title="Personal de referencia para presupuestar">
              {employeesSortedByPay.length === 0 ? (
                <div style={styles.empty}>Todavia no hay empleados cargados.</div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosRefPersonal.vars }}>
                <table className="planilla" style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
                    <col style={colDato} />
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Nombre
                        <PlanillaManija
                          onMouseDown={(ev) => anchosRefPersonal.startResize(ev, "label")}
                          onDoubleClick={anchosRefPersonal.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Costo hora
                        <PlanillaManija
                          onMouseDown={(ev) => anchosRefPersonal.startResize(ev, "col")}
                          onDoubleClick={anchosRefPersonal.resetCol}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Impacto empresa</th>
                      <th style={thFlexible}>Categoría · antigüedad · empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesSortedByPay.map((employee) => {
                      const meta = getCompanyMeta(employee.company);
                      const summary = getEmployeePayrollSummary(employee);
                      return (
                        <tr key={`budget-employee-${employee.id}`}>
                          <td
                            style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${meta.primary}` }}
                            title={employee.name}
                          >
                            {employee.name}
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(summary.hourlyCost)}</td>
                          <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>{money(summary.employerImpact)}</td>
                          <td style={{ ...tdFlexible, color: "#64748b" }}>
                            {employee.category}
                            <span style={{ color: "#94a3b8" }}>
                              {" · "}{employee.seniorityYears} años{" · "}{meta.short}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </Panel>

            <Panel span="full"
              title="Costos fijos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreFixedCostsFromMarkers} secondary>Restaurar</ButtonLike>
                  <ButtonLike onClick={anchosFijos.toggleCompacto} secondary>
                    {anchosFijos.esCompacto ? "Ancho normal" : "Compacto"}
                  </ButtonLike>
                </div>
              }
            >
              <div style={{ ...planillaWrap, ...anchosFijos.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Descripción
                      <PlanillaManija
                        onMouseDown={(ev) => anchosFijos.startResize(ev, "label")}
                        onDoubleClick={anchosFijos.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Monto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosFijos.startResize(ev, "col")}
                        onDoubleClick={anchosFijos.resetCol}
                      />
                    </th>
                    <th style={thFlexible}>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedCosts.map((item) => (
                    <tr
                      key={item.id}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        marcaFijos.marcar(String(item.id));
                        setMenuFijos({ x: ev.clientX, y: ev.clientY, id: item.id });
                      }}
                    >
                      <td
                        style={{
                          ...tdNombre, ...marcaFijos.estilo(String(item.id)), fontWeight: 400, padding: 0,
                          boxShadow: item.sourceCompany ? `inset 4px 0 0 ${getCompanyMeta(item.sourceCompany).primary}` : undefined,
                        }}
                      >
                        <input
                          style={{ ...inputCelda, padding: "1px 8px" }}
                          {...focoCelda}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setFixedCosts, item.id, "description", e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <AmountInput
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          value={item.amount}
                          onChange={(n) => updateArrayItem(setFixedCosts, item.id, "amount", n)}
                        />
                      </td>
                      <td style={{ ...tdFlexible, color: "#94a3b8" }}>
                        {item.sourceCompany ? getCompanyMeta(item.sourceCompany).short : "manual"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {menuFijos && (() => {
                const it = fixedCosts.find((x: any) => x.id === menuFijos.id);
                const cerrar = () => {
                  setMenuFijos(null);
                  marcaFijos.marcar(null);
                };
                if (!it) return null;
                return (
                  <QuickMenu x={menuFijos.x} y={menuFijos.y} onClose={cerrar}>
                    <QuickMenuTitle>{it.description || "costo fijo"}</QuickMenuTitle>
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        removeFixedCost(it.id);
                        cerrar();
                      }}
                    >
                      Quitar del presupuesto
                    </button>
                  </QuickMenu>
                );
              })()}
              <div style={styles.rightStrong}>Total costos fijos: {money(totalFixedCosts)}</div>
            </Panel>
          </div>

          <div style={styles.budgetAside}>
            <Panel
              title="Subpresupuestos dentro de esta cotizacion"
              actions={
                <ButtonLike onClick={saveCurrentAsSubBudget}>
                  Guardar bloque actual
                </ButtonLike>
              }
            >
              <Field label="Titulo del subpresupuesto">
                <input
                  style={styles.input}
                  value={subBudgetTitle}
                  onChange={(e) => setSubBudgetTitle(e.target.value)}
                  placeholder="Ej. Cocina, vestidor, oficina"
                />
              </Field>
              <Field label="Moneda del bloque">
                <select
                  style={styles.input}
                  value={subBudgetCurrency}
                  onChange={(e) => setSubBudgetCurrency(e.target.value === "USD" ? "USD" : "ARS")}
                >
                  <option value="ARS">$ Pesos</option>
                  <option value="USD">U$S Dolares</option>
                </select>
                {subBudgetCurrency === "USD" && (
                  <div style={{ ...styles.muted, marginTop: 4 }}>
                    Este bloque se expresa en dólares. Cargá los precios en U$S; su total no se suma
                    con los bloques en pesos.
                  </div>
                )}
              </Field>
              <Field label="Cantidad cotizada (× unidades)">
                <input
                  style={styles.input}
                  type="number"
                  min={1}
                  step={1}
                  value={subBudgetQuantity}
                  onChange={(e) =>
                    setSubBudgetQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  }
                />
                <div style={{ ...styles.muted, marginTop: 4 }}>
                  Cotizá el bloque por <strong>una unidad</strong> y poné acá cuántas piden: se
                  multiplica × {subBudgetQuantity} (precio, costo y horas) sin rehacer el presupuesto.
                  {subBudgetQuantity > 1 && (
                    <>
                      {" "}
                      Neto del bloque:{" "}
                      {money(currentWorkingSectionTotals.netPrice, subBudgetCurrency)} × {subBudgetQuantity}{" "}
                      = <strong>{money(currentWorkingSectionTotals.netPrice * subBudgetQuantity, subBudgetCurrency)}</strong>.
                    </>
                  )}
                </div>
              </Field>
              <Field label="Notas del bloque">
                <textarea
                  style={styles.textarea}
                  value={subBudgetNotes}
                  onChange={(e) => setSubBudgetNotes(e.target.value)}
                  placeholder="Observaciones internas o alcance de este bloque"
                />
              </Field>

              <div style={{ marginTop: 8 }}>
                <ButtonLike
                  onClick={() => {
                    if (
                      window.confirm(
                        "¿Vaciar el bloque actual? Se borran los materiales, mano de obra, insumos, costos fijos y ajustes del editor. Los subpresupuestos ya guardados NO se tocan."
                      )
                    ) {
                      clearCurrentBlock();
                    }
                  }}
                >
                  Quitar todo (vaciar bloque actual)
                </ButtonLike>
                <div style={{ ...styles.muted, marginTop: 4 }}>
                  Guardá cada bloque y, al terminar, usá esto para sacar el último del editor: así no
                  queda contado dos veces.
                </div>
              </div>

              <div style={styles.metricGrid}>
                <MiniMetric label="Subpresupuestos guardados" value={String(subBudgets.length)} />
                <MiniMetric
                  label="Bloques totales"
                  value={String(workingBudgetSections.length)}
                />
                <MiniMetric
                  label={`Neto bloque actual${subBudgetQuantity > 1 ? ` (× ${subBudgetQuantity})` : ""}${
                    subBudgetCurrency === "USD" ? " (U$S)" : ""
                  }`}
                  value={money(
                    currentWorkingSectionTotals.netPrice * (subBudgetQuantity > 0 ? subBudgetQuantity : 1),
                    subBudgetCurrency
                  )}
                />
                <MiniMetric
                  label={hasUsdBudgetSections ? "Neto total (pesos)" : "Neto presupuesto total"}
                  value={money(consolidatedBudgetTotals.netPrice)}
                />
                {hasUsdBudgetSections && (
                  <MiniMetric
                    label="Neto total (U$S)"
                    value={money(consolidatedBudgetTotalsUsd.netPrice, "USD")}
                  />
                )}
              </div>

              {subBudgets.length === 0 ? (
                <div style={styles.empty}>
                  Todavia no guardaste subpresupuestos parciales. Cuando cierres un bloque,
                  guárdalo y luego sigue cargando el siguiente.
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {subBudgets.map((item, index) => {
                    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
                    const cur = item.currency === "USD" ? "USD" : "ARS";
                    return (
                    <div key={item.id} style={styles.subCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <strong>{item.title || `Subpresupuesto ${index + 1}`}</strong>
                          {qty > 1 && (
                            <span
                              style={{
                                marginLeft: 8,
                                padding: "1px 8px",
                                borderRadius: 999,
                                background: "#1e3a8a",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              × {qty} unidades
                            </span>
                          )}
                          {item.currency === "USD" && (
                            <span
                              style={{
                                marginLeft: 8,
                                padding: "1px 8px",
                                borderRadius: 999,
                                background: "#065f46",
                                color: "#fff",
                                fontSize: 12,
                              }}
                            >
                              U$S
                            </span>
                          )}
                          <div style={styles.muted}>
                            Guardado: {formatDateDisplay(item.savedAt.slice(0, 10))}
                          </div>
                        </div>
                        <div style={styles.inlineActions}>
                          <button
                            style={styles.smallBtn}
                            onClick={() => loadSubBudgetIntoEditor(item.id)}
                          >
                            Editar bloque
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => removeSubBudget(item.id)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                      {item.notes && <div style={{ marginTop: 8 }}>{item.notes}</div>}
                      <div style={{ ...styles.metricGrid, marginTop: 12 }}>
                        <MiniMetric label="Materiales" value={money(item.totals.totalMaterials, cur)} />
                        <MiniMetric
                          label="Insumos y fletes"
                          value={money(item.totals.totalBasicSupplies, cur)}
                        />
                        <MiniMetric label="Mano de obra" value={money(item.totals.totalLabor, cur)} />
                        <MiniMetric
                          label={qty > 1 ? "Valor neto (× unidad)" : "Valor neto"}
                          value={money(item.totals.netPrice, cur)}
                        />
                        {qty > 1 && (
                          <MiniMetric
                            label={`Neto del bloque (× ${qty})`}
                            value={money(item.totals.netPrice * qty, cur)}
                          />
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel
              title="Parametros economicos"
              actions={<ButtonLike onClick={restoreAllBudgetBlocksFromMarkers}>Restaurar todo desde marcadores</ButtonLike>}
            >
              <TwoCol>
                <Field label="Desvio %">
                  <input
                    style={styles.input}
                    type="number"
                    value={deviationPct}
                    onChange={(e) => setDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Markup %">
                  <input
                    style={styles.input}
                    type="number"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="IVA %">
                  <input
                    style={styles.input}
                    type="number"
                    value={vatPct}
                    onChange={(e) => setVatPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Desvio mano de obra %">
                  <input
                    style={styles.input}
                    type="number"
                    value={laborDeviationPct}
                    onChange={(e) => setLaborDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Costo fijo">
                  <select
                    style={styles.input}
                    value={allocationMode}
                    onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}
                  >
                    <option value="auto">Automatico por ocupacion</option>
                    <option value="manual">Manual</option>
                  </select>
                </Field>
                {allocationMode === "manual" && (
                  <Field label="% costo fijo manual">
                    <input
                      style={styles.input}
                      type="number"
                      value={manualAllocationPct}
                      onChange={(e) => setManualAllocationPct(Number(e.target.value))}
                    />
                  </Field>
                )}
              </TwoCol>
              <div style={styles.metricGrid}>
                <MiniMetric label="% ocupacion real" value={pct(occupancyPct)} />
                <MiniMetric label="% imputado" value={pct(allocationPctUsed)} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Desvio" value={money(deviationAmount)} />
                <MiniMetric label="Resultado markup" value={money(markupAmount)} />
                <MiniMetric label="Costo fijo imputado" value={money(fixedCostsApplied)} />
              </div>
            </Panel>

            <Panel span="full"
              title="Comisiones y descuentos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={addBudgetIncrease} secondary>Agregar aumento</ButtonLike>
                  <ButtonLike onClick={addBudgetDiscount}>Agregar descuento</ButtonLike>
                </div>
              }
            >
              {editingBudgetId && (
                <div style={styles.noticeBox}>
                  Estás editando un presupuesto ya guardado. Al actualizarlo también se refresca el trabajo aprobado vinculado.
                </div>
              )}
              <TwoCol>
                <Field label="Comision % sobre neto">
                  <input
                    style={styles.input}
                    type="number"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Comision total presupuesto">
                  <input style={styles.input} value={money(consolidatedCommissionAmount)} readOnly />
                </Field>
              </TwoCol>
              {budgetIncreases.length === 0 ? (
                <div style={styles.empty}>No hay aumentos cargados para esta actualizacion.</div>
              ) : (
                <table style={{ ...styles.table, marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th>Descripcion interna</th>
                      <th>% aumento</th>
                      <th>Resultado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetIncreases.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) =>
                              updateArrayItem(setBudgetIncreases, item.id, "description", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.pct}
                            onChange={(e) =>
                              updateArrayItem(setBudgetIncreases, item.id, "pct", Number(e.target.value))
                            }
                          />
                        </td>
                        <td>{money(preDiscountNetPrice * (Number(item.pct || 0) / 100))}</td>
                        <td>
                          <button style={styles.smallBtn} onClick={() => removeBudgetIncrease(item.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {budgetDiscounts.length === 0 ? (
                <div style={styles.empty}>No hay descuentos cargados.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Descripcion visible</th>
                      <th>Monto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetDiscounts.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) =>
                              updateArrayItem(
                                setBudgetDiscounts,
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <select
                              style={{ ...styles.input, maxWidth: 80 }}
                              value={item.mode || "monto"}
                              onChange={(e) =>
                                updateArrayItem(setBudgetDiscounts, item.id, "mode", e.target.value)
                              }
                            >
                              <option value="monto">$</option>
                              <option value="porcentaje">%</option>
                            </select>
                            {item.mode === "porcentaje" ? (
                              <input
                                style={styles.input}
                                type="number"
                                value={item.pct ?? 0}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "pct",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            ) : (
                              <AmountInput
                                style={styles.input}
                                value={item.amount}
                                onChange={(n) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "amount",
                                    n
                                  )
                                }
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => removeBudgetDiscount(item.id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={styles.metricGrid}>
                <MiniMetric label="Neto base bloque" value={money(preDiscountNetPrice)} />
                <MiniMetric label="Aumentos internos" value={money(totalIncreaseAmount)} />
                <MiniMetric label="Descuentos bloque" value={money(totalDiscountAmount)} />
                <MiniMetric label="Neto total" value={money(consolidatedBudgetTotals.netPrice)} />
                <MiniMetric label="Comision total" value={money(consolidatedCommissionAmount)} />
                <MiniMetric label="% blanco" value={pct(billedPctNormalized)} />
                <MiniMetric label="Circuito blanco" value={money(budgetWhiteTotal)} />
                <MiniMetric label="Circuito negro" value={money(budgetBlackTotal)} />
              </div>
            </Panel>

            <Panel title="Resumen economico">
              <div style={styles.previewBlock}>
                <strong>Bloque en edicion</strong>
                <SummaryRow label="Valor neto bloque" value={money(currentWorkingSectionTotals.netPrice)} />
                <SummaryRow label="Final bloque c/IVA" value={money(currentWorkingSectionTotals.finalPrice)} />
              </div>
              <SummaryRow label="Materiales" value={money(consolidatedBudgetTotals.totalMaterials)} />
              <SummaryRow label="Insumos y fletes" value={money(consolidatedBudgetTotals.totalBasicSupplies)} />
              <SummaryRow label="Mano de obra" value={money(consolidatedBudgetTotals.totalLabor)} />
              <SummaryRow label="Desvio mano de obra incl." value={money(consolidatedBudgetTotals.laborDeviationAmount)} />
              <SummaryRow label="Costos fijos imputados" value={money(consolidatedBudgetTotals.fixedCostsApplied)} />
              <SummaryRow label="Desvio" value={money(consolidatedBudgetTotals.deviationAmount)} />
              <SummaryRow label="Costo total" value={money(consolidatedBudgetTotals.totalCost)} strong />
              <SummaryRow label="Neto antes descuento" value={money(consolidatedBudgetTotals.preDiscountNetPrice)} />
              <SummaryRow label="Aumentos internos" value={money(consolidatedBudgetTotals.totalIncreaseAmount)} />
              <SummaryRow label="Descuentos" value={money(consolidatedBudgetTotals.totalDiscountAmount)} />
              <SummaryRow label="Valor neto" value={money(consolidatedBudgetTotals.netPrice)} strong />
              <SummaryRow label="% a facturar" value={pct(billedPctNormalized)} />
              <SummaryRow label="Administracion blanco" value={money(budgetWhiteTotal)} />
              <SummaryRow label="Administracion negro" value={money(budgetBlackTotal)} />
              <SummaryRow label="Comision pendiente" value={money(consolidatedCommissionAmount)} />
              <SummaryRow label="Final c/IVA" value={money(consolidatedBudgetTotals.finalPrice)} strong />
              <div style={styles.metricGrid}>
                <MiniMetric label="% ocupacion" value={pct(consolidatedBudgetTotals.occupancyPct)} />
                <MiniMetric label="Horas trabajo" value={String(Number(consolidatedBudgetTotals.totalJobHours.toFixed(2)))} />
                <MiniMetric label="Horas disponibles" value={String(Number(consolidatedBudgetTotals.totalAvailableHours.toFixed(2)))} />
                <MiniMetric label="Entrega" value={formatDateDisplay(budgetEstimatedDeliveryDate)} />
              </div>
            </Panel>

            <Panel title="Imagenes">
              <div style={styles.grid2}>
                <Field label="Logos">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(
                        files.map((file) => uploadBudgetImage(file, LOGO_IMAGE_OPTS))
                      );
                      setBudget((prev) => ({ ...prev, logos: [...prev.logos, ...images] }));
                    }}
                  />
                </Field>
                <Field label="Referencias">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(files.map((file) => uploadBudgetImage(file)));
                      setBudget((prev) => ({
                        ...prev,
                        referenceImages: [...prev.referenceImages, ...images],
                      }));
                    }}
                  />
                </Field>
              </div>
              {budget.referenceImages.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.referenceImages.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            referenceImages: prev.referenceImages.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {budget.logos.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.logos.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <div style={styles.muted}>
                        {index === 0 ? "Logo principal / marca de agua" : "Logo adicional"}
                      </div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            logos: prev.logos.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Vista previa"
              actions={<ButtonLike onClick={() => exportPrint("client-budget")}>Exportar PDF cliente</ButtonLike>}
            >
              <div style={styles.previewCard}>
                <div style={styles.previewHeader}>
                  <div>
                    {budget.logos.length > 0 && (
                      <div style={styles.previewLogoRow}>
                        {budget.logos.map((image, index) => (
                          <img
                            key={`${image.name}-${index}`}
                            src={image.preview}
                            alt={image.name}
                            style={styles.previewLogo}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ ...styles.companyRibbon, background: companyTheme.soft, color: companyTheme.primary }}>
                      {companyTheme.short}
                    </div>
                    {budget.isUpdate && (
                      <div style={{ ...styles.statusPill, ...styles.statusBlue, marginTop: 8 }}>
                        {budget.updateLabel || "Actualizacion"}
                      </div>
                    )}
                    <h2 style={{ margin: "8px 0 0 0" }}>{budget.project}</h2>
                    <div>{budget.client}</div>
                  </div>
                  <div style={styles.previewMeta}>
                    <div><strong>N°:</strong> {budget.number}</div>
                    <div><strong>Fecha:</strong> {formatDateDisplay(budget.date)}</div>
                    <div><strong>Entrega:</strong> {formatDateDisplay(budgetEstimatedDeliveryDate)}</div>
                  </div>
                </div>
                {workingBudgetSections.map((section, index) => (
                  <div key={section.id} style={styles.previewBlock}>
                    <strong>{section.title || `Subpresupuesto ${index + 1}`}</strong>
                    {section.notes && <div style={{ marginTop: 6, marginBottom: 8 }}>{section.notes}</div>}
                    <div style={{ ...styles.metricGrid, marginBottom: 10 }}>
                      <MiniMetric label="Materiales" value={money(section.totals.totalMaterials)} />
                      <MiniMetric label="Insumos" value={money(section.totals.totalBasicSupplies)} />
                      <MiniMetric label="Mano de obra" value={money(section.totals.totalLabor)} />
                      <MiniMetric label="Valor neto" value={money(section.totals.netPrice)} />
                    </div>
                    <div style={styles.materialColumns}>
                      {section.materials.length === 0 ? (
                        <div style={styles.muted}>Sin materiales cargados en este bloque.</div>
                      ) : (
                        section.materials.map((item) => (
                          <div key={item.id} style={styles.materialColumnItem}>
                            {item.description}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                {budget.referenceImages.length > 0 && (
                  <div style={styles.previewBlock}>
                    <strong>Referencias visuales</strong>
                    <div style={styles.referenceGrid}>
                      {budget.referenceImages.map((image, index) => (
                        <img
                          key={`${image.name}-${index}`}
                          src={image.preview}
                          alt={image.name}
                          style={styles.previewImage}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div style={styles.previewBlock}>
                  {consolidatedBudgetTotals.totalDiscountAmount > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <strong>Descuento aplicado:</strong> {money(consolidatedBudgetTotals.totalDiscountAmount)}
                    </div>
                  )}
                  <div style={{ marginBottom: 6 }}>
                    <strong>Valor neto total:</strong> {money(consolidatedBudgetTotals.netPrice)}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>% facturado / blanco:</strong> {pct(billedPctNormalized)}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Administracion blanco:</strong> {money(budgetWhiteTotal)}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Administracion negro:</strong> {money(budgetBlackTotal)}
                  </div>
                  <strong>Total final con IVA:</strong> {money(consolidatedBudgetTotals.finalPrice)}
                </div>
              </div>
            </Panel>
          </div>

          <div style={styles.budgetHistorySection}>
            {renderBudgetHistoryBlock()}
          </div>
        </div>
  );
}
