import React from "react";
import { styles } from "../ui/styles";
import {
  Panel,
  SemaforoResumen,
  Semaforo,
  MiniMetric,
  ButtonLike,
  TwoCol,
  Field,
  SummaryRow,
  FileDropButton,
  AmountInput,
  ColorTagToggle,
  PillD,
} from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
} from "../ui/planilla";
import { money, pct, formatDateDisplay } from "../lib/format";
import { moneyToneColor } from "../ui/primitives";
import { jobPaymentMissing } from "../domain/completeness";
import { resolveAdvancePct } from "../domain/budgetTerms";
import { getPlanoSemaphore, isPlanoPending, comparePlanoUrgency, type PlanoTone } from "../domain/planos";
import { getInvoicingSemaphore } from "../domain/semaphores";
import type { SemaphoreLevel } from "../ui/theme";

// % de facturacion real de un trabajo (neto facturado por facturas reales) contra el neto comprometido
// (soldNetPrice x billedPct). Devuelve el nivel del semaforo para el circulo verde/amarillo/rojo.
const jobInvoicingSem = (job: any) => {
  const invoicedNetReal = (job?.invoices || []).reduce(
    (acc: number, inv: any) => acc + Number(inv?.subtotal || 0),
    0
  );
  const billedNetTarget = Number(job?.soldNetPrice || 0) * (Number(job?.billedPct || 0) / 100);
  return getInvoicingSemaphore(invoicedNetReal, billedNetTarget);
};
import type { CompanyName, PrintMode, ApprovedJob } from "../domain/types";

// Tono del semaforo de planos -> nivel del componente Semaforo del sistema.
const PLANO_TONE_LEVEL: Record<PlanoTone, SemaphoreLevel> = {
  red: "rojo",
  yellow: "amarillo",
  green: "verde",
};
const planoDaysText = (days: number | null): string =>
  days === null
    ? "sin fecha de inicio"
    : days < 0
    ? `fabricacion empezo hace ${-days} d`
    : days === 0
    ? "fabricacion empieza hoy"
    : `faltan ${days} d para fabricar`;

type AprobadosTabProps = {
  jobSemaphoreSummary: any;
  approvedJobsSummary: any[];
  companyApprovedSections: any[];
  approvedJobsTimelineRows: any[];
  selectedApprovedJobId: number | null;
  selectedApprovedJob: any;
  getCompanyMeta: (company: CompanyName) => any;
  // Empresas a las que se puede mover un trabajo (para corregir una importación mal asignada).
  companyOptions?: Array<{ value: string; short?: string }>;
  getApprovedJobSourceLabel: (job: any) => string;
  getJobSemaphore: (job: any) => { level: SemaphoreLevel; label: string };
  setSelectedApprovedJobId: React.Dispatch<React.SetStateAction<number | null>>;
  createDirectApprovedJob: () => void;
  importLegacyApprovedJobs: () => void;
  exportPrint: (mode: PrintMode) => void;
  updateApprovedJob: (jobId: number, field: keyof ApprovedJob, value: string | number) => void;
  issuedInvoices: any[];
  updateIssuedInvoice: (id: number, field: any, value: any) => void;
  loadBudgetFromSnapshot: (snapshot: any, budgetId: any) => void;
  uploadApprovedJobWorkFiles: (jobId: number, kind: string, files: FileList | null) => void;
  removeApprovedJobWorkFile: (jobId: number, fileId: number) => void;
  confirmApprovedJobPlanos: (jobId: number, confirmed: boolean) => void;
  today: string;
  addInvoice: (jobId: number) => void;
  removeInvoice: (jobId: number, invoiceId: number) => void;
  emitInvoiceAfip: (jobId: number, invoiceId: number) => void;
  canEmitFacturas: boolean;
  updateInvoice: (jobId: number, invoiceId: number, field: string, value: string | number) => void;
  addPayment: (jobId: number) => void;
  removePayment: (jobId: number, paymentId: number) => void;
  updatePayment: (
    jobId: number,
    paymentId: number,
    field: string,
    value: string | number | boolean
  ) => void;
  addAdditional: (jobId: number) => void;
  removeAdditional: (jobId: number, additionalId: number) => void;
  updateAdditional: (jobId: number, additionalId: number, field: string, value: string | number) => void;
  addDiscount: (jobId: number) => void;
  removeDiscount: (jobId: number, discountId: number) => void;
  updateDiscount: (jobId: number, discountId: number, field: string, value: string | number) => void;
  addCommissionPayment: (jobId: number) => void;
  removeCommissionPayment: (jobId: number, paymentId: number) => void;
  updateCommissionPayment: (jobId: number, paymentId: number, field: string, value: string | number) => void;
  addRetention: (jobId: number) => void;
  removeRetention: (jobId: number, retentionId: number) => void;
  updateRetention: (jobId: number, retentionId: number, field: string, value: string | number) => void;
  uploadApprovedJobFile: (jobId: number, section: string, itemId: number, file: File | null) => void;
  exportPaymentReceipt: (job: any, payment: any) => void;
  onClientSummary: (job: any) => void;
};

// Bloques que Nicolas pidio ocultar POR EL MOMENTO (2026-08-27). Se dejan en el codigo, no se
// borran: volver a mostrarlos es poner el flag en true. El tipo va explicito para que TypeScript no
// estreche a `false` y marque el JSX de adentro como inalcanzable.
const MOSTRAR_PLANOS_PENDIENTES: boolean = false;
const MOSTRAR_EVOLUCION_TRABAJOS: boolean = false;

export function AprobadosTab({
  jobSemaphoreSummary,
  approvedJobsSummary,
  companyApprovedSections,
  approvedJobsTimelineRows,
  selectedApprovedJobId,
  selectedApprovedJob,
  getCompanyMeta,
  companyOptions = [],
  getApprovedJobSourceLabel,
  getJobSemaphore,
  setSelectedApprovedJobId,
  createDirectApprovedJob,
  importLegacyApprovedJobs,
  exportPrint,
  updateApprovedJob,
  issuedInvoices,
  updateIssuedInvoice,
  loadBudgetFromSnapshot,
  uploadApprovedJobWorkFiles,
  removeApprovedJobWorkFile,
  confirmApprovedJobPlanos,
  today,
  addInvoice,
  removeInvoice,
  emitInvoiceAfip,
  canEmitFacturas,
  updateInvoice,
  addPayment,
  removePayment,
  updatePayment,
  addAdditional,
  removeAdditional,
  updateAdditional,
  addDiscount,
  removeDiscount,
  updateDiscount,
  addCommissionPayment,
  removeCommissionPayment,
  updateCommissionPayment,
  addRetention,
  removeRetention,
  updateRetention,
  uploadApprovedJobFile,
  exportPaymentReceipt,
  onClientSummary,
}: AprobadosTabProps) {
  // Menú contextual (click derecho) del cliente: resumen económico (falta facturar/cobrar/comisión).
  const [ctxMenu, setCtxMenu] = React.useState<null | { x: number; y: number; job: any }>(null);
  const anchosAprobados = usePlanillaWidths("aprobados.principal", { label: 300, col: 118, colCompact: 90 });
  const anchosPlanos = usePlanillaWidths("aprobados.planos", { label: 280, col: 120, colCompact: 92 });
  const anchosLinea = usePlanillaWidths("aprobados.linea", { label: 300, col: 150, colCompact: 110 });
  // Un trabajo está TERMINADO cuando ya se cobró todo y la comisión está paga.
  const isJobDone = (job: any) =>
    Number(job.remainingToPay || 0) <= 1 && Number(job.commissionPending || 0) <= 1;
  // Cuánto falta facturar (target por % facturado − lo ya facturado).
  const faltaFacturar = (job: any) => {
    const target = Number(job.soldNetPrice || 0) * (Number(job.billedPct || 0) / 100);
    const invoiced = (job.invoices || []).reduce((a: number, i: any) => a + Number(i?.subtotal || 0), 0);
    return Math.max(0, target - invoiced);
  };

  // Trabajos con planos de fabricacion pendientes (sin planos o cargados sin confirmar), por urgencia.
  const planosPending = approvedJobsSummary
    .filter((job) => isPlanoPending(job))
    .map((job) => ({ job, sem: getPlanoSemaphore(job, today) }))
    .sort((a, b) => comparePlanoUrgency(a.sem, b.sem));
  return (
        <div style={styles.column}>
          {ctxMenu && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 60 }}
                onClick={() => setCtxMenu(null)}
                onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
              />
              <div
                style={{
                  position: "fixed", left: Math.min(ctxMenu.x, window.innerWidth - 280), top: Math.min(ctxMenu.y, window.innerHeight - 220),
                  zIndex: 61, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.22)", padding: 12, width: 270, fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{ctxMenu.job.client}</div>
                <div style={{ ...styles.muted, marginBottom: 8 }}>Ppto {ctxMenu.job.budgetNumber} · resumen del cliente</div>
                {(() => {
                  const ff = faltaFacturar(ctxMenu.job);
                  const fc = Number(ctxMenu.job.remainingToPay || 0);
                  const fco = Number(ctxMenu.job.commissionPending || 0);
                  const rowc = (lbl: string, v: number) => (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                      <span>{lbl}</span>
                      <strong style={{ color: v > 1 ? "#dc2626" : "#16a34a" }}>{v > 1 ? money(v) : "✓ OK"}</strong>
                    </div>
                  );
                  return (
                    <>
                      {rowc("Falta facturar", ff)}
                      {rowc("Falta cobrar", fc)}
                      {rowc("Falta pagar comisión", fco)}
                      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 6, paddingTop: 6, fontWeight: 700, color: ctxMenu.job.executionStatus === "finalizado" ? "#16a34a" : isJobDone(ctxMenu.job) ? "#16a34a" : "#b45309" }}>
                        {ctxMenu.job.executionStatus === "finalizado"
                          ? "✓ Completado"
                          : isJobDone(ctxMenu.job)
                          ? "● Listo para completar (marcalo en la ficha)"
                          : "⏳ Pendiente"}
                      </div>
                    </>
                  );
                })()}
                <ButtonLike onClick={() => { setSelectedApprovedJobId(ctxMenu.job.id); setCtxMenu(null); }} secondary>
                  Abrir ficha
                </ButtonLike>
              </div>
            </>
          )}
          <Panel span="full" title="Semaforo de trabajos">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Finalizados", value: String(jobSemaphoreSummary.verde) },
                { level: "amarillo", label: "En curso / pendientes", value: String(jobSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Sin fecha de inicio", value: String(jobSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>

          {MOSTRAR_PLANOS_PENDIENTES && (
            <Panel span="full" title="Planos de fabricacion pendientes">
              {planosPending.length === 0 ? (
                <div style={styles.empty}>
                  Todos los trabajos activos tienen los planos confirmados.
                </div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosPlanos.vars }}>
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
                        Cliente · proyecto
                        <PlanillaManija
                          onMouseDown={(ev) => anchosPlanos.startResize(ev, "label")}
                          onDoubleClick={anchosPlanos.resetLabel}
                        />
                      </th>
                      <th style={thColumna}>
                        Inicio fabricación
                        <PlanillaManija
                          onMouseDown={(ev) => anchosPlanos.startResize(ev, "col")}
                          onDoubleClick={anchosPlanos.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Cuenta regresiva</th>
                      <th style={thFlexible}>Planos · empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planosPending.map(({ job, sem }) => (
                      <tr
                        key={job.id}
                        style={sem.overdue ? { background: "#fef2f2" } : undefined}
                        title="Click derecho: abrir la ficha del trabajo"
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, job }); }}
                      >
                        <td
                          style={{
                            ...tdNombre, fontWeight: 400, background: "inherit",
                            boxShadow: `inset 4px 0 0 ${getCompanyMeta(job.company).primary}`,
                          }}
                          title={`${job.client} · ${job.project}`}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                            <Semaforo level={PLANO_TONE_LEVEL[sem.tone]} size={10} title={sem.label} />
                            <span>
                              <strong style={{ color: "inherit" }}>{job.client}</strong>{" "}
                              <span style={{ color: "#64748b" }}>{job.project}</span>
                            </span>
                          </span>
                        </td>
                        <td style={{ ...tdDato, color: "#475569" }}>{formatDateDisplay(job.startDate)}</td>
                        <td style={{ ...tdDato, fontWeight: 600, color: sem.overdue ? "#dc2626" : "#475569" }}>
                          {planoDaysText(sem.daysToStart)}
                        </td>
                        <td style={{ ...tdFlexible, color: "#64748b" }}>
                          {sem.level === "sin" ? "Sin planos" : `${sem.fileCount} archivo(s), sin confirmar`}
                          <span style={{ color: "#94a3b8" }}> · {getCompanyMeta(job.company).short}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </Panel>
          )}

    <Panel
      span="full"
      title="Trabajos aprobados por empresa"
      actions={
        <div style={styles.inlineActions}>
                <ButtonLike onClick={createDirectApprovedJob}>Nuevo trabajo directo</ButtonLike>
                <ButtonLike onClick={importLegacyApprovedJobs} secondary>
                  Importar historicos BGA
                </ButtonLike>
                <ButtonLike onClick={() => exportPrint("report-aprobados")} secondary>
                  Reporte
                </ButtonLike>
                <ButtonLike onClick={anchosAprobados.toggleCompacto} secondary>
                  {anchosAprobados.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            {approvedJobsSummary.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados.</div>
            ) : (
              <>
              {(() => {
                const pend = approvedJobsSummary.filter(
                  (j: any) => j.executionStatus === "finalizado" && !isJobDone(j)
                );
                if (pend.length === 0) return null;
                return (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13 }}>
                    <strong>⚠ {pend.length} trabajo(s) figuran “finalizado” pero NO están cerrados</strong> (falta cobrar o pagar comisión).
                    Están marcados con ⚠ y fondo rojo en la lista: {pend.map((j: any) => j.budgetNumber).join(", ")}.
                  </div>
                );
              })()}
              <div style={{ ...planillaWrap, ...anchosAprobados.vars, maxHeight: "none" }}>
              <table className="planilla" style={planillaTable}>
                {/* Antes la ultima columna metia estado, facturado, planos, fechas y origen en un
                    solo renglon con flex-wrap: se leia todo apelmazado. Ahora cada cosa tiene su
                    columna, con su ancho y su alineacion. */}
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
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
                        onMouseDown={(ev) => anchosAprobados.startResize(ev, "label")}
                        onDoubleClick={anchosAprobados.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Neto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosAprobados.startResize(ev, "col")}
                        onDoubleClick={anchosAprobados.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Cobrado</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Saldo</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Comisión pend.</th>
                    <th style={thColumna}>Estado</th>
                    <th style={thColumna}>Facturado</th>
                    <th style={thColumna}>Planos</th>
                    <th style={thFlexible}>Aprobación → inicio → entrega</th>
                  </tr>
                </thead>
                <tbody>
                  {companyApprovedSections.map((group) => (
                    <React.Fragment key={group.value}>
                      <tr>
                        <td colSpan={9} style={styles.sectionCell}>
                          <div
                            style={{
                              ...styles.sectionHeader,
                              background: group.soft,
                              color: group.primary,
                              borderColor: group.primary,
                            }}
                          >
                            {group.short} · {group.value}
                          </div>
                        </td>
                      </tr>
                      {group.items.map((job) => {
                        const finalizado = job.executionStatus === "finalizado";
                        const done = isJobDone(job);
                        // finalizado Y realmente cerrado (a cobrar 0 + comisión paga) → CELESTE.
                        // Antes era gris y se confundía con el resto; Nicolás lo quiere de un vistazo.
                        const completado = finalizado && done;
                        // finalizado PERO con pendientes (a cobrar o comisión) → NO se esconde: alerta.
                        const finalizadoPendiente = finalizado && !done;
                        // en curso pero ya cobrado todo → listo para cerrar.
                        const listo = done && !finalizado;
                        const faltas: string[] = [];
                        if (Number(job.remainingToPay || 0) > 1) faltas.push(`a cobrar ${money(job.remainingToPay)}`);
                        if (Number(job.commissionPending || 0) > 1) faltas.push(`comisión ${money(job.commissionPending)}`);
                        return (
                        <tr
                          key={job.id}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, job }); }}
                          title={finalizadoPendiente ? `Figura finalizado pero falta: ${faltas.join(", ")}` : "Click derecho: resumen del cliente y abrir ficha"}
                          style={
                            completado
                              ? { background: "#dbeafe", color: "#075985" }
                              : finalizadoPendiente
                              ? { background: "#fef2f2", color: "#991b1b" }
                              : listo
                              ? styles.rowGreen
                              : undefined
                          }
                        >
                          <td
                            style={{
                              ...tdNombre, fontWeight: 400, background: "inherit",
                              boxShadow: finalizadoPendiente ? "inset 3px 0 0 #dc2626" : undefined,
                            }}
                            title={`${job.budgetNumber} · ${job.client}`}
                          >
                            <strong style={{ color: "inherit" }}>
                              {completado ? (
                                <span style={{ color: "#0284c7", fontSize: 14, fontWeight: 800 }}>✓ </span>
                              ) : finalizadoPendiente ? "⚠ " : listo ? "● " : ""}
                              {job.isUpdate ? `${job.budgetNumber} · Act. ${job.revisionNumber - 1}` : job.budgetNumber}
                            </strong>{" "}
                            {job.client}
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 600 }}>{money(job.soldNetPrice)}</td>
                          <td style={{ ...tdDato, textAlign: "right", color: moneyToneColor("in") }}>{money(job.collectedTotal)}</td>
                          <td
                            style={{
                              ...tdDato, textAlign: "right", fontWeight: 700,
                              color: Number(job.remainingToPay || 0) > 1 ? "#b45309" : "#166534",
                            }}
                          >
                            {money(job.remainingToPay)}
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", color: moneyToneColor("out") }}>
                            {money(job.commissionPending)}
                          </td>
                          <td style={{ ...tdDato, color: "#64748b" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {(() => {
                                const sj = getJobSemaphore(job);
                                return <Semaforo level={sj.level} size={10} title={sj.label} />;
                              })()}
                              <span>{job.executionStatus}</span>
                            </span>
                          </td>
                          <td style={{ ...tdDato, color: "#64748b" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {(() => {
                                const sem = jobInvoicingSem(job);
                                return <Semaforo level={sem.level} size={10} title={sem.label} />;
                              })()}
                              <span>{pct(job.billedPct)}</span>
                            </span>
                          </td>
                          <td style={{ ...tdDato, color: "#64748b" }}>
                            {(() => {
                              const ps = getPlanoSemaphore(job, today);
                              return (
                                <span
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                                  title={`${ps.label}${ps.daysToStart !== null ? " · " + planoDaysText(ps.daysToStart) : ""}`}
                                >
                                  <Semaforo level={PLANO_TONE_LEVEL[ps.tone]} size={10} title={ps.label} />
                                  <span>
                                    {ps.level === "listo" ? "listos" : ps.level === "proceso" ? "sin confirmar" : "sin planos"}
                                  </span>
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ ...tdFlexible, color: "#94a3b8" }} title={getApprovedJobSourceLabel(job)}>
                            {formatDateDisplay(job.approvalDate)} → {formatDateDisplay(job.startDate)} →{" "}
                            {formatDateDisplay(job.estimatedDeliveryDate)}
                          </td>
                        </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </Panel>

          {MOSTRAR_EVOLUCION_TRABAJOS && (
            <Panel title="Evolucion de trabajos" span="full">
              {approvedJobsTimelineRows.length === 0 ? (
                <div style={styles.empty}>Todavia no hay trabajos aprobados para mostrar en la linea de tiempo.</div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosLinea.vars }}>
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
                        Presupuesto · cliente
                        <PlanillaManija
                          onMouseDown={(ev) => anchosLinea.startResize(ev, "label")}
                          onDoubleClick={anchosLinea.resetLabel}
                        />
                      </th>
                      <th style={thColumna}>
                        Tiempo
                        <PlanillaManija
                          onMouseDown={(ev) => anchosLinea.startResize(ev, "col")}
                          onDoubleClick={anchosLinea.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Avance</th>
                      <th style={thFlexible}>Fechas · compras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedJobsTimelineRows.map((row) => {
                      const companyMetaRow = getCompanyMeta(row.company);
                      return (
                        <tr key={`timeline-${row.id}`}>
                          <td
                            style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${companyMetaRow.primary}` }}
                            title={`${row.budgetNumber} · ${row.client}`}
                          >
                            <strong style={{ color: "#0f172a" }}>
                              {row.isUpdate ? `${row.budgetNumber} · Act. ${row.revisionNumber - 1}` : row.budgetNumber}
                            </strong>{" "}
                            <span style={{ color: "#475569" }}>{row.client}</span>
                          </td>
                          <td style={{ ...tdDato, padding: "2px 6px" }}>
                            <div style={styles.timelineBlock}>
                              <div style={styles.timelineLabel}>{row.elapsedDays} / {row.totalDays} dias</div>
                              <div style={styles.ganttTrack}>
                                <div
                                  style={{ ...styles.ganttFill, width: `${row.timeProgressPct}%`, background: companyMetaRow.primary }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdDato, padding: "2px 6px" }}>
                            <div style={styles.timelineBlock}>
                              <div style={styles.timelineLabel}>{row.executionStatus}</div>
                              <div style={styles.ganttTrack}>
                                <div
                                  style={{
                                    ...styles.ganttFill,
                                    width: `${row.statusProgressPct}%`,
                                    background:
                                      row.executionStatus === "finalizado"
                                        ? "#166534"
                                        : row.executionStatus === "en_curso"
                                        ? companyMetaRow.primary
                                        : "#92400e",
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdFlexible, color: "#64748b" }}>
                            {formatDateDisplay(row.start)} → {formatDateDisplay(row.end)}
                            <span style={{ color: "#cbd5e1" }}> · </span>
                            <span
                              style={{ fontWeight: 700, color: row.materialMissingCount > 0 ? "#ca8a04" : "#166534" }}
                            >
                              {row.materialMissingCount > 0 ? `${row.materialMissingCount} faltantes` : "compras completas"}
                            </span>
                            <span style={{ color: "#94a3b8" }}> · {companyMetaRow.short}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </Panel>
          )}

          {selectedApprovedJob && (
            <Panel
              title={`Detalle ${selectedApprovedJob.isUpdate ? `${selectedApprovedJob.budgetNumber} · Act. ${selectedApprovedJob.revisionNumber - 1}` : selectedApprovedJob.budgetNumber}`}
              green={selectedApprovedJob.executionStatus === "finalizado"}
              actions={
                <>
                  <ButtonLike onClick={() => onClientSummary(selectedApprovedJob)}>
                    Resumen para el cliente
                  </ButtonLike>
                  <ButtonLike onClick={() => setSelectedApprovedJobId(null)} secondary>
                    Cerrar detalle
                  </ButtonLike>
                </>
              }
            >
              <div style={styles.metricGrid}>
                {companyOptions.length > 1 ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "3px 0" }}>
                    <span style={{ fontSize: 12.5, color: "#64748b", minWidth: 120, flexShrink: 0 }}>Empresa</span>
                    <select
                      style={{ ...styles.input, width: "auto", fontWeight: 800, padding: "2px 6px" }}
                      value={selectedApprovedJob.company}
                      title="Si el trabajo quedó en la empresa equivocada (por ejemplo, por una importación), corregilo acá."
                      onChange={(e) => {
                        const destino = e.target.value;
                        if (destino === selectedApprovedJob.company) return;
                        const ok = window.confirm(
                          `¿Pasar el presupuesto ${selectedApprovedJob.budgetNumber} (${selectedApprovedJob.client}) ` +
                            `de ${getCompanyMeta(selectedApprovedJob.company).short} a ${destino}?\n\n` +
                            `El trabajo, sus pagos y su comisión pasan a contar en la empresa nueva.`
                        );
                        if (ok) updateApprovedJob(selectedApprovedJob.id, "company", destino);
                      }}
                    >
                      {companyOptions.map((c) => (
                        <option key={c.value} value={c.value}>{c.short || c.value}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <MiniMetric label="Empresa" value={getCompanyMeta(selectedApprovedJob.company).short} />
                )}
                <MiniMetric label="Origen" value={getApprovedJobSourceLabel(selectedApprovedJob)} />
                <MiniMetric label="Cliente" value={selectedApprovedJob.client} />
                <MiniMetric label="Aprobacion" value={formatDateDisplay(selectedApprovedJob.approvalDate)} />
                <MiniMetric label="Entrega" value={formatDateDisplay(selectedApprovedJob.deliveryDate)} />
                <MiniMetric label="Neto presupuesto" value={money(selectedApprovedJob.soldNetPrice)} />
                <MiniMetric label="Comision pendiente" value={money(selectedApprovedJob.commissionPending)} tone="out" />
              </div>

              <div style={styles.grid2}>
                <Panel
                  title="Gestion del trabajo"
                  nested
                  actions={
                    <ButtonLike
                      onClick={() =>
                        loadBudgetFromSnapshot(
                          selectedApprovedJob.snapshot,
                          selectedApprovedJob.budgetId
                        )
                      }
                      secondary
                    >
                      Editar cotizacion
                    </ButtonLike>
                  }
                >
                  <TwoCol>
                    <Field label="Fecha aprobacion">
                      <input
                        style={styles.input}
                        type="date"
                        value={selectedApprovedJob.approvalDate}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "approvalDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Fecha inicio">
                      <input
                        style={styles.input}
                        type="date"
                        value={selectedApprovedJob.startDate}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "startDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Plazo">
                      <input
                        style={styles.input}
                        value={selectedApprovedJob.deliveryTerm}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "deliveryTerm", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Fecha entrega">
                      <input
                        style={styles.input}
                        type="date"
                        value={selectedApprovedJob.deliveryDate}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "deliveryDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="% facturado">
                      <input
                        style={styles.input}
                        type="number"
                        value={selectedApprovedJob.billedPct}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "billedPct", Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="% anticipo">
                      <input
                        style={styles.input}
                        type="number"
                        value={resolveAdvancePct(
                          selectedApprovedJob.advancePct,
                          selectedApprovedJob.snapshot?.budget?.paymentTerms || ""
                        )}
                        onChange={(e) =>
                          updateApprovedJob(
                            selectedApprovedJob.id,
                            "advancePct",
                            Math.max(0, Math.min(100, Number(e.target.value)))
                          )
                        }
                      />
                    </Field>
                    <Field label="Estado">
                      <select
                        style={styles.input}
                        value={selectedApprovedJob.executionStatus}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "executionStatus", e.target.value)
                        }
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_curso">En curso</option>
                        <option value="finalizado">Finalizado</option>
                      </select>
                    </Field>
                    <Field label="Neto acordado ($)">
                      <AmountInput
                        style={styles.input}
                        value={selectedApprovedJob.soldNetPrice}
                        onChange={(n) =>
                          updateApprovedJob(selectedApprovedJob.id, "soldNetPrice", n)
                        }
                      />
                    </Field>
                    <Field label="Neto acordado (U$S)">
                      <AmountInput
                        style={styles.input}
                        value={selectedApprovedJob.soldNetPriceUsd || 0}
                        onChange={(n) =>
                          updateApprovedJob(selectedApprovedJob.id, "soldNetPriceUsd", n)
                        }
                      />
                    </Field>
                  </TwoCol>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                    Editá el neto para cerrar un valor acordado. Poné todo el neto en U$S (y $ en 0)
                    para dolarizar el presupuesto completo, o combiná ambas monedas.
                  </div>
                  <Field label="Notas">
                    <textarea
                      style={styles.textarea}
                      value={selectedApprovedJob.notes}
                      onChange={(e) =>
                        updateApprovedJob(selectedApprovedJob.id, "notes", e.target.value)
                      }
                    />
                  </Field>
                </Panel>

                <Panel title="Resumen economico" nested>
                  <SummaryRow label="Neto presupuesto" value={money(selectedApprovedJob.soldNetPrice)} />
                  <SummaryRow label="Descuentos" value={money(selectedApprovedJob.totalDiscountAmount)} />
                  <SummaryRow label="% facturado" value={pct(selectedApprovedJob.billedPct)} />
                  {(() => {
                    const sem = jobInvoicingSem(selectedApprovedJob);
                    const invoicedNetReal = (selectedApprovedJob.invoices || []).reduce(
                      (a: number, i: any) => a + Number(i?.subtotal || 0),
                      0
                    );
                    const target =
                      Number(selectedApprovedJob.soldNetPrice || 0) *
                      (Number(selectedApprovedJob.billedPct || 0) / 100);
                    const missing = Math.max(0, target - invoicedNetReal);
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Semaforo level={sem.level} size={14} title={sem.label} /> Estado facturacion
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          {sem.level === "verde" ? "OK" : `falta facturar ${money(missing)}`}
                        </span>
                      </div>
                    );
                  })()}
                  <SummaryRow label="Neto factura" value={money(selectedApprovedJob.billedNet)} />
                  <SummaryRow label="Circuito negro" value={money(selectedApprovedJob.blackNet)} />
                  <SummaryRow label="IVA 21%" value={money(selectedApprovedJob.invoiceVatAmount)} />
                  <SummaryRow
                    label="Adicionales blanco (neto)"
                    value={money(selectedApprovedJob.additionalsWhiteNet || 0)}
                    color="blanco"
                  />
                  {(selectedApprovedJob.additionalsVat || 0) > 0 && (
                    <SummaryRow
                      label="IVA adicionales"
                      value={money(selectedApprovedJob.additionalsVat || 0)}
                    />
                  )}
                  {(selectedApprovedJob.additionalsBlackNet || 0) > 0 && (
                    <SummaryRow
                      label="Adicionales negro"
                      value={money(selectedApprovedJob.additionalsBlackNet || 0)}
                      color="negro"
                    />
                  )}
                  {(selectedApprovedJob.discountsTotal || 0) > 0 && (
                    <SummaryRow
                      label="Descuentos"
                      value={"- " + money(selectedApprovedJob.discountsTotal || 0)}
                      tone="out"
                    />
                  )}
                  <SummaryRow label="Valor a cobrar" value={money(selectedApprovedJob.valueToCollect)} strong />
                  <SummaryRow
                    label={`Anticipo a cobrar (${pct(selectedApprovedJob.anticipoPctResolved)} neto + IVA facturado)`}
                    value={money(selectedApprovedJob.anticipoToCharge)}
                  />
                  <SummaryRow label="Saldo a cobrar" value={money(selectedApprovedJob.saldoToCharge)} />
                  <SummaryRow
                    label="Cobrado (plata)"
                    value={money(Number(selectedApprovedJob.collectedTotal || 0) - Number(selectedApprovedJob.retentionsTotal || 0))}
                    tone="in"
                  />
                  {(selectedApprovedJob.usdPesifiedArs || 0) > 0 && (
                    <SummaryRow
                      label="  (incluye U$S pesificados)"
                      value={money(selectedApprovedJob.usdPesifiedArs || 0)}
                      tone="in"
                    />
                  )}
                  {(selectedApprovedJob.retentionsTotal || 0) > 0 && (
                    <SummaryRow
                      label="Retenciones (crédito fiscal)"
                      value={money(selectedApprovedJob.retentionsTotal || 0)}
                      tone="in"
                    />
                  )}
                  <SummaryRow
                    label="Cobrado + retenciones"
                    value={money(selectedApprovedJob.collectedTotal)}
                    tone="in"
                  />
                  <SummaryRow label="Saldo" value={money(selectedApprovedJob.remainingToPay)} strong />
                  {(Number(selectedApprovedJob.soldNetPriceUsd || 0) > 0 ||
                    Number(selectedApprovedJob.paymentsUsdTotal || 0) > 0) && (
                    <>
                      <SummaryRow
                        label="Vendido U$S"
                        value={money(selectedApprovedJob.soldNetPriceUsd || 0, "USD")}
                        strong
                      />
                      <SummaryRow
                        label="Cobrado U$S"
                        value={money(selectedApprovedJob.paymentsUsdTotal || 0, "USD")}
                        tone="in"
                      />
                      <SummaryRow
                        label="Saldo U$S"
                        value={money(selectedApprovedJob.remainingToPayUsd || 0, "USD")}
                        strong
                      />
                    </>
                  )}
                  <SummaryRow label="Comision" value={money(selectedApprovedJob.commissionAmount)} tone="out" />
                  <SummaryRow label="Comision pagada" value={money(selectedApprovedJob.commissionPaidTotal)} tone="out" />
                  <SummaryRow label="Comision pendiente" value={money(selectedApprovedJob.commissionPending)} strong tone="out" />
                </Panel>
              </div>

              <Panel span="full" title="Planos y archivos de referencia" nested>
                {(() => {
                  const ps = getPlanoSemaphore(selectedApprovedJob, today);
                  const confirmed = ps.level === "listo";
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background:
                          ps.tone === "green" ? "#f0fdf4" : ps.tone === "yellow" ? "#fffbeb" : "#fef2f2",
                      }}
                    >
                      <Semaforo level={PLANO_TONE_LEVEL[ps.tone]} size={12} title={ps.label} />
                      <strong>{ps.label}</strong>
                      <span style={styles.muted}>
                        {ps.fileCount} archivo(s) · {planoDaysText(ps.daysToStart)}
                      </span>
                      {confirmed ? (
                        <ButtonLike
                          secondary
                          onClick={() => confirmApprovedJobPlanos(selectedApprovedJob.id, false)}
                        >
                          Desmarcar (volver a en proceso)
                        </ButtonLike>
                      ) : (
                        <ButtonLike onClick={() => confirmApprovedJobPlanos(selectedApprovedJob.id, true)}>
                          Confirmar planos terminados
                        </ButtonLike>
                      )}
                    </div>
                  );
                })()}
                <div style={styles.uploadActions}>
                  <FileDropButton
                    label="Cargar planos"
                    allowMultiple
                    accept=".dwg,.3dm,.dxf,.skp,.rvt,.pdf,image/*"
                    onFilesSelected={(files) =>
                      uploadApprovedJobWorkFiles(
                        selectedApprovedJob.id,
                        "plano",
                        files
                      )
                    }
                  />
                  <FileDropButton
                    label="Cargar referencias"
                    allowMultiple
                    accept="image/*,.pdf,application/pdf"
                    onFilesSelected={(files) =>
                      uploadApprovedJobWorkFiles(
                        selectedApprovedJob.id,
                        "referencia",
                        files
                      )
                    }
                  />
                </div>
                {selectedApprovedJob.workFiles.length === 0 ? (
                  <div style={styles.empty}>No hay archivos vinculados a este trabajo.</div>
                ) : (
                  <table className="planilla" style={planillaTable}>
                    <colgroup>
                      <col style={colLabel} />
                      <col style={colFlexible} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thEsquina}>Archivo</th>
                        <th style={thFlexible}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedApprovedJob.workFiles.map((file) => (
                        <tr
                          key={file.id}
                          title="Click derecho: quitar el archivo"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm(`¿Quitar "${file.name}" de este trabajo?`)) {
                              removeApprovedJobWorkFile(selectedApprovedJob.id, file.id);
                            }
                          }}
                        >
                          <td style={{ ...tdNombre, fontWeight: 400 }} title={file.name}>
                            <span
                              style={{
                                display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                                background: file.kind === "plano" ? "#2563eb" : "#94a3b8",
                              }}
                            />
                            {file.name}
                          </td>
                          <td style={{ ...tdFlexible, color: "#64748b" }}>
                            {file.kind === "plano" ? "Plano" : "Referencia"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              {(() => {
                const linked = issuedInvoices.filter(
                  (i: any) => i.jobBudgetNumber === selectedApprovedJob.budgetNumber
                );
                const linkedTotal = linked.reduce((s: number, i: any) => s + Number(i.total || 0), 0);
                const unlinked = issuedInvoices.filter(
                  (i: any) => !i.jobBudgetNumber && i.company === selectedApprovedJob.company
                );
                return (
                  <Panel title="Facturas ARCA vinculadas a este trabajo" span="full" nested>
                    <div style={styles.muted}>
                      Facturas emitidas (del listado ARCA) atadas a este presupuesto. Se vinculan/desvinculan
                      acá o desde Costos: es el mismo dato, queda sincronizado.
                      {linked.length > 0 && (
                        <>
                          {" "}
                          · <strong>{linked.length}</strong> vinculada(s) por{" "}
                          <strong>{money(linkedTotal)}</strong>
                        </>
                      )}
                    </div>
                    {linked.length > 0 && (
                      <table className="planilla" style={planillaTable}>
                        <colgroup>
                          <col style={colLabel} />
                          <col style={colDato} />
                          <col style={colFlexible} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th style={thEsquina}>Factura</th>
                            <th style={{ ...thColumna, textAlign: "right" }}>Total</th>
                            <th style={thFlexible}>Fecha · razón social</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linked.map((i: any) => (
                            <tr
                              key={i.id}
                              title="Click derecho: desvincular la factura de este trabajo"
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (window.confirm(`¿Desvincular la factura ${i.pointOfSale}-${i.number} de este trabajo?`)) {
                                  updateIssuedInvoice(i.id, "jobBudgetNumber", "");
                                }
                              }}
                            >
                              <td style={{ ...tdNombre, fontWeight: 400 }}>
                                {i.pointOfSale}-{i.number}
                              </td>
                              <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(i.total)}</td>
                              <td style={{ ...tdFlexible, color: "#64748b" }} title={i.counterpartyName}>
                                {i.date}
                                <span style={{ color: "#94a3b8" }}> · {(i.counterpartyName || "").slice(0, 40)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Vincular una factura emitida:</span>
                      <select
                        style={{ ...styles.input, maxWidth: 360 }}
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            updateIssuedInvoice(
                              Number(e.target.value),
                              "jobBudgetNumber",
                              selectedApprovedJob.budgetNumber
                            );
                        }}
                      >
                        <option value="">— elegir factura sin vincular —</option>
                        {unlinked.map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.date} · {i.pointOfSale}-{i.number} · {money(i.total)} ·{" "}
                            {(i.counterpartyName || "").slice(0, 24)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Panel>
                );
              })()}

              <div style={styles.grid2}>
                <Panel
                  title="Facturacion"
                  nested
                  actions={<ButtonLike onClick={() => addInvoice(selectedApprovedJob.id)}>Agregar factura</ButtonLike>}
                >
                  {selectedApprovedJob.invoices.length === 0 ? (
                    <div style={styles.empty}>No hay facturas cargadas.</div>
                  ) : (
                    selectedApprovedJob.invoices.map((invoice) => (
                      <div key={invoice.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeInvoice(selectedApprovedJob.id, invoice.id)}>
                            Quitar factura
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Nombre / razon social">
                            <input
                              style={styles.input}
                              value={invoice.businessName}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "businessName", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="CUIT / CUIL">
                            <input
                              style={styles.input}
                              value={invoice.taxId}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "taxId", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Tipo de factura">
                            <input
                              style={styles.input}
                              value={invoice.invoiceType}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "invoiceType", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Numero">
                            <input
                              style={styles.input}
                              value={invoice.invoiceNumber}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "invoiceNumber", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "invoiceDate", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Subtotal">
                            <AmountInput
                              style={styles.input}
                              value={invoice.subtotal}
                              onChange={(n) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "subtotal", n)
                              }
                            />
                          </Field>
                          <Field label="Alicuota %">
                            <input
                              style={styles.input}
                              type="number"
                              value={invoice.vatRate ?? 21}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "vatRate", Number(e.target.value))
                              }
                            />
                          </Field>
                          <Field label="IVA (calculado)">
                            <input style={styles.input} value={money(invoice.vat)} readOnly />
                          </Field>
                          <Field label="Total (calculado)">
                            <input style={styles.input} value={money(invoice.total)} readOnly />
                          </Field>
                        </TwoCol>
                        <div
                          style={{
                            marginTop: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: invoice.afipCae ? "#f0fdf4" : "#eff6ff",
                            border: `1px solid ${invoice.afipCae ? "#bbf7d0" : "#bfdbfe"}`,
                          }}
                        >
                          {invoice.afipCae ? (
                            <div style={{ fontSize: 13, color: "#166534" }}>
                              ✅ Emitida en AFIP{invoice.afipEnv === "homo" ? " (homologacion)" : ""} · CAE{" "}
                              <strong>{invoice.afipCae}</strong> · vto {invoice.afipCaeVto} · N°{" "}
                              {String(invoice.afipPtoVta ?? 0).padStart(4, "0")}-
                              {String(invoice.afipCbteNro ?? 0).padStart(8, "0")}
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              {canEmitFacturas ? (
                                <>
                                  <ButtonLike onClick={() => emitInvoiceAfip(selectedApprovedJob.id, invoice.id)}>
                                    Emitir en AFIP (homologacion)
                                  </ButtonLike>
                                  <span style={styles.muted}>
                                    Factura {(invoice.invoiceType || "").trim().toUpperCase().startsWith("A") ? "A" : "B"} ·
                                    el sistema pide confirmacion antes de emitir.
                                  </span>
                                </>
                              ) : (
                                <span style={styles.muted}>
                                  La emision en AFIP se hace desde la solapa "Emitir facturas" (requiere permiso).
                                </span>
                              )}
                            </div>
                          )}
                          {invoice.afipError ? (
                            <div style={{ color: "#dc2626", marginTop: 4, fontSize: 12 }}>⚠️ {invoice.afipError}</div>
                          ) : null}
                        </div>
                        <div style={styles.uploadActions}>
                          <label style={styles.buttonLikeLabel}>
                            Cargar factura digital
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                uploadApprovedJobFile(
                                  selectedApprovedJob.id,
                                  "invoices",
                                  invoice.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                          {invoice.attachmentName && (
                            <div style={styles.fileName}>{invoice.attachmentName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>

                <Panel
                  title="Cobranzas"
                  nested
                  actions={<ButtonLike onClick={() => addPayment(selectedApprovedJob.id)}>Agregar cobranza</ButtonLike>}
                >
                  {selectedApprovedJob.payments.length === 0 ? (
                    <div style={styles.empty}>No hay pagos cargados.</div>
                  ) : (
                    selectedApprovedJob.payments.map((payment) => (
                      <div
                        key={payment.id}
                        style={{
                          ...styles.subCard,
                          borderLeft: `8px solid ${payment.administration === "negro" ? "#1f2937" : "#cbd5e1"}`,
                        }}
                      >
                        <div style={styles.inlineActions}>
                          {jobPaymentMissing(payment).length > 0 && (
                            <PillD missing={jobPaymentMissing(payment)} size={18} />
                          )}
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(payment.administration === "negro" ? styles.adminBlack : styles.adminWhite),
                            }}
                          >
                            {payment.administration === "negro" ? "NEGRO" : "BLANCO"}
                          </span>
                          <ColorTagToggle
                            value={payment.administration || "blanco"}
                            onSet={(v) => updatePayment(selectedApprovedJob.id, payment.id, "administration", v)}
                            size={16}
                          />
                          {payment.currency === "USD" && (
                            <span style={{ ...styles.statusPill, background: "#065f46", color: "#ffffff" }}>
                              {money(Number(payment.amount || 0), "USD")}
                            </span>
                          )}
                          <button style={styles.smallBtn} onClick={() => exportPaymentReceipt(selectedApprovedJob, payment)}>
                            Recibo cobranza
                          </button>
                          <button style={styles.smallBtn} onClick={() => removePayment(selectedApprovedJob.id, payment.id)}>
                            Quitar cobranza
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Numero">
                            <input
                              style={styles.input}
                              value={payment.paymentNumber}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "paymentNumber", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={payment.paymentDate}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "paymentDate", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Tipo">
                            <select
                              style={styles.input}
                              value={payment.transactionType}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "transactionType", e.target.value)
                              }
                            >
                              <option value="efectivo">Efectivo</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="cheque">Cheque</option>
                              <option value="otros">Otros</option>
                            </select>
                          </Field>
                          <Field label="Administracion">
                            <select
                              style={styles.input}
                              value={payment.administration || "blanco"}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "administration", e.target.value)
                              }
                            >
                              <option value="blanco">Blanco</option>
                              <option value="negro">Negro</option>
                            </select>
                          </Field>
                          <Field label="Moneda">
                            <select
                              style={styles.input}
                              value={payment.currency || "ARS"}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "currency", e.target.value)
                              }
                            >
                              <option value="ARS">$ Pesos</option>
                              <option value="USD">U$S Dolares</option>
                            </select>
                          </Field>
                          <Field label={`Monto (${payment.currency === "USD" ? "U$S" : "$"})`}>
                            <AmountInput
                              style={styles.input}
                              value={payment.amount}
                              onChange={(n) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "amount", n)
                              }
                            />
                          </Field>
                        </TwoCol>
                        {payment.currency === "USD" && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 8,
                              borderRadius: 8,
                              background: "rgba(6,95,70,0.08)",
                            }}
                          >
                            <TwoCol>
                              <Field label="Cotizacion (a cuanto se tomo el U$S)">
                                <AmountInput
                                  style={styles.input}
                                  value={payment.exchangeRate || 0}
                                  onChange={(n) =>
                                    updatePayment(
                                      selectedApprovedJob.id,
                                      payment.id,
                                      "exchangeRate",
                                      n
                                    )
                                  }
                                />
                              </Field>
                              <Field label="Aplicacion del pago">
                                <label
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "6px 0",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={payment.arsApplied === true}
                                    onChange={(e) =>
                                      updatePayment(
                                        selectedApprovedJob.id,
                                        payment.id,
                                        "arsApplied",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  Descontar del saldo en $ (pesificar)
                                </label>
                              </Field>
                            </TwoCol>
                            {payment.arsApplied === true && Number(payment.exchangeRate || 0) > 0 ? (
                              <div style={{ marginTop: 4, fontSize: 13 }}>
                                Equivale a{" "}
                                <strong>
                                  {money(
                                    Number(payment.amount || 0) * Number(payment.exchangeRate || 0)
                                  )}
                                </strong>{" "}
                                — descuenta del saldo en pesos.
                              </div>
                            ) : (
                              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>
                                Queda como dolar: descuenta del Saldo U$S.
                                {payment.arsApplied === true &&
                                  " Cargá la cotizacion para pesificarlo."}
                              </div>
                            )}
                          </div>
                        )}
                        <div style={styles.uploadActions}>
                          <label style={styles.buttonLikeLabel}>
                            Cargar comprobante
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                uploadApprovedJobFile(
                                  selectedApprovedJob.id,
                                  "payments",
                                  payment.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                          {payment.attachmentName && (
                            <div style={styles.fileName}>{payment.attachmentName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>
              </div>

              <div style={styles.grid2}>
                <Panel
                  title="Adicionales"
                  nested
                  actions={<ButtonLike onClick={() => addAdditional(selectedApprovedJob.id)}>Agregar adicional</ButtonLike>}
                >
                  {selectedApprovedJob.additionals.length === 0 ? (
                    <div style={styles.empty}>
                      No hay adicionales cargados. Funcionan como continuidad del presupuesto original y suman al saldo a cobrar.
                    </div>
                  ) : (
                    <>
                    {selectedApprovedJob.additionals.map((item) => (
                      <div key={item.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeAdditional(selectedApprovedJob.id, item.id)}>
                            Quitar adicional
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={item.date}
                              onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "date", e.target.value)}
                            />
                          </Field>
                          <Field label="Monto neto ($)">
                            <AmountInput
                              style={styles.input}
                              value={item.amount}
                              onChange={(n) => updateAdditional(selectedApprovedJob.id, item.id, "amount", n)}
                            />
                          </Field>
                        </TwoCol>
                        <TwoCol>
                          <Field label="Administracion">
                            <select
                              style={styles.input}
                              value={item.administration || "blanco"}
                              onChange={(e) =>
                                updateAdditional(selectedApprovedJob.id, item.id, "administration", e.target.value)
                              }
                            >
                              <option value="blanco">Blanco (factura IVA)</option>
                              <option value="negro">Negro (sin IVA)</option>
                            </select>
                          </Field>
                          {(item.administration || "blanco") === "blanco" ? (
                            <Field label="IVA %">
                              <input
                                style={styles.input}
                                type="number"
                                min={0}
                                step={0.5}
                                value={item.vatRate ?? 21}
                                onChange={(e) =>
                                  updateAdditional(
                                    selectedApprovedJob.id,
                                    item.id,
                                    "vatRate",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                          ) : (
                            <Field label="IVA">
                              <div style={{ color: "#94a3b8", fontSize: 12, padding: "8px 0" }}>
                                No aplica (negro)
                              </div>
                            </Field>
                          )}
                        </TwoCol>
                        {(() => {
                          const sub = Number(item.amount || 0);
                          const isWhite = (item.administration || "blanco") === "blanco";
                          const iva = isWhite ? sub * (Number(item.vatRate ?? 21) / 100) : 0;
                          return (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 18,
                                fontSize: 13,
                                margin: "2px 0 8px",
                                padding: "8px 10px",
                                background: "rgba(2,6,23,0.04)",
                                borderRadius: 8,
                              }}
                            >
                              <span>Subtotal: <strong>{money(sub)}</strong></span>
                              <span>
                                IVA{isWhite ? ` ${item.vatRate ?? 21}%` : ""}: <strong>{money(iva)}</strong>
                              </span>
                              <span>Total: <strong>{money(sub + iva)}</strong></span>
                              {!isWhite && <span style={{ color: "#94a3b8" }}>(negro, sin IVA)</span>}
                            </div>
                          );
                        })()}
                        <Field label="Descripcion">
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "description", e.target.value)}
                          />
                        </Field>
                        <Field label="Notas">
                          <textarea
                            style={styles.textarea}
                            value={item.notes}
                            onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "notes", e.target.value)}
                          />
                        </Field>
                      </div>
                    ))}
                    {(() => {
                      const sub =
                        (selectedApprovedJob.additionalsWhiteNet || 0) +
                        (selectedApprovedJob.additionalsBlackNet || 0);
                      const iva = selectedApprovedJob.additionalsVat || 0;
                      return (
                        <div
                          style={{
                            borderTop: "2px solid #e2e8f0",
                            marginTop: 6,
                            paddingTop: 10,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 20,
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          <span>Subtotal adicionales: {money(sub)}</span>
                          <span>IVA: {money(iva)}</span>
                          <span>Total c/IVA: {money(sub + iva)}</span>
                        </div>
                      );
                    })()}
                    </>
                  )}
                </Panel>

                <Panel
                  title="Descuentos"
                  nested
                  actions={<ButtonLike onClick={() => addDiscount(selectedApprovedJob.id)}>Agregar descuento</ButtonLike>}
                >
                  {(selectedApprovedJob.discounts || []).length === 0 ? (
                    <div style={styles.empty}>
                      No hay descuentos cargados. Se usan cuando el cliente da de baja algo despues de aprobado o pagado; RESTAN del valor a cobrar.
                    </div>
                  ) : (
                    (selectedApprovedJob.discounts || []).map((item: any) => (
                      <div key={item.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeDiscount(selectedApprovedJob.id, item.id)}>
                            Quitar descuento
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={item.date}
                              onChange={(e) => updateDiscount(selectedApprovedJob.id, item.id, "date", e.target.value)}
                            />
                          </Field>
                          <Field label="Monto">
                            <AmountInput
                              style={styles.input}
                              value={item.amount}
                              onChange={(n) => updateDiscount(selectedApprovedJob.id, item.id, "amount", n)}
                            />
                          </Field>
                        </TwoCol>
                        <Field label="Descripcion">
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) => updateDiscount(selectedApprovedJob.id, item.id, "description", e.target.value)}
                          />
                        </Field>
                        <Field label="Notas">
                          <textarea
                            style={styles.textarea}
                            value={item.notes}
                            onChange={(e) => updateDiscount(selectedApprovedJob.id, item.id, "notes", e.target.value)}
                          />
                        </Field>
                      </div>
                    ))
                  )}
                </Panel>

                <Panel
                  title="Comision"
                  nested
                  actions={<ButtonLike onClick={() => addCommissionPayment(selectedApprovedJob.id)}>Agregar pago de comision</ButtonLike>}
                >
                  <div style={styles.metricGrid}>
                    <MiniMetric label="Comision" value={money(selectedApprovedJob.commissionAmount)} />
                    <MiniMetric label="Pagado" value={money(selectedApprovedJob.commissionPaidTotal)} />
                    <MiniMetric label="Pendiente" value={money(selectedApprovedJob.commissionPending)} />
                  </div>
                  {selectedApprovedJob.commissionPayments.length === 0 ? (
                    <div style={styles.empty}>No hay pagos de comision cargados.</div>
                  ) : (
                    selectedApprovedJob.commissionPayments.map((payment) => (
                      <div key={payment.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeCommissionPayment(selectedApprovedJob.id, payment.id)}>
                            Quitar pago
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={payment.paymentDate}
                              onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "paymentDate", e.target.value)}
                            />
                          </Field>
                          <Field label="Monto">
                            <AmountInput
                              style={styles.input}
                              value={payment.amount}
                              onChange={(n) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "amount", n)}
                            />
                          </Field>
                        </TwoCol>
                        <Field label="Administración (blanco/negro)">
                          <select
                            style={styles.input}
                            value={payment.administration || "blanco"}
                            onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "administration", e.target.value)}
                          >
                            <option value="blanco">Blanco</option>
                            <option value="negro">Negro</option>
                          </select>
                        </Field>
                        <Field label="Nota">
                          <input
                            style={styles.input}
                            value={payment.note}
                            onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "note", e.target.value)}
                          />
                        </Field>
                        <div style={styles.uploadActions}>
                          <label style={styles.buttonLikeLabel}>
                            Cargar comprobante
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                uploadApprovedJobFile(
                                  selectedApprovedJob.id,
                                  "commissionPayments",
                                  payment.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                          {payment.attachmentName && (
                            <div style={styles.fileName}>{payment.attachmentName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>
              </div>

              <Panel
                title="Retenciones"
                nested
                actions={<ButtonLike onClick={() => addRetention(selectedApprovedJob.id)}>Agregar retencion</ButtonLike>}
              >
                {selectedApprovedJob.retentions.length === 0 ? (
                  <div style={styles.empty}>No hay retenciones cargadas.</div>
                ) : (
                  selectedApprovedJob.retentions.map((retention) => (
                    <div key={retention.id} style={styles.subCard}>
                      <div style={styles.inlineActions}>
                        <button style={styles.smallBtn} onClick={() => removeRetention(selectedApprovedJob.id, retention.id)}>
                          Quitar retencion
                        </button>
                      </div>
                      <TwoCol>
                        <Field label="Numero">
                          <input
                            style={styles.input}
                            value={retention.retentionNumber}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "retentionNumber", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Fecha">
                          <input
                            style={styles.input}
                            type="date"
                            value={retention.retentionDate}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "retentionDate", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Tipo">
                          <input
                            style={styles.input}
                            value={retention.retentionType}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "retentionType", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Monto">
                          <AmountInput
                            style={styles.input}
                            value={retention.amount}
                            onChange={(n) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "amount", n)
                            }
                          />
                        </Field>
                      </TwoCol>
                      <div style={styles.uploadActions}>
                        <label style={styles.buttonLikeLabel}>
                          Cargar formulario
                          <input
                            type="file"
                            style={{ display: "none" }}
                            onChange={(e) =>
                              uploadApprovedJobFile(
                                selectedApprovedJob.id,
                                "retentions",
                                retention.id,
                                e.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                        {retention.attachmentName && (
                          <div style={styles.fileName}>{retention.attachmentName}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </Panel>
            </Panel>
          )}
        </div>
  );
}
