import React from "react";
import { styles } from "../ui/styles";
import { Panel, SemaforoResumen, ButtonLike, MiniMetric, Field, AmountInput, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija, useCeldaMarcada,
} from "../ui/planilla";
import { money, formatDateDisplay, todayIso } from "../lib/format";
import { PERSONAL_PROVISION_KINDS } from "../domain/types";
import { matchStockForMaterial } from "../domain/stockMatch";
import type { CompanyName, PrintMode, ApprovedJob } from "../domain/types";

type StockTabProps = {
  stockSemaphoreSummary: any;
  approvedJobsSummary: any[];
  stockByCode: Map<string, any>;
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
  registerStockMovement: (
    itemId: number,
    type: "entrada" | "salida",
    quantity: number,
    note: string
  ) => void;
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
  stockByCode,
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
  registerStockMovement,
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
  const [movItemId, setMovItemId] = React.useState<number | "">("");
  const [movType, setMovType] = React.useState<"entrada" | "salida">("entrada");
  const [movQty, setMovQty] = React.useState(0);
  const [movNote, setMovNote] = React.useState("");
  // Filtro del inventario: texto libre (matchea descripción/código/grupo/ubicación/unidad) + grupo.
  const [stockSearch, setStockSearch] = React.useState("");
  const [stockGroupFilter, setStockGroupFilter] = React.useState("");
  const generalStock = visibleStockItems.filter((item) => item.kind === "general");

  // Grupos existentes (para el desplegable del filtro), ordenados.
  const generalStockGroups = Array.from(
    new Set(generalStock.map((item) => (item.group || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const normalizeStock = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  const stockSearchNorm = normalizeStock(stockSearch);
  const matchesStockFilter = (item: (typeof generalStock)[number]) => {
    if (stockGroupFilter && (item.group || "").trim() !== stockGroupFilter) return false;
    if (!stockSearchNorm) return true;
    const haystack = normalizeStock(
      [item.description, item.code, item.group, item.location, item.unit].join(" ")
    );
    // cada palabra tipeada tiene que aparecer (búsqueda "por lo que sea", en cualquier orden)
    return stockSearchNorm.split(/\s+/).every((token) => haystack.includes(token));
  };
  // ---- PLANILLA del inventario (estetica del Calendario anual) --------------------------------
  const anchosStock = usePlanillaWidths("stock.inventario", { label: 300, col: 96, colCompact: 74 });
  const marcaStock = useCeldaMarcada();
  const anchosMovs = usePlanillaWidths("stock.movimientos", { label: 300, col: 110, colCompact: 84 });
  const anchosFaltantes = usePlanillaWidths("stock.faltantes", { label: 280, col: 104, colCompact: 80 });
  const anchosVigencia = usePlanillaWidths("stock.vigencia", { label: 240, col: 110, colCompact: 84 });
  const [menuStock, setMenuStock] = React.useState<null | { x: number; y: number; id: number }>(null);

  const filteredGeneralStock = generalStock
    .filter(matchesStockFilter)
    .sort((a, b) => {
      const groupCompare = (a.group || "").localeCompare(b.group || "");
      if (groupCompare !== 0) return groupCompare;
      return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    });
  const recentMovements = generalStock
    .flatMap((item) =>
      (item.movements || []).map((m: any) => ({ ...m, itemDescription: item.description }))
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 25);
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
          <Panel title="Agenda de fabricacion" span="full" actions={<ButtonLike onClick={() => exportPrint("report-stock")} secondary>Reporte</ButtonLike>}>
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
                    const stockMatch = matchStockForMaterial(material, stockByCode, stockByDescription);
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
            title="Inventario y alertas" span="full"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={anchosStock.toggleCompacto} secondary>
                  {anchosStock.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
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
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <input
                style={{ ...styles.input, minWidth: 240, flex: 1 }}
                placeholder="🔎 Buscar material (descripción, código, grupo, ubicación...)"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
              />
              <select
                style={{ ...styles.input, maxWidth: 220 }}
                value={stockGroupFilter}
                onChange={(e) => setStockGroupFilter(e.target.value)}
              >
                <option value="">Todos los grupos</option>
                {generalStockGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              {(stockSearch || stockGroupFilter) && (
                <ButtonLike
                  secondary
                  onClick={() => {
                    setStockSearch("");
                    setStockGroupFilter("");
                  }}
                >
                  Limpiar
                </ButtonLike>
              )}
              <span style={{ ...styles.muted, whiteSpace: "nowrap" }}>
                {filteredGeneralStock.length} de {generalStock.length}
              </span>
            </div>
            <div style={{ ...planillaWrap, ...anchosStock.vars }}>
            <table style={planillaTable}>
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
                    Descripcion
                      <PlanillaManija
                        onMouseDown={(ev) => anchosStock.startResize(ev, "label")}
                        onDoubleClick={anchosStock.resetLabel}
                      />
                  </th>
                  <th style={thColumna}>Codigo</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Cantidad
                      <PlanillaManija
                        onMouseDown={(ev) => anchosStock.startResize(ev, "col")}
                        onDoubleClick={anchosStock.resetCol}
                      />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>$ Unit.</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Valor stock</th>
                  <th style={thFlexible}>Grupo · ubicacion · empresa</th>
                </tr>
              </thead>
              <tbody>
                {filteredGeneralStock.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...styles.muted, textAlign: "center", padding: 12 }}>
                      No hay materiales que coincidan con el filtro.
                    </td>
                  </tr>
                )}
                {filteredGeneralStock.map((item) => (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      marcaStock.marcar(String(item.id));
                      setMenuStock({ x: ev.clientX, y: ev.clientY, id: item.id });
                    }}
                  >
                    <td
                      title={item.description}
                      style={{ ...tdNombre, ...marcaStock.estilo(String(item.id)), fontWeight: 400 }}
                    >
                      <span
                        title={Number(item.quantity || 0) > 0 ? "Con stock" : "Sin stock"}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                          background: Number(item.quantity || 0) > 0 ? "#16a34a" : "#dc2626",
                        }}
                      />
                      {item.description || "(sin descripcion)"}
                    </td>
                    <td style={{ ...tdDato, color: "#64748b" }} title={item.code}>{item.code || "—"}</td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 600, color: Number(item.quantity || 0) > 0 ? "#0f172a" : "#dc2626" }}>
                      {Number(item.quantity || 0)} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{item.unit}</span>
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>{money(item.unitPrice)}</td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                      {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b" }}>
                      <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                        <span title="Grupo">{item.group || "—"}</span>
                        <span title="Ubicacion">{item.location || "—"}</span>
                        <span title="Empresa">{item.company}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {menuStock && (() => {
              const it = generalStock.find((x: any) => x.id === menuStock.id);
              const cerrar = () => {
                setMenuStock(null);
                marcaStock.marcar(null);
              };
              if (!it) return null;
              const pedir = (titulo: string, campo: string, actual: any, numero = false) => () => {
                const v = window.prompt(titulo, String(actual ?? ""));
                if (v === null) return cerrar();
                if (numero) {
                  const n = Number(v.replace(",", "."));
                  if (Number.isFinite(n)) updateStockItem(it.id, campo as any, n);
                } else {
                  updateStockItem(it.id, campo as any, v.trim());
                }
                cerrar();
              };
              return (
                <QuickMenu x={menuStock.x} y={menuStock.y} onClose={cerrar}>
                  <QuickMenuTitle>
                    {it.description || "item"} · {Number(it.quantity || 0)} {it.unit}
                  </QuickMenuTitle>
                  <button style={quickMenuItem} onClick={pedir("Cantidad:", "quantity", it.quantity, true)}>
                    Editar cantidad…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Precio unitario:", "unitPrice", it.unitPrice, true)}>
                    Editar precio unitario…
                  </button>
                  <QuickMenuSep />
                  <button style={quickMenuItem} onClick={pedir("Descripcion:", "description", it.description)}>
                    Editar descripcion…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Codigo:", "code", it.code)}>
                    Editar codigo…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Unidad:", "unit", it.unit)}>
                    Editar unidad…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Grupo:", "group", it.group)}>
                    Editar grupo…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Ubicacion:", "location", it.location)}>
                    Editar ubicacion…
                  </button>
                  <QuickMenuSep />
                  <button
                    style={{ ...quickMenuItem, color: "#b91c1c" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar "${it.description}" del inventario?`)) {
                        removeStockItem(it.id);
                      }
                      cerrar();
                    }}
                  >
                    Quitar del inventario
                  </button>
                </QuickMenu>
              );
            })()}
            <div style={styles.metricGrid}>
              <MiniMetric label="Valor stock general" value={money(visibleStockItems.filter((item) => item.kind === "general" && item.active).reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))} />
              <MiniMetric label="Valor total stock" value={money(totalStockValue)} />
            </div>
          </Panel>

          <Panel
            title="Analisis de costos" span="full"
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
                      <AmountInput
                        style={styles.input}
                        value={entry.unitCost}
                        onChange={(n) =>
                          updateCostAnalysisEntry(entry.id, "unitCost", n)
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
            title="Remitos a cargar" span="full"
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
                            <AmountInput
                              style={styles.input}
                              value={row.unitPrice}
                              onChange={(n) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "unitPrice",
                                  n
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
            title="Movimientos de stock"
            span="full"
            actions={
              <ButtonLike onClick={anchosMovs.toggleCompacto} secondary>
                {anchosMovs.esCompacto ? "Ancho normal" : "Compacto"}
              </ButtonLike>
            }
          >
            <div style={styles.inlineForm}>
              <Field label="Item">
                <select
                  style={styles.input}
                  value={movItemId}
                  onChange={(e) => setMovItemId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Elegir item...</option>
                  {generalStock.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.description} {item.code ? `(${item.code})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo">
                <select
                  style={styles.input}
                  value={movType}
                  onChange={(e) => setMovType(e.target.value as "entrada" | "salida")}
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </Field>
              <Field label="Cantidad">
                <input
                  style={styles.input}
                  type="number"
                  value={movQty}
                  onChange={(e) => setMovQty(Number(e.target.value))}
                />
              </Field>
              <Field label="Nota">
                <input style={styles.input} value={movNote} onChange={(e) => setMovNote(e.target.value)} />
              </Field>
              <div style={styles.inlineActions}>
                <ButtonLike
                  onClick={() => {
                    if (movItemId === "") return;
                    registerStockMovement(movItemId, movType, movQty, movNote);
                    setMovQty(0);
                    setMovNote("");
                  }}
                >
                  Registrar movimiento
                </ButtonLike>
              </div>
            </div>
            {recentMovements.length === 0 ? (
              <div style={styles.empty}>Todavia no hay movimientos registrados.</div>
            ) : (
              <table style={planillaTable}>
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
                      Item
                        <PlanillaManija
                          onMouseDown={(ev) => anchosMovs.startResize(ev, "label")}
                          onDoubleClick={anchosMovs.resetLabel}
                        />
                    </th>
                    <th style={thColumna}>Fecha</th>
                    <th style={thColumna}>Tipo</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Cantidad
                        <PlanillaManija
                          onMouseDown={(ev) => anchosMovs.startResize(ev, "col")}
                          onDoubleClick={anchosMovs.resetCol}
                        />
                    </th>
                    <th style={thFlexible}>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={m.itemDescription}>
                        {m.itemDescription}
                      </td>
                      <td style={{ ...tdDato, color: "#64748b" }}>{formatDateDisplay(m.date)}</td>
                      <td style={tdDato}>
                        <span style={{ color: m.type === "entrada" ? "#166534" : "#b45309", fontWeight: 700 }}>
                          {m.type === "entrada" ? "↑ entrada" : "↓ salida"}
                        </span>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{m.quantity}</td>
                      <td style={{ ...tdFlexible, color: "#64748b" }} title={m.note}>{m.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel span="full"
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
                      <AmountInput style={styles.input}value={item.unitPrice} onChange={(n) => updateStockItem(item.id, "unitPrice", n)} />
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

          <Panel span="full" title="Alertas de vigencia de EPP e insumos">
            {personalProvisionAlerts.length === 0 ? (
              <div style={styles.empty}>No hay vencimientos proximos cargados.</div>
            ) : (
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
                      Empleado
                      <PlanillaManija
                        onMouseDown={(ev) => anchosVigencia.startResize(ev, "label")}
                        onDoubleClick={anchosVigencia.resetLabel}
                      />
                    </th>
                    <th style={thColumna}>
                      Vence
                      <PlanillaManija
                        onMouseDown={(ev) => anchosVigencia.startResize(ev, "col")}
                        onDoubleClick={anchosVigencia.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Días</th>
                    <th style={thFlexible}>Tipo · empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {personalProvisionAlerts.map((item) => (
                    <tr key={`${item.employeeName}-${item.kind}-${item.dueDate}`}>
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={item.employeeName}>
                        <span
                          title={item.state === "vencido" ? "Vencido" : "Vence pronto"}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                            background: item.state === "vencido" ? "#dc2626" : "#ca8a04",
                          }}
                        />
                        {item.employeeName}
                      </td>
                      <td style={{ ...tdDato, color: item.state === "vencido" ? "#dc2626" : "#475569", fontWeight: 600 }}>
                        {formatDateDisplay(item.dueDate)}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: item.state === "vencido" ? "#dc2626" : "#ca8a04" }}>
                        {item.daysLeft}
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        {item.kind} <span style={{ color: "#94a3b8" }}>· {getCompanyMeta(item.company).short}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel span="full"
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
                      <AmountInput style={styles.input}value={asset.value} onChange={(n) => updateArrayItem(setCompanyAssets, asset.id, "value", n)} />
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

          <Panel span="full" title="Detalle de faltantes sugeridos">
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos abiertos.</div>
            ) : (
              <table style={planillaTable}>
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
                      Material
                      <PlanillaManija
                        onMouseDown={(ev) => anchosFaltantes.startResize(ev, "label")}
                        onDoubleClick={anchosFaltantes.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Requerido
                      <PlanillaManija
                        onMouseDown={(ev) => anchosFaltantes.startResize(ev, "col")}
                        onDoubleClick={anchosFaltantes.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Stock</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Faltante</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Costo estimado</th>
                    <th style={thFlexible}>Trabajos · empresas</th>
                  </tr>
                </thead>
                <tbody>
                  {stockNeedRows.map((row) => {
                    const estado =
                      row.missing === 0 ? "#16a34a" : row.available > 0 ? "#ca8a04" : "#dc2626";
                    return (
                    <tr key={row.description}>
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={row.description}>
                        <span
                          title={row.missing === 0 ? "Completo" : row.available > 0 ? "Parcial" : "Hay que comprar"}
                          style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7, background: estado }}
                        />
                        {row.description}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right" }}>
                        {row.required} <span style={{ color: "#94a3b8" }}>{row.unit}</span>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>
                        {row.available} <span style={{ color: "#94a3b8" }}>{row.unit}</span>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: estado }}>
                        {row.missing} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{row.unit}</span>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 600 }}>{money(row.estimatedCost)}</td>
                      <td style={{ ...tdFlexible, color: "#64748b" }} title={`${row.jobs.join(", ")} · ${row.companyLabels.join(", ")}`}>
                        {row.jobs.join(", ")} <span style={{ color: "#94a3b8" }}>· {row.companyLabels.join(", ")}</span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
  );
}
