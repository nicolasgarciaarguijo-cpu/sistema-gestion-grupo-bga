import React from "react";
import { styles } from "../ui/styles";
import { Panel, Semaforo, ButtonLike, Field } from "../ui/primitives";
import { money, pct } from "../lib/format";
import type { SemaphoreLevel } from "../ui/theme";
import type { CompanyName, PrintMode } from "../domain/types";

type FacturacionTabProps = {
  financialSemaphoreSummary: any;
  jobBillingCards: any[];
  setActiveTab: (tab: any) => void;
  setSelectedApprovedJobId: React.Dispatch<React.SetStateAction<number | null>>;
  financialMonthData: any;
  financialItemsByDate: Map<string, any[]>;
  selectedFinancialItem: any;
  budget: any;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  getFinancialItemStyle: (item: any) => React.CSSProperties;
  getDateSemaphore: (dateStr: string, done: boolean) => { level: SemaphoreLevel; label: string };
  getFinancialTypeLabel: (type: any) => string;
  shiftFinancialMonth: (delta: number) => void;
  addFinancialItem: (date?: string, company?: any) => void;
  setSelectedFinancialItemId: React.Dispatch<React.SetStateAction<number | null>>;
  updateFinancialItem: (itemId: number, field: string, value: string | number) => void;
  removeFinancialItem: (itemId: number) => void;
  exportPrint: (mode: PrintMode) => void;
};

export function FacturacionTab({
  financialSemaphoreSummary,
  jobBillingCards,
  setActiveTab,
  setSelectedApprovedJobId,
  financialMonthData,
  financialItemsByDate,
  selectedFinancialItem,
  budget,
  COMPANY_OPTIONS,
  getCompanyMeta,
  getFinancialItemStyle,
  getDateSemaphore,
  getFinancialTypeLabel,
  shiftFinancialMonth,
  addFinancialItem,
  setSelectedFinancialItemId,
  updateFinancialItem,
  removeFinancialItem,
  exportPrint,
}: FacturacionTabProps) {
  return (
        <div style={styles.masterDetailLayout}>
          <div style={styles.masterDetailMain}>
          <Panel title="Semaforo: cobros, pagos y fechas">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {([
                ["Cobros", financialSemaphoreSummary.cobros],
                ["Pagos", financialSemaphoreSummary.pagos],
                ["Fechas a facturar", financialSemaphoreSummary.fechas],
              ] as const).map(([label, s]) => (
                <div key={label} style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12 }}>
                  <Semaforo level={s.level} size={24} ring />
                  <div>
                    <div style={styles.metricLabel}>{label}</div>
                    <div style={{ fontWeight: 700 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Calendario de facturacion y cobranzas"
            actions={
              <div style={styles.monthToolbar}>
                <ButtonLike onClick={() => shiftFinancialMonth(-1)} secondary>Mes anterior</ButtonLike>
                <div style={styles.calendarMonthLabel}>{financialMonthData.label}</div>
                <ButtonLike onClick={() => shiftFinancialMonth(1)} secondary>Mes siguiente</ButtonLike>
                <ButtonLike onClick={() => addFinancialItem()}>Nuevo item</ButtonLike>
              </div>
            }
          >
            <div style={styles.calendarLegend}>
              <span style={{ ...styles.statusPill, ...styles.adminWhite }}>BLANCO (claro)</span>
              <span style={{ ...styles.statusPill, ...styles.adminBlack }}>NEGRO (oscuro)</span>
              <span style={{ ...styles.muted }}>
                Los items reflejan las facturas y pagos reales del trabajo. El semaforo marca la fecha;
                el color, la administracion (blanco/negro).
              </span>
            </div>

            <div style={styles.calendarWeekdays}>
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                <div key={day} style={styles.calendarWeekdayCell}>{day}</div>
              ))}
            </div>

            <div style={styles.calendarGrid}>
              {financialMonthData.cells.map((cell) => {
                const items = financialItemsByDate.get(cell.date) ?? [];
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
                      <button style={styles.smallBtn} onClick={() => addFinancialItem(cell.date, budget.company)}>
                        +
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div style={styles.calendarEmpty}>Sin items</div>
                    ) : (
                      items.map((item) => {
                        const companyMetaItem = getCompanyMeta(item.company);
                        return (
                          <button
                            key={item.id}
                            style={{
                              ...styles.calendarItem,
                              ...getFinancialItemStyle(item),
                              // La administracion domina el fondo: BLANCO claro / NEGRO oscuro,
                              // para ver los dos circuitos diferenciados de un vistazo.
                              ...(item.administration === "negro"
                                ? { background: "#1f2937", color: "#f9fafb" }
                                : { background: "#ffffff", color: "#0f172a" }),
                              borderLeft: `8px solid ${companyMetaItem.primary}`,
                            }}
                            onClick={() =>
                              setSelectedFinancialItemId((prev) => (prev === item.id ? null : item.id))
                            }
                          >
                            <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: companyMetaItem.primary,
                                    display: "inline-block",
                                  }}
                                />
                                <strong>{companyMetaItem.short}</strong>
                              </span>
                              {(() => {
                                const sem = getDateSemaphore(item.date, item.status === "realizado");
                                return <Semaforo level={sem.level} size={10} title={sem.label} />;
                              })()}
                            </div>
                            <div>{item.title || "Sin titulo"}</div>
                            <div style={styles.calendarItemMeta}>
                              {getFinancialTypeLabel(item.type)} · {money(item.amount)}
                              <span
                                style={{
                                  ...styles.statusPill,
                                  ...(item.administration === "negro" ? styles.adminBlack : styles.adminWhite),
                                  marginLeft: 6,
                                  fontSize: 9,
                                  padding: "1px 5px",
                                }}
                              >
                                {item.administration === "negro" ? "N" : "B"}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            title={`Fichas por trabajo · evolucion y pendientes${
              jobBillingCards.length ? ` (${jobBillingCards.length})` : ""
            }`}
          >
            <div style={{ ...styles.calendarLegend, marginBottom: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Semaforo level="verde" size={10} /> al dia
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Semaforo level="amarillo" size={10} /> falta facturar o cobrar
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Semaforo level="rojo" size={10} /> finalizado con pendientes
              </span>
              <span style={styles.muted}>Solo trabajos activos y cerrados con algo pendiente.</span>
            </div>

            {jobBillingCards.length === 0 ? (
              <div style={styles.calendarEmpty}>No hay trabajos con facturacion o cobranza pendiente.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {jobBillingCards.map((card) => {
                  const meta = getCompanyMeta(card.company);
                  const billedPctReal =
                    card.soldNetPrice > 0
                      ? Math.min(100, (card.invoicedNetReal / card.soldNetPrice) * 100)
                      : 0;
                  return (
                    <div
                      key={card.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderLeft: `6px solid ${meta.primary}`,
                        borderRadius: 12,
                        padding: 12,
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: meta.primary,
                              display: "inline-block",
                              flex: "none",
                            }}
                          />
                          <strong>{meta.short}</strong>
                          <span style={{ fontWeight: 700 }}>{card.budgetNumber}</span>
                        </span>
                        <Semaforo level={card.semaphore.level} size={14} title={card.semaphore.label} ring />
                      </div>

                      <div style={{ fontSize: 12, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {card.client || "Sin cliente"}
                        {card.project ? ` · ${card.project}` : ""}
                      </div>

                      {/* Facturado */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                          <span>Facturado {pct(billedPctReal)} de {pct(card.billedPct)}</span>
                          <span>{money(card.invoicedNetReal)}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 3 }}>
                          <div style={{ width: `${billedPctReal}%`, height: "100%", background: meta.primary }} />
                        </div>
                      </div>

                      {/* Cobrado */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                          <span>Cobrado {pct(card.collectedPct)}</span>
                          <span>{money(card.collectedTotal)} / {money(card.valueToCollect)}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden", marginTop: 3 }}>
                          <div style={{ width: `${card.collectedPct}%`, height: "100%", background: "#16a34a" }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {card.semaphore.needsInvoice && (
                          <span style={{ ...styles.statusPill, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>
                            Falta facturar {money(card.missingToInvoice)}
                          </span>
                        )}
                        {card.semaphore.needsCollect && (
                          <span style={{ ...styles.statusPill, background: "#fee2e2", color: "#991b1b", fontWeight: 700 }}>
                            Falta cobrar {money(card.remainingToPay)}
                          </span>
                        )}
                        {!card.semaphore.needsInvoice && !card.semaphore.needsCollect && (
                          <span style={{ ...styles.statusPill, background: "#dcfce7", color: "#166534", fontWeight: 700 }}>
                            Al dia
                          </span>
                        )}
                        <span style={{ ...styles.statusPill, background: "#f1f5f9", color: "#475569" }}>
                          {card.invoicesCount} fact · {card.paymentsCount} pagos
                        </span>
                      </div>

                      <ButtonLike
                        secondary
                        onClick={() => {
                          setSelectedApprovedJobId(card.id);
                          setActiveTab("aprobados");
                        }}
                      >
                        Abrir trabajo
                      </ButtonLike>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
          </div>

          {selectedFinancialItem && (
            <div style={styles.masterDetailAside}>
            <Panel
              title="Editor dinamico del item"
              actions={<ButtonLike onClick={() => setSelectedFinancialItemId(null)} secondary>Cerrar editor</ButtonLike>}
            >
              <div style={styles.grid2}>
                <Field label="Empresa">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.company}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "company", e.target.value)
                    }
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
                    value={selectedFinancialItem.date}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "date", e.target.value)
                    }
                  />
                </Field>
                <Field label="Tipo">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.type}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "type", e.target.value)
                    }
                  >
                    <option value="facturacion">Facturacion</option>
                    <option value="cobranza">Cobranza</option>
                    <option value="pago">Pago</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.status}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "status", e.target.value)
                    }
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="realizado">Realizado</option>
                  </select>
                </Field>
                <Field label="Administracion">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.administration || "blanco"}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "administration", e.target.value)
                    }
                  >
                    <option value="blanco">Blanco</option>
                    <option value="negro">Negro</option>
                  </select>
                </Field>
                <Field label="Titulo">
                  <input
                    style={styles.input}
                    value={selectedFinancialItem.title}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "title", e.target.value)
                    }
                  />
                </Field>
                <Field label="Codigo / presupuesto">
                  <input
                    style={styles.input}
                    value={selectedFinancialItem.jobCode}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "jobCode", e.target.value)
                    }
                  />
                </Field>
                <Field label="Cliente">
                  <input
                    style={styles.input}
                    value={selectedFinancialItem.client}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "client", e.target.value)
                    }
                  />
                </Field>
                <Field label="Monto">
                  <input
                    style={styles.input}
                    type="number"
                    value={selectedFinancialItem.amount}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "amount", Number(e.target.value))
                    }
                  />
                </Field>
              </div>
                <Field label="Notas">
                  <textarea
                    style={styles.textarea}
                    value={selectedFinancialItem.notes}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "notes", e.target.value)
                    }
                  />
                </Field>
                {selectedFinancialItem.autoGenerated && !selectedFinancialItem.userEdited && (
                  <div style={styles.noticeBox}>
                    Este item se genera automaticamente desde un trabajo aprobado. Si cambias aprobación, plazo o porcentaje facturado, fechas y montos se actualizan solos. Si lo editas a mano (p.ej. para partir el saldo en cuotas), dejara de recalcularse.
                  </div>
                )}
                {selectedFinancialItem.autoGenerated && selectedFinancialItem.userEdited && (
                  <div style={styles.noticeBox}>
                    Item autogenerado editado a mano: ya no se recalcula automaticamente, tus cuotas/montos quedan fijos.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ButtonLike onClick={() => removeFinancialItem(selectedFinancialItem.id)} secondary>
                  Eliminar item
                </ButtonLike>
                <ButtonLike onClick={() => setSelectedFinancialItemId(null)} secondary>
                  Cerrar
                </ButtonLike>
                <ButtonLike onClick={() => exportPrint("report-facturacion")} secondary>
                  Reporte
                </ButtonLike>
              </div>
            </Panel>
            </div>
          )}
        </div>
  );
}
