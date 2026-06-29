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
});
