import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, MiniMetric, ButtonLike, AmountInput, QuickMenu, QuickMenuTitle, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { money } from "../lib/format";
import { newId } from "../domain/id";
import { elegirImpacto, fijarValor, MESES_DEL_PROMEDIO, volverAlSugerido, type CostoEmpresarial, type ImpactoCosto } from "../domain/costosEmpresariales";
import { WORK_TYPE_OPTIONS, PERSONAL_PROVISION_KINDS } from "../domain/types";
import type {
  CompanyName,
  WorkTypeName,
  MarkerFixedGroup,
  SupplyMarkerSubtype,
  PersonalProvisionKind,
} from "../domain/types";

import NumInput from "../ui/NumInput";
// Mismos colores que la grilla de Costos: fijo indigo, variable ámbar. El grupo se reconoce por
// el color antes que por el texto, y tiene que ser el mismo en las dos solapas.
const SECCIONES_COSTOS = [
  { kind: "fijo" as const, titulo: "COSTOS FIJOS", fondo: "#e0e7ff", tinta: "#3730a3" },
  { kind: "variable" as const, titulo: "COSTOS VARIABLES", fondo: "#fef3c7", tinta: "#92400e" },
];

type MarcadoresTabProps = {
  // Tipos de trabajo editables (Acceso → Listados del sistema).
  tiposTrabajo?: string[];
  markupPct: number;
  deviationPct: number;
  laborDeviationPct: number;
  vatPct: number;
  commissionPct: number;
  stockIncreasePct: number;
  manualAllocationPct: number;
  allocationMode: any;
  activeFixedMarkersForBudget: any[];
  activeSupplyMarkersForBudget: any[];
  activeLaborMarkersForBudget: any[];
  activePersonalProvisionMonthlyTotal: number;
  budget: any;
  fixedMarkersByGroup: any[];
  fixedMarkers: any[];
  supplyMarkers: any[];
  laborMarkers: any[];
  personalProvisionMarkers: any[];
  fixedMarkerGroupOptions: any[];
  // Lo que la empresa gasta de verdad, para el bloque "Costos empresariales".
  // De cada empresa: los ultimos 3 meses cerrados, el promedio sugerido y el valor que se usa.
  costosEmpresariales: CostoEmpresarial[];
  mesesDelPromedio: string[];
  empresaDelPresupuesto: CompanyName;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  promptAndCreateCostAnalysisGroup: (company?: any) => any;
  updateArrayItem: <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => void;
  setMarkupPct: React.Dispatch<React.SetStateAction<number>>;
  setDeviationPct: React.Dispatch<React.SetStateAction<number>>;
  setLaborDeviationPct: React.Dispatch<React.SetStateAction<number>>;
  setVatPct: React.Dispatch<React.SetStateAction<number>>;
  setCommissionPct: React.Dispatch<React.SetStateAction<number>>;
  setStockIncreasePct: React.Dispatch<React.SetStateAction<number>>;
  setManualAllocationPct: React.Dispatch<React.SetStateAction<number>>;
  setAllocationMode: React.Dispatch<React.SetStateAction<any>>;
  setFixedMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  setSupplyMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  setLaborMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  setPersonalProvisionMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  applyMarkersToBudget: () => void;
  addFixedMarker: () => void;
  removeFixedMarker: (id: number) => void;
  addSupplyMarker: () => void;
  removeSupplyMarker: (id: number) => void;
  syncLaborMarkersFromPersonal: () => void;
  addLaborMarker: () => void;
  removeLaborMarker: (id: number) => void;
  restorePersonalProvisionMarkersFromStock: () => void;
  addPersonalProvisionMarker: () => void;
  removePersonalProvisionMarker: (id: number) => void;
};

export function MarcadoresTab({
  tiposTrabajo = [...WORK_TYPE_OPTIONS],
  markupPct,
  deviationPct,
  laborDeviationPct,
  vatPct,
  commissionPct,
  stockIncreasePct,
  manualAllocationPct,
  allocationMode,
  activeFixedMarkersForBudget,
  activeSupplyMarkersForBudget,
  activeLaborMarkersForBudget,
  activePersonalProvisionMonthlyTotal,
  budget,
  fixedMarkersByGroup,
  fixedMarkers,
  supplyMarkers,
  laborMarkers,
  personalProvisionMarkers,
  fixedMarkerGroupOptions,
  costosEmpresariales,
  mesesDelPromedio,
  empresaDelPresupuesto,
  COMPANY_OPTIONS,
  getCompanyMeta,
  promptAndCreateCostAnalysisGroup,
  updateArrayItem,
  setMarkupPct,
  setDeviationPct,
  setLaborDeviationPct,
  setVatPct,
  setCommissionPct,
  setStockIncreasePct,
  setManualAllocationPct,
  setAllocationMode,
  setFixedMarkers,
  setSupplyMarkers,
  setLaborMarkers,
  setPersonalProvisionMarkers,
  applyMarkersToBudget,
  addFixedMarker,
  removeFixedMarker,
  addSupplyMarker,
  removeSupplyMarker,
  syncLaborMarkersFromPersonal,
  addLaborMarker,
  removeLaborMarker,
  restorePersonalProvisionMarkersFromStock,
  addPersonalProvisionMarker,
  removePersonalProvisionMarker,
}: MarcadoresTabProps) {
  const anchosFijos = usePlanillaWidths("marcadores.fijos", { label: 300, col: 130, colCompact: 100 });
  const anchosInsumos = usePlanillaWidths("marcadores.insumos", { label: 300, col: 110, colCompact: 84 });
  const anchosMO = usePlanillaWidths("marcadores.manodeobra", { label: 260, col: 110, colCompact: 84 });
  const anchosEppM = usePlanillaWidths("marcadores.epp", { label: 300, col: 120, colCompact: 92 });
  const anchosEmpresariales = usePlanillaWidths("marcadores.empresariales", { label: 300, col: 130, colCompact: 100 });

  // --- Costos empresariales: promedio de los ultimos 3 meses de Costos, POR EMPRESA ----------
  // El promedio es la sugerencia; "A usar" se puede escribir y manda. Cada grupo elige si impacta en
  // los presupuestos de su empresa, de las dos o de ninguna. Filtro propio y nunca "todas": los
  // costos de una empresa no se mezclan con los de la otra.
  const [empresaCostos, setEmpresaCostos] = React.useState<CompanyName>(empresaDelPresupuesto);
  const [menuCosto, setMenuCosto] = React.useState<null | { x: number; y: number; c: CostoEmpresarial }>(null);
  const empresaCorta = (c: CompanyName) => getCompanyMeta(c).short;

  const costosDeLaEmpresa = costosEmpresariales.filter((c) => c.company === empresaCostos);
  // Lo de la otra empresa marcado "las dos": tambien entra a los presupuestos de esta.
  const deLaOtra = costosEmpresariales.filter((c) => c.company !== empresaCostos && c.impacta === "ambas" && c.valorAUsar > 0);
  const sumar = (lista: CostoEmpresarial[], campo: "promedio" | "valorAUsar") => lista.reduce((a, c) => a + c[campo], 0);
  const entraAPresupuestos = sumar(costosDeLaEmpresa.filter((c) => c.impacta !== "ninguna"), "valorAUsar") + sumar(deLaOtra, "valorAUsar");
  const mesCorto = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
  const textoImpacto = (c: CostoEmpresarial) =>
    c.impacta === "ambas" ? "Las dos" : c.impacta === "empresa" ? empresaCorta(c.company) : "No se cobra";

  const cambiarImpacto = (c: CostoEmpresarial, impacta: ImpactoCosto) =>
    setFixedMarkers((prev: any[]) => elegirImpacto(prev, c, impacta, newId));
  // Vacio (o cero) = vuelve a usar el promedio.
  const escribirValor = (c: CostoEmpresarial, valor: number) =>
    setFixedMarkers((prev: any[]) =>
      valor > 0 ? fijarValor(prev, c, valor, newId, "Costos empresariales") : volverAlSugerido(prev, c)
    );

  return (
        <div style={styles.column}>
          <Panel span="wide" title="Parametros economicos (fuente de verdad)">
            <div style={styles.noticeBox}>
              Estos valores se aplican a los presupuestos y se toman de aca al armar uno nuevo. Editalos
              una vez y quedan fijos para todos los presupuestos siguientes.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Field label="Markup / ganancia (%)">
                <NumInput style={styles.input} value={markupPct}
                  onChange={(e) => setMarkupPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio de costos (%)">
                <NumInput style={styles.input} value={deviationPct}
                  onChange={(e) => setDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio mano de obra (%)">
                <NumInput style={styles.input} value={laborDeviationPct}
                  onChange={(e) => setLaborDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="IVA (%)">
                <NumInput style={styles.input} value={vatPct}
                  onChange={(e) => setVatPct(Number(e.target.value))} />
              </Field>
              <Field label="Comision (%)">
                <NumInput style={styles.input} value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))} />
              </Field>
              <Field label="Aumento de stock (%)">
                <NumInput style={styles.input} value={stockIncreasePct}
                  onChange={(e) => setStockIncreasePct(Number(e.target.value))} />
              </Field>
              <Field label="Asignacion de costos fijos">
                <select style={styles.input} value={allocationMode}
                  onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}>
                  <option value="auto">Automatica</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              {allocationMode === "manual" && (
                <Field label="Asignacion manual (%)">
                  <NumInput style={styles.input} value={manualAllocationPct}
                    onChange={(e) => setManualAllocationPct(Number(e.target.value))} />
                </Field>
              )}
            </div>
          </Panel>
          <Panel
            title="Marcadores base por empresa y tipo de trabajo"
            span="wide"
            actions={<ButtonLike onClick={applyMarkersToBudget}>Aplicar al presupuesto actual</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric
                label="Costos fijos activos"
                value={money(
                  activeFixedMarkersForBudget.reduce((acc, item) => acc + Number(item.amount || 0), 0)
                )}
              />
              <MiniMetric
                label="Insumos y fletes activos"
                value={money(
                  activeSupplyMarkersForBudget.reduce(
                    (acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0),
                    0
                  )
                )}
              />
              <MiniMetric
                label="Mano de obra base"
                value={money(
                  activeLaborMarkersForBudget.reduce(
                    (acc, item) => acc + Number(item.hoursBase || 0) * Number(item.hourlyRate || 0),
                    0
                  )
                )}
              />
              <MiniMetric label="Provision personal mensual" value={money(activePersonalProvisionMonthlyTotal)} />
              <MiniMetric label="Tipo de trabajo" value={budget.workType} />
              <MiniMetric
                label="Empresas activas"
                value={Array.from(new Set([...activeFixedMarkersForBudget, ...activeSupplyMarkersForBudget, ...activeLaborMarkersForBudget].map((item) => getCompanyMeta(item.company).short))).join(", ") || "-"}
              />
            </div>
          </Panel>

          <Panel title="Costos empresariales" span="full" actions={
            <div style={styles.inlineActions}>
                <select
                  style={{ ...styles.input, maxWidth: 200 }}
                  value={empresaCostos}
                  onChange={(e) => setEmpresaCostos(e.target.value as CompanyName)}
                  title="De qué empresa son los costos"
                >
                  {COMPANY_OPTIONS.map((c: any) => (
                    <option key={c.value} value={c.value}>{c.short}</option>
                  ))}
                </select>
                <ButtonLike onClick={addFixedMarker}>Agregar marcador</ButtonLike>
                <ButtonLike onClick={anchosFijos.toggleCompacto} secondary>
                  {anchosFijos.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
            </div>
          }>
            <div style={styles.metricGrid}>
              <MiniMetric label={`Fijos · promedio ${MESES_DEL_PROMEDIO} meses`} value={money(sumar(costosDeLaEmpresa.filter((c) => c.kind === "fijo"), "promedio"))} />
              <MiniMetric label="Variables · promedio" value={money(sumar(costosDeLaEmpresa.filter((c) => c.kind === "variable"), "promedio"))} />
              <MiniMetric label={`Se cobra en presupuestos de ${empresaCorta(empresaCostos)} / mes`} value={money(entraAPresupuestos)} />
              {deLaOtra.length > 0 && <MiniMetric label="De eso, de la otra empresa" value={money(sumar(deLaOtra, "valorAUsar"))} />}
            </div>

            <div style={{ ...styles.sectionNote, marginTop: 10, marginBottom: 8 }}>
              Lo gastado en <strong>Costos</strong> por {empresaCorta(empresaCostos)} en los últimos {MESES_DEL_PROMEDIO} meses cerrados
              ({mesesDelPromedio.map(mesCorto).join(", ")}). El <strong>promedio</strong> es la sugerencia; en <strong>A usar</strong> podés
              escribir otro monto y ese es el que va al presupuesto (vacío = usa el promedio). <strong>Click derecho</strong> sobre un
              grupo para elegir en qué presupuestos se cobra: solo en los de {empresaCorta(empresaCostos)}, en los de las dos empresas (la hoja de
              presupuesto es la misma) o en ninguno. Presupuestar no es imputar: el gasto sigue siendo solo de la empresa que lo paga.
            </div>

            <div style={{ ...planillaWrap, ...anchosEmpresariales.vars, marginBottom: 14 }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  {mesesDelPromedio.map((m) => <col key={m} style={colDato} />)}
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Grupo de costos
                      <PlanillaManija
                        onMouseDown={(ev) => anchosEmpresariales.startResize(ev, "label")}
                        onDoubleClick={anchosEmpresariales.resetLabel}
                      />
                    </th>
                    {mesesDelPromedio.map((m, i) => (
                      <th key={m} style={{ ...thColumna, textAlign: "right" }}>
                        {mesCorto(m)}
                        {i === 0 && (
                          <PlanillaManija
                            onMouseDown={(ev) => anchosEmpresariales.startResize(ev, "col")}
                            onDoubleClick={anchosEmpresariales.resetCol}
                          />
                        )}
                      </th>
                    ))}
                    <th style={{ ...thColumna, textAlign: "right" }}>Promedio</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>A usar</th>
                    <th style={thColumna}>Se cobra en</th>
                    <th style={thFlexible} />
                  </tr>
                </thead>
                <tbody>
                  {SECCIONES_COSTOS.map((sec) => {
                    const filas = costosDeLaEmpresa.filter((r) => r.kind === sec.kind);
                    const columnas = mesesDelPromedio.length + 5;
                    return (
                      <React.Fragment key={sec.kind}>
                        <tr>
                          <td colSpan={columnas} style={styles.sectionCell}>
                            <div style={{ ...styles.sectionHeader, background: sec.fondo, color: sec.tinta, borderColor: sec.tinta }}>
                              {sec.titulo}
                            </div>
                          </td>
                        </tr>
                        {filas.length === 0 && (
                          <tr>
                            <td colSpan={columnas} style={{ ...tdNombre, color: "#94a3b8", fontWeight: 400 }}>
                              No hay grupos de este tipo.
                            </td>
                          </tr>
                        )}
                        {filas.map((c) => {
                          const apagado = c.impacta === "ninguna";
                          const manual = c.valorManual != null;
                          const dif = manual ? (c.valorManual as number) - c.promedio : 0;
                          const meta = getCompanyMeta(c.company);
                          return (
                            <tr
                              key={`${sec.kind}-${c.group}`}
                              onContextMenu={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setMenuCosto({ x: ev.clientX, y: ev.clientY, c });
                              }}
                              title="Click derecho: en qué presupuestos impacta"
                            >
                              <td style={{ ...tdNombre, fontWeight: 400, opacity: apagado ? 0.55 : 1 }}>
                                {c.group}
                                {c.auto && <span style={{ ...styles.chatStatus, marginLeft: 6 }}>auto</span>}
                                {c.manoDeObra && (
                                  <div
                                    style={{ fontSize: 11, color: "#64748b" }}
                                    title={`Mano de obra de: ${c.manoDeObra.rutinas.join(", ")} (Fabricación → Mantenimiento, orden y limpieza). Las facturas del grupo van en los meses.`}
                                  >
                                    + mano de obra de rutinas {money(c.manoDeObra.montoMes)}/mes ({c.manoDeObra.horasMes.toLocaleString("es-AR", { maximumFractionDigits: 1 })} hs)
                                  </div>
                                )}
                              </td>
                              {c.porMes.map((v, i) => (
                                <td key={i} style={{ ...tdDato, textAlign: "right", color: v > 0 ? "#475569" : "#cbd5e1" }}>
                                  {v > 0 ? money(v) : "·"}
                                </td>
                              ))}
                              <td style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: c.promedio > 0 ? "#0f172a" : "#cbd5e1" }}>
                                {c.promedio > 0 ? money(c.promedio) : "·"}
                              </td>
                              <td style={{ ...tdDato, padding: 0, background: manual ? "#fffbeb" : undefined }}>
                                <AmountInput
                                  style={{ ...inputCeldaDerecha, fontWeight: manual ? 700 : 400 }}
                                  value={c.valorManual ?? 0}
                                  placeholder={c.promedio > 0 ? money(c.promedio) : "0"}
                                  onChange={(n) => escribirValor(c, n)}
                                />
                              </td>
                              <td style={tdDato}>
                                <span
                                  style={{
                                    ...styles.chatStatus,
                                    background: apagado ? "#f1f5f9" : c.impacta === "ambas" ? "#ede9fe" : "#ffffff",
                                    color: apagado ? "#94a3b8" : c.impacta === "ambas" ? "#5b21b6" : meta.primary,
                                    boxShadow: apagado || c.impacta === "ambas" ? undefined : `inset 0 0 0 1px ${meta.primary}`,
                                  }}
                                >
                                  {textoImpacto(c)}
                                </span>
                              </td>
                              <td style={{ ...tdFlexible, color: "#94a3b8", fontSize: 11 }}>
                                {manual
                                  ? Math.abs(dif) < 1
                                    ? "a mano, igual al promedio"
                                    : `a mano: ${dif > 0 ? "+" : "−"}${money(Math.abs(dif))} contra el promedio`
                                  : c.promedio > 0
                                  ? "usa el promedio"
                                  : "sin gastos en los últimos meses"}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {deLaOtra.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={mesesDelPromedio.length + 5} style={styles.sectionCell}>
                          <div style={{ ...styles.sectionHeader, background: "#ede9fe", color: "#5b21b6", borderColor: "#5b21b6" }}>
                            DE LA OTRA EMPRESA · SE COBRAN TAMBIÉN EN ESTOS PRESUPUESTOS
                          </div>
                        </td>
                      </tr>
                      {deLaOtra.map((c) => (
                        <tr key={`otra-${c.company}-${c.group}`}>
                          <td style={{ ...tdNombre, fontWeight: 400 }}>{c.group} · {empresaCorta(c.company)}</td>
                          {c.porMes.map((v, i) => (
                            <td key={i} style={{ ...tdDato, textAlign: "right", color: "#94a3b8" }}>{v > 0 ? money(v) : "·"}</td>
                          ))}
                          <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>{c.promedio > 0 ? money(c.promedio) : "·"}</td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(c.valorAUsar)}</td>
                          <td style={tdDato} />
                          <td style={{ ...tdFlexible, color: "#94a3b8", fontSize: 11 }}>lo paga {empresaCorta(c.company)} (es su gasto) · se edita en {empresaCorta(c.company)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {menuCosto && (
              <QuickMenu x={menuCosto.x} y={menuCosto.y} onClose={() => setMenuCosto(null)}>
                <QuickMenuTitle>{menuCosto.c.group} · {empresaCorta(menuCosto.c.company)}</QuickMenuTitle>
                {([
                  ["empresa", `Se cobra solo en presupuestos de ${empresaCorta(menuCosto.c.company)}`],
                  ["ambas", `Se cobra en presupuestos de las dos empresas (lo paga ${empresaCorta(menuCosto.c.company)})`],
                  ["ninguna", "No se cobra en presupuestos"],
                ] as Array<[ImpactoCosto, string]>).map(([v, texto]) => (
                  <button
                    key={v}
                    type="button"
                    style={{ ...quickMenuItem, fontWeight: menuCosto.c.impacta === v ? 700 : 400 }}
                    onClick={() => {
                      cambiarImpacto(menuCosto.c, v);
                      setMenuCosto(null);
                    }}
                  >
                    {menuCosto.c.impacta === v ? "✓ " : ""}{texto}
                  </button>
                ))}
                {menuCosto.c.valorManual != null && (
                  <button
                    type="button"
                    style={quickMenuItem}
                    onClick={() => {
                      escribirValor(menuCosto.c, 0);
                      setMenuCosto(null);
                    }}
                  >
                    Volver al promedio ({money(menuCosto.c.promedio)})
                  </button>
                )}
              </QuickMenu>
            )}

            <div style={{ ...styles.sectionNote, marginBottom: 8 }}>
              <strong>Marcadores</strong> — lo que se usa hoy para poner precio a los presupuestos.
            </div>
            <div style={styles.metricGrid}>
              {fixedMarkersByGroup.map((row) => (
                <MiniMetric key={row.group} label={row.group} value={money(row.total)} />
              ))}
            </div>
            <div style={{ ...planillaWrap, ...anchosFijos.vars }}>
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
                    Concepto
                    <PlanillaManija
                      onMouseDown={(ev) => anchosFijos.startResize(ev, "label")}
                      onDoubleClick={anchosFijos.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Monto mensual
                    <PlanillaManija
                      onMouseDown={(ev) => anchosFijos.startResize(ev, "col")}
                      onDoubleClick={anchosFijos.resetCol}
                    />
                  </th>
                  <th style={thFlexible}>Grupo · tipo de trabajo · empresa · observación</th>
                  <th style={thColumna} />
                </tr>
              </thead>
              <tbody>
                {fixedMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (window.confirm(`¿Quitar el marcador "${item.description}"?`)) removeFixedMarker(item.id);
                    }}
                    title="Click derecho: quitar. El punto verde activa o desactiva."
                  >
                    <td
                      style={{
                        ...tdNombre, fontWeight: 400, padding: 0,
                        // Apagado, o reemplazado por el promedio de 3 meses (Costos empresariales).
                        opacity: item.active && !item.sigueSugerido ? 1 : 0.45,
                        boxShadow: `inset 4px 0 0 ${markerCompany.primary}`,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                        <span
                          title={item.active ? "Activo" : "Inactivo"}
                          onClick={() => updateArrayItem(setFixedMarkers, item.id, "active", !item.active)}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                            cursor: "pointer", background: item.active ? "#16a34a" : "#cbd5f5",
                          }}
                        />
                        <input
                          style={inputCelda}
                          {...focoCelda}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "description", e.target.value)}
                        />
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <AmountInput
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        value={item.amount}
                        onChange={(n) => updateArrayItem(setFixedMarkers, item.id, "amount", n)}
                      />
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.group}
                          onChange={(e) => {
                            if (e.target.value === "__add_group__") {
                              const createdGroup = promptAndCreateCostAnalysisGroup("General");
                              if (createdGroup) {
                                updateArrayItem(setFixedMarkers, item.id, "group", createdGroup.name as MarkerFixedGroup);
                              }
                              return;
                            }
                            updateArrayItem(setFixedMarkers, item.id, "group", e.target.value as MarkerFixedGroup);
                          }}
                        >
                          {fixedMarkerGroupOptions.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                          <option value="__add_group__">+ Agregar grupo...</option>
                        </select>
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.workType}
                          onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "workType", e.target.value as WorkTypeName)}
                        >
                          {tiposTrabajo.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <select
                          style={{ ...inputCelda, width: "auto", color: markerCompany.primary, fontWeight: 700 }}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "company", e.target.value as CompanyName)}
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
                          placeholder="observación"
                          onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "notes", e.target.value)}
                        />
                      </span>
                    </td>
                    <td style={{ ...tdDato, ...tdAcciones }}>
                      <button
                        type="button"
                        title="Borrar"
                        style={btnBorrar}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Quitar el marcador "${item.description}"?`)) removeFixedMarker(item.id);
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
          </Panel>

          <Panel title="Insumos y fletes base" span="full" actions={
            <div style={styles.inlineActions}>
                <ButtonLike onClick={addSupplyMarker}>Agregar marcador</ButtonLike>
                <ButtonLike onClick={anchosInsumos.toggleCompacto} secondary>
                  {anchosInsumos.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
            </div>
          }>
            <div style={{ ...planillaWrap, ...anchosInsumos.vars }}>
            <table className="planilla" style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
                <col style={colAcciones} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Descripción
                    <PlanillaManija
                      onMouseDown={(ev) => anchosInsumos.startResize(ev, "label")}
                      onDoubleClick={anchosInsumos.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Cant.
                    <PlanillaManija
                      onMouseDown={(ev) => anchosInsumos.startResize(ev, "col")}
                      onDoubleClick={anchosInsumos.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>$ Unit.</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Subtotal</th>
                  <th style={thFlexible}>Subtipo · tipo de trabajo · empresa</th>
                  <th style={thColumna} />
                </tr>
              </thead>
              <tbody>
                {supplyMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (window.confirm(`¿Quitar el marcador "${item.description}"?`)) removeSupplyMarker(item.id);
                    }}
                    title="Click derecho: quitar. El punto verde activa o desactiva."
                  >
                    <td
                      style={{
                        ...tdNombre, fontWeight: 400, padding: 0,
                        opacity: item.active ? 1 : 0.45,
                        boxShadow: `inset 4px 0 0 ${markerCompany.primary}`,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                        <span
                          title={item.active ? "Activo" : "Inactivo"}
                          onClick={() => updateArrayItem(setSupplyMarkers, item.id, "active", !item.active)}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                            cursor: "pointer", background: item.active ? "#16a34a" : "#cbd5f5",
                          }}
                        />
                        <input
                          style={inputCelda}
                          {...focoCelda}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "description", e.target.value)}
                        />
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
                        <NumInput
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          value={item.qty}
                          onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "qty", Number(e.target.value))}
                        />
                        <input
                          style={{ ...inputCelda, width: 44, color: "#94a3b8" }}
                          {...focoCelda}
                          value={item.unit}
                          onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "unit", e.target.value)}
                        />
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <AmountInput
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        value={item.unitPrice}
                        onChange={(n) => updateArrayItem(setSupplyMarkers, item.id, "unitPrice", n)}
                      />
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                      {money(item.qty * item.unitPrice)}
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.subtype}
                          onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "subtype", e.target.value as SupplyMarkerSubtype)}
                        >
                          {["Insumos basicos", "Flete", "Entrega", "Embalaje", "Viaticos"].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.workType}
                          onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "workType", e.target.value as WorkTypeName)}
                        >
                          {tiposTrabajo.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <select
                          style={{ ...inputCelda, width: "auto", color: markerCompany.primary, fontWeight: 700 }}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "company", e.target.value as CompanyName)}
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.short}
                            </option>
                          ))}
                        </select>
                      </span>
                    </td>
                    <td style={{ ...tdDato, ...tdAcciones }}>
                      <button
                        type="button"
                        title="Borrar"
                        style={btnBorrar}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Quitar el marcador "${item.description}"?`)) removeSupplyMarker(item.id);
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
            <div style={styles.rightStrong}>
              Total marcadores de insumos y fletes:{" "}
              {money(
                supplyMarkers
                  .filter((item) => item.active)
                  .reduce((acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0), 0)
              )}
            </div>
          </Panel>

          <Panel span="full"
            title="Mano de obra base"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={syncLaborMarkersFromPersonal} secondary>
                  Tomar costo hora desde personal
                </ButtonLike>
                <ButtonLike onClick={addLaborMarker}>Agregar marcador</ButtonLike>
                <ButtonLike onClick={anchosMO.toggleCompacto} secondary>
                  {anchosMO.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            <div style={{ ...planillaWrap, ...anchosMO.vars }}>
            <table className="planilla" style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
                <col style={colAcciones} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Categoría
                    <PlanillaManija
                      onMouseDown={(ev) => anchosMO.startResize(ev, "label")}
                      onDoubleClick={anchosMO.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Empleados
                    <PlanillaManija
                      onMouseDown={(ev) => anchosMO.startResize(ev, "col")}
                      onDoubleClick={anchosMO.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Hs/mes c/u</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>$ Hora</th>
                  <th style={thFlexible}>Hs base · subtotal · tipo de trabajo · empresa</th>
                  <th style={thColumna} />
                </tr>
              </thead>
              <tbody>
                {laborMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr
                    key={item.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (window.confirm(`¿Quitar el marcador "${item.category}"?`)) removeLaborMarker(item.id);
                    }}
                    title="Click derecho: quitar. El punto verde activa o desactiva."
                  >
                    <td
                      style={{
                        ...tdNombre, fontWeight: 400, padding: 0,
                        opacity: item.active ? 1 : 0.45,
                        boxShadow: `inset 4px 0 0 ${markerCompany.primary}`,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                        <span
                          title={item.active ? "Activo" : "Inactivo"}
                          onClick={() => updateArrayItem(setLaborMarkers, item.id, "active", !item.active)}
                          style={{
                            display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                            cursor: "pointer", background: item.active ? "#16a34a" : "#cbd5f5",
                          }}
                        />
                        <input
                          style={inputCelda}
                          {...focoCelda}
                          value={item.category}
                          onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "category", e.target.value)}
                        />
                      </span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <NumInput
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        value={item.employees}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "employees", Number(e.target.value))}
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <NumInput
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        value={item.monthlyHoursPerEmployee}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "monthlyHoursPerEmployee", Number(e.target.value))
                        }
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <AmountInput
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        value={item.hourlyRate}
                        onChange={(n) => updateArrayItem(setLaborMarkers, item.id, "hourlyRate", n)}
                      />
                    </td>
                    <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                        <span style={{ color: "#94a3b8" }}>hs base</span>
                        <NumInput
                          style={{ ...inputCelda, width: 70, textAlign: "right" }}
                          {...focoCelda}
                          value={item.hoursBase}
                          onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "hoursBase", Number(e.target.value))}
                        />
                        <strong style={{ color: "#0f172a" }}>{money(item.hoursBase * item.hourlyRate)}</strong>
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.workType}
                          onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "workType", e.target.value as WorkTypeName)}
                        >
                          {tiposTrabajo.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <select
                          style={{ ...inputCelda, width: "auto", color: markerCompany.primary, fontWeight: 700 }}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "company", e.target.value as CompanyName)}
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.short}
                            </option>
                          ))}
                        </select>
                      </span>
                    </td>
                    <td style={{ ...tdDato, ...tdAcciones }}>
                      <button
                        type="button"
                        title="Borrar"
                        style={btnBorrar}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Quitar el marcador "${item.category}"?`)) removeLaborMarker(item.id);
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
            <div style={styles.rightStrong}>
              Total marcadores de mano de obra:{" "}
              {money(
                laborMarkers
                  .filter((item) => item.active)
                  .reduce((acc, item) => acc + Number(item.hoursBase || 0) * Number(item.hourlyRate || 0), 0)
              )}
            </div>
          </Panel>

          <Panel span="full"
            title="Informacion de personal: EPP e insumos"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={restorePersonalProvisionMarkersFromStock} secondary>
                  Restaurar basicos desde stock
                </ButtonLike>
                <ButtonLike onClick={addPersonalProvisionMarker}>Agregar item</ButtonLike>
                <ButtonLike onClick={anchosEppM.toggleCompacto} secondary>
                  {anchosEppM.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            <div style={{ ...planillaWrap, ...anchosEppM.vars }}>
            <table className="planilla" style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
                <col style={colAcciones} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Descripción
                    <PlanillaManija
                      onMouseDown={(ev) => anchosEppM.startResize(ev, "label")}
                      onDoubleClick={anchosEppM.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Costo por entrega
                    <PlanillaManija
                      onMouseDown={(ev) => anchosEppM.startResize(ev, "col")}
                      onDoubleClick={anchosEppM.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Cada (meses)</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Costo mensual</th>
                  <th style={thFlexible}>Tipo · empresa · observación</th>
                  <th style={thColumna} />
                </tr>
              </thead>
              <tbody>
                {personalProvisionMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                    <tr
                      key={item.id}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (window.confirm(`¿Quitar el marcador "${item.description}"?`)) removePersonalProvisionMarker(item.id);
                      }}
                      title="Click derecho: quitar. El punto verde activa o desactiva."
                    >
                      <td
                        style={{
                          ...tdNombre, fontWeight: 400, padding: 0,
                          opacity: item.active ? 1 : 0.45,
                          boxShadow: `inset 4px 0 0 ${markerCompany.primary}`,
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                          <span
                            title={item.active ? "Activo" : "Inactivo"}
                            onClick={() => updateArrayItem(setPersonalProvisionMarkers, item.id, "active", !item.active)}
                            style={{
                              display: "inline-block", width: 8, height: 8, borderRadius: 999, flex: "0 0 auto",
                              cursor: "pointer", background: item.active ? "#16a34a" : "#cbd5f5",
                            }}
                          />
                          <input
                            style={inputCelda}
                            {...focoCelda}
                            value={item.description}
                            onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "description", e.target.value)}
                          />
                        </span>
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <AmountInput
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          value={item.amountPerDelivery}
                          onChange={(n) => updateArrayItem(setPersonalProvisionMarkers, item.id, "amountPerDelivery", n)}
                        />
                      </td>
                      <td style={{ ...tdDato, padding: 0 }}>
                        <NumInput
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          value={item.periodicityMonths}
                          onChange={(e) =>
                            updateArrayItem(setPersonalProvisionMarkers, item.id, "periodicityMonths", Number(e.target.value))
                          }
                        />
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>
                        {money(Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1))}
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", flexWrap: "wrap" }}>
                          <select
                            style={{ ...inputCelda, width: "auto" }}
                            value={item.kind}
                            onChange={(e) =>
                              updateArrayItem(setPersonalProvisionMarkers, item.id, "kind", e.target.value as PersonalProvisionKind)
                            }
                          >
                            {PERSONAL_PROVISION_KINDS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                          <select
                            style={{ ...inputCelda, width: "auto", color: markerCompany.primary, fontWeight: 700 }}
                            value={item.company}
                            onChange={(e) =>
                              updateArrayItem(setPersonalProvisionMarkers, item.id, "company", e.target.value as CompanyName)
                            }
                          >
                            {COMPANY_OPTIONS.map((company) => (
                              <option key={company.value} value={company.value}>
                                {company.short}
                              </option>
                            ))}
                          </select>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#94a3b8" }}>
                            <input
                              type="checkbox"
                              checked={item.shared}
                              onChange={(e) =>
                                updateArrayItem(setPersonalProvisionMarkers, item.id, "shared", e.target.checked)
                              }
                            />
                            compartido
                          </label>
                          <input
                            style={{ ...inputCelda, flex: 1, minWidth: 90, color: "#94a3b8" }}
                            {...focoCelda}
                            value={item.notes}
                            placeholder="observación"
                            onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "notes", e.target.value)}
                          />
                        </span>
                      </td>
                      <td style={{ ...tdDato, ...tdAcciones }}>
                        <button
                          type="button"
                          title="Borrar"
                          style={btnBorrar}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Quitar el marcador "${item.description}"?`)) removePersonalProvisionMarker(item.id);
                          }}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div style={styles.rightStrong}>
              Total provision mensual de personal:{" "}
              {money(
                personalProvisionMarkers
                  .filter((item) => item.active)
                  .reduce(
                    (acc, item) =>
                      acc + Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1),
                    0
                  )
              )}
            </div>
          </Panel>
        </div>
  );
}

// Boton visible de borrar en cada fila: hace lo mismo que el click derecho, para que nadie tenga
// que adivinar que el menu existe.
const colAcciones: React.CSSProperties = { width: 40 };
const tdAcciones: React.CSSProperties = { whiteSpace: "nowrap", textAlign: "center", padding: "0 4px" };
const btnBorrar: React.CSSProperties = {
  border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 4,
  padding: "0 5px", fontSize: 11, lineHeight: "16px", cursor: "pointer",
};
