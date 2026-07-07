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
  // Dias/año no trabajados (feriados + vacaciones) para el costo-hora productivo. Opcionales:
  // si faltan, se toman 0 y el costo-hora se calcula sobre las horas nominales (como antes).
  annualHolidayDays?: number;
  annualVacationDays?: number;
};

// Dias laborables promedio por mes, para convertir dias no trabajados a horas.
const WORK_DAYS_PER_MONTH = 22;

export type PayrollSummaryInput = {
  seniorityYears: number;
  hourlyNetManual: number;
  hourlyGrossManual: number;
  payroll: EmployeePayroll;
  scale: PayrollScale;
  config: PayrollConfig;
  monthlyProvisionCost: number;
  // Empleado temporal: 100% negro, se paga por acuerdo (bruto negro puro, sin cargas ni descuentos).
  // Su sueldo acordado mensual entra al costo hora hombre (dinero de la empresa) como negro.
  isTemporal?: boolean;
  agreedSalary?: number;
};

export function computePayrollSummary({
  seniorityYears,
  hourlyNetManual,
  hourlyGrossManual,
  payroll,
  scale,
  config,
  monthlyProvisionCost,
  isTemporal,
  agreedSalary,
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
  // Premio BLANCO: remunerativo. Entra al bruto despues de antiguedad/presentismo (no los multiplica),
  // y por estar en grossRem paga descuentos de ley y genera cargas patronales y SAC.
  const whiteBonus = Number(payroll.whiteBonus || 0);
  const grossRem =
    grossNormal + grossHoliday + extra50 + extra100 + night50 + night + seniorityBonus + presentismo + whiteBonus;
  const totalGross = grossRem + nonRem;
  const jubilacion = grossRem * 0.11;
  const ley19032 = grossRem * 0.03;
  const obraSocial = grossRem * 0.03;
  const sindicato = grossRem * (config.unionPct / 100);
  const seguro = grossRem * (config.insurancePct / 100);
  const descuentos = jubilacion + ley19032 + obraSocial + sindicato + seguro;
  const cashBonus = Number(payroll.cashBonus || 0);
  // Costo NEGRO mensual = premio/acuerdo en negro (cashBonus) + para el temporal su sueldo acordado
  // (bruto negro puro, sin cargas ni descuentos). No genera cargas patronales ni SAC (es negro), pero
  // SI es dinero de la empresa: entra al costo hora hombre para cotizar el valor real.
  const agreedMonthly = isTemporal ? Number(agreedSalary || 0) : 0;
  const blackMonthly = cashBonus + agreedMonthly;
  const net = totalGross - descuentos - payroll.anticipos;
  const netWithCashBonus = net + cashBonus;
  const employerContrib = grossRem * ((payroll.employerExtraPct || 0) / 100);
  const employerInsurance = grossRem * ((config.employerInsurancePct || 0) / 100);
  const annualSACBase = totalGross * (config.aguinaldoAnnualMonths || 0);
  const annualSACCharges =
    annualSACBase *
    (((payroll.employerExtraPct || 0) + (config.employerInsurancePct || 0)) / 100);
  const annualCompanyCost =
    12 *
      (totalGross + employerContrib + employerInsurance + monthlyProvisionCost + blackMonthly) +
    annualSACBase +
    annualSACCharges;
  const annualBaseHours = (config.normalHoursDefault || 198) * 12;
  const monthlySACProration = (annualSACBase + annualSACCharges) / 12;
  // Impacto BLANCO mensual (vista separada por administracion): bruto + cargas + provisiones + SAC.
  const employerImpact =
    totalGross +
    employerContrib +
    employerInsurance +
    monthlyProvisionCost +
    monthlySACProration;
  // Impacto TOTAL mensual (blanco + negro): lo real que le cuesta el empleado a la empresa.
  const totalMonthlyImpact = employerImpact + blackMonthly;
  // Horas PRODUCTIVAS = nominales anuales − dias no trabajados (feriados+vacaciones) en horas.
  // El costo-hora se reparte sobre lo realmente trabajado. Si no hay dias cargados, == nominales.
  const dailyHours = (config.normalHoursDefault || 198) / WORK_DAYS_PER_MONTH;
  const nonProductiveDays =
    Number(config.annualHolidayDays || 0) + Number(config.annualVacationDays || 0);
  const productiveAnnualHours = Math.max(1, annualBaseHours - nonProductiveDays * dailyHours);
  const hourlyCost = annualBaseHours > 0 ? annualCompanyCost / productiveAnnualHours : 0;
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
    whiteBonus,
    blackMonthly,
    netWithCashBonus,
    employerImpact,
    totalMonthlyImpact,
    productiveAnnualHours,
    hourlyCost,
    netHourly,
  };
}
