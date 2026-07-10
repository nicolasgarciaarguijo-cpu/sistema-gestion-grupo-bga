import { useState } from "react";
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
} from "../ui/primitives";
import { money, pct, localMonthKey, formatDateDisplay } from "../lib/format";
import { PERSONAL_PROVISION_KINDS } from "../domain/types";
import type { CompanyName } from "../domain/types";

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
    createEmployeeProvisionFromModal, exportPersonalReport, handleAttendanceAttachment,
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
  return (
        <div style={styles.personalStack}>
          <div style={{ order: -1, gridColumn: "1 / -1" }}>
            <Panel span="full" title={`Capacidad horaria de la dotacion (${visibleEmployees.length} empleados)`}>
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
          <div style={{ order: 0, gridColumn: "1 / -1" }}>
            <Panel span="full" title={`Recordatorios de personal (${personalReminders.length})`}>
              {personalReminders.length === 0 ? (
                <div style={styles.empty}>
                  No hay vencimientos ni documentacion pendiente en los proximos 30 dias.
                </div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Empleado</th>
                      <th>Tipo</th>
                      <th>Detalle</th>
                      <th>Vence</th>
                      <th>Dias</th>
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
                          <td>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={level} size={10} title={estadoLabel} />
                              <span>{estadoLabel}</span>
                            </span>
                          </td>
                          <td>{rem.employeeName}</td>
                          <td>{rem.type === "provision" ? "Provision" : "Documento"}</td>
                          <td>{rem.label}</td>
                          <td>{rem.dueDate ? formatDateDisplay(rem.dueDate) : "-"}</td>
                          <td>
                            {rem.state === "faltante"
                              ? "-"
                              : rem.daysLeft < 0
                              ? `${Math.abs(rem.daysLeft)} d vencido`
                              : `${rem.daysLeft} d`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
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
                <table style={{ ...styles.table, marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Categoria</th>
                      <th>Empleados</th>
                      <th>Antig. prom.</th>
                      <th>Presentismo prom.</th>
                      <th>Descuentos prom.</th>
                      <th>Cargas + SAC prom.</th>
                      <th>Provision prom.</th>
                      <th>Bruto prom.</th>
                      <th>Neto prom.</th>
                      <th>Impacto prom.</th>
                      <th>Costo hora prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyCategoryCostRows.map((row) => {
                      const meta = getCompanyMeta(row.company);
                      return (
                        <tr key={`${row.company}-${row.category}`} style={{ background: `${meta.soft}55` }}>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                background: meta.soft,
                                color: meta.primary,
                              }}
                            >
                              {meta.short}
                            </span>
                          </td>
                          <td>{row.category}</td>
                          <td>{row.employeeCount}</td>
                          <td>{row.avgSeniorityYears.toFixed(1)}</td>
                          <td>{pct(row.avgPresentismoPct)}</td>
                          <td>{money(row.avgGross - row.avgNet)}</td>
                          <td>{money(row.avgEmployerImpact - row.avgGross - row.avgMonthlyProvisionCost)}</td>
                          <td>{money(row.avgMonthlyProvisionCost)}</td>
                          <td>{money(row.avgGross)}</td>
                          <td>{money(row.avgNet)}</td>
                          <td>{money(row.avgEmployerImpact)}</td>
                          <td>{money(row.avgHourlyCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

            {employeeDocumentModal && (
              <div style={styles.modalBackdrop}>
                <div style={styles.employeeSetupModal}>
                  <Panel
                    title="Agregar documentacion importante"
                    span="full"
                    actions={
                      <div style={styles.inlineActions}>
                        <ButtonLike onClick={createEmployeeDocumentFromModal}>
                          Crear item
                        </ButtonLike>
                        <ButtonLike onClick={() => setEmployeeDocumentModal(null)} secondary>
                          Cancelar
                        </ButtonLike>
                      </div>
                    }
                  >
                    <TwoCol>
                      <Field label="Titulo">
                        <input
                          style={styles.input}
                          value={employeeDocumentModal.name}
                          onChange={(e) =>
                            setEmployeeDocumentModal({
                              ...employeeDocumentModal,
                              name: e.target.value,
                            })
                          }
                          placeholder="Ej: DNI, Apto medico, Certificado"
                        />
                      </Field>
                      <Field label="Vigencia / vencimiento">
                        <input
                          style={styles.input}
                          type="date"
                          value={employeeDocumentModal.dueDate}
                          onChange={(e) =>
                            setEmployeeDocumentModal({
                              ...employeeDocumentModal,
                              dueDate: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </TwoCol>
                  </Panel>
                </div>
              </div>
            )}

            {employeeProvisionModal && (
              <div style={styles.modalBackdrop}>
                <div style={styles.employeeSetupModal}>
                  <Panel
                    title={`Agregar ${employeeProvisionModal.kind}`}
                    span="full"
                    actions={
                      <div style={styles.inlineActions}>
                        <ButtonLike onClick={createEmployeeProvisionFromModal}>
                          Crear item
                        </ButtonLike>
                        <ButtonLike onClick={() => setEmployeeProvisionModal(null)} secondary>
                          Cancelar
                        </ButtonLike>
                      </div>
                    }
                  >
                    <TwoCol>
                      <Field label="Titulo del item">
                        <input
                          style={styles.input}
                          value={employeeProvisionModal.title}
                          onChange={(e) =>
                            setEmployeeProvisionModal({
                              ...employeeProvisionModal,
                              title: e.target.value,
                            })
                          }
                          placeholder="Ej: Ropa de trabajo"
                        />
                      </Field>
                      <Field label="Vigencia / vencimiento">
                        <input
                          style={styles.input}
                          type="date"
                          value={employeeProvisionModal.dueDate}
                          onChange={(e) =>
                            setEmployeeProvisionModal({
                              ...employeeProvisionModal,
                              dueDate: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Costo neto">
                        <input
                          style={styles.input}
                          type="number"
                          value={employeeProvisionModal.unitPrice}
                          onChange={(e) =>
                            setEmployeeProvisionModal({
                              ...employeeProvisionModal,
                              unitPrice: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </TwoCol>
                    <div style={{ ...styles.muted, marginTop: 10 }}>
                      Al crear este item tambien se genera el item relacionado en Stock dentro de
                      EPP/Insumos.
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {isEmployeeSetupModalOpen && (
              <div style={styles.modalBackdrop}>
                <div style={styles.employeeSetupModal}>
                  <Panel
                    title="Agregar empleado"
                    span="full"
                    actions={
                      <div style={styles.inlineActions}>
                        <ButtonLike
                          onClick={() => {
                            addEmployee();
                            setIsEmployeeSetupModalOpen(false);
                          }}
                        >
                          Agregar empleado
                        </ButtonLike>
                        <ButtonLike
                          onClick={() => setIsEmployeeSetupModalOpen(false)}
                          secondary
                        >
                          Cancelar
                        </ButtonLike>
                      </div>
                    }
                  >
                    <TwoCol>
                      <Field label="Empresa">
                        <select
                          style={styles.input}
                          value={newEmployeeDraft.company}
                          onChange={(e) =>
                            setNewEmployeeDraft({
                              ...newEmployeeDraft,
                              company: e.target.value as CompanyName,
                            })
                          }
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Legajo (automatico)">
                        <input
                          style={styles.inputReadOnly}
                          value={newEmployeeDraft.legajo}
                          onChange={(e) =>
                            setNewEmployeeDraft({ ...newEmployeeDraft, legajo: e.target.value })
                          }
                          placeholder="Se asigna solo al crear"
                        />
                      </Field>
                      <Field label="Nombre y apellido">
                        <input
                          style={styles.input}
                          value={newEmployeeDraft.name}
                          onChange={(e) =>
                            setNewEmployeeDraft({ ...newEmployeeDraft, name: e.target.value })
                          }
                          placeholder="Nombre completo"
                        />
                      </Field>
                      <Field label="Tipo de empleado">
                        <select
                          style={styles.input}
                          value={newEmployeeDraft.employmentType || "temporal"}
                          onChange={(e) =>
                            setNewEmployeeDraft({
                              ...newEmployeeDraft,
                              employmentType: e.target.value,
                            })
                          }
                        >
                          <option value="convenio">Convenio (por escala)</option>
                          <option value="temporal">Temporal (negro, por acuerdo)</option>
                        </select>
                      </Field>
                      {newEmployeeDraft.employmentType === "temporal" ? (
                        <Field label="Categoria">
                          <input style={styles.input} value="Temporal" readOnly />
                        </Field>
                      ) : (
                        <Field label="Categoria base">
                          <select
                            style={styles.input}
                            value={newEmployeeDraft.category}
                            onChange={(e) =>
                              setNewEmployeeDraft({
                                ...newEmployeeDraft,
                                category: e.target.value,
                              })
                            }
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
                          value={newEmployeeDraft.nominalHours}
                          onChange={(e) =>
                            setNewEmployeeDraft({
                              ...newEmployeeDraft,
                              nominalHours: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </TwoCol>
                    <div style={{ ...styles.muted, marginTop: 10 }}>
                      Con estos datos se crea el empleado. El resto se completa luego desde Abrir ficha.
                      {newEmployeeDraft.employmentType === "temporal"
                        ? " Temporal: no usa convenio; siempre en negro hasta efectivizar. El pago se carga como gasto de caja chica (de ahi sale el recibo)."
                        : ""}
                    </div>
                    {/* Configuracion base anterior retirada: el alta solo pide los cinco datos iniciales.
                <div style={{ ...styles.muted, marginBottom: 10 }}>
                  Los costos de EPP e insumos del personal se toman prioritariamente desde
                  Marcadores. Los campos de esta seccion quedan como respaldo por si todavia no
                  cargaste ese desglose.
                </div>
                <TwoCol>
                  <Field label="Categoria base">
                    <select
                      style={styles.input}
                      value={employeeBaseConfig.category}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, category: e.target.value })}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Antiguedad base">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.seniorityYears}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, seniorityYears: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Horas nominales">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.normalHoursDefault}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, normalHoursDefault: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Feriados / año (dias)">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.annualHolidayDays || 0}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, annualHolidayDays: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Vacaciones / año (dias)">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.annualVacationDays || 0}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, annualVacationDays: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Presentismo %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.presentismoPct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, presentismoPct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Antiguedad % anual">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.seniorityPctPerYear}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, seniorityPctPerYear: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Impacto empresa %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.employerContributionPct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, employerContributionPct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Seguro patronal %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.employerInsurancePct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, employerInsurancePct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Sindicato %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.unionPct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, unionPct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Seguro %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.insurancePct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, insurancePct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Aguinaldo (sueldos/año)">
                    <input
                      style={styles.input}
                      type="number"
                      step={0.01}
                      value={employeeBaseConfig.aguinaldoAnnualMonths}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, aguinaldoAnnualMonths: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="EPP cada 6 meses (respaldo)">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.eppSemiannualCost}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, eppSemiannualCost: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Insumos cada 6 meses (respaldo)">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.suppliesSemiannualCost}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, suppliesSemiannualCost: Number(e.target.value) })}
                    />
                  </Field>
                </TwoCol>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.label}>EPP e insumos base por empleado</div>
                  {employeeBaseConfig.provisionTemplates.map((item) => {
                    const stockItem = stockPersonalItems.find((stock) => stock.code === item.stockCode);
                    return (
                      <div key={item.id} style={styles.configDocRow}>
                        <select
                          style={styles.input}
                          value={item.stockCode}
                          onChange={(e) =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.map((template) =>
                                template.id === item.id
                                  ? {
                                      ...template,
                                      stockCode: e.target.value,
                                      kind:
                                        stockPersonalItems.find((stock) => stock.code === e.target.value)?.kind ||
                                        "Insumos",
                                    }
                                  : template
                              ),
                            }))
                          }
                        >
                          {stockPersonalItems.map((stock) => (
                            <option key={stock.code} value={stock.code}>
                              {stock.description}
                            </option>
                          ))}
                        </select>
                        <input
                          style={{ ...styles.input, maxWidth: 110 }}
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.map((template) =>
                                template.id === item.id
                                  ? { ...template, quantity: Number(e.target.value) }
                                  : template
                              ),
                            }))
                          }
                        />
                        <input
                          style={{ ...styles.input, maxWidth: 110 }}
                          type="number"
                          value={item.validityMonths}
                          onChange={(e) =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.map((template) =>
                                template.id === item.id
                                  ? { ...template, validityMonths: Number(e.target.value) }
                                  : template
                              ),
                            }))
                          }
                        />
                        <div style={{ minWidth: 120, fontSize: 12, color: "#475569" }}>
                          {stockItem ? money(stockItem.unitPrice) : "-"}
                        </div>
                        <button
                          style={styles.smallBtn}
                          onClick={() =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.filter(
                                (template) => template.id !== item.id
                              ),
                            }))
                          }
                        >
                          x
                        </button>
                      </div>
                    );
                  })}
                  <button
                    style={styles.smallBtn}
                    onClick={() =>
                      setEmployeeBaseConfig((prev) => ({
                        ...prev,
                        provisionTemplates: [
                          ...prev.provisionTemplates,
                          {
                            id: newId(),
                            stockCode: stockPersonalItems[0]?.code || "",
                            kind: stockPersonalItems[0]?.kind || "Insumos",
                            quantity: 1,
                            validityMonths: 6,
                          },
                        ],
                      }))
                    }
                  >
                    Agregar item base
                  </button>
                  <div style={{ ...styles.rightStrong, marginTop: 8 }}>
                    Provision mensual estimada por empleado:{" "}
                    {money(
                      baseProvisionTemplateRows.reduce(
                        (acc, item) => acc + Number(item.monthlyCostPerEmployee || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.label}>Documentacion requerida</div>
                  {employeeBaseConfig.requiredDocuments.map((doc) => (
                    <div key={doc.id} style={styles.configDocRow}>
                      <input
                        style={styles.input}
                        value={doc.name}
                        onChange={(e) =>
                          setEmployeeBaseConfig((prev) => ({
                            ...prev,
                            requiredDocuments: prev.requiredDocuments.map((item) =>
                              item.id === doc.id ? { ...item, name: e.target.value } : item
                            ),
                          }))
                        }
                      />
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setEmployeeBaseConfig((prev) => ({
                            ...prev,
                            requiredDocuments: prev.requiredDocuments.filter((item) => item.id !== doc.id),
                          }))
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    style={styles.smallBtn}
                    onClick={() =>
                      setEmployeeBaseConfig((prev) => ({
                        ...prev,
                        requiredDocuments: [
                          ...prev.requiredDocuments,
                          { id: newId(), name: "" },
                        ],
                      }))
                    }
                  >
                    Agregar documento
                  </button>
                </div>
                    */}
                  </Panel>
                </div>
              </div>
            )}

          <div style={{ order: 6, gridColumn: "1 / -1" }}>
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
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Categoria</th>
                      <th>Base hora</th>
                      <th>No remun./hora</th>
                      <th>VHT</th>
                      <th>Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaleRows
                      .slice()
                      .filter((r) => showOldScales || (r.month || "") >= vigenteFromMonth)
                      .sort((a, b) => `${a.month}-${a.category}`.localeCompare(`${b.month}-${b.category}`))
                      .map((row) => (
                        <tr key={row.id}>
                          <td>{monthLabel(row.month)}</td>
                          <td>
                            <select
                              style={styles.input}
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
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.baseHourly}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, baseHourly: Number(e.target.value) } : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.nonRemHourly}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, nonRemHourly: Number(e.target.value) } : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.vht}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, vht: Number(e.target.value) } : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td>{row.sourceFileName}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Panel>
          </div>

          <div style={{ order: 1, gridColumn: "1 / -1" }}>
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
              </div>
            }
          >
            <div style={styles.metricGrid}>
              {totalCompanyPayroll.map((row) => {
                const meta = getCompanyMeta(row.company);
                return (
                  <div key={row.company} style={{ ...styles.metric, borderColor: meta.primary, background: meta.soft }}>
                    <div style={{ fontWeight: 800, color: meta.primary }}>{row.label}</div>
                    <div style={styles.muted}>Total neto</div>
                    <div style={{ fontWeight: 700 }}>{money(row.totalNet)}</div>
                    <div style={{ ...styles.muted, marginTop: 6 }}>Impacto empresa</div>
                    <div style={{ fontWeight: 700 }}>{money(row.totalImpact)}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
          </div>

          {!selectedEmployee && (
            <div style={{ order: 2, gridColumn: "1 / -1" }}>
              <Panel
                title="Alta de empleado"
                span="full"
                actions={
                  <ButtonLike onClick={() => setIsEmployeeSetupModalOpen(true)}>
                    Agregar empleado
                  </ButtonLike>
                }
              >
                <div style={styles.muted}>
                  Carga rapida: empresa, legajo, nombre, categoria base y horas nominales. La
                  ficha completa se edita luego desde el boton Abrir.
                </div>
              </Panel>
            </div>
          )}

          {!selectedEmployee && (
          <div style={{ order: 3, gridColumn: "1 / -1" }}>
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
          <Panel title="Empleados" span="full">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Legajo</th>
                  <th>Nombre y apellido</th>
                  <th>Categoria base</th>
                  <th>Antig.</th>
                  <th>Asistencia</th>
                  <th>Documentacion</th>
                  {PERSONAL_PROVISION_KINDS.map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                  <th>Hs mes</th>
                  <th>Bruto</th>
                  <th>Neto</th>
                  <th>Imp. blanco</th>
                  <th>Imp. negro</th>
                  <th>Costo hora real</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {employeesSortedByPay.map((employee) => {
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
                    <tr key={employee.id} style={{ background: `${meta.soft}55` }}>
                      <td>
                        <span style={{ ...styles.statusPill, background: meta.soft, color: meta.primary }}>
                          {meta.short}
                        </span>
                      </td>
                      <td>{employee.legajo}</td>
                      <td>
                        {(() => {
                          const se = getEmployeeSemaphore(employee);
                          return (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={se.level} size={10} title={se.label} />
                              <span style={{ display: "inline-flex", flexDirection: "column" }}>
                                <span>{employee.name}</span>
                                <span style={{ ...styles.muted, fontSize: 11 }}>{se.label}</span>
                              </span>
                            </span>
                          );
                        })()}
                      </td>
                      <td>{employee.category}</td>
                      <td>{employee.seniorityYears}</td>
                      <td>
                        <span style={{ ...styles.statusPill, ...toneStyle }}>{att.label}</span>
                      </td>
                      <td>
                        <span style={{ ...styles.statusPill, ...docsStyle }}>{docs.label}</span>
                      </td>
                      {PERSONAL_PROVISION_KINDS.map((k) => {
                        const prov = getEmployeeProvisionSummary(employee, k);
                        const provStyle =
                          prov.tone === "green"
                            ? styles.statusGreen
                            : prov.tone === "yellow"
                            ? styles.statusYellow
                            : styles.statusRed;
                        return (
                          <td key={k}>
                            <span style={{ ...styles.statusPill, ...provStyle }}>{prov.label}</span>
                          </td>
                        );
                      })}
                      <td>{Number((payroll.normalHours + payroll.extra50Hours + payroll.extra100Hours).toFixed(2))}</td>
                      <td>{money(employee.employmentType === "temporal" ? Number(employee.agreedSalary || 0) : salary.totalGross)}</td>
                      <td>{money(employee.employmentType === "temporal" ? Number(employee.agreedSalary || 0) : salary.netWithCashBonus)}</td>
                      <td>{money(employee.employmentType === "temporal" ? 0 : salary.employerImpact)}</td>
                      <td>{money(Number(salary.blackImpact || 0))}</td>
                      <td>{money(salary.hourlyCost)}</td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {selectedEmployeeId === employee.id ? (
                          <button style={styles.smallBtn} onClick={() => setSelectedEmployeeId(null)}>
                            Cerrar
                          </button>
                        ) : (
                          <button style={styles.smallBtn} onClick={() => setSelectedEmployeeId(employee.id)}>
                            Abrir
                          </button>
                        )}
                        <button style={styles.smallBtn} onClick={() => removeEmployee(employee.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          </div>
          )}

          {selectedEmployee && (
            <div style={{ order: 3, gridColumn: "1 / -1" }}>
            <Panel
              span="full"
              title={`Ficha del empleado: ${selectedEmployee.name || "Empleado"}`}
              actions={<ButtonLike onClick={() => setSelectedEmployeeId(null)} secondary>Cerrar ficha</ButtonLike>}
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
                          {selectedEmployee.employmentType === "temporal" ? (
                            <Field label="Sueldo acordado (temporal, negro)">
                              <input
                                style={styles.input}
                                type="number"
                                value={selectedEmployee.agreedSalary ?? 0}
                                onChange={(e) =>
                                  updateEmployeeField(
                                    selectedEmployee.id,
                                    "agreedSalary",
                                    Number(e.target.value)
                                  )
                                }
                                placeholder="Monto acordado"
                              />
                            </Field>
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
                                const statusStyle =
                                  status === "presente"
                                    ? styles.statusGreen
                                    : status === "ausente_injustificado"
                                    ? styles.statusRed
                                    : status === "ausente_justificado"
                                    ? styles.statusYellow
                                    : status === "vacaciones"
                                    ? styles.statusBlue
                                    : styles.statusGray;
                                return (
                                  <div key={day.key} style={styles.attendanceCard}>
                                    <div style={styles.attendanceDayTitle}>
                                      <strong>{day.day}</strong> {day.weekday}
                                    </div>
                                    <select
                                      style={styles.input}
                                      value={status}
                                      onChange={(e) =>
                                        updateAttendanceRecord(selectedEmployee.id, day.key, "status", e.target.value)
                                      }
                                    >
                                      <option value="sin_cargar">Sin cargar</option>
                                      <option value="presente">Presente</option>
                                      <option value="ausente_injustificado">Ausente sin justificar</option>
                                      <option value="ausente_justificado">Ausente justificado</option>
                                      <option value="vacaciones">Vacaciones</option>
                                    </select>
                                    <div style={{ marginTop: 8 }}>
                                      <span style={{ ...styles.statusPill, ...statusStyle }}>
                                        {status.replaceAll("_", " ")}
                                      </span>
                                    </div>
                                    <div style={styles.attendanceHoursGrid}>
                                      <Field label="Normales">
                                        <input
                                          style={styles.input}
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          value={record?.normalHours ?? 0}
                                          onChange={(e) =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "normalHours",
                                              Number(e.target.value)
                                            )
                                          }
                                        />
                                      </Field>
                                      <Field label="50%">
                                        <input
                                          style={styles.input}
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          value={record?.extra50Hours ?? 0}
                                          onChange={(e) =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "extra50Hours",
                                              Number(e.target.value)
                                            )
                                          }
                                        />
                                      </Field>
                                      <Field label="100%">
                                        <input
                                          style={styles.input}
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          value={record?.extra100Hours ?? 0}
                                          onChange={(e) =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "extra100Hours",
                                              Number(e.target.value)
                                            )
                                          }
                                        />
                                      </Field>
                                    </div>

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
                            <Field label="Presentismo %">
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
                            <Field label="Anticipos">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.anticipos}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "anticipos",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Premios / Acuerdo (negro)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.cashBonus}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "cashBonus",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Adicional en blanco (con cargas)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.whiteBonus || 0}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "whiteBonus",
                                    Number(e.target.value)
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
