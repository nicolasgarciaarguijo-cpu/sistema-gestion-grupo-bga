import React from "react";
import { styles } from "../ui/styles";
import { Panel, Semaforo, ButtonLike, Field } from "../ui/primitives";
import { money } from "../lib/format";
import type { SemaphoreLevel } from "../ui/theme";
import type { CompanyName, PrintMode } from "../domain/types";

type FacturacionTabProps = {
  financialSemaphoreSummary: any;
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
              <span style={{ ...styles.statusPill, ...styles.financialBrown }}>Facturacion pendiente</span>
              <span style={{ ...styles.statusPill, ...styles.financialBlack }}>Cobranza pendiente</span>
              <span style={{ ...styles.statusPill, ...styles.financialRed }}>Pago pendiente</span>
              <span style={{ ...styles.statusPill, ...styles.financialDone }}>Verde = realizado</span>
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
