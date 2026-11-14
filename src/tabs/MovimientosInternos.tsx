import React from "react";
import { FichaRegistro, BotonFicha, type CampoFicha } from "../ui/FichaRegistro";
import { styles } from "../ui/styles";
import { Panel, MiniMetric, ButtonLike, moneyToneColor } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda,
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
import { ORIGEN_GIRO } from "../domain/intercompany";

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
  // Click en el saldo entre empresas: todos los movimientos que lo forman (Nicolas, 2026-11-14).
  const [movsEntreEmpresas, setMovsEntreEmpresas] = React.useState<null | {
    deudor: string;
    acreedor: string;
    moneda: "ARS" | "USD";
    saldo: number;
    blanco: number;
    negro: number;
    facturado: number;
    movimientos: Array<{ id: number; date: string; text: string; from: string; to: string; amount: number; administration: "blanco" | "negro"; origen?: string }>;
  }>(null);
  // LAS FILAS SOLO MUESTRAN (Nicolas, 14/11/2026: misma ficha en todo vinculo, y la pantalla mas limpia).
  // Nada se tipea en la fila: se abre la ficha (click en la fila o el boton de la ficha) y ahi se corrige
  // todo. Antes cada celda era un input y se pisaba cualquier dato sin querer.
  const MEDIO_CORTO: Record<string, string> = {
    efectivo: "efectivo",
    transferencia: "transferencia",
    cheque: "cheque",
    debito: "debito automatico",
  };
  const celdaTexto: React.CSSProperties = { display: "block", padding: "1px 8px", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const celdaMonto = (color: string): React.CSSProperties => ({ display: "block", padding: "1px 8px", textAlign: "right", fontWeight: 700, color });
  const fechaCorta = (iso?: string) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "sin fecha");
  const etiqueta = (texto: string, fg = "#475569", bg = "#f1f5f9") => (
    <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>{texto}</span>
  );
  const notaCelda = (notas?: string) => <span style={{ ...celdaTexto, color: "#94a3b8", flex: 1, minWidth: 90 }}>{notas || ""}</span>;
  // Cambiar la empresa (o la moneda) suelta la cuenta: era de la otra empresa y se vuelve a elegir.
  const cambiarSoltandoCuenta = (setter: any, id: number, k: string, v: any) => {
    updateArrayItem(setter, id, k as any, v);
    if (k === "company" || k === "currency") updateArrayItem(setter, id, "cuentaId" as any, undefined as any);
  };
  // Sin cuenta elegida: aviso en la fila que abre la ficha para elegirla.
  const faltaCuenta = (item: any, abrir: () => void) =>
    item.cuentaId ? null : (
      <button
        type="button"
        onClick={abrir}
        title="Toda plata dice de qué cuenta sale o a cuál entra: abrí la ficha y elegila"
        style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 6, padding: "1px 6px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", flex: "none" }}
      >
        ⚠ Falta la cuenta
      </button>
    );
  const nombreCuenta = (id?: string) => (id ? cuentas.find((c) => c.id === id)?.nombre || cuentaImplicita(id).nombre : "");
  const abrirPase = (item: InternalTransfer) =>
    setPase({
      firmante: item.firmante,
      form: {
        id: item.id,
        date: item.date,
        amount: Number(item.amount || 0),
        currency: item.currency === "USD" ? "USD" : "ARS",
        currencyDestino: (item as any).currencyDestino,
        cotizacion: (item as any).cotizacion,
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
        // TODA plata dice de qué cuenta sale o a cuál entra (Nicolas, 2026-11-10): sin cuenta por defecto.
        const campoCuenta = (v: any, label: string): CampoFicha => ({
          key: "cuentaId",
          label,
          tipo: "select",
          obligatorio: true,
          vacio: "— Elegí la cuenta —",
          opciones: cuentas
            .filter((c) => c.company === v?.company && c.activa !== false && (!v?.currency || c.moneda === v.currency))
            .map((c) => ({ value: c.id, label: `${c.tipo === "banco" ? "🏦 " : c.tipo === "persona" ? "👤 " : "💵 "}${c.nombre}` })),
        });
        // Cambiar la empresa suelta la cuenta (era de la otra empresa).
        const conCuenta = (setter: any, id: number) => (k: string, v: any) => cambiarSoltandoCuenta(setter, id, k, v);
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
            campoCuenta(valores, valores?.kind === "egreso" ? "De qué cuenta sale" : "A qué cuenta entra"),
            { key: "description", label: "Descripción", tipo: "texto", ancho: "completo" },
            { key: "notes", label: "Notas", tipo: "area" },
          ];
          set = conCuenta(setCashHoldings, ficha.id);
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
            campoCuenta(valores, valores?.direction === "devuelto" ? "De qué cuenta sale" : "A qué cuenta entra"),
            // Valor en U$S de referencia (2026-11-14): estaba solo en la fila, ahora vive en la ficha.
            { key: "usdValue", label: "Valor en U$S (referencia, no se suma con los pesos)", tipo: "numero" },
            { key: "notes", label: "Notas", tipo: "area" },
          ];
          set = conCuenta(setCapitalEntries, ficha.id);
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
            // Medio del reintegro (2026-11-14): estaba solo en la fila. En efectivo baja la caja; por
            // banco no, porque ya salio por el extracto.
            ...((valores?.kind === "haber"
              ? [
                  {
                    key: "paymentMethod",
                    label: "Cómo se le devolvió",
                    tipo: "select",
                    opciones: [
                      { value: "efectivo", label: "Efectivo (baja la caja)" },
                      { value: "transferencia", label: "Transferencia" },
                      { value: "cheque", label: "Cheque" },
                      { value: "debito", label: "Débito automático" },
                    ],
                  },
                ]
              : []) as CampoFicha[]),
            ...(valores?.kind === "haber" ? [campoCuenta(valores, "De qué cuenta sale")] : []),
            { key: "description", label: "Descripción", tipo: "texto", ancho: "completo" },
            { key: "notes", label: "Notas", tipo: "area" },
          ];
          set = conCuenta(setPersonLedgerEntries, ficha.id);
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
                    onClick={() => abrirPase(item)}
                    style={{ cursor: "pointer" }}
                    title="Click: abrir la ficha del pase · Click derecho: quitarlo"
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
                      <span style={celdaTexto}>
                        {item.description || (item.direction === "banco_a_efectivo" ? "extraccion" : "deposito")}
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <span style={celdaMonto(item.direction === "banco_a_efectivo" ? "#166534" : "#b91c1c")}>
                        {money(item.amount, item.currency === "USD" ? "USD" : "ARS")}
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <span style={celdaTexto}>{fechaCorta(item.date)}</span>
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
                        {notaCelda(item.notes)}
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
                  onClick={() => setFicha({ tipo: "efectivo", id: item.id })}
                  style={{ cursor: "pointer" }}
                  title="Click: abrir la ficha · Click derecho: quitar el movimiento"
                >
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400, padding: 0,
                      boxShadow: `inset 4px 0 0 ${item.kind === "ingreso" ? "#16a34a" : "#dc2626"}`,
                    }}
                  >
                    <span style={celdaTexto}>{item.description || "sin descripcion"}</span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <span style={celdaMonto(item.kind === "ingreso" ? "#166534" : "#b91c1c")}>
                      {money(item.amount, item.currency === "USD" ? "USD" : "ARS")}
                    </span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <span style={celdaTexto}>{fechaCorta(item.date)}</span>
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                      <FirmanteCelda value={item.firmante} firmadoEn={item.firmadoEn} />
                      {item.currency === "USD" && etiqueta("U$S", "#1e3a8a", "#dbeafe")}
                      {etiqueta(item.kind === "ingreso" ? "Entra" : "Sale", item.kind === "ingreso" ? "#15803d" : "#b91c1c", item.kind === "ingreso" ? "#dcfce7" : "#fee2e2")}
                      {etiqueta(item.color === "negro" ? "N" : "B", item.color === "negro" ? "#fff" : "#0f172a", item.color === "negro" ? "#1f2937" : "#e2e8f0")}
                      {etiqueta(getCompanyMeta(item.company)?.short || String(item.company))}
<BotonFicha onClick={() => setFicha({ tipo: "efectivo", id: item.id })} />
{faltaCuenta(item, () => setFicha({ tipo: "efectivo", id: item.id }))}
                      {notaCelda(item.notes)}
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
                  onClick={() => setFicha({ tipo: "capital", id: item.id })}
                  style={{ cursor: "pointer" }}
                  title="Click: abrir la ficha · Click derecho: quitar el movimiento"
                >
                  <td
                    style={{
                      ...tdNombre, fontWeight: 400, padding: 0,
                      boxShadow: `inset 4px 0 0 ${item.direction === "recibido" ? "#16a34a" : "#dc2626"}`,
                    }}
                  >
                    <span style={celdaTexto}>{item.origin || "sin nombre"}</span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <span style={celdaMonto(item.direction === "recibido" ? "#166534" : "#b91c1c")}>
                      {money(item.amount)}
                    </span>
                  </td>
                  <td style={{ ...tdDato, padding: 0 }}>
                    <span style={celdaTexto}>{fechaCorta(item.date)}</span>
                  </td>
                  <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                      <FirmanteCelda value={item.firmante} firmadoEn={item.firmadoEn} />
                      {etiqueta(item.kind === "prestamo" ? "Prestamo" : "Aporte", "#1e3a8a", "#dbeafe")}
                      {etiqueta(item.direction === "recibido" ? "Entro" : "Se devolvio", item.direction === "recibido" ? "#15803d" : "#b91c1c", item.direction === "recibido" ? "#dcfce7" : "#fee2e2")}
                      {etiqueta(item.color === "negro" ? "N" : "B", item.color === "negro" ? "#fff" : "#0f172a", item.color === "negro" ? "#1f2937" : "#e2e8f0")}
                      {etiqueta(getCompanyMeta(item.company)?.short || String(item.company))}
<BotonFicha onClick={() => setFicha({ tipo: "capital", id: item.id })} />
{item.deudaId == null && faltaCuenta(item, () => setFicha({ tipo: "capital", id: item.id }))}
                      {item.deudaId != null ? (
                        <button type="button" style={botonDeuda} title="Abrir la deuda en Desendeudamiento" onClick={(ev) => { ev.stopPropagation(); onAbrirDeuda(item.deudaId as number); }}>
                          En Desendeudamiento →
                        </button>
                      ) : item.direction === "recibido" ? (
                        <button type="button" style={botonDeuda} title="Pasar a Desendeudamiento para definir la devolución" onClick={(ev) => { ev.stopPropagation(); onMigrarADesendeudamiento(item.id); }}>
                          Migrar a Desendeudamiento
                        </button>
                      ) : null}
                      {item.usdValue != null && item.usdValue > 0 && (
                        <span style={{ fontSize: 11.5, color: "#1e3a8a", fontWeight: 700 }}>U$S {item.usdValue}</span>
                      )}
                      {notaCelda(item.notes)}
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
                          onClick={() => entry && setFicha({ tipo: "gente", id: entry.id })}
                          style={entry ? { cursor: "pointer" } : undefined}
                          title={
                            manual
                              ? "Click: abrir la ficha · Click derecho: quitar el movimiento"
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
                            <span style={{ ...celdaTexto, color: "#475569" }}>
                              {entry ? entry.description || (esHaber ? "reintegro" : "que pago") : mov.description}
                            </span>
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            <span style={celdaMonto(esHaber ? "#166534" : "#b91c1c")}>
                              {money(entry ? entry.amount : mov.amount)}
                            </span>
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            <span style={{ ...celdaTexto, color: "#475569" }}>
                              {entry ? fechaCorta(entry.date) : mov.date ? formatDateDisplay(mov.date) : "sin fecha"}
                            </span>
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
                                  {etiqueta(entry.color === "negro" ? "N" : "B", entry.color === "negro" ? "#fff" : "#0f172a", entry.color === "negro" ? "#1f2937" : "#e2e8f0")}
                                  {esHaber && etiqueta(MEDIO_CORTO[entry.paymentMethod || "efectivo"] || "efectivo", "#1e3a8a", "#dbeafe")}
                                  <strong style={{ fontSize: 12 }}>{entry.person || "sin persona"}</strong>
                                  {etiqueta(getCompanyMeta(entry.company as CompanyName)?.short || String(entry.company))}
<BotonFicha onClick={() => setFicha({ tipo: "gente", id: entry.id })} />
{entry.kind === "haber" && faltaCuenta(entry, () => setFicha({ tipo: "gente", id: entry.id }))}
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

      {/* Las devoluciones de caja chica que volvieron a otra cuenta ahora avisan en la propia caja
          chica (Caja chica → la caja lo dice en su fila) y no ocupan un panel aca. 2026-11-14. */}
      {/* Los pagos de una empresa por la otra no tienen panel propio: son una linea del estado de
          cuenta de abajo (de donde sale el saldo) y se corrigen en la ficha de su factura. 2026-11-14. */}
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
            Cómo estamos:{" "}
            <strong
              title="Click: todos los movimientos que forman este saldo"
              onClick={() =>
                setMovsEntreEmpresas({
                  deudor: p.deudor,
                  acreedor: p.acreedor,
                  moneda: p.moneda,
                  saldo: p.saldo,
                  blanco: Number((p as any).blanco || 0),
                  negro: Number((p as any).negro || 0),
                  facturado: Number((p as any).facturado || 0),
                  movimientos: (p.moneda === "USD" ? cuenta.transfersUsd || [] : cuenta.transfers || [])
                    .filter((t: any) => (t.from === p.deudor && t.to === p.acreedor) || (t.from === p.acreedor && t.to === p.deudor))
                    .map((t: any) => ({ id: t.id, date: String(t.date || ""), text: String(t.text || ""), from: String(t.from), to: String(t.to), amount: Number(t.amount || 0), administration: (t.administration === "negro" ? "negro" : "blanco") as "blanco" | "negro", origen: t.origen }))
                    .sort((a: any, b: any) => a.date.localeCompare(b.date)),
                })
              }
              style={{ cursor: "pointer", textDecoration: "underline dotted" }}
            >
              {getCompanyMeta(p.deudor as CompanyName)?.short || p.deudor} le debe {money(p.saldo, p.moneda)} a {getCompanyMeta(p.acreedor as CompanyName)?.short || p.acreedor}
            </strong>{" "}
            <span style={{ fontSize: 12 }}>· click para ver los movimientos</span>
            {/* De donde sale el saldo (2026-11-14): reemplaza al panel aparte de "pagos cruzados". */}
            {(() => {
              const movs = (p.moneda === "USD" ? cuenta.transfersUsd || [] : cuenta.transfers || []).filter(
                (t: any) => (t.from === p.deudor && t.to === p.acreedor) || (t.from === p.acreedor && t.to === p.deudor)
              );
              if (movs.length === 0) return null;
              const porOrigen = new Map<string, { n: number; monto: number }>();
              movs.forEach((t: any) => {
                const k = String(t.origen || "pase");
                const a = porOrigen.get(k) || { n: 0, monto: 0 };
                porOrigen.set(k, { n: a.n + 1, monto: a.monto + Number(t.amount || 0) });
              });
              return (
                <div style={{ fontSize: 12.5, marginTop: 4, color: "#92400e" }}>
                  De dónde sale:{" "}
                  {Array.from(porOrigen.entries())
                    .map(([k, v]) => `${money(v.monto, p.moneda)} de ${v.n} ${(ORIGEN_GIRO as any)[k] || k}`)
                    .join(" · ")}
                </div>
              );
            })()}
            {/* Blanco y negro por separado (Nicolas, 14/11/2026): con esto se decide si el proximo prestamo
                conviene en blanco (para respaldar facturas) o en negro. La factura solo cancela plata blanca. */}
            <div style={{ fontSize: 12.5, marginTop: 4, color: "#92400e" }}>
              {(() => {
                const b = Number((p as any).blanco || 0);
                const n = Number((p as any).negro || 0);
                const fact = Number((p as any).facturado || 0);
                const parte = (etiqueta: string, v: number) =>
                  Math.abs(v) < 0.01
                    ? null
                    : v > 0
                    ? `debe ${money(v, p.moneda)} en ${etiqueta}`
                    : `le sobran ${money(-v, p.moneda)} en ${etiqueta}`;
                const partes = [parte("blanco", b), parte("negro", n)].filter(Boolean);
                return (
                  <>
                    {partes.length > 0 ? <>De eso: <strong>{partes.join(" · ")}</strong>. </> : null}
                    {fact > 0.01 ? `Ya hay ${money(fact, p.moneda)} cruzados con facturas entre las dos. ` : "Todavía no hay facturas entre las dos cruzando estos giros. "}
                    {b > 0.01 ? "Lo blanco se cancela devolviendo la plata o facturando; lo negro, solo con plata." : ""}
                  </>
                );
              })()}
            </div>
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

      {/* Todos los movimientos que forman el saldo entre las dos empresas (2026-11-14). El que PUSO la plata
          queda acreedor: lo que giro suma deuda de la otra, y lo que recibio se la baja. */}
      {movsEntreEmpresas && (() => {
        const m = movsEntreEmpresas;
        const corto = (c: string) => getCompanyMeta(c as CompanyName)?.short || c;
        const signo = (t: { from: string; to: string }) => (t.from === m.acreedor ? 1 : -1);
        let acumulado = 0;
        const filas = m.movimientos.map((t) => {
          acumulado += signo(t) * t.amount;
          return { ...t, suma: signo(t) * t.amount, acumulado };
        });
        return (
          <div
            onClick={() => setMovsEntreEmpresas(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4650, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(760px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  Movimientos entre las empresas · {corto(m.deudor)} le debe {money(m.saldo, m.moneda)} a {corto(m.acreedor)}
                </div>
                <ButtonLike secondary onClick={() => setMovsEntreEmpresas(null)}>Cerrar</ButtonLike>
              </div>
              {filas.length === 0 ? (
                <div style={styles.muted}>No hay movimientos cargados entre las dos empresas en este ejercicio.</div>
              ) : (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Fecha</th>
                        <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Qué fue</th>
                        <th style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Quién puso</th>
                        <th style={{ textAlign: "center", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>B/N</th>
                        <th style={{ textAlign: "right", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Suma a la deuda</th>
                        <th style={{ textAlign: "right", padding: "4px 6px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((t) => (
                        <tr key={`${t.id}-${t.date}-${t.amount}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>{(t.date || "").split("-").reverse().join("/")}</td>
                          <td style={{ padding: "4px 6px", color: "#475569" }} title={t.text}>
                            {(t.text || "").slice(0, 60) || "—"}
                            {t.origen && (
                              <span style={{ color: "#94a3b8", fontSize: 11 }}> · {(ORIGEN_GIRO as any)[t.origen] || t.origen}</span>
                            )}
                          </td>
                          <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>{corto(t.from)} → {corto(t.to)}</td>
                          <td style={{ padding: "4px 6px", textAlign: "center" }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "1px 6px", color: t.administration === "negro" ? "#fff" : "#0f172a", background: t.administration === "negro" ? "#1f2937" : "#e2e8f0" }}>
                              {t.administration === "negro" ? "N" : "B"}
                            </span>
                          </td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: t.suma >= 0 ? "#b45309" : "#16a34a" }}>
                            {t.suma >= 0 ? "+" : "−"}{money(Math.abs(t.suma), m.moneda)}
                          </td>
                          <td style={{ padding: "4px 6px", textAlign: "right", color: "#475569" }}>{money(t.acumulado, m.moneda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Son {filas.length} movimiento(s): pases entre empresas, giros que se vieron en el banco, pagos cruzados
                    (una empresa pagó algo de la otra) y cobros que entraron en la cuenta de la otra. Cada uno se corrige en su
                    propia ficha. Del saldo, <strong>{money(m.blanco, m.moneda)}</strong> es plata blanca y{" "}
                    <strong>{money(m.negro, m.moneda)}</strong> negra{m.facturado > 0.01 ? `, y ya hay ${money(m.facturado, m.moneda)} cruzados con facturas entre las dos` : ""}.
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
    </>
  );
}
