import type { EmployeePayroll } from "./types";

// Calculo puro de la liquidacion de un empleado para un mes dado. A partir de la escala
// (valores hora), la configuracion de la empresa y las horas/novedades del mes, deriva: bruto
// remunerativo y no remunerativo, antiguedad, presentismo, descuentos de ley, contribuciones
// patronales, costo hora cargado y neto. Sin estado: la escala, la config y el costo de
// provisiones se resuelven afuera y se pasan como input.

// SOCIO / SOCIO GERENTE. Un socio fuera de convenio no se liquida por horas: cobra su sueldo
// acordado completo, venga o no a fichar. Se reconoce por la categoria, que en fuera de convenio es
// texto libre, asi que el match es tolerante (sin acentos, sin mayusculas, singular o plural).
const normalizeCategory = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z]+/g, " ")
    .trim();

export function isPartnerCategory(category: string): boolean {
  const c = normalizeCategory(category);
  if (!c) return false;
  return /^socios?( gerentes?)?$/.test(c) || /^gerente socios?$/.test(c);
}

// Plata en NEGRO que cobra el empleado en el mes: el premio/acuerdo en efectivo (cashBonus), el
// sueldo del temporal y la parte negra del fuera de convenio. Sale como funcion aparte para que el
// Calendario anual pueda mostrar los haberes en negro sin recalcular toda la liquidacion (y para que
// la regla viva en un solo lugar: computePayrollSummary usa esta misma).
export function monthlyBlackPay({
  cashBonus,
  isTemporal,
  agreedSalary,
  isFueraConvenio,
  agreedBlack,
}: {
  cashBonus?: number;
  isTemporal?: boolean;
  agreedSalary?: number;
  isFueraConvenio?: boolean;
  agreedBlack?: number;
}): number {
  return (
    Number(cashBonus || 0) +
    (isTemporal ? Number(agreedSalary || 0) : 0) +
    (isFueraConvenio ? Number(agreedBlack || 0) : 0)
  );
}

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
  // Desglose real de contribuciones patronales. Si están, mandan sobre el % lumpeado (employerExtraPct).
  employerJubilacionPct?: number;
  employerObraSocialPct?: number;
  employerArtPct?: number;
  // Cuota FIJA por empleado del fondo fiduciario de la ART, ademas del porcentaje.
  employerArtFondoFiduciario?: number;
  // Importe fijo por empleado que se detrae de la base de la contribucion jubilatoria (ley 27.430).
  detraccionLey27430?: number;
  employerLifeInsuranceFixed?: number;
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
  // Empleado FUERA DE CONVENIO: sueldo acordado repartido en blanco y negro. El blanco puede calcular
  // cargas (registrado) o entrar tal cual (acordado); el negro entra flat, como el temporal.
  isFueraConvenio?: boolean;
  agreedWhite?: number;
  agreedBlack?: number;
  computeWhiteCharges?: boolean;
  // Socio / socio gerente (solo aplica junto con isFueraConvenio): cobra el acordado COMPLETO, sin
  // liquidar horas. Ver isPartnerCategory.
  isPartner?: boolean;
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
  isFueraConvenio,
  agreedWhite,
  agreedBlack,
  computeWhiteCharges,
  isPartner,
}: PayrollSummaryInput) {
  const baseHourly = hourlyGrossManual || scale?.baseHourly || scale?.vht || 0;
  const nonRemHourly = Math.max(0, scale?.nonRemHourly || 0);
  const grossReference = hourlyGrossManual || scale?.vht || baseHourly;
  const payableHours =
    payroll.normalHours +
    payroll.holidayHours +
    payroll.justifiedAbsenceHours -
    payroll.unjustifiedAbsenceHours;

  // Socio/socio gerente fuera de convenio: NO se liquida por horas. Se apagan todos los conceptos
  // que salen de la escala y del reloj (bruto por hora, extras, nocturnidad, antiguedad, presentismo,
  // no remunerativo). Lo unico que cobra es el sueldo acordado, entero. Si su categoria llegara a
  // coincidir con una fila de escala, esa escala tampoco se le aplica.
  const partnerFlat = !!isFueraConvenio && !!isPartner;
  const hourWeight = partnerFlat ? 0 : 1;
  const grossNormal = baseHourly * payroll.normalHours * hourWeight;
  const grossHoliday = baseHourly * payroll.holidayHours * hourWeight;
  const extra50 = baseHourly * 1.5 * payroll.extra50Hours * hourWeight;
  const extra100 = baseHourly * 2 * payroll.extra100Hours * hourWeight;
  const night50 = baseHourly * 1.5 * 1.133333333 * payroll.night50Hours * hourWeight;
  const night = baseHourly * 1.133333333 * payroll.nightHours * hourWeight;
  const seniorityBonus =
    (grossNormal + grossHoliday + extra50 + extra100 + night50 + night) *
    ((config.seniorityPctPerYear * seniorityYears) / 100);
  // PRESENTISMO. Dos cosas distintas: cuanto REPRESENTA (10%) y cuanto COBRA este mes segun su
  // asistencia. La segunda sale de las tardes y ausencias (criterio de Nicolas, 2026-08-31:
  // 1 tarde 75%, 2 tardes 50%, 3 lo pierde; 1 ausente 50%, 2 lo pierde) o se pone a mano.
  //
  // Reemplaza a la regla vieja de "cualquier hora de ausencia injustificada -> 0": esa castigaba de
  // golpe y no distinguia una llegada tarde de una falta.
  const presentismoPct =
    payroll.presentismoPctOverride === null ? 0 : payroll.presentismoPctOverride;
  const asistenciaPct =
    payroll.presentismoAsistenciaPct === null || payroll.presentismoAsistenciaPct === undefined
      ? 100
      : Math.min(100, Math.max(0, Number(payroll.presentismoAsistenciaPct)));
  const presentismo = grossNormal * (presentismoPct / 100) * (asistenciaPct / 100);
  const nonRem = nonRemHourly * Math.max(payableHours, 0) * hourWeight;
  // Premio BLANCO: remunerativo. Entra al bruto despues de antiguedad/presentismo (no los multiplica),
  // y por estar en grossRem paga descuentos de ley y genera cargas patronales y SAC.
  const whiteBonus = Number(payroll.whiteBonus || 0);
  // Fuera de convenio: sueldo blanco acordado. Con cargas => entra al bruto remunerativo (paga
  // descuentos de ley y genera cargas patronales); sin cargas => se suma "tal cual" al neto e impacto
  // blanco, sin descuentos (más abajo, como flatAgreedWhite).
  const chargedAgreedWhite = isFueraConvenio && computeWhiteCharges ? Number(agreedWhite || 0) : 0;
  const flatAgreedWhite = isFueraConvenio && !computeWhiteCharges ? Number(agreedWhite || 0) : 0;
  const grossRem =
    grossNormal + grossHoliday + extra50 + extra100 + night50 + night + seniorityBonus + presentismo + whiteBonus + chargedAgreedWhite;
  const totalGross = grossRem + nonRem;
  const jubilacion = grossRem * 0.11;
  const ley19032 = grossRem * 0.03;
  const obraSocial = grossRem * 0.03;
  const sindicato = grossRem * (config.unionPct / 100);
  const seguro = grossRem * (config.insurancePct / 100);
  const descuentos = jubilacion + ley19032 + obraSocial + sindicato + seguro;
  const cashBonus = Number(payroll.cashBonus || 0);
  // Costo NEGRO mensual = premio/acuerdo en negro (cashBonus, mensual) + para el temporal su sueldo
  // acordado + para el fuera de convenio su parte en negro (bruto negro puro, sin cargas ni descuentos).
  // Es dinero de la empresa: entra al costo hora hombre para cotizar el valor real.
  const agreedMonthly = isTemporal ? Number(agreedSalary || 0) : 0;
  const fueraBlack = isFueraConvenio ? Number(agreedBlack || 0) : 0;
  const blackMonthly = monthlyBlackPay({ cashBonus, isTemporal, agreedSalary, isFueraConvenio, agreedBlack });
  // El blanco "tal cual" (sin cargas) se recibe entero y cuesta entero, sin descuentos de ley.
  const net = totalGross - descuentos - payroll.anticipos + flatAgreedWhite;
  const netWithCashBonus = net + cashBonus;
  // Contribuciones patronales: si hay desglose real (jubilación/OO.SS/ART), manda; si no, el % lumpeado
  // por mes (employerExtraPct). El seguro de vida es un monto FIJO (no escala con SAC).
  const hasEmployerBreakdown =
    config.employerJubilacionPct != null ||
    config.employerObraSocialPct != null ||
    config.employerArtPct != null;
  const employerContribPct = hasEmployerBreakdown
    ? Number(config.employerJubilacionPct || 0) +
      Number(config.employerObraSocialPct || 0) +
      Number(config.employerArtPct || 0)
    : Number(payroll.employerExtraPct || 0);
  // Las tres contribuciones NO van sobre la misma base, y eso importa:
  //
  //  - JUBILACION: sobre el remunerativo MENOS la detraccion de la ley 27.430 (importe fijo por
  //    empleado). No se detrae cuando se liquida SAC.
  //  - OBRA SOCIAL: sobre el remunerativo, sin detraccion.
  //  - ART: sobre el BRUTO (remunerativo + no remunerativo), y ademas lleva la cuota FIJA del fondo
  //    fiduciario. Con el porcentaje solo, el ART del recibo no cierra.
  const detraccion = payroll.liquidaSAC ? 0 : Number(config.detraccionLey27430 || 0);
  const baseJubilacion = Math.max(0, grossRem - detraccion);
  const employerJubilacion = baseJubilacion * (Number(config.employerJubilacionPct || 0) / 100);
  const employerObraSocial = grossRem * (Number(config.employerObraSocialPct || 0) / 100);
  const employerArt =
    totalGross * (Number(config.employerArtPct || 0) / 100) +
    Number(config.employerArtFondoFiduciario || 0);
  const employerLifeInsurance = hasEmployerBreakdown ? Number(config.employerLifeInsuranceFixed || 0) : 0;
  const employerContrib = grossRem * (employerContribPct / 100);
  const employerInsurance = hasEmployerBreakdown
    ? employerLifeInsurance
    : grossRem * ((config.employerInsurancePct || 0) / 100);
  const annualSACBase = totalGross * (config.aguinaldoAnnualMonths || 0);
  const annualSACCharges =
    annualSACBase *
    ((employerContribPct + (hasEmployerBreakdown ? 0 : Number(config.employerInsurancePct || 0))) / 100);
  // Aguinaldo NEGRO: mismo criterio que el blanco (bruto x meses de aguinaldo) pero SIN cargas y todo
  // dentro del circuito negro. Solo aguinaldo (el negro no genera contribuciones ni descuentos de ley).
  const annualBlackSAC = blackMonthly * (config.aguinaldoAnnualMonths || 0);
  const annualCompanyCost =
    12 * (totalGross + employerContrib + employerInsurance + monthlyProvisionCost) +
    annualSACBase +
    annualSACCharges +
    12 * blackMonthly +
    annualBlackSAC;
  const annualBaseHours = (config.normalHoursDefault || 198) * 12;
  const monthlySACProration = (annualSACBase + annualSACCharges) / 12;
  const blackSACProration = annualBlackSAC / 12;
  // Desglose del impacto BLANCO en sus tres patas, para el resumen por empresa:
  //   salarios (lo que cobra la persona, incluido el prorrateo del aguinaldo)
  // + cargas sociales (contribuciones patronales + seguro + las cargas del aguinaldo)
  // + provisiones (EPP, insumos, examenes, capacitaciones).
  // La identidad salaryImpactWhite + employerChargesMonthly + monthlyProvisionCost === employerImpact
  // se mantiene exacta: el prorrateo del SAC se parte en su base (salario) y sus cargas.
  const monthlySACBaseProration = annualSACBase / 12;
  const monthlySACChargesProration = monthlySACProration - monthlySACBaseProration;
  const salaryImpactWhite = totalGross + flatAgreedWhite + monthlySACBaseProration;
  const employerChargesMonthly = employerContrib + employerInsurance + monthlySACChargesProration;
  // Impacto BLANCO mensual (vista separada por administracion): bruto + cargas + provisiones + SAC.
  const employerImpact = salaryImpactWhite + employerChargesMonthly + monthlyProvisionCost;
  // Impacto NEGRO mensual (vista separada): premio/acuerdo + prorrateo del aguinaldo negro.
  const blackImpact = blackMonthly + blackSACProration;
  // Impacto TOTAL mensual (blanco + negro): lo real que le cuesta el empleado a la empresa.
  const totalMonthlyImpact = employerImpact + blackImpact;
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
    grossHoliday,
    // Los importes de cada tipo de hora y el detalle de descuentos salen ACA y no se recalculan en el
    // recibo: el recibo los repetia por su cuenta, que es como se termina imprimiendo un numero que
    // no coincide con el que liquido.
    extra50,
    extra100,
    night50,
    night,
    jubilacion,
    ley19032,
    obraSocial,
    sindicato,
    seguro,
    grossRem,
    totalGross,
    nonRem,
    seniorityBonus,
    presentismo,
    employerContrib,
    employerInsurance,
    employerContribPct,
    employerJubilacion,
    employerObraSocial,
    employerArt,
    employerLifeInsurance,
    monthlyProvisionCost,
    annualSACBase,
    annualSACCharges,
    monthlySACProration,
    monthlySACBaseProration,
    monthlySACChargesProration,
    salaryImpactWhite,
    employerChargesMonthly,
    descuentos,
    net,
    cashBonus,
    whiteBonus,
    blackMonthly,
    annualBlackSAC,
    blackSACProration,
    blackImpact,
    netWithCashBonus,
    employerImpact,
    totalMonthlyImpact,
    productiveAnnualHours,
    annualBaseHours,
    hourlyCost,
    netHourly,
    partnerFlat,
  };
}
