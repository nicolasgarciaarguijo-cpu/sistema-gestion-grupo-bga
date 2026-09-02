import React, { useState } from "react";
import { styles } from "../ui/styles";
import {
  Panel,
  ButtonLike,
  Field,
  FileDropButton,
  MiniMetric,
  Semaforo,
  SemaforoResumen,
  TwoCol,
  AmountInput,
  MONEY_OUT_COLOR,
  QuickMenu,
  QuickMenuTitle,
  QuickMenuSep,
  quickMenuItem,
} from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import { money, pct, localMonthKey, formatDateDisplay } from "../lib/format";
import { PERSONAL_PROVISION_KINDS } from "../domain/types";
import { isPartnerCategory } from "../domain/payroll";
import type { CompanyName } from "../domain/types";
import { computeMonthAttendance, deriveConvenioHours } from "../domain/attendance";
import type { DayAttendance } from "../domain/attendance";
import { esFinDeSemana, mapaDeFeriados } from "../domain/feriadosArgentina";

type PersonalTabProps = {
  employees: any[];
  visibleEmployees: any[];
  selectedEmployee: any;
  selectedEmployeeId: any;
  employeeBaseConfig: any;
  payrollMonth: any;
  newEmployeeDraft: any;
  employeeProvisionModal: any;
  employeeDocumentModal: any;
  stockPersonalItems: any[];
  personalReminders: any[];
  scaleRows: any[];
  isEmployeeSetupModalOpen: any;
  uploadMessage: any;
  COMPANY_OPTIONS: any[];
  CATEGORY_OPTIONS: readonly any[];
  companyCategoryCostRows: any;
  canAccessCompany: any;
  totalCompanyPayroll: any;
  employeesSortedByPay: any[];
  attendanceMonthData: any;
  shiftMonthKey: any;
  getCompanyMeta: (company: CompanyName) => any;
  getAttendanceRecord: any;
  getAttendanceSummary: any;
  getCurrentPayroll: any;
  getEmployeeDocumentState: any;
  getEmployeeDocumentSummary: any;
  getEmployeePayrollSummary: any;
  getEmployeeProvisionSummary: any;
  getEmployeeSemaphore: any;
  getScaleSemaphore: any;
  getStockPersonalItemForCompany: any;
  monthLabel: (month: string) => string;
  formatDateTimeDisplay: (dateText: any) => string;
  setEmployeeBaseConfig: any;
  setEmployeeDocumentModal: any;
  setEmployeeProvisionModal: any;
  setIsEmployeeSetupModalOpen: any;
  setNewEmployeeDraft: any;
  setPayrollMonth: any;
  setScaleRows: any;
  setSelectedEmployeeId: any;
  addEmployee: any;
  createEmployeeDocumentFromModal: any;
  createEmployeeProvisionFromModal: any;
  exportPersonalReport: any;
  exportReciboBlanco: any;
  exportReciboNegro: any;
  // Logo del recibo POR EMPRESA (cada empresa tiene el suyo). Clave = value de la empresa.
  companyReciboLogos: Record<string, string>;
  setCompanyReciboLogo: (companyValue: string, file: File | null) => void;
  handleAttendanceAttachment: any;
  handleEmployeeDocumentUpload: any;
  handleEmployeeProvisionUpload: any;
  handleScalePdfUpload: any;
  removeEmployee: any;
  removeEmployeeDocument: any;
  removeEmployeeProvisionItem: any;
  saveEmployeePayrollMonth: any;
  syncLaborMarkersFromPersonal: any;
  updateAttendanceRecord: any;
  updateEmployeeDocument: any;
  updateEmployeeField: any;
  updateEmployeePayrollManual: any;
  updateEmployeeProvisionItem: any;
};

// Sugerencias de categoria para el personal FUERA DE CONVENIO. No es una lista cerrada: el campo es
// texto libre (no sale de la escala del convenio), esto solo evita tipear lo de siempre.
const CATEGORIAS_FUERA_CONVENIO = [
  "Socio",
  "Socio gerente",
  "Administracion",
  "Encargado",
  "Jefe de obra",
  "Ventas",
];

// Los tipos de provision se guardan sin acento (son el valor del dato); en pantalla van acentuados.
const ETIQUETA_PROVISION: Record<string, string> = {
  EPP: "EPP",
  Insumos: "Insumos",
  Examenes: "Exámenes",
  Capacitaciones: "Capacitaciones",
};

// Renglon de desglose dentro de una tarjeta del resumen por empresa: rotulo a la izquierda, monto a
// la derecha. `sangria` es para los que cuelgan del renglon de arriba (blanco/negro, tipos de
// provision) y `separador` abre una linea de aire antes de cada pata del impacto.
function LineaResumen({
  label,
  value,
  sangria,
  fuerte,
  separador,
  color,
}: {
  label: string;
  value: string;
  sangria?: boolean;
  fuerte?: boolean;
  separador?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        marginTop: separador ? 6 : 0,
        paddingLeft: sangria ? 10 : 0,
      }}
    >
      <span style={{ ...styles.muted, fontWeight: fuerte ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: fuerte ? 700 : 400, color }}>{value}</span>
    </div>
  );
}

export function PersonalTab(props: PersonalTabProps) {
  const {
    employees, visibleEmployees, selectedEmployee, selectedEmployeeId,
    employeeBaseConfig, payrollMonth, newEmployeeDraft,
    employeeProvisionModal, employeeDocumentModal, stockPersonalItems, personalReminders, scaleRows,
    isEmployeeSetupModalOpen, uploadMessage, COMPANY_OPTIONS, CATEGORY_OPTIONS,
    companyCategoryCostRows, canAccessCompany, totalCompanyPayroll,
    employeesSortedByPay, attendanceMonthData, shiftMonthKey,
    getCompanyMeta, getAttendanceRecord, getAttendanceSummary, getCurrentPayroll,
    getEmployeeDocumentState, getEmployeeDocumentSummary, getEmployeePayrollSummary,
    getEmployeeProvisionSummary, getEmployeeSemaphore, getScaleSemaphore,
    getStockPersonalItemForCompany, monthLabel, formatDateTimeDisplay,
    setEmployeeBaseConfig, setEmployeeDocumentModal, setEmployeeProvisionModal,
    setIsEmployeeSetupModalOpen, setNewEmployeeDraft, setPayrollMonth, setScaleRows,
    setSelectedEmployeeId, addEmployee, createEmployeeDocumentFromModal,
    createEmployeeProvisionFromModal, exportPersonalReport, exportReciboBlanco, exportReciboNegro,
    companyReciboLogos, setCompanyReciboLogo, handleAttendanceAttachment,
    handleEmployeeDocumentUpload, handleEmployeeProvisionUpload, handleScalePdfUpload,
    removeEmployee, removeEmployeeDocument, removeEmployeeProvisionItem,
    saveEmployeePayrollMonth, syncLaborMarkersFromPersonal, updateAttendanceRecord,
    updateEmployeeDocument, updateEmployeeField, updateEmployeePayrollManual,
    updateEmployeeProvisionItem,
  } = props;
  // Escalas: se muestran las VIGENTES = la que rige este mes (la ultima cargada <= mes en curso, aunque
  // sea de un mes anterior por como venga la escala del sindicato) y todas las siguientes. Las viejas
  // se ocultan salvo que se pida verlas.
  const [showOldScales, setShowOldScales] = useState(false);
  const scaleMonthsSorted = Array.from(
    new Set((scaleRows as any[]).map((r) => r.month).filter(Boolean))
  ).sort() as string[];
  const curScaleMonth = (payrollMonth || "").slice(0, 7);
  const inForceMonths = scaleMonthsSorted.filter((m) => m <= curScaleMonth);
  const vigenteFromMonth = inForceMonths.length
    ? inForceMonths[inForceMonths.length - 1]
    : scaleMonthsSorted[0] || curScaleMonth;
  // Capacidad horaria de la dotacion visible (anual). Nominales = horas teoricas; productivas =
  // nominales menos feriados y vacaciones (base para costo hora y futuras estadisticas).
  const workforceHours = (visibleEmployees as any[]).reduce(
    (acc, emp) => {
      const s = getEmployeePayrollSummary(emp);
      acc.nominal += Number(s.annualBaseHours || 0);
      acc.productive += Number(s.productiveAnnualHours || 0);
      return acc;
    },
    { nominal: 0, productive: 0 }
  );
  const workforceProductivityPct =
    workforceHours.nominal > 0 ? (workforceHours.productive / workforceHours.nominal) * 100 : 0;
  const nfHours = (n: number) => Math.round(n).toLocaleString("es-AR");
  const anchosNomina = usePlanillaWidths("personal.nomina", { label: 280, col: 116, colCompact: 88 });
  const [menuNomina, setMenuNomina] = useState<null | { x: number; y: number; id: number }>(null);
  const anchosRecordatorios = usePlanillaWidths("personal.recordatorios", { label: 260, col: 130, colCompact: 100 });
  const anchosCategorias = usePlanillaWidths("personal.categorias", { label: 260, col: 116, colCompact: 88 });
  const anchosEscalas = usePlanillaWidths("personal.escalas", { label: 220, col: 116, colCompact: 88 });

  // La nomina se lee SEPARADA POR EMPRESA (pedido de Nicolas): una sola lista mezclada no dejaba ver
  // cuanta gente tiene cada una. Se respeta el orden por sueldo dentro de cada grupo.
  const empleadosPorEmpresa = COMPANY_OPTIONS.filter((c: any) => c.value && c.value !== "General")
    .map((c: any) => {
      const meta = getCompanyMeta(c.value);
      return {
        company: c.value,
        short: meta.short || c.value,
        primary: meta.primary,
        soft: meta.soft,
        items: employeesSortedByPay.filter((e: any) => e.company === c.value),
      };
    })
    .filter((g: any) => g.items.length > 0);

  return (
        <div style={styles.personalStack}>
          {!selectedEmployee && (
          <div style={{ order: 1, gridColumn: "1 / -1" }}>
          {(() => {
            let rojo = 0;
            let amarillo = 0;
            let verde = 0;
            employeesSortedByPay.forEach((employee) => {
              const level = getEmployeeSemaphore(employee).level;
              if (level === "rojo") rojo += 1;
              else if (level === "amarillo") amarillo += 1;
              else verde += 1;
            });
            return (
              <Panel span="full" title="Semaforo de personal">
                <SemaforoResumen
                  items={[
                    { level: "verde", label: "Fichas completas", value: String(verde) },
                    { level: "amarillo", label: "Documentacion por vencer", value: String(amarillo) },
                    { level: "rojo", label: "Falta info / vencidos", value: String(rojo) },
                  ]}
                />
              </Panel>
            );
          })()}
          </div>
          )}

          <div style={{ order: 2, gridColumn: "1 / -1" }}>
          <Panel
            title="Resumen por empresa"
            span="full"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={() => exportPersonalReport("General")} secondary>
                  Reporte general
                </ButtonLike>
                {COMPANY_OPTIONS.filter((company) => canAccessCompany(company.value)).map((company) => (
                  <ButtonLike
                    key={`personal-report-${company.value}`}
                    onClick={() => exportPersonalReport(company.value)}
                    secondary
                  >
                    Reporte {company.short}
                  </ButtonLike>
                ))}
                <ButtonLike onClick={anchosNomina.toggleCompacto} secondary>
                  {anchosNomina.esCompacto ? "Ancho normal" : "Compacto"}
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.metricGrid}>
              {totalCompanyPayroll.map((row: any) => {
                const meta = getCompanyMeta(row.company);
                const porTipo = row.provisionesPorTipo || {};
                const tiposConCosto = PERSONAL_PROVISION_KINDS.filter(
                  (kind) => Number(porTipo[kind] || 0) > 0
                );
                // Desglose por concepto: solo se muestran los que tienen monto, para no llenar de ceros.
                const salDet = row.salariosDetalle || {};
                const salLineas = (
                  [
                    ["normal", "Normal"],
                    ["feriado", "Feriado"],
                    ["extra50", "Extra 50%"],
                    ["extra100", "Extra 100%"],
                    ["nocturnas", "Nocturnas"],
                    ["antiguedad", "Antigüedad"],
                    ["presentismo", "Presentismo"],
                    ["premios", "Premio blanco"],
                    ["noRem", "No remunerativo"],
                    ["aguinaldo", "Aguinaldo (base)"],
                    ["acordadoYOtros", "Sueldo acordado / otros"],
                  ] as Array<[string, string]>
                ).filter(([k]) => Math.abs(Number(salDet[k] || 0)) >= 0.005);
                const negroDet = row.negroDetalle || {};
                const negroLineas = (
                  [
                    ["premio", "Premio / acuerdo"],
                    ["aguinaldo", "Aguinaldo negro"],
                  ] as Array<[string, string]>
                ).filter(([k]) => Number(negroDet[k] || 0) > 0.005);
                const cargasDet = row.cargasDetalle || {};
                const cargasLineas = (
                  [
                    ["contribuciones", "Contribuciones patronales"],
                    ["seguro", "Seguro"],
                    ["aguinaldo", "Cargas del aguinaldo"],
                  ] as Array<[string, string]>
                ).filter(([k]) => Number(cargasDet[k] || 0) > 0.005);
                const subLinea = (key: string, label: string, val: number, color?: string) => (
                  <div
                    key={key}
                    style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingLeft: 22 }}
                  >
                    <span style={{ ...styles.muted, fontSize: 11 }}>{label}</span>
                    <span style={{ fontSize: 11, color }}>{money(val)}</span>
                  </div>
                );
                return (
                  <div key={row.company} style={{ ...styles.metric, borderColor: meta.primary, background: meta.soft }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontWeight: 800, color: meta.primary }}>{row.label}</span>
                      <span style={styles.muted}>
                        {row.headcount} {row.headcount === 1 ? "empleado" : "empleados"}
                      </span>
                    </div>
                    <div style={styles.muted}>Total neto</div>
                    <div style={{ fontWeight: 700 }}>{money(row.totalNet)}</div>

                    <LineaResumen label="Salarios" value={money(row.salarios)} fuerte separador />
                    <LineaResumen label="Blanco" value={money(row.salariosWhite)} sangria />
                    {salLineas.map(([k, label]) => subLinea(`${row.company}-sal-${k}`, label, Number(salDet[k] || 0)))}
                    <LineaResumen
                      label="Negro"
                      value={money(row.salariosBlack)}
                      sangria
                      color={MONEY_OUT_COLOR}
                    />
                    {negroLineas.map(([k, label]) =>
                      subLinea(`${row.company}-neg-${k}`, label, Number(negroDet[k] || 0), MONEY_OUT_COLOR)
                    )}

                    <LineaResumen label="Cargas sociales" value={money(row.cargasSociales)} fuerte separador />
                    {cargasLineas.map(([k, label]) => subLinea(`${row.company}-car-${k}`, label, Number(cargasDet[k] || 0)))}

                    <LineaResumen
                      label="Exámenes, EPP y capacitaciones"
                      value={money(row.provisiones)}
                      fuerte
                      separador
                    />
                    {tiposConCosto.length === 0 ? (
                      <div style={{ ...styles.muted, paddingLeft: 10 }}>Sin provisiones cargadas.</div>
                    ) : (
                      tiposConCosto.map((kind) => (
                        <LineaResumen
                          key={`${row.company}-prov-${kind}`}
                          label={ETIQUETA_PROVISION[kind]}
                          value={money(Number(porTipo[kind] || 0))}
                          sangria
                        />
                      ))
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, borderTop: "1px solid rgba(0,0,0,0.12)", paddingTop: 4 }}>
                      <span style={{ ...styles.muted, fontWeight: 700 }}>Impacto total</span>
                      <span style={{ fontWeight: 800 }}>{money(row.totalImpact)}</span>
                    </div>
                    <div style={{ ...styles.muted, fontSize: 11 }}>
                      Blanco {money(row.totalWhite)} · Negro {money(row.totalBlack)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={styles.sectionHeader}>Capacidad horaria de la dotación</div>
              <div style={styles.metricGrid}>
                <MiniMetric label="Horas nominales / año" value={nfHours(workforceHours.nominal)} />
                <MiniMetric label="Horas productivas / año" value={nfHours(workforceHours.productive)} />
                <MiniMetric
                  label="No productivas (feriados+vac.)"
                  value={nfHours(workforceHours.nominal - workforceHours.productive)}
                />
                <MiniMetric label="Productividad" value={pct(workforceProductivityPct)} />
              </div>
          </Panel>
          </div>

          {!selectedEmployee && (
          <div style={{ order: 3, gridColumn: "1 / -1" }}>
          <Panel title="Empleados" span="full">
            <div style={{ ...planillaWrap, ...anchosNomina.vars }}>
            <table className="planilla" style={planillaTable}>
              {/* Antes la ultima columna metia asistencia, documentacion, las cuatro provisiones,
                  categoria, antiguedad, ingreso, impacto y empresa en un solo renglon: no se leia
                  nada. Ahora cada cosa tiene su columna, y la empresa pasa al encabezado de grupo. */}
              <colgroup>
                <col style={colLabel} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colDato} />
                <col style={colFlexible} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Empleado
                    <PlanillaManija
                      onMouseDown={(ev) => anchosNomina.startResize(ev, "label")}
                      onDoubleClick={anchosNomina.resetLabel}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>
                    Hs mes
                    <PlanillaManija
                      onMouseDown={(ev) => anchosNomina.startResize(ev, "col")}
                      onDoubleClick={anchosNomina.resetCol}
                    />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Bruto</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Neto</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Costo hora real</th>
                  <th style={thColumna}>Categoría</th>
                  <th style={thColumna}>Asistencia</th>
                  <th style={thColumna}>Documentación</th>
                  <th style={thColumna}>EPP · insumos</th>
                  <th style={thFlexible}>Impacto mensual</th>
                </tr>
              </thead>
              <tbody>
                {empleadosPorEmpresa.map((grupo) => (
                  <React.Fragment key={`grupo-${grupo.company}`}>
                    <tr>
                      <td colSpan={10} style={styles.sectionCell}>
                        <div
                          style={{
                            ...styles.sectionHeader,
                            background: grupo.soft,
                            color: grupo.primary,
                            borderColor: grupo.primary,
                          }}
                        >
                          {grupo.short} · {grupo.company}
                          <span style={{ fontWeight: 400, marginLeft: 8 }}>
                            {grupo.items.length} {grupo.items.length === 1 ? "empleado" : "empleados"}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {grupo.items.map((employee: any) => {
                  const meta = getCompanyMeta(employee.company);
                  const att = getAttendanceSummary(employee);
                  const docs = getEmployeeDocumentSummary(employee);
                  const salary = getEmployeePayrollSummary(employee);
                  const toneStyle =
                    att.tone === "green"
                      ? styles.statusGreen
                      : att.tone === "red"
                      ? styles.statusRed
                      : att.tone === "yellow"
                      ? styles.statusYellow
                      : att.tone === "blue"
                      ? styles.statusBlue
                      : styles.statusGray;
                  const docsStyle =
                    docs.tone === "green"
                      ? styles.statusGreen
                      : docs.tone === "yellow"
                      ? styles.statusYellow
                      : styles.statusRed;
                  const payroll = getCurrentPayroll(employee);
                  return (
                    <tr
                      key={employee.id}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setMenuNomina({ x: ev.clientX, y: ev.clientY, id: employee.id });
                      }}
                      title="Click derecho: abrir la ficha del empleado"
                    >
                      <td
                        style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${meta.primary}` }}
                        title={`${employee.name} · legajo ${employee.legajo}`}
                      >
                        {(() => {
                          const se = getEmployeeSemaphore(employee);
                          return (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={se.level} size={10} title={se.label} />
                              <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0 }}>
                                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {employee.name}
                                </span>
                                <span style={{ ...styles.muted, fontSize: 11 }}>
                                  {employee.legajo} · {se.label}
                                </span>
                              </span>
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right" }}>
                        {Number((payroll.normalHours + payroll.extra50Hours + payroll.extra100Hours).toFixed(2))}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right" }}>
                        {money(
                          employee.employmentType === "temporal"
                            ? Number(employee.agreedSalary || 0)
                            : employee.employmentType === "fuera_convenio"
                            ? Number(employee.agreedWhite || 0) + Number(employee.agreedBlack || 0)
                            : salary.totalGross
                        )}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 600 }}>
                        {money(
                          employee.employmentType === "temporal"
                            ? Number(employee.agreedSalary || 0)
                            : employee.employmentType === "fuera_convenio"
                            ? Number(employee.agreedWhite || 0) + Number(employee.agreedBlack || 0)
                            : salary.netSalary
                        )}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(salary.hourlyCost)}</td>
                      <td style={{ ...tdDato, color: "#64748b", fontSize: 11 }}>
                        {employee.category}
                        <div style={{ ...styles.muted, fontSize: 10 }}>
                          {employee.seniorityYears} años
                          {employee.hireDate ? ` · desde ${formatDateDisplay(employee.hireDate)}` : ""}
                        </div>
                      </td>
                      <td style={tdDato}>
                        <span style={{ ...styles.statusPill, ...toneStyle }}>{att.label}</span>
                      </td>
                      <td style={tdDato}>
                        <span style={{ ...styles.statusPill, ...docsStyle }}>{docs.label}</span>
                      </td>
                      <td style={tdDato}>
                        <span style={{ display: "inline-flex", gap: 3, flexWrap: "wrap" }}>
                          {PERSONAL_PROVISION_KINDS.map((k) => {
                            const prov = getEmployeeProvisionSummary(employee, k);
                            const provStyle =
                              prov.tone === "green"
                                ? styles.statusGreen
                                : prov.tone === "yellow"
                                ? styles.statusYellow
                                : styles.statusRed;
                            return (
                              <span
                                key={k}
                                style={{ ...styles.statusPill, ...provStyle, fontSize: 9, padding: "1px 5px" }}
                                title={`${k}: ${prov.label}`}
                              >
                                {k.slice(0, 3)}
                              </span>
                            );
                          })}
                        </span>
                      </td>
                      <td style={{ ...tdFlexible, color: "#64748b" }}>
                        {money(employee.employmentType === "temporal" ? 0 : salary.employerImpact)}
                        {Number(salary.blackImpact || 0) > 0 && (
                          <span style={{ color: MONEY_OUT_COLOR }}>
                            {" + "}
                            {money(Number(salary.blackImpact || 0))} negro
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            </div>
            {menuNomina && (() => {
              const emp = employeesSortedByPay.find((x: any) => x.id === menuNomina.id);
              const cerrar = () => setMenuNomina(null);
              if (!emp) return null;
              return (
                <QuickMenu x={menuNomina.x} y={menuNomina.y} onClose={cerrar}>
                  <QuickMenuTitle>{emp.name || "empleado"} · legajo {emp.legajo}</QuickMenuTitle>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      setSelectedEmployeeId(selectedEmployeeId === emp.id ? null : emp.id);
                      cerrar();
                    }}
                  >
                    {selectedEmployeeId === emp.id ? "Cerrar ficha" : "Abrir ficha"}
                  </button>
                  <QuickMenuSep />
                  {/* A fin de mes hay que corroborar recibo por recibo: desde la nomina se imprimen
                      sin tener que abrir y cerrar la ficha de cada uno. */}
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      exportReciboBlanco(emp);
                      cerrar();
                    }}
                  >
                    Recibo blanco
                  </button>
                  <button
                    style={quickMenuItem}
                    onClick={() => {
                      exportReciboNegro(emp);
                      cerrar();
                    }}
                  >
                    Recibo negro
                  </button>
                  <QuickMenuSep />
                  <button
                    style={{ ...quickMenuItem, color: "#b91c1c" }}
                    onClick={() => {
                      if (window.confirm(`¿Quitar a ${emp.name} de la nomina?`)) removeEmployee(emp.id);
                      cerrar();
                    }}
                  >
                    Quitar de la nómina
                  </button>
                </QuickMenu>
              );
            })()}
            <div style={styles.sectionHeader}>Alta de empleado</div>
                <div style={styles.muted}>
                  Carga rapida: empresa, legajo, nombre, categoria base y horas nominales. La
                  ficha completa se edita luego desde el boton Abrir.
                </div>
                <TwoCol>
                  <Field label="Empresa">
                    <select
                      style={styles.input}
                      value={newEmployeeDraft.company}
                      onChange={(e) =>
                        setNewEmployeeDraft((d: any) => ({ ...d, company: e.target.value }))
                      }
                    >
                      {COMPANY_OPTIONS.map((c: any) => (
                        <option key={c.value} value={c.value}>
                          {c.short || c.value}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tipo de empleado">
                    <select
                      style={styles.input}
                      value={newEmployeeDraft.employmentType}
                      onChange={(e) =>
                        setNewEmployeeDraft((d: any) => ({ ...d, employmentType: e.target.value }))
                      }
                    >
                      <option value="convenio">Convenio (blanco, por escala)</option>
                      <option value="temporal">Temporal (negro, por acuerdo)</option>
                      <option value="fuera_convenio">Fuera de convenio (socio/administrativo)</option>
                    </select>
                  </Field>
                </TwoCol>
                <TwoCol>
                  <Field label="Nombre y apellido">
                    <input
                      style={styles.input}
                      value={newEmployeeDraft.name}
                      placeholder="Ej. Juan Pérez"
                      onChange={(e) =>
                        setNewEmployeeDraft((d: any) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Legajo (opcional)">
                    <input
                      style={styles.input}
                      value={newEmployeeDraft.legajo}
                      placeholder="Se asigna solo si lo dejás vacío"
                      onChange={(e) =>
                        setNewEmployeeDraft((d: any) => ({ ...d, legajo: e.target.value }))
                      }
                    />
                  </Field>
                </TwoCol>
                <TwoCol>
                  {newEmployeeDraft.employmentType === "convenio" ? (
                    <Field label="Categoría (escala)">
                      <input
                        style={styles.input}
                        list="categorias-alta"
                        value={newEmployeeDraft.category}
                        placeholder="Categoría del convenio"
                        onChange={(e) =>
                          setNewEmployeeDraft((d: any) => ({ ...d, category: e.target.value }))
                        }
                      />
                      <datalist id="categorias-alta">
                        {(CATEGORY_OPTIONS || []).map((c: any) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </Field>
                  ) : (
                    <Field label="Categoría">
                      <div style={{ ...styles.muted, fontSize: 12, paddingTop: 8 }}>
                        {newEmployeeDraft.employmentType === "temporal"
                          ? "Temporal: la categoría es \"Temporal\" (se acuerda el monto en la ficha)."
                          : "Fuera de convenio: la categoría se escribe libre en la ficha."}
                      </div>
                    </Field>
                  )}
                  <Field label="Horas nominales / mes">
                    <input
                      type="number"
                      style={styles.input}
                      value={newEmployeeDraft.nominalHours}
                      onChange={(e) =>
                        setNewEmployeeDraft((d: any) => ({
                          ...d,
                          nominalHours: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </Field>
                </TwoCol>
                <div style={{ marginTop: 8 }}>
                  <ButtonLike
                    onClick={addEmployee}
                    disabled={!String(newEmployeeDraft.name || "").trim()}
                  >
                    Agregar empleado
                  </ButtonLike>
                  {!String(newEmployeeDraft.name || "").trim() && (
                    <span style={{ ...styles.muted, fontSize: 12, marginLeft: 8 }}>
                      Cargá al menos el nombre.
                    </span>
                  )}
                </div>
          </Panel>
          </div>
          )}

          <div style={{ order: 4, gridColumn: "1 / -1" }}>
              <Panel title="Escalas salariales" span="full">
                <div style={styles.uploadActions}>
                  <label style={styles.buttonLikeLabel}>
                    Cargar PDF de escala
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: "none" }}
                      onChange={(e) => handleScalePdfUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                  {uploadMessage && <span style={styles.muted}>{uploadMessage}</span>}
                </div>

                <Field label="Mes de liquidacion">
                  <input
                    style={styles.input}
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                  />
                </Field>

                {(() => {
                  const cats = Array.from(
                    new Set([
                      ...visibleEmployees.map((e) => (e.category || "").trim()).filter(Boolean),
                      ...scaleRows.map((r) => r.category),
                    ])
                  ).sort();
                  if (cats.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div style={styles.label}>
                        Estado de escalas por categoria · {monthLabel(payrollMonth)}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        {cats.map((cat) => {
                          const s = getScaleSemaphore(cat);
                          return (
                            <div
                              key={cat}
                              style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 10 }}
                            >
                              <Semaforo level={s.level} size={16} ring title={s.label} />
                              <div>
                                <div style={{ fontWeight: 700 }}>{cat}</div>
                                <div style={styles.muted}>{s.label}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <ButtonLike onClick={() => setShowOldScales((v) => !v)} secondary>
                    {showOldScales ? "Ocultar escalas anteriores" : "Ver escalas anteriores"}
                  </ButtonLike>
                </div>
                <div style={{ ...planillaWrap, ...anchosEscalas.vars }}>
                <table className="planilla" style={planillaTable}>
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
                        Mes · categoría
                        <PlanillaManija
                          onMouseDown={(ev) => anchosEscalas.startResize(ev, "label")}
                          onDoubleClick={anchosEscalas.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Base hora
                        <PlanillaManija
                          onMouseDown={(ev) => anchosEscalas.startResize(ev, "col")}
                          onDoubleClick={anchosEscalas.resetCol}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>No remun./hora</th>
                      <th style={{ ...thColumna, textAlign: "right" }}>VHT</th>
                      <th style={thFlexible}>Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaleRows
                      .slice()
                      .filter((r) => showOldScales || (r.month || "") >= vigenteFromMonth)
                      .sort((a, b) => `${a.month}-${a.category}`.localeCompare(`${b.month}-${b.category}`))
                      .map((row) => (
                        <tr key={row.id}>
                          <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px" }}>
                              <span style={{ whiteSpace: "nowrap" }}>{monthLabel(row.month)}</span>
                              <select
                                style={{ ...inputCelda, width: "auto" }}
                                value={row.category}
                                onChange={(e) =>
                                  setScaleRows((prev) =>
                                    prev.map((item) =>
                                      item.id === row.id ? { ...item, category: e.target.value } : item
                                    )
                                  )
                                }
                              >
                                {CATEGORY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </span>
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            <AmountInput
                              style={inputCeldaDerecha}
                              {...focoCelda}
                              value={row.baseHourly}
                              onChange={(n) =>
                                setScaleRows((prev) =>
                                  prev.map((item) => (item.id === row.id ? { ...item, baseHourly: n } : item))
                                )
                              }
                            />
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            <AmountInput
                              style={inputCeldaDerecha}
                              {...focoCelda}
                              value={row.nonRemHourly}
                              onChange={(n) =>
                                setScaleRows((prev) =>
                                  prev.map((item) => (item.id === row.id ? { ...item, nonRemHourly: n } : item))
                                )
                              }
                            />
                          </td>
                          <td style={{ ...tdDato, padding: 0 }}>
                            <AmountInput
                              style={inputCeldaDerecha}
                              {...focoCelda}
                              value={row.vht}
                              onChange={(n) =>
                                setScaleRows((prev) =>
                                  prev.map((item) => (item.id === row.id ? { ...item, vht: n } : item))
                                )
                              }
                            />
                          </td>
                          <td style={{ ...tdFlexible, color: "#94a3b8" }} title={row.sourceFileName}>
                            {row.sourceFileName}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              </Panel>
          </div>

          <div style={{ order: 5, gridColumn: "1 / -1" }}>
            <Panel
              title="Costo real por empresa y categoria"
              span="full"
              actions={
                <ButtonLike onClick={syncLaborMarkersFromPersonal}>
                  Volcar a mano de obra base
                </ButtonLike>
              }
            >
              <div style={styles.muted}>
                Este bloque consolida el costo integral real por empresa y categoria a partir de
                los empleados cargados. Sirve para actualizar la mano de obra base de Marcadores
                con un valor hora mas fiel, sin perder la edicion manual posterior.
              </div>

              <div style={{ ...styles.metricGrid, marginTop: 12 }}>
                <MiniMetric label="Empleados totales" value={String(employees.length)} />
                <MiniMetric
                  label="Categorias activas"
                  value={String(companyCategoryCostRows.length)}
                />
              </div>

              {companyCategoryCostRows.length === 0 ? (
                <div style={{ ...styles.empty, marginTop: 12 }}>
                  Cuando cargues empleados, aqui vas a ver el costo real promedio por categoria y
                  empresa.
                </div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosCategorias.vars, marginTop: 12 }}>
                <table className="planilla" style={planillaTable}>
                  <colgroup>
                    <col style={colLabel} />
                    <col style={colDato} />
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
                          onMouseDown={(ev) => anchosCategorias.startResize(ev, "label")}
                          onDoubleClick={anchosCategorias.resetLabel}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>
                        Empleados
                        <PlanillaManija
                          onMouseDown={(ev) => anchosCategorias.startResize(ev, "col")}
                          onDoubleClick={anchosCategorias.resetCol}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Bruto prom.</th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Neto prom.</th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Costo hora prom.</th>
                      <th style={thFlexible}>Impacto · cargas · provisión · presentismo · antigüedad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyCategoryCostRows.map((row) => {
                      const meta = getCompanyMeta(row.company);
                      return (
                        <tr key={`${row.company}-${row.category}`}>
                          <td
                            style={{ ...tdNombre, fontWeight: 400, boxShadow: `inset 4px 0 0 ${meta.primary}` }}
                            title={`${row.category} · ${meta.short}`}
                          >
                            {row.category}
                            <span style={{ color: "#94a3b8" }}> · {meta.short}</span>
                          </td>
                          <td style={{ ...tdDato, textAlign: "right" }}>{row.employeeCount}</td>
                          <td style={{ ...tdDato, textAlign: "right" }}>{money(row.avgGross)}</td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 600 }}>{money(row.avgNet)}</td>
                          <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{money(row.avgHourlyCost)}</td>
                          <td style={{ ...tdFlexible, color: "#64748b" }}>
                            <strong style={{ color: "#0f172a" }}>{money(row.avgEmployerImpact)}</strong>
                            <span style={{ color: "#94a3b8" }}>
                              {" · cargas "}{money(row.avgEmployerImpact - row.avgGross - row.avgMonthlyProvisionCost)}
                              {" · provisión "}{money(row.avgMonthlyProvisionCost)}
                              {" · descuentos "}{money(row.avgGross - row.avgNet)}
                              {" · presentismo "}{pct(row.avgPresentismoPct)}
                              {" · antig. "}{row.avgSeniorityYears.toFixed(1)} años
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            <div style={styles.sectionHeader}>Recordatorios de personal</div>
              {personalReminders.length === 0 ? (
                <div style={styles.empty}>
                  No hay vencimientos ni documentacion pendiente en los proximos 30 dias.
                </div>
              ) : (
                <div style={{ ...planillaWrap, ...anchosRecordatorios.vars }}>
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
                        Empleado
                        <PlanillaManija
                          onMouseDown={(ev) => anchosRecordatorios.startResize(ev, "label")}
                          onDoubleClick={anchosRecordatorios.resetLabel}
                        />
                      </th>
                      <th style={thColumna}>
                        Vence
                        <PlanillaManija
                          onMouseDown={(ev) => anchosRecordatorios.startResize(ev, "col")}
                          onDoubleClick={anchosRecordatorios.resetCol}
                        />
                      </th>
                      <th style={{ ...thColumna, textAlign: "right" }}>Días</th>
                      <th style={thFlexible}>Qué falta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalReminders.map((rem, i) => {
                      const level = rem.state === "vence_pronto" ? "amarillo" : "rojo";
                      const estadoLabel =
                        rem.state === "faltante"
                          ? "Falta cargar"
                          : rem.state === "vencido"
                          ? "Vencido"
                          : "Vence pronto";
                      return (
                        <tr key={`${rem.type}-${rem.employeeName}-${rem.label}-${i}`}>
                          <td style={{ ...tdNombre, fontWeight: 400 }} title={rem.employeeName}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={level} size={10} title={estadoLabel} />
                              {rem.employeeName}
                            </span>
                          </td>
                          <td style={{ ...tdDato, color: "#475569" }}>
                            {rem.dueDate ? formatDateDisplay(rem.dueDate) : "—"}
                          </td>
                          <td
                            style={{
                              ...tdDato, textAlign: "right", fontWeight: 700,
                              color: rem.state === "faltante" ? "#94a3b8" : rem.daysLeft < 0 ? "#dc2626" : "#ca8a04",
                            }}
                          >
                            {rem.state === "faltante"
                              ? "—"
                              : rem.daysLeft < 0
                              ? `${Math.abs(rem.daysLeft)} d vencido`
                              : `${rem.daysLeft} d`}
                          </td>
                          <td style={{ ...tdFlexible, color: "#64748b" }}>
                            <strong style={{ color: "#0f172a" }}>{estadoLabel}</strong>
                            <span style={{ color: "#94a3b8" }}>
                              {" · "}{rem.type === "provision" ? "Provisión" : "Documento"}
                              {" · "}{rem.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </Panel>
          </div>

          {selectedEmployee && (
            <div style={{ order: 3, gridColumn: "1 / -1" }}>
            <Panel
              span="full"
              title={`Ficha del empleado: ${selectedEmployee.name || "Empleado"}`}
              actions={
                <div style={styles.inlineActions}>
                  {/* El recibo sale con el logo de LA EMPRESA DEL EMPLEADO, no con el del presupuesto
                      abierto. Se carga una vez por empresa y queda. */}
                  {(() => {
                    const empresa = String(selectedEmployee.company);
                    const logo = companyReciboLogos?.[empresa] || "";
                    const meta = getCompanyMeta(selectedEmployee.company);
                    return (
                      <label
                        style={{ ...styles.buttonLikeLabel, display: "inline-flex", alignItems: "center", gap: 6 }}
                        title={
                          logo
                            ? `Logo del recibo de ${meta.short || empresa}. Click derecho para quitarlo.`
                            : `${meta.short || empresa} no tiene logo de recibo cargado`
                        }
                        onContextMenu={(ev) => {
                          if (!logo) return;
                          ev.preventDefault();
                          if (window.confirm(`¿Quitar el logo del recibo de ${meta.short || empresa}?`)) {
                            setCompanyReciboLogo(empresa, null);
                          }
                        }}
                      >
                        {logo ? (
                          <img src={logo} alt="" style={{ height: 18, maxWidth: 70, objectFit: "contain" }} />
                        ) : (
                          <span style={{ color: "#b45309", fontWeight: 700 }}>Sin logo</span>
                        )}
                        <span style={{ color: meta.primary, fontWeight: 700 }}>{meta.short || empresa}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            setCompanyReciboLogo(empresa, e.target.files?.[0] || null);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    );
                  })()}
                  <ButtonLike onClick={() => exportReciboBlanco(selectedEmployee)}>Recibo blanco</ButtonLike>
                  <ButtonLike onClick={() => exportReciboNegro(selectedEmployee)} secondary>Recibo negro</ButtonLike>
                  <ButtonLike onClick={() => setSelectedEmployeeId(null)} secondary>Cerrar ficha</ButtonLike>
                </div>
              }
            >
              {(() => {
                const meta = getCompanyMeta(selectedEmployee.company);
                const semaphore = getAttendanceSummary(selectedEmployee);
                const documentSemaphore = getEmployeeDocumentSummary(selectedEmployee);
                const semaphoreStyle =
                  semaphore.tone === "green"
                    ? styles.statusGreen
                    : semaphore.tone === "red"
                    ? styles.statusRed
                    : semaphore.tone === "yellow"
                    ? styles.statusYellow
                    : semaphore.tone === "blue"
                    ? styles.statusBlue
                    : styles.statusGray;
                const payroll = getCurrentPayroll(selectedEmployee);
                const payrollSummary = getEmployeePayrollSummary(selectedEmployee);
                const attendanceWeeks = attendanceMonthData.weeks;
                // Semaforo de puntualidad por dia (verde/amarillo/rojo) para colorear el calendario.
                const monthSemaphore: Map<string, DayAttendance> = computeMonthAttendance(
                  selectedEmployee.attendance || [],
                  payrollMonth
                );
                // Feriados del ano en pantalla, para pintar findes y feriados con fondo rojo.
                const feriadosMap = mapaDeFeriados([
                  Number((payrollMonth || "").slice(0, 4)) || new Date().getFullYear(),
                ]);
                const semColorFor = (level?: string) =>
                  level === "green"
                    ? "#16a34a"
                    : level === "yellow"
                    ? "#ca8a04"
                    : level === "red"
                    ? "#dc2626"
                    : level === "off"
                    ? "#2563eb"
                    : "#cbd5e1";
                // Precarga en masa: recalcula las horas de todos los dias del mes que ya tienen entrada
                // y salida (util para los dias traidos del reloj). Reaplica checkOut -> dispara la precarga.
                const precargarMesDesdeFichadas = () => {
                  (selectedEmployee.attendance || [])
                    .filter((r: any) => {
                      if (!r.date.startsWith(`${payrollMonth}-`) || !r.checkIn || !r.checkOut) return false;
                      if (r.locked) return false; // bloqueado: la carga manual gana
                      const horas =
                        Number(r.normalHours || 0) + Number(r.extra50Hours || 0) +
                        Number(r.extra100Hours || 0) + Number(r.night50Hours || 0);
                      return horas === 0; // solo los que no tienen horas todavia
                    })
                    .forEach((r: any) =>
                      updateAttendanceRecord(selectedEmployee.id, r.date, "checkOut", r.checkOut, {
                        fromAutofill: true,
                      })
                    );
                };

                return (
                  <>
                    <div style={{ ...styles.semaphoreBanner, background: meta.soft, borderColor: meta.primary, color: meta.primary }}>
                      <span style={{ ...styles.statusPill, ...semaphoreStyle }}>{semaphore.label}</span>
                      <span
                        style={{
                          ...styles.statusPill,
                          ...(documentSemaphore.tone === "green"
                            ? styles.statusGreen
                            : documentSemaphore.tone === "yellow"
                            ? styles.statusYellow
                            : styles.statusRed),
                        }}
                      >
                        {documentSemaphore.label}
                      </span>
                      {PERSONAL_PROVISION_KINDS.map((k) => {
                        const prov = getEmployeeProvisionSummary(selectedEmployee, k);
                        return (
                          <span
                            key={k}
                            style={{
                              ...styles.statusPill,
                              ...(prov.tone === "green"
                                ? styles.statusGreen
                                : prov.tone === "yellow"
                                ? styles.statusYellow
                                : styles.statusRed),
                            }}
                          >
                            {k}: {prov.label}
                          </span>
                        );
                      })}
                      <strong>{meta.short}</strong>
                      <span>Liquidacion: {monthLabel(payrollMonth)}</span>
                      <span>Categoria: {selectedEmployee.category}</span>
                    </div>

                    <div style={styles.personalFichaStack}>
                      <Panel title="Datos basicos empleado" span="full" nested>
                        <TwoCol>
                          <Field label="Empresa">
                            <select
                              style={styles.input}
                              value={selectedEmployee.company}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "company", e.target.value)}
                            >
                              {COMPANY_OPTIONS.map((company) => (
                                <option key={company.value} value={company.value}>
                                  {company.value}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Legajo">
                            <input
                              style={styles.input}
                              value={selectedEmployee.legajo}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "legajo", e.target.value)}
                            />
                          </Field>
                          <Field label="Nombre y apellido">
                            <input
                              style={styles.input}
                              value={selectedEmployee.name}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "name", e.target.value)}
                            />
                          </Field>
                          <Field label="CUIL">
                            <input
                              style={styles.input}
                              value={selectedEmployee.cuil || ""}
                              placeholder="20-12345678-9"
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "cuil", e.target.value)}
                            />
                          </Field>
                          <Field label="Fecha de ingreso">
                            <input
                              style={styles.input}
                              type="date"
                              value={selectedEmployee.hireDate || ""}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "hireDate", e.target.value)}
                            />
                          </Field>
                          {selectedEmployee.employmentType === "temporal" ? (
                            <>
                              <Field label="Forma del acuerdo (temporal, negro)">
                                <select
                                  style={styles.input}
                                  value={selectedEmployee.temporalAgreementMode || "mensual"}
                                  onChange={(e) =>
                                    updateEmployeeField(
                                      selectedEmployee.id,
                                      "temporalAgreementMode",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="mensual">Sueldo mensual fijo</option>
                                  <option value="diario">Acuerdo por día</option>
                                </select>
                              </Field>
                              {(selectedEmployee.temporalAgreementMode || "mensual") === "diario" ? (
                                <Field label="Tarifa por día ($, negro)">
                                  <AmountInput
                                    style={styles.input}
                                    value={selectedEmployee.agreedDailyRate ?? 0}
                                    onChange={(n) =>
                                      updateEmployeeField(selectedEmployee.id, "agreedDailyRate", n)
                                    }
                                    placeholder="Monto por día"
                                  />
                                  {(() => {
                                    const dias = (selectedEmployee.attendance || []).filter(
                                      (a: any) =>
                                        a.date?.startsWith(payrollMonth) &&
                                        (a.status === "presente" || !!a.checkIn)
                                    ).length;
                                    const tarifa = Number(selectedEmployee.agreedDailyRate || 0);
                                    return (
                                      <div style={{ ...styles.muted, fontSize: 11, marginTop: 2 }}>
                                        {dias} día(s) trabajado(s) este mes × {money(tarifa)} ={" "}
                                        <strong>{money(tarifa * dias)}</strong>. Los días salen de la
                                        asistencia (presente o con fichada).
                                      </div>
                                    );
                                  })()}
                                </Field>
                              ) : (
                                <Field label="Sueldo acordado (temporal, negro)">
                                  <AmountInput
                                    style={styles.input}
                                    value={selectedEmployee.agreedSalary ?? 0}
                                    onChange={(n) =>
                                      updateEmployeeField(selectedEmployee.id, "agreedSalary", n)
                                    }
                                    placeholder="Monto acordado"
                                  />
                                </Field>
                              )}
                            </>
                          ) : selectedEmployee.employmentType === "fuera_convenio" ? (
                            <>
                              <Field label="Categoria (texto libre)">
                                <input
                                  style={styles.input}
                                  value={selectedEmployee.category || ""}
                                  list="categorias-fuera-convenio"
                                  placeholder="Socio gerente, Administracion, Encargado..."
                                  onChange={(e) =>
                                    updateEmployeeField(selectedEmployee.id, "category", e.target.value)
                                  }
                                />
                                <datalist id="categorias-fuera-convenio">
                                  {CATEGORIAS_FUERA_CONVENIO.map((option) => (
                                    <option key={option} value={option} />
                                  ))}
                                </datalist>
                                <div style={{ ...styles.muted, fontSize: 11, marginTop: 2 }}>
                                  {isPartnerCategory(selectedEmployee.category || "")
                                    ? "Socio: cobra el acordado completo, no se liquida por horas ni se prorratea por dias."
                                    : "Fuera de convenio: la categoria no sale de la escala, se escribe libre."}
                                </div>
                              </Field>
                              <Field label="Sueldo blanco acordado ($)">
                                <AmountInput
                                  style={styles.input}
                                  value={selectedEmployee.agreedWhite ?? 0}
                                  onChange={(n) => updateEmployeeField(selectedEmployee.id, "agreedWhite", n)}
                                  placeholder="Parte en blanco"
                                />
                              </Field>
                              <Field label="Sueldo negro acordado ($)">
                                <AmountInput
                                  style={styles.input}
                                  value={selectedEmployee.agreedBlack ?? 0}
                                  onChange={(n) => updateEmployeeField(selectedEmployee.id, "agreedBlack", n)}
                                  placeholder="Parte en negro"
                                />
                              </Field>
                              <Field label="Blanco registrado (cargas de ley)">
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                                  <input
                                    type="checkbox"
                                    checked={!!selectedEmployee.computeWhiteCharges}
                                    onChange={(e) =>
                                      updateEmployeeField(selectedEmployee.id, "computeWhiteCharges", e.target.checked)
                                    }
                                  />
                                  Calcular descuentos + cargas sobre el blanco
                                </label>
                              </Field>
                            </>
                          ) : (
                            <Field label="Categoria base">
                              <select
                                style={styles.input}
                                value={selectedEmployee.category}
                                onChange={(e) => updateEmployeeField(selectedEmployee.id, "category", e.target.value)}
                              >
                                {CATEGORY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          )}
                          <Field label="Horas nominales">
                            <input
                              style={styles.input}
                              type="number"
                              value={selectedEmployee.nominalHours}
                              onChange={(e) =>
                                updateEmployeeField(
                                  selectedEmployee.id,
                                  "nominalHours",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </Field>
                          {selectedEmployee.employmentType === "temporal" && (
                            <Field label="En el sistema desde (editable)">
                              <input
                                style={styles.input}
                                type="date"
                                value={(selectedEmployee.createdAt || "").slice(0, 10)}
                                onChange={(e) =>
                                  updateEmployeeField(selectedEmployee.id, "createdAt", e.target.value)
                                }
                              />
                            </Field>
                          )}
                        </TwoCol>

                        {selectedEmployee.employmentType === "temporal" && (
                          <div style={{ marginTop: 8, marginBottom: 4 }}>
                            <ButtonLike
                              onClick={() => {
                                updateEmployeeField(selectedEmployee.id, "employmentType", "convenio");
                                updateEmployeeField(selectedEmployee.id, "category", CATEGORY_OPTIONS[0]);
                              }}
                            >
                              Efectivizar (pasar a convenio)
                            </ButtonLike>
                            <div style={{ ...styles.muted, marginTop: 4 }}>
                              Pasa de Temporal (negro, por acuerdo) a Convenio (blanco, por escala). Despues de
                              efectivizar, elegi la categoria de la escala arriba.
                            </div>
                          </div>
                        )}

                        <div style={styles.employeeSubsection}>
                          <div style={styles.panelHeader}>
                            <h4 style={{ margin: 0, fontSize: 15 }}>Documentacion importante</h4>
                            <ButtonLike
                              onClick={() =>
                                setEmployeeDocumentModal({
                                  employeeId: selectedEmployee.id,
                                  name: "",
                                  dueDate: "",
                                })
                              }
                              secondary
                            >
                              Agregar documento
                            </ButtonLike>
                          </div>

                          {selectedEmployee.documents.length === 0 ? (
                            <div style={styles.empty}>Todavia no hay documentacion importante cargada.</div>
                          ) : (
                            selectedEmployee.documents.map((doc) => {
                              const docState = getEmployeeDocumentState(doc);
                              const docTone =
                                docState === "vigente"
                                  ? styles.statusGreen
                                  : docState === "vence_pronto"
                                  ? styles.statusYellow
                                  : styles.statusRed;
                              return (
                                <div key={doc.id} style={styles.subCard}>
                                  <div style={styles.inlineActions}>
                                    <button
                                      style={styles.smallBtn}
                                      onClick={() => removeEmployeeDocument(selectedEmployee.id, doc.id)}
                                    >
                                      Quitar documento
                                    </button>
                                  </div>
                                  <TwoCol>
                                    <Field label="Documento">
                                      <input
                                        style={styles.input}
                                        value={doc.name}
                                        onChange={(e) =>
                                          updateEmployeeDocument(
                                            selectedEmployee.id,
                                            doc.id,
                                            "name",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Field>
                                    <Field label="Vencimiento">
                                      <input
                                        style={styles.input}
                                        type="date"
                                        value={doc.dueDate}
                                        onChange={(e) =>
                                          updateEmployeeDocument(
                                            selectedEmployee.id,
                                            doc.id,
                                            "dueDate",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Field>
                                  </TwoCol>
                                  <div style={styles.uploadActions}>
                                    <span style={{ ...styles.statusPill, ...docTone }}>{docState}</span>
                                    <FileDropButton
                                      label="Cargar documento"
                                      fileName={doc.attachmentName}
                                      accept="image/*,.pdf,application/pdf"
                                      onFileSelected={(file) =>
                                        handleEmployeeDocumentUpload(selectedEmployee.id, doc.id, file)
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div style={styles.employeeSubsection}>
                          <div style={styles.panelHeader}>
                            <h4 style={{ margin: 0, fontSize: 15 }}>
                              EPP, insumos, examenes y capacitaciones
                            </h4>
                            <div style={styles.inlineActions}>
                              {PERSONAL_PROVISION_KINDS.map((k) => (
                                <ButtonLike
                                  key={k}
                                  onClick={() =>
                                    setEmployeeProvisionModal({
                                      employeeId: selectedEmployee.id,
                                      kind: k,
                                      title: "",
                                      dueDate: "",
                                      unitPrice: 0,
                                    })
                                  }
                                  secondary
                                >
                                  Agregar {k}
                                </ButtonLike>
                              ))}
                            </div>
                          </div>

                          {selectedEmployee.provisionItems.length === 0 ? (
                            <div style={styles.empty}>No hay entregas cargadas.</div>
                          ) : (
                            selectedEmployee.provisionItems.map((item) => {
                              const stockItem = getStockPersonalItemForCompany(item.stockCode, selectedEmployee.company);
                              const requirement = employeeBaseConfig.provisionTemplates.find(
                                (template) => template.stockCode === item.stockCode && template.kind === item.kind
                              );
                              const stockEnough = Number(stockItem?.quantity || 0) >= Number(requirement?.quantity || item.quantity || 0);
                              return (
                                <div key={item.id} style={styles.subCard}>
                                  <div style={styles.grid2}>
                                    <Field label="Item">
                                      <select
                                        style={styles.input}
                                        value={item.stockCode}
                                        onChange={(e) =>
                                          updateEmployeeProvisionItem(selectedEmployee.id, item.id, "stockCode", e.target.value)
                                        }
                                      >
                                        {stockPersonalItems.map((stock) => (
                                          <option key={stock.code} value={stock.code}>
                                            {stock.description}
                                          </option>
                                        ))}
                                      </select>
                                    </Field>
                                    <Field label="Tipo">
                                      <input style={styles.inputReadOnly} value={item.kind} readOnly />
                                    </Field>
                                    <Field label="Cantidad entregada">
                                      <input
                                        style={styles.input}
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) =>
                                          updateEmployeeProvisionItem(selectedEmployee.id, item.id, "quantity", Number(e.target.value))
                                        }
                                      />
                                    </Field>
                                    <Field label="Vigencia / vence">
                                      <input
                                        style={styles.input}
                                        type="date"
                                        value={item.dueDate}
                                        onChange={(e) =>
                                          updateEmployeeProvisionItem(selectedEmployee.id, item.id, "dueDate", e.target.value)
                                        }
                                      />
                                    </Field>
                                  </div>
                                  <div style={styles.uploadActions}>
                                    <span style={{ ...styles.statusPill, ...(stockEnough ? styles.statusGreen : styles.statusRed) }}>
                                      {stockEnough ? `Reposicion disponible (${Number(stockItem?.quantity || 0)})` : `Reposicion faltante (${Number(stockItem?.quantity || 0)})`}
                                    </span>
                                    <span style={styles.muted}>
                                      Precio stock: {stockItem ? money(stockItem.unitPrice) : "-"}
                                    </span>
                                    <label style={styles.buttonLikeLabel}>
                                      Cargar certificado
                                      <input
                                        type="file"
                                        style={{ display: "none" }}
                                        onChange={(e) =>
                                          handleEmployeeProvisionUpload(
                                            selectedEmployee.id,
                                            item.id,
                                            e.target.files?.[0] || null
                                          )
                                        }
                                      />
                                    </label>
                                    {item.attachmentName && <div style={styles.fileName}>{item.attachmentName}</div>}
                                    <button
                                      style={styles.smallBtn}
                                      onClick={() => removeEmployeeProvisionItem(selectedEmployee.id, item.id)}
                                    >
                                      Quitar item
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </Panel>

                    </div>

                    <div style={styles.personalAttendancePayrollGrid}>
                      <div style={styles.personalAttendancePane}>
                    <Panel title="Presentismo y ausencias" span="full" nested>
                      <div style={styles.attendanceToolbar}>
                        <div>
                          <div style={styles.attendanceMonthTitle}>
                            {attendanceMonthData.labelUpper}
                          </div>
                          <div style={styles.muted}>
                            Al guardar el mes quedara registrado como {attendanceMonthData.label}.
                          </div>
                        </div>
                        <div style={styles.inlineActions}>
                          <button
                            style={styles.smallBtn}
                            onClick={() => setPayrollMonth(shiftMonthKey(payrollMonth, -1))}
                          >
                            Mes anterior
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => setPayrollMonth(localMonthKey())}
                          >
                            Mes actual
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => setPayrollMonth(shiftMonthKey(payrollMonth, 1))}
                          >
                            Mes siguiente
                          </button>
                          <button
                            style={{ ...styles.smallBtn, background: "#0f172a", color: "#fff", borderColor: "#0f172a" }}
                            title="Recalcula las horas (normales/extra/nocturnas) de todos los días del mes que ya tienen entrada y salida cargadas."
                            onClick={precargarMesDesdeFichadas}
                          >
                            ⧗ Precargar horas del mes
                          </button>
                        </div>
                      </div>
                      <div style={styles.attendanceWeekdayHeader}>
                        {attendanceMonthData.weekdays.map((weekday) => (
                          <div key={weekday} style={styles.attendanceWeekdayCell}>
                            {weekday}
                          </div>
                        ))}
                      </div>
                      <div style={styles.attendanceCalendar}>
                        {attendanceWeeks.map((week, weekIndex) => (
                          <div key={`attendance-week-${weekIndex}`} style={styles.attendanceWeek}>
                            <div style={styles.attendanceWeekTitle}>Semana {weekIndex + 1}</div>
                            <div style={styles.attendanceWeekGrid}>
                              {week.map((day, dayIndex) => {
                                if (!day) {
                                  return (
                                    <div
                                      key={`attendance-empty-${weekIndex}-${dayIndex}`}
                                      style={styles.attendanceEmptyCard}
                                    />
                                  );
                                }
                                const record = getAttendanceRecord(selectedEmployee, day.key);
                                const status = record?.status || "sin_cargar";
                                const feriadoNombre = feriadosMap.get(day.key);
                                // Findes y feriados: fondo rojo suave (dias no laborables).
                                const esRojo = esFinDeSemana(day.key) || feriadoNombre !== undefined;
                                const isLocked = record?.locked === true;
                                const statusStyle =
                                  status === "presente"
                                    ? styles.statusGreen
                                    : status === "ausente_injustificado"
                                    ? styles.statusRed
                                    : status === "ausente_justificado"
                                    ? styles.statusYellow
                                    : status === "vacaciones"
                                    ? styles.statusBlue
                                    : status === "feriado" || status === "fin_de_semana"
                                    ? styles.statusRed
                                    : styles.statusGray;
                                const sem = monthSemaphore.get(day.key);
                                const semColor = semColorFor(sem?.level);
                                const cInput = { ...styles.input, padding: "4px 6px", fontSize: 12 };
                                const hourInput = (
                                  label: string,
                                  field: string,
                                  val: number
                                ) => (
                                  <div>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: "#64748b",
                                        letterSpacing: 0.2,
                                        display: "block",
                                        marginBottom: 1,
                                      }}
                                    >
                                      {label}
                                    </span>
                                    <input
                                      style={cInput}
                                      type="number"
                                      min={0}
                                      step={0.5}
                                      value={val}
                                      onChange={(e) =>
                                        updateAttendanceRecord(
                                          selectedEmployee.id,
                                          day.key,
                                          field,
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                  </div>
                                );
                                return (
                                  <div
                                    key={day.key}
                                    style={{
                                      ...styles.attendanceCard,
                                      borderLeft: `4px solid ${semColor}`,
                                      ...(esRojo ? { background: "#fee2e2" } : {}),
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "baseline",
                                        marginBottom: 4,
                                      }}
                                    >
                                      <div>
                                        <strong style={{ fontSize: 16, color: "#0f172a" }}>{day.day}</strong>{" "}
                                        <span style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                                          {day.weekday}
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        {/* Candado: fija el dia para que la precarga del reloj no lo pise. */}
                                        <button
                                          type="button"
                                          title={
                                            isLocked
                                              ? "Bloqueado: la precarga del reloj no lo toca. Click para desbloquear."
                                              : "Sin bloquear: la precarga del reloj puede recalcular las horas. Click para bloquear."
                                          }
                                          onClick={() =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "locked",
                                              !isLocked
                                            )
                                          }
                                          style={{
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            fontSize: 13,
                                            lineHeight: 1,
                                            padding: 0,
                                            opacity: isLocked ? 1 : 0.35,
                                          }}
                                        >
                                          {isLocked ? "🔒" : "🔓"}
                                        </button>
                                        <span
                                          title={sem?.label || status.replaceAll("_", " ")}
                                          style={{
                                            width: 11,
                                            height: 11,
                                            borderRadius: "50%",
                                            background: semColor,
                                            flexShrink: 0,
                                          }}
                                        />
                                      </div>
                                    </div>
                                    {feriadoNombre && (
                                      <div style={{ fontSize: 10, fontWeight: 800, color: "#b91c1c", marginBottom: 3 }}>
                                        {feriadoNombre}
                                      </div>
                                    )}
                                    <select
                                      style={{ ...styles.input, padding: "4px 6px", fontSize: 12 }}
                                      value={status}
                                      onChange={(e) =>
                                        updateAttendanceRecord(selectedEmployee.id, day.key, "status", e.target.value)
                                      }
                                    >
                                      <option value="sin_cargar">Sin cargar</option>
                                      <option value="presente">Presente</option>
                                      <option value="ausente_injustificado">Ausente s/ justificar</option>
                                      <option value="ausente_justificado">Ausente justificado</option>
                                      <option value="vacaciones">Vacaciones</option>
                                      <option value="feriado">Feriado</option>
                                      <option value="fin_de_semana">Fin de semana</option>
                                    </select>

                                    {status === "presente" && (
                                      <>
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: 6,
                                            marginTop: 6,
                                          }}
                                        >
                                          <div>
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                color: "#64748b",
                                                display: "block",
                                                marginBottom: 1,
                                              }}
                                            >
                                              ENTRADA
                                            </span>
                                            <input
                                              style={cInput}
                                              type="time"
                                              value={record?.checkIn ?? ""}
                                              onChange={(e) =>
                                                updateAttendanceRecord(
                                                  selectedEmployee.id,
                                                  day.key,
                                                  "checkIn",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                          <div>
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                color: "#64748b",
                                                display: "block",
                                                marginBottom: 1,
                                              }}
                                            >
                                              SALIDA
                                            </span>
                                            <input
                                              style={cInput}
                                              type="time"
                                              value={record?.checkOut ?? ""}
                                              onChange={(e) =>
                                                updateAttendanceRecord(
                                                  selectedEmployee.id,
                                                  day.key,
                                                  "checkOut",
                                                  e.target.value
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        {sem?.label && (
                                          <div style={{ fontSize: 11, fontWeight: 700, color: semColor, marginTop: 4 }}>
                                            {sem.label}
                                          </div>
                                        )}
                                        <div
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(4, 1fr)",
                                            gap: 4,
                                            marginTop: 6,
                                          }}
                                        >
                                          {hourInput("NORM", "normalHours", record?.normalHours ?? 0)}
                                          {hourInput("50%", "extra50Hours", record?.extra50Hours ?? 0)}
                                          {hourInput("100%", "extra100Hours", record?.extra100Hours ?? 0)}
                                          {hourInput("NOC", "night50Hours", record?.night50Hours ?? 0)}
                                        </div>
                                      </>
                                    )}

                                    {status !== "presente" && status !== "sin_cargar" && (
                                      <div style={{ marginTop: 6 }}>
                                        <span style={{ ...styles.statusPill, ...statusStyle }}>
                                          {status.replaceAll("_", " ")}
                                        </span>
                                      </div>
                                    )}

                                    {status === "ausente_justificado" && (
                                      <div style={{ marginTop: 8 }}>
                                        <FileDropButton
                                          label="Cargar justificativo"
                                          fileName={record?.attachmentName}
                                          accept="image/*,.pdf,application/pdf"
                                          onFileSelected={(file) =>
                                            handleAttendanceAttachment(
                                              selectedEmployee.id,
                                              day.key,
                                              file
                                            )
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                      </div>

                      <div style={styles.personalPayrollPane}>
                        <Panel title="Liquidacion del mes" span="full" nested>
                          <div style={styles.liquidationColumn}>
                            <Field label="Horas normales (desde calendario)">
                              <input
                                style={styles.inputReadOnly}
                                type="number"
                                value={payroll.normalHours}
                                readOnly
                              />
                            </Field>
                            <Field label="Horas extra 50 (desde calendario)">
                              <input
                                style={styles.inputReadOnly}
                                type="number"
                                value={payroll.extra50Hours}
                                readOnly
                              />
                            </Field>
                            <Field label="Horas extra 100 (desde calendario)">
                              <input
                                style={styles.inputReadOnly}
                                type="number"
                                value={payroll.extra100Hours}
                                readOnly
                              />
                            </Field>
                            <Field label="Hs nocturnas al 50% (+13,33%)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.night50Hours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "night50Hours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Hs nocturnas (+13,33%)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.nightHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "nightHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Horas feriado">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.holidayHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "holidayHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Ausencias injustificadas (hs)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.unjustifiedAbsenceHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "unjustifiedAbsenceHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Ausencias justificadas (hs)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.justifiedAbsenceHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "justifiedAbsenceHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Vacaciones (dias)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.vacationsDays}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "vacationsDays",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Presentismo % (cuánto representa)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.presentismoPctOverride ?? 0}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "presentismoPctOverride",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            {/* CUANTO COBRA del presentismo este mes. Sale de la asistencia (1 tarde
                                75%, 2 tardes 50%, 3 lo pierde; 1 ausente 50%, 2 lo pierde) y se puede
                                fijar a mano con los botones. Criterio de Nicolas, 2026-08-31. */}
                            <Field label="Presentismo que cobra">
                              {(() => {
                                const actual =
                                  payroll.presentismoAsistenciaPct === null ||
                                  payroll.presentismoAsistenciaPct === undefined
                                    ? null
                                    : Number(payroll.presentismoAsistenciaPct);
                                const setPct = (v: number | null) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "presentismoAsistenciaPct" as any,
                                    v as any
                                  );
                                return (
                                  <div>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                      {[25, 50, 75, 100].map((v) => (
                                        <button
                                          key={v}
                                          onClick={() => setPct(v)}
                                          style={{
                                            flex: "1 1 0", minWidth: 52, cursor: "pointer",
                                            padding: "6px 4px", borderRadius: 8, fontWeight: 800,
                                            fontSize: 13,
                                            background: actual === v ? "#0f172a" : "#fff",
                                            color: actual === v ? "#fff" : "#334155",
                                            border: `2px solid ${actual === v ? "#0f172a" : "#cbd5e1"}`,
                                          }}
                                        >
                                          {v}%
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setPct(null)}
                                      style={{
                                        marginTop: 6, width: "100%", cursor: "pointer", fontSize: 11,
                                        padding: "4px", borderRadius: 6, border: "1px dashed #cbd5e1",
                                        background: actual === null ? "#f1f5f9" : "#fff",
                                        color: "#475569", fontWeight: actual === null ? 800 : 400,
                                      }}
                                      title="Vuelve a lo que diga la asistencia del mes"
                                    >
                                      {actual === null ? "✓ Según la asistencia" : "Volver a la asistencia"}
                                    </button>
                                  </div>
                                );
                              })()}
                            </Field>
                            <Field label="Anticipos">
                              <AmountInput
                                style={styles.input}
                                value={payroll.anticipos}
                                onChange={(n) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "anticipos",
                                    n
                                  )
                                }
                              />
                            </Field>
                            <Field label="Premios / Acuerdo (negro)">
                              <AmountInput
                                style={styles.input}
                                value={payroll.cashBonus}
                                onChange={(n) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "cashBonus",
                                    n
                                  )
                                }
                              />
                            </Field>
                            <Field label="Adicional en blanco (con cargas)">
                              <AmountInput
                                style={styles.input}
                                value={payroll.whiteBonus || 0}
                                onChange={(n) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "whiteBonus",
                                    n
                                  )
                                }
                              />
                            </Field>
                            <Field label="Impacto empresa %">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.employerExtraPct}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "employerExtraPct",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Notas de liquidacion">
                              <textarea
                                style={styles.textarea}
                                value={payroll.notes}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "notes",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                          </div>

                          <div style={{ ...styles.metricGrid, marginTop: 12 }}>
                            <MiniMetric label="Neto blanco" value={money(payrollSummary.net)} />
                            <MiniMetric label="Adicional blanco" value={money(payrollSummary.whiteBonus || 0)} />
                            <MiniMetric label="Premios / Acuerdo (negro)" value={money(payrollSummary.blackMonthly)} />
                            <MiniMetric label="Total empleado" value={money(payrollSummary.netWithCashBonus)} />
                          </div>

                          {payroll.manualOverride && (
                            <div style={{ marginTop: 10 }}>
                              <span style={{ ...styles.statusPill, ...styles.statusYellow }}>
                                Corregido manualmente
                              </span>
                            </div>
                          )}

                          <div style={{ ...styles.inlineActions, marginTop: 12 }}>
                            <ButtonLike
                              onClick={() => saveEmployeePayrollMonth(selectedEmployee.id, payrollMonth)}
                            >
                              Guardar mes
                            </ButtonLike>
                            {payroll.savedAt && (
                              <span style={styles.muted}>
                                Guardado: {formatDateTimeDisplay(payroll.savedAt)}
                              </span>
                            )}
                          </div>

                          {selectedEmployee.payrolls.filter((item) => item.savedAt).length > 0 && (
                            <div style={styles.savedMonthsList}>
                              <strong>Meses guardados</strong>
                              {selectedEmployee.payrolls
                                .filter((item) => item.savedAt)
                                .slice()
                                .sort((a, b) => b.month.localeCompare(a.month))
                                .map((item) => (
                                  <button
                                    key={`${selectedEmployee.id}-${item.month}`}
                                    style={styles.smallBtn}
                                    onClick={() => setPayrollMonth(item.month)}
                                  >
                                    {monthLabel(item.month)} -{" "}
                                    {item.manualOverride ? "corregido manualmente" : "desde calendario"}
                                  </button>
                                ))}
                            </div>
                          )}
                        </Panel>
                      </div>
                    </div>

                    <div style={styles.personalFichaStack}>
                      <Panel title="Sueldo e impacto empresa" nested>
                        <div style={styles.metricGrid}>
                          <MiniMetric label="Escala mes" value={payrollSummary.scale ? `${payrollSummary.scale.category} · ${monthLabel(payrollSummary.scale.month)}` : "Manual"} />
                          <MiniMetric label="Hora base" value={money(payrollSummary.baseHourly)} />
                          <MiniMetric label="No remun./hora" value={money(payrollSummary.nonRemHourly)} />
                          <MiniMetric label="Hora neta ref." value={money(payrollSummary.netHourly)} />
                          <MiniMetric label="Bruto remunerativo" value={money(payrollSummary.grossRem)} />
                          <MiniMetric label="No remunerativo" value={money(payrollSummary.nonRem)} />
                          <MiniMetric label="Aportes empresa" value={money(payrollSummary.employerContrib + payrollSummary.employerInsurance)} />
                            <MiniMetric label="Provision mensual" value={money(payrollSummary.monthlyProvisionCost)} />
                            <MiniMetric label="SAC mensual" value={money(payrollSummary.monthlySACProration)} />
                            <MiniMetric label="Aguinaldo anual" value={money(payrollSummary.annualSACBase)} />
                          <MiniMetric label="Neto" value={money(payrollSummary.net)} />
                          <MiniMetric
                            label="Impacto empresa BLANCO"
                            value={money(selectedEmployee.employmentType === "temporal" ? 0 : payrollSummary.employerImpact)}
                          />
                          <MiniMetric
                            label="Impacto empresa NEGRO"
                            value={money(payrollSummary.blackImpact || 0)}
                          />
                          <MiniMetric
                            label="Impacto empresa TOTAL"
                            value={money(payrollSummary.totalMonthlyImpact || 0)}
                          />
                          <MiniMetric label="Horas productivas/año" value={String(Math.round(payrollSummary.productiveAnnualHours || 0))} />
                          <MiniMetric label="Costo hora (real, blanco+negro)" value={money(payrollSummary.hourlyCost)} />
                        </div>
                        <Field label="Experiencias y destrezas">
                          <textarea style={styles.textarea} value={selectedEmployee.skills} onChange={(e) => updateEmployeeField(selectedEmployee.id, "skills", e.target.value)} />
                        </Field>
                        <Field label="Observaciones">
                          <textarea style={styles.textarea} value={selectedEmployee.notes} onChange={(e) => updateEmployeeField(selectedEmployee.id, "notes", e.target.value)} />
                        </Field>
                      </Panel>
                    </div>
                  </>
                );
              })()}
            </Panel>
            </div>
          )}
        </div>
  );
}
