import React from "react";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, TwoCol, Field } from "../ui/primitives";
import { money, formatDateDisplay } from "../lib/format";
import type { CompanyName, DebtPlan, BankStatementEntry } from "../domain/types";

type CashflowTabProps = {
  cashFlowSummary: any;
  activeAssetsMonthlyDepreciation: number;
  analysisYear: number;
  annualCashFlowEntries: any[];
  bankStatementEntries: any[];
  annualDebtRows: any[];
  bankStatementSummary: any;
  annualCashFlowByMonth: any[];
  getCompanyMeta: (company: CompanyName) => any;
  monthLabel: (month: string) => string;
  COMPANY_OPTIONS: any[];
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  debtPlans: DebtPlan[];
  setDebtPlans: React.Dispatch<React.SetStateAction<DebtPlan[]>>;
  addDebtPlan: () => void;
  removeDebtPlan: (debtId: number) => void;
  annualDebtByMonth: any[];
  operationalMonth: string;
  monthBankStatementEntries: any[];
  addBankStatementEntry: () => void;
  removeBankStatementEntry: (entryId: number) => void;
  updateBankStatementEntry: (
    entryId: number,
    field: keyof BankStatementEntry,
    value: string | number | boolean
  ) => void;
  uploadBankStatementFile: (entryId: number, file: File | null) => void;
};

export function CashflowTab({
  cashFlowSummary,
  activeAssetsMonthlyDepreciation,
  analysisYear,
  annualCashFlowEntries,
  bankStatementEntries,
  annualDebtRows,
  bankStatementSummary,
  annualCashFlowByMonth,
  getCompanyMeta,
  monthLabel,
  COMPANY_OPTIONS,
  updateArrayItem,
  debtPlans,
  setDebtPlans,
  addDebtPlan,
  removeDebtPlan,
  annualDebtByMonth,
  operationalMonth,
  monthBankStatementEntries,
  addBankStatementEntry,
  removeBankStatementEntry,
  updateBankStatementEntry,
  uploadBankStatementFile,
}: CashflowTabProps) {
  return (
        <div style={styles.column}>
          <Panel title="Cash flow y estado de resultados" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturado bruto" value={money(cashFlowSummary.billedGross)} />
              <MiniMetric label="Cobrado" value={money(cashFlowSummary.collected)} />
              <MiniMetric label="Pendiente de cobro" value={money(cashFlowSummary.pendingCollections)} />
              <MiniMetric label="Compras cargadas" value={money(cashFlowSummary.purchaseInvoicesTotal)} />
              <MiniMetric label="Caja chica negro" value={money(cashFlowSummary.pettyCashBlackTotal)} />
              <MiniMetric label="Caja chica blanco" value={money(cashFlowSummary.pettyCashWhiteTotal)} />
              <MiniMetric label="Comisiones pendientes" value={money(cashFlowSummary.commissionsPending)} />
              <MiniMetric label="Amortizacion mensual" value={money(activeAssetsMonthlyDepreciation)} />
            </div>
          </Panel>

          <Panel title="Resultado preliminar" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Ingresos cobrados" value={money(cashFlowSummary.collected)} />
              <MiniMetric label="Compras" value={money(cashFlowSummary.purchaseInvoicesTotal)} />
              <MiniMetric label="Egresos negro" value={money(cashFlowSummary.pettyCashBlackTotal)} />
              <MiniMetric label="Comisiones" value={money(cashFlowSummary.commissionsPending)} />
              <MiniMetric label="Amortizacion" value={money(activeAssetsMonthlyDepreciation)} />
              <MiniMetric label="Creditos bancarios" value={money(cashFlowSummary.bankCredits)} />
              <MiniMetric label="Debitos bancarios" value={money(cashFlowSummary.bankDebits)} />
              <MiniMetric label="Resultado blanco" value={money(cashFlowSummary.operatingResultWhite)} />
              <MiniMetric label="Resultado negro" value={money(cashFlowSummary.operatingResultBlack)} />
              <MiniMetric label="Resultado operativo" value={money(cashFlowSummary.operatingResult)} />
            </div>
            <div style={styles.noticeBox}>
              Esta solapa ya queda preparada como tablero inicial. Luego podemos separar flujo de caja real, devengado, impuestos y estado de resultados por empresa.
            </div>
          </Panel>

          <Panel title={`Calendario anual unificado ${analysisYear}`} span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Eventos del año" value={String(annualCashFlowEntries.length)} />
              <MiniMetric label="Mov. bancarios" value={String(bankStatementEntries.length)} />
              <MiniMetric label="Compromisos deuda" value={String(annualDebtRows.length)} />
              <MiniMetric label="Ultimo saldo banco" value={money(bankStatementSummary.lastBalance)} />
            </div>
            <div style={styles.yearCalendarGrid}>
              {annualCashFlowByMonth.map((month) => (
                <div key={month.key} style={styles.yearCalendarCard}>
                  <div style={styles.yearCalendarTitle}>{month.label}</div>
                  {month.items.length === 0 ? (
                    <div style={styles.calendarEmpty}>Sin movimientos</div>
                  ) : (
                    month.items.slice(0, 10).map((item) => {
                      const companyMetaItem = getCompanyMeta(item.company);
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...styles.yearCalendarEvent,
                            borderLeft: `6px solid ${companyMetaItem.primary}`,
                            background: `${companyMetaItem.soft}`,
                          }}
                        >
                          <div style={styles.yearCalendarEventTitle}>
                            {formatDateDisplay(item.date)} · {item.title}
                          </div>
                          <div style={styles.calendarItemMeta}>
                            {item.kind} · {item.statusLabel}
                            {item.amount ? ` · ${money(item.amount)}` : ""}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {month.items.length > 10 && (
                    <div style={styles.calendarItemMeta}>+ {month.items.length - 10} eventos mas</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Desendeudamiento"
            span="wide"
            actions={<ButtonLike onClick={addDebtPlan}>Agregar compromiso</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric
                label="Deuda proxima"
                value={money(
                  debtPlans.filter((item) => item.active).reduce(
                    (acc, item) => acc + Number(item.nextInstallmentAmount || 0),
                    0
                  )
                )}
              />
              <MiniMetric
                label="Compromisos activos"
                value={String(debtPlans.filter((item) => item.active).length)}
              />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Concepto</th>
                  <th>Dia</th>
                  <th>Proxima cuota</th>
                  <th>Cuotas restantes</th>
                  <th>Prox. vencimiento</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {debtPlans.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input type="checkbox" checked={item.active} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "active", e.target.checked)} />
                    </td>
                    <td>
                      <select style={styles.input} value={item.company} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "company", e.target.value)}>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input style={styles.input} value={item.concept} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "concept", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.dueDay} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "dueDay", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.nextInstallmentAmount} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "nextInstallmentAmount", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.remainingInstallments} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "remainingInstallments", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="date" value={item.nextDueDate} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "nextDueDate", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} value={item.notes} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "notes", e.target.value)} />
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeDebtPlan(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title={`Calendario anual de desendeudamiento ${analysisYear}`} span="wide">
            <div style={styles.yearCalendarGrid}>
              {annualDebtByMonth.map((month) => (
                <div key={month.key} style={styles.yearCalendarCard}>
                  <div style={styles.yearCalendarTitle}>
                    {month.label} · {money(month.total)}
                  </div>
                  {month.items.length === 0 ? (
                    <div style={styles.calendarEmpty}>Sin cuotas</div>
                  ) : (
                    month.items.map((item) => {
                      const companyMetaItem = getCompanyMeta(item.company);
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...styles.yearCalendarEvent,
                            borderLeft: `6px solid ${companyMetaItem.primary}`,
                            background: `${companyMetaItem.soft}`,
                          }}
                        >
                          <div style={styles.yearCalendarEventTitle}>
                            {formatDateDisplay(item.date)} · {item.concept}
                          </div>
                          <div style={styles.calendarItemMeta}>
                            Cuota {item.installmentNumber}/{item.totalInstallments} · {money(item.amount)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title={`Movimientos bancarios - ${monthLabel(operationalMonth)}`}
            span="full"
            actions={<ButtonLike onClick={addBankStatementEntry}>Agregar movimiento</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Ingresos banco" value={money(bankStatementSummary.credits)} />
              <MiniMetric label="Egresos banco" value={money(bankStatementSummary.debits)} />
              <MiniMetric label="Neto banco" value={money(bankStatementSummary.net)} />
              <MiniMetric label="Ultimo saldo" value={money(bankStatementSummary.lastBalance)} />
            </div>
            <div style={styles.noticeBox}>
              Las métricas de arriba son <strong>acumuladas</strong> (todos los meses); la lista de abajo
              muestra solo <strong>{monthLabel(operationalMonth)}</strong> — usá la barra de mes para navegar.
              Este bloque también alimenta el calendario anual de cash flow.
            </div>
            {monthBankStatementEntries.length === 0 ? (
              <div style={styles.empty}>No hay movimientos bancarios en {monthLabel(operationalMonth)}.</div>
            ) : (
              monthBankStatementEntries.map((entry) => (
                <div key={entry.id} style={styles.subCard}>
                  <div style={styles.inlineActions}>
                    <button style={styles.smallBtn} onClick={() => removeBankStatementEntry(entry.id)}>
                      Quitar movimiento
                    </button>
                  </div>
                  <TwoCol>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={entry.company}
                        onChange={(e) => updateBankStatementEntry(entry.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fecha">
                      <input
                        style={styles.input}
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateBankStatementEntry(entry.id, "date", e.target.value)}
                      />
                    </Field>
                    <Field label="Banco">
                      <input
                        style={styles.input}
                        value={entry.bank}
                        onChange={(e) => updateBankStatementEntry(entry.id, "bank", e.target.value)}
                      />
                    </Field>
                    <Field label="Tipo">
                      <select
                        style={styles.input}
                        value={entry.movementType}
                        onChange={(e) =>
                          updateBankStatementEntry(
                            entry.id,
                            "movementType",
                            e.target.value as "credito" | "debito"
                          )
                        }
                      >
                        <option value="credito">Credito</option>
                        <option value="debito">Debito</option>
                      </select>
                    </Field>
                    <Field label="Concepto">
                      <input
                        style={styles.input}
                        value={entry.concept}
                        onChange={(e) => updateBankStatementEntry(entry.id, "concept", e.target.value)}
                      />
                    </Field>
                    <Field label="Monto">
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateBankStatementEntry(entry.id, "amount", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Saldo">
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.balance}
                        onChange={(e) => updateBankStatementEntry(entry.id, "balance", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Carga asistida">
                      <input style={styles.input} value={entry.extractedAutomatically ? "Si" : "Manual"} readOnly />
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea
                      style={styles.textarea}
                      value={entry.notes}
                      onChange={(e) => updateBankStatementEntry(entry.id, "notes", e.target.value)}
                    />
                  </Field>
                  <div style={styles.uploadActions}>
                    <label style={styles.buttonLikeLabel}>
                      Cargar resumen / comprobante
                      <input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => uploadBankStatementFile(entry.id, e.target.files?.[0] || null)}
                      />
                    </label>
                    {entry.attachmentName && <div style={styles.fileName}>{entry.attachmentName}</div>}
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
  );
}
