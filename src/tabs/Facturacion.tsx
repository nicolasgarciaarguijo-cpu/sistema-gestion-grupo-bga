import React from "react";
import { styles } from "../ui/styles";
import { Panel, Semaforo, ButtonLike, Field, AmountInput, ColorTagToggle, MiniMetric, FileDropButton } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija, inputCelda,
} from "../ui/planilla";
import { money, pct, formatDateDisplay } from "../lib/format";
import type { SemaphoreLevel } from "../ui/theme";
import type { CompanyName, PrintMode } from "../domain/types";

type FacturacionTabProps = {
  // El calendario anual filtrado a COBRANZAS, armado en App y pasado como slot para no repetir aca
  // los veinte props que necesita. Al ser el mismo componente, las dos vistas quedan vinculadas.
  calendarioCobranzasSlot?: React.ReactNode;
  // Facturas emitidas (listado de ARCA). Se mudaron de Pago a proveedores: van debajo del calendario
  // de facturas, que es donde se las mira.
  issuedInvoices: any[];
  updateIssuedInvoice: (id: number, field: any, value: any) => void;
  onImportArca: (files: FileList | File[] | null) => void;
  approvedJobsForLink: { budgetNumber: string; client: string; company: string }[];
  financialSemaphoreSummary: any;
  jobBillingCards: any[];
  annualCalendarMonths: any[];
  annualCalendarStartYear: number;
  setAnnualCalendarStartYear: (year: number) => void;
  annualCalendarYearOptions: { value: number; label: string }[];
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
  calendarioCobranzasSlot,
  issuedInvoices,
  updateIssuedInvoice,
  onImportArca,
  approvedJobsForLink,
  financialSemaphoreSummary,
  jobBillingCards,
  annualCalendarMonths,
  annualCalendarStartYear,
  setAnnualCalendarStartYear,
  annualCalendarYearOptions,
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
  const anchosArca = usePlanillaWidths("facturacion.arca", { label: 300, col: 124, colCompact: 94 });

  // Colapso por mes del calendario anual. Sin entrada explicita: los meses vacios nacen minimizados.
  const [collapsedMonths, setCollapsedMonths] = React.useState<Record<string, boolean>>({});
  const isMonthCollapsed = (key: string, count: number) => collapsedMonths[key] ?? count === 0;
  const toggleMonth = (key: string, count: number) =>
    setCollapsedMonths((prev) => ({ ...prev, [key]: !(prev[key] ?? count === 0) }));
  const setAllMonths = (collapsed: boolean) =>
    setCollapsedMonths(
      Object.fromEntries(annualCalendarMonths.map((m) => [m.key, collapsed]))
    );

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
          {/* Reflejo de la seccion COBRANZAS del Calendario anual - cash flow. Es el MISMO
              componente con los mismos datos y handlers, filtrado a cobranzas: por eso lo que se
              edita aca aparece alla y al reves, sin sincronizar nada a mano. */}
          {calendarioCobranzasSlot}

          <Panel
            title="Calendario de facturas"
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
                Solo <strong>facturas emitidas</strong>: las cobranzas se ven arriba, en el reflejo del
                Calendario anual. El semaforo marca la fecha; el color, la administracion (blanco/negro).
              </span>
            </div>

            <div style={styles.calendarWeekdays}>
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                <div key={day} style={styles.calendarWeekdayCell}>{day}</div>
              ))}
            </div>

            <div style={styles.calendarScroll}>
            <div style={styles.calendarGrid}>
              {financialMonthData.cells.map((cell) => {
                // Solo FACTURAS. Las cobranzas viven arriba, en el reflejo del calendario anual:
                // repetirlas aca haria que el mismo cobro se lea dos veces en la misma solapa.
                const items = (financialItemsByDate.get(cell.date) ?? []).filter(
                  (it: any) => it.type === "facturacion"
                );
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
            </div>
          </Panel>

          <Panel
            title="Facturas emitidas (listado de ARCA)"
            span="full"
            actions={
              <FileDropButton
                label="Importar listados de ARCA"
                accept=".xlsx,.xls,.csv"
                allowMultiple
                onFilesSelected={(files) => onImportArca(files)}
              />
            }
          >
            <div style={styles.sectionNote}>
              Es el export <strong>"Mis Comprobantes Emitidos"</strong> tal como lo baja ARCA. Se guardan
              los DATOS, no el PDF. <strong>La factura no suma ni resta al resultado</strong>: sirve para
              tener el listado, para cruzar las facturas entre las dos empresas contra los giros, y para
              saber lo que falta cobrar. La empresa emisora sale del CUIT del titulo del archivo, asi que
              no importa desde que empresa lo cargues. Los comprobantes repetidos no se duplican.
            </div>
            {issuedInvoices.length === 0 ? (
              <div style={{ ...styles.muted, marginTop: 8 }}>
                Todavia no cargaste ningun listado.
              </div>
            ) : (
              <>
                <div style={styles.metricGrid}>
                  <MiniMetric label="Comprobantes" value={String(issuedInvoices.length)} />
                  <MiniMetric
                    label="Total emitido"
                    value={money(issuedInvoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0))}
                  />
                  <MiniMetric
                    label="Periodo"
                    value={`${issuedInvoices.reduce((a, i) => (a < i.date ? a : i.date), issuedInvoices[0].date)} a ${issuedInvoices.reduce((a, i) => (a > i.date ? a : i.date), issuedInvoices[0].date)}`}
                  />
                </div>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
                    Ver los {issuedInvoices.length} comprobantes
                  </summary>
                  <div style={{ overflowX: "auto", marginTop: 8, maxHeight: 420, overflowY: "auto" }}>
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
                            Factura
                            <PlanillaManija
                              onMouseDown={(ev) => anchosArca.startResize(ev, "label")}
                              onDoubleClick={anchosArca.resetLabel}
                            />
                          </th>
                          <th style={thColumna}>
                            Fecha
                            <PlanillaManija
                              onMouseDown={(ev) => anchosArca.startResize(ev, "col")}
                              onDoubleClick={anchosArca.resetCol}
                            />
                          </th>
                          <th style={{ ...thColumna, textAlign: "right" }}>Total</th>
                          <th style={thFlexible}>Trabajo vinculado · receptor · tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...issuedInvoices]
                          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                          .map((inv) => (
                            <tr key={inv.id}>
                              <td
                                style={{
                                  ...tdNombre, fontWeight: 400,
                                  boxShadow: `inset 4px 0 0 ${getCompanyMeta(inv.company)?.primary || "#94a3b8"}`,
                                }}
                              >
                                <span
                                  title={inv.jobBudgetNumber ? "Vinculada a un trabajo" : "Sin vincular"}
                                  style={{
                                    display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                                    background: inv.jobBudgetNumber ? "#16a34a" : "#cbd5f5",
                                  }}
                                />
                                {inv.pointOfSale}-{inv.number}
                              </td>
                              <td style={{ ...tdDato, color: "#475569" }}>{inv.date}</td>
                              <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(inv.total)}</td>
                              <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                                  <select
                                    style={{ ...inputCelda, width: "auto", minWidth: 170 }}
                                    value={inv.jobBudgetNumber || ""}
                                    onChange={(e) => updateIssuedInvoice(inv.id, "jobBudgetNumber", e.target.value)}
                                  >
                                    <option value="">— sin vincular —</option>
                                    {approvedJobsForLink
                                      .filter((j) => j.company === inv.company)
                                      .map((j) => (
                                        <option key={j.budgetNumber} value={j.budgetNumber}>
                                          {j.budgetNumber} · {j.client}
                                        </option>
                                      ))}
                                  </select>
                                  <span style={{ color: "#94a3b8" }}>
                                    {(inv.counterpartyName || "").slice(0, 46)}
                                    {" · "}{inv.kind}
                                    {" · "}{getCompanyMeta(inv.company)?.short || inv.company}
                                  </span>
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
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
                  <div style={{ marginTop: 4 }}>
                    <ColorTagToggle
                      value={selectedFinancialItem.administration || "blanco"}
                      onSet={(v) => updateFinancialItem(selectedFinancialItem.id, "administration", v)}
                      size={16}
                    />
                  </div>
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
                  <AmountInput
                    style={styles.input}
                    value={selectedFinancialItem.amount}
                    onChange={(n) =>
                      updateFinancialItem(selectedFinancialItem.id, "amount", n)
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
