import React from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike, Field, MiniMetric, SummaryRow, TwoCol } from "../ui/primitives";
import { money, pct, formatDateDisplay } from "../lib/format";
import { resolveAdvancePct } from "../domain/budgetTerms";
import { findClientByName } from "../domain/clients";
import { matchStockForMaterial } from "../domain/stockMatch";
import { WORK_TYPE_OPTIONS } from "../domain/types";
import type { CompanyName, WorkTypeName } from "../domain/types";

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
  restoreAllBudgetBlocksFromMarkers: any;
  restoreBasicSuppliesFromMarkers: any;
  restoreFixedCostsFromMarkers: any;
  restoreLaborFromMarkers: any;
  exportPrint: any;
  uploadBudgetImage: any;
};

export function PresupuestoTab(props: PresupuestoTabProps) {
  const {
    budget, crmClients, materials, labor, fixedCosts, basicSupplies, budgetDiscounts,
    budgetIncreases, subBudgets, subBudgetTitle, subBudgetNotes, markupPct,
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
    saveCurrentAsSubBudget, restoreAllBudgetBlocksFromMarkers,
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
                  <input
                    style={styles.input}
                    list="crm-client-options"
                    value={budget.client}
                    onChange={(e) => {
                      const name = e.target.value;
                      const match = findClientByName(crmClients, name);
                      if (match) {
                        // Autocompletado: al elegir un cliente existente, se traen sus datos y se fija el clientId.
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
                  <datalist id="crm-client-options">
                    {crmClients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
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

            <Panel title="CRM del cliente">
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
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Presupuesto</th>
                        <th>Fecha</th>
                        <th>Proyecto</th>
                        <th>Estado</th>
                        <th>Compra</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClientHistory.slice(0, 5).map((item) => {
                        const wasBought = approvedJobs.some(
                          (job) => job.rootBudgetId === item.rootBudgetId || job.budgetId === item.id
                        );
                        return (
                          <tr key={item.id}>
                            <td>{getSavedBudgetDisplayLabel(item)}</td>
                            <td>{formatDateDisplay(item.date)}</td>
                            <td>{item.project}</td>
                            <td>{item.status}</td>
                            <td>{wasBought ? "Compro" : "No compro"}</td>
                            <td>
                              <button
                                style={styles.smallBtn}
                                onClick={() => loadBudgetFromSnapshot(item.snapshot, item.id)}
                              >
                                Cargar para editar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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

            <Panel
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
                              <input
                                style={styles.input}
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "amount",
                                    Number(e.target.value)
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
            </>)}
          </div>

          <div style={styles.budgetMainBottom}>
            <Panel title="Materiales" actions={<ButtonLike onClick={addMaterial}>Agregar</ButtonLike>}>
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
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Descripcion</th>
                    <th>Grupo</th>
                    <th>Stock</th>
                    <th>Ubicacion</th>
                    <th>Cant.</th>
                    <th>Unidad</th>
                    <th>$ Unit.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMaterials.map((item) => {
                    const stockMatch = matchStockForMaterial(item, stockByCode, stockByDescription);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={styles.inlineActions}>
                            <button style={styles.smallBtn} onClick={() => moveMaterial(item.id, -1)}>
                              ↑
                            </button>
                            <button style={styles.smallBtn} onClick={() => moveMaterial(item.id, 1)}>
                              ↓
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            list="materials-stock-options"
                            value={item.description}
                            onChange={(e) => applyStockSuggestionToMaterial(item.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            list="stock-general-group-options"
                            value={item.stockGroup || stockMatch?.group || ""}
                            onChange={(e) =>
                              updateArrayItem(setMaterials, item.id, "stockGroup", e.target.value)
                            }
                            placeholder="Grupo"
                          />
                        </td>
                        <td>{stockMatch ? `${stockMatch.quantity} ${stockMatch.unit}` : "-"}</td>
                        <td>{stockMatch?.location || item.stockLocation || "-"}</td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateArrayItem(setMaterials, item.id, "qty", Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            value={item.unit}
                            onChange={(e) => updateArrayItem(setMaterials, item.id, "unit", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateArrayItem(setMaterials, item.id, "unitPrice", Number(e.target.value))}
                          />
                        </td>
                        <td>{money(item.qty * item.unitPrice)}</td>
                        <td>
                          <div style={styles.inlineActions}>
                            {!stockMatch && item.description.trim() && (
                              <button
                                style={styles.smallBtn}
                                onClick={() => addMaterialToStock(item.id)}
                              >
                                Agregar a stock
                              </button>
                            )}
                            <button style={styles.smallBtn} onClick={() => removeMaterial(item.id)}>
                              Quitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={styles.rightStrong}>Total materiales: {money(totalMaterials)}</div>
            </Panel>

            <Panel
              title="Insumos y fletes"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreBasicSuppliesFromMarkers} secondary>Restaurar</ButtonLike>
                </div>
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Descripcion</th>
                    <th>Cant.</th>
                    <th>Unidad</th>
                    <th>$ Unit.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {basicSupplies.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.sourceCompany ? (
                          <span style={{ ...styles.companyRibbonMini, background: getCompanyMeta(item.sourceCompany).soft, color: getCompanyMeta(item.sourceCompany).primary }}>
                            {getCompanyMeta(item.sourceCompany).short}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.description}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "description", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "qty", Number(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.unit}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "unit", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "unitPrice", Number(e.target.value))
                          }
                        />
                      </td>
                      <td>{money(item.qty * item.unitPrice)}</td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeBasicSupply(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={styles.rightStrong}>Total insumos y fletes: {money(totalBasicSupplies)}</div>
            </Panel>

            <Panel
              title="Mano de obra"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreLaborFromMarkers} secondary>Restaurar</ButtonLike>
                </div>
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Categoria</th>
                    <th>Empleados</th>
                    <th>Hs base c/u</th>
                    <th>Hs capacidad</th>
                    <th>$ Hora base</th>
                    <th>Desvio %</th>
                    <th>$ Hora final</th>
                    <th>Hs trabajo</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {laborRows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.sourceCompany ? (
                          <span style={{ ...styles.companyRibbonMini, background: getCompanyMeta(item.sourceCompany).soft, color: getCompanyMeta(item.sourceCompany).primary }}>
                            {getCompanyMeta(item.sourceCompany).short}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.category}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "category", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.employees}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "employees", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={nominalLaborHoursPerEmployee}
                          readOnly
                        />
                      </td>
                      <td>{Number(item.totalMonthlyHours.toFixed(2))}</td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.hourlyRate}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "hourlyRate", Number(e.target.value))}
                        />
                      </td>
                      <td>{pct(laborDeviationPct)}</td>
                      <td>{money(item.adjustedHourlyRate)}</td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.jobHours}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "jobHours", Number(e.target.value))}
                        />
                      </td>
                      <td>{money(item.subtotal)}</td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeLabor(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={styles.metricGrid}>
                <MiniMetric label="Horas disponibles" value={String(Number(totalAvailableHours.toFixed(2)))} />
                <MiniMetric label="Horas trabajo" value={String(Number(totalJobHours.toFixed(2)))} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Total mano de obra" value={money(totalLabor)} />
              </div>
            </Panel>

            <Panel title="Personal de referencia para presupuestar">
              {employeesSortedByPay.length === 0 ? (
                <div style={styles.empty}>Todavia no hay empleados cargados.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Nombre</th>
                      <th>Categoria</th>
                      <th>Antig.</th>
                      <th>Costo hora</th>
                      <th>Impacto empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesSortedByPay.map((employee) => {
                      const meta = getCompanyMeta(employee.company);
                      const summary = getEmployeePayrollSummary(employee);
                      return (
                        <tr key={`budget-employee-${employee.id}`} style={{ background: `${meta.soft}44` }}>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                background: meta.soft,
                                color: meta.primary,
                              }}
                            >
                              {meta.short}
                            </span>
                          </td>
                          <td>{employee.name}</td>
                          <td>{employee.category}</td>
                          <td>{employee.seniorityYears}</td>
                          <td>{money(summary.hourlyCost)}</td>
                          <td>{money(summary.employerImpact)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              title="Costos fijos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreFixedCostsFromMarkers} secondary>Restaurar</ButtonLike>
                </div>
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Descripcion</th>
                    <th>Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fixedCosts.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.sourceCompany ? (
                          <span style={{ ...styles.companyRibbonMini, background: getCompanyMeta(item.sourceCompany).soft, color: getCompanyMeta(item.sourceCompany).primary }}>
                            {getCompanyMeta(item.sourceCompany).short}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setFixedCosts, item.id, "description", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateArrayItem(setFixedCosts, item.id, "amount", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeFixedCost(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <Field label="Notas del bloque">
                <textarea
                  style={styles.textarea}
                  value={subBudgetNotes}
                  onChange={(e) => setSubBudgetNotes(e.target.value)}
                  placeholder="Observaciones internas o alcance de este bloque"
                />
              </Field>

              <div style={styles.metricGrid}>
                <MiniMetric label="Subpresupuestos guardados" value={String(subBudgets.length)} />
                <MiniMetric
                  label="Bloques totales"
                  value={String(workingBudgetSections.length)}
                />
                <MiniMetric
                  label="Neto bloque actual"
                  value={money(currentWorkingSectionTotals.netPrice)}
                />
                <MiniMetric
                  label="Neto presupuesto total"
                  value={money(consolidatedBudgetTotals.netPrice)}
                />
              </div>

              {subBudgets.length === 0 ? (
                <div style={styles.empty}>
                  Todavia no guardaste subpresupuestos parciales. Cuando cierres un bloque,
                  guárdalo y luego sigue cargando el siguiente.
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {subBudgets.map((item, index) => (
                    <div key={item.id} style={styles.subCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <strong>{item.title || `Subpresupuesto ${index + 1}`}</strong>
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
                        <MiniMetric label="Materiales" value={money(item.totals.totalMaterials)} />
                        <MiniMetric
                          label="Insumos y fletes"
                          value={money(item.totals.totalBasicSupplies)}
                        />
                        <MiniMetric label="Mano de obra" value={money(item.totals.totalLabor)} />
                        <MiniMetric label="Valor neto" value={money(item.totals.netPrice)} />
                      </div>
                    </div>
                  ))}
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

            <Panel
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
                              <input
                                style={styles.input}
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "amount",
                                    Number(e.target.value)
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
