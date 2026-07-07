import { computePayrollSummary, PayrollConfig } from "./payroll";
import type { EmployeePayroll } from "./types";

const config: PayrollConfig = {
  seniorityPctPerYear: 1,
  unionPct: 3,
  insurancePct: 0,
  employerInsurancePct: 0,
  aguinaldoAnnualMonths: 1,
  normalHoursDefault: 200,
};

const basePayroll: EmployeePayroll = {
  month: "2026-06",
  normalHours: 200,
  holidayHours: 0,
  extra50Hours: 0,
  extra100Hours: 0,
  night50Hours: 0,
  nightHours: 0,
  unjustifiedAbsenceHours: 0,
  justifiedAbsenceHours: 0,
  vacationsDays: 0,
  anticipos: 0,
  cashBonus: 0,
  presentismoPctOverride: 0,
  employerExtraPct: 0,
  manualOverride: false,
  savedAt: "",
  notes: "",
};

const run = (over: Partial<EmployeePayroll> = {}, extra: Partial<Parameters<typeof computePayrollSummary>[0]> = {}) =>
  computePayrollSummary({
    seniorityYears: 0,
    hourlyNetManual: 0,
    hourlyGrossManual: 0,
    payroll: { ...basePayroll, ...over },
    scale: { baseHourly: 1000, vht: 1000, nonRemHourly: 0 },
    config,
    monthlyProvisionCost: 0,
    ...extra,
  });

describe("computePayrollSummary", () => {
  it("bruto normal = valor hora x horas", () => {
    expect(run().grossNormal).toBe(200000);
    expect(run().totalGross).toBe(200000);
  });

  it("descuentos de ley (jubilacion 11 + ley19032 3 + obra social 3 + sindicato 3 = 20%)", () => {
    const r = run();
    expect(r.descuentos).toBeCloseTo(40000); // 20% de 200000
    expect(r.net).toBeCloseTo(160000);
  });

  it("hora extra al 50% multiplica x1.5", () => {
    expect(run({ extra50Hours: 10 }).grossRem).toBeCloseTo(200000 + 15000);
  });

  it("antiguedad suma % por año sobre el bruto remunerativo base", () => {
    expect(run({}, { seniorityYears: 5 }).seniorityBonus).toBeCloseTo(10000); // 5% de 200000
  });

  it("presentismo se pierde con ausencia injustificada", () => {
    expect(run({ presentismoPctOverride: 10 }).presentismo).toBeCloseTo(20000);
    expect(run({ presentismoPctOverride: 10, unjustifiedAbsenceHours: 1 }).presentismo).toBe(0);
  });

  it("anticipos se restan del neto", () => {
    expect(run({ anticipos: 50000 }).net).toBeCloseTo(110000);
  });

  it("premio NEGRO se suma al neto sin cargas", () => {
    const r = run({ cashBonus: 10000 });
    expect(r.descuentos).toBeCloseTo(40000); // bruto sin cambios
    expect(r.netWithCashBonus).toBeCloseTo(160000 + 10000); // entero al neto
  });

  it("premio BLANCO entra al bruto y paga cargas (neto sube menos que el premio)", () => {
    const r = run({ whiteBonus: 10000 });
    expect(r.grossRem).toBeCloseTo(210000);
    expect(r.descuentos).toBeCloseTo(42000); // 20% de 210000
    expect(r.net).toBeCloseTo(168000); // 160000 + 8000 (neto del premio tras cargas)
    expect(r.whiteBonus).toBe(10000);
  });

  it("hora neta = neto / horas pagables", () => {
    expect(run().netHourly).toBeCloseTo(800); // 160000 / 200
  });

  it("valor hora manual pisa el calculo de hora neta", () => {
    expect(run({}, { hourlyNetManual: 1234 }).netHourly).toBe(1234);
  });

  it("costo hora cargado considera SAC y costo anual", () => {
    // annualSAC=200000, annualCost=12*200000+200000=2600000, baseHours=2400 -> 1083.33
    expect(run().hourlyCost).toBeCloseTo(2600000 / 2400);
  });

  it("sin feriados/vacaciones, las horas productivas = nominales (sin regresion)", () => {
    expect(run().productiveAnnualHours).toBe(2400);
    expect(run().hourlyCost).toBeCloseTo(2600000 / 2400);
  });

  it("costo-hora sobre horas PRODUCTIVAS: descuenta feriados + vacaciones", () => {
    const r = run({}, { config: { ...config, annualHolidayDays: 10, annualVacationDays: 14 } });
    const daily = 200 / 22;
    const productive = 2400 - 24 * daily;
    expect(r.productiveAnnualHours).toBeCloseTo(productive);
    expect(r.hourlyCost).toBeCloseTo(2600000 / productive);
    expect(r.hourlyCost).toBeGreaterThan(2600000 / 2400); // mas caro por hora
  });

  it("premio/acuerdo NEGRO (cashBonus) sube el costo hora (dinero de la empresa para cotizar)", () => {
    const r = run({ cashBonus: 50000 });
    expect(r.blackMonthly).toBe(50000);
    // annualCost sube 12*50000=600000 -> 3200000/2400
    expect(r.hourlyCost).toBeCloseTo(3200000 / 2400);
    // el impacto blanco NO incluye el negro (vista separada)
    expect(r.employerImpact).toBeCloseTo(run().employerImpact);
    expect(r.totalMonthlyImpact).toBeCloseTo(r.employerImpact + 50000);
  });

  it("temporal: el sueldo acordado entra como negro puro al costo hora", () => {
    const r = run({}, { isTemporal: true, agreedSalary: 300000 });
    expect(r.blackMonthly).toBe(300000);
    expect(r.hourlyCost).toBeCloseTo((2600000 + 12 * 300000) / 2400);
  });

  it("agreedSalary sin isTemporal no impacta (solo aplica al temporal)", () => {
    expect(run({}, { agreedSalary: 300000 }).blackMonthly).toBe(0);
  });
});
