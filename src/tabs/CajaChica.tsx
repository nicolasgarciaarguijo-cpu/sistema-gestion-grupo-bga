import React from "react";
import { styles } from "../ui/styles";
import {
  Panel,
  SemaforoResumen,
  Semaforo,
  MiniMetric,
  ButtonLike,
  Field,
  FileDropButton,
} from "../ui/primitives";
import { money, formatDateDisplay, todayIso } from "../lib/format";
import type { SemaphoreLevel } from "../ui/theme";
import type { CompanyName, PettyCashFund, PettyCashExpense } from "../domain/types";

type CajaChicaTabProps = {
  fundSemaphoreSummary: any;
  visiblePettyCashFunds: PettyCashFund[];
  pettyCashSummary: any;
  totalResponsibleDebt: number;
  responsibleRendicion: any[];
  getCompanyMeta: (company: CompanyName) => any;
  addPettyCashFund: () => void;
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  setPettyCashFunds: React.Dispatch<React.SetStateAction<PettyCashFund[]>>;
  COMPANY_OPTIONS: any[];
  removePettyCashFund: (fundId: number) => void;
  visiblePettyCashExpenses: any[];
  pettyCashFundSummaries: any[];
  getFundSemaphore: (remaining: number, assigned: number) => { level: SemaphoreLevel; label: string };
  fundDebtAdjustments: Map<number, any>;
  addPettyCashExpense: (fundId?: number | null) => void;
  reopenPettyCashFund: (fundId: number) => void;
  pettyCashRechargeDrafts: Record<number, string>;
  setPettyCashRechargeDrafts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  pettyCashRechargeDateDrafts: Record<number, string>;
  setPettyCashRechargeDateDrafts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  rechargePettyCashFund: (fundId: number) => void;
  itemMonthKey: (dateValue: unknown) => string;
  operationalMonth: string;
  monthLabel: (month: string) => string;
  updatePettyCashExpense: (
    expenseId: number,
    field: keyof PettyCashExpense,
    value: string | number | null
  ) => void;
  removePettyCashExpense: (expenseId: number) => void;
  uploadPettyCashFile: (expenseId: number, file: File | null) => void;
  pettyCashTrackingRows: any[];
};

export function CajaChicaTab({
  fundSemaphoreSummary,
  visiblePettyCashFunds,
  pettyCashSummary,
  totalResponsibleDebt,
  responsibleRendicion,
  getCompanyMeta,
  addPettyCashFund,
  updateArrayItem,
  setPettyCashFunds,
  COMPANY_OPTIONS,
  removePettyCashFund,
  visiblePettyCashExpenses,
  pettyCashFundSummaries,
  getFundSemaphore,
  fundDebtAdjustments,
  addPettyCashExpense,
  reopenPettyCashFund,
  pettyCashRechargeDrafts,
  setPettyCashRechargeDrafts,
  pettyCashRechargeDateDrafts,
  setPettyCashRechargeDateDrafts,
  rechargePettyCashFund,
  itemMonthKey,
  operationalMonth,
  monthLabel,
  updatePettyCashExpense,
  removePettyCashExpense,
  uploadPettyCashFile,
  pettyCashTrackingRows,
}: CajaChicaTabProps) {
  return (
        <div style={styles.column}>
          <Panel span="full" title="Semaforo de caja chica">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Fondos con saldo", value: String(fundSemaphoreSummary.verde) },
                { level: "amarillo", label: "Saldo bajo", value: String(fundSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Saldo agotado", value: String(fundSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
          <Panel title="Resumen de caja chica" span="full">
            <div style={styles.metricGrid}>
              <MiniMetric label="Fondos activos" value={String(visiblePettyCashFunds.filter((item) => item.active).length)} />
              <MiniMetric label="Monto asignado" value={money(pettyCashSummary.assignedTotal)} />
              <MiniMetric label="Rendido" value={money(pettyCashSummary.renderedTotal)} />
              <MiniMetric label="Saldo pendiente" value={money(pettyCashSummary.pendingBalance)} />
              <MiniMetric label="Deuda con responsables" value={money(totalResponsibleDebt)} />
              <MiniMetric label="Administracion blanco" value={money(pettyCashSummary.whiteTotal)} />
              <MiniMetric label="Administracion negro" value={money(pettyCashSummary.blackTotal)} />
            </div>
            <div style={styles.noticeBox}>
              Caja chica queda pensada como administracion fuera del circuito bancario. Si un gasto se marca en blanco, tambien queda referenciado dentro de Compras para seguimiento contable.
            </div>
          </Panel>

          <Panel title="Rendicion por responsable" span="wide">
            {responsibleRendicion.length === 0 ? (
              <div style={styles.empty}>Todavia no hay responsables con cajas asignadas.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                {responsibleRendicion.map((r) => {
                  const estado =
                    r.net < 0
                      ? { texto: `La empresa le debe ${money(Math.abs(r.net))}`, color: "#dc2626" }
                      : r.net > 0
                        ? { texto: `Saldo a rendir (en su poder) ${money(r.net)}`, color: "#b7791f" }
                        : { texto: "Al dia", color: "#16a34a" };
                  return (
                    <div key={r.responsible} style={styles.nestedCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Semaforo level={r.net < 0 ? "rojo" : r.net > 0 ? "amarillo" : "verde"} size={18} ring />
                        <strong style={{ fontSize: 15 }}>{r.responsible}</strong>
                      </div>
                      <div style={{ ...styles.metricLabel, color: estado.color, marginBottom: 8 }}>
                        {estado.texto}
                      </div>
                      <div style={styles.metricGrid}>
                        <MiniMetric label="Cajas asignadas" value={String(r.funds.length)} />
                        <MiniMetric label="Total asignado" value={money(r.totalAssigned)} />
                        <MiniMetric label="Total rendido" value={money(r.totalRendered)} />
                      </div>
                      <table style={{ ...styles.table, marginTop: 10 }}>
                        <thead>
                          <tr>
                            <th>Caja</th>
                            <th>Asignado</th>
                            <th>Rendido</th>
                            <th>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.funds
                            .slice()
                            .sort((a, b) => a.fund.id - b.fund.id)
                            .map((f) => (
                              <tr key={f.fund.id}>
                                <td>
                                  {f.fund.description || "Caja sin descripcion"} ·{" "}
                                  {getCompanyMeta(f.fund.company).short}
                                </td>
                                <td>{money(Number(f.fund.assignedAmount || 0))}</td>
                                <td>{money(f.renderedTotal)}</td>
                                <td style={f.remainingBalance < 0 ? { color: "#dc2626" } : undefined}>
                                  {money(f.remainingBalance)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Responsabilidad y fondos"
            span="wide"
            actions={<ButtonLike onClick={addPettyCashFund}>Agregar caja chica</ButtonLike>}
          >
            <datalist id="petty-cash-responsibles">
              {Array.from(
                new Set(visiblePettyCashFunds.map((f) => (f.responsible || "").trim()).filter(Boolean))
              ).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {visiblePettyCashFunds.length === 0 ? (
              <div style={styles.empty}>Todavia no hay fondos de caja chica cargados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Empresa</th>
                    <th>Descripcion caja chica</th>
                    <th>Responsable</th>
                    <th>Monto asignado</th>
                    <th>Entrega</th>
                    <th>Recarga</th>
                    <th>Rendido</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePettyCashFunds.map((fund) => {
                    const rendered = visiblePettyCashExpenses
                      .filter((item) => item.fundId === fund.id)
                      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
                    return (
                      <tr key={fund.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={fund.active}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "active", e.target.checked)}
                          />
                        </td>
                        <td>
                          <select
                            style={styles.input}
                            value={fund.company}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "company", e.target.value as CompanyName)}
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
                            value={fund.description}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "description", e.target.value)}
                            placeholder="Ej: Caja montaje, Caja compras chicas"
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            list="petty-cash-responsibles"
                            value={fund.responsible}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "responsible", e.target.value)}
                            placeholder="Responsable"
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={fund.assignedAmount}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "assignedAmount", Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="date"
                            value={fund.deliveredDate}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "deliveredDate", e.target.value)}
                          />
                        </td>
                        <td>{fund.rechargeDate ? formatDateDisplay(fund.rechargeDate) : "-"}</td>
                        <td>{money(rendered)}</td>
                        <td>{money(Number(fund.assignedAmount || 0) - rendered)}</td>
                        <td>
                          {fund.closed || Number(fund.assignedAmount || 0) - rendered <= 0
                            ? `Cerrada${fund.closedDate ? ` · ${formatDateDisplay(fund.closedDate)}` : ""}`
                            : "Activa"}
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            value={fund.notes}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "notes", e.target.value)}
                          />
                        </td>
                        <td>
                          <button style={styles.smallBtn} onClick={() => removePettyCashFund(fund.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Fondos operativos y rendicion" span="full">
            {pettyCashFundSummaries.length === 0 ? (
              <div style={styles.empty}>Agrega una caja chica para empezar a rendir gastos.</div>
            ) : (
              <div style={styles.pettyCashFundGrid}>
                {pettyCashFundSummaries.map(({ fund, expenses, renderedTotal, whiteTotal, blackTotal, remainingBalance }) => (
                  <div key={fund.id} style={styles.pettyCashFundCard}>
                    <div style={styles.pettyCashFundHeader}>
                      <div style={styles.pettyCashFundTitle}>
                        <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Semaforo
                            level={getFundSemaphore(remainingBalance, fund.assignedAmount).level}
                            size={12}
                            title={getFundSemaphore(remainingBalance, fund.assignedAmount).label}
                          />
                          {fund.description || "Caja chica sin descripcion"}
                        </strong>
                        <span style={styles.muted}>
                          {fund.responsible || "Sin responsable"} · {getCompanyMeta(fund.company).short}
                        </span>
                        <span style={styles.pettyCashFundState}>
                          {(fund.closed || remainingBalance <= 0)
                            ? `Caja cerrada${fund.closedDate ? ` el ${formatDateDisplay(fund.closedDate)}` : ""}`
                            : "Caja activa"}
                        </span>
                      </div>
                      <div style={styles.inlineActions}>
                        <button style={styles.smallBtn} onClick={() => addPettyCashExpense(fund.id)}>
                          Agregar gasto
                        </button>
                        {(fund.closed || remainingBalance <= 0) && (
                          <button style={styles.smallBtn} onClick={() => reopenPettyCashFund(fund.id)}>
                            Reabrir caja
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={styles.pettyCashFundSummary}>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Saldo restante</div>
                        <strong style={remainingBalance < 0 ? { color: "#dc2626" } : undefined}>
                          {money(remainingBalance)}
                        </strong>
                      </div>
                      {(fundDebtAdjustments.get(fund.id)?.ajuste || 0) > 0 && (
                        <>
                          <div style={styles.pettyCashFundMetric}>
                            <div style={styles.label}>
                              Ajuste de deuda (repago a {fund.responsible || "responsable"})
                            </div>
                            <strong style={{ color: "#b7791f" }}>
                              - {money(fundDebtAdjustments.get(fund.id)?.ajuste || 0)}
                            </strong>
                          </div>
                          <div style={styles.pettyCashFundMetric}>
                            <div style={styles.label}>Saldo para gastar</div>
                            <strong>
                              {money(fundDebtAdjustments.get(fund.id)?.adjustedRemaining ?? remainingBalance)}
                            </strong>
                          </div>
                        </>
                      )}
                      {remainingBalance < 0 && (
                        <div style={styles.pettyCashFundMetric}>
                          <div style={styles.label}>
                            DEBE: la empresa a {fund.responsible || "responsable"}
                          </div>
                          <strong style={{ color: "#dc2626" }}>{money(Math.abs(remainingBalance))}</strong>
                        </div>
                      )}
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Comprado en blanco</div>
                        <strong>{money(whiteTotal)}</strong>
                      </div>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Comprado en negro</div>
                        <strong>{money(blackTotal)}</strong>
                      </div>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Rendido total</div>
                        <strong>{money(renderedTotal)}</strong>
                      </div>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Ultima recarga</div>
                        <strong>{fund.rechargeDate ? formatDateDisplay(fund.rechargeDate) : "-"}</strong>
                      </div>
                    </div>

                    <div style={styles.inlineForm}>
                      <Field label="Recargar fondo">
                        <input
                          style={styles.input}
                          type="number"
                          value={pettyCashRechargeDrafts[fund.id] || ""}
                          onChange={(e) =>
                            setPettyCashRechargeDrafts((prev) => ({
                              ...prev,
                              [fund.id]: e.target.value,
                            }))
                          }
                          placeholder="Importe de recarga"
                        />
                      </Field>
                      <Field label="Fecha de recarga">
                        <input
                          style={styles.input}
                          type="date"
                          value={pettyCashRechargeDateDrafts[fund.id] || fund.rechargeDate || todayIso()}
                          onChange={(e) =>
                            setPettyCashRechargeDateDrafts((prev) => ({
                              ...prev,
                              [fund.id]: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <div style={styles.inlineActions}>
                        <button style={styles.smallBtn} onClick={() => rechargePettyCashFund(fund.id)}>
                          Recargar fondo
                        </button>
                      </div>
                    </div>

                    {expenses.filter((expense) => itemMonthKey(expense.date) === operationalMonth).length === 0 ? (
                      <div style={styles.empty}>No hay gastos cargados en {monthLabel(operationalMonth)} para esta caja chica (el saldo de arriba es acumulado de todos los meses).</div>
                    ) : (
                      expenses
                        .filter((expense) => itemMonthKey(expense.date) === operationalMonth)
                        .map((expense) => (
                        <details key={expense.id} style={styles.pettyCashInlineBubble}>
                          <summary style={styles.pettyCashExpenseSummary}>
                            <span style={styles.pettyCashExpenseSummaryLine}>
                              <strong>{expense.description || "Gasto sin descripcion"}</strong>
                            </span>
                            <span style={styles.pettyCashExpenseSummaryLine}>
                              {money(Number(expense.amount || 0))}
                            </span>
                            <span style={styles.pettyCashExpenseSummaryLine}>
                              {formatDateDisplay(expense.date)}
                            </span>
                          </summary>
                          <div style={styles.inlineActions}>
                            <span style={styles.muted}>
                              Fecha {formatDateDisplay(expense.date)} · {expense.administration === "blanco" ? "Compra en blanco" : "Compra en negro"}
                            </span>
                            <button style={styles.smallBtn} onClick={() => removePettyCashExpense(expense.id)}>
                              Quitar gasto
                            </button>
                          </div>
                          <div style={styles.grid2}>
                            <Field label="Descripcion">
                              <input
                                style={styles.input}
                                value={expense.description}
                                onChange={(e) => updatePettyCashExpense(expense.id, "description", e.target.value)}
                              />
                            </Field>
                            <Field label="Proveedor">
                              <input
                                style={styles.input}
                                value={expense.supplier}
                                onChange={(e) => updatePettyCashExpense(expense.id, "supplier", e.target.value)}
                              />
                            </Field>
                            <Field label="Monto">
                              <input
                                style={styles.input}
                                type="number"
                                value={expense.amount}
                                onChange={(e) => updatePettyCashExpense(expense.id, "amount", Number(e.target.value))}
                              />
                            </Field>
                            <Field label="Categoria">
                              <input
                                style={styles.input}
                                value={expense.category}
                                onChange={(e) => updatePettyCashExpense(expense.id, "category", e.target.value)}
                              />
                            </Field>
                            <Field label="Fecha">
                              <input
                                style={styles.input}
                                type="date"
                                value={expense.date}
                                onChange={(e) => updatePettyCashExpense(expense.id, "date", e.target.value)}
                              />
                            </Field>
                            <Field label="Factura / comprobante">
                              <input
                                style={styles.input}
                                value={expense.invoiceNumber}
                                onChange={(e) => updatePettyCashExpense(expense.id, "invoiceNumber", e.target.value)}
                                placeholder="Si hay factura, la compra pasa a blanco"
                              />
                            </Field>
                          </div>
                          <Field label="Notas">
                            <textarea
                              style={styles.textarea}
                              value={expense.notes}
                              onChange={(e) => updatePettyCashExpense(expense.id, "notes", e.target.value)}
                            />
                          </Field>
                          <div style={styles.uploadActions}>
                            <FileDropButton
                              label="Adjuntar factura o ticket"
                              fileName={expense.attachmentName}
                              onFileSelected={(file) => uploadPettyCashFile(expense.id, file)}
                            />
                          </div>
                          <div style={styles.noticeBox}>
                            Salida de dinero: siempre administracion negra. Compra: {expense.administration === "blanco" ? "blanca (hay factura/adjunto)." : "negra (sin factura)." }
                          </div>
                        </details>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Seguimiento de gastos aplicados" span="wide">
            {pettyCashTrackingRows.length === 0 ? (
              <div style={styles.empty}>
                Todavia no hay gastos aplicados para seguir.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Caja chica</th>
                    <th>Responsable asignado</th>
                    <th>Monto</th>
                    <th>Fecha de pago</th>
                    <th>Administracion</th>
                    <th>Descripcion</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pettyCashTrackingRows.map((row) => (
                    <tr key={`pc-track-${row.id}`}>
                      <td>{getCompanyMeta(row.company).short}</td>
                      <td>
                        <select
                          style={styles.input}
                          value={row.fundId ?? ""}
                          onChange={(e) =>
                            updatePettyCashExpense(row.id, "fundId", Number(e.target.value))
                          }
                        >
                          {visiblePettyCashFunds.map((fund) => (
                            <option key={fund.id} value={fund.id}>
                              {fund.description || "Caja sin descripcion"} · {getCompanyMeta(fund.company).short}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{row.responsible}</td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            updatePettyCashExpense(row.id, "amount", Number(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="date"
                          value={row.date}
                          onChange={(e) => updatePettyCashExpense(row.id, "date", e.target.value)}
                        />
                      </td>
                      <td>{row.administration === "blanco" ? "Blanco" : "Negro"}</td>
                      <td>
                        <input
                          style={styles.input}
                          value={row.description}
                          onChange={(e) =>
                            updatePettyCashExpense(row.id, "description", e.target.value)
                          }
                          placeholder="Descripcion"
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removePettyCashExpense(row.id)}>
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
