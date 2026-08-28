import React from "react";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, Field, AmountInput, ColorTag, moneyToneColor } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { money, formatDateDisplay } from "../lib/format";
import type { CompanyName, DebtPlan, CashHolding } from "../domain/types";
import type { CapitalSummary } from "../domain/contributions";
import type { LoanLine } from "../domain/loanLines";
import { totalDeMoneda, ultimoCierre } from "../domain/cierreEjercicio";
import type { CierreEjercicio } from "../domain/cierreEjercicio";
import { DEFAULT_FISCAL_START_MONTH, currentFiscalStartYear, fiscalYearLabel } from "../domain/fiscalYear";

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

// Fila compacta etiqueta -> valor (lista vertical). tone="in" = entra plata (verde), tone="out" = sale
// plata (rojo); strong = total. `color` agrega el badge B/N de procedencia (blanco/negro) al lado del monto.
function StatRow({
  label,
  value,
  tone,
  color,
  strong,
  last,
}: {
  label: React.ReactNode;
  value: string;
  tone?: "in" | "out";
  color?: "blanco" | "negro";
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
          color: moneyToneColor(tone),
          whiteSpace: "nowrap",
        }}
      >
        {value}
        {color && <ColorTag color={color} />}
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
  // Deudas que se administran en Compras y que aca se ven en modo lectura, junto al desendeudamiento.
  purchaseLedger: any;
  cashFlowSummary: any;
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
  // Cierre de ejercicio: la foto del año cerrado y el saldo con el que arranca el siguiente.
  fiscalClosings: CierreEjercicio[];
  onCerrarEjercicio: (company: CompanyName, fiscalStartYear: number) => void;
  onReabrirEjercicio: (cierreId: number) => void;
  cierreBusy: boolean;
  cierreMensaje: string;
  puedeCerrar: boolean;
  activeAssetsMonthlyDepreciation: number;
  analysisYear: number;
  annualCashFlowEntries: any[];
  bankStatementEntries: any[];
  annualDebtRows: any[];
  bankStatementSummary: any;
  reservaSummary: any;
  reservaBankAccounts: { company: string; bank: string; currency?: "ARS" | "USD"; date: string; balance: number }[];
  reservaUntil?: string;
  // Resumen de aportes y préstamos: la reserva lo muestra como "de dónde salió la plata". El
  // registro (y su carga) vive en la solapa Movimientos internos.
  contributionsSummary: CapitalSummary;
  // Préstamos que entraron por el Calendario anual, una línea por prestamista (ver domain/loanLines).
  loanLines?: LoanLine[];
  vatPositionByCompany: {
    company: string;
    short: string;
    primary: string;
    debito: number;
    credito: number;
    posicion: number;
    lastVepDate: string | null;
    ventas: number;
    compras: number;
  }[];
  ivaVepPayments: any[];
  addIvaVepPayment: () => void;
  updateIvaVepPayment: (entryId: number, field: string, value: string | number) => void;
  removeIvaVepPayment: (entryId: number) => void;
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
  purchaseLedger,
  cashFlowSummary,
  activeAssetsMonthlyDepreciation,
  analysisYear,
  annualCashFlowEntries,
  bankStatementEntries,
  annualDebtRows,
  bankStatementSummary,
  reservaSummary,
  reservaBankAccounts,
  reservaUntil,
  contributionsSummary,
  loanLines = [],
  vatPositionByCompany,
  ivaVepPayments,
  addIvaVepPayment,
  updateIvaVepPayment,
  removeIvaVepPayment,
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
  fiscalClosings,
  onCerrarEjercicio,
  onReabrirEjercicio,
  cierreBusy,
  cierreMensaje,
  puedeCerrar,
}: CashflowTabProps) {
  const anchosDeudas = usePlanillaWidths("cashflow.deudas", { label: 280, col: 116, colCompact: 88 });

  return (
        <div style={styles.column}>
          <Panel title={`Calendario anual ${analysisYear} · unificado y desendeudamiento`} span="full">
            <div style={styles.sectionHeader}>Unificado — todo lo que pasa en el año</div>
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
            <div style={styles.sectionHeader}>Desendeudamiento — los compromisos del año</div>
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

          {/* CIERRE DE EJERCICIO. Da por terminado el año: guarda TODO en la carpeta y deja el año
              de solo lectura. Los datos NO se borran; lo único que sale del sistema son las
              imágenes, que es donde está el peso. Vive acá, junto al balance, porque es la foto con
              la que arranca el año siguiente. */}
          <Panel title="Cierre de ejercicio" span="full">
            <div style={{ ...styles.sectionNote, marginBottom: 10 }}>
              El cierre <strong>guarda todo el ejercicio en la carpeta</strong> y deja el año{" "}
              <strong>cerrado para editar</strong>: se sigue viendo entero, pero solo el superadmin
              puede corregir algo. Los datos no se borran — lo único que sale del sistema son las{" "}
              <strong>imágenes</strong>, que es donde está el peso, y quedan guardadas en la carpeta.
              El saldo del cierre es con el que arranca el año siguiente.
            </div>

            {!puedeCerrar && (
              <div style={{ ...styles.muted, marginBottom: 10 }}>
                Solo un administrador puede cerrar un ejercicio.
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {COMPANY_OPTIONS.filter((c: any) => c.value && c.value !== "General").map((company: any) => {
                const meta = getCompanyMeta(company.value);
                const startMonth = company.fiscalYearStartMonth ?? DEFAULT_FISCAL_START_MONTH;
                // El ejercicio que se puede cerrar es el ANTERIOR al que está corriendo: el actual
                // todavía no terminó.
                const enCurso = currentFiscalStartYear(startMonth, new Date());
                const aCerrar = enCurso - 1;
                const cierre = ultimoCierre(fiscalClosings, String(company.value));
                const yaCerrado = cierre?.fiscalStartYear === aCerrar;
                return (
                  <div
                    key={String(company.value)}
                    style={{
                      flex: "1 1 340px",
                      minWidth: 320,
                      border: "1px solid #e2e8f0",
                      borderLeft: `4px solid ${meta.primary}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ color: meta.primary, fontWeight: 800, marginBottom: 4 }}>
                      {meta.short || String(company.value)}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      En curso: <strong>{fiscalYearLabel(startMonth, enCurso)}</strong>
                    </div>

                    {cierre ? (
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        <div style={{ color: "#16a34a", fontWeight: 700 }}>
                          Último cerrado: {fiscalYearLabel(startMonth, cierre.fiscalStartYear)}
                        </div>
                        <div style={{ color: "#475569" }}>
                          Arrancó el año con {money(totalDeMoneda(cierre.billeteras, "ARS"))}
                          {totalDeMoneda(cierre.billeteras, "USD") !== 0
                            ? ` + ${money(totalDeMoneda(cierre.billeteras, "USD"), "USD")}`
                            : ""}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          A cobrar {money(cierre.aCobrar)} · a pagar {money(cierre.aPagar)}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                          Cerrado el {String(cierre.closedAt).slice(0, 10)} por {cierre.closedBy || "—"}
                        </div>
                        {puedeCerrar && (
                          <div style={{ marginTop: 6 }}>
                            <ButtonLike secondary onClick={() => onReabrirEjercicio(cierre.id)}>
                              Reabrir
                            </ButtonLike>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
                        Todavía no se cerró ningún ejercicio.
                      </div>
                    )}

                    {puedeCerrar && !yaCerrado && (
                      <div style={{ marginTop: 10 }}>
                        <ButtonLike
                          onClick={() => onCerrarEjercicio(company.value, aCerrar)}
                          disabled={cierreBusy}
                        >
                          {cierreBusy ? "Cerrando…" : `Cerrar ${fiscalYearLabel(startMonth, aCerrar)}`}
                        </ButtonLike>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {cierreMensaje && (
              <div style={{ ...styles.noticeBox, marginTop: 12 }}>{cierreMensaje}</div>
            )}

            <div style={{ ...styles.sectionNote, marginTop: 12 }}>
              Hace falta la <strong>carpeta vinculada</strong>: sin ella no se cierra, porque el archivo
              de la carpeta es lo que queda si algún día el sistema se migra o se vacía. El cierre pide
              confirmación dos veces y la segunda hay que escribirla.
            </div>
          </Panel>

          <Panel title="Cash flow y estado de resultados del período" span="full">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 14, alignItems: "start" }}>
              <div>
            <div style={styles.sectionHeader}>Estado de resultados (percibido, operativo)</div>
            <div style={balanceSection}>Circuito blanco</div>
            <StatRow label="Cobrado" value={money(periodStatement.whiteIncome)} tone="in" />
            <StatRow label="Egresos" value={money(periodStatement.whiteExpense)} tone="out" />
            <StatRow label="Resultado" value={money(periodStatement.whiteResult)} strong last />

            <div style={balanceSection}>Circuito negro</div>
            <StatRow label="Cobrado" value={money(periodStatement.blackIncome)} tone="in" />
            <StatRow label="Egresos" value={money(periodStatement.blackExpense)} tone="out" />
            <StatRow label="Resultado" value={money(periodStatement.blackResult)} strong last />

            <div style={balanceSection}>Total del periodo</div>
            <StatRow label="Ingresos totales" value={money(periodStatement.totalIncome)} tone="in" />
            <StatRow label="Egresos totales" value={money(periodStatement.totalExpense)} tone="out" />
            <StatRow label="Resultado total" value={money(periodStatement.totalResult)} strong />
            <StatRow label="% en negro" value={`${periodStatement.blackSharePct.toFixed(1)}%`} />
            <StatRow label="Desfasaje blanco vs negro" value={money(periodStatement.desfasaje)} last />

            <div style={balanceSection}>Egresos: nomina y amortizacion</div>
            <StatRow label="Nomina blanca (periodo)" value={money(periodStatement.laborWhite)} tone="out" />
            <StatRow label="Premios / Acuerdos negros" value={money(periodStatement.laborBlack)} tone="out" />
            <StatRow label="Amortizacion (periodo)" value={money(periodStatement.depreciation)} tone="out" last />

            <div style={{ ...styles.noticeBox, marginTop: 10 }}>
              Base percibido: entra plata cuando el cliente paga, sale cuando pagamos. Ingresos =
              cobros del periodo; egresos = <strong>pagos</strong> (proveedores, alquiler, servicios,
              impuestos, cargados en "Pago a proveedores") + caja chica + comisiones pagadas + nomina
              + amortizacion. <strong>La factura no suma ni resta</strong>: es el respaldo de que el
              movimiento es blanco. La nomina sale del historico por mes (un registro por empleado y
              mes); si faltan meses cargados, el costo laboral saldra bajo hasta completarlo. La
              amortizacion se prorratea (ano fiscal = 12 meses, mes = 1). Respeta la empresa y el
              periodo elegidos arriba.
            </div>
              </div>
              <div>
            <div style={styles.sectionHeader}>Cash flow del período</div>
            <StatRow label="Flujo operativo (cobros - pagos)" value={money(periodStatement.totalResult)} strong />
            <StatRow label="Creditos banco" value={money(periodStatement.bankCredits)} tone="in" />
            <StatRow label="Debitos banco" value={money(periodStatement.bankDebits)} tone="out" />
            <StatRow label="Flujo banco (neto)" value={money(periodStatement.netBank)} strong last />
            <div style={{ ...styles.noticeBox, marginTop: 10 }}>
              Flujo operativo = cobros menos pagos del periodo. El banco se muestra aparte para no
              duplicar (un cobro ya cuenta como ingreso). Mas abajo, el detalle mensual y las deudas.
            </div>
            <div style={styles.sectionHeader}>Resumen de registros</div>
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturado bruto" value={money(cashFlowSummary.billedGross)} />
              <MiniMetric label="Cobrado" value={money(cashFlowSummary.collected)} tone="in" />
              <MiniMetric label="Pendiente de cobro" value={money(cashFlowSummary.pendingCollections)} />
              <MiniMetric label="Compras cargadas" value={money(cashFlowSummary.purchaseInvoicesTotal)} tone="out" />
              <MiniMetric label="Caja chica negro" value={money(cashFlowSummary.pettyCashBlackTotal)} tone="out" color="negro" />
              <MiniMetric label="Caja chica blanco" value={money(cashFlowSummary.pettyCashWhiteTotal)} tone="out" color="blanco" />
              <MiniMetric label="Comisiones pendientes" value={money(cashFlowSummary.commissionsPending)} tone="out" />
              <MiniMetric label="Amortizacion mensual" value={money(activeAssetsMonthlyDepreciation)} tone="out" />
            </div>
              </div>
            </div>
          </Panel>

          <Panel title="Reserva · billetera de la empresa" span="full">
            <div style={styles.noticeBox}>
              La reserva es <strong>la plata que hay</strong> (banco + efectivo); <strong>no toca el
              estado de resultados</strong>, solo balance y cash flow. El saldo de banco es el{" "}
              <strong>último saldo conciliado de cada cuenta</strong> (dato firme aunque falten meses
              intermedios sin cargar). Pesos y dólares nunca se suman. Los dólares salen de los cobros
              en U$S cargados en los trabajos aprobados. El <strong>efectivo se deriva del sistema</strong>:
              lo suben los cobros hechos en efectivo y la caja chica, lo bajan los gastos pagados de la
              caja, y los depósitos se asientan en <strong>Movimientos internos</strong>.
              {reservaUntil ? (
                <>
                  {" "}
                  <strong>Cortada al {formatDateDisplay(reservaUntil)}</strong> (fin del período
                  elegido): muestra la plata que había hasta esa fecha.
                </>
              ) : (
                <> Muestra la <strong>última fecha cargada</strong> (período "todo").</>
              )}
            </div>
            <div style={balanceSection}>Total por moneda</div>
            <div style={balanceGrid}>
              {reservaSummary.totals.map((t: any) => (
                <BalanceTile
                  key={t.currency}
                  label={`Reserva ${t.currency === "ARS" ? "pesos" : "dólares"}`}
                  value={money(t.closing, t.currency)}
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
                    {money(w.closing, w.currency)}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Blanco {money(w.byColor.blanco.closing, w.currency)} · Negro{" "}
                    {money(w.byColor.negro.closing, w.currency)}
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
                      key={`${a.company}-${a.bank}-${a.currency || "ARS"}`}
                      label={`${getCompanyMeta(a.company as CompanyName)?.short || a.company} · ${a.bank}${
                        a.currency === "USD" ? " (U$S)" : ""
                      }`}
                      value={`${money(a.balance, a.currency === "USD" ? "USD" : "ARS")}  ·  ${formatDateDisplay(a.date)}`}
                      tone={a.balance < 0 ? "out" : undefined}
                    />
                  ))}
                </div>
              </>
            )}
            {(() => {
              // Deuda viva por préstamos = lo asentado a mano + lo que entró por el calendario y
              // todavía no estaba asentado (si estaba, no se cuenta dos veces).
              const pend =
                contributionsSummary.prestamosPendientes.total +
                loanLines.reduce((acc, l) => acc + l.sinAsentar, 0);
              // Desendeudamiento pendiente en scope: cuota × cuotas restantes de los compromisos
              // activos de la(s) empresa(s) elegida(s). Es plata que todavía hay que pagar (echeqs de
              // equipos, planes de impuestos), así que también achica el excedente real.
              const desendeudPend = debtPlans
                .filter(
                  (item) =>
                    item.active &&
                    (balanceCompanyScope === "__ALL__" || item.company === balanceCompanyScope)
                )
                .reduce(
                  (acc, item) =>
                    acc +
                    Number(item.nextInstallmentAmount || 0) *
                      Math.max(0, Number(item.remainingInstallments || 0)),
                  0
                );
              if (pend === 0 && desendeudPend === 0) return null;
              const reservaArs =
                reservaSummary.totals.find((t: any) => t.currency === "ARS")?.closing || 0;
              const excedente = reservaArs - pend - desendeudPend;
              return (
                <>
                  <div style={balanceSection}>Excedente (reserva menos lo que falta pagar)</div>
                  <div>
                    <StatRow label="Reserva pesos" value={money(reservaArs)} />
                    {pend !== 0 && (
                      <StatRow label="− Préstamos pendientes" value={money(pend)} tone="out" />
                    )}
                    {desendeudPend !== 0 && (
                      <StatRow
                        label="− Desendeudamiento pendiente"
                        value={money(desendeudPend)}
                        tone="out"
                      />
                    )}
                    <StatRow
                      label="Excedente disponible"
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

          <Panel title="Posicion de IVA (desde el ultimo VEP)" span="wide">
            <div style={{ ...styles.muted, marginBottom: 10 }}>
              Debito (IVA de ventas emitidas) menos credito (IVA de compras en blanco), acumulado desde el
              ultimo VEP de pago. Positivo = <strong>a pagar</strong> (conviene comprar en blanco con esa
              empresa); negativo = <strong>a favor</strong> (conviene facturar con esa empresa). El IVA es
              por CUIT: no se suma entre empresas.
            </div>
            {vatPositionByCompany.length === 0 ? (
              <div style={styles.empty}>Sin empresas en el alcance seleccionado.</div>
            ) : (
              vatPositionByCompany.map((v) => (
                <div key={v.company} style={{ marginBottom: 12 }}>
                  <div style={{ ...balanceSection, borderLeft: `4px solid ${v.primary}`, paddingLeft: 8 }}>
                    {v.short}
                    {v.lastVepDate
                      ? ` · desde el VEP del ${formatDateDisplay(v.lastVepDate)}`
                      : " · sin VEP (cuenta todo el historico)"}
                  </div>
                  <div style={balanceGrid}>
                    <BalanceTile
                      label={`IVA debito · ventas (${v.ventas})`}
                      value={money(v.debito)}
                      tone="white"
                    />
                    <BalanceTile
                      label={`IVA credito · compras blanco (${v.compras})`}
                      value={money(v.credito)}
                      tone="white"
                    />
                    <BalanceTile
                      label={
                        v.posicion > 1
                          ? "Posicion: A PAGAR"
                          : v.posicion < -1
                          ? "Posicion: A FAVOR"
                          : "Posicion: equilibrado"
                      }
                      value={money(v.posicion)}
                      tone={v.posicion > 1 ? "warn" : "strong"}
                    />
                  </div>
                </div>
              ))
            )}

            <div style={{ ...balanceSection, marginTop: 8 }}>
              VEP de pago de IVA (al cargarlo se reinicia el contador de esa empresa)
            </div>
            <div style={{ marginBottom: 8 }}>
              <ButtonLike onClick={addIvaVepPayment}>Cargar VEP de pago</ButtonLike>
            </div>
            {ivaVepPayments.length === 0 ? (
              <div style={styles.empty}>
                Sin VEP cargados. Al cargar el pago trimestral, el contador de esa empresa arranca de nuevo
                desde la fecha del VEP.
              </div>
            ) : (
              ivaVepPayments.map((v: any) => (
                <div key={v.id} style={styles.subCard}>
                  <div style={styles.inlineActions}>
                    <button style={styles.smallBtn} onClick={() => removeIvaVepPayment(v.id)}>
                      Quitar
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={v.company}
                        onChange={(e) => updateIvaVepPayment(v.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.filter((c: any) => c.value && c.value !== "General").map((c: any) => (
                          <option key={c.value} value={c.value}>
                            {c.short || c.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fecha del VEP">
                      <input
                        style={styles.input}
                        type="date"
                        value={v.date}
                        onChange={(e) => updateIvaVepPayment(v.id, "date", e.target.value)}
                      />
                    </Field>
                    <Field label="Periodo">
                      <input
                        style={styles.input}
                        value={v.period}
                        placeholder="3T 2026"
                        onChange={(e) => updateIvaVepPayment(v.id, "period", e.target.value)}
                      />
                    </Field>
                    <Field label="Monto pagado">
                      <AmountInput
                        style={styles.input}
                        value={v.amount}
                        onChange={(n) => updateIvaVepPayment(v.id, "amount", n)}
                      />
                    </Field>
                  </div>
                </div>
              ))
            )}
          </Panel>

          <Panel
            title="Desendeudamiento" span="full"
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
              {(() => {
                const usdPend = debtPlans
                  .filter((item) => item.active)
                  .reduce(
                    (acc, item) =>
                      acc +
                      Number(item.usdValuePerInstallment || 0) *
                        Math.max(0, Number(item.remainingInstallments || 0)),
                    0
                  );
                return usdPend > 0 ? (
                  <MiniMetric
                    label="USD congelado restante (ref.)"
                    value={`US$ ${usdPend.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  />
                ) : null;
              })()}
            </div>
            <div style={{ ...planillaWrap, ...anchosDeudas.vars }}>
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
                    Concepto
                    <PlanillaManija
                      onMouseDown={(ev) => anchosDeudas.startResize(ev, "label")}
                      onDoubleClick={anchosDeudas.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Próxima cuota
                    <PlanillaManija
                      onMouseDown={(ev) => anchosDeudas.startResize(ev, "col")}
                      onDoubleClick={anchosDeudas.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Cuotas restantes</th>
                  <th style={thColumna}>Próx. vencimiento</th>
                  <th style={thFlexible}>Día · USD por cuota · empresa · notas</th>
                </tr>
              </thead>
              <tbody>
                {debtPlans.map((item) => (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (window.confirm(`¿Quitar "${item.concept}" de deudas y aportes?`)) removeDebtPlan(item.id);
                    }}
                    title="Click derecho: quitar. El punto verde activa o desactiva."
                  >
                    <td style={{ ...tdNombre, fontWeight: 400, padding: 0, opacity: item.active ? 1 : 0.45 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                        <span
                          title={item.active ? "Activo" : "Inactivo"}
                          onClick={() => updateArrayItem(setDebtPlans, item.id, "active", !item.active)}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                            cursor: "pointer", background: item.active ? "#16a34a" : "#cbd5f5",
                          }}
                        />
                        <input
                          style={inputCelda}
                          {...focoCelda}
                          value={item.concept}
                          onChange={(e) => updateArrayItem(setDebtPlans, item.id, "concept", e.target.value)}
                        />
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <AmountInput
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        value={item.nextInstallmentAmount}
                        onChange={(n) => updateArrayItem(setDebtPlans, item.id, "nextInstallmentAmount", n)}
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <input
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        type="number"
                        value={item.remainingInstallments}
                        onChange={(e) =>
                          updateArrayItem(setDebtPlans, item.id, "remainingInstallments", Number(e.target.value))
                        }
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <input
                        style={{ ...inputCelda, padding: "1px 6px" }}
                        {...focoCelda}
                        type="date"
                        value={item.nextDueDate}
                        onChange={(e) => updateArrayItem(setDebtPlans, item.id, "nextDueDate", e.target.value)}
                      />
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                        <span style={{ color: "#94a3b8" }}>día</span>
                        <input
                          style={{ ...inputCelda, width: 44, textAlign: "right" }}
                          {...focoCelda}
                          type="number"
                          value={item.dueDay}
                          onChange={(e) => updateArrayItem(setDebtPlans, item.id, "dueDay", Number(e.target.value))}
                        />
                        <span style={{ color: "#94a3b8" }}>U$S/cuota</span>
                        <input
                          style={{ ...inputCelda, width: 72, textAlign: "right" }}
                          {...focoCelda}
                          type="number"
                          placeholder="opcional"
                          value={item.usdValuePerInstallment ?? ""}
                          onChange={(e) =>
                            updateArrayItem(
                              setDebtPlans,
                              item.id,
                              "usdValuePerInstallment",
                              e.target.value === "" ? (undefined as any) : Number(e.target.value)
                            )
                          }
                        />
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setDebtPlans, item.id, "company", e.target.value)}
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.short}
                            </option>
                          ))}
                        </select>
                        <input
                          style={{ ...inputCelda, flex: 1, minWidth: 90, color: "#94a3b8" }}
                          {...focoCelda}
                          value={item.notes}
                          placeholder="notas"
                          onChange={(e) => updateArrayItem(setDebtPlans, item.id, "notes", e.target.value)}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Panel>

          <Panel title="Cuenta corriente con proveedores" span="full">
            <div style={styles.sectionNote}>
              Saldo por proveedor: todo lo comprado menos todo lo pagado. El detalle movimiento por
              movimiento está en <strong>Compras</strong>.{" "}
              <strong style={{ color: Number(purchaseLedger?.saldoTotal || 0) > 1 ? "#b45309" : "#16a34a" }}>
                Saldo total: {money(Number(purchaseLedger?.saldoTotal || 0))}
              </strong>
              {Number(purchaseLedger?.sinConciliarTotal || 0) > 1 && (
                <>
                  {" · "}
                  <span style={{ color: "#ca8a04" }}>
                    {money(Number(purchaseLedger.sinConciliarTotal))} en facturas sin pago vinculado
                  </span>
                </>
              )}
              .
            </div>
            {(() => {
              const conSaldo = (purchaseLedger?.ledgers || []).filter((l: any) => l.saldo > 1);
              if (conSaldo.length === 0) {
                return <div style={styles.empty}>No le debemos nada a ningún proveedor. Al día.</div>;
              }
              return (
                <div style={styles.metricGrid}>
                  {conSaldo.map((l: any) => (
                    <MiniMetric
                      key={`cc-prov-${l.key}`}
                      label={l.esCuentaCorriente ? `${l.supplier} · convenio` : l.supplier}
                      value={money(l.saldo)}
                      tone="out"
                    />
                  ))}
                </div>
              );
            })()}
          </Panel>

        </div>
  );
}
