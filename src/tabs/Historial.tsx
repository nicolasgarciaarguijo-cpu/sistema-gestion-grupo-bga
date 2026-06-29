import React from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike, MiniMetric, Semaforo, SemaforoResumen } from "../ui/primitives";
import { money, formatDateDisplay } from "../lib/format";
import type { SemaphoreLevel } from "../ui/theme";
import type { PrintMode } from "../domain/types";

type HistorialTabProps = {
  exportedBudgetsCount: number;
  pendingExportBudgetsCount: number;
  crmClientRows: any[];
  visibleSavedBudgets: any[];
  crmSemaphoreSummary: any;
  selectedCrmClientKey: string | null;
  selectedCrmClient: any;
  approvedJobs: any[];
  getClientSemaphore: (row: any) => { level: SemaphoreLevel; label: string };
  getSavedBudgetDisplayLabel: (item: any) => string;
  restoreCrmAndBudgetsFromSupabase: () => void | Promise<void>;
  saveCrmAndBudgetsToSupabase: () => void | Promise<void>;
  exportPrint: (mode: PrintMode) => void;
  setSelectedCrmClientKey: React.Dispatch<React.SetStateAction<string | null>>;
  openBudgetHistoryItem: (budgetId: number) => void;
  loadBudgetFromSnapshot: (snapshot: any, budgetId: any) => void;
  removeSavedBudget: (budgetId: number) => void;
  crmClients: any[];
  COMPANY_OPTIONS: any[];
  addCrmClient: () => void;
  updateCrmClient: (id: number, field: string, value: string | number) => void;
  removeCrmClient: (id: number) => void;
  generateClientsFromHistory: () => void;
};

export function HistorialTab({
  exportedBudgetsCount,
  pendingExportBudgetsCount,
  crmClientRows,
  visibleSavedBudgets,
  crmSemaphoreSummary,
  selectedCrmClientKey,
  selectedCrmClient,
  approvedJobs,
  getClientSemaphore,
  getSavedBudgetDisplayLabel,
  restoreCrmAndBudgetsFromSupabase,
  saveCrmAndBudgetsToSupabase,
  exportPrint,
  setSelectedCrmClientKey,
  openBudgetHistoryItem,
  loadBudgetFromSnapshot,
  removeSavedBudget,
  crmClients,
  COMPANY_OPTIONS,
  addCrmClient,
  updateCrmClient,
  removeCrmClient,
  generateClientsFromHistory,
}: HistorialTabProps) {
  return (
        <div style={styles.column}>
          <Panel
            title="Resumen comercial"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={restoreCrmAndBudgetsFromSupabase} secondary>
                  Restaurar CRM Supabase
                </ButtonLike>
                <ButtonLike onClick={saveCrmAndBudgetsToSupabase}>
                  Guardar CRM y presupuestos
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Presupuestos realizados" value={String(exportedBudgetsCount)} />
              <MiniMetric label="Presupuestos faltantes" value={String(pendingExportBudgetsCount)} />
              <MiniMetric label="Clientes en CRM" value={String(crmClientRows.length)} />
              <MiniMetric label="Presupuestos guardados" value={String(visibleSavedBudgets.length)} />
            </div>
          </Panel>

          <Panel
            span="wide"
            title="Clientes (fuente de verdad)"
            actions={
              <div style={styles.inlineActions}>
                {crmClients.length === 0 && (
                  <ButtonLike onClick={generateClientsFromHistory} secondary>
                    Generar desde historial
                  </ButtonLike>
                )}
                <ButtonLike onClick={addCrmClient}>Agregar cliente</ButtonLike>
              </div>
            }
          >
            <div style={styles.noticeBox}>
              Los clientes cargados acá son la base del CRM y se autocompletan al cargar un
              presupuesto. Podés darlos de alta a mano o generarlos una vez desde el historial.
            </div>
            {crmClients.length === 0 ? (
              <div style={styles.empty}>
                Todavía no hay clientes-entidad. Usá "Generar desde historial" para crearlos a partir
                de los presupuestos existentes, o "Agregar cliente".
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Nombre / razón social</th>
                    <th>CUIT/CUIL</th>
                    <th>Contacto</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {crmClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <select
                          style={styles.input}
                          value={client.company}
                          onChange={(e) => updateCrmClient(client.id, "company", e.target.value)}
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
                          value={client.name}
                          onChange={(e) => updateCrmClient(client.id, "name", e.target.value)}
                          placeholder="Nombre del cliente"
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={client.taxId}
                          onChange={(e) => updateCrmClient(client.id, "taxId", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={client.contactName}
                          onChange={(e) => updateCrmClient(client.id, "contactName", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={client.contactPhone}
                          onChange={(e) => updateCrmClient(client.id, "contactPhone", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={client.contactEmail}
                          onChange={(e) => updateCrmClient(client.id, "contactEmail", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={client.notes}
                          onChange={(e) => updateCrmClient(client.id, "notes", e.target.value)}
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeCrmClient(client.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel span="wide" title="Semaforo de clientes">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Datos completos", value: String(crmSemaphoreSummary.verde) },
                { level: "amarillo", label: "Datos incompletos", value: String(crmSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Sin CUIT ni contacto", value: String(crmSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
          <Panel title="CRM de clientes" span="wide" actions={<ButtonLike onClick={() => exportPrint("report-crm")} secondary>Reporte</ButtonLike>}>
            {crmClientRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay clientes en CRM porque no hay presupuestos guardados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Contacto</th>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th>CUIT/CUIL</th>
                    <th>Presupuestos</th>
                    <th>Pend. exportar</th>
                    <th>Compro</th>
                    <th>Gasto acumulado</th>
                    <th>Ultimo enviado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {crmClientRows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {(() => {
                          const sc = getClientSemaphore(row);
                          return (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={sc.level} size={10} title={sc.label} />
                              <span>{row.client}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(row.customerType === "Cliente habitual"
                              ? styles.statusYellow
                              : styles.statusBlue),
                          }}
                        >
                          {row.customerType}
                        </span>
                      </td>
                      <td>{row.contactName || "-"}</td>
                      <td>{row.contactPhone || "-"}</td>
                      <td>{row.contactEmail || "-"}</td>
                      <td>{row.clientTaxId || "-"}</td>
                      <td>{row.quotes.length}</td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(!row.latestQuote?.exportedAt
                              ? styles.statusRed
                              : styles.statusGreen),
                          }}
                        >
                          {!row.latestQuote?.exportedAt ? "Pendiente" : "Entregado"}
                        </span>
                      </td>
                      <td>{row.bought ? "Si" : "No"}</td>
                      <td>{money(row.totalSpent)}</td>
                      <td>{row.latestQuote ? getSavedBudgetDisplayLabel(row.latestQuote) : "-"}</td>
                      <td>
                        {selectedCrmClientKey === row.key ? (
                          <button style={styles.smallBtn} onClick={() => setSelectedCrmClientKey(null)}>
                            Cerrar
                          </button>
                        ) : (
                          <button style={styles.smallBtn} onClick={() => setSelectedCrmClientKey(row.key)}>
                            Abrir CRM
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {selectedCrmClient && (
            <Panel
              span="half"
              title={`CRM ${selectedCrmClient.client}`}
              actions={<ButtonLike onClick={() => setSelectedCrmClientKey(null)} secondary>Cerrar CRM</ButtonLike>}
            >
              <div style={styles.metricGrid}>
                <MiniMetric label="Tipo" value={selectedCrmClient.customerType} />
                <MiniMetric label="Presupuestos" value={String(selectedCrmClient.quotes.length)} />
                <MiniMetric label="Compro" value={selectedCrmClient.bought ? "Si" : "No"} />
                <MiniMetric label="Gasto acumulado" value={money(selectedCrmClient.totalSpent)} />
              </div>
              <div style={styles.grid2}>
                <Panel title="Contacto" nested>
                  <div><strong>Persona:</strong> {selectedCrmClient.contactName || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Telefono:</strong> {selectedCrmClient.contactPhone || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Email:</strong> {selectedCrmClient.contactEmail || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>CUIT/CUIL:</strong> {selectedCrmClient.clientTaxId || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Notas:</strong> {selectedCrmClient.clientNotes || "-"}</div>
                </Panel>
                <Panel title="Empresas vinculadas" nested>
                  <div>{selectedCrmClient.companyLabels.join(", ") || "-"}</div>
                </Panel>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Presupuesto</th>
                    <th>Fecha</th>
                    <th>Proyecto</th>
                    <th>Estado</th>
                    <th>Compra</th>
                    <th>Exportado</th>
                    <th>Neto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCrmClient.quotes.map((item) => {
                    const wasBought = approvedJobs.some(
                      (job) => job.rootBudgetId === item.rootBudgetId || job.budgetId === item.id
                    );
                    return (
                      <tr key={item.id}>
                        <td>{getSavedBudgetDisplayLabel(item)}</td>
                        <td>{formatDateDisplay(item.date)}</td>
                        <td>{item.project}</td>
                        <td>{item.status}</td>
                        <td>{wasBought ? "Compro" : "No compro"}</td>
                        <td>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(item.exportedAt ? styles.statusGreen : styles.statusRed),
                            }}
                          >
                            {item.exportedAt ? "Si" : "No"}
                          </span>
                        </td>
                        <td>{money(item.netPrice)}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={styles.smallBtn} onClick={() => openBudgetHistoryItem(item.id)}>
                            Ver
                          </button>
                          <button style={styles.smallBtn} onClick={() => loadBudgetFromSnapshot(item.snapshot, item.id)}>
                            Editar
                          </button>
                          <button style={styles.smallBtn} onClick={() => removeSavedBudget(item.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          )}

        </div>
  );
}
