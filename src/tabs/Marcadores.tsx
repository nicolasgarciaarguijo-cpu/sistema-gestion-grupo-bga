import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, MiniMetric, ButtonLike } from "../ui/primitives";
import { money } from "../lib/format";
import { WORK_TYPE_OPTIONS } from "../domain/types";
import type {
  CompanyName,
  WorkTypeName,
  MarkerFixedGroup,
  SupplyMarkerSubtype,
  PersonalProvisionKind,
} from "../domain/types";

type MarcadoresTabProps = {
  markupPct: number;
  deviationPct: number;
  laborDeviationPct: number;
  vatPct: number;
  commissionPct: number;
  stockIncreasePct: number;
  manualAllocationPct: number;
  allocationMode: any;
  activeFixedMarkersForBudget: any[];
  activeSupplyMarkersForBudget: any[];
  activeLaborMarkersForBudget: any[];
  activePersonalProvisionMonthlyTotal: number;
  budget: any;
  fixedMarkersByGroup: any[];
  fixedMarkers: any[];
  supplyMarkers: any[];
  laborMarkers: any[];
  personalProvisionMarkers: any[];
  fixedMarkerGroupOptions: any[];
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  promptAndCreateCostAnalysisGroup: (company?: any) => any;
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  setMarkupPct: React.Dispatch<React.SetStateAction<number>>;
  setDeviationPct: React.Dispatch<React.SetStateAction<number>>;
  setLaborDeviationPct: React.Dispatch<React.SetStateAction<number>>;
  setVatPct: React.Dispatch<React.SetStateAction<number>>;
  setCommissionPct: React.Dispatch<React.SetStateAction<number>>;
  setStockIncreasePct: React.Dispatch<React.SetStateAction<number>>;
  setManualAllocationPct: React.Dispatch<React.SetStateAction<number>>;
  setAllocationMode: React.Dispatch<React.SetStateAction<any>>;
  setFixedMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  setSupplyMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  setLaborMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  setPersonalProvisionMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  applyMarkersToBudget: () => void;
  addFixedMarker: () => void;
  removeFixedMarker: (id: number) => void;
  addSupplyMarker: () => void;
  removeSupplyMarker: (id: number) => void;
  syncLaborMarkersFromPersonal: () => void;
  addLaborMarker: () => void;
  removeLaborMarker: (id: number) => void;
  restorePersonalProvisionMarkersFromStock: () => void;
  addPersonalProvisionMarker: () => void;
  removePersonalProvisionMarker: (id: number) => void;
};

export function MarcadoresTab({
  markupPct,
  deviationPct,
  laborDeviationPct,
  vatPct,
  commissionPct,
  stockIncreasePct,
  manualAllocationPct,
  allocationMode,
  activeFixedMarkersForBudget,
  activeSupplyMarkersForBudget,
  activeLaborMarkersForBudget,
  activePersonalProvisionMonthlyTotal,
  budget,
  fixedMarkersByGroup,
  fixedMarkers,
  supplyMarkers,
  laborMarkers,
  personalProvisionMarkers,
  fixedMarkerGroupOptions,
  COMPANY_OPTIONS,
  getCompanyMeta,
  promptAndCreateCostAnalysisGroup,
  updateArrayItem,
  setMarkupPct,
  setDeviationPct,
  setLaborDeviationPct,
  setVatPct,
  setCommissionPct,
  setStockIncreasePct,
  setManualAllocationPct,
  setAllocationMode,
  setFixedMarkers,
  setSupplyMarkers,
  setLaborMarkers,
  setPersonalProvisionMarkers,
  applyMarkersToBudget,
  addFixedMarker,
  removeFixedMarker,
  addSupplyMarker,
  removeSupplyMarker,
  syncLaborMarkersFromPersonal,
  addLaborMarker,
  removeLaborMarker,
  restorePersonalProvisionMarkersFromStock,
  addPersonalProvisionMarker,
  removePersonalProvisionMarker,
}: MarcadoresTabProps) {
  return (
        <div style={styles.column}>
          <Panel span="wide" title="Parametros economicos (fuente de verdad)">
            <div style={styles.noticeBox}>
              Estos valores se aplican a los presupuestos y se toman de aca al armar uno nuevo. Editalos
              una vez y quedan fijos para todos los presupuestos siguientes.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Field label="Markup / ganancia (%)">
                <input style={styles.input} type="number" value={markupPct}
                  onChange={(e) => setMarkupPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio de costos (%)">
                <input style={styles.input} type="number" value={deviationPct}
                  onChange={(e) => setDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio mano de obra (%)">
                <input style={styles.input} type="number" value={laborDeviationPct}
                  onChange={(e) => setLaborDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="IVA (%)">
                <input style={styles.input} type="number" value={vatPct}
                  onChange={(e) => setVatPct(Number(e.target.value))} />
              </Field>
              <Field label="Comision (%)">
                <input style={styles.input} type="number" value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))} />
              </Field>
              <Field label="Aumento de stock (%)">
                <input style={styles.input} type="number" value={stockIncreasePct}
                  onChange={(e) => setStockIncreasePct(Number(e.target.value))} />
              </Field>
              <Field label="Asignacion de costos fijos">
                <select style={styles.input} value={allocationMode}
                  onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}>
                  <option value="auto">Automatica</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              {allocationMode === "manual" && (
                <Field label="Asignacion manual (%)">
                  <input style={styles.input} type="number" value={manualAllocationPct}
                    onChange={(e) => setManualAllocationPct(Number(e.target.value))} />
                </Field>
              )}
            </div>
          </Panel>
          <Panel
            title="Marcadores base por empresa y tipo de trabajo"
            span="wide"
            actions={<ButtonLike onClick={applyMarkersToBudget}>Aplicar al presupuesto actual</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric
                label="Costos fijos activos"
                value={money(
                  activeFixedMarkersForBudget.reduce((acc, item) => acc + Number(item.amount || 0), 0)
                )}
              />
              <MiniMetric
                label="Insumos y fletes activos"
                value={money(
                  activeSupplyMarkersForBudget.reduce(
                    (acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0),
                    0
                  )
                )}
              />
              <MiniMetric
                label="Mano de obra base"
                value={money(
                  activeLaborMarkersForBudget.reduce(
                    (acc, item) => acc + Number(item.hoursBase || 0) * Number(item.hourlyRate || 0),
                    0
                  )
                )}
              />
              <MiniMetric label="Provision personal mensual" value={money(activePersonalProvisionMonthlyTotal)} />
              <MiniMetric label="Tipo de trabajo" value={budget.workType} />
              <MiniMetric
                label="Empresas activas"
                value={Array.from(new Set([...activeFixedMarkersForBudget, ...activeSupplyMarkersForBudget, ...activeLaborMarkersForBudget].map((item) => getCompanyMeta(item.company).short))).join(", ") || "-"}
              />
            </div>
          </Panel>

          <Panel title="Costos fijos por grupo" span="wide" actions={<ButtonLike onClick={addFixedMarker}>Agregar marcador</ButtonLike>}>
            <div style={styles.metricGrid}>
              {fixedMarkersByGroup.map((row) => (
                <MiniMetric key={row.group} label={row.group} value={money(row.total)} />
              ))}
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Tipo trabajo</th>
                  <th>Grupo</th>
                  <th>Concepto</th>
                  <th>Monto mensual</th>
                  <th>Observacion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fixedMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateArrayItem(setFixedMarkers, item.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                        {markerCompany.short}
                      </div>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.workType}
                        onChange={(e) =>
                          updateArrayItem(setFixedMarkers, item.id, "workType", e.target.value as WorkTypeName)
                        }
                      >
                        {WORK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.group}
                        onChange={(e) => {
                          if (e.target.value === "__add_group__") {
                            const createdGroup = promptAndCreateCostAnalysisGroup("General");
                            if (createdGroup) {
                              updateArrayItem(
                                setFixedMarkers,
                                item.id,
                                "group",
                                createdGroup.name as MarkerFixedGroup
                              );
                            }
                            return;
                          }
                          updateArrayItem(
                            setFixedMarkers,
                            item.id,
                            "group",
                            e.target.value as MarkerFixedGroup
                          );
                        }}
                      >
                        {fixedMarkerGroupOptions.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                        <option value="__add_group__">+ Agregar grupo...</option>
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.description}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "description", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "amount", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.notes}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "notes", e.target.value)}
                      />
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeFixedMarker(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </Panel>

          <Panel title="Insumos y fletes base" span="wide" actions={<ButtonLike onClick={addSupplyMarker}>Agregar marcador</ButtonLike>}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Tipo trabajo</th>
                  <th>Subtipo</th>
                  <th>Descripcion</th>
                  <th>Cant.</th>
                  <th>Unidad</th>
                  <th>$ Unit.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {supplyMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateArrayItem(setSupplyMarkers, item.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                        {markerCompany.short}
                      </div>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.workType}
                        onChange={(e) =>
                          updateArrayItem(setSupplyMarkers, item.id, "workType", e.target.value as WorkTypeName)
                        }
                      >
                        {WORK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.subtype}
                        onChange={(e) =>
                          updateArrayItem(
                            setSupplyMarkers,
                            item.id,
                            "subtype",
                            e.target.value as SupplyMarkerSubtype
                          )
                        }
                      >
                        {["Insumos basicos", "Flete", "Entrega", "Embalaje", "Viaticos"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.description}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "description", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "qty", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.unit}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "unit", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "unitPrice", Number(e.target.value))}
                      />
                    </td>
                    <td>{money(item.qty * item.unitPrice)}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeSupplyMarker(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            <div style={styles.rightStrong}>
              Total marcadores de insumos y fletes:{" "}
              {money(
                supplyMarkers
                  .filter((item) => item.active)
                  .reduce((acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0), 0)
              )}
            </div>
          </Panel>

          <Panel
            span="wide"
            title="Mano de obra base"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={syncLaborMarkersFromPersonal} secondary>
                  Tomar costo hora desde personal
                </ButtonLike>
                <ButtonLike onClick={addLaborMarker}>Agregar marcador</ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Tipo trabajo</th>
                  <th>Categoria</th>
                  <th>Empleados</th>
                  <th>Hs/mes c/u</th>
                  <th>$ Hora</th>
                  <th>Hs base</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {laborMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                        {markerCompany.short}
                      </div>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.workType}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "workType", e.target.value as WorkTypeName)
                        }
                      >
                        {WORK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.category}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "category", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.employees}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "employees", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.monthlyHoursPerEmployee}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "monthlyHoursPerEmployee", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.hourlyRate}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "hourlyRate", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.hoursBase}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "hoursBase", Number(e.target.value))}
                      />
                    </td>
                    <td>{money(item.hoursBase * item.hourlyRate)}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeLaborMarker(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            <div style={styles.rightStrong}>
              Total marcadores de mano de obra:{" "}
              {money(
                laborMarkers
                  .filter((item) => item.active)
                  .reduce((acc, item) => acc + Number(item.hoursBase || 0) * Number(item.hourlyRate || 0), 0)
              )}
            </div>
          </Panel>

          <Panel
            span="wide"
            title="Informacion de personal: EPP e insumos"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={restorePersonalProvisionMarkersFromStock} secondary>
                  Restaurar basicos desde stock
                </ButtonLike>
                <ButtonLike onClick={addPersonalProvisionMarker}>Agregar item</ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Compartido</th>
                  <th>Tipo</th>
                  <th>Descripcion</th>
                  <th>Costo por entrega</th>
                  <th>Periodicidad (meses)</th>
                  <th>Costo mensual</th>
                  <th>Observacion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {personalProvisionMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                    <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "active", e.target.checked)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "company", e.target.value as CompanyName)}
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.short}
                            </option>
                          ))}
                        </select>
                        <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                          {markerCompany.short}
                        </div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.shared}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "shared", e.target.checked)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.kind}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "kind", e.target.value as PersonalProvisionKind)}
                        >
                          <option value="EPP">EPP</option>
                          <option value="Insumos">Insumos</option>
                        </select>
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "description", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.amountPerDelivery}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "amountPerDelivery", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          min={1}
                          value={item.periodicityMonths}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "periodicityMonths", Number(e.target.value))}
                        />
                      </td>
                      <td>{money(Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1))}</td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.notes}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "notes", e.target.value)}
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removePersonalProvisionMarker(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={styles.rightStrong}>
              Total provision mensual de personal:{" "}
              {money(
                personalProvisionMarkers
                  .filter((item) => item.active)
                  .reduce(
                    (acc, item) =>
                      acc + Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1),
                    0
                  )
              )}
            </div>
          </Panel>
        </div>
  );
}
