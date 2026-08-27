// Solapa BANCOS Y TARJETAS: el dinero que pasa por la cuenta y por las tarjetas.
//
// Salio de la solapa de Pago a proveedores (2026-08-27, pedido de Nicolas): ahi convivian el circuito
// administrativo de proveedores y todo lo bancario, y eran dos lecturas distintas mezcladas en una
// pantalla larguisima. Aca queda lo bancario y alla queda el proveedor.
//
// Que vive aca:
//   - la carga del extracto (dos vias: al espejo bancario, y clasificando movimientos a un grupo)
//   - los movimientos bancarios, que son el banco REAL
//   - las tarjetas de credito
//
// EL BANCO CORROBORA, NO CARGA: el extracto existe para constatar que todo lo que paso por la cuenta
// este cargado en el sistema. La excepcion es el ejercicio de puesta al dia, donde el extracto SI
// alimenta el Calendario anual. El modo depende de la FECHA del movimiento (ver domain/calendarFeeds).
//
// Y AL REVES: si en el banco aparece plata que el calendario no tiene, el movimiento queda con la
// pill D hasta que se le asigne un renglon. Asignarselo lo hace figurar en el Calendario anual.
import React from "react";
import { styles } from "../ui/styles";
import {
  Panel, Field, MiniMetric, ButtonLike, FileDropButton, PillD, moneyToneColor, ColorTag,
  QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem,
} from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija, useCeldaMarcada,
  inputCelda,
} from "../ui/planilla";
import { bankEntryMissingInfo } from "../domain/bankAssignment";
import { CALENDAR_SECTIONS } from "../domain/calendarStructure";
import { money, todayIso } from "../lib/format";
import { modoDelBanco } from "../domain/calendarFeeds";
import type { CostGroup, CostKind, Supplier, CompanyName } from "../domain/types";
import type { CostStatementDraftRow } from "./Costos";

type BancosTabProps = {
  // El banco corrobora, no carga: hasta esta fecha el extracto alimenta el Calendario anual (la
  // excepcion del ejercicio de puesta al dia). Ver domain/calendarFeeds.ts.
  bankLoadsUntil: string;
  onBankLoadsUntilChange: (value: string) => void;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  // Grupos de costo: el extracto clasificado arma gastos, y el gasto necesita su grupo.
  costGroups: CostGroup[];
  createCostGroup: (name: string, kind: CostKind) => string;
  // Buscadores de la conciliacion: salen de lo que YA existe en el sistema.
  approvedJobsForLink: { budgetNumber: string; client: string; company: string }[];
  suppliers: Supplier[];
  // Extracto -> gastos clasificados.
  statementDraft: CostStatementDraftRow[];
  statementMessage: string;
  statementBusy: boolean;
  onStatementFile: (file: File | null) => void;
  updateStatementDraftRow: (id: number, field: keyof CostStatementDraftRow, value: any) => void;
  commitStatementDraft: () => void;
  discardStatementDraft: () => void;
  // Movimientos bancarios (el banco real). Se navega por mes con shiftOperationalMonth.
  bankStatementSummary: any;
  monthBankStatementEntries: any[];
  operationalMonth: string;
  monthLabel: (month: string) => string;
  shiftOperationalMonth: (delta: number) => void;
  addBankStatementEntry: () => void;
  removeBankStatementEntry: (id: number) => void;
  updateBankStatementEntry: (id: number, field: any, value: string | number | boolean) => void;
  clearBankAssignment: (id: number) => void;
  uploadBankStatementFile: (id: number, file: File | null) => void;
  // Importador MASIVO al espejo bancario.
  bankMirrorPreview: Array<{ date: string; concept: string; amount: number; movementType: "credito" | "debito"; balance: number; dup: boolean }>;
  bankMirrorCompany: string;
  setBankMirrorCompany: (v: string) => void;
  bankMirrorBank: string;
  setBankMirrorBank: (v: string) => void;
  bankMirrorCurrency: "ARS" | "USD";
  setBankMirrorCurrency: (v: "ARS" | "USD") => void;
  bankMirrorMessage: string;
  bankMirrorBusy: boolean;
  onBankMirrorFile: (file: File | null) => void;
  commitBankMirrorDraft: () => void;
  discardBankMirrorDraft: () => void;
  knownBanks: string[];
  // Bloque de Tarjetas: se renderiza DENTRO de esta solapa, debajo del banco.
  tarjetasSlot?: React.ReactNode;
};

export function BancosTab({
  bankLoadsUntil,
  onBankLoadsUntilChange,
  COMPANY_OPTIONS,
  getCompanyMeta,
  costGroups,
  createCostGroup,
  approvedJobsForLink,
  suppliers,
  statementDraft,
  statementMessage,
  statementBusy,
  onStatementFile,
  updateStatementDraftRow,
  commitStatementDraft,
  discardStatementDraft,
  bankStatementSummary,
  monthBankStatementEntries,
  operationalMonth,
  monthLabel,
  shiftOperationalMonth,
  addBankStatementEntry,
  removeBankStatementEntry,
  updateBankStatementEntry,
  clearBankAssignment,
  uploadBankStatementFile,
  bankMirrorPreview,
  bankMirrorCompany,
  setBankMirrorCompany,
  bankMirrorBank,
  setBankMirrorBank,
  bankMirrorCurrency,
  setBankMirrorCurrency,
  bankMirrorMessage,
  bankMirrorBusy,
  onBankMirrorFile,
  commitBankMirrorDraft,
  discardBankMirrorDraft,
  knownBanks,
  tarjetasSlot,
}: BancosTabProps) {
  const anchosExtracto = usePlanillaWidths("bancos.extracto", { label: 340, col: 124, colCompact: 94 });
  const anchosEspejo = usePlanillaWidths("bancos.espejo", { label: 340, col: 124, colCompact: 94 });
  const anchosBanco = usePlanillaWidths("bancos.banco", { label: 260, col: 104, colCompact: 78 });
  const marcaBanco = useCeldaMarcada();

  // En que modo esta operando el banco HOY, para que se vea de un vistazo sin comparar fechas.
  const modoBancoHoy = modoDelBanco(todayIso(), bankLoadsUntil);

  const [soloSinAsignar, setSoloSinAsignar] = React.useState(false);
  // Conciliacion: fila desplegada para asignarle un lugar a la plata.
  const [assignOpenId, setAssignOpenId] = React.useState<number | null>(null);

  // La pill D solo MARCA que falta algo; toda accion sobre el movimiento sale del click derecho.
  const [ctxMenu, setCtxMenu] = React.useState<null | {
    x: number;
    y: number;
    kind: "banco";
    id: number;
  }>(null);
  const openCtxMenu = (ev: React.MouseEvent, kind: "banco", id: number) => {
    ev.preventDefault();
    // Sin esto, el click derecho llega a window y el propio menu que se esta abriendo se cierra solo
    // (pasa al saltar de una fila a otra con el menu ya abierto).
    ev.stopPropagation();
    setCtxMenu({ x: ev.clientX, y: ev.clientY, kind, id });
  };

  // Opciones del buscador, tomadas de lo que YA existe en el sistema (trabajos + proveedores/clientes).
  const partyOptions = React.useMemo(() => {
    const set = new Set<string>();
    approvedJobsForLink.forEach((j) => j.client && set.add(j.client.trim()));
    suppliers.forEach((s) => s.name && set.add(s.name.trim()));
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [approvedJobsForLink, suppliers]);

  // Solo los grupos no automaticos admiten carga manual.
  const manualGroupOptions = costGroups
    .filter((group) => group.active && !group.auto)
    .map((group) => group.name);

  // Si se elige "➕ nuevo grupo", pide nombre y tipo y lo crea al momento.
  const NEW_GROUP_OPTION = "__NEW_GROUP__";
  const pickGroupOrCreate = (raw: string, apply: (name: string) => void) => {
    if (raw !== NEW_GROUP_OPTION) {
      apply(raw);
      return;
    }
    const name = (window.prompt("Nombre del grupo nuevo (ej: Impuestos, Herrajes, Salud):") || "").trim();
    if (!name) return; // cancelado
    const esFijo = window.confirm(
      `"${name}": ¿es un costo FIJO?\n\nAceptar = FIJO (se repite todos los meses)\nCancelar = VARIABLE`
    );
    const created = createCostGroup(name, esFijo ? "fijo" : "variable");
    if (created) apply(created);
  };

  return (
    <>

      <Panel
        title="Importar extracto al espejo bancario (masivo)"
        span="full"
        actions={
          bankMirrorPreview.length > 0 ? (
            <>
              <ButtonLike onClick={commitBankMirrorDraft}>
                Cargar {bankMirrorPreview.filter((r) => !r.dup).length} nuevo(s)
              </ButtonLike>
              <ButtonLike onClick={discardBankMirrorDraft} secondary>
                Descartar
              </ButtonLike>
            </>
          ) : undefined
        }
      >
        <div style={styles.sectionNote}>
          Carga masiva del <strong>espejo bancario</strong> (lo que alimenta el calendario y el cruce):
          entran <strong>créditos y débitos</strong>, con su saldo. Elegí empresa, banco y moneda; reviso
          duplicados contra lo ya cargado y confirmás. (Distinto del import de arriba, que va a gastos.)
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "10px 0" }}>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 3 }}>
            Empresa
            <select style={styles.input} value={bankMirrorCompany} onChange={(e) => setBankMirrorCompany(e.target.value)}>
              {COMPANY_OPTIONS.filter((c: any) => c.value !== "General").map((c: any) => (
                <option key={c.value} value={c.value}>{c.short || c.value}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 3 }}>
            Banco / cuenta
            <input
              style={styles.input}
              list="bank-mirror-banks"
              placeholder="Ej: Patagonia, Santander"
              value={bankMirrorBank}
              onChange={(e) => setBankMirrorBank(e.target.value)}
            />
            <datalist id="bank-mirror-banks">
              {knownBanks.map((b) => <option key={b} value={b} />)}
            </datalist>
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 3 }}>
            Moneda
            <select style={styles.input} value={bankMirrorCurrency} onChange={(e) => setBankMirrorCurrency(e.target.value as "ARS" | "USD")}>
              <option value="ARS">$ (pesos)</option>
              <option value="USD">U$S (dólares)</option>
            </select>
          </label>
          <div style={{ alignSelf: "flex-end" }}>
            <FileDropButton
              label={bankMirrorBusy ? "Leyendo extracto..." : "Cargar extracto (Excel / CSV)"}
              accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
              onFileSelected={onBankMirrorFile}
            />
          </div>
        </div>
        {bankMirrorMessage && <div style={styles.sectionNote}>{bankMirrorMessage}</div>}
        {bankMirrorPreview.length > 0 && (
          <>
            <div style={styles.sectionNote}>
              {bankMirrorPreview.filter((r) => !r.dup).length} nuevo(s) ·{" "}
              {bankMirrorPreview.filter((r) => r.dup).length} ya cargado(s) (se omiten) — hacia{" "}
              <strong>{bankMirrorBank || "(elegí banco)"}</strong> · {bankMirrorCurrency}.
            </div>
            <div style={{ overflowX: "auto", maxHeight: 320 }}>
              <div style={{ ...planillaWrap, ...anchosEspejo.vars }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Concepto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosEspejo.startResize(ev, "label")}
                        onDoubleClick={anchosEspejo.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Monto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosEspejo.startResize(ev, "col")}
                        onDoubleClick={anchosEspejo.resetCol}
                      />
                    </th>
                    <th style={thColumna}>Fecha</th>
                    <th style={{ ...thFlexible, textAlign: "right" }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {bankMirrorPreview.slice(0, 60).map((r, i) => (
                    <tr key={i} style={{ opacity: r.dup ? 0.5 : 1 }}>
                      <td style={{ ...tdNombre, fontWeight: 400 }} title={r.concept}>
                        <span
                          title={r.dup ? "Ya está cargado" : "Movimiento nuevo"}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                            background: r.dup ? "#cbd5f5" : "#16a34a",
                          }}
                        />
                        {r.concept}
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: r.movementType === "debito" ? "#dc2626" : "#16a34a",
                        }}
                        title={r.movementType}
                      >
                        {money(r.amount)}
                      </td>
                      <td style={{ ...tdDato, color: "#475569" }}>{r.date}</td>
                      <td style={{ ...tdFlexible, textAlign: "right", color: "#64748b" }}>
                        {money(r.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {bankMirrorPreview.length > 60 && (
                <div style={styles.sectionNote}>… y {bankMirrorPreview.length - 60} más (se cargan todos los nuevos al confirmar).</div>
              )}
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Importar extracto bancario" span="full"
        actions={
          statementDraft.length > 0 ? (
            <>
              <ButtonLike onClick={commitStatementDraft}>
                Confirmar {statementDraft.filter((row) => row.include).length} movimiento(s)
              </ButtonLike>
              <ButtonLike onClick={discardStatementDraft} secondary>
                Descartar
              </ButtonLike>
            </>
          ) : undefined
        }
      >
        <FileDropButton
          label={statementBusy ? "Leyendo extracto..." : "Cargar extracto (Excel, PDF o CSV)"}
          accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
          onFileSelected={onStatementFile}
        />
        {statementMessage && <div style={styles.sectionNote}>{statementMessage}</div>}

        {statementDraft.length > 0 && (
          <>
            <div style={styles.sectionNote}>
              Reviso los movimientos y te propongo un grupo. Corregi lo que haga falta y confirma:
              solo se cargan los debitos tildados. Los creditos (plata que entra) no son costos.
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ ...planillaWrap, ...anchosExtracto.vars }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Concepto del banco
                      <PlanillaManija
                        onMouseDown={(ev) => anchosExtracto.startResize(ev, "label")}
                        onDoubleClick={anchosExtracto.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Importe
                      <PlanillaManija
                        onMouseDown={(ev) => anchosExtracto.startResize(ev, "col")}
                        onDoubleClick={anchosExtracto.resetCol}
                      />
                    </th>
                    <th style={thColumna}>Fecha</th>
                    <th style={thFlexible}>Grupo · administración</th>
                  </tr>
                </thead>
                <tbody>
                  {statementDraft.map((row) => (
                    <tr key={row.id} style={row.include ? undefined : { opacity: 0.45 }}>
                      <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }} title={row.concept}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                          <input
                            type="checkbox"
                            checked={row.include}
                            title="Cargar este movimiento"
                            style={{ flex: "0 0 auto" }}
                            onChange={(e) => updateStatementDraftRow(row.id, "include", e.target.checked)}
                          />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.concept}
                          </span>
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: moneyToneColor(row.movementType === "debito" ? "out" : "in"),
                        }}
                        title={row.movementType === "debito" ? "Débito" : "Crédito"}
                      >
                        {money(row.amount)}
                      </td>
                      <td style={{ ...tdDato, color: "#475569" }}>{row.date}</td>
                      <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                          <select
                            style={{ ...inputCelda, width: "auto", minWidth: 150 }}
                            value={row.group}
                            onChange={(e) =>
                              pickGroupOrCreate(e.target.value, (name) =>
                                updateStatementDraftRow(row.id, "group", name)
                              )
                            }
                          >
                            <option value="">Sin clasificar</option>
                            {manualGroupOptions.map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                            <option value={NEW_GROUP_OPTION}>➕ Crear grupo nuevo…</option>
                          </select>
                          <select
                            style={{ ...inputCelda, width: "auto" }}
                            value={row.administration}
                            onChange={(e) => updateStatementDraftRow(row.id, "administration", e.target.value)}
                          >
                            <option value="blanco">Blanco</option>
                            <option value="negro">Negro</option>
                          </select>
                          {row.suggestedVia && row.group && (
                            <span
                              style={{ fontSize: 11, color: "#7c3aed", whiteSpace: "nowrap" }}
                              title="Grupo sugerido por una regla aprendida. Confirmalo o cambialo."
                            >
                              🧠 sugerido{row.supplierName ? ` · ${row.supplierName}` : ""}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Movimientos bancarios · el banco real"
        span="full"
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ButtonLike
              secondary={!soloSinAsignar}
              onClick={() => setSoloSinAsignar((v) => !v)}
            >
              {soloSinAsignar ? "Ver todos" : "Solo sin asignar"}
            </ButtonLike>
            <ButtonLike onClick={anchosBanco.toggleCompacto} secondary>
              {anchosBanco.esCompacto ? "Ancho normal" : "Compacto"}
            </ButtonLike>
            <ButtonLike onClick={addBankStatementEntry}>Agregar movimiento</ButtonLike>
          </div>
        }
      >
        <div style={styles.sectionNote}>
          <strong>El banco corrobora, no carga.</strong> La carga del sistema es manual; el extracto
          está para constatar que todo lo que pasó por la cuenta esté cargado. La excepción es el
          ejercicio de puesta al día: hasta esa fecha el extracto <strong>sí</strong> alimenta el
          Calendario anual. Después, el movimiento se sigue viendo acá pero ya no suma al calendario.
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span>El extracto alimenta el calendario hasta:</span>
            <input
              type="date"
              style={{ ...styles.input, width: 170 }}
              value={bankLoadsUntil || ""}
              onChange={(e) => onBankLoadsUntilChange(e.target.value)}
              title="Fin del ejercicio que se está poniendo al día. Corré la fecha solo si la puesta al día se estira."
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.5,
                borderRadius: 999,
                padding: "2px 9px",
                color: modoBancoHoy === "carga" ? "#166534" : "#1e40af",
                background: modoBancoHoy === "carga" ? "#dcfce7" : "#dbeafe",
              }}
            >
              {modoBancoHoy === "carga" ? "HOY: CARGA" : "HOY: SOLO CORROBORA"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <ButtonLike secondary onClick={() => shiftOperationalMonth(-1)}>
            ‹ Mes anterior
          </ButtonLike>
          <strong style={{ minWidth: 150, textAlign: "center", textTransform: "capitalize" }}>
            {monthLabel(operationalMonth)}
          </strong>
          <ButtonLike secondary onClick={() => shiftOperationalMonth(1)}>
            Mes siguiente ›
          </ButtonLike>
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric label="Entró (créditos)" value={money(bankStatementSummary.credits)} tone="in" />
          <MiniMetric label="Salió (débitos)" value={money(bankStatementSummary.debits)} tone="out" />
          <MiniMetric label="Neto banco" value={money(bankStatementSummary.net)} />
          <MiniMetric label="Último saldo" value={money(bankStatementSummary.lastBalance)} />
        </div>
        <div style={styles.noticeBox}>
          Las métricas son <strong>acumuladas</strong> (todos los meses); la lista muestra solo{" "}
          <strong style={{ textTransform: "capitalize" }}>{monthLabel(operationalMonth)}</strong> —
          navegá con los botones de mes. Es el <strong>espejo de la cuenta real</strong>: no suma al
          resultado, solo refleja qué entró y salió.
        </div>
        {monthBankStatementEntries.length === 0 ? (
          <div style={styles.empty}>No hay movimientos bancarios en {monthLabel(operationalMonth)}.</div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosBanco.vars }}>
            <datalist id="bank-assign-jobs">
              {approvedJobsForLink.map((j) => (
                <option key={j.budgetNumber} value={j.budgetNumber}>
                  {j.budgetNumber} — {j.client}
                </option>
              ))}
            </datalist>
            <datalist id="bank-assign-parties">
              {partyOptions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={{ width: "var(--pl-col-w, 104px)", minWidth: 150 }} />
                <col style={colFlexible} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Concepto del banco
                      <PlanillaManija
                        onMouseDown={(ev) => anchosBanco.startResize(ev, "label")}
                        onDoubleClick={anchosBanco.resetLabel}
                      />
                  </th>
                  <th style={thColumna}>Fecha</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Monto
                      <PlanillaManija
                        onMouseDown={(ev) => anchosBanco.startResize(ev, "col")}
                        onDoubleClick={anchosBanco.resetCol}
                      />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Saldo</th>
                  <th style={thColumna}>Dónde va</th>
                  <th style={thFlexible}>Empresa · banco</th>
                </tr>
              </thead>
              <tbody>
                {monthBankStatementEntries
                  .filter((entry: any) => !soloSinAsignar || bankEntryMissingInfo(entry).length > 0)
                  .map((entry) => {
                  const missing = bankEntryMissingInfo(entry);
                  const kind = entry.assignedKind as string | undefined;
                  const open = assignOpenId === entry.id;
                  const isCobroPago = kind === "cobro" || kind === "pago";
                  return (
                  <React.Fragment key={entry.id}>
                  <tr
                    onContextMenu={(ev) => {
                      marcaBanco.marcar(String(entry.id));
                      openCtxMenu(ev, "banco", entry.id);
                    }}
                  >
                    <td
                      title={entry.concept}
                      style={{ ...tdNombre, ...marcaBanco.estilo(String(entry.id)), fontWeight: 400 }}
                    >
                      {entry.concept || "(sin concepto)"}
                    </td>
                    <td style={{ ...tdDato, color: "#64748b" }}>{entry.date}</td>
                    <td
                      style={{
                        ...tdDato,
                        textAlign: "right",
                        fontWeight: 600,
                        color: entry.movementType === "debito" ? "#dc2626" : "#0f172a",
                      }}
                    >
                      {entry.movementType === "debito" ? "− " : ""}
                      {money(entry.amount, entry.currency === "USD" ? "USD" : "ARS")}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#94a3b8" }}>
                      {money(entry.balance, entry.currency === "USD" ? "USD" : "ARS")}
                    </td>
                    <td style={{ ...tdDato, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {missing.length > 0 ? (
                          <PillD missing={missing} />
                        ) : (
                          <span title="Asignado" style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
                        )}
                        <span
                          style={{ color: kind ? "#334155" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis" }}
                          title={
                            kind
                              ? `${kind}${entry.assignedJobBudget ? " · " + entry.assignedJobBudget : ""}${entry.assignedParty ? " · " + entry.assignedParty : ""}`
                              : "Sin asignar"
                          }
                        >
                          {kind
                            ? `${kind}${entry.assignedJobBudget ? " · " + entry.assignedJobBudget : entry.assignedParty ? " · " + entry.assignedParty : ""}`
                            : "sin asignar"}
                        </span>
                        <button style={styles.smallBtn} onClick={() => setAssignOpenId(open ? null : entry.id)}>
                          {open ? "Cerrar ▲" : kind ? "Editar ▾" : "Asignar ▾"}
                        </button>
                      </div>
                    </td>
                    <td style={{ ...tdDato, color: "#64748b", whiteSpace: "nowrap" }}>
                      <span title={`${entry.company} · ${entry.bank}`}>
                        {getCompanyMeta(entry.company as any)?.short || entry.company} · {entry.bank}
                      </span>
                      <label style={{ ...styles.buttonLikeLabel, marginLeft: 6 }} title={entry.attachmentName || "Cargar resumen / comprobante"}>
                        {entry.attachmentName ? "📎✓" : "📎"}
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) => uploadBankStatementFile(entry.id, e.target.files?.[0] || null)}
                        />
                      </label>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={6} style={{ background: "rgba(2,6,23,0.04)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "10px 4px", alignItems: "flex-end" }}>
                          <Field label="¿Qué es? (de dónde viene / a dónde va)">
                            <select
                              style={styles.input}
                              value={entry.assignedKind || ""}
                              onChange={(e) => updateBankStatementEntry(entry.id, "assignedKind", e.target.value)}
                            >
                              <option value="">— Elegir —</option>
                              <option value="cobro">Cobro (entró de un trabajo/cliente)</option>
                              <option value="pago">Pago (a un proveedor)</option>
                              <option value="interno">Interno (entre cuentas/empresas)</option>
                              <option value="aporte">Aporte / préstamo del dueño</option>
                              <option value="impuesto">Impuesto / comisión bancaria</option>
                              <option value="otro">Otro</option>
                            </select>
                          </Field>
                          {kind === "cobro" && (
                            <Field label="Trabajo (buscá por ppto o cliente)">
                              <input
                                style={{ ...styles.input, minWidth: 200 }}
                                list="bank-assign-jobs"
                                placeholder="Ej: 3199"
                                value={entry.assignedJobBudget || ""}
                                onChange={(e) => updateBankStatementEntry(entry.id, "assignedJobBudget", e.target.value)}
                              />
                            </Field>
                          )}
                          {isCobroPago && (
                            <Field label={kind === "pago" ? "Proveedor" : "Cliente / tercero"}>
                              <input
                                style={{ ...styles.input, minWidth: 220 }}
                                list="bank-assign-parties"
                                placeholder="Buscá o escribí uno nuevo"
                                value={entry.assignedParty || ""}
                                onChange={(e) => updateBankStatementEntry(entry.id, "assignedParty", e.target.value)}
                              />
                            </Field>
                          )}
                          {isCobroPago && (
                            <Field label="Circuito">
                              <select
                                style={styles.input}
                                value={entry.administration || ""}
                                onChange={(e) => updateBankStatementEntry(entry.id, "administration", e.target.value)}
                              >
                                <option value="">—</option>
                                <option value="blanco">Blanco</option>
                                <option value="negro">Negro</option>
                              </select>
                            </Field>
                          )}
                          <Field label="Renglón del calendario anual">
                            <select
                              style={{ ...styles.input, minWidth: 220 }}
                              value={entry.conceptKey || ""}
                              onChange={(e) => updateBankStatementEntry(entry.id, "conceptKey", e.target.value)}
                            >
                              <option value="">— Sin clasificar —</option>
                              {CALENDAR_SECTIONS.filter((s) => s.items.length > 0).map((s) => (
                                <optgroup key={s.key} label={s.label}>
                                  {s.items.map((it) => (
                                    <option key={it.key} value={it.key}>{it.label}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </Field>
                          <Field label="Nota (opcional)">
                            <input
                              style={{ ...styles.input, minWidth: 180 }}
                              value={entry.assignmentNote || ""}
                              onChange={(e) => updateBankStatementEntry(entry.id, "assignmentNote", e.target.value)}
                            />
                          </Field>
                          {missing.length > 0 ? (
                            <div style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>
                              Falta: {missing.join(", ")}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>✓ Completo</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* TARJETAS: debajo del banco, en la misma solapa. */}
      {tarjetasSlot}

      {ctxMenu &&
        (() => {
          // Movimiento del banco: la pill D solo marca que falta algo; las acciones salen de acá.
          if (ctxMenu.kind === "banco") {
            const entry: any = monthBankStatementEntries.find((e: any) => e.id === ctxMenu.id);
            if (!entry) return null;
            const assigned = Boolean(
              entry.assignedKind || entry.assignedJobBudget || entry.assignedParty || entry.conceptKey
            );
            const close = () => setCtxMenu(null);
            return (
              <QuickMenu x={ctxMenu.x} y={ctxMenu.y} onClose={close}>
                <QuickMenuTitle>
                  {entry.movementType === "credito" ? "Entró" : "Salió"}{" "}
                  {money(Math.abs(Number(entry.amount) || 0))}
                </QuickMenuTitle>
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    setAssignOpenId(entry.id);
                    close();
                  }}
                >
                  {assigned ? "Editar asignación…" : "Asignar…"}
                </button>
                <button
                  style={quickMenuItem}
                  onClick={() => {
                    updateBankStatementEntry(
                      entry.id,
                      "administration",
                      entry.administration === "negro" ? "blanco" : "negro"
                    );
                    close();
                  }}
                >
                  <ColorTag color={entry.administration === "negro" ? "blanco" : "negro"} /> Cambiar a{" "}
                  {entry.administration === "negro" ? "BLANCO (B)" : "NEGRO (N)"}
                </button>
                {assigned && (
                  <>
                    <QuickMenuSep />
                    <button
                      style={quickMenuItem}
                      title="Borra clasificación, trabajo, tercero y renglón. El importe y el saldo no se tocan: vuelve a quedar sin asignar (D)."
                      onClick={() => {
                        clearBankAssignment(entry.id);
                        close();
                      }}
                    >
                      Limpiar asignación
                    </button>
                  </>
                )}
                <QuickMenuSep />
                <button
                  style={{ ...quickMenuItem, color: "#b91c1c" }}
                  onClick={() => {
                    if (window.confirm("¿Borrar este movimiento del banco?")) removeBankStatementEntry(entry.id);
                    close();
                  }}
                >
                  Borrar movimiento
                </button>
              </QuickMenu>
            );
          }
          return null;
        })()}
    </>
  );
}
