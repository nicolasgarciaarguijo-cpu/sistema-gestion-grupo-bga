import React from "react";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, TwoCol, Field } from "../ui/primitives";
import { money, formatDateDisplay } from "../lib/format";
import type { CompanyName, DebtPlan, BankStatementEntry } from "../domain/types";

// Tile de balance: blanco claro / negro oscuro para diferenciar las administraciones de un vistazo.
function BalanceTile({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "white" | "black" | "warn" | "strong" | "plain";
}) {
  const toneStyle: React.CSSProperties =
    tone === "black"
      ? { background: "#1f2937" }
      : tone === "white"
      ? { background: "#f8fafc" }
      : tone === "warn"
      ? { background: "#fffbeb", border: "1px solid #fde68a" }
      : tone === "strong"
      ? { background: "#eff6ff", border: "1px solid #bfdbfe" }
      : {};
  const dark = tone === "black";
  return (
    <div style={{ ...styles.metric, ...toneStyle }}>
      <div style={{ ...styles.metricLabel, color: dark ? "#cbd5e1" : styles.metricLabel.color }}>
        {label}
      </div>
      <div style={{ ...styles.metricValue, color: dark ? "#f9fafb" : styles.metricValue.color }}>
        {value}
      </div>
    </div>
  );
}

// Fila compacta etiqueta -> valor (lista vertical). tone="out" = sale plata (rojo); strong = total.
function StatRow({
  label,
  value,
  tone,
  strong,
  last,
}: {
  label: string;
  value: string;
  tone?: "out";
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        padding: "5px 0",
        borderBottom: last ? "none" : "1px solid #f1f5f9",
      }}
    >
      <span style={{ fontSize: 13, color: "#475569", minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: strong ? 700 : 400,
          color: tone === "out" ? "#dc2626" : "#0f172a",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const balanceGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
  marginBottom: 12,
};
const balanceSection: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "#475569",
  textTransform: "uppercase",
  margin: "4px 0 6px",
};
const MONTH_OPTIONS = [
  { value: 1, label: "enero" },
  { value: 2, label: "febrero" },
  { value: 3, label: "marzo" },
  { value: 4, label: "abril" },
  { value: 5, label: "mayo" },
  { value: 6, label: "junio" },
  { value: 7, label: "julio" },
  { value: 8, label: "agosto" },
  { value: 9, label: "septiembre" },
  { value: 10, label: "octubre" },
  { value: 11, label: "noviembre" },
  { value: 12, label: "diciembre" },
];

type CashflowTabProps = {
  cashFlowSummary: any;
  accountingResults: any;
  billingBalance: any;
  periodStatement: any;
  balanceCompanyScope: string;
  setBalanceCompanyScope: (scope: string) => void;
  balancePeriodMode: "fiscalYear" | "month" | "all";
  setBalancePeriodMode: (mode: "fiscalYear" | "month" | "all") => void;
  balanceFiscalStartYear: number;
  setBalanceFiscalStartYear: (year: number) => void;
  balanceMonth: string;
  setBalanceMonth: (ym: string) => void;
  balanceFiscalYearOptions: { value: number; label: string }[];
  updateCompanyFiscalStartMonth: (companyValue: string, month: number) => void;
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
  accountingResults,
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
  billingBalance,
  periodStatement,
  balanceCompanyScope,
  setBalanceCompanyScope,
  balancePeriodMode,
  setBalancePeriodMode,
  balanceFiscalStartYear,
  setBalanceFiscalStartYear,
  balanceMonth,
  setBalanceMonth,
  balanceFiscalYearOptions,
  updateCompanyFiscalStartMonth,
}: CashflowTabProps) {
  return (
        <div style={styles.column}>
          <Panel title="Balance · facturacion y cobranza" span="wide">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
              <Field label="Empresa">
                <select
                  style={styles.input}
                  value={balanceCompanyScope}
                  onChange={(e) => setBalanceCompanyScope(e.target.value)}
                >
                  <option value="__ALL__">Todas</option>
                  {COMPANY_OPTIONS.map((company) => (
                    <option key={company.value} value={company.value}>
                      {company.short || company.value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Periodo">
                <select
                  style={styles.input}
                  value={balancePeriodMode}
                  onChange={(e) => setBalancePeriodMode(e.target.value as "fiscalYear" | "month" | "all")}
                >
                  <option value="fiscalYear">Ano fiscal</option>
                  <option value="month">Mes</option>
                  <option value="all">Todo</option>
                </select>
              </Field>
              {balancePeriodMode === "fiscalYear" && (
                <Field label="Ano fiscal">
                  <select
                    style={styles.input}
                    value={balanceFiscalStartYear}
                    onChange={(e) => setBalanceFiscalStartYear(Number(e.target.value))}
                  >
                    {balanceFiscalYearOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {balancePeriodMode === "month" && (
                <Field label="Mes">
                  <input
                    style={styles.input}
                    type="month"
                    value={balanceMonth}
                    onChange={(e) => setBalanceMonth(e.target.value)}
                  />
                </Field>
              )}
            </div>

            <div style={balanceSection}>Facturacion (del periodo)</div>
            <div style={balanceGrid}>
              <BalanceTile label="Facturado (con IVA)" value={money(billingBalance.invoicedTotal)} />
              <BalanceTile label="Facturado (neto)" value={money(billingBalance.invoicedNet)} />
              <BalanceTile label="Falta facturar (neto, a la fecha)" value={money(billingBalance.missingToInvoiceNet)} tone="warn" />
            </div>

            <div style={balanceSection}>Cobrado (del periodo, por administracion)</div>
            <div style={balanceGrid}>
              <BalanceTile label="Cobrado total" value={money(billingBalance.collectedTotal)} tone="strong" />
              <BalanceTile label="Cobrado blanco" value={money(billingBalance.collectedWhite)} tone="white" />
              <BalanceTile label="Cobrado negro" value={money(billingBalance.collectedBlack)} tone="black" />
            </div>

            <div style={balanceSection}>Adeudado a cobrar (a la fecha)</div>
            <div style={balanceGrid}>
              <BalanceTile label="Adeudado total" value={money(billingBalance.owedTotal)} tone="strong" />
              <BalanceTile label="Adeudado blanco (est.)" value={money(billingBalance.owedWhite)} tone="white" />
              <BalanceTile label="Adeudado negro (est.)" value={money(billingBalance.owedBlack)} tone="black" />
            </div>

            <div style={{ ...styles.noticeBox, marginTop: 4 }}>
              Facturado se corta por fecha de factura y cobrado por fecha de pago (del periodo elegido).
              Falta facturar y adeudado son acumulados a la fecha. Circuito del adeudado estimado:
              blanco = lo facturado + adicionales, negro = el resto. Peso del negro:{" "}
              <strong>{billingBalance.blackSharePct.toFixed(1)}%</strong> · {billingBalance.count} trabajos.
            </div>

            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
                Ano fiscal por empresa
              </summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {COMPANY_OPTIONS.map((company) => (
                  <Field key={company.value} label={company.short || company.value}>
                    <select
                      style={styles.input}
                      value={company.fiscalYearStartMonth ?? 11}
                      onChange={(e) => updateCompanyFiscalStartMonth(company.value, Number(e.target.value))}
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          Empieza en {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <div style={{ ...styles.muted, marginTop: 6 }}>
                Hoy ambas empresas arrancan en octubre. Cambialo aca si sumas una empresa con otro calendario.
              </div>
            </details>
          </Panel>

          <Panel title="Estado de resultados del periodo (percibido, operativo)" span="half">
            <div style={balanceSection}>Circuito blanco</div>
            <StatRow label="Cobrado" value={money(periodStatement.whiteIncome)} />
            <StatRow label="Egresos" value={money(periodStatement.whiteExpense)} tone="out" />
            <StatRow label="Resultado" value={money(periodStatement.whiteResult)} strong last />

            <div style={balanceSection}>Circuito negro</div>
            <StatRow label="Cobrado" value={money(periodStatement.blackIncome)} />
            <StatRow label="Egresos" value={money(periodStatement.blackExpense)} tone="out" />
            <StatRow label="Resultado" value={money(periodStatement.blackResult)} strong last />

            <div style={balanceSection}>Total del periodo</div>
            <StatRow label="Ingresos totales" value={money(periodStatement.totalIncome)} />
            <StatRow label="Egresos totales" value={money(periodStatement.totalExpense)} tone="out" />
            <StatRow label="Resultado total" value={money(periodStatement.totalResult)} strong />
            <StatRow label="% en negro" value={`${periodStatement.blackSharePct.toFixed(1)}%`} />
            <StatRow label="Desfasaje blanco vs negro" value={money(periodStatement.desfasaje)} last />

            <div style={balanceSection}>Egresos: nomina y amortizacion</div>
            <StatRow label="Nomina blanca (periodo)" value={money(periodStatement.laborWhite)} tone="out" />
            <StatRow label="Premios / Acuerdos negros" value={money(periodStatement.laborBlack)} tone="out" />
            <StatRow label="Amortizacion (periodo)" value={money(periodStatement.depreciation)} tone="out" last />

            <div style={{ ...styles.noticeBox, marginTop: 10 }}>
              Base percibido: ingresos = cobros del periodo; egresos = compras + caja chica + comisiones
              pagadas + nomina + amortizacion. La nomina sale del historico por mes (un registro por
              empleado y mes); si faltan meses cargados, el costo laboral saldra bajo hasta completarlo.
              La amortizacion se prorratea (ano fiscal = 12 meses, mes = 1). Compras a valor total (con
              IVA). Respeta la empresa y el periodo elegidos arriba.
            </div>
          </Panel>

          <Panel title="Cash flow del periodo" span="half">
            <StatRow label="Flujo operativo (cobros - pagos)" value={money(periodStatement.totalResult)} strong />
            <StatRow label="Creditos banco" value={money(periodStatement.bankCredits)} />
            <StatRow label="Debitos banco" value={money(periodStatement.bankDebits)} tone="out" />
            <StatRow label="Flujo banco (neto)" value={money(periodStatement.netBank)} strong last />
            <div style={{ ...styles.noticeBox, marginTop: 10 }}>
              Flujo operativo = cobros menos pagos del periodo. El banco se muestra aparte para no
              duplicar (un cobro ya cuenta como ingreso). Mas abajo, el detalle mensual y las deudas.
            </div>
          </Panel>

          <Panel title="Contabilidad general blanco / negro (devengado, con sueldos y amortizacion)" span="wide">
            <div style={styles.grid2}>
              <div>
                <div style={styles.sectionHeader}>Circuito BLANCO</div>
                <div style={styles.metricGrid}>
                  <MiniMetric label="Ingresos blanco" value={money(accountingResults.whiteIncome)} />
                  <MiniMetric label="Egresos blanco" value={money(accountingResults.whiteExpense)} tone="out" />
                  <MiniMetric label="Resultado blanco" value={money(accountingResults.whiteResult)} />
                </div>
              </div>
              <div>
                <div style={styles.sectionHeader}>Circuito NEGRO</div>
                <div style={styles.metricGrid}>
                  <MiniMetric label="Ingresos negro" value={money(accountingResults.blackIncome)} />
                  <MiniMetric label="Egresos negro" value={money(accountingResults.blackExpense)} tone="out" />
                  <MiniMetric label="Resultado negro" value={money(accountingResults.blackResult)} />
                </div>
              </div>
            </div>
            <div style={styles.metricGrid}>
              <MiniMetric label="Resultado total" value={money(accountingResults.totalResult)} />
              <MiniMetric label="% operacion en negro" value={`${accountingResults.blackSharePct.toFixed(1)}%`} />
              <MiniMetric label="Desfasaje blanco vs negro" value={money(accountingResults.desfasaje)} />
            </div>
            <div style={styles.noticeBox}>
              Dos resultados separados por circuito. Las compras y la caja chica se imputan segun su
              administracion (blanco/negro), y los premios segun su origen. Verifica que cada concepto
              caiga en el circuito que esperas; lo ajustamos si hace falta.
            </div>
          </Panel>
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
              <MiniMetric label="Egresos negro" value={money(cashFlowSummary.pettyCashBlackTotal)} tone="out" />
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
              <MiniMetric label="Egresos banco" value={money(bankStatementSummary.debits)} tone="out" />
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
