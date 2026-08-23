import { styles } from "../ui/styles";
import {
  Panel,
  SemaforoResumen,
  Semaforo,
  MiniMetric,
  ButtonLike,
  Field,
  TwoCol,
  FileDropButton,
  AmountInput,
  ColorTag,
  PillD,
  MONEY_OUT_COLOR,
} from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
} from "../ui/planilla";
import { money, formatDateDisplay, todayIso } from "../lib/format";
import { purchaseInvoiceMissing } from "../domain/completeness";

// Procedencia efectiva de una factura de compra: con numero de factura es SIEMPRE blanco (una factura
// no puede ser negra); si no, manda el campo administracion. Mismo criterio que el select de la ficha.
const invoiceOrigin = (invoice: { invoiceNumber?: string; administration?: string }): "blanco" | "negro" =>
  invoice.invoiceNumber?.trim() ? "blanco" : invoice.administration === "negro" ? "negro" : "blanco";
import type { CompanyName, PurchaseInvoice } from "../domain/types";

type ComprasTabProps = {
  stockSemaphoreSummary: any;
  purchaseDeadlineSemaphore: any;
  stockNeedRows: any[];
  totalPurchaseNeed: number;
  purchaseCalendarRows: any[];
  purchaseInvoiceSummary: any;
  pettyCashSummary: any;
  monthPettyCashExpenses: any[];
  purchaseMonth: string;
  purchaseMonthData: any;
  purchaseItemsByDate: Map<string, any[]>;
  approvedJobsSummary: any[];
  monthPurchaseInvoices: PurchaseInvoice[];
  monthLabel: (month: string) => string;
  getCompanyMeta: (company: CompanyName) => any;
  COMPANY_OPTIONS: any[];
  shiftPurchaseMonth: (delta: number) => void;
  addPurchaseInvoice: () => void;
  removePurchaseInvoice: (invoiceId: number) => void;
  updatePurchaseInvoice: (
    invoiceId: number,
    field: keyof PurchaseInvoice,
    value: string | number | boolean
  ) => void;
  uploadPurchaseInvoiceFile: (invoiceId: number, file: File | null) => void;
};

export function ComprasTab({
  stockSemaphoreSummary,
  purchaseDeadlineSemaphore,
  stockNeedRows,
  totalPurchaseNeed,
  purchaseCalendarRows,
  purchaseInvoiceSummary,
  pettyCashSummary,
  monthPettyCashExpenses,
  purchaseMonth,
  purchaseMonthData,
  purchaseItemsByDate,
  approvedJobsSummary,
  monthPurchaseInvoices,
  monthLabel,
  getCompanyMeta,
  COMPANY_OPTIONS,
  shiftPurchaseMonth,
  addPurchaseInvoice,
  removePurchaseInvoice,
  updatePurchaseInvoice,
  uploadPurchaseInvoiceFile,
}: ComprasTabProps) {
  const anchosFaltantes = usePlanillaWidths("compras.faltantes", { label: 300, col: 106, colCompact: 82 });
  const anchosCajaBlanca = usePlanillaWidths("compras.cajablanca", { label: 300, col: 118, colCompact: 90 });
  const anchosLimite = usePlanillaWidths("compras.limite", { label: 300, col: 118, colCompact: 90 });

  return (
        <div style={styles.column}>
          <Panel span="wide" title="Semaforo de compras">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Materiales cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Compra parcial", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
            <div style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Semaforo level={purchaseDeadlineSemaphore.level} size={24} ring />
              <div>
                <div style={styles.metricLabel}>Fechas limite de compra</div>
                <div style={{ fontWeight: 700 }}>{purchaseDeadlineSemaphore.label}</div>
              </div>
            </div>
          </Panel>
          <Panel title="Resumen de compras pendientes" span="full">
            <div style={styles.metricGrid}>
              <MiniMetric label="Items faltantes" value={String(stockNeedRows.length)} />
              <MiniMetric label="Costo estimado" value={money(totalPurchaseNeed)} />
              <MiniMetric label="Trabajos con fecha limite" value={String(purchaseCalendarRows.length)} />
            </div>
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay compras pendientes detectadas desde stock y trabajos aprobados.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosFaltantes.vars }}>
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
                    <th style={{ ...thColumna, textAlign: "right" }}>Faltante</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Costo estimado</th>
                    <th style={thFlexible}>Trabajos · empresas</th>
                  </tr>
                </thead>
                <tbody>
                  {stockNeedRows.map((row) => {
                    const estado = row.missing === 0 ? "#16a34a" : row.available > 0 ? "#ca8a04" : "#dc2626";
                    return (
                    <tr key={row.description}>
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={row.description}>
                        <span
                          title={row.missing === 0 ? "Completo" : row.available > 0 ? "Parcial" : "Hay que comprar todo"}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                            background: estado,
                          }}
                        />
                        {row.description}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right" }}>
                        {row.required} <span style={{ color: "#94a3b8" }}>{row.unit}</span>
                        <span style={{ color: "#94a3b8" }}> · hay {row.available}</span>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: estado }}>
                        {row.missing} <span style={{ color: "#94a3b8", fontWeight: 400 }}>{row.unit}</span>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 600 }}>{money(row.estimatedCost)}</td>
                      <td
                        style={{ ...tdFlexible, color: "#64748b" }}
                        title={`${row.jobs.join(", ")} · ${row.companyLabels.join(", ")}`}
                      >
                        {row.jobs.join(", ")}
                        <span style={{ color: "#94a3b8" }}> · {row.companyLabels.join(", ")}</span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Panel>

          <Panel title="Resumen administrativo de compras" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturas cargadas" value={String(purchaseInvoiceSummary.invoicesCount)} />
              <MiniMetric label="Carga asistida" value={String(purchaseInvoiceSummary.autoLoadedCount)} />
              <MiniMetric label="Exento" value={money(purchaseInvoiceSummary.exemptAmount)} tone="out" />
              <MiniMetric label="Neto 21%" value={money(purchaseInvoiceSummary.net21)} tone="out" />
              <MiniMetric label="IVA credito fiscal" value={money(purchaseInvoiceSummary.vatAmount)} tone="out" />
              <MiniMetric label="Total compras" value={money(purchaseInvoiceSummary.totalAmount)} tone="out" />
              {Number(purchaseInvoiceSummary.usdTotalAmount || 0) > 0 && (
                <MiniMetric
                  label="Total compras U$S"
                  value={money(purchaseInvoiceSummary.usdTotalAmount, "USD")}
                  tone="out"
                />
              )}
              <MiniMetric label="Caja chica blanco" value={money(pettyCashSummary.whiteTotal)} tone="out" />
            </div>
            <div style={styles.noticeBox}>
              Este bloque ya queda armado siguiendo la lógica de sus planillas auxiliares: proveedor, comprobante, moneda, neto gravado, exento e IVA separado para luego exportar al estudio contable.
            </div>
          </Panel>

          <Panel title={`Facturas blancas vinculadas desde caja chica - ${monthLabel(purchaseMonth)}`} span="full">
            {monthPettyCashExpenses.filter((item) => item.administration === "blanco").length === 0 ? (
              <div style={styles.empty}>No hay gastos de caja chica en blanco en {monthLabel(purchaseMonth)} para levantar dentro de compras.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosCajaBlanca.vars }}>
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
                      Descripción
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCajaBlanca.startResize(ev, "label")}
                        onDoubleClick={anchosCajaBlanca.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Total
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCajaBlanca.startResize(ev, "col")}
                        onDoubleClick={anchosCajaBlanca.resetCol}
                      />
                    </th>
                    <th style={thColumna}>Fecha</th>
                    <th style={thFlexible}>Proveedor · factura · empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {monthPettyCashExpenses
                    .filter((item) => item.administration === "blanco")
                    .map((item) => (
                      <tr key={`pc-white-${item.id}`}>
                        <td
                          style={{
                            ...tdNombre, fontWeight: 400,
                            boxShadow: `inset 4px 0 0 ${getCompanyMeta(item.company).primary}`,
                          }}
                          title={item.description}
                        >
                          {item.description}
                        </td>
                        <td style={{ ...tdDato, ...styles.amountOut, textAlign: "right", fontWeight: 700 }}>
                          {money(item.amount)}
                        </td>
                        <td style={{ ...tdDato, color: "#475569" }}>{formatDateDisplay(item.date)}</td>
                        <td style={{ ...tdFlexible, color: "#64748b" }}>
                          {item.supplier || "sin proveedor"}
                          <span style={{ color: "#94a3b8" }}>
                            {" · "}{item.invoiceNumber || "sin factura"}
                            {" · "}{getCompanyMeta(item.company).short}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>

          <Panel
            title="Calendario de fechas limite de compra"
            span="wide"
            actions={
              <div style={styles.monthToolbar}>
                <ButtonLike onClick={() => shiftPurchaseMonth(-1)} secondary>Mes anterior</ButtonLike>
                <div style={styles.calendarMonthLabel}>{purchaseMonthData.label}</div>
                <ButtonLike onClick={() => shiftPurchaseMonth(1)} secondary>Mes siguiente</ButtonLike>
              </div>
            }
          >
            <div style={styles.calendarWeekdays}>
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                <div key={day} style={styles.calendarWeekdayCell}>{day}</div>
              ))}
            </div>
            <div style={styles.calendarGrid}>
              {purchaseMonthData.cells.map((cell) => {
                const items = purchaseItemsByDate.get(cell.date) ?? [];
                return (
                  <div
                    key={cell.date}
                    style={{
                      ...styles.calendarCell,
                      ...(cell.inCurrentMonth ? {} : styles.calendarCellMuted),
                    }}
                  >
                    <div style={styles.calendarCellHeader}>
                      <strong>{cell.day}</strong>
                    </div>
                    {items.length === 0 ? (
                      <div style={styles.calendarEmpty}>Sin fecha</div>
                    ) : (
                      items.map((item) => {
                        const meta = getCompanyMeta(item.company);
                        return (
                          <div
                            key={`${item.id}-${item.deadlineDate}`}
                            style={{
                              ...styles.calendarItem,
                              background: `${meta.soft}`,
                              color: meta.primary,
                              borderLeft: `8px solid ${meta.primary}`,
                            }}
                          >
                            <div><strong>{item.budgetNumber}</strong></div>
                            <div>{item.client}</div>
                            <div style={styles.calendarItemMeta}>{item.missingCount} faltantes</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Gantt de compras" span="full">
            {purchaseCalendarRows.length === 0 ? (
              <div style={styles.empty}>Carga fechas de inicio de fabricacion para ver el avance de compras.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosLimite.vars }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
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
                    <th style={thColumna}>
                      Fecha límite
                      <PlanillaManija
                        onMouseDown={(ev) => anchosLimite.startResize(ev, "col")}
                        onDoubleClick={anchosLimite.resetCol}
                      />
                    </th>
                    <th style={thFlexible}>Avance desde la aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseCalendarRows.map((row) => {
                    const job = approvedJobsSummary.find((item) => item.id === row.id);
                    const start = job?.approvalDate || row.deadlineDate;
                    const end = row.deadlineDate;
                    const totalDays = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
                    const elapsedDays = Math.max(0, Math.ceil((new Date(todayIso()).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
                    const progressPct = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
                    const meta = getCompanyMeta(row.company);
                    return (
                      <tr key={`gantt-purchase-${row.id}`}>
                        <td
                          style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${meta.primary}` }}
                          title={`${row.budgetNumber} · ${row.client}`}
                        >
                          <strong style={{ color: "#0f172a" }}>{row.budgetNumber}</strong>{" "}
                          <span style={{ color: "#475569" }}>{row.client}</span>
                        </td>
                        <td
                          style={{
                            ...tdDato, fontWeight: 600,
                            color: progressPct >= 100 ? "#dc2626" : progressPct >= 80 ? "#ca8a04" : "#475569",
                          }}
                        >
                          {formatDateDisplay(end)}
                        </td>
                        <td style={{ ...tdFlexible, padding: "2px 8px" }}>
                          <div style={styles.ganttTrack}>
                            <div style={{ ...styles.ganttFill, width: `${progressPct}%`, background: meta.primary }} />
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            desde {formatDateDisplay(start)} · {elapsedDays} de {totalDays} días · {meta.short}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Panel>

          <Panel
            title={`Facturas de compra - ${monthLabel(purchaseMonth)}`}
            actions={<ButtonLike onClick={addPurchaseInvoice}>Agregar factura</ButtonLike>}
          >
            <div style={styles.noticeBox}>
              Mostrando las facturas de <strong>{monthLabel(purchaseMonth)}</strong> — usá la barra de mes para navegar.
              Puedes cargar una imagen o PDF y dejar que el sistema precomplete una base editable. Después podremos mejorar esta lectura automática con OCR más fino.
            </div>
            {monthPurchaseInvoices.length === 0 ? (
              <div style={styles.empty}>No hay facturas de compra cargadas en {monthLabel(purchaseMonth)}.</div>
            ) : (
              monthPurchaseInvoices.map((invoice) => (
                <div key={invoice.id} style={styles.subCard}>
                  <div style={{ ...styles.inlineActions, justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {purchaseInvoiceMissing(invoice).length > 0 && (
                        <PillD missing={purchaseInvoiceMissing(invoice)} />
                      )}
                      <strong style={{ fontSize: 14 }}>{invoice.supplier || "Proveedor sin nombre"}</strong>
                      <span style={{ color: MONEY_OUT_COLOR, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {money(
                          Number(invoice.total || 0),
                          String(invoice.currency || "").toUpperCase() === "USD" ? "USD" : "ARS"
                        )}
                        <ColorTag color={invoiceOrigin(invoice)} />
                      </span>
                    </span>
                    <button style={styles.smallBtn} onClick={() => removePurchaseInvoice(invoice.id)}>
                      Quitar factura
                    </button>
                  </div>
                  <TwoCol>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={invoice.company}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Administracion">
                      <select
                        style={styles.input}
                        value={invoice.invoiceNumber.trim() ? "blanco" : invoice.administration}
                        disabled={!!invoice.invoiceNumber.trim()}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "administration", e.target.value)}
                      >
                        <option value="blanco">Blanco</option>
                        <option value="negro">Negro</option>
                      </select>
                      {invoice.invoiceNumber.trim() ? (
                        <div style={{ ...styles.muted, fontSize: 11, marginTop: 2 }}>
                          Con factura = blanco (una factura no puede ser negra).
                        </div>
                      ) : null}
                    </Field>
                    <Field label="Origen">
                      <input style={styles.input} value={invoice.source} readOnly />
                    </Field>
                    <Field label="Proveedor">
                      <input style={styles.input} value={invoice.supplier} onChange={(e) => updatePurchaseInvoice(invoice.id, "supplier", e.target.value)} />
                    </Field>
                    <Field label="CUIT / CUIL">
                      <input style={styles.input} value={invoice.taxId} onChange={(e) => updatePurchaseInvoice(invoice.id, "taxId", e.target.value)} />
                    </Field>
                    <Field label="Tipo de comprobante">
                      <input style={styles.input} value={invoice.receiptKind} onChange={(e) => updatePurchaseInvoice(invoice.id, "receiptKind", e.target.value)} />
                    </Field>
                    <Field label="Letra / tipo">
                      <input style={styles.input} value={invoice.receiptLetter} onChange={(e) => updatePurchaseInvoice(invoice.id, "receiptLetter", e.target.value)} />
                    </Field>
                    <Field label="Numero">
                      <input
                        style={styles.input}
                        value={invoice.invoiceNumber}
                        onChange={(e) => {
                          updatePurchaseInvoice(invoice.id, "invoiceNumber", e.target.value);
                          if (e.target.value.trim())
                            updatePurchaseInvoice(invoice.id, "administration", "blanco");
                        }}
                      />
                    </Field>
                    <Field label="Fecha">
                      <input style={styles.input} type="date" value={invoice.invoiceDate} onChange={(e) => updatePurchaseInvoice(invoice.id, "invoiceDate", e.target.value)} />
                    </Field>
                    <Field label="Moneda">
                      <select
                        style={styles.input}
                        value={String(invoice.currency || "").toUpperCase() === "USD" ? "USD" : "ARS"}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "currency", e.target.value)}
                      >
                        <option value="ARS">$ Pesos</option>
                        <option value="USD">U$S Dolares</option>
                      </select>
                    </Field>
                    <Field label="Exento">
                      <AmountInput style={styles.input} value={invoice.exemptAmount} onChange={(n) => updatePurchaseInvoice(invoice.id, "exemptAmount", n)} />
                    </Field>
                    <Field label="Neto 21%">
                      <AmountInput style={styles.input} value={invoice.net21} onChange={(n) => updatePurchaseInvoice(invoice.id, "net21", n)} />
                    </Field>
                    <Field label="Subtotal">
                      <AmountInput style={styles.input} value={invoice.subtotal} onChange={(n) => updatePurchaseInvoice(invoice.id, "subtotal", n)} />
                    </Field>
                    <Field label="IVA">
                      <AmountInput style={styles.input} value={invoice.vat} onChange={(n) => updatePurchaseInvoice(invoice.id, "vat", n)} />
                    </Field>
                    <Field label="Total">
                      <AmountInput style={styles.input} value={invoice.total} onChange={(n) => updatePurchaseInvoice(invoice.id, "total", n)} />
                    </Field>
                    <Field label="Carga automatica">
                      <input style={styles.input} value={invoice.extractedAutomatically ? "Si" : "Manual"} readOnly />
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea style={styles.textarea} value={invoice.notes} onChange={(e) => updatePurchaseInvoice(invoice.id, "notes", e.target.value)} />
                  </Field>
                  <div style={styles.uploadActions}>
                    <FileDropButton
                      label="Cargar imagen o PDF"
                      fileName={invoice.attachmentName}
                      onFileSelected={(file) => uploadPurchaseInvoiceFile(invoice.id, file)}
                    />
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
  );
}
