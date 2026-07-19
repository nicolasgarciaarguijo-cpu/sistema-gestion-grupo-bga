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
} from "../ui/primitives";
import { money, pct, formatDateDisplay } from "../lib/format";
import { resolveAdvancePct } from "../domain/budgetTerms";
import { getPlanoSemaphore, isPlanoPending, comparePlanoUrgency, type PlanoTone } from "../domain/planos";
import type { SemaphoreLevel } from "../ui/theme";
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
  getApprovedJobSourceLabel: (job: any) => string;
  getJobSemaphore: (job: any) => { level: SemaphoreLevel; label: string };
  setSelectedApprovedJobId: React.Dispatch<React.SetStateAction<number | null>>;
  createDirectApprovedJob: () => void;
  importLegacyApprovedJobs: () => void;
  exportPrint: (mode: PrintMode) => void;
  updateApprovedJob: (jobId: number, field: keyof ApprovedJob, value: string | number) => void;
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
  updatePayment: (jobId: number, paymentId: number, field: string, value: string | number) => void;
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

export function AprobadosTab({
  jobSemaphoreSummary,
  approvedJobsSummary,
  companyApprovedSections,
  approvedJobsTimelineRows,
  selectedApprovedJobId,
  selectedApprovedJob,
  getCompanyMeta,
  getApprovedJobSourceLabel,
  getJobSemaphore,
  setSelectedApprovedJobId,
  createDirectApprovedJob,
  importLegacyApprovedJobs,
  exportPrint,
  updateApprovedJob,
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
  // Trabajos con planos de fabricacion pendientes (sin planos o cargados sin confirmar), por urgencia.
  const planosPending = approvedJobsSummary
    .filter((job) => isPlanoPending(job))
    .map((job) => ({ job, sem: getPlanoSemaphore(job, today) }))
    .sort((a, b) => comparePlanoUrgency(a.sem, b.sem));
  return (
        <div style={styles.column}>
          <Panel span="full" title="Semaforo de trabajos">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Finalizados", value: String(jobSemaphoreSummary.verde) },
                { level: "amarillo", label: "En curso / pendientes", value: String(jobSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Sin fecha de inicio", value: String(jobSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>

          <Panel span="full" title="Planos de fabricacion pendientes">
            {planosPending.length === 0 ? (
              <div style={styles.empty}>
                Todos los trabajos activos tienen los planos confirmados.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Empresa</th>
                    <th>Cliente</th>
                    <th>Proyecto</th>
                    <th>Inicio fabricacion</th>
                    <th>Cuenta regresiva</th>
                    <th>Planos</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {planosPending.map(({ job, sem }) => (
                    <tr key={job.id} style={sem.overdue ? { background: "#fef2f2" } : undefined}>
                      <td>
                        <Semaforo level={PLANO_TONE_LEVEL[sem.tone]} size={10} title={sem.label} />
                      </td>
                      <td>{getCompanyMeta(job.company).short}</td>
                      <td>{job.client}</td>
                      <td>{job.project}</td>
                      <td>{formatDateDisplay(job.startDate)}</td>
                      <td>{planoDaysText(sem.daysToStart)}</td>
                      <td>
                        {sem.level === "sin"
                          ? "Sin planos"
                          : `${sem.fileCount} archivo(s), sin confirmar`}
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => setSelectedApprovedJobId(job.id)}>
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

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
              </div>
            }
          >
            {approvedJobsSummary.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Presupuesto</th>
                    <th>Origen</th>
                    <th>Cliente</th>
                    <th>Aprobacion</th>
                    <th>Inicio</th>
                    <th>Entrega</th>
                    <th>Neto presupuesto</th>
                    <th>% facturado</th>
                    <th>Comision</th>
                    <th>Comision pend.</th>
                    <th>Valor a cobrar</th>
                    <th>Cobrado</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Planos</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {companyApprovedSections.map((group) => (
                    <React.Fragment key={group.value}>
                      <tr>
                        <td colSpan={16} style={styles.sectionCell}>
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
                      {group.items.map((job) => (
                        <tr key={job.id} style={job.executionStatus === "finalizado" ? styles.rowGreen : undefined}>
                          <td>{job.isUpdate ? `${job.budgetNumber} · Act. ${job.revisionNumber - 1}` : job.budgetNumber}</td>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                ...(job.sourceType === "from_budget"
                                  ? styles.statusBlue
                                  : job.sourceType === "direct"
                                  ? styles.statusYellow
                                  : styles.statusGray),
                              }}
                            >
                              {getApprovedJobSourceLabel(job)}
                            </span>
                          </td>
                          <td>{job.client}</td>
                          <td>{formatDateDisplay(job.approvalDate)}</td>
                          <td>{formatDateDisplay(job.startDate)}</td>
                          <td>{formatDateDisplay(job.estimatedDeliveryDate)}</td>
                          <td>{money(job.soldNetPrice)}</td>
                          <td>{pct(job.billedPct)}</td>
                          <td>{money(job.commissionAmount)}</td>
                          <td>{money(job.commissionPending)}</td>
                          <td>{money(job.valueToCollect)}</td>
                          <td>{money(job.collectedTotal)}</td>
                          <td>{money(job.remainingToPay)}</td>
                          <td>
                            {(() => {
                              const sj = getJobSemaphore(job);
                              return (
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Semaforo level={sj.level} size={10} title={sj.label} />
                                  <span>{job.executionStatus}</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td>
                            {(() => {
                              const ps = getPlanoSemaphore(job, today);
                              return (
                                <span
                                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                                  title={`${ps.label}${
                                    ps.daysToStart !== null ? " · " + planoDaysText(ps.daysToStart) : ""
                                  }`}
                                >
                                  <Semaforo level={PLANO_TONE_LEVEL[ps.tone]} size={10} title={ps.label} />
                                  <span>
                                    {ps.level === "listo"
                                      ? "Listos"
                                      : ps.level === "proceso"
                                      ? "Sin confirmar"
                                      : "Sin planos"}
                                  </span>
                                </span>
                              );
                            })()}
                          </td>
                          <td>
                            {selectedApprovedJobId === job.id ? (
                              <button style={styles.smallBtn} onClick={() => setSelectedApprovedJobId(null)}>
                                Cerrar
                              </button>
                            ) : (
                              <button style={styles.smallBtn} onClick={() => setSelectedApprovedJobId(job.id)}>
                                Abrir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Evolucion de trabajos" span="full">
            {approvedJobsTimelineRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados para mostrar en la linea de tiempo.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Inicio</th>
                    <th>Entrega</th>
                    <th>Tiempo</th>
                    <th>Estado</th>
                    <th>Compras</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedJobsTimelineRows.map((row) => {
                    const companyMetaRow = getCompanyMeta(row.company);
                    return (
                      <tr key={`timeline-${row.id}`} style={{ background: `${companyMetaRow.soft}33` }}>
                        <td>{companyMetaRow.short}</td>
                        <td>{row.isUpdate ? `${row.budgetNumber} · Act. ${row.revisionNumber - 1}` : row.budgetNumber}</td>
                        <td>{row.client}</td>
                        <td>{formatDateDisplay(row.start)}</td>
                        <td>{formatDateDisplay(row.end)}</td>
                        <td>
                          <div style={styles.timelineBlock}>
                            <div style={styles.timelineLabel}>{row.elapsedDays} / {row.totalDays} dias</div>
                            <div style={styles.ganttTrack}>
                              <div
                                style={{
                                  ...styles.ganttFill,
                                  width: `${row.timeProgressPct}%`,
                                  background: companyMetaRow.primary,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
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
                        <td>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(row.materialMissingCount > 0 ? styles.statusYellow : styles.statusGreen),
                            }}
                          >
                            {row.materialMissingCount > 0
                              ? `${row.materialMissingCount} faltantes`
                              : "Completo"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

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
                <MiniMetric label="Empresa" value={getCompanyMeta(selectedApprovedJob.company).short} />
                <MiniMetric label="Origen" value={getApprovedJobSourceLabel(selectedApprovedJob)} />
                <MiniMetric label="Cliente" value={selectedApprovedJob.client} />
                <MiniMetric label="Aprobacion" value={formatDateDisplay(selectedApprovedJob.approvalDate)} />
                <MiniMetric label="Entrega" value={formatDateDisplay(selectedApprovedJob.deliveryDate)} />
                <MiniMetric label="Neto presupuesto" value={money(selectedApprovedJob.soldNetPrice)} />
                <MiniMetric label="Comision pendiente" value={money(selectedApprovedJob.commissionPending)} />
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
                  </TwoCol>
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
                  <SummaryRow label="Neto factura" value={money(selectedApprovedJob.billedNet)} />
                  <SummaryRow label="Circuito negro" value={money(selectedApprovedJob.blackNet)} />
                  <SummaryRow label="IVA 21%" value={money(selectedApprovedJob.invoiceVatAmount)} />
                  <SummaryRow label="Adicionales" value={money(selectedApprovedJob.additionalsTotal)} />
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
                  <SummaryRow label="Cobrado" value={money(selectedApprovedJob.collectedTotal)} />
                  <SummaryRow label="Saldo" value={money(selectedApprovedJob.remainingToPay)} strong />
                  <SummaryRow label="Comision" value={money(selectedApprovedJob.commissionAmount)} tone="out" />
                  <SummaryRow label="Comision pagada" value={money(selectedApprovedJob.commissionPaidTotal)} tone="out" />
                  <SummaryRow label="Comision pendiente" value={money(selectedApprovedJob.commissionPending)} strong tone="out" />
                </Panel>
              </div>

              <Panel title="Planos y archivos de referencia" nested>
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
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Archivo</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedApprovedJob.workFiles.map((file) => (
                        <tr key={file.id}>
                          <td>{file.kind === "plano" ? "Plano" : "Referencia"}</td>
                          <td>{file.name}</td>
                          <td>
                            <button
                              style={styles.smallBtn}
                              onClick={() => removeApprovedJobWorkFile(selectedApprovedJob.id, file.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

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
                            <input
                              style={styles.input}
                              type="number"
                              value={invoice.subtotal}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "subtotal", Number(e.target.value))
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
                  title="Pagos"
                  nested
                  actions={<ButtonLike onClick={() => addPayment(selectedApprovedJob.id)}>Agregar pago</ButtonLike>}
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
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(payment.administration === "negro" ? styles.adminBlack : styles.adminWhite),
                            }}
                          >
                            {payment.administration === "negro" ? "NEGRO" : "BLANCO"}
                          </span>
                          <button style={styles.smallBtn} onClick={() => exportPaymentReceipt(selectedApprovedJob, payment)}>
                            Recibo
                          </button>
                          <button style={styles.smallBtn} onClick={() => removePayment(selectedApprovedJob.id, payment.id)}>
                            Quitar pago
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
                          <Field label="Monto">
                            <input
                              style={styles.input}
                              type="number"
                              value={payment.amount}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "amount", Number(e.target.value))
                              }
                            />
                          </Field>
                        </TwoCol>
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
                    selectedApprovedJob.additionals.map((item) => (
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
                          <Field label="Monto">
                            <input
                              style={styles.input}
                              type="number"
                              value={item.amount}
                              onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "amount", Number(e.target.value))}
                            />
                          </Field>
                        </TwoCol>
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
                    ))
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
                            <input
                              style={styles.input}
                              type="number"
                              value={item.amount}
                              onChange={(e) => updateDiscount(selectedApprovedJob.id, item.id, "amount", Number(e.target.value))}
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
                            <input
                              style={styles.input}
                              type="number"
                              value={payment.amount}
                              onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "amount", Number(e.target.value))}
                            />
                          </Field>
                        </TwoCol>
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
                          <input
                            style={styles.input}
                            type="number"
                            value={retention.amount}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "amount", Number(e.target.value))
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
