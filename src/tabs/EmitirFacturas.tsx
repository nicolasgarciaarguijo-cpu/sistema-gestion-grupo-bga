import React from "react";
import { styles } from "../ui/styles";
import { Panel, SemaforoResumen, ButtonLike } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
} from "../ui/planilla";
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

  const anchosPendientes = usePlanillaWidths("emitir.pendientes", { label: 300, col: 116, colCompact: 88 });
  const anchosSinFactura = usePlanillaWidths("emitir.sinfactura", { label: 300, col: 130, colCompact: 100 });
  const anchosEmitidas = usePlanillaWidths("emitir.emitidas", { label: 300, col: 130, colCompact: 100 });

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
          <div style={{ ...planillaWrap, ...anchosPendientes.vars }}>
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
                  Cliente · trabajo
                  <PlanillaManija
                    onMouseDown={(ev) => anchosPendientes.startResize(ev, "label")}
                    onDoubleClick={anchosPendientes.resetLabel}
                  />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Total
                  <PlanillaManija
                    onMouseDown={(ev) => anchosPendientes.startResize(ev, "col")}
                    onDoubleClick={anchosPendientes.resetCol}
                  />
                </th>
                <th style={thColumna}>Tipo</th>
                <th style={thFlexible}>Neto · IVA · empresa</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(({ job, inv }) => (
                <tr key={`${job.id}-${inv.id}`}>
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400,
                      boxShadow: `inset 4px 0 0 ${getCompanyMeta(job.company).primary}`,
                    }}
                    title={`${job.client} · ${jobLabel(job)}`}
                  >
                    <strong style={{ color: "#0f172a" }}>{job.client}</strong>{" "}
                    <span style={{ color: "#475569" }}>{jobLabel(job)}</span>
                    <div style={{ marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <ButtonLike onClick={() => emitInvoiceAfip(job.id, inv.id)}>Emitir en AFIP</ButtonLike>
                      <button style={styles.smallBtn} onClick={() => openJob(job.id)}>
                        Abrir trabajo
                      </button>
                    </div>
                  </td>
                  <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                    {money(Number(inv.total || 0))}
                  </td>
                  <td style={{ ...tdDato, color: "#475569" }}>{tipoLabel(inv)}</td>
                  <td style={{ ...tdFlexible, color: "#64748b" }}>
                    neto {money(Number(inv.subtotal || 0))}
                    <span style={{ color: "#94a3b8" }}>
                      {" · IVA "}{money(Number(inv.vat || 0))}
                      {" · "}{getCompanyMeta(job.company).short}
                    </span>
                    {inv.afipError ? (
                      <div style={{ color: "#dc2626", marginTop: 4, fontSize: 12 }}>⚠️ {inv.afipError}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      <Panel span="full" title="Trabajos aprobados sin factura cargada">
        {jobsWithout.length === 0 ? (
          <div style={styles.empty}>Todos los trabajos activos tienen al menos una factura cargada.</div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosSinFactura.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Cliente · trabajo
                  <PlanillaManija
                    onMouseDown={(ev) => anchosSinFactura.startResize(ev, "label")}
                    onDoubleClick={anchosSinFactura.resetLabel}
                  />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Valor a cobrar
                  <PlanillaManija
                    onMouseDown={(ev) => anchosSinFactura.startResize(ev, "col")}
                    onDoubleClick={anchosSinFactura.resetCol}
                  />
                </th>
                <th style={thFlexible}>Empresa</th>
              </tr>
            </thead>
            <tbody>
              {jobsWithout.map((job) => (
                <tr
                  key={job.id}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    addInvoice(job.id);
                    openJob(job.id);
                  }}
                  title="Click derecho: agregar una factura a este trabajo"
                >
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400,
                      boxShadow: `inset 4px 0 0 ${getCompanyMeta(job.company).primary}`,
                    }}
                    title={`${job.client} · ${jobLabel(job)}`}
                  >
                    <strong style={{ color: "#0f172a" }}>{job.client}</strong>{" "}
                    <span style={{ color: "#475569" }}>{jobLabel(job)}</span>
                  </td>
                  <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                    {money(Number(job.valueToCollect || 0))}
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b" }}>
                    {getCompanyMeta(job.company).short}
                    <ButtonLike
                      onClick={() => {
                        addInvoice(job.id);
                        openJob(job.id);
                      }}
                    >
                      Agregar factura
                    </ButtonLike>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      <Panel span="full" title="Facturas emitidas en AFIP">
        {emitted.length === 0 ? (
          <div style={styles.empty}>Todavia no se emitio ninguna factura desde el sistema.</div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosEmitidas.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Cliente · trabajo
                  <PlanillaManija
                    onMouseDown={(ev) => anchosEmitidas.startResize(ev, "label")}
                    onDoubleClick={anchosEmitidas.resetLabel}
                  />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Total
                  <PlanillaManija
                    onMouseDown={(ev) => anchosEmitidas.startResize(ev, "col")}
                    onDoubleClick={anchosEmitidas.resetCol}
                  />
                </th>
                <th style={thFlexible}>Comprobante · CAE · vencimiento · empresa</th>
              </tr>
            </thead>
            <tbody>
              {emitted.map(({ job, inv }) => (
                <tr key={`${job.id}-${inv.id}`}>
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400,
                      boxShadow: `inset 4px 0 0 ${getCompanyMeta(job.company).primary}`,
                    }}
                    title={`${job.client} · ${jobLabel(job)}`}
                  >
                    <span
                      title="Emitida en AFIP"
                      style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                        background: "#16a34a",
                      }}
                    />
                    <strong style={{ color: "#0f172a" }}>{job.client}</strong>{" "}
                    <span style={{ color: "#475569" }}>{jobLabel(job)}</span>
                  </td>
                  <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                    {money(Number(inv.total || 0))}
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b" }}>
                    {tipoLabel(inv)} {String(inv.afipPtoVta ?? 0).padStart(4, "0")}-
                    {String(inv.afipCbteNro ?? 0).padStart(8, "0")}
                    {inv.afipEnv === "homo" ? " (homolog.)" : ""}
                    <span style={{ color: "#94a3b8" }}>
                      {" · CAE "}{inv.afipCae}
                      {" · vence "}{fmtCaeVto(inv.afipCaeVto)}
                      {" · "}{getCompanyMeta(job.company).short}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
