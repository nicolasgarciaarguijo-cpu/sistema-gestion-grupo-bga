import { Fragment, useState } from "react";
import { styles } from "../ui/styles";
import { Panel, SemaforoResumen, Semaforo, MiniMetric, ButtonLike } from "../ui/primitives";
import { formatDateDisplay, money } from "../lib/format";
import type { CompanyName, PrintMode, ApprovedJob } from "../domain/types";

type FabricacionTabProps = {
  stockSemaphoreSummary: any;
  occupancyPct: number;
  fabricationOpenJobsCount: number;
  fabricationInProgressCount: number;
  fabricationPendingPurchases: any[];
  fabricationCompletedPurchases: any[];
  fabricationUpcomingDeliveries: number;
  fabricationOccupancyAvailablePct: number;
  totalAvailableHours: number;
  totalJobHours: number;
  visibleStockItems: any[];
  fabricationCalendarRows: any[];
  fabricationGanttTimeline: any;
  getCompanyMeta: (company: CompanyName) => any;
  getCompanyScopeLabel: (company: any) => string;
  exportPrint: (mode: PrintMode) => void;
  updateApprovedJob: (jobId: number, field: keyof ApprovedJob, value: string | number) => void;
};

export function FabricacionTab({
  stockSemaphoreSummary,
  occupancyPct,
  fabricationOpenJobsCount,
  fabricationInProgressCount,
  fabricationPendingPurchases,
  fabricationCompletedPurchases,
  fabricationUpcomingDeliveries,
  fabricationOccupancyAvailablePct,
  totalAvailableHours,
  totalJobHours,
  visibleStockItems,
  fabricationCalendarRows,
  fabricationGanttTimeline,
  getCompanyMeta,
  getCompanyScopeLabel,
  exportPrint,
  updateApprovedJob,
}: FabricacionTabProps) {
  // Que trabajos tienen abierto el detalle de faltantes. Solo UI, no se persiste.
  const [expandedJobIds, setExpandedJobIds] = useState<number[]>([]);
  const toggleJobDetail = (jobId: number) =>
    setExpandedJobIds((current) =>
      current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]
    );

  return (
        <div style={styles.column}>
          <Panel span="wide" title="Semaforo de fabricacion">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Materiales cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Compra parcial", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes para fabricar", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
            <div style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Semaforo
                level={occupancyPct > 100 ? "rojo" : occupancyPct > 85 ? "amarillo" : "verde"}
                size={24}
                ring
              />
              <div>
                <div style={styles.metricLabel}>Ocupacion</div>
                <div style={{ fontWeight: 700 }}>{occupancyPct.toFixed(1)}%</div>
              </div>
            </div>
          </Panel>
          <Panel
            title="Tablero general de fabricacion"
            span="wide"
            actions={<ButtonLike onClick={() => exportPrint("report-fabricacion")} secondary>Reporte</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Trabajos activos" value={String(fabricationOpenJobsCount)} />
              <MiniMetric label="En curso" value={String(fabricationInProgressCount)} />
              <MiniMetric label="Compras pendientes" value={String(fabricationPendingPurchases.length)} />
              <MiniMetric label="Compras realizadas" value={String(fabricationCompletedPurchases.length)} />
              <MiniMetric label="Entregas a coordinar" value={String(fabricationUpcomingDeliveries)} />
              <MiniMetric label="Ocupacion usada" value={`${occupancyPct.toFixed(1)}%`} />
              <MiniMetric label="Ocupacion disponible" value={`${fabricationOccupancyAvailablePct.toFixed(1)}%`} />
              <MiniMetric label="Horas disponibles" value={totalAvailableHours.toFixed(1)} />
              <MiniMetric label="Horas comprometidas" value={totalJobHours.toFixed(1)} />
            </div>
            <div style={styles.noticeBox}>
              Esta solapa concentra seguimiento de fabricacion sin precios: compras necesarias,
              compras realizadas, estado de stock, ocupacion disponible, calendario y
              coordinacion de entregas para trabajar capacidad y faltantes.
            </div>
          </Panel>

          <Panel title="Compras pendientes para fabricacion" span="wide">
            {fabricationPendingPurchases.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos activos.</div>
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
                  </tr>
                </thead>
                <tbody>
                  {fabricationPendingPurchases.map((row) => (
                    <tr key={row.description}>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(row.available > 0 ? styles.statusYellow : styles.statusRed),
                          }}
                        >
                          {row.available > 0 ? "Parcial" : "Comprar"}
                        </span>
                      </td>
                      <td>{row.description}</td>
                      <td>{row.companyLabels.join(", ")}</td>
                      <td>{row.jobs.join(", ")}</td>
                      <td>{row.required} {row.unit}</td>
                      <td>{row.available} {row.unit}</td>
                      <td>{row.missing} {row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Compras realizadas" span="wide">
            {fabricationCompletedPurchases.length === 0 ? (
              <div style={styles.empty}>Todavia no hay facturas de compra cargadas.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Comprobante</th>
                    <th>Numero</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationCompletedPurchases.map((item) => (
                    <tr key={item.id}>
                      <td>{getCompanyMeta(item.company).short}</td>
                      <td>{formatDateDisplay(item.invoiceDate)}</td>
                      <td>{item.supplier}</td>
                      <td>{[item.receiptKind, item.receiptLetter].filter(Boolean).join(" ") || "-"}</td>
                      <td>{item.invoiceNumber || "-"}</td>
                      <td>{item.source === "caja_chica" ? "Caja chica" : "Compras"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Estado de stock para fabricacion" span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Items visibles" value={String(visibleStockItems.filter((item) => item.kind === "general").length)} />
              <MiniMetric label="Items sin stock" value={String(visibleStockItems.filter((item) => item.kind === "general" && Number(item.quantity || 0) <= 0).length)} />
              <MiniMetric label="Items activos" value={String(visibleStockItems.filter((item) => item.kind === "general" && item.active).length)} />
              <MiniMetric label="Materiales con faltante" value={String(fabricationPendingPurchases.length)} />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Grupo</th>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Ubicacion</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {visibleStockItems
                  .filter((item) => item.kind === "general")
                  .sort((a, b) => {
                    const stockCompare = Number(a.quantity || 0) - Number(b.quantity || 0);
                    if (stockCompare !== 0) return stockCompare;
                    return a.description.localeCompare(b.description);
                  })
                  .slice(0, 20)
                  .map((item) => (
                    <tr key={item.id}>
                      <td>{getCompanyScopeLabel(item.company)}</td>
                      <td>{item.group || "-"}</td>
                      <td>{item.code || "-"}</td>
                      <td>{item.description}</td>
                      <td>{item.location || "Sin ubicar"}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Calendario de fabricacion y entregas" span="full">
            {fabricationCalendarRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados para fabricar.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Inicio</th>
                    <th>Entrega</th>
                    <th>Encargado</th>
                    <th>Estado</th>
                    <th>Tiempo</th>
                    <th>Ocupacion</th>
                    <th>Faltantes</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationCalendarRows.map((job) => (
                    <Fragment key={job.id}>
                    <tr>
                      <td>{getCompanyMeta(job.company).short}</td>
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
                        <input
                          style={{ ...styles.input, minWidth: 140 }}
                          type="date"
                          value={job.deliveryDate}
                          onChange={(e) => updateApprovedJob(job.id, "deliveryDate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={job.projectManager}
                          onChange={(e) => updateApprovedJob(job.id, "projectManager", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={job.executionStatus}
                          onChange={(e) => updateApprovedJob(job.id, "executionStatus", e.target.value)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_curso">En curso</option>
                          <option value="finalizado">Finalizado</option>
                        </select>
                      </td>
                      <td>
                        <div style={styles.timelineBlock}>
                          <div style={styles.timelineLabel}>
                            {job.elapsedDays}/{job.totalDays} dias
                          </div>
                          <div style={styles.progressTrack}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${job.timeProgressPct}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={styles.timelineBlock}>
                          <div style={styles.timelineLabel}>
                            {job.statusProgressPct.toFixed(0)}%
                          </div>
                          <div style={styles.progressTrack}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${job.statusProgressPct}%`,
                                background: "#0f766e",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          onClick={
                            job.materialMissingCount === 0
                              ? undefined
                              : () => toggleJobDetail(job.id)
                          }
                          title={
                            job.materialMissingCount === 0
                              ? undefined
                              : "Ver que materiales faltan"
                          }
                          style={{
                            ...styles.statusPill,
                            ...(job.materialMissingCount === 0
                              ? styles.statusGreen
                              : job.materialMissingCount <= 2
                              ? styles.statusYellow
                              : styles.statusRed),
                            ...(job.materialMissingCount === 0
                              ? {}
                              : { cursor: "pointer", userSelect: "none" as const }),
                          }}
                        >
                          {job.materialMissingCount === 0
                            ? "Completo"
                            : `${expandedJobIds.includes(job.id) ? "▾" : "▸"} ${
                                job.materialMissingCount
                              } faltantes`}
                        </span>
                      </td>
                    </tr>
                    {expandedJobIds.includes(job.id) && job.materialMissingCount > 0 && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <div style={{ padding: "10px 14px", background: "#f8fafc" }}>
                            <div style={{ ...styles.sectionNote, marginTop: 0 }}>
                              Falta para fabricar {job.budgetNumber} ({job.client}). Estimado{" "}
                              {money(job.materialEstimatedCost)}. Es una sugerencia de compra: el
                              stock ya esta repartido entre los trabajos abiertos por fecha de
                              inicio, y al finalizar el trabajo estos faltantes desaparecen.
                            </div>
                            <table style={styles.table}>
                              <thead>
                                <tr>
                                  <th>Material</th>
                                  <th>Necesita</th>
                                  <th>De stock</th>
                                  <th>Falta</th>
                                  <th>Estimado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {job.materialMissingRows.map((row: any, index: number) => (
                                  <tr key={`${job.id}-${row.description}-${index}`}>
                                    <td>{row.description}</td>
                                    <td>
                                      {row.required} {row.unit}
                                    </td>
                                    <td>
                                      {row.allocated} {row.unit}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>
                                      {row.missing} {row.unit}
                                    </td>
                                    <td>{money(row.estimatedCost)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Gantt operativo de fabricacion" span="full">
            {fabricationCalendarRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos suficientes para mostrar el Gantt.</div>
            ) : (
              <div style={styles.fabricationGanttWrap}>
                <div style={styles.fabricationGanttHeader}>
                  <div style={styles.fabricationGanttMeta}>
                    Ventana visible: {formatDateDisplay(fabricationGanttTimeline.start)} al{" "}
                    {formatDateDisplay(fabricationGanttTimeline.end)}
                  </div>
                  <div style={styles.fabricationGanttLegend}>
                    <span style={styles.fabricationGanttLegendItem}>Barra: plazo comprometido</span>
                    <span style={styles.fabricationGanttLegendItem}>Color: empresa</span>
                  </div>
                </div>
                <div style={styles.fabricationGanttGrid}>
                  <div style={styles.fabricationGanttDays}>
                    {fabricationGanttTimeline.dayLabels.map((day) => (
                      <div
                        key={`gantt-day-${day.key}`}
                        style={{
                          ...styles.fabricationGanttDay,
                          ...(day.weekend ? styles.fabricationGanttDayWeekend : {}),
                        }}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                  {fabricationCalendarRows.map((job) => {
                    const companyMeta = getCompanyMeta(job.company);
                    const startTime = new Date(job.start || job.approvalDate || fabricationGanttTimeline.start).getTime();
                    const endTime = new Date(job.end || job.deliveryDate || job.start || fabricationGanttTimeline.end).getTime();
                    const timelineStart = new Date(fabricationGanttTimeline.start).getTime();
                    const totalRange = Math.max(
                      1,
                      new Date(fabricationGanttTimeline.end).getTime() - timelineStart
                    );
                    const leftPct = Math.max(0, ((startTime - timelineStart) / totalRange) * 100);
                    const widthPct = Math.max(
                      2,
                      ((Math.max(endTime, startTime) - startTime + 1000 * 60 * 60 * 24) / totalRange) * 100
                    );
                    return (
                      <div key={`gantt-row-${job.id}`} style={styles.fabricationGanttRow}>
                        <div style={styles.fabricationGanttJobMeta}>
                          <strong>
                            {job.budgetNumber} · {job.client}
                          </strong>
                          <span style={styles.muted}>
                            {companyMeta.short} · {job.projectManager || "Sin encargado"} ·{" "}
                            {job.executionStatus === "finalizado"
                              ? "Finalizado"
                              : job.executionStatus === "en_curso"
                              ? "En curso"
                              : "Pendiente"}
                          </span>
                        </div>
                        <div style={styles.fabricationGanttTrack}>
                          <div
                            style={{
                              ...styles.fabricationGanttBar,
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: `linear-gradient(90deg, ${companyMeta.primary}, ${companyMeta.primary}CC)`,
                            }}
                          >
                            <span style={styles.fabricationGanttBarLabel}>
                              {formatDateDisplay(job.start || job.approvalDate)} → {formatDateDisplay(job.end || job.deliveryDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </div>
  );
}
