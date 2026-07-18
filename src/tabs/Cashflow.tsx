import React from "react";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, Field } from "../ui/primitives";
import { money, formatDateDisplay } from "../lib/format";
import type { CompanyName, DebtPlan } from "../domain/types";
import type { CapitalEntry, CapitalSummary } from "../domain/contributions";

// Monto compacto para las columnas angostas del calendario (ej. "$1,5M", "$450k"). El monto completo
// queda en el title (hover). Evita que un numero largo rompa una columna de ~80px.
const compactAr = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
};

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
  reservaSummary: any;
  reservaBankAccounts: { company: string; bank: string; date: string; balance: number }[];
  contributionsSummary: CapitalSummary;
  capitalEntries: CapitalEntry[];
  setCapitalEntries: React.Dispatch<React.SetStateAction<CapitalEntry[]>>;
  addCapitalEntry: () => void;
  removeCapitalEntry: (entryId: number) => void;
  annualCashFlowByMonth: any[];
  getCompanyMeta: (company: CompanyName) => any;
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
  reservaSummary,
  reservaBankAccounts,
  contributionsSummary,
  capitalEntries,
  setCapitalEntries,
  addCapitalEntry,
  removeCapitalEntry,
  annualCashFlowByMonth,
  getCompanyMeta,
  COMPANY_OPTIONS,
  updateArrayItem,
  debtPlans,
  setDebtPlans,
  addDebtPlan,
  removeDebtPlan,
  annualDebtByMonth,
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

          <Panel title="Resultado preliminar (por registros)" span="half">
            <div style={styles.sectionHeader}>Resultado — de cobranzas, compras y caja chica</div>
            <div style={styles.metricGrid}>
              <MiniMetric label="Ingresos cobrados" value={money(cashFlowSummary.collected)} />
              <MiniMetric label="Compras" value={money(cashFlowSummary.purchaseInvoicesTotal)} tone="out" />
              <MiniMetric label="Egresos negro" value={money(cashFlowSummary.pettyCashBlackTotal)} tone="out" />
              <MiniMetric label="Comisiones" value={money(cashFlowSummary.commissionsPending)} tone="out" />
              <MiniMetric label="Amortizacion" value={money(activeAssetsMonthlyDepreciation)} tone="out" />
              <MiniMetric label="Resultado blanco" value={money(cashFlowSummary.operatingResultWhite)} />
              <MiniMetric label="Resultado negro" value={money(cashFlowSummary.operatingResultBlack)} />
              <MiniMetric label="Resultado operativo" value={money(cashFlowSummary.operatingResult)} />
            </div>
            <div style={styles.sectionHeader}>El banco real — movimiento de la cuenta (NO es resultado)</div>
            <div style={styles.metricGrid}>
              <MiniMetric label="Entró (créditos)" value={money(cashFlowSummary.bankCredits)} />
              <MiniMetric label="Salió (débitos)" value={money(cashFlowSummary.bankDebits)} tone="out" />
              <MiniMetric label="Flujo de caja del banco" value={money(cashFlowSummary.bankNet)} />
            </div>
            <div style={styles.noticeBox}>
              El <strong>resultado</strong> sale de los registros (cobranzas, compras, caja chica): cada
              cobro y cada pago cuenta una sola vez. El <strong>banco</strong> es el espejo de la cuenta
              real (cuánta plata entró y salió) y se muestra aparte — un cobro que ya está en cobranzas
              NO se vuelve a sumar por aparecer en el banco.
            </div>
          </Panel>

          <Panel title={`Calendario anual unificado ${analysisYear}`} span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Eventos del año" value={String(annualCashFlowEntries.length)} />
              <MiniMetric label="Mov. bancarios" value={String(bankStatementEntries.length)} />
              <MiniMetric label="Compromisos deuda" value={String(annualDebtRows.length)} />
              <MiniMetric label="Ultimo saldo banco" value={money(bankStatementSummary.lastBalance)} />
            </div>
            <div style={styles.noticeBox}>
              Un vistazo del año en <strong>12 columnas</strong> (una por mes): cantidad de eventos y
              monto movido. El detalle día por día está abajo, en la lista de movimientos del mes.
            </div>
            {(() => {
              const monthly = annualCashFlowByMonth.map((month) => ({
                key: month.key,
                label: month.label,
                count: month.items.length,
                monto: month.items.reduce((acc: number, it: any) => acc + Math.abs(Number(it.amount || 0)), 0),
              }));
              const maxMonto = Math.max(1, ...monthly.map((m) => m.monto));
              return (
                <div style={styles.yearMonthsStrip}>
                  {monthly.map((m) => (
                    <div key={m.key} style={styles.yearMonthCol}>
                      <div style={styles.yearMonthColHead}>{m.label.slice(0, 3)}</div>
                      {m.count === 0 ? (
                        <div style={{ ...styles.yearMonthColSub, marginTop: 8 }}>—</div>
                      ) : (
                        <>
                          <div style={styles.yearMonthColBig}>{m.count}</div>
                          <div style={styles.yearMonthColSub}>evento{m.count === 1 ? "" : "s"}</div>
                          {m.monto > 0 && (
                            <div style={styles.yearMonthColSub} title={money(m.monto)}>
                              {compactAr(m.monto)}
                            </div>
                          )}
                        </>
                      )}
                      <div style={styles.yearMonthColBarTrack}>
                        <div
                          style={{
                            ...styles.yearMonthColBarFill,
                            width: `${Math.round((m.monto / maxMonto) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Panel>

          <Panel
            title="Desendeudamiento"
            span="wide"
            actions={<ButtonLike onClick={addDebtPlan}>Agregar compromiso</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric
                label="Cuota mensual"
                value={money(
                  debtPlans
                    .filter((item) => item.active)
                    .reduce((acc, item) => acc + Number(item.nextInstallmentAmount || 0), 0)
                )}
              />
              <MiniMetric
                label="Total comprometido (restante)"
                value={money(
                  debtPlans
                    .filter((item) => item.active)
                    .reduce(
                      (acc, item) =>
                        acc +
                        Number(item.nextInstallmentAmount || 0) *
                          Math.max(0, Number(item.remainingInstallments || 0)),
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
            <div style={styles.noticeBox}>
              La cuota de cada mes en <strong>12 columnas</strong>: la barra baja a medida que las
              cuotas se terminan de pagar, así se ve el desendeudamiento avanzar.
            </div>
            {(() => {
              const maxTotal = Math.max(1, ...annualDebtByMonth.map((m) => Number(m.total || 0)));
              return (
                <div style={styles.yearMonthsStrip}>
                  {annualDebtByMonth.map((month) => (
                    <div key={month.key} style={styles.yearMonthCol}>
                      <div style={styles.yearMonthColHead}>{month.label.slice(0, 3)}</div>
                      {month.total > 0 ? (
                        <>
                          <div style={styles.yearMonthColBig} title={money(month.total)}>
                            {compactAr(month.total)}
                          </div>
                          <div style={styles.yearMonthColSub}>
                            {month.items.length} cuota{month.items.length === 1 ? "" : "s"}
                          </div>
                        </>
                      ) : (
                        <div style={{ ...styles.yearMonthColSub, marginTop: 8 }}>—</div>
                      )}
                      <div style={styles.yearMonthColBarTrack}>
                        <div
                          style={{
                            ...styles.yearMonthColBarFill,
                            width: `${Math.round((Number(month.total || 0) / maxTotal) * 100)}%`,
                            background: "#f59e0b",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Panel>

          <Panel title="Reserva · billetera de la empresa" span="full">
            <div style={styles.noticeBox}>
              La reserva es <strong>la plata que hay</strong> (banco + efectivo); <strong>no toca el
              estado de resultados</strong>, solo balance y cash flow. El saldo de banco es el{" "}
              <strong>último saldo conciliado de cada cuenta</strong> (dato firme aunque falten meses
              intermedios sin cargar). Pesos y dólares nunca se suman; hoy dólares = 0.
            </div>
            <div style={balanceSection}>Total por moneda</div>
            <div style={balanceGrid}>
              {reservaSummary.totals.map((t: any) => (
                <BalanceTile
                  key={t.currency}
                  label={`Reserva ${t.currency === "ARS" ? "pesos" : "dólares"}`}
                  value={money(t.closing)}
                  tone={t.negative ? "warn" : "strong"}
                />
              ))}
            </div>
            <div style={balanceSection}>Billeteras (banco / efectivo × pesos / dólares)</div>
            <div style={balanceGrid}>
              {reservaSummary.wallets.map((w: any) => (
                <div
                  key={`${w.currency}-${w.location}`}
                  style={{
                    ...styles.metric,
                    background: w.negative ? "#fffbeb" : "#f8fafc",
                    border: w.negative ? "1px solid #fde68a" : "1px solid #e2e8f0",
                  }}
                >
                  <div style={styles.metricLabel}>
                    {w.location === "banco" ? "Banco" : "Efectivo"} ·{" "}
                    {w.currency === "ARS" ? "pesos" : "dólares"}
                  </div>
                  <div style={{ ...styles.metricValue, color: w.negative ? "#b45309" : "#0f172a" }}>
                    {money(w.closing)}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Blanco {money(w.byColor.blanco.closing)} · Negro {money(w.byColor.negro.closing)}
                  </div>
                </div>
              ))}
            </div>
            {reservaBankAccounts.length > 0 && (
              <>
                <div style={balanceSection}>Último saldo por cuenta bancaria</div>
                <div>
                  {reservaBankAccounts.map((a) => (
                    <StatRow
                      key={`${a.company}-${a.bank}`}
                      label={`${getCompanyMeta(a.company as CompanyName)?.short || a.company} · ${a.bank}`}
                      value={`${money(a.balance)}  ·  ${formatDateDisplay(a.date)}`}
                      tone={a.balance < 0 ? "out" : undefined}
                    />
                  ))}
                </div>
              </>
            )}
            {contributionsSummary.prestamosPendientes.total !== 0 &&
              (() => {
                const reservaArs =
                  reservaSummary.totals.find((t: any) => t.currency === "ARS")?.closing || 0;
                const pend = contributionsSummary.prestamosPendientes.total;
                const excedente = reservaArs - pend;
                return (
                  <>
                    <div style={balanceSection}>Excedente (reserva menos préstamos a devolver)</div>
                    <div>
                      <StatRow label="Reserva pesos" value={money(reservaArs)} />
                      <StatRow label="− Préstamos pendientes" value={money(pend)} tone="out" />
                      <StatRow
                        label="Excedente sobre préstamos"
                        value={money(excedente)}
                        strong
                        last
                        tone={excedente < 0 ? "out" : undefined}
                      />
                    </div>
                  </>
                );
              })()}
          </Panel>

          <Panel
            title="Deudas y aportes · registro"
            span="full"
            actions={<ButtonLike onClick={addCapitalEntry}>Agregar movimiento</ButtonLike>}
          >
            <div style={styles.noticeBox}>
              Registro de la plata que entró para funcionar (socios, banco, la otra empresa).{" "}
              <strong>No toca resultados</strong> y no mueve la reserva (esa plata ya está en el banco);
              acá solo se asienta para verla. <strong>Aporte</strong> = capital, no vuelve;{" "}
              <strong>préstamo</strong> = se devuelve. Los dólares son un valor congelado de referencia,
              no se suman con los pesos.
            </div>
            <div style={styles.metricGrid}>
              <MiniMetric label="Aportes (capital)" value={money(contributionsSummary.aportes.total)} />
              <MiniMetric
                label="Préstamos pendientes"
                value={money(contributionsSummary.prestamosPendientes.total)}
                tone="out"
              />
              <MiniMetric label="Total recibido" value={money(contributionsSummary.totalRecibido)} />
              {contributionsSummary.usdReference !== 0 && (
                <MiniMetric
                  label="USD congelado (ref.)"
                  value={`US$ ${contributionsSummary.usdReference.toLocaleString("es-AR")}`}
                />
              )}
            </div>
            {contributionsSummary.byOrigin.length > 0 && (
              <>
                <div style={balanceSection}>Quién puso cuánto</div>
                <div style={{ marginBottom: 12 }}>
                  {contributionsSummary.byOrigin.map((o) => (
                    <StatRow
                      key={o.origin}
                      label={o.origin}
                      value={`${money(o.total)}${
                        o.prestamoPendiente !== 0 ? ` (préstamo ${money(o.prestamoPendiente)})` : ""
                      }`}
                      tone={o.total < 0 ? "out" : undefined}
                    />
                  ))}
                </div>
              </>
            )}
            {capitalEntries.length === 0 ? (
              <div style={styles.empty}>
                No hay aportes ni préstamos cargados. Usá "Agregar movimiento" para asentar el primero.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Empresa</th>
                    <th>Origen</th>
                    <th>Tipo</th>
                    <th>Movimiento</th>
                    <th>Color</th>
                    <th>Monto $</th>
                    <th>USD (ref.)</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {capitalEntries.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          style={styles.input}
                          type="date"
                          value={item.date}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "date", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "company", e.target.value)}
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.short}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          placeholder="Gustavo, Nicolás, banco..."
                          value={item.origin}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "origin", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.kind}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "kind", e.target.value)}
                        >
                          <option value="aporte">Aporte</option>
                          <option value="prestamo">Préstamo</option>
                        </select>
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.direction}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "direction", e.target.value)}
                        >
                          <option value="recibido">Recibido</option>
                          <option value="devuelto">Devuelto</option>
                        </select>
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.color}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "color", e.target.value)}
                        >
                          <option value="blanco">Blanco</option>
                          <option value="negro">Negro</option>
                        </select>
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "amount", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          placeholder="opcional"
                          value={item.usdValue ?? ""}
                          onChange={(e) =>
                            updateArrayItem(
                              setCapitalEntries,
                              item.id,
                              "usdValue",
                              e.target.value === "" ? (undefined as any) : Number(e.target.value)
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.notes}
                          onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "notes", e.target.value)}
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeCapitalEntry(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
  );
}
