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
  const anchosAgenda = usePlanillaWidths("stock.agenda", { label: 260, col: 122, colCompact: 92 });
  const anchosCostos = usePlanillaWidths("stock.costos", { label: 280, col: 108, colCompact: 82 });
  const marcaCostos = useCeldaMarcada();
  const [menuCostos, setMenuCostos] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosEpp = usePlanillaWidths("stock.epp", { label: 280, col: 108, colCompact: 82 });
  const anchosGrupos = usePlanillaWidths("stock.costos.grupos", { label: 280, col: 120, colCompact: 90 });
  const marcaGrupos = useCeldaMarcada();
  const [menuGrupos, setMenuGrupos] = React.useState<null | { x: number; y: number; id: number }>(null);
  const anchosActivos = usePlanillaWidths("stock.activos", { label: 280, col: 116, colCompact: 88 });
  const marcaActivos = useCeldaMarcada();
  const [menuActivos, setMenuActivos] = React.useState<null | { x: number; y: number; id: number }>(null);
  const marcaEpp = useCeldaMarcada();
  const [menuEpp, setMenuEpp] = React.useState<null | { x: number; y: number; id: number }>(null);
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
                    Trabajo
                    <PlanillaManija
                      onMouseDown={(ev) => anchosAgenda.startResize(ev, "label")}
                      onDoubleClick={anchosAgenda.resetLabel}
                    />
                  </th>
                  <th style={thColumna}>
                    Inicio fabricación
                    <PlanillaManija
                      onMouseDown={(ev) => anchosAgenda.startResize(ev, "col")}
                      onDoubleClick={anchosAgenda.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Días para comprar</th>
                  <th style={thColumna}>Faltantes</th>
                  <th style={thFlexible}>Estado · empresa</th>
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
                    <tr key={job.id}>
                      <td
                        style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${companyMetaItem.primary}` }}
                        title={`${job.budgetNumber} · ${job.client}`}
                      >
                        <strong style={{ color: "#0f172a" }}>{job.budgetNumber}</strong>{" "}
                        <span style={{ color: "#475569" }}>{job.client}</span>
                      </td>
                      <td style={tdDato}>
                        <input
                          style={{ ...styles.input, padding: "2px 4px", fontSize: 12 }}
                          type="date"
                          value={job.startDate}
                          onChange={(e) => updateApprovedJob(job.id, "startDate", e.target.value)}
                        />
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: daysUntilStart === null ? "#94a3b8" : daysUntilStart <= 3 ? "#dc2626" : daysUntilStart <= 10 ? "#ca8a04" : "#166534",
                        }}
                      >
                        {daysUntilStart === null ? "—" : `${daysUntilStart} días`}
                      </td>
                      <td style={{ ...tdDato, fontWeight: 700, color: missingCount === 0 ? "#166534" : missingCount <= 2 ? "#ca8a04" : "#dc2626" }}>
                        {missingCount === 0 ? "✓ completo" : `${missingCount} faltantes`}
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        {job.executionStatus} <span style={{ color: "#94a3b8" }}>· {companyMetaItem.short}</span>
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
                <ButtonLike onClick={anchosCostos.toggleCompacto} secondary>
                  {anchosCostos.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
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
            <div style={{ ...planillaWrap, ...anchosGrupos.vars }}>
            <table className="planilla" style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colFlexible} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Grupo / categoría
                    <PlanillaManija
                      onMouseDown={(ev) => anchosGrupos.startResize(ev, "label")}
                      onDoubleClick={anchosGrupos.resetLabel}
                    />
                  </th>
                  <th style={thColumna}>
                    Empresa
                    <PlanillaManija
                      onMouseDown={(ev) => anchosGrupos.startResize(ev, "col")}
                      onDoubleClick={anchosGrupos.resetCol}
                    />
                  </th>
                  <th style={thFlexible}>Notas</th>
                </tr>
              </thead>
              <tbody>
                {costAnalysisGroups.map((group) => (
                  <tr
                    key={group.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      marcaGrupos.marcar(String(group.id));
                      setMenuGrupos({ x: ev.clientX, y: ev.clientY, id: group.id });
                    }}
                  >
                    <td
                      title={group.name}
                      style={{
                        ...tdNombre, ...marcaGrupos.estilo(String(group.id)), fontWeight: 400,
                        opacity: group.active ? 1 : 0.45,
                      }}
                    >
                      <span
                        title={group.active ? "Activo" : "Inactivo"}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                          background: group.active ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      {group.name || "(sin nombre)"}
                    </td>
                    <td style={{ ...tdDato, color: "#475569" }}>{getCompanyScopeLabel(group.company)}</td>
                    <td style={{ ...tdFlexible, color: "#64748b" }} title={group.notes}>{group.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {menuGrupos && (() => {
              const it = costAnalysisGroups.find((x: any) => x.id === menuGrupos.id);
              const cerrar = () => {
                setMenuGrupos(null);
                marcaGrupos.marcar(null);
              };
              if (!it) return null;
              const pedir = (titulo: string, campo: string, actual: any) => () => {
                const v = window.prompt(titulo, String(actual ?? ""));
                if (v === null) return cerrar();
                updateCostAnalysisGroup(it.id, campo as any, v.trim());
                cerrar();
              };
              return (
                <QuickMenu x={menuGrupos.x} y={menuGrupos.y} onClose={cerrar}>
                  <QuickMenuTitle>{it.name || "grupo"}</QuickMenuTitle>
                  <button style={quickMenuItem} onClick={pedir("Grupo / categoría:", "name", it.name)}>
                    Editar nombre…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Notas:", "notes", it.notes)}>
                    Editar notas…
                  </button>
                  <QuickMenuSep />
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      const opciones = ["General", ...COMPANY_OPTIONS.map((c) => c.short)]
                        .map((n, i) => `${i + 1}. ${n}`)
                        .join("\n");
                      const v = window.prompt(`Empresa:\n${opciones}`, "");
                      const idx = Number(v) - 1;
                      const valores = ["General", ...COMPANY_OPTIONS.map((c) => c.value)];
                      if (valores[idx]) updateCostAnalysisGroup(it.id, "company", valores[idx]);
                      cerrar();
                    }}
                  >
                    Cambiar empresa…
                  </button>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      updateCostAnalysisGroup(it.id, "active", !it.active);
                      cerrar();
                    }}
                  >
                    {it.active ? "Desactivar" : "Activar"}
                  </button>
                  <QuickMenuSep />
                  <button
                    style={{ ...quickMenuItem, color: "#b91c1c" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar el grupo "${it.name}"?`)) {
                        removeCostAnalysisGroup(it.id);
                      }
                      cerrar();
                    }}
                  >
                    Quitar grupo
                  </button>
                </QuickMenu>
              );
            })()}

            <div style={styles.sectionHeader}>Items del analisis</div>
            <div style={{ ...planillaWrap, ...anchosCostos.vars }}>
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
                      onMouseDown={(ev) => anchosCostos.startResize(ev, "label")}
                      onDoubleClick={anchosCostos.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Cantidad
                    <PlanillaManija
                      onMouseDown={(ev) => anchosCostos.startResize(ev, "col")}
                      onDoubleClick={anchosCostos.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>$ Unit.</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Subtotal</th>
                  <th style={thFlexible}>Grupo · empresa · notas</th>
                </tr>
              </thead>
              <tbody>
                {costAnalysisEntries.map((entry) => {
                  const grupo = costAnalysisGroups.find((g) => g.id === entry.groupId);
                  return (
                  <tr
                    key={entry.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      marcaCostos.marcar(String(entry.id));
                      setMenuCostos({ x: ev.clientX, y: ev.clientY, id: entry.id });
                    }}
                  >
                    <td
                      title={entry.description}
                      style={{
                        ...tdNombre, ...marcaCostos.estilo(String(entry.id)), fontWeight: 400,
                        opacity: entry.active ? 1 : 0.45,
                      }}
                    >
                      <span
                        title={entry.active ? "Activo" : "Inactivo"}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                          background: entry.active ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      {entry.description || "(sin descripción)"}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right" }}>
                      {Number(entry.quantity || 0)} <span style={{ color: "#94a3b8" }}>{entry.unit}</span>
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>{money(entry.unitCost)}</td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                      {money(Number(entry.quantity || 0) * Number(entry.unitCost || 0))}
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b" }} title={entry.notes}>
                      {grupo ? grupo.name : "(sin grupo)"}{" "}
                      <span style={{ color: "#94a3b8" }}>· {getCompanyScopeLabel(entry.company)}</span>
                      {entry.notes ? <span style={{ color: "#94a3b8" }}> · {entry.notes}</span> : null}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {menuCostos && (() => {
              const it = costAnalysisEntries.find((x: any) => x.id === menuCostos.id);
              const cerrar = () => {
                setMenuCostos(null);
                marcaCostos.marcar(null);
              };
              if (!it) return null;
              const pedir = (titulo: string, campo: string, actual: any, numero = false) => () => {
                const v = window.prompt(titulo, String(actual ?? ""));
                if (v === null) return cerrar();
                if (numero) {
                  const n = Number(v.replace(",", "."));
                  if (Number.isFinite(n)) updateCostAnalysisEntry(it.id, campo as any, n);
                } else {
                  updateCostAnalysisEntry(it.id, campo as any, v.trim());
                }
                cerrar();
              };
              return (
                <QuickMenu x={menuCostos.x} y={menuCostos.y} onClose={cerrar}>
                  <QuickMenuTitle>{it.description || "concepto"}</QuickMenuTitle>
                  <button style={quickMenuItem} onClick={pedir("Cantidad:", "quantity", it.quantity, true)}>
                    Editar cantidad…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Costo unitario:", "unitCost", it.unitCost, true)}>
                    Editar costo unitario…
                  </button>
                  <QuickMenuSep />
                  <button style={quickMenuItem} onClick={pedir("Descripción:", "description", it.description)}>
                    Editar descripción…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Unidad:", "unit", it.unit)}>
                    Editar unidad…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Notas:", "notes", it.notes)}>
                    Editar notas…
                  </button>
                  <QuickMenuSep />
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      const opciones = costAnalysisGroups
                        .map((g, i) => `${i + 1}. ${g.name} - ${getCompanyScopeLabel(g.company)}`)
                        .join("\n");
                      const v = window.prompt(`Grupo:\n${opciones}`, "");
                      const idx = Number(v) - 1;
                      if (costAnalysisGroups[idx]) updateCostAnalysisEntry(it.id, "groupId", costAnalysisGroups[idx].id);
                      cerrar();
                    }}
                  >
                    Cambiar de grupo…
                  </button>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      updateCostAnalysisEntry(it.id, "active", !it.active);
                      cerrar();
                    }}
                  >
                    {it.active ? "Desactivar" : "Activar"}
                  </button>
                  <QuickMenuSep />
                  <button
                    style={{ ...quickMenuItem, color: "#b91c1c" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar "${it.description}" del análisis?`)) {
                        removeCostAnalysisEntry(it.id);
                      }
                      cerrar();
                    }}
                  >
                    Quitar del análisis
                  </button>
                </QuickMenu>
              );
            })()}
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
                <ButtonLike onClick={anchosEpp.toggleCompacto} secondary>
                  {anchosEpp.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
                {PERSONAL_PROVISION_KINDS.map((k) => (
                  <ButtonLike key={k} onClick={() => addPersonalStockItem(k)} secondary>
                    Agregar {k}
                  </ButtonLike>
                ))}
              </div>
            }
          >
            <div style={{ ...planillaWrap, ...anchosEpp.vars }}>
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
                      onMouseDown={(ev) => anchosEpp.startResize(ev, "label")}
                      onDoubleClick={anchosEpp.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Cantidad
                    <PlanillaManija
                      onMouseDown={(ev) => anchosEpp.startResize(ev, "col")}
                      onDoubleClick={anchosEpp.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>$ por entrega</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Valor stock</th>
                  <th style={thFlexible}>Tipo · empresa · ubicación</th>
                </tr>
              </thead>
              <tbody>
                {stockPersonalItems.map((item) => (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      marcaEpp.marcar(String(item.id));
                      setMenuEpp({ x: ev.clientX, y: ev.clientY, id: item.id });
                    }}
                  >
                    <td
                      title={item.description}
                      style={{
                        ...tdNombre, ...marcaEpp.estilo(String(item.id)), fontWeight: 400,
                        opacity: item.active ? 1 : 0.45,
                      }}
                    >
                      <span
                        title={item.active ? "Activo" : "Inactivo"}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                          background: item.active ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      {item.description || "(sin descripción)"}
                      {item.code ? <span style={{ color: "#94a3b8" }}> · {item.code}</span> : null}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 600, color: Number(item.quantity || 0) > 0 ? "#0f172a" : "#dc2626" }}>
                      {Number(item.quantity || 0)}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>{money(item.unitPrice)}</td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                      {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b" }}>
                      {item.kind}
                      <span style={{ color: "#94a3b8" }}> · {getCompanyScopeLabel(item.company)}</span>
                      {item.shared ? <span style={{ color: "#94a3b8" }}> · compartido</span> : null}
                      {item.location ? <span style={{ color: "#94a3b8" }}> · {item.location}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {menuEpp && (() => {
              const it = stockPersonalItems.find((x: any) => x.id === menuEpp.id);
              const cerrar = () => {
                setMenuEpp(null);
                marcaEpp.marcar(null);
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
                <QuickMenu x={menuEpp.x} y={menuEpp.y} onClose={cerrar}>
                  <QuickMenuTitle>{it.description || "item"} · {it.kind}</QuickMenuTitle>
                  <button style={quickMenuItem} onClick={pedir("Cantidad:", "quantity", it.quantity, true)}>
                    Editar cantidad…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("$ por entrega:", "unitPrice", it.unitPrice, true)}>
                    Editar $ por entrega…
                  </button>
                  <QuickMenuSep />
                  <button style={quickMenuItem} onClick={pedir("Descripción:", "description", it.description)}>
                    Editar descripción…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Código:", "code", it.code)}>
                    Editar código…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Ubicación:", "location", it.location)}>
                    Editar ubicación…
                  </button>
                  <QuickMenuSep />
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      const opciones = PERSONAL_PROVISION_KINDS.map((k, i) => `${i + 1}. ${k}`).join("\n");
                      const v = window.prompt(`Tipo:\n${opciones}`, "");
                      const idx = Number(v) - 1;
                      if (PERSONAL_PROVISION_KINDS[idx]) updateStockItem(it.id, "kind" as any, PERSONAL_PROVISION_KINDS[idx]);
                      cerrar();
                    }}
                  >
                    Cambiar tipo…
                  </button>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      updateStockItem(it.id, "shared" as any, !it.shared);
                      cerrar();
                    }}
                  >
                    {it.shared ? "Dejar de compartir" : "Marcar como compartido"}
                  </button>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      updateStockItem(it.id, "active" as any, !it.active);
                      cerrar();
                    }}
                  >
                    {it.active ? "Desactivar" : "Activar"}
                  </button>
                  <QuickMenuSep />
                  <button
                    style={{ ...quickMenuItem, color: "#b91c1c" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar "${it.description}" del listado?`)) {
                        removeStockItem(it.id);
                      }
                      cerrar();
                    }}
                  >
                    Quitar del listado
                  </button>
                </QuickMenu>
              );
            })()}
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
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={addCompanyAsset}>Agregar activo</ButtonLike>
                <ButtonLike onClick={anchosActivos.toggleCompacto} secondary>
                  {anchosActivos.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Activos activos" value={String(visibleCompanyAssets.filter((item) => item.active).length)} />
              <MiniMetric label="Valor de activos" value={money(visibleCompanyAssets.filter((item) => item.active).reduce((acc, item) => acc + Number(item.value || 0), 0))} />
              <MiniMetric label="Amortizacion mensual" value={money(activeAssetsMonthlyDepreciation)} />
            </div>
            <div style={{ ...planillaWrap, ...anchosActivos.vars }}>
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
                      onMouseDown={(ev) => anchosActivos.startResize(ev, "label")}
                      onDoubleClick={anchosActivos.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Valor
                    <PlanillaManija
                      onMouseDown={(ev) => anchosActivos.startResize(ev, "col")}
                      onDoubleClick={anchosActivos.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Vida útil</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Amortización</th>
                  <th style={thFlexible}>Categoría · empresa · notas</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanyAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      marcaActivos.marcar(String(asset.id));
                      setMenuActivos({ x: ev.clientX, y: ev.clientY, id: asset.id });
                    }}
                  >
                    <td
                      title={asset.description}
                      style={{
                        ...tdNombre, ...marcaActivos.estilo(String(asset.id)), fontWeight: 400,
                        opacity: asset.active ? 1 : 0.45,
                      }}
                    >
                      <span
                        title={asset.active ? "Activo" : "Inactivo"}
                        style={{
                          display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                          background: asset.active ? "#16a34a" : "#cbd5f5",
                        }}
                      />
                      {asset.description || "(sin descripción)"}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 600 }}>{money(asset.value)}</td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>
                      {Number(asset.usefulLifeMonths || 0)} <span style={{ color: "#94a3b8" }}>meses</span>
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                      {money(Number(asset.value || 0) / Math.max(Number(asset.usefulLifeMonths || 1), 1))}
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b" }} title={asset.notes}>
                      {asset.category || "(sin categoría)"}
                      <span style={{ color: "#94a3b8" }}> · {getCompanyScopeLabel(asset.company)}</span>
                      {asset.notes ? <span style={{ color: "#94a3b8" }}> · {asset.notes}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {menuActivos && (() => {
              const it = visibleCompanyAssets.find((x: any) => x.id === menuActivos.id);
              const cerrar = () => {
                setMenuActivos(null);
                marcaActivos.marcar(null);
              };
              if (!it) return null;
              const pedir = (titulo: string, campo: string, actual: any, numero: boolean) => () => {
                const v = window.prompt(titulo, String(actual ?? ""));
                if (v === null) return cerrar();
                if (numero) {
                  const n = Number(v.replace(",", "."));
                  if (Number.isFinite(n)) updateArrayItem(setCompanyAssets, it.id, campo, n);
                } else {
                  updateArrayItem(setCompanyAssets, it.id, campo, v.trim());
                }
                cerrar();
              };
              return (
                <QuickMenu x={menuActivos.x} y={menuActivos.y} onClose={cerrar}>
                  <QuickMenuTitle>{it.description || "activo"}</QuickMenuTitle>
                  <button style={quickMenuItem} onClick={pedir("Valor:", "value", it.value, true)}>
                    Editar valor…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Vida util (meses):", "usefulLifeMonths", it.usefulLifeMonths, true)}>
                    Editar vida util…
                  </button>
                  <QuickMenuSep />
                  <button style={quickMenuItem} onClick={pedir("Descripcion:", "description", it.description, false)}>
                    Editar descripcion…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Categoria:", "category", it.category, false)}>
                    Editar categoria…
                  </button>
                  <button style={quickMenuItem} onClick={pedir("Notas:", "notes", it.notes, false)}>
                    Editar notas…
                  </button>
                  <QuickMenuSep />
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      const opciones = COMPANY_OPTIONS.map((c, i) => `${i + 1}. ${c.short}`).join("\n");
                      const v = window.prompt(`Empresa:\n${opciones}`, "");
                      const idx = Number(v) - 1;
                      if (COMPANY_OPTIONS[idx]) updateArrayItem(setCompanyAssets, it.id, "company", COMPANY_OPTIONS[idx].value);
                      cerrar();
                    }}
                  >
                    Cambiar empresa…
                  </button>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      updateArrayItem(setCompanyAssets, it.id, "active", !it.active);
                      cerrar();
                    }}
                  >
                    {it.active ? "Desactivar" : "Activar"}
                  </button>
                  <QuickMenuSep />
                  <button
                    style={{ ...quickMenuItem, color: "#b91c1c" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar "${it.description}" de activos?`)) {
                        removeCompanyAsset(it.id);
                      }
                      cerrar();
                    }}
                  >
                    Quitar activo
                  </button>
                </QuickMenu>
              );
            })()}
          </Panel>

          <Panel span="full" title="Detalle de faltantes sugeridos">
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos abiertos.</div>
            ) : (
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
