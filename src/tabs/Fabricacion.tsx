import { Fragment, useState } from "react";
import { styles } from "../ui/styles";
import { Panel, SemaforoResumen, Semaforo, MiniMetric, ButtonLike } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, focoCelda,
} from "../ui/planilla";
import { formatDateDisplay, money, todayIso } from "../lib/format";
import type { CompanyName, PrintMode, ApprovedJob } from "../domain/types";

type FabricacionTabProps = {
  stockSemaphoreSummary: any;
  // Lo de COMPRAS que es operativo (que falta comprar y para cuando) vive aca, no en la solapa
  // Compras: esa quedo solo para el circuito administrativo (facturas, pagos y cuentas corrientes).
  purchaseDeadlineSemaphore: any;
  stockNeedRows: any[];
  totalPurchaseNeed: number;
  purchaseCalendarRows: any[];
  purchaseMonth: string;
  purchaseMonthData: any;
  purchaseItemsByDate: Map<string, any[]>;
  shiftPurchaseMonth: (delta: number) => void;
  approvedJobsSummary: any[];
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

// Oculto POR EL MOMENTO y SOLO en esta solapa (regla de Nicolas: "oculto" es por solapa).
const MOSTRAR_ESTADO_STOCK: boolean = false;

export function FabricacionTab({
  stockSemaphoreSummary,
  purchaseDeadlineSemaphore,
  stockNeedRows,
  totalPurchaseNeed,
  purchaseCalendarRows,
  purchaseMonth,
  purchaseMonthData,
  purchaseItemsByDate,
  shiftPurchaseMonth,
  approvedJobsSummary,
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

  const anchosPendientes = usePlanillaWidths("fabricacion.pendientes", { label: 300, col: 110, colCompact: 84 });
  const anchosCompras = usePlanillaWidths("fabricacion.compras", { label: 280, col: 120, colCompact: 92 });
  const anchosStock = usePlanillaWidths("fabricacion.stock", { label: 300, col: 110, colCompact: 84 });
  const anchosCalendario = usePlanillaWidths("fabricacion.calendario", { label: 280, col: 132, colCompact: 100 });
  const anchosLimite = usePlanillaWidths("fabricacion.limite", { label: 300, col: 118, colCompact: 90 });

  // FECHAS LIMITE DE COMPRA como planilla, con la estetica del Calendario anual: un renglon por
  // trabajo y una columna por dia. Reemplaza a la grilla de mes (no se entendia que trabajo vencia
  // cuando) y al Gantt de compras, que decia lo mismo con otra forma.
  const hoyIso = todayIso();
  const limiteDias = ((purchaseMonthData?.cells || []) as any[])
    .filter((c) => c.inCurrentMonth)
    .map((c) => {
      const dow = new Date(String(c.date) + "T00:00:00").getDay();
      return { iso: String(c.date), day: c.day, finde: dow === 0 || dow === 6 };
    });
  const limiteRows = (() => {
    const desdeMes = limiteDias[0]?.iso || "";
    const hastaMes = limiteDias[limiteDias.length - 1]?.iso || "";
    if (!desdeMes) return [] as any[];
    return purchaseCalendarRows
      .map((row: any) => {
        // La barra arranca cuando se aprobo el trabajo: es el tiempo real que hubo para comprar.
        const job = approvedJobsSummary.find((j: any) => j.id === row.id);
        const inicio = String(job?.approvalDate || row.deadlineDate || "");
        return { ...row, desde: inicio && inicio < row.deadlineDate ? inicio : row.deadlineDate };
      })
      // Entra si la fecha limite cae en el mes o si la barra lo atraviesa.
      .filter((row: any) => row.deadlineDate >= desdeMes && row.desde <= hastaMes)
      .sort((a: any, b: any) => String(a.deadlineDate || "").localeCompare(String(b.deadlineDate || "")));
  })();

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

          <Panel
            title="Calendario de fabricacion y entregas"
            span="full"
            actions={
              <ButtonLike onClick={anchosCalendario.toggleCompacto} secondary>
                {anchosCalendario.esCompacto ? "Ancho normal" : "Compacto"}
              </ButtonLike>
            }
          >
            {fabricationCalendarRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados para fabricar.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosCalendario.vars }}>
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
                      Presupuesto · cliente
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCalendario.startResize(ev, "label")}
                        onDoubleClick={anchosCalendario.resetLabel}
                      />
                    </th>
                    <th style={thColumna}>
                      Inicio
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCalendario.startResize(ev, "col")}
                        onDoubleClick={anchosCalendario.resetCol}
                      />
                    </th>
                    <th style={thColumna}>Entrega</th>
                    <th style={thColumna}>Faltantes</th>
                    <th style={thFlexible}>Estado · encargado · avance</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationCalendarRows.map((job) => (
                    <Fragment key={job.id}>
                    <tr>
                      <td
                        style={{
                          ...tdNombre, fontWeight: 400,
                          boxShadow: `inset 4px 0 0 ${getCompanyMeta(job.company).primary}`,
                        }}
                        title={`${job.budgetNumber} · ${job.client}`}
                      >
                        <strong style={{ color: "#0f172a" }}>{job.budgetNumber}</strong>{" "}
                        <span style={{ color: "#475569" }}>{job.client}</span>
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <input
                          style={{ ...inputCelda, padding: "1px 6px" }}
                          {...focoCelda}
                          type="date"
                          value={job.startDate}
                          onChange={(e) => updateApprovedJob(job.id, "startDate", e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <input
                          style={{ ...inputCelda, padding: "1px 6px" }}
                          {...focoCelda}
                          type="date"
                          value={job.deliveryDate}
                          onChange={(e) => updateApprovedJob(job.id, "deliveryDate", e.target.value)}
                        />
                      </td>
                      <td style={tdDato}>
                        <span
                          onClick={job.materialMissingCount === 0 ? undefined : () => toggleJobDetail(job.id)}
                          title={job.materialMissingCount === 0 ? undefined : "Ver que materiales faltan"}
                          style={{
                            fontWeight: 700,
                            color:
                              job.materialMissingCount === 0
                                ? "#166534"
                                : job.materialMissingCount <= 2
                                ? "#ca8a04"
                                : "#dc2626",
                            ...(job.materialMissingCount === 0
                              ? {}
                              : { cursor: "pointer", userSelect: "none" as const }),
                          }}
                        >
                          {job.materialMissingCount === 0
                            ? "✓ completo"
                            : `${expandedJobIds.includes(job.id) ? "▾" : "▸"} ${job.materialMissingCount} faltantes`}
                        </span>
                      </td>
                      <td style={{ ...tdFlexible, padding: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
                          <select
                            style={{ ...inputCelda, width: "auto" }}
                            value={job.executionStatus}
                            onChange={(e) => updateApprovedJob(job.id, "executionStatus", e.target.value)}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_curso">En curso</option>
                            <option value="finalizado">Finalizado</option>
                          </select>
                          <input
                            style={{ ...inputCelda, width: 130, color: "#64748b" }}
                            {...focoCelda}
                            value={job.projectManager}
                            placeholder="encargado"
                            onChange={(e) => updateApprovedJob(job.id, "projectManager", e.target.value)}
                          />
                          <span style={{ flex: 1, minWidth: 120 }}>
                            <div style={styles.timelineLabel}>
                              {job.elapsedDays}/{job.totalDays} días · {job.statusProgressPct.toFixed(0)}% de avance
                            </div>
                            <div style={styles.progressTrack}>
                              <div style={{ ...styles.progressFill, width: `${job.timeProgressPct}%` }} />
                            </div>
                            <div style={{ ...styles.progressTrack, marginTop: 2 }}>
                              <div
                                style={{
                                  ...styles.progressFill,
                                  width: `${job.statusProgressPct}%`,
                                  background: "#0f766e",
                                }}
                              />
                            </div>
                          </span>
                        </span>
                      </td>
                    </tr>
                    {expandedJobIds.includes(job.id) && job.materialMissingCount > 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div style={{ padding: "10px 14px", background: "#f8fafc" }}>
                            <div style={{ ...styles.sectionNote, marginTop: 0 }}>
                              Falta para fabricar {job.budgetNumber} ({job.client}). Estimado{" "}
                              {money(job.materialEstimatedCost)}. Es una sugerencia de compra: el
                              stock ya esta repartido entre los trabajos abiertos por fecha de
                              inicio, y al finalizar el trabajo estos faltantes desaparecen.
                            </div>
                            <table className="planilla" style={planillaTable}>
                              <colgroup>
                                <col style={colLabel} />
                                <col style={colDato} />
                                <col style={colDato} />
                                <col style={colFlexible} />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th style={thEsquina}>Material</th>
                                  <th style={{ ...thColumna, textAlign: "right" }}>Necesita</th>
                                  <th style={{ ...thColumna, textAlign: "right" }}>Falta</th>
                                  <th style={{ ...thFlexible, textAlign: "right" }}>Estimado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {job.materialMissingRows.map((row: any, index: number) => (
                                  <tr key={`${job.id}-${row.description}-${index}`}>
                                    <td style={{ ...tdNombre, fontWeight: 400 }} title={row.description}>
                                      {row.description}
                                    </td>
                                    <td style={{ ...tdDato, textAlign: "right" }}>
                                      {row.required} <span style={{ color: "#94a3b8" }}>{row.unit}</span>
                                      <span style={{ color: "#94a3b8" }}> · de stock {row.allocated}</span>
                                    </td>
                                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                                      {row.missing} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{row.unit}</span>
                                    </td>
                                    <td style={{ ...tdFlexible, textAlign: "right", fontWeight: 600 }}>
                                      {money(row.estimatedCost)}
                                    </td>
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
              </div>
            )}
          </Panel>

          {/* Los dos juntos, como pidio Nicolas: el avance de fabricacion y las fechas limite de
              compra son la misma pregunta -- que hay que tener listo y para cuando. */}
          <Panel
            title="Avance de fabricación y fechas límite de compra"
            span="full"
            actions={
              <div style={styles.monthToolbar}>
                <ButtonLike onClick={() => shiftPurchaseMonth(-1)} secondary>Mes anterior</ButtonLike>
                <div style={styles.calendarMonthLabel}>{purchaseMonthData.label}</div>
                <ButtonLike onClick={() => shiftPurchaseMonth(1)} secondary>Mes siguiente</ButtonLike>
                <ButtonLike onClick={anchosLimite.toggleCompacto} secondary>
                  {anchosLimite.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.sectionHeader}>Gantt operativo de fabricación</div>
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

            <div style={styles.sectionHeader}>Compras · fecha límite por trabajo</div>
            <div style={styles.sectionNote}>
              Cada trabajo es un renglón y cada día una columna, como en el Calendario anual. La barra
              va desde la aprobación hasta la <strong>fecha límite de compra</strong>: mientras es verde
              hay tiempo, cuando llega al día límite se pone ámbar, y si ya pasó queda en rojo. El
              número del final son los materiales que todavía faltan comprar.
            </div>
            {limiteRows.length === 0 ? (
              <div style={styles.empty}>
                Ningún trabajo tiene fecha límite de compra en {purchaseMonthData.label}. Cargá la fecha
                de inicio de fabricación en el trabajo para que aparezca acá.
              </div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosLimite.vars }}>
                <table className="planilla" style={{ ...planillaTable, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={colLabel} />
                    {limiteDias.map((d) => (
                      <col key={`cl-${d.iso}`} style={{ width: 26 }} />
                    ))}
                    <col style={colFlexible} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thEsquina}>
                        Presupuesto · cliente
                        <PlanillaManija
                          onMouseDown={(ev) => anchosLimite.startResize(ev, "label")}
                          onDoubleClick={anchosLimite.resetLabel}
                        />
                      </th>
                      {limiteDias.map((d) => (
                        <th
                          key={`clh-${d.iso}`}
                          style={{
                            ...thColumna,
                            textAlign: "center",
                            padding: "4px 2px",
                            fontSize: 10,
                            ...(d.iso === hoyIso
                              ? { background: "#f59e0b", color: "#fff", fontWeight: 800 }
                              : d.finde
                              ? { color: "#cbd5e1" }
                              : null),
                          }}
                          title={d.iso === hoyIso ? "Hoy" : formatDateDisplay(d.iso)}
                        >
                          {d.day}
                        </th>
                      ))}
                      <th style={thFlexible}>Faltan comprar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {limiteRows.map((row) => {
                      const meta = getCompanyMeta(row.company);
                      return (
                        <tr key={`cl-row-${row.id}`}>
                          <td
                            style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${meta.primary}` }}
                            title={`${row.budgetNumber} · ${row.client} · límite ${formatDateDisplay(row.deadlineDate)}`}
                          >
                            <strong style={{ color: "#0f172a" }}>{row.budgetNumber}</strong>{" "}
                            <span style={{ color: "#64748b" }}>{row.client}</span>
                          </td>
                          {limiteDias.map((d) => {
                            const dentro = d.iso >= row.desde && d.iso <= row.deadlineDate;
                            const esLimite = d.iso === row.deadlineDate;
                            const vencido = row.deadlineDate < hoyIso;
                            const fondo = esLimite
                              ? vencido
                                ? "#dc2626"
                                : "#f59e0b"
                              : dentro
                              ? vencido
                                ? "#fecaca"
                                : "#bbf7d0"
                              : d.finde
                              ? "#f8fafc"
                              : undefined;
                            return (
                              <td
                                key={`cl-${row.id}-${d.iso}`}
                                style={{
                                  ...tdDato,
                                  padding: 0,
                                  textAlign: "center",
                                  background: fondo,
                                  color: esLimite ? "#fff" : undefined,
                                  fontWeight: esLimite ? 800 : undefined,
                                  fontSize: 10,
                                }}
                                title={
                                  esLimite
                                    ? `Fecha límite de compra: ${formatDateDisplay(row.deadlineDate)}`
                                    : dentro
                                    ? `${row.budgetNumber} · en plazo`
                                    : undefined
                                }
                              >
                                {esLimite ? "▲" : ""}
                              </td>
                            );
                          })}
                          <td style={tdFlexible}>
                            {row.missingCount > 0 ? (
                              <span style={{ color: row.deadlineDate < hoyIso ? "#b91c1c" : "#b45309", fontWeight: 700 }}>
                                {row.missingCount} {row.missingCount === 1 ? "material" : "materiales"}
                              </span>
                            ) : (
                              <span style={{ color: "#16a34a", fontWeight: 700 }}>todo comprado</span>
                            )}
                            <span style={{ color: "#94a3b8" }}>
                              {" · límite "}
                              {formatDateDisplay(row.deadlineDate)}
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

          {/* Nicolas lo pidio oculto POR EL MOMENTO (2026-08-27), solo en esta solapa. */}
          {MOSTRAR_ESTADO_STOCK && (
            <Panel title="Estado de stock para fabricacion" span="full">
              <div style={styles.metricGrid}>
                <MiniMetric label="Items visibles" value={String(visibleStockItems.filter((item) => item.kind === "general").length)} />
                <MiniMetric label="Items sin stock" value={String(visibleStockItems.filter((item) => item.kind === "general" && Number(item.quantity || 0) <= 0).length)} />
                <MiniMetric label="Items activos" value={String(visibleStockItems.filter((item) => item.kind === "general" && item.active).length)} />
                <MiniMetric label="Materiales con faltante" value={String(fabricationPendingPurchases.length)} />
              </div>
              <div style={{ ...planillaWrap, ...anchosStock.vars }}>
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
                        onMouseDown={(ev) => anchosStock.startResize(ev, "label")}
                        onDoubleClick={anchosStock.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Cantidad
                      <PlanillaManija
                        onMouseDown={(ev) => anchosStock.startResize(ev, "col")}
                        onDoubleClick={anchosStock.resetCol}
                      />
                    </th>
                    <th style={thFlexible}>Código · grupo · ubicación · empresa</th>
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
                        <td style={{ ...tdNombre, fontWeight: 400 }} title={item.description}>
                          <span
                            title={Number(item.quantity || 0) > 0 ? "Con stock" : "Sin stock"}
                            style={{
                              display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                              background: Number(item.quantity || 0) > 0 ? "#16a34a" : "#dc2626",
                            }}
                          />
                          {item.description}
                        </td>
                        <td
                          style={{
                            ...tdDato, textAlign: "right", fontWeight: 600,
                            color: Number(item.quantity || 0) > 0 ? "#0f172a" : "#dc2626",
                          }}
                        >
                          {item.quantity} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{item.unit}</span>
                        </td>
                        <td style={{ ...tdFlexible, color: "#64748b" }}>
                          {item.code || "sin código"}
                          <span style={{ color: "#94a3b8" }}>
                            {" · "}{item.group || "sin grupo"}
                            {" · "}{item.location || "sin ubicar"}
                            {" · "}{getCompanyScopeLabel(item.company)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            </Panel>
          )}

        </div>
  );
}
