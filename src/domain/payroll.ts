import type { EmployeePayroll } from "./types";

// Calculo puro de la liquidacion de un empleado para un mes dado. A partir de la escala
// (valores hora), la configuracion de la empresa y las horas/novedades del mes, deriva: bruto
// remunerativo y no remunerativo, antiguedad, presentismo, descuentos de ley, contribuciones
// patronales, costo hora cargado y neto. Sin estado: la escala, la config y el costo de
// provisiones se resuelven afuera y se pasan como input.

export type PayrollScale = {
  baseHourly?: number;
  vht?: number;
  nonRemHourly?: number;
} | null | undefined;

export type PayrollConfig = {
  seniorityPctPerYear: number;
  unionPct: number;
  insurancePct: number;
  employerInsurancePct: number;
  aguinaldoAnnualMonths: number;
  normalHoursDefault: number;
};

export type PayrollSummaryInput = {
  seniorityYears: number;
  hourlyNetManual: number;
  hourlyGrossManual: number;
  payroll: EmployeePayroll;
  scale: PayrollScale;
  config: PayrollConfig;
  monthlyProvisionCost: number;
};

export function computePayrollSummary({
  seniorityYears,
  hourlyNetManual,
  hourlyGrossManual,
  payroll,
  scale,
  config,
  monthlyProvisionCost,
}: PayrollSummaryInput) {
  const baseHourly = hourlyGrossManual || scale?.baseHourly || scale?.vht || 0;
  const nonRemHourly = Math.max(0, scale?.nonRemHourly || 0);
  const grossReference = hourlyGrossManual || scale?.vht || baseHourly;
  const payableHours =
    payroll.normalHours +
    payroll.holidayHours +
    payroll.justifiedAbsenceHours -
    payroll.unjustifiedAbsenceHours;

  const grossNormal = baseHourly * payroll.normalHours;
  const grossHoliday = baseHourly * payroll.holidayHours;
  const extra50 = baseHourly * 1.5 * payroll.extra50Hours;
  const extra100 = baseHourly * 2 * payroll.extra100Hours;
  const night50 = baseHourly * 1.5 * 1.133333333 * payroll.night50Hours;
  const night = baseHourly * 1.133333333 * payroll.nightHours;
  const seniorityBonus =
    (grossNormal + grossHoliday + extra50 + extra100 + night50 + night) *
    ((config.seniorityPctPerYear * seniorityYears) / 100);
  const presentismoPct =
    payroll.presentismoPctOverride === null ? 0 : payroll.presentismoPctOverride;
  const presentismo =
    payroll.unjustifiedAbsenceHours > 0 ? 0 : grossNormal * (presentismoPct / 100);
  const nonRem = nonRemHourly * Math.max(payableHours, 0);
  const grossRem =
    grossNormal + grossHoliday + extra50 + extra100 + night50 + night + seniorityBonus + presentismo;
  const totalGross = grossRem + nonRem;
  const jubilacion = grossRem * 0.11;
  const ley19032 = grossRem * 0.03;
  const obraSocial = grossRem * 0.03;
  const sindicato = grossRem * (config.unionPct / 100);
  const seguro = grossRem * (config.insurancePct / 100);
  const descuentos = jubilacion + ley19032 + obraSocial + sindicato + seguro;
  const cashBonus = Number(payroll.cashBonus || 0);
  const net = totalGross - descuentos - payroll.anticipos;
  const netWithCashBonus = net + cashBonus;
  const employerContrib = grossRem * ((payroll.employerExtraPct || 0) / 100);
  const employerInsurance = grossRem * ((config.employerInsurancePct || 0) / 100);
  const annualSACBase = totalGross * (config.aguinaldoAnnualMonths || 0);
  const annualSACCharges =
    annualSACBase *
    (((payroll.employerExtraPct || 0) + (config.employerInsurancePct || 0)) / 100);
  const annualCompanyCost =
    12 * (totalGross + employerContrib + employerInsurance + monthlyProvisionCost) +
    annualSACBase +
    annualSACCharges;
  const annualBaseHours = (config.normalHoursDefault || 198) * 12;
  const monthlySACProration = (annualSACBase + annualSACCharges) / 12;
  const employerImpact =
    totalGross +
    employerContrib +
    employerInsurance +
    monthlyProvisionCost +
    monthlySACProration;
  const hourlyCost = annualBaseHours > 0 ? annualCompanyCost / annualBaseHours : 0;
  const netHourly = hourlyNetManual || Math.max(net / Math.max(payableHours || 1, 1), 0);

  return {
    scale,
    baseHourly,
    grossReference,
    nonRemHourly,
    grossNormal,
    grossRem,
    totalGross,
    nonRem,
    seniorityBonus,
    presentismo,
    employerContrib,
    employerInsurance,
    monthlyProvisionCost,
    annualSACBase,
    monthlySACProration,
    descuentos,
    net,
    cashBonus,
    netWithCashBonus,
    employerImpact,
    hourlyCost,
    netHourly,
  };
}
