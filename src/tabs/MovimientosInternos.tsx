import React from "react";
import { FichaRegistro, BotonFicha, type CampoFicha } from "../ui/FichaRegistro";
import { styles } from "../ui/styles";
import type { PagoCruzado } from "../domain/pagosPorPersona";
import { Panel, MiniMetric, ButtonLike, AmountInput, ColorTagToggle, moneyToneColor } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { money, formatDateDisplay } from "../lib/format";
import type {
  CashHolding,
  CompanyName,
  CompanyScope,
  InternalTransfer,
  PersonLedgerEntry,
} from "../domain/types";
import type { PersonLedgerSummary } from "../domain/personLedger";
import type { CapitalEntry } from "../domain/contributions";
import { summarizeContributions } from "../domain/contributions";
import { buildLoanLines, sameLender, type CalendarLoan } from "../domain/loanLines";
import { FirmanteCelda } from "../ui/FirmanteSelect";
import { PaseModal } from "../ui/PaseModal";
import type { PaseForm } from "../domain/pases";
import { cuentaImplicita, type Cuenta } from "../domain/cuentas";

import NumInput from "../ui/NumInput";
// MOVIMIENTOS INTERNOS
//
// La solapa donde la plata cambia de bolsillo sin entrar ni salir de la empresa. Nace de un problema
// concreto (Nicolas, 2026-08-28): si deposito la caja en el banco, el extracto trae el credito y el
// efectivo nunca baja, asi que el mismo peso queda contado dos veces. El pase lo resuelve.
//
// Junta los cuatro bloques que hablan del mismo tema y que estaban repartidos entre Balance y Pago a
// proveedores:
//   1. Movimientos internos (efectivo <-> banco)     -- nuevo
//   2. Efectivo fuera del banco / caja de seguridad  -- venia de Balance
//   3. Deudas y aportes                              -- venia de Balance
//   4. Deuda con la gente                            -- venia de Balance (lectura; se salda en Compras)
//   5. Cuenta corriente entre las empresas del grupo -- venia de Pago a proveedores
//
// El scope de empresa es PROPIO de esta solapa: no sigue al selector de Balance.

const balanceSection: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "#475569",
  textTransform: "uppercase",
  margin: "4px 0 6px",
};

// Botón chico de borrar al final de cada fila: lo mismo que el click derecho, pero a la vista.
const botonBorrarFila: React.CSSProperties = {
  marginLeft: "auto",
  padding: "0 6px",
  fontSize: 12,
  lineHeight: "18px",
  color: "#b91c1c",
  background: "#fff",
  border: "1px solid #fecaca",
  borderRadius: 4,
  cursor: "pointer",
  flexShrink: 0,
};

// Fila compacta etiqueta -> valor. Igual que la de Balance, de donde vino el bloque de aportes.
function StatRow({
  label,
  value,
  tone,
  strong,
  last,
}: {
  label: React.ReactNode;
  value: string;
  tone?: "in" | "out";
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
      </span>
    </div>
  );
}

type MovimientosInternosTabProps = {
  // Devoluciones de caja chica que volvieron a OTRA cuenta que la de origen: son pases entre cuentas.
  devolucionesCruzadas?: Array<{ id: string; company: string; fecha: string; fondo: string; responsable: string; monto: number; color: string; origen: string; destino: string }>;
  companyScope: CompanyScope | "__ALL__";
  setCompanyScope: (scope: CompanyScope | "__ALL__") => void;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  // 1) pases efectivo <-> banco
  internalTransfers: InternalTransfer[];
  setInternalTransfers: React.Dispatch<React.SetStateAction<InternalTransfer[]>>;
  onGuardarPase: (f: PaseForm) => void;
  cuentas: Cuenta[];
  removeInternalTransfer: (entryId: number) => void;
  // 2) efectivo fuera del banco
  cashHoldings: CashHolding[];
  setCashHoldings: React.Dispatch<React.SetStateAction<CashHolding[]>>;
  addCashHolding: () => void;
  removeCashHolding: (entryId: number) => void;
  // 3) deudas y aportes
  capitalEntries: CapitalEntry[];
  setCapitalEntries: React.Dispatch<React.SetStateAction<CapitalEntry[]>>;
  addCapitalEntry: () => void;
  removeCapitalEntry: (entryId: number) => void;
  calendarLoans: CalendarLoan[];
  // 4) cuenta corriente con la gente
  personLedger: PersonLedgerSummary;
  personLedgerEntries: PersonLedgerEntry[];
  setPersonLedgerEntries: React.Dispatch<React.SetStateAction<PersonLedgerEntry[]>>;
  addPersonLedgerEntry: (kind?: "debe" | "haber") => void;
  removePersonLedgerEntry: (entryId: number) => void;
  // 7) facturas de una empresa pagadas por la otra (informativo)
  pagosCruzados?: PagoCruzado[];
  // 5) cuenta corriente entre empresas
  intercompanyAccount: {
    transfers: any[];
    transfersUsd?: any[];
    summary: { totalTransferred: number; pairs: any[] };
    posicion?: Array<{ deudor: string; acreedor: string; saldo: number }>;
    posicionUsd?: Array<{ deudor: string; acreedor: string; saldo: number }>;
  };
  // El ejercicio cerrado de esa cuenta: se muestra aparte y solo cuando se lo llama.
  intercompanyAnterior?: MovimientosInternosTabProps["intercompanyAccount"];
  ejercicioCerrado?: string;
  // Como cerro el ejercicio anterior: siempre se ve en una linea; el desglose solo si se entra a ese ejercicio.
  cierreAnterior?: MovimientosInternosTabProps["intercompanyAccount"];
  viendoEjercicioCerrado?: boolean;
  onVerEjercicioCerrado?: () => void;
  // Deudas y aportes <-> Desendeudamiento
  onMigrarADesendeudamiento: (capitalId: number) => void;
  onAbrirDeuda: (deudaId: number) => void;
};

const botonDeuda: React.CSSProperties = { border: "1px solid #c4b5fd", background: "#f5f3ff", color: "#5b21b6", borderRadius: 6, padding: "1px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };

export function MovimientosInternosTab({
  devolucionesCruzadas = [],
  pagosCruzados = [],
  companyScope,
  setCompanyScope,
  COMPANY_OPTIONS,
  getCompanyMeta,
  updateArrayItem,
  internalTransfers,
  setInternalTransfers,
  onGuardarPase,
  cuentas,
  removeInternalTransfer,
  cashHoldings: cashHoldingsAll,
  setCashHoldings,
  addCashHolding,
  removeCashHolding,
  capitalEntries: capitalEntriesAll,
  setCapitalEntries,
  addCapitalEntry,
  removeCapitalEntry,
  calendarLoans,
  personLedger,
  personLedgerEntries,
  setPersonLedgerEntries,
  addPersonLedgerEntry,
  removePersonLedgerEntry,
  intercompanyAccount,
  intercompanyAnterior,
  ejercicioCerrado,
  cierreAnterior,
  viendoEjercicioCerrado,
  onVerEjercicioCerrado,
  onMigrarADesendeudamiento,
  onAbrirDeuda,
}: MovimientosInternosTabProps) {
  const anchosPases = usePlanillaWidths("movint.pases", { label: 260, col: 120, colCompact: 92 });
  const anchosEfectivo = usePlanillaWidths("movint.efectivo", { label: 260, col: 120, colCompact: 92 });
  const anchosCapital = usePlanillaWidths("movint.capital", { label: 260, col: 120, colCompact: 92 });
  const anchosGente = usePlanillaWidths("movint.gente", { label: 280, col: 120, colCompact: 92 });
  const anchosCcPares = usePlanillaWidths("movint.ccPares", { label: 280, col: 130, colCompact: 100 });
  const anchosCcGiros = usePlanillaWidths("movint.ccGiros", { label: 280, col: 130, colCompact: 100 });

  const enScope = (company: string) => companyScope === "__ALL__" || company === companyScope;
  const ordenar = <T extends { id: number; date: string; company: any }>(items: T[]) =>
    [...items]
      .filter((item) => enScope(String(item.company)))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);

  // Un pase entre empresas se ve desde las dos: la de origen y la de destino.
  const transfers = internalTransfers
    .filter((t) => enScope(String(t.company)) || (!!t.companyDestino && enScope(String(t.companyDestino))))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
  const cashHoldings = ordenar(cashHoldingsAll);
  const capitalEntries = ordenar(capitalEntriesAll);

  const contributionsSummary = React.useMemo(
    () => summarizeContributions(capitalEntriesAll.filter((item) => enScope(String(item.company)) && item.deudaId == null)),
    [capitalEntriesAll, companyScope]
  );
  const loanLines = React.useMemo(
    () =>
      buildLoanLines(
        calendarLoans.filter((l) => enScope(String(l.company))),
        capitalEntriesAll.filter((item) => enScope(String(item.company)))
      ),
    [calendarLoans, capitalEntriesAll, companyScope]
  );

  // Neto de los pases en pesos del scope: positivo = salio de la caja al banco.
  const netoPases = transfers
    .filter((t) => (t.currency || "ARS") !== "USD")
    .filter((t) => t.direction === "efectivo_a_banco" || t.direction === "banco_a_efectivo")
    .reduce((acc, t) => acc + (t.direction === "banco_a_efectivo" ? -1 : 1) * Number(t.amount || 0), 0);

  const [ficha, setFicha] = React.useState<null | { tipo: string; id: number }>(null);
  const empresasReales = COMPANY_OPTIONS.filter((c: any) => c.value && c.value !== "General" && cuentas.some((x) => x.company === c.value));
  const [pase, setPase] = React.useState<null | { form: PaseForm; firmante?: string }>(null);
  const nombreCuenta = (id?: string) => (id ? cuentas.find((c) => c.id === id)?.nombre || cuentaImplicita(id).nombre : "");
  const abrirPase = (item: InternalTransfer) =>
    setPase({
      firmante: item.firmante,
      form: {
        id: item.id,
        date: item.date,
        amount: Number(item.amount || 0),
        currency: item.currency === "USD" ? "USD" : "ARS",
        company: String(item.company),
        cuentaId: item.cuentaId || "",
        companyDestino: String(item.companyDestino || item.company),
        cuentaDestinoId: item.cuentaDestinoId || "",
        description: item.description || "",
        notes: item.notes || "",
      },
    });
  const nuevoPase = () => {
    const empresa = String(companyScope !== "__ALL__" ? companyScope : empresasReales[0]?.value || "");
    setPase({
      form: {
        date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
        amount: 0,
        currency: "ARS",
        company: empresa,
        cuentaId: "",
        companyDestino: empresa,
        cuentaDestinoId: "",
        description: "",
        notes: "",
      },
    });
  };
  return (
    <>
      {pase && (
        <PaseModal
          inicial={pase.form}
          firmanteAnterior={pase.firmante}
          empresas={empresasReales.map((c: any) => ({ value: String(c.value), short: c.short }))}
          cuentas={cuentas}
          money={money}
          onGuardar={(f) => {
            onGuardarPase(f);
            setPase(null);
          }}
          onCerrar={() => setPase(null)}
        />
      )}
      {ficha && (() => {
        const comunes = (empresa: string): CampoFicha[] => [{ key: "company", label: empresa, tipo: "empresa" }];
        const bn = [{ value: "blanco", label: "Blanco" }, { value: "negro", label: "Negro" }];
        const mon = [{ value: "ARS", label: "Pesos" }, { value: "USD", label: "Dólares" }];
        let titulo = "";
        let valores: any = null;
        let campos: CampoFicha[] = [];
        let set: (k: string, v: any) => void = () => {};
        if (ficha.tipo === "efectivo") {
          valores = cashHoldingsAll.find((x) => x.id === ficha.id);
          titulo = valores?.description || "Efectivo";
          campos = [
            ...comunes("Empresa"),
            { key: "date", label: "Fecha", tipo: "fecha" },
            { key: "kind", label: "Entra / sale", tipo: "select", opciones: [{ value: "ingreso", label: "Entra" }, { value: "egreso", label: "Sale" }] },
            { key: "amount", label: "Monto", tipo: "numero" },
            { key: "currency", label: "Moneda", tipo: "select", opciones: mon },
            { key: "color", label: "Blanco / negro", tipo: "select", opciones: bn },
            { key: "description", label: "Descripción", tipo: "texto", ancho: "completo" },
            { key: "notes", label: "Notas", tipo: "area" },
          ];
          set = (k, v) => updateArrayItem(setCashHoldings, ficha.id, k as any, v);
        } else if (ficha.tipo === "capital") {
          valores = capitalEntriesAll.find((x) => x.id === ficha.id);
          titulo = valores ? `${valores.kind === "prestamo" ? "Préstamo" : "Aporte"} · ${valores.origin || ""}` : "Aporte / préstamo";
          campos = [
            ...comunes("Empresa (la que recibe o devuelve)"),
            { key: "date", label: "Fecha", tipo: "fecha" },
            { key: "origin", label: "De quién", tipo: "texto" },
            // Ya en Desendeudamiento: es un prestamo recibido, la devolucion se maneja alla.
            ...((valores?.deudaId != null
              ? []
              : [
                  { key: "kind", label: "Tipo", tipo: "select", opciones: [{ value: "aporte", label: "Aporte (no vuelve)" }, { value: "prestamo", label: "Préstamo (vuelve)" }] },
                  { key: "direction", label: "Sentido", tipo: "select", opciones: [{ value: "recibido", label: "Entró plata" }, { value: "devuelto", label: "Se devolvió" }] },
                ]) as CampoFicha[]),
            { key: "amount", label: "Monto", tipo: "numero" },
            { key: "color", label: "Blanco / negro", tipo: "select", opciones: bn },
            { key: "notes", label: "Notas", tipo: "area" },
          ];
          set = (k, v) => updateArrayItem(setCapitalEntries, ficha.id, k as any, v);
        } else if (ficha.tipo === "gente") {
          valores = personLedgerEntries.find((x) => x.id === ficha.id);
          titulo = valores ? `${valores.person || "Persona"} · ${valores.kind === "haber" ? "haber" : "debe"}` : "Cuenta con la gente";
          campos = [
            ...comunes("Empresa"),
            { key: "person", label: "Persona", tipo: "texto" },
            { key: "date", label: "Fecha", tipo: "fecha" },
            { key: "kind", label: "Debe / haber", tipo: "select", opciones: [{ value: "debe", label: "Debe" }, { value: "haber", label: "Haber" }] },
            { key: "amount", label: "Monto", tipo: "numero" },
            { key: "color", label: "Blanco / negro", tipo: "select", opciones: bn },
            { key: "description", label: "Descripción", tipo: "texto", ancho: "completo" },
            { key: "notes", label: "Notas", tipo: "area" },
          ];
          set = (k, v) => updateArrayItem(setPersonLedgerEntries, ficha.id, k as any, v);
        }
        if (!valores) return null;
        return <FichaRegistro titulo={titulo} subtitulo={valores.firmante ? `Firmó ${valores.firmante}` : undefined} valores={valores} campos={campos} empresas={COMPANY_OPTIONS} onCambiar={set} onCerrar={() => setFicha(null)} />;
      })()}
    <div style={styles.column}>
      <Panel
        title="Movimientos internos - efectivo y banco"
        span="full"
        actions={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              style={{ ...inputCelda, width: "auto" }}
              value={companyScope}
              onChange={(e) => setCompanyScope(e.target.value as CompanyScope | "__ALL__")}
            >
              <option value="__ALL__">Todas las empresas</option>
              {COMPANY_OPTIONS.filter((c: any) => c.value && c.value !== "General").map((c: any) => (
                <option key={c.value} value={c.value}>
                  {c.short}
                </option>
              ))}
            </select>
            <ButtonLike onClick={nuevoPase}>Agregar pase</ButtonLike>
          </span>
        }
      >
        <div style={styles.noticeBox}>
          La plata que <strong>cambia de bolsillo</strong>: deposito la caja en el banco, saco del cajero, paso de un banco
          a otro. En cada pase se elige <strong>de dónde sale y a dónde va</strong>. Si es entre <strong>dos empresas</strong>, queda
          el debe y haber en la cuenta corriente entre las empresas (abajo). <strong>No es ingreso ni egreso</strong>:
          el total de la empresa no cambia, cambia donde esta. Sirve para que el mismo peso no se cuente
          dos veces: el <strong>saldo del banco ya sale del extracto</strong>, asi que el pase solo mueve
          el <strong>efectivo</strong>; sin el, un deposito subiria el banco y la caja nunca bajaria.
          <br />
          Un <strong>deposito de efectivo negro baja la caja negra</strong> (en el banco la plata es
          blanca, y esa pata la trae el extracto).{" "}
          <strong>No cargues aca la extraccion para armar un fondo de caja chica</strong>: esa plata ya
          entra a la caja por la solapa Caja chica.
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric
            label="Neto: de la caja al banco"
            value={money(netoPases)}
            tone={netoPases >= 0 ? "out" : "in"}
          />
          <MiniMetric label="Pases cargados" value={String(transfers.length)} />
        </div>
        {transfers.length === 0 ? (
          <div style={styles.empty}>
            No hay pases cargados. Usa "Agregar pase" cuando deposites la caja o saques plata del banco.
          </div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosPases.vars }}>
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
                    Descripcion
                    <PlanillaManija
                      onMouseDown={(ev) => anchosPases.startResize(ev, "label")}
                      onDoubleClick={anchosPases.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Monto
                    <PlanillaManija
                      onMouseDown={(ev) => anchosPases.startResize(ev, "col")}
                      onDoubleClick={anchosPases.resetCol}
                    />
                  </th>
                  <th style={thColumna}>Fecha</th>
                  <th style={thFlexible}>De dónde sale → a dónde va · moneda · color · notas</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((item) => (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (window.confirm("Quitar este pase de " + money(item.amount) + "?")) {
                        removeInternalTransfer(item.id);
                      }
                    }}
                    title="Click derecho: quitar el pase"
                  >
                    <td
                      style={{
                        ...tdNombre,
                        fontWeight: 400,
                        padding: 0,
                        boxShadow:
                          "inset 4px 0 0 " + (item.direction === "banco_a_efectivo" ? "#16a34a" : "#dc2626"),
                      }}
                    >
                      <input
                        style={{ ...inputCelda, padding: "1px 8px" }}
                        {...focoCelda}
                        value={item.description}
                        placeholder={item.direction === "banco_a_efectivo" ? "extraccion" : "deposito"}
                        onChange={(e) => updateArrayItem(setInternalTransfers, item.id, "description", e.target.value)}
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <AmountInput
                        style={{
                          ...inputCeldaDerecha,
                          color: item.direction === "banco_a_efectivo" ? "#166534" : "#b91c1c",
                          fontWeight: 700,
                        }}
                        {...focoCelda}
                        value={item.amount}
                        onChange={(n) => updateArrayItem(setInternalTransfers, item.id, "amount", n)}
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <input
                        style={{ ...inputCelda, padding: "1px 6px" }}
                        {...focoCelda}
                        type="date"
                        value={item.date}
                        onChange={(e) => updateArrayItem(setInternalTransfers, item.id, "date", e.target.value)}
                      />
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                        <FirmanteCelda value={item.firmante} firmadoEn={item.firmadoEn} />
                        {(() => {
                          const faltaAlgo = !item.cuentaId || !item.cuentaDestinoId;
                          return (
                            <button
                              type="button"
                              onClick={() => abrirPase(item)}
                              title="Abrir la ficha del pase"
                              style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: faltaAlgo ? "#b91c1c" : "#0f172a" }}
                            >
                              {faltaAlgo ? "⚠ Falta elegir de dónde sale y a dónde va" : `${nombreCuenta(item.cuentaId)} → ${nombreCuenta(item.cuentaDestinoId)}`}
                            </button>
                          );
                        })()}
                        {item.companyDestino && item.companyDestino !== item.company && (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 999, padding: "1px 8px" }}>
                            entre empresas: {getCompanyMeta(item.company)?.short} → {getCompanyMeta(item.companyDestino)?.short}
                          </span>
                        )}
                        <span>{item.currency === "USD" ? "U$S" : "$"} · {item.color === "negro" ? "negro" : "blanco"}</span>
<BotonFicha onClick={() => abrirPase(item)} />
                        <input
                          style={{ ...inputCelda, flex: 1, minWidth: 90, color: "#94a3b8" }}
                          {...focoCelda}
                          value={item.notes}
                          placeholder="notas"
                          onChange={(e) => updateArrayItem(setInternalTransfers, item.id, "notes", e.target.value)}
                        />
                        <button
                          type="button"
                          style={botonBorrarFila}
                          title="Borrar"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (window.confirm("Quitar este pase de " + money(item.amount) + "?")) {
                              removeInternalTransfer(item.id);
                            }
                          }}
                        >
                          🗑
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Efectivo fuera del banco · caja de seguridad"
        span="full"
        actions={<ButtonLike onClick={addCashHolding}>Agregar movimiento</ButtonLike>}
      >
        <div style={styles.noticeBox}>
          Efectivo que <strong>no</strong> está en el banco ni en caja chica (caja de seguridad,
          plata en mano). Se asienta como ingreso/egreso y alimenta la{" "}
          <strong>billetera de efectivo</strong> de la reserva de arriba, con su color. El{" "}
          <strong>color (blanco/negro) depende del origen</strong> de esa plata: no se asume nada.
          Pesos y dólares nunca se suman. Respeta el corte por período elegido.
        </div>
        {(() => {
          const net = (currency: "ARS" | "USD", color: "blanco" | "negro") =>
            cashHoldings
              .filter((h) => (h.currency || "ARS") === currency && (h.color || "blanco") === color)
              .reduce((acc, h) => acc + (h.kind === "egreso" ? -1 : 1) * Number(h.amount || 0), 0);
          const arsB = net("ARS", "blanco");
          const arsN = net("ARS", "negro");
          const usdB = net("USD", "blanco");
          const usdN = net("USD", "negro");
          return (
            <div style={styles.metricGrid}>
              <MiniMetric label="Efectivo $ blanco" value={money(arsB)} />
              <MiniMetric label="Efectivo $ negro" value={money(arsN)} />
              {(usdB !== 0 || usdN !== 0) && (
                <>
                  <MiniMetric label="Efectivo U$S blanco" value={money(usdB, "USD")} />
                  <MiniMetric label="Efectivo U$S negro" value={money(usdN, "USD")} />
                </>
              )}
            </div>
          );
        })()}
        {cashHoldings.length === 0 ? (
          <div style={styles.empty}>
            No hay efectivo fuera del banco cargado. Usá "Agregar movimiento" para asentar el primero.
          </div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosEfectivo.vars }}>
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
                  Descripción
                  <PlanillaManija
                    onMouseDown={(ev) => anchosEfectivo.startResize(ev, "label")}
                    onDoubleClick={anchosEfectivo.resetLabel}
                  />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Monto
                  <PlanillaManija
                    onMouseDown={(ev) => anchosEfectivo.startResize(ev, "col")}
                    onDoubleClick={anchosEfectivo.resetCol}
                  />
                </th>
                <th style={thColumna}>Fecha</th>
                <th style={thFlexible}>Moneda · movimiento · color · empresa · notas</th>
              </tr>
            </thead>
            <tbody>
              {cashHoldings.map((item) => (
                <tr
                  key={item.id}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (window.confirm(`¿Quitar "${item.description}" del efectivo fuera del banco?`)) {
                      removeCashHolding(item.id);
                    }
                  }}
                  title="Click derecho: quitar el movimiento"
                >
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400, padding: 0,
                      boxShadow: `inset 4px 0 0 ${item.kind === "ingreso" ? "#16a34a" : "#dc2626"}`,
                    }}
                  >
                    <input
                      style={{ ...inputCelda, padding: "1px 8px" }}
                      {...focoCelda}
                      value={item.description}
                      onChange={(e) => updateArrayItem(setCashHoldings, item.id, "description", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <AmountInput
                      style={{
                        ...inputCeldaDerecha,
                        color: item.kind === "ingreso" ? "#166534" : "#b91c1c",
                        fontWeight: 700,
                      }}
                      {...focoCelda}
                      value={item.amount}
                      onChange={(n) => updateArrayItem(setCashHoldings, item.id, "amount", n)}
                    />
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <input
                      style={{ ...inputCelda, padding: "1px 6px" }}
                      {...focoCelda}
                      type="date"
                      value={item.date}
                      onChange={(e) => updateArrayItem(setCashHoldings, item.id, "date", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                      <FirmanteCelda value={item.firmante} firmadoEn={item.firmadoEn} />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={item.currency}
                        onChange={(e) => updateArrayItem(setCashHoldings, item.id, "currency", e.target.value)}
                      >
                        <option value="ARS">$ Pesos</option>
                        <option value="USD">U$S Dólares</option>
                      </select>
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={item.kind}
                        onChange={(e) => updateArrayItem(setCashHoldings, item.id, "kind", e.target.value)}
                      >
                        <option value="ingreso">Ingreso</option>
                        <option value="egreso">Egreso</option>
                      </select>
                      <ColorTagToggle
                        value={item.color}
                        onSet={(v) => updateArrayItem(setCashHoldings, item.id, "color", v)}
                        size={16}
                      />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={item.company}
                        onChange={(e) => updateArrayItem(setCashHoldings, item.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
<BotonFicha onClick={() => setFicha({ tipo: "efectivo", id: item.id })} />
                      <input
                        style={{ ...inputCelda, flex: 1, minWidth: 90, color: "#94a3b8" }}
                        {...focoCelda}
                        value={item.notes}
                        placeholder="notas"
                        onChange={(e) => updateArrayItem(setCashHoldings, item.id, "notes", e.target.value)}
                      />
                      <button
                        type="button"
                        style={botonBorrarFila}
                        title="Borrar"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (window.confirm(`¿Quitar "${item.description}" del efectivo fuera del banco?`)) {
                            removeCashHolding(item.id);
                          }
                        }}
                      >
                        🗑
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
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
          no se suman con los pesos. Lo que se clasifica como <strong>PRÉSTAMO en el Calendario
          anual</strong> arma solo su línea acá, con el nombre del prestamista; si ya lo habías
          asentado a mano, no se cuenta dos veces. Con <strong>"Migrar a Desendeudamiento"</strong> la
          deuda o el aporte pasa a esa solapa para definir cómo se devuelve: desde ahí se sigue y deja de
          sumar en este resumen.
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric label="Aportes (capital)" value={money(contributionsSummary.aportes.total)} tone="in" />
          <MiniMetric
            label="Préstamos pendientes"
            value={money(
              contributionsSummary.prestamosPendientes.total +
                loanLines.reduce((acc, l) => acc + l.sinAsentar, 0)
            )}
            tone="out"
          />
          <MiniMetric
            label="Total recibido"
            value={money(
              contributionsSummary.totalRecibido +
                loanLines.reduce((acc, l) => acc + l.sinAsentar, 0)
            )}
            tone="in"
          />
          {contributionsSummary.usdReference !== 0 && (
            <MiniMetric
              label="USD congelado (ref.)"
              value={`US$ ${contributionsSummary.usdReference.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            />
          )}
        </div>
        {(() => {
          // Una línea por prestamista: lo asentado a mano + lo que entró por el Calendario anual
          // (sección PRÉSTAMOS). El calendario arma la línea solo, con el nombre del prestamista;
          // si ese mismo préstamo ya estaba cargado a mano, no se suma dos veces.
          type Fila = { origin: string; total: number; prestamo: number; delBanco: number };
          const filas: Fila[] = contributionsSummary.byOrigin.map((o) => ({
            origin: o.origin,
            total: o.total,
            prestamo: o.prestamoPendiente,
            delBanco: 0,
          }));
          loanLines.forEach((l) => {
            if (l.sinAsentar === 0 && l.asentado === 0) return;
            const fila = filas.find((f) => sameLender(f.origin, l.lender));
            if (fila) {
              fila.total += l.sinAsentar;
              fila.prestamo += l.sinAsentar;
              fila.delBanco += l.recibido;
            } else {
              filas.push({
                origin: l.lender,
                total: l.sinAsentar,
                prestamo: l.sinAsentar,
                delBanco: l.recibido,
              });
            }
          });
          if (filas.length === 0) return null;
          filas.sort((a, b) => b.total - a.total);
          return (
            <>
              <div style={balanceSection}>Quién puso cuánto</div>
              <div style={{ marginBottom: 12 }}>
                {filas.map((o) => (
                  <StatRow
                    key={o.origin}
                    label={
                      o.delBanco > 0 ? (
                        <span>
                          {o.origin}{" "}
                          <span
                            style={{ fontSize: 11, color: "#7c3aed" }}
                            title={`Entró ${money(o.delBanco)} clasificado como préstamo en el Calendario anual`}
                          >
                            · del calendario
                          </span>
                        </span>
                      ) : (
                        o.origin
                      )
                    }
                    value={`${money(o.total)}${
                      o.prestamo !== 0 ? ` (préstamo ${money(o.prestamo)})` : ""
                    }`}
                    tone={o.total < 0 ? "out" : "in"}
                  />
                ))}
              </div>
            </>
          );
        })()}
        {capitalEntries.length === 0 ? (
          <div style={styles.empty}>
            No hay aportes ni préstamos cargados. Usá "Agregar movimiento" para asentar el primero.
          </div>
        ) : (
          <div style={{ ...planillaWrap, ...anchosCapital.vars }}>
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
                  Origen
                  <PlanillaManija
                    onMouseDown={(ev) => anchosCapital.startResize(ev, "label")}
                    onDoubleClick={anchosCapital.resetLabel}
                  />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Monto $
                  <PlanillaManija
                    onMouseDown={(ev) => anchosCapital.startResize(ev, "col")}
                    onDoubleClick={anchosCapital.resetCol}
                  />
                </th>
                <th style={thColumna}>Fecha</th>
                <th style={thFlexible}>Tipo · movimiento · color · empresa · U$S · notas</th>
              </tr>
            </thead>
            <tbody>
              {capitalEntries.map((item) => (
                <tr
                  key={item.id}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (window.confirm(`¿Quitar "${item.origin}" de aportes y préstamos?`)) removeCapitalEntry(item.id);
                  }}
                  title="Click derecho: quitar el movimiento"
                >
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400, padding: 0,
                      boxShadow: `inset 4px 0 0 ${item.direction === "recibido" ? "#16a34a" : "#dc2626"}`,
                    }}
                  >
                    <input
                      style={{ ...inputCelda, padding: "1px 8px" }}
                      {...focoCelda}
                      value={item.origin}
                      onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "origin", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <AmountInput
                      style={{
                        ...inputCeldaDerecha,
                        color: item.direction === "recibido" ? "#166534" : "#b91c1c",
                        fontWeight: 700,
                      }}
                      {...focoCelda}
                      value={item.amount}
                      onChange={(n) => updateArrayItem(setCapitalEntries, item.id, "amount", n)}
                    />
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <input
                      style={{ ...inputCelda, padding: "1px 6px" }}
                      {...focoCelda}
                      type="date"
                      value={item.date}
                      onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "date", e.target.value)}
                    />
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                      <FirmanteCelda value={item.firmante} firmadoEn={item.firmadoEn} />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        disabled={item.deudaId != null}
                        value={item.kind}
                        onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "kind", e.target.value)}
                      >
                        <option value="aporte">Aporte</option>
                        <option value="prestamo">Préstamo</option>
                      </select>
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        disabled={item.deudaId != null}
                        value={item.direction}
                        onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "direction", e.target.value)}
                      >
                        <option value="recibido">Recibido</option>
                        <option value="devuelto">Devuelto</option>
                      </select>
                      <ColorTagToggle
                        value={item.color}
                        onSet={(v) => updateArrayItem(setCapitalEntries, item.id, "color", v)}
                        size={16}
                      />
                      <select
                        style={{ ...inputCelda, width: "auto" }}
                        value={item.company}
                        onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
<BotonFicha onClick={() => setFicha({ tipo: "capital", id: item.id })} />
                      {item.deudaId != null ? (
                        <button type="button" style={botonDeuda} title="Abrir la deuda en Desendeudamiento" onClick={() => onAbrirDeuda(item.deudaId as number)}>
                          En Desendeudamiento →
                        </button>
                      ) : item.direction === "recibido" ? (
                        <button type="button" style={botonDeuda} title="Pasar a Desendeudamiento para definir la devolución" onClick={() => onMigrarADesendeudamiento(item.id)}>
                          Migrar a Desendeudamiento
                        </button>
                      ) : null}
                      <span style={{ color: "#94a3b8" }}>U$S</span>
                      <NumInput
                        style={{ ...inputCelda, width: 72, textAlign: "right" }}
                        {...focoCelda}
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
                      <input
                        style={{ ...inputCelda, flex: 1, minWidth: 90, color: "#94a3b8" }}
                        {...focoCelda}
                        value={item.notes}
                        placeholder="notas"
                        onChange={(e) => updateArrayItem(setCapitalEntries, item.id, "notes", e.target.value)}
                      />
                      <button
                        type="button"
                        style={botonBorrarFila}
                        title="Borrar"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (window.confirm(`¿Quitar "${item.origin}" de aportes y préstamos?`)) removeCapitalEntry(item.id);
                        }}
                      >
                        🗑
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Panel>

      {/* CUENTA CORRIENTE CON LA GENTE. No es un listado de facturas: es un saldo por persona con
          movimientos, como cualquier cuenta corriente. Los DEBE automáticos (factura que puso alguien,
          caja chica excedida) se arreglan en su solapa de origen; acá se cargan los que no cuelgan de
          nada y, sobre todo, los reintegros. La regla vive en domain/personLedger.ts. */}
      <Panel
        title="Cuenta corriente con la gente"
        span="full"
        actions={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ButtonLike onClick={() => addPersonLedgerEntry("debe")}>Puso plata (DEBE)</ButtonLike>
            <ButtonLike onClick={() => addPersonLedgerEntry("haber")}>Le devolví (HABER)</ButtonLike>
          </span>
        }
      >
        <div style={styles.noticeBox}>
          Lo que la empresa le debe a cada persona porque puso plata de su bolsillo: pagó algo que no
          se había previsto, cubrió un imprevisto, o <strong>se excedió del fondo de caja chica</strong>{" "}
          que tenía asignado. <strong>DEBE</strong> = puso plata · <strong>HABER</strong> = se le
          devolvió · el saldo es lo que falta devolverle.
          <br />
          Entran <strong>solas</strong> las facturas de compra cargadas a nombre de alguien y el
          excedente de los fondos de caja chica; esas se corrigen en <strong>Compras</strong> y{" "}
          <strong>Caja chica</strong>. Acá se carga lo que no tiene factura y los reintegros.{" "}
          <strong>Un reintegro pagado en efectivo baja la caja</strong>; si fue por transferencia no,
          porque ya salió por el extracto.
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric
            label="Total a devolver"
            value={money(personLedger.total)}
            tone={personLedger.total > 1 ? "out" : undefined}
          />
          {personLedger.aFavorTotal > 1 && (
            <MiniMetric
              label="A favor de la empresa"
              value={money(personLedger.aFavorTotal)}
              tone="in"
            />
          )}
          <MiniMetric label="Personas con cuenta" value={String(personLedger.accounts.length)} />
        </div>

        {personLedger.accounts.length === 0 ? (
          <div style={styles.empty}>
            Nadie puso plata de su bolsillo. Al día.
          </div>
        ) : (
          personLedger.accounts.map((cuenta) => (
            <details key={cuenta.person} style={{ marginTop: 10 }} open={Math.abs(cuenta.saldo) > 1}>
              <summary style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 12 }}>
                <strong style={{ fontSize: 15, color: "#0f172a" }}>{cuenta.person}</strong>
                <span
                  style={{
                    fontWeight: 700,
                    color: cuenta.saldo > 1 ? "#b45309" : cuenta.saldo < -1 ? "#15803d" : "#64748b",
                  }}
                >
                  {cuenta.saldo > 1
                    ? `se le debe ${money(cuenta.saldo)}`
                    : cuenta.saldo < -1
                    ? `tiene ${money(-cuenta.saldo)} de la empresa`
                    : "al día"}
                </span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  debe {money(cuenta.debe)} · haber {money(cuenta.haber)} · {cuenta.movements.length}{" "}
                  {cuenta.movements.length === 1 ? "movimiento" : "movimientos"}
                </span>
              </summary>
              <div style={{ ...planillaWrap, ...anchosGente.vars, marginTop: 8 }}>
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
                        Concepto
                        <PlanillaManija
                          onMouseDown={(ev) => anchosGente.startResize(ev, "label")}
                          onDoubleClick={anchosGente.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Monto
                        <PlanillaManija
                          onMouseDown={(ev) => anchosGente.startResize(ev, "col")}
                          onDoubleClick={anchosGente.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Fecha</th>
                      <th style={thFlexible}>De dónde sale · cómo se pagó · empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuenta.movements.map((mov) => {
                      const manual = mov.source === "manual" && mov.entryId != null;
                      const entry = manual
                        ? personLedgerEntries.find((e) => e.id === mov.entryId)
                        : undefined;
                      const esHaber = mov.kind === "haber";
                      return (
                        <tr
                          key={mov.key}
                          onContextMenu={(ev) => {
                            if (!manual || !mov.entryId) return;
                            ev.preventDefault();
                            ev.stopPropagation();
                            if (window.confirm("Quitar este movimiento de " + money(mov.amount) + "?")) {
                              removePersonLedgerEntry(mov.entryId);
                            }
                          }}
                          title={
                            manual
                              ? "Click derecho: quitar el movimiento"
                              : mov.source === "factura"
                              ? "Sale de una factura de Compras: se corrige allá"
                              : "Sale de un fondo de Caja chica: se corrige allá"
                          }
                        >
                          <td
                            style={{
                              ...tdNombre,
                              fontWeight: 400,
                              padding: 0,
                              boxShadow: "inset 4px 0 0 " + (esHaber ? "#16a34a" : "#dc2626"),
                            }}
                          >
                            {entry ? (
                              <input
                                style={{ ...inputCelda, padding: "1px 8px" }}
                                {...focoCelda}
                                value={entry.description}
                                placeholder={esHaber ? "reintegro" : "qué pagó"}
                                onChange={(e) =>
                                  updateArrayItem(setPersonLedgerEntries, entry.id, "description", e.target.value)
                                }
                              />
                            ) : (
                              <span style={{ padding: "0 8px", color: "#475569" }}>{mov.description}</span>
                            )}
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            {entry ? (
                              <AmountInput
                                style={{
                                  ...inputCeldaDerecha,
                                  color: esHaber ? "#166534" : "#b91c1c",
                                  fontWeight: 700,
                                }}
                                {...focoCelda}
                                value={entry.amount}
                                onChange={(n) => updateArrayItem(setPersonLedgerEntries, entry.id, "amount", n)}
                              />
                            ) : (
                              <span
                                style={{
                                  display: "block",
                                  textAlign: "right",
                                  padding: "0 8px",
                                  fontWeight: 700,
                                  color: esHaber ? "#166534" : "#b91c1c",
                                }}
                              >
                                {money(mov.amount)}
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            {entry ? (
                              <input
                                style={{ ...inputCelda, padding: "1px 6px" }}
                                {...focoCelda}
                                type="date"
                                value={entry.date}
                                onChange={(e) =>
                                  updateArrayItem(setPersonLedgerEntries, entry.id, "date", e.target.value)
                                }
                              />
                            ) : (
                              <span style={{ padding: "0 6px", color: "#475569" }}>
                                {mov.date ? formatDateDisplay(mov.date) : "sin fecha"}
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                            <span
                              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: esHaber ? "#15803d" : "#b45309",
                                }}
                              >
                                {esHaber ? "HABER" : "DEBE"}
                              </span>
                              {entry ? (
                                <FirmanteCelda value={entry.firmante} firmadoEn={entry.firmadoEn} />
                              ) : null}
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                {mov.source === "factura"
                                  ? "de Compras"
                                  : mov.source === "caja-chica"
                                  ? "de Caja chica"
                                  : "cargado a mano"}
                              </span>
                              {entry ? (
                                <>
                                  <ColorTagToggle
                                    value={entry.color}
                                    onSet={(v) => updateArrayItem(setPersonLedgerEntries, entry.id, "color", v)}
                                    size={16}
                                  />
                                  {esHaber && (
                                    <select
                                      style={{ ...inputCelda, width: "auto" }}
                                      value={entry.paymentMethod || "efectivo"}
                                      onChange={(e) =>
                                        updateArrayItem(
                                          setPersonLedgerEntries,
                                          entry.id,
                                          "paymentMethod",
                                          e.target.value as any
                                        )
                                      }
                                      title="En efectivo baja la caja; por banco no (ya salió por el extracto)"
                                    >
                                      <option value="efectivo">Efectivo (baja la caja)</option>
                                      <option value="transferencia">Transferencia</option>
                                      <option value="cheque">Cheque</option>
                                      <option value="debito">Débito automático</option>
                                    </select>
                                  )}
                                  <input
                                    style={{ ...inputCelda, width: 130 }}
                                    {...focoCelda}
                                    value={entry.person}
                                    placeholder="persona"
                                    list="personas-cuenta-corriente"
                                    onChange={(e) =>
                                      updateArrayItem(setPersonLedgerEntries, entry.id, "person", e.target.value)
                                    }
                                  />
                                  <select
                                    style={{ ...inputCelda, width: "auto" }}
                                    value={entry.company}
                                    onChange={(e) =>
                                      updateArrayItem(setPersonLedgerEntries, entry.id, "company", e.target.value as any)
                                    }
                                  >
                                    {COMPANY_OPTIONS.map((company: any) => (
                                      <option key={company.value} value={company.value}>
                                        {company.short}
                                      </option>
                                    ))}
                                  </select>
<BotonFicha onClick={() => setFicha({ tipo: "gente", id: entry.id })} />
                                </>
                              ) : (
                                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                  {getCompanyMeta(mov.company as CompanyName)?.short || mov.company}
                                </span>
                              )}
                              {/* Solo lo cargado a mano se borra acá; lo de Compras/Caja chica se corrige allá. */}
                              {manual && mov.entryId ? (
                                <button
                                  type="button"
                                  style={botonBorrarFila}
                                  title="Borrar"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    if (window.confirm("Quitar este movimiento de " + money(mov.amount) + "?")) {
                                      removePersonLedgerEntry(mov.entryId as number);
                                    }
                                  }}
                                >
                                  🗑
                                </button>
                              ) : null}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))
        )}
        <datalist id="personas-cuenta-corriente">
          {Array.from(new Set(personLedger.accounts.map((c) => c.person))).map((nombre) => (
            <option key={nombre} value={nombre} />
          ))}
        </datalist>
      </Panel>

      {devolucionesCruzadas.filter((d) => companyScope === "__ALL__" || d.company === companyScope).length > 0 && (
        <Panel title="Caja chica: devoluciones a otra cuenta" span="full">
          <div style={{ ...styles.muted, marginBottom: 8 }}>
            Lo que sobró de un fondo de caja chica volvió a una cuenta distinta de la que salió. No debería pasar,
            pero si pasa es un pase entre cuentas y queda acá a la vista. Se corrige en Caja chica (click derecho sobre
            el fondo, "A qué cuenta vuelve lo que sobra").
          </div>
          <table className="planilla" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", fontSize: 12 }}>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Fondo</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Salió de</th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Volvió a</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {devolucionesCruzadas
                .filter((d) => companyScope === "__ALL__" || d.company === companyScope)
                .map((d) => (
                  <tr key={d.id}>
                    <td style={{ padding: "4px 8px" }}>{d.fecha.slice(8, 10)}/{d.fecha.slice(5, 7)}/{d.fecha.slice(0, 4)}</td>
                    <td style={{ padding: "4px 8px" }}>
                      {d.fondo} · {d.responsable} · {getCompanyMeta(d.company as any)?.short || d.company}
                      {d.color === "negro" ? " (negro)" : ""}
                    </td>
                    <td style={{ padding: "4px 8px" }}>{d.origen}</td>
                    <td style={{ padding: "4px 8px", color: "#b45309", fontWeight: 700 }}>{d.destino}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right" }}>{money(d.monto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Panel>
      )}

      {(() => {
        const filas = pagosCruzados.filter((p) => companyScope === "__ALL__" || p.empresaPaga === companyScope || p.empresaFactura === companyScope);
        if (filas.length === 0) return null;
        const fecha = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
        const corta = (c: string) => getCompanyMeta(c as any)?.short || c;
        return (
          <Panel title={`⚠ Pagos cruzados entre empresas (${filas.length})`} span="full">
            <div style={{ ...styles.muted, marginBottom: 8 }}>
              Facturas de una empresa que pagó la otra. No debería pasar: la plata salió de una empresa y el gasto es de la
              otra, así que la empresa de la factura le debe a la que pagó. Hay que pedir el cambio de factura o devolver la plata. Se corrige en la factura (Compras → click → "Empresa que paga").
            </div>
            <table className="planilla" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", fontSize: 12 }}>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>Fecha del pago</th>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>Factura</th>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>Es de</th>
                  <th style={{ textAlign: "left", padding: "4px 8px" }}>La pagó</th>
                  <th style={{ textAlign: "right", padding: "4px 8px" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((p) => (
                  <tr key={p.facturaId}>
                    <td style={{ padding: "4px 8px" }}>{fecha(p.date)}</td>
                    <td style={{ padding: "4px 8px" }}>{p.detalle || "Factura"}</td>
                    <td style={{ padding: "4px 8px" }}>{corta(p.empresaFactura)}</td>
                    <td style={{ padding: "4px 8px", color: "#b45309", fontWeight: 700 }}>{corta(p.empresaPaga)}</td>
                    <td style={{ padding: "4px 8px", textAlign: "right" }}>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        );
      })()}

      {[
        { cuenta: intercompanyAccount, titulo: "Cuenta corriente entre las empresas del grupo", cerrado: false },
        ...(intercompanyAnterior ? [{ cuenta: intercompanyAnterior, titulo: `Cuenta corriente entre las empresas · ejercicio ${ejercicioCerrado || "anterior"} (cerrado)`, cerrado: true }] : []),
      ].map(({ cuenta, titulo, cerrado }) => (
      <Panel key={titulo} title={titulo} span="full">
        <div style={styles.sectionNote}>
          Lo que una empresa le gira a la otra <strong>no es un pago ni un cobro</strong>: para el grupo
          no entro ni salio nada, solo cambio de bolsillo. Por eso no suma al resultado. Pero cada giro
          se cruza con una <strong>factura entre las dos</strong> o con una <strong>devolucion</strong>,
          y lo que no esta cruzado es lo que hay que definir. Los giros salen de los <strong>pases entre empresas</strong> que
          se cargan arriba y del CUIT de la otra empresa en la referencia del banco (si son el mismo, cuentan una vez).
        </div>
        {!cerrado && ejercicioCerrado && cierreAnterior && cierreAnterior.transfers.length + (cierreAnterior.transfersUsd || []).length > 0 && (() => {
          const saldos = [
            ...(cierreAnterior.posicion || []).map((p) => ({ ...p, moneda: "ARS" as const })),
            ...(cierreAnterior.posicionUsd || []).map((p) => ({ ...p, moneda: "USD" as const })),
          ];
          return (
            <div style={{ margin: "8px 0", padding: "6px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span>
                Cómo cerró {ejercicioCerrado}:{" "}
                <strong>
                  {saldos.length === 0
                    ? "sin saldo entre las empresas"
                    : saldos.map((p) => `${getCompanyMeta(p.deudor as CompanyName)?.short || p.deudor} le debe ${money(p.saldo, p.moneda)} a ${getCompanyMeta(p.acreedor as CompanyName)?.short || p.acreedor}`).join(" · ")}
                </strong>
                {" "}· no suma con este ejercicio
              </span>
              {onVerEjercicioCerrado && (
                <ButtonLike secondary onClick={onVerEjercicioCerrado}>{viendoEjercicioCerrado ? "Esconder el desglose" : "Ver el desglose"}</ButtonLike>
              )}
            </div>
          );
        })()}
        {[...(cuenta.posicion || []).map((p) => ({ ...p, moneda: "ARS" as const })), ...(cuenta.posicionUsd || []).map((p) => ({ ...p, moneda: "USD" as const }))].map((p) => (
          <div key={`${p.moneda}-${p.deudor}`} style={{ margin: "8px 0", padding: "8px 12px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 14, color: "#92400e" }}>
            Cómo estamos: <strong>{getCompanyMeta(p.deudor as CompanyName)?.short || p.deudor} le debe {money(p.saldo, p.moneda)} a {getCompanyMeta(p.acreedor as CompanyName)?.short || p.acreedor}</strong>
          </div>
        ))}
        <div style={styles.metricGrid}>
          <MiniMetric
            label="Girado entre empresas"
            value={money(cuenta.summary.totalTransferred)}
          />
          <MiniMetric
            label="Giros"
            value={String(cuenta.transfers.length)}
          />
          <MiniMetric
            label="Sin declarar factura"
            value={money(
              cuenta.summary.pairs.reduce((acc, p) => acc + p.withoutBacking, 0)
            )}
            tone="out"
          />
        </div>
        {cuenta.transfers.length === 0 ? (
          <div style={{ ...styles.muted, marginTop: 8 }}>
            No hay giros entre las empresas en este ejercicio: ni pases entre empresas cargados, ni movimientos del banco con el
            CUIT de la otra.
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <div style={{ ...planillaWrap, ...anchosCcPares.vars }}>
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
                      Quién le giró a quién
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCcPares.startResize(ev, "label")}
                        onDoubleClick={anchosCcPares.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Girado
                      <PlanillaManija
                        onMouseDown={(ev) => anchosCcPares.startResize(ev, "col")}
                        onDoubleClick={anchosCcPares.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>A definir</th>
                    <th style={thFlexible}>Dice factura · sin declarar · facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuenta.summary.pairs.map((p) => (
                    <tr key={`${p.from}>${p.to}`}>
                      <td style={{ ...tdNombre, fontWeight: 400 }}>
                        <strong style={{ color: "#0f172a" }}>
                          {getCompanyMeta(p.from as CompanyName)?.short || p.from}
                        </strong>
                        <span style={{ color: "#94a3b8" }}> → </span>
                        <strong style={{ color: "#0f172a" }}>
                          {getCompanyMeta(p.to as CompanyName)?.short || p.to}
                        </strong>
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                        {money(p.transferred)}
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: Number(p.pending || 0) > 1 ? "#b45309" : "#166534",
                        }}
                      >
                        {money(p.pending)}
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        dice factura {money(p.declaredWithInvoice)}
                        <span style={{ color: "#b45309" }}> · sin declarar {money(p.withoutBacking)}</span>
                        <span style={{ color: "#94a3b8" }}> · facturado {money(p.invoiced)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <div style={{ ...styles.noticeBox, marginTop: 10 }}>
              <strong>"Dice factura" no es prueba de que exista.</strong> Es lo que tipeo quien hizo la
              transferencia en el concepto del banco. La columna "Facturado" se llena cuando se carguen
              las facturas emitidas ENTRE las dos empresas; hasta entonces "A definir" es todo lo
              girado.
            </div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
                Ver los {cuenta.transfers.length} giros
              </summary>
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <div style={{ ...planillaWrap, ...anchosCcGiros.vars }}>
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
                        Giro
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCcGiros.startResize(ev, "label")}
                          onDoubleClick={anchosCcGiros.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Monto
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCcGiros.startResize(ev, "col")}
                          onDoubleClick={anchosCcGiros.resetCol}
                        />
                      </th>
                      <th style={thColumna}>Fecha</th>
                      <th style={thFlexible}>Respaldo · concepto del banco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...cuenta.transfers]
                      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                      .map((t) => (
                        <tr key={t.id}>
                          <td style={{ ...tdNombre, fontWeight: 400 }}>
                            <span
                              title={t.declaresInvoice ? "Dice factura" : "Sin declarar"}
                              style={{
                                display: "inline-block", width: 8, height: 8, borderRadius: 999, marginRight: 7,
                                background: t.declaresInvoice ? "#16a34a" : "#ca8a04",
                              }}
                            />
                            {getCompanyMeta(t.from as CompanyName)?.short || t.from}
                            <span style={{ color: "#94a3b8" }}> → </span>
                            {getCompanyMeta(t.to as CompanyName)?.short || t.to}
                          </td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(t.amount)}</td>
                          <td style={{ ...tdDato, color: "#475569" }}>{t.date}</td>
                          <td style={{ ...tdFlexible, color: "#64748b" }} title={t.text}>
                            <strong style={{ color: t.declaresInvoice ? "#15803d" : "#b45309" }}>
                              {t.declaresInvoice ? "dice factura" : "sin declarar"}
                            </strong>
                            <span style={{ color: "#94a3b8" }}> · {(t.text || "").slice(0, 70)}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              </div>
            </details>
          </>
        )}
      </Panel>
      ))}
    </div>
    </>
  );
}
