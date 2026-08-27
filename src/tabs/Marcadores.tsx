import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, MiniMetric, ButtonLike, AmountInput } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { money } from "../lib/format";
import { newId } from "../domain/id";
import { aggregateCosts, realCostsByGroup } from "../domain/costs";
import { WORK_TYPE_OPTIONS, PERSONAL_PROVISION_KINDS } from "../domain/types";
import type {
  CompanyName,
  WorkTypeName,
  MarkerFixedGroup,
  SupplyMarkerSubtype,
  PersonalProvisionKind,
} from "../domain/types";

// Mismos colores que la grilla de Costos: fijo indigo, variable ámbar. El grupo se reconoce por
// el color antes que por el texto, y tiene que ser el mismo en las dos solapas.
const SECCIONES_COSTOS = [
  { kind: "fijo" as const, titulo: "COSTOS FIJOS", fondo: "#e0e7ff", tinta: "#3730a3" },
  { kind: "variable" as const, titulo: "COSTOS VARIABLES", fondo: "#fef3c7", tinta: "#92400e" },
];

type MarcadoresTabProps = {
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
  costsMonths: string[];
  costGroups: any[];
  costRows: any[];
  costsFiscalLabel: string;
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
  costsMonths,
  costGroups,
  costRows,
  costsFiscalLabel,
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

  // --- Costos empresariales: lo real de Costos entrando a Marcadores ---------------------
  // Marcadores tiene su PROPIO filtro de empresa: si mirara el de la solapa Costos, el numero
  // cambiaria por un filtro puesto en otra pantalla y nadie entenderia por que.
  const [empresaCostos, setEmpresaCostos] = React.useState<string>("__ALL__");

  const costosReales = React.useMemo(
    () =>
      realCostsByGroup(
        aggregateCosts({
          months: costsMonths,
          groups: costGroups,
          rows: costRows,
          companyScope: empresaCostos === "__ALL__" ? "__ALL__" : (empresaCostos as CompanyName),
        })
      ),
    [costsMonths, costGroups, costRows, empresaCostos]
  );

  // Cuanto tiene cargado HOY cada grupo como marcador: es lo que realmente se usa para
  // presupuestar. La diferencia contra lo real es el aviso de que el precio quedo viejo.
  const marcadorPorGrupo = React.useMemo(() => {
    const acc = new Map<string, number>();
    fixedMarkers
      .filter((m: any) => m.active && (empresaCostos === "__ALL__" || m.company === empresaCostos))
      .forEach((m: any) => acc.set(m.group, (acc.get(m.group) || 0) + Number(m.amount || 0)));
    return acc;
  }, [fixedMarkers, empresaCostos]);

  const totalRealMensual = (kind: "fijo" | "variable") =>
    costosReales.filter((r) => r.kind === kind).reduce((a, r) => a + r.monthlyAverage, 0);

  // Vuelca el promedio mensual real de un grupo al marcador que se usa para presupuestar.
  // No lo hace solo: cambiar esto cambia el precio de todos los presupuestos siguientes, asi que
  // sale del click derecho y con confirmacion.
  const adoptarReal = (grupo: string, montoReal: number) => {
    if (!(montoReal > 0)) return;
    const objetivo = fixedMarkers.filter(
      (m: any) => m.group === grupo && (empresaCostos === "__ALL__" || m.company === empresaCostos)
    );
    const empresaDestino =
      empresaCostos === "__ALL__" ? budget.company : (empresaCostos as CompanyName);

    if (objetivo.length === 0) {
      if (!window.confirm(`"${grupo}" no tiene marcador cargado.

¿Crear uno de ${money(montoReal)} por mes?`)) return;
      setFixedMarkers((prev: any[]) => [
        ...prev,
        {
          id: newId(),
          company: empresaDestino,
          workType: "General",
          group: grupo,
          description: grupo,
          amount: Math.round(montoReal),
          active: true,
          notes: `Real de Costos ${costsFiscalLabel}`,
        },
      ]);
      return;
    }

    if (objetivo.length === 1) {
      const actual = Number(objetivo[0].amount || 0);
      if (!window.confirm(`"${grupo}": pasar el marcador de ${money(actual)} a ${money(montoReal)} por mes?`)) return;
      updateArrayItem(setFixedMarkers, objetivo[0].id, "amount" as any, Math.round(montoReal) as any);
      return;
    }

    // Varios marcadores en el mismo grupo: se ajustan PROPORCIONALMENTE para que sumen lo real,
    // asi no se pierde el detalle de cada concepto (alquiler, expensas, ...).
    const suma = objetivo.reduce((a: number, m: any) => a + Number(m.amount || 0), 0);
    if (!window.confirm(
      `"${grupo}" tiene ${objetivo.length} marcadores que suman ${money(suma)}.

` +
      `¿Ajustarlos proporcionalmente para que sumen ${money(montoReal)} por mes?`
    )) return;
    setFixedMarkers((prev: any[]) =>
      prev.map((m: any) => {
        if (!objetivo.some((o: any) => o.id === m.id)) return m;
        const nuevo =
          suma > 0
            ? (Number(m.amount || 0) / suma) * montoReal
            : montoReal / objetivo.length;
        return { ...m, amount: Math.round(nuevo) };
      })
    );
  };

  return (
        <div style={styles.column}>
          <Panel span="wide" title="Parametros economicos (fuente de verdad)">
            <div style={styles.noticeBox}>
              Estos valores se aplican a los presupuestos y se toman de aca al armar uno nuevo. Editalos
              una vez y quedan fijos para todos los presupuestos siguientes.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Field label="Markup / ganancia (%)">
                <input style={styles.input} type="number" value={markupPct}
                  onChange={(e) => setMarkupPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio de costos (%)">
                <input style={styles.input} type="number" value={deviationPct}
                  onChange={(e) => setDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio mano de obra (%)">
                <input style={styles.input} type="number" value={laborDeviationPct}
                  onChange={(e) => setLaborDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="IVA (%)">
                <input style={styles.input} type="number" value={vatPct}
                  onChange={(e) => setVatPct(Number(e.target.value))} />
              </Field>
              <Field label="Comision (%)">
                <input style={styles.input} type="number" value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))} />
              </Field>
              <Field label="Aumento de stock (%)">
                <input style={styles.input} type="number" value={stockIncreasePct}
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
                  <input style={styles.input} type="number" value={manualAllocationPct}
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
                  onChange={(e) => setEmpresaCostos(e.target.value)}
                  title="Qué empresa se está mirando"
                >
                  <option value="__ALL__">Todas</option>
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
            {/* Lo REAL primero: lo que la empresa gasta de verdad, grupo por grupo, saliendo de
                Costos. Debajo van los marcadores, que son lo que se usa para poner precio. */}
            <div style={styles.metricGrid}>
              <MiniMetric label={`Fijos reales / mes · ${costsFiscalLabel}`} value={money(totalRealMensual("fijo"))} />
              <MiniMetric label="Variables reales / mes" value={money(totalRealMensual("variable"))} />
              <MiniMetric label="Total real / mes" value={money(totalRealMensual("fijo") + totalRealMensual("variable"))} />
              <MiniMetric
                label="En presupuestos (marcadores)"
                value={money(Array.from(marcadorPorGrupo.values()).reduce((a, v) => a + v, 0))}
              />
            </div>

            <div style={{ ...styles.sectionNote, marginTop: 10, marginBottom: 8 }}>
              Esto es lo que sale de <strong>Costos</strong>, promediado sobre los meses que tienen
              movimientos cargados. <strong>Click derecho</strong> sobre un grupo para volcarlo al
              marcador que se usa para presupuestar.
            </div>

            <div style={{ ...planillaWrap, ...anchosEmpresariales.vars, marginBottom: 14 }}>
              <table style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
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
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Real / mes
                      <PlanillaManija
                        onMouseDown={(ev) => anchosEmpresariales.startResize(ev, "col")}
                        onDoubleClick={anchosEmpresariales.resetCol}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>Total ejercicio</th>
                    <th style={{ ...thColumna, textAlign: "right" }}>En presupuestos</th>
                    <th style={thFlexible}>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {SECCIONES_COSTOS.map((sec) => {
                    const filas = costosReales.filter((r) => r.kind === sec.kind);
                    return (
                      <React.Fragment key={sec.kind}>
                        <tr>
                          <td colSpan={5} style={styles.sectionCell}>
                            <div
                              style={{
                                ...styles.sectionHeader,
                                background: sec.fondo,
                                color: sec.tinta,
                                borderColor: sec.tinta,
                              }}
                            >
                              {sec.titulo}
                            </div>
                          </td>
                        </tr>
                        {filas.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ ...tdNombre, color: "#94a3b8", fontWeight: 400 }}>
                              No hay grupos de este tipo.
                            </td>
                          </tr>
                        )}
                        {filas.map((row) => {
                          const enPresupuestos = marcadorPorGrupo.get(row.group) || 0;
                          const dif = row.monthlyAverage - enPresupuestos;
                          const sinDatos = row.monthsWithData === 0;
                          return (
                            <tr
                              key={`${sec.kind}-${row.group}`}
                              onContextMenu={(ev) => {
                                if (sinDatos) return;
                                ev.preventDefault();
                                ev.stopPropagation();
                                adoptarReal(row.group, row.monthlyAverage);
                              }}
                              title={
                                sinDatos
                                  ? "Sin gastos cargados en el ejercicio"
                                  : "Click derecho: usar este real en los presupuestos"
                              }
                              style={{ cursor: sinDatos ? "default" : "context-menu" }}
                            >
                              <td style={{ ...tdNombre, fontWeight: 400 }}>
                                {row.group}
                                {row.auto && <span style={{ ...styles.chatStatus, marginLeft: 6 }}>auto</span>}
                              </td>
                              <td
                                style={{
                                  ...tdDato, textAlign: "right", fontWeight: 700,
                                  color: sinDatos ? "#cbd5e1" : "#0f172a",
                                }}
                              >
                                {sinDatos ? "·" : money(row.monthlyAverage)}
                              </td>
                              <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>
                                {row.total > 0 ? money(row.total) : "·"}
                              </td>
                              <td
                                style={{
                                  ...tdDato, textAlign: "right",
                                  color: enPresupuestos > 0 ? "#334155" : "#cbd5e1",
                                }}
                              >
                                {enPresupuestos > 0 ? money(enPresupuestos) : "·"}
                              </td>
                              <td style={tdFlexible}>
                                {sinDatos ? (
                                  <span style={{ color: "#94a3b8" }}>sin gastos cargados todavía</span>
                                ) : (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: Math.abs(dif) < 1 ? "#16a34a" : dif > 0 ? "#dc2626" : "#2563eb",
                                      }}
                                    >
                                      {Math.abs(dif) < 1 ? "al día" : `${dif > 0 ? "+" : "−"}${money(Math.abs(dif))}`}
                                    </span>
                                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                                      {enPresupuestos === 0
                                        ? "sin marcador: no entra al precio"
                                        : dif > 1
                                        ? "se está presupuestando de menos"
                                        : dif < -1
                                        ? "se está presupuestando de más"
                                        : ""}
                                      {" · "}
                                      {row.monthsWithData} {row.monthsWithData === 1 ? "mes" : "meses"} con datos
                                    </span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ ...styles.sectionNote, marginBottom: 8 }}>
              <strong>Marcadores</strong> — lo que se usa hoy para poner precio a los presupuestos.
            </div>
            <div style={styles.metricGrid}>
              {fixedMarkersByGroup.map((row) => (
                <MiniMetric key={row.group} label={row.group} value={money(row.total)} />
              ))}
            </div>
            <div style={{ ...planillaWrap, ...anchosFijos.vars }}>
            <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colFlexible} />
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
                        opacity: item.active ? 1 : 0.45,
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
                          {WORK_TYPE_OPTIONS.map((option) => (
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
            <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
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
                        <input
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          type="number"
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
                          {WORK_TYPE_OPTIONS.map((option) => (
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
            <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
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
                      <input
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        type="number"
                        value={item.employees}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "employees", Number(e.target.value))}
                      />
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <input
                        style={inputCeldaDerecha}
                        {...focoCelda}
                        type="number"
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
                        <input
                          style={{ ...inputCelda, width: 70, textAlign: "right" }}
                          {...focoCelda}
                          type="number"
                          value={item.hoursBase}
                          onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "hoursBase", Number(e.target.value))}
                        />
                        <strong style={{ color: "#0f172a" }}>{money(item.hoursBase * item.hourlyRate)}</strong>
                        <select
                          style={{ ...inputCelda, width: "auto" }}
                          value={item.workType}
                          onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "workType", e.target.value as WorkTypeName)}
                        >
                          {WORK_TYPE_OPTIONS.map((option) => (
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
            <table style={planillaTable}>
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
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
                        <input
                          style={inputCeldaDerecha}
                          {...focoCelda}
                          type="number"
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
