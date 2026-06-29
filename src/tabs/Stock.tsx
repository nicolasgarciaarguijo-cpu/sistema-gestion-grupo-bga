import React from "react";
import { styles } from "../ui/styles";
import { Panel, SemaforoResumen, ButtonLike, MiniMetric, Field } from "../ui/primitives";
import { money, formatDateDisplay, todayIso } from "../lib/format";
import { PERSONAL_PROVISION_KINDS } from "../domain/types";
import type { CompanyName, PrintMode, ApprovedJob } from "../domain/types";

type StockTabProps = {
  stockSemaphoreSummary: any;
  approvedJobsSummary: any[];
  stockByDescription: Map<string, any>;
  fixedMarkerGroupOptions: any[];
  visibleStockItems: any[];
  stockIncreasePct: number;
  totalStockValue: number;
  costAnalysisGroups: any[];
  costAnalysisEntries: any[];
  remitoDrafts: any[];
  stockPersonalItems: any[];
  personalProvisionAlerts: any[];
  visibleCompanyAssets: any[];
  activeAssetsMonthlyDepreciation: number;
  stockNeedRows: any[];
  STOCK_GENERAL_GROUP_OPTIONS: readonly string[];
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  getCompanyScopeLabel: (company: any) => string;
  setStockIncreasePct: React.Dispatch<React.SetStateAction<number>>;
  setCompanyAssets: React.Dispatch<React.SetStateAction<any[]>>;
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  exportPrint: (mode: PrintMode) => void;
  updateApprovedJob: (jobId: number, field: keyof ApprovedJob, value: string | number) => void;
  applyStockIncrease: () => void;
  addStockItem: () => void;
  updateStockItem: (id: number, field: string, value: any) => void;
  removeStockItem: (id: number) => void;
  addCostAnalysisGroup: () => void;
  addCostAnalysisEntry: () => void;
  updateCostAnalysisGroup: (id: number, field: string, value: any) => void;
  removeCostAnalysisGroup: (id: number) => void;
  updateCostAnalysisEntry: (id: number, field: string, value: any) => void;
  removeCostAnalysisEntry: (id: number) => void;
  handleRemitoFiles: (files: FileList | null) => void | Promise<void>;
  updateRemitoDraft: (draftId: number, field: string, value: any) => void;
  updateRemitoDraftRow: (draftId: number, rowId: number, field: string, value: any) => void;
  removeRemitoDraftRow: (draftId: number, rowId: number) => void;
  addRemitoDraftRow: (draftId: number) => void;
  commitRemitoDraftToStock: (draftId: number) => void;
  removeRemitoDraft: (draftId: number) => void;
  addPersonalStockItem: (kind: string) => void;
  restorePersonalProvisionMarkersFromStock: () => void;
  addCompanyAsset: () => void;
  removeCompanyAsset: (id: number) => void;
};

export function StockTab({
  stockSemaphoreSummary,
  approvedJobsSummary,
  stockByDescription,
  fixedMarkerGroupOptions,
  visibleStockItems,
  stockIncreasePct,
  totalStockValue,
  costAnalysisGroups,
  costAnalysisEntries,
  remitoDrafts,
  stockPersonalItems,
  personalProvisionAlerts,
  visibleCompanyAssets,
  activeAssetsMonthlyDepreciation,
  stockNeedRows,
  STOCK_GENERAL_GROUP_OPTIONS,
  COMPANY_OPTIONS,
  getCompanyMeta,
  getCompanyScopeLabel,
  setStockIncreasePct,
  setCompanyAssets,
  updateArrayItem,
  exportPrint,
  updateApprovedJob,
  applyStockIncrease,
  addStockItem,
  updateStockItem,
  removeStockItem,
  addCostAnalysisGroup,
  addCostAnalysisEntry,
  updateCostAnalysisGroup,
  removeCostAnalysisGroup,
  updateCostAnalysisEntry,
  removeCostAnalysisEntry,
  handleRemitoFiles,
  updateRemitoDraft,
  updateRemitoDraftRow,
  removeRemitoDraftRow,
  addRemitoDraftRow,
  commitRemitoDraftToStock,
  removeRemitoDraft,
  addPersonalStockItem,
  restorePersonalProvisionMarkersFromStock,
  addCompanyAsset,
  removeCompanyAsset,
}: StockTabProps) {
  return (
        <div style={styles.column}>
          <Panel span="wide" title="Semaforo de stock">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Parciales", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
          <Panel title="Agenda de fabricacion" span="wide" actions={<ButtonLike onClick={() => exportPrint("report-stock")} secondary>Reporte</ButtonLike>}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Presupuesto</th>
                  <th>Cliente</th>
                  <th>Inicio fabricacion</th>
                  <th>Dias para comprar</th>
                  <th>Estado</th>
                  <th>Faltantes</th>
                </tr>
              </thead>
              <tbody>
                {approvedJobsSummary.map((job) => {
                  const companyMetaItem = getCompanyMeta(job.company);
                  const daysUntilStart = job.startDate
                    ? Math.ceil(
                        (new Date(job.startDate).getTime() - new Date(todayIso()).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;
                  const missingCount = job.snapshot.materials.filter((material) => {
                    const stockMatch = stockByDescription.get(material.description.trim().toLowerCase());
                    return Number(stockMatch?.quantity || 0) < Number(material.qty || 0);
                  }).length;
                  return (
                    <tr key={job.id} style={{ background: `${companyMetaItem.soft}66` }}>
                      <td>
                        <span style={{ ...styles.statusPill, background: companyMetaItem.soft, color: companyMetaItem.primary }}>
                          {companyMetaItem.short}
                        </span>
                      </td>
                      <td>{job.budgetNumber}</td>
                      <td>{job.client}</td>
                      <td>
                        <input
                          style={{ ...styles.input, minWidth: 140 }}
                          type="date"
                          value={job.startDate}
                          onChange={(e) => updateApprovedJob(job.id, "startDate", e.target.value)}
                        />
                      </td>
                      <td>
                        {daysUntilStart === null ? "-" : `${daysUntilStart} dias`}
                      </td>
                      <td>{job.executionStatus}</td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(missingCount === 0
                              ? styles.statusGreen
                              : missingCount <= 2
                              ? styles.statusYellow
                              : styles.statusRed),
                          }}
                        >
                          {missingCount === 0 ? "Completo" : `${missingCount} faltantes`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <datalist id="stock-general-group-options-stock-tab">
            {Array.from(
              new Set([
                ...STOCK_GENERAL_GROUP_OPTIONS,
                ...fixedMarkerGroupOptions,
                ...visibleStockItems
                  .filter((item) => item.kind === "general")
                  .map((item) => item.group.trim())
                  .filter(Boolean),
              ])
            ).map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>

          <Panel
            title="Inventario y alertas"
            span="wide"
            actions={
              <div style={styles.inlineActions}>
                <span style={styles.muted}>Aumento %</span>
                <input
                  style={{ ...styles.input, width: 120 }}
                  type="number"
                  value={stockIncreasePct}
                  onChange={(e) => setStockIncreasePct(Number(e.target.value))}
                />
                <ButtonLike onClick={applyStockIncrease} secondary>
                  Aplicar aumento %
                </ButtonLike>
                <ButtonLike onClick={addStockItem}>Agregar item</ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Alerta</th>
                  <th>Empresa</th>
                  <th>Grupo</th>
                  <th>Orden</th>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Ubicacion</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>$ Unit.</th>
                  <th>Valor stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleStockItems
                  .filter((item) => item.kind === "general")
                  .sort((a, b) => {
                    const groupCompare = (a.group || "").localeCompare(b.group || "");
                    if (groupCompare !== 0) return groupCompare;
                    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
                  })
                  .map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span
                        style={{
                          ...styles.statusPill,
                          ...(Number(item.quantity || 0) > 0 ? styles.statusGreen : styles.statusRed),
                        }}
                      >
                        {Number(item.quantity || 0) > 0 ? "Con stock" : "Sin stock"}
                      </span>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) => updateStockItem(item.id, "company", e.target.value)}
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        list="stock-general-group-options-stock-tab"
                        value={item.group}
                        onChange={(e) => updateStockItem(item.id, "group", e.target.value)}
                        placeholder="Grupo"
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.sortOrder}
                        onChange={(e) => updateStockItem(item.id, "sortOrder", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.code}
                        onChange={(e) => updateStockItem(item.id, "code", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.description}
                        onChange={(e) => updateStockItem(item.id, "description", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.location}
                        onChange={(e) => updateStockItem(item.id, "location", e.target.value)}
                        placeholder="Sector / estante / deposito"
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.unit}
                        onChange={(e) => updateStockItem(item.id, "unit", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateStockItem(item.id, "quantity", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateStockItem(item.id, "unitPrice", Number(e.target.value))}
                      />
                    </td>
                    <td>{money(item.quantity * item.unitPrice)}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeStockItem(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.metricGrid}>
              <MiniMetric label="Valor stock general" value={money(visibleStockItems.filter((item) => item.kind === "general" && item.active).reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))} />
              <MiniMetric label="Valor total stock" value={money(totalStockValue)} />
            </div>
          </Panel>

          <Panel
            title="Analisis de costos"
            span="wide"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={addCostAnalysisGroup} secondary>
                  Agregar grupo
                </ButtonLike>
                <ButtonLike onClick={addCostAnalysisEntry}>Agregar item de costo</ButtonLike>
              </div>
            }
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Grupos activos" value={String(costAnalysisGroups.filter((item) => item.active).length)} />
              <MiniMetric label="Items activos" value={String(costAnalysisEntries.filter((item) => item.active).length)} />
              <MiniMetric
                label="Costo analizado total"
                value={money(
                  costAnalysisEntries
                    .filter((item) => item.active)
                    .reduce(
                      (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitCost || 0),
                      0
                    )
                )}
              />
            </div>

            <div style={styles.sectionHeader}>Grupos y categorias</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Grupo / categoria</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costAnalysisGroups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={group.active}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "active", e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={group.company}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "company", e.target.value)
                        }
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={group.name}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "name", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={group.notes}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "notes", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        style={styles.smallBtn}
                        onClick={() => removeCostAnalysisGroup(group.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.sectionHeader}>Items del analisis</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Grupo</th>
                  <th>Descripcion</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>$ Unit.</th>
                  <th>Subtotal</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costAnalysisEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={entry.active}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "active", e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={entry.company}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "company", e.target.value)
                        }
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={entry.groupId}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "groupId", Number(e.target.value))
                        }
                      >
                        {costAnalysisGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} - {getCompanyScopeLabel(group.company)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.description}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "description", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.unit}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "unit", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.quantity}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "quantity", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.unitCost}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "unitCost", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>{money(Number(entry.quantity || 0) * Number(entry.unitCost || 0))}</td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.notes}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "notes", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        style={styles.smallBtn}
                        onClick={() => removeCostAnalysisEntry(entry.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.noticeBox}>
              Los grupos activos de este bloque alimentan automaticamente la solapa de
              marcadores y luego pueden restaurarse dentro del presupuesto.
            </div>
          </Panel>

          <Panel
            title="Remitos a cargar"
            span="wide"
            actions={
              <label style={styles.buttonLikeLabel}>
                Subir PDF / Excel / CSV
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.tsv,.txt"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    void handleRemitoFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            }
          >
            {remitoDrafts.length === 0 ? (
              <div style={styles.empty}>
                Todavia no hay remitos cargados para revisar. Primero subes el archivo, lo
                corriges aca y despues lo pasas al stock.
              </div>
            ) : (
              remitoDrafts.map((draft) => (
                <div key={draft.id} style={styles.nestedCard}>
                  <div style={styles.sectionHeader}>
                    {draft.fileName} - {draft.sourceType.toUpperCase()}
                  </div>
                  <div style={styles.grid2}>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={draft.company}
                        onChange={(e) =>
                          updateRemitoDraft(draft.id, "company", e.target.value)
                        }
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Notas de revision">
                      <input
                        style={styles.input}
                        value={draft.notes}
                        onChange={(e) =>
                          updateRemitoDraft(draft.id, "notes", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Descripcion</th>
                        <th>Grupo</th>
                        <th>Ubicacion</th>
                        <th>Unidad</th>
                        <th>Cantidad</th>
                        <th>$ Unit.</th>
                        <th>Relacionar con stock</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <select
                              style={styles.input}
                              value={row.company}
                              onChange={(e) =>
                                updateRemitoDraftRow(draft.id, row.id, "company", e.target.value)
                              }
                            >
                              <option value="General">General</option>
                              {COMPANY_OPTIONS.map((company) => (
                                <option key={company.value} value={company.value}>
                                  {company.short}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              value={row.description}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              list="stock-general-group-options-stock-tab"
                              value={row.group}
                              onChange={(e) =>
                                updateRemitoDraftRow(draft.id, row.id, "group", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              value={row.location}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "location",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              value={row.unit}
                              onChange={(e) =>
                                updateRemitoDraftRow(draft.id, row.id, "unit", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "quantity",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "unitPrice",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td>
                            <select
                              style={styles.input}
                              value={row.matchedStockId ?? ""}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "matchedStockId",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            >
                              <option value="">Nuevo item</option>
                              {visibleStockItems
                                .filter((item) => item.kind === "general")
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.description} - {item.group} - {item.location || "Sin ubicacion"}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td>
                            <button
                              style={styles.smallBtn}
                              onClick={() => removeRemitoDraftRow(draft.id, row.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={styles.inlineActions}>
                    <ButtonLike onClick={() => addRemitoDraftRow(draft.id)} secondary>
                      Agregar fila
                    </ButtonLike>
                    <ButtonLike onClick={() => commitRemitoDraftToStock(draft.id)}>
                      Cargar a stock
                    </ButtonLike>
                    <ButtonLike onClick={() => removeRemitoDraft(draft.id)} secondary>
                      Descartar borrador
                    </ButtonLike>
                  </div>
                </div>
              ))
            )}
          </Panel>

          <Panel
            title="EPP, insumos, examenes y capacitaciones"
            actions={
              <div style={styles.inlineActions}>
                {PERSONAL_PROVISION_KINDS.map((k) => (
                  <ButtonLike key={k} onClick={() => addPersonalStockItem(k)} secondary>
                    Agregar {k}
                  </ButtonLike>
                ))}
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Compartido</th>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Ubicacion</th>
                  <th>Cantidad</th>
                  <th>$ por entrega</th>
                  <th>Valor stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stockPersonalItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateStockItem(item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.kind}
                        onChange={(e) => updateStockItem(item.id, "kind", e.target.value)}
                      >
                        {PERSONAL_PROVISION_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) => updateStockItem(item.id, "company", e.target.value)}
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.shared}
                        onChange={(e) => updateStockItem(item.id, "shared", e.target.checked)}
                      />
                    </td>
                    <td>
                      <input style={styles.input} value={item.code} onChange={(e) => updateStockItem(item.id, "code", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} value={item.description} onChange={(e) => updateStockItem(item.id, "description", e.target.value)} />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.location}
                        onChange={(e) => updateStockItem(item.id, "location", e.target.value)}
                        placeholder="Sector / estante / deposito"
                      />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.quantity} onChange={(e) => updateStockItem(item.id, "quantity", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.unitPrice} onChange={(e) => updateStockItem(item.id, "unitPrice", Number(e.target.value))} />
                    </td>
                    <td>{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeStockItem(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.inlineActions}>
              <ButtonLike onClick={restorePersonalProvisionMarkersFromStock} secondary>
                Llevar a marcadores
              </ButtonLike>
            </div>
            <div style={styles.rightStrong}>
              Valor total EPP e insumos: {money(stockPersonalItems.filter((item) => item.active).reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))}
            </div>
          </Panel>

          <Panel title="Alertas de vigencia de EPP e insumos">
            {personalProvisionAlerts.length === 0 ? (
              <div style={styles.empty}>No hay vencimientos proximos cargados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Empresa</th>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Vence</th>
                    <th>Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {personalProvisionAlerts.map((item) => (
                    <tr key={`${item.employeeName}-${item.kind}-${item.dueDate}`}>
                      <td>
                        <span style={{ ...styles.statusPill, ...(item.state === "vencido" ? styles.statusRed : styles.statusYellow) }}>
                          {item.state === "vencido" ? "Vencido" : "Vence pronto"}
                        </span>
                      </td>
                      <td>{getCompanyMeta(item.company).short}</td>
                      <td>{item.employeeName}</td>
                      <td>{item.kind}</td>
                      <td>{formatDateDisplay(item.dueDate)}</td>
                      <td>{item.daysLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title="Activos y amortizacion"
            actions={<ButtonLike onClick={addCompanyAsset}>Agregar activo</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Activos activos" value={String(visibleCompanyAssets.filter((item) => item.active).length)} />
              <MiniMetric label="Valor de activos" value={money(visibleCompanyAssets.filter((item) => item.active).reduce((acc, item) => acc + Number(item.value || 0), 0))} />
              <MiniMetric label="Amortizacion mensual" value={money(activeAssetsMonthlyDepreciation)} />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Categoria</th>
                  <th>Descripcion</th>
                  <th>Valor</th>
                  <th>Vida util (meses)</th>
                  <th>Amortizacion</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanyAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={asset.active}
                        onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={asset.company}
                        onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input style={styles.input} value={asset.category} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "category", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} value={asset.description} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "description", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={asset.value} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "value", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={asset.usefulLifeMonths} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "usefulLifeMonths", Number(e.target.value))} />
                    </td>
                    <td>{money(Number(asset.value || 0) / Math.max(Number(asset.usefulLifeMonths || 1), 1))}</td>
                    <td>
                      <input style={styles.input} value={asset.notes} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "notes", e.target.value)} />
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeCompanyAsset(asset.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Detalle de faltantes sugeridos">
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos abiertos.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Material</th>
                    <th>Empresas</th>
                    <th>Trabajos</th>
                    <th>Requerido</th>
                    <th>Stock</th>
                    <th>Faltante</th>
                    <th>Costo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockNeedRows.map((row) => (
                    <tr key={row.description}>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(row.missing === 0
                              ? styles.statusGreen
                              : row.available > 0
                              ? styles.statusYellow
                              : styles.statusRed),
                          }}
                        >
                          {row.missing === 0 ? "Completo" : row.available > 0 ? "Parcial" : "Comprar"}
                        </span>
                      </td>
                      <td>{row.description}</td>
                      <td>{row.companyLabels.join(", ")}</td>
                      <td>{row.jobs.join(", ")}</td>
                      <td>{row.required} {row.unit}</td>
                      <td>{row.available} {row.unit}</td>
                      <td>{row.missing} {row.unit}</td>
                      <td>{money(row.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
  );
}
