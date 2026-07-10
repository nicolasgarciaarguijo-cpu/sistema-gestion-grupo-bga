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
} from "../ui/primitives";
import { money, formatDateDisplay, todayIso } from "../lib/format";
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
          <Panel title="Resumen de compras pendientes" span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Items faltantes" value={String(stockNeedRows.length)} />
              <MiniMetric label="Costo estimado" value={money(totalPurchaseNeed)} />
              <MiniMetric label="Trabajos con fecha limite" value={String(purchaseCalendarRows.length)} />
            </div>
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay compras pendientes detectadas desde stock y trabajos aprobados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresas</th>
                    <th>Material</th>
                    <th>Requerido</th>
                    <th>Stock</th>
                    <th>Faltante</th>
                    <th>Costo estimado</th>
                    <th>Trabajos</th>
                  </tr>
                </thead>
                <tbody>
                  {stockNeedRows.map((row) => (
                    <tr key={row.description}>
                      <td>{row.companyLabels.join(", ")}</td>
                      <td>{row.description}</td>
                      <td>{row.required} {row.unit}</td>
                      <td>{row.available} {row.unit}</td>
                      <td>{row.missing} {row.unit}</td>
                      <td>{money(row.estimatedCost)}</td>
                      <td>{row.jobs.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Resumen administrativo de compras" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturas cargadas" value={String(purchaseInvoiceSummary.invoicesCount)} />
              <MiniMetric label="Carga asistida" value={String(purchaseInvoiceSummary.autoLoadedCount)} />
              <MiniMetric label="Exento" value={money(purchaseInvoiceSummary.exemptAmount)} />
              <MiniMetric label="Neto 21%" value={money(purchaseInvoiceSummary.net21)} />
              <MiniMetric label="IVA credito fiscal" value={money(purchaseInvoiceSummary.vatAmount)} />
              <MiniMetric label="Total compras" value={money(purchaseInvoiceSummary.totalAmount)} />
              <MiniMetric label="Caja chica blanco" value={money(pettyCashSummary.whiteTotal)} />
            </div>
            <div style={styles.noticeBox}>
              Este bloque ya queda armado siguiendo la lógica de sus planillas auxiliares: proveedor, comprobante, moneda, neto gravado, exento e IVA separado para luego exportar al estudio contable.
            </div>
          </Panel>

          <Panel title={`Facturas blancas vinculadas desde caja chica - ${monthLabel(purchaseMonth)}`} span="half">
            {monthPettyCashExpenses.filter((item) => item.administration === "blanco").length === 0 ? (
              <div style={styles.empty}>No hay gastos de caja chica en blanco en {monthLabel(purchaseMonth)} para levantar dentro de compras.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Descripcion</th>
                    <th>Factura</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthPettyCashExpenses
                    .filter((item) => item.administration === "blanco")
                    .map((item) => (
                      <tr key={`pc-white-${item.id}`}>
                        <td>{getCompanyMeta(item.company).short}</td>
                        <td>{formatDateDisplay(item.date)}</td>
                        <td>{item.supplier || "-"}</td>
                        <td>{item.description}</td>
                        <td>{item.invoiceNumber || "-"}</td>
                        <td>{money(item.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
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
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Barra</th>
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
                        <td>{meta.short}</td>
                        <td>{row.budgetNumber}</td>
                        <td>{row.client}</td>
                        <td>{formatDateDisplay(start)}</td>
                        <td>{formatDateDisplay(end)}</td>
                        <td>
                          <div style={styles.ganttTrack}>
                            <div style={{ ...styles.ganttFill, width: `${progressPct}%`, background: meta.primary }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                  <div style={styles.inlineActions}>
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
                      <input style={styles.input} value={invoice.currency} onChange={(e) => updatePurchaseInvoice(invoice.id, "currency", e.target.value)} />
                    </Field>
                    <Field label="Exento">
                      <input style={styles.input} type="number" value={invoice.exemptAmount} onChange={(e) => updatePurchaseInvoice(invoice.id, "exemptAmount", Number(e.target.value))} />
                    </Field>
                    <Field label="Neto 21%">
                      <input style={styles.input} type="number" value={invoice.net21} onChange={(e) => updatePurchaseInvoice(invoice.id, "net21", Number(e.target.value))} />
                    </Field>
                    <Field label="Subtotal">
                      <input style={styles.input} type="number" value={invoice.subtotal} onChange={(e) => updatePurchaseInvoice(invoice.id, "subtotal", Number(e.target.value))} />
                    </Field>
                    <Field label="IVA">
                      <input style={styles.input} type="number" value={invoice.vat} onChange={(e) => updatePurchaseInvoice(invoice.id, "vat", Number(e.target.value))} />
                    </Field>
                    <Field label="Total">
                      <input style={styles.input} type="number" value={invoice.total} onChange={(e) => updatePurchaseInvoice(invoice.id, "total", Number(e.target.value))} />
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
