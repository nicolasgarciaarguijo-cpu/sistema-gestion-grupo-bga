import React from "react";
import { styles } from "../ui/styles";
import {
  Panel,
  ButtonLike,
  MiniMetric,
  Semaforo,
  SemaforoResumen,
  QuickMenu,
  QuickMenuTitle,
  QuickMenuSep,
  quickMenuItem,
} from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, focoCelda,
} from "../ui/planilla";
import { money, formatDateDisplay } from "../lib/format";
import type { SemaphoreLevel } from "../ui/theme";
import type { PrintMode, CrmClient } from "../domain/types";
import { faltantesDeCliente, duplicadosEnCrm, duplicadosDeCliente, esDelCliente } from "../domain/clients";
import { FichaCliente } from "../ui/FichaCliente";

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
  // Trabajos con su saldo (approvedJobsSummary) para la ficha del cliente; si no viene, usa approvedJobs.
  trabajosResumen?: any[];
  // Unificar dos fichas del CRM que son el mismo cliente (la segunda se suma a la primera y se quita).
  unificarCrmClients?: (quedaId: number, saleId: number) => void;
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
  trabajosResumen,
  unificarCrmClients,
}: HistorialTabProps) {
  const anchosFichas = usePlanillaWidths("historial.fichas", { label: 280, col: 140, colCompact: 106 });
  const anchosCrm = usePlanillaWidths("historial.crm", { label: 280, col: 120, colCompact: 92 });
  const anchosCotiz = usePlanillaWidths("historial.cotizaciones", { label: 240, col: 120, colCompact: 92 });
  const [menuCotiz, setMenuCotiz] = React.useState<null | { x: number; y: number; id: number }>(null);
  // FICHA DEL CLIENTE + "Faltan datos" + "Posibles duplicados" (Nicolas, 2026-10-22: "que en CRM me prepare la
  // lista y me haga un detalle de la informacion que estaria faltando a cada cliente creado para completar la ficha").
  const [fichaId, setFichaId] = React.useState<number | null>(null);
  const [vistaClientes, setVistaClientes] = React.useState<"lista" | "faltan" | "duplicados">("lista");
  const clientesCrm = crmClients as CrmClient[];
  const conFaltantes = React.useMemo(
    () =>
      clientesCrm
        .map((c) => ({ cliente: c, falta: faltantesDeCliente(c) }))
        .filter((x) => x.falta.length > 0)
        .sort((a, b) => b.falta.length - a.falta.length || (a.cliente.name || "").localeCompare(b.cliente.name || "")),
    [clientesCrm]
  );
  const paresDuplicados = React.useMemo(() => duplicadosEnCrm(clientesCrm, visibleSavedBudgets), [clientesCrm, visibleSavedBudgets]);
  const fichaCliente = fichaId != null ? clientesCrm.find((c) => c.id === fichaId) || null : null;
  const btnVista = (activo: boolean): React.CSSProperties => ({
    border: `1px solid ${activo ? "#0f172a" : "#cbd5e1"}`, background: activo ? "#0f172a" : "#fff", color: activo ? "#fff" : "#334155",
    borderRadius: 999, padding: "3px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  });
  const chipFalta: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 999, padding: "0 7px", marginRight: 4, whiteSpace: "nowrap" };

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

          <Panel span="full"
            title="Clientes (fuente de verdad)"
            actions={
              <div style={styles.inlineActions}>
                {/* Siempre a la vista (2026-10-22): suma los clientes viejos del historial que falten. */}
                <ButtonLike onClick={generateClientsFromHistory} secondary>
                  {crmClients.length === 0 ? "Generar desde historial" : "Sumar los clientes del historial que faltan"}
                </ButtonLike>
                <ButtonLike onClick={addCrmClient}>Agregar cliente</ButtonLike>
              </div>
            }
          >
            <div style={styles.noticeBox}>
              Los clientes cargados acá son la base del CRM y se autocompletan al cargar un
              presupuesto. Podés darlos de alta a mano o traer los del historial (presupuestos y trabajos viejos) con el botón de arriba.
            </div>
            {crmClients.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0" }}>
                <button type="button" style={btnVista(vistaClientes === "lista")} onClick={() => setVistaClientes("lista")}>
                  Lista ({crmClients.length})
                </button>
                <button type="button" style={btnVista(vistaClientes === "faltan")} onClick={() => setVistaClientes("faltan")}>
                  Faltan datos ({conFaltantes.length})
                </button>
                <button type="button" style={btnVista(vistaClientes === "duplicados")} onClick={() => setVistaClientes("duplicados")}>
                  Posibles duplicados ({paresDuplicados.length})
                </button>
              </div>
            )}
            {crmClients.length > 0 && vistaClientes === "faltan" ? (
              conFaltantes.length === 0 ? (
                <div style={styles.empty}>Todas las fichas están completas.</div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosFichas.vars }}>
                  <table className="planilla" style={planillaTable}>
                    <colgroup>
                      <col style={colLabel} />
                      <col style={colDato} />
                      <col style={colFlexible} />
                      <col style={colAcciones} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thEsquina}>Cliente</th>
                        <th style={{ ...thColumna, textAlign: "right" }}>Le faltan</th>
                        <th style={thFlexible}>Qué falta para completar la ficha</th>
                        <th style={thColumna} />
                      </tr>
                    </thead>
                    <tbody>
                      {conFaltantes.map(({ cliente: c, falta }) => (
                        <tr key={c.id} onClick={() => setFichaId(c.id)} style={{ cursor: "pointer" }} title="Click: abrir la ficha para completarla">
                          <td style={{ ...tdNombre, fontWeight: 400 }}>{c.name || "(sin nombre)"}</td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: falta.length >= 4 ? "#b91c1c" : "#b45309" }}>{falta.length}</td>
                          <td style={tdFlexible}>{falta.map((f) => <span key={f} style={chipFalta}>{f}</span>)}</td>
                          <td style={{ ...tdDato, ...tdAcciones }}>
                            <button type="button" style={btnFicha} onClick={(e) => { e.stopPropagation(); setFichaId(c.id); }}>Abrir ficha</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : crmClients.length > 0 && vistaClientes === "duplicados" ? (
              paresDuplicados.length === 0 ? (
                <div style={styles.empty}>No se encontraron clientes repetidos en el CRM.</div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosFichas.vars }}>
                  <table className="planilla" style={planillaTable}>
                    <colgroup>
                      <col style={colLabel} />
                      <col style={colLabel} />
                      <col style={colFlexible} />
                      <col style={{ width: 150 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thEsquina}>Cliente</th>
                        <th style={thColumna}>Parece el mismo que</th>
                        <th style={thFlexible}>Por qué</th>
                        <th style={thColumna} />
                      </tr>
                    </thead>
                    <tbody>
                      {paresDuplicados.map((p) => (
                        <tr key={`${p.a.id}-${p.b.id}`}>
                          <td style={{ ...tdNombre, fontWeight: 400 }}>{p.a.name}</td>
                          <td style={{ ...tdDato, textAlign: "left" }}>{p.b.name}</td>
                          <td style={{ ...tdFlexible, color: "#7c2d12" }}>{p.motivos.join(" · ")}</td>
                          <td style={{ ...tdDato, ...tdAcciones }}>
                            <button type="button" style={btnFicha} onClick={() => setFichaId(p.a.id)} title={`Ficha de ${p.a.name}`}>Ficha 1</button>{" "}
                            <button type="button" style={btnFicha} onClick={() => setFichaId(p.b.id)} title={`Ficha de ${p.b.name}`}>Ficha 2</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : crmClients.length === 0 ? (
              <div style={styles.empty}>
                Todavía no hay clientes-entidad. Usá "Generar desde historial" para crearlos a partir
                de los presupuestos existentes, o "Agregar cliente".
              </div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosFichas.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                  <col style={colAcciones} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Nombre / razón social
                      <PlanillaManija
                        onMouseDown={(ev) => anchosFichas.startResize(ev, "label")}
                        onDoubleClick={anchosFichas.resetLabel}
                      />
                    </th>
                    <th style={thColumna}>
                      CUIT/CUIL
                      <PlanillaManija
                        onMouseDown={(ev) => anchosFichas.startResize(ev, "col")}
                        onDoubleClick={anchosFichas.resetCol}
                      />
                    </th>
                    <th style={thFlexible}>Contacto · teléfono · email · empresa · notas</th>
                    <th style={thColumna} />
                  </tr>
                </thead>
                <tbody>
                  {crmClients.map((client) => (
                    <tr
                      key={client.id}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (window.confirm(`¿Quitar la ficha de "${client.name}"?`)) removeCrmClient(client.id);
                      }}
                      title="Click derecho: quitar la ficha"
                    >
                      <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }}>
                        <input
                          style={{ ...inputCelda, padding: "1px 8px" }}
                          {...focoCelda}
                          value={client.name}
                          onChange={(e) => updateCrmClient(client.id, "name", e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <input
                          style={{ ...inputCelda, padding: "1px 6px" }}
                          {...focoCelda}
                          value={client.taxId}
                          onChange={(e) => updateCrmClient(client.id, "taxId", e.target.value)}
                        />
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                          <input
                            style={{ ...inputCelda, width: 130 }}
                            {...focoCelda}
                            value={client.contactName}
                            placeholder="contacto"
                            onChange={(e) => updateCrmClient(client.id, "contactName", e.target.value)}
                          />
                          <input
                            style={{ ...inputCelda, width: 120 }}
                            {...focoCelda}
                            value={client.contactPhone}
                            placeholder="teléfono"
                            onChange={(e) => updateCrmClient(client.id, "contactPhone", e.target.value)}
                          />
                          <input
                            style={{ ...inputCelda, width: 170 }}
                            {...focoCelda}
                            value={client.contactEmail}
                            placeholder="email"
                            onChange={(e) => updateCrmClient(client.id, "contactEmail", e.target.value)}
                          />
                          <select
                            style={{ ...inputCelda, width: "auto" }}
                            value={client.company}
                            onChange={(e) => updateCrmClient(client.id, "company", e.target.value)}
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
                            value={client.notes}
                            placeholder="notas"
                            onChange={(e) => updateCrmClient(client.id, "notes", e.target.value)}
                          />
                        </span>
                      </td>
                      {/* La ficha se edita en la misma fila; el tachito hace lo mismo que el click derecho. */}
                      <td style={{ ...tdDato, ...tdAcciones }}>
                        <button
                          type="button"
                          title="Abrir la ficha del cliente (datos, presupuestos, trabajos, lo que le falta)"
                          style={btnFicha}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFichaId(client.id);
                          }}
                        >
                          Ficha{faltantesDeCliente(client).length ? ` · falta ${faltantesDeCliente(client).length}` : ""}
                        </button>{" "}
                        <button
                          type="button"
                          title="Borrar"
                          style={btnBorrar}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Quitar la ficha de "${client.name}"?`)) removeCrmClient(client.id);
                          }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
          <Panel title="CRM de clientes" span="full" actions={<ButtonLike onClick={() => exportPrint("report-crm")} secondary>Reporte</ButtonLike>}>
            {crmClientRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay clientes en CRM porque no hay presupuestos guardados.</div>
            ) : (
              <div style={{ ...planillaWrap, ...anchosCrm.vars }}>
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
                      Cliente
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCrm.startResize(ev, "label")}
                        onDoubleClick={anchosCrm.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Gasto acumulado
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCrm.startResize(ev, "col")}
                        onDoubleClick={anchosCrm.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Presupuestos</th>
                    <th style={thFlexible}>Tipo · entrega · contacto · último enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {crmClientRows.map((row) => (
                    <tr
                      key={row.key}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setSelectedCrmClientKey(selectedCrmClientKey === row.key ? null : row.key);
                      }}
                      onClick={() => typeof row.clientId === "number" && setFichaId(row.clientId)}
                      style={typeof row.clientId === "number" ? { cursor: "pointer" } : undefined}
                      title={typeof row.clientId === "number" ? "Click: abrir la ficha · Click derecho: abrir o cerrar los presupuestos de este cliente" : "Click derecho: abrir o cerrar los presupuestos de este cliente"}
                    >
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={row.client}>
                        <span
                          title={row.bought ? "Ya compró" : "Todavía no compró"}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                            background: row.bought ? "#16a34a" : "#cbd5f5",
                          }}
                        />
                        {row.client}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(row.totalSpent)}</td>
                      <td style={{ ...tdDato, textAlign: "right" }}>{row.quotes.length}</td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(row.customerType === "Cliente habitual" ? styles.statusGreen : styles.statusYellow),
                            }}
                          >
                            {row.customerType}
                          </span>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(!row.latestQuote?.exportedAt ? styles.statusRed : styles.statusGreen),
                            }}
                          >
                            {!row.latestQuote?.exportedAt ? "Pendiente" : "Entregado"}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            {row.contactName || "sin contacto"}
                            {row.contactPhone ? ` · ${row.contactPhone}` : ""}
                            {row.contactEmail ? ` · ${row.contactEmail}` : ""}
                            {row.clientTaxId ? ` · ${row.clientTaxId}` : ""}
                            {row.latestQuote ? ` · último ${getSavedBudgetDisplayLabel(row.latestQuote)}` : ""}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
              <div style={{ ...planillaWrap, ...anchosCotiz.vars }}>
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
                      Presupuesto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCotiz.startResize(ev, "label")}
                        onDoubleClick={anchosCotiz.resetLabel}
                      />
                    </th>
                    <th style={thColumna}>
                      Fecha
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCotiz.startResize(ev, "col")}
                        onDoubleClick={anchosCotiz.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Neto</th>
                    <th style={thFlexible}>Proyecto · estado · entrega</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCrmClient.quotes.map((item) => {
                    const wasBought = approvedJobs.some(
                      (job) => job.rootBudgetId === item.rootBudgetId || job.budgetId === item.id
                    );
                    return (
                      <tr
                        key={item.id}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setMenuCotiz({ x: ev.clientX, y: ev.clientY, id: item.id });
                        }}
                        title="Click derecho: ver, editar o quitar el presupuesto"
                      >
                        <td style={{ ...tdNombre, fontWeight: 400 }}>
                          <span
                            title={wasBought ? "Compró" : "No compró"}
                            style={{
                              display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                              background: wasBought ? "#16a34a" : "#cbd5f5",
                            }}
                          />
                          {getSavedBudgetDisplayLabel(item)}
                        </td>
                        <td style={{ ...tdDato, color: "#475569" }}>{formatDateDisplay(item.date)}</td>
                        <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(item.netPrice)}</td>
                        <td style={{ ...tdFlexible, color: "#64748b" }} title={item.project}>
                          {item.project}
                          <span style={{ color: "#94a3b8" }}>
                            {" · "}{item.status}
                            {" · "}{item.exportedAt ? "entregado" : "sin entregar"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {menuCotiz && (() => {
                const it = selectedCrmClient.quotes.find((x: any) => x.id === menuCotiz.id);
                const cerrar = () => setMenuCotiz(null);
                if (!it) return null;
                return (
                  <QuickMenu x={menuCotiz.x} y={menuCotiz.y} onClose={cerrar}>
                    <QuickMenuTitle>{getSavedBudgetDisplayLabel(it)}</QuickMenuTitle>
                    <button
                      style={quickMenuItem}
                      onClick={() => {
                        openBudgetHistoryItem(it.id);
                        cerrar();
                      }}
                    >
                      Ver
                    </button>
                    <button
                      style={quickMenuItem}
                      onClick={() => {
                        loadBudgetFromSnapshot(it.snapshot, it.id);
                        cerrar();
                      }}
                    >
                      Cargar para editar
                    </button>
                    <QuickMenuSep />
                    <button
                      style={{ ...quickMenuItem, color: "#b91c1c" }}
                      onClick={() => {
                        if (window.confirm(`¿Quitar el presupuesto ${getSavedBudgetDisplayLabel(it)}?`)) {
                          removeSavedBudget(it.id);
                        }
                        cerrar();
                      }}
                    >
                      Quitar presupuesto
                    </button>
                  </QuickMenu>
                );
              })()}
            </Panel>
          )}

          {fichaCliente && (
            <FichaCliente
              cliente={fichaCliente}
              presupuestos={visibleSavedBudgets.filter((b) => esDelCliente(fichaCliente, b))}
              trabajos={(trabajosResumen || approvedJobs).filter((j) => esDelCliente(fichaCliente, j))}
              duplicados={duplicadosDeCliente(fichaCliente, paresDuplicados)}
              companyOptions={COMPANY_OPTIONS}
              money={money}
              onGuardar={(cambios) =>
                Object.entries(cambios).forEach(([k, v]) => updateCrmClient(fichaCliente.id, k, (v ?? "") as string))
              }
              onAbrirFicha={(id) => setFichaId(id)}
              onUnificar={unificarCrmClients}
              onAbrirPresupuesto={(id) => {
                setFichaId(null);
                openBudgetHistoryItem(id);
              }}
              onCerrar={() => setFichaId(null)}
            />
          )}
        </div>
  );
}

// Boton visible de borrar en cada fila: hace lo mismo que el click derecho, para que nadie tenga
// que adivinar que el menu existe.
const colAcciones: React.CSSProperties = { width: 118 };
const btnFicha: React.CSSProperties = {
  border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 4,
  padding: "0 6px", fontSize: 11, lineHeight: "16px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};
const tdAcciones: React.CSSProperties = { whiteSpace: "nowrap", textAlign: "center", padding: "0 4px" };
const btnBorrar: React.CSSProperties = {
  border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 4,
  padding: "0 5px", fontSize: 11, lineHeight: "16px", cursor: "pointer",
};
