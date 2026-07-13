import React from "react";
import { styles } from "../ui/styles";
import { Panel, SemaforoResumen, ButtonLike } from "../ui/primitives";
import { money } from "../lib/format";

// AFIP devuelve el vencimiento del CAE como AAAAMMDD; lo paso a DD/MM/AAAA.
const fmtCaeVto = (v?: string): string =>
  v && v.length === 8 ? `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}` : v || "-";
import type { CompanyName } from "../domain/types";

// Solapa "Emitir facturas": junta el resumen de facturas pendientes de emitir en AFIP (de todos los
// trabajos aprobados) y el boton de emision. Gateada por permiso (solo quien tiene acceso a esta
// solapa puede emitir). La carga de facturas es doble: aca o en Trabajos aprobados (misma data).
type EmitirFacturasTabProps = {
  approvedJobsSummary: any[];
  getCompanyMeta: (company: CompanyName) => any;
  emitInvoiceAfip: (jobId: number, invoiceId: number) => void;
  addInvoice: (jobId: number) => void;
  openJob: (jobId: number) => void;
};

export function EmitirFacturasTab({
  approvedJobsSummary,
  getCompanyMeta,
  emitInvoiceAfip,
  addInvoice,
  openJob,
}: EmitirFacturasTabProps) {
  const allInvoices = approvedJobsSummary.flatMap((job) =>
    (job.invoices || []).map((inv: any) => ({ job, inv }))
  );
  const pending = allInvoices.filter(({ inv }) => !inv.afipCae);
  const emitted = allInvoices.filter(({ inv }) => inv.afipCae);
  const jobsWithout = approvedJobsSummary.filter(
    (job) => job.executionStatus !== "finalizado" && (job.invoices || []).length === 0
  );

  const jobLabel = (job: any) =>
    `${job.budgetNumber || "-"}${job.project ? " · " + job.project : ""}`;
  const tipoLabel = (inv: any) =>
    (inv.invoiceType || "").trim().toUpperCase().startsWith("A") ? "A" : "B";

  return (
    <div style={styles.column}>
      <Panel span="full" title="Semaforo de emision">
        <SemaforoResumen
          items={[
            { level: "rojo", label: "Facturas por emitir", value: String(pending.length) },
            { level: "amarillo", label: "Trabajos sin factura cargada", value: String(jobsWithout.length) },
            { level: "verde", label: "Emitidas en AFIP", value: String(emitted.length) },
          ]}
        />
        <div style={{ ...styles.noticeBox, marginTop: 4 }}>
          Emision en <strong>homologacion</strong> (entorno de prueba de AFIP, sin validez fiscal). Solo los
          usuarios con acceso a esta solapa pueden emitir. La factura se puede cargar aca o en Trabajos
          aprobados: es la misma informacion.
        </div>
      </Panel>

      <Panel span="full" title="Facturas pendientes de emitir">
        {pending.length === 0 ? (
          <div style={styles.empty}>No hay facturas cargadas pendientes de emitir. 👍</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Cliente</th>
                <th>Trabajo</th>
                <th>Tipo</th>
                <th>Neto</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(({ job, inv }) => (
                <tr key={`${job.id}-${inv.id}`}>
                  <td>{getCompanyMeta(job.company).short}</td>
                  <td>{job.client}</td>
                  <td>{jobLabel(job)}</td>
                  <td>{tipoLabel(inv)}</td>
                  <td>{money(Number(inv.subtotal || 0))}</td>
                  <td>{money(Number(inv.vat || 0))}</td>
                  <td>{money(Number(inv.total || 0))}</td>
                  <td>
                    <div style={styles.inlineActions}>
                      <ButtonLike onClick={() => emitInvoiceAfip(job.id, inv.id)}>
                        Emitir en AFIP
                      </ButtonLike>
                      <button style={styles.smallBtn} onClick={() => openJob(job.id)}>
                        Abrir trabajo
                      </button>
                    </div>
                    {inv.afipError ? (
                      <div style={{ color: "#dc2626", marginTop: 4, fontSize: 12 }}>⚠️ {inv.afipError}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel span="full" title="Trabajos aprobados sin factura cargada">
        {jobsWithout.length === 0 ? (
          <div style={styles.empty}>Todos los trabajos activos tienen al menos una factura cargada.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Cliente</th>
                <th>Trabajo</th>
                <th>Valor a cobrar</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {jobsWithout.map((job) => (
                <tr key={job.id}>
                  <td>{getCompanyMeta(job.company).short}</td>
                  <td>{job.client}</td>
                  <td>{jobLabel(job)}</td>
                  <td>{money(Number(job.valueToCollect || 0))}</td>
                  <td>
                    <div style={styles.inlineActions}>
                      <ButtonLike
                        onClick={() => {
                          addInvoice(job.id);
                          openJob(job.id);
                        }}
                      >
                        Agregar factura
                      </ButtonLike>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel span="full" title="Facturas emitidas en AFIP">
        {emitted.length === 0 ? (
          <div style={styles.empty}>Todavia no se emitio ninguna factura desde el sistema.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Cliente</th>
                <th>Trabajo</th>
                <th>Comprobante</th>
                <th>CAE</th>
                <th>Vto CAE</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {emitted.map(({ job, inv }) => (
                <tr key={`${job.id}-${inv.id}`} style={styles.rowGreen}>
                  <td>{getCompanyMeta(job.company).short}</td>
                  <td>{job.client}</td>
                  <td>{jobLabel(job)}</td>
                  <td>
                    {tipoLabel(inv)} {String(inv.afipPtoVta ?? 0).padStart(4, "0")}-
                    {String(inv.afipCbteNro ?? 0).padStart(8, "0")}
                    {inv.afipEnv === "homo" ? " (homolog.)" : ""}
                  </td>
                  <td>{inv.afipCae}</td>
                  <td>{fmtCaeVto(inv.afipCaeVto)}</td>
                  <td>{money(Number(inv.total || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
