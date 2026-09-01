import { computePayrollSummary, isPartnerCategory, PayrollConfig } from "./payroll";
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

  // PRESENTISMO (criterio de Nicolas, 2026-08-31): son DOS cosas. Cuanto REPRESENTA (10%) y cuanto
  // COBRA este mes segun su asistencia. Reemplaza a la regla vieja de "cualquier hora de ausencia
  // injustificada lo borra", que castigaba igual una llegada tarde que una falta.
  it("presentismo entero cuando la asistencia esta limpia", () => {
    expect(run({ presentismoPctOverride: 10 }).presentismo).toBeCloseTo(20000);
    expect(run({ presentismoPctOverride: 10, presentismoAsistenciaPct: 100 }).presentismo).toBeCloseTo(20000);
  });

  it("la asistencia lo recorta por partes, no de golpe", () => {
    // 1 tarde -> 75%, 2 tardes o 1 ausente -> 50%, 3 tardes o 2 ausentes -> 0.
    expect(run({ presentismoPctOverride: 10, presentismoAsistenciaPct: 75 }).presentismo).toBeCloseTo(15000);
    expect(run({ presentismoPctOverride: 10, presentismoAsistenciaPct: 50 }).presentismo).toBeCloseTo(10000);
    expect(run({ presentismoPctOverride: 10, presentismoAsistenciaPct: 0 }).presentismo).toBe(0);
  });

  it("las horas de ausencia injustificada ya no borran el presentismo por si solas", () => {
    // Ahora lo decide el porcentaje de asistencia, que es lo que se ve y se puede corregir a mano.
    expect(
      run({ presentismoPctOverride: 10, unjustifiedAbsenceHours: 1, presentismoAsistenciaPct: 50 }).presentismo
    ).toBeCloseTo(10000);
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
    // aguinaldo negro = 50000 x 1 mes; annualCost sube 12*50000 + 50000 = 650000 -> 3250000/2400
    expect(r.annualBlackSAC).toBe(50000);
    expect(r.hourlyCost).toBeCloseTo(3250000 / 2400);
    // el impacto blanco NO incluye el negro (vista separada)
    expect(r.employerImpact).toBeCloseTo(run().employerImpact);
    // impacto negro = premio + prorrateo del aguinaldo negro (50000/12)
    expect(r.blackImpact).toBeCloseTo(50000 + 50000 / 12);
    expect(r.totalMonthlyImpact).toBeCloseTo(r.employerImpact + r.blackImpact);
  });

  it("el negro genera aguinaldo NEGRO (solo aguinaldo, sin otras cargas)", () => {
    const sinAguinaldo = run({ cashBonus: 50000 }, { config: { ...config, aguinaldoAnnualMonths: 0 } });
    expect(sinAguinaldo.annualBlackSAC).toBe(0);
    const conAguinaldo = run({ cashBonus: 50000 }); // aguinaldoAnnualMonths: 1
    expect(conAguinaldo.annualBlackSAC).toBe(50000);
  });

  it("temporal: el sueldo acordado entra como negro puro al costo hora + aguinaldo negro", () => {
    const r = run({}, { isTemporal: true, agreedSalary: 300000 });
    expect(r.blackMonthly).toBe(300000);
    expect(r.annualBlackSAC).toBe(300000); // 300000 x 1 mes de aguinaldo
    expect(r.hourlyCost).toBeCloseTo((2600000 + 12 * 300000 + 300000) / 2400);
  });

  it("agreedSalary sin isTemporal no impacta (solo aplica al temporal)", () => {
    expect(run({}, { agreedSalary: 300000 }).blackMonthly).toBe(0);
  });
});

describe("contribuciones patronales desglosadas", () => {
  it("con desglose: employerContrib = (jub+OS+ART)% y seguro fijo", () => {
    const r = run(
      {},
      {
        config: {
          ...config,
          employerJubilacionPct: 18,
          employerObraSocialPct: 6,
          employerArtPct: 11.38,
          employerLifeInsuranceFixed: 424.62,
        },
      }
    );
    // grossRem = 200000 (bruto normal), 35.38% => 70760
    expect(r.employerContribPct).toBeCloseTo(35.38);
    expect(r.employerContrib).toBeCloseTo(200000 * 0.3538);
    expect(r.employerJubilacion).toBeCloseTo(36000);
    expect(r.employerObraSocial).toBeCloseTo(12000);
    expect(r.employerArt).toBeCloseTo(22760);
    expect(r.employerInsurance).toBeCloseTo(424.62); // seguro fijo, no %
  });
});

describe("fuera de convenio", () => {
  it("flat (sin cargas): el blanco entra tal cual y el negro flat", () => {
    const r = run(
      { normalHours: 0 },
      { isFueraConvenio: true, agreedWhite: 800000, agreedBlack: 400000, computeWhiteCharges: false }
    );
    expect(r.totalGross).toBe(0);
    expect(r.descuentos).toBe(0);
    expect(r.net).toBe(800000); // recibe el blanco entero
    expect(r.employerImpact).toBeCloseTo(800000); // cuesta el blanco entero, sin cargas
    expect(r.blackMonthly).toBe(400000);
    expect(r.blackImpact).toBeCloseTo(400000 + 400000 / 12); // + prorrateo aguinaldo negro
  });

  it("con cargas: el blanco paga descuentos de ley y prorratea SAC", () => {
    const r = run(
      { normalHours: 0 },
      { isFueraConvenio: true, agreedWhite: 800000, computeWhiteCharges: true }
    );
    expect(r.totalGross).toBe(800000);
    expect(r.descuentos).toBeCloseTo(160000); // 20%
    expect(r.net).toBeCloseTo(640000);
    expect(r.employerImpact).toBeCloseTo(800000 + 800000 / 12); // bruto + prorrateo SAC (cargas 0 en este config)
  });
});

// El resumen por empresa de la solapa Personal abre el impacto blanco en salarios + cargas sociales +
// provisiones (EPP/examenes/capacitaciones). El desglose tiene que sumar EXACTO el impacto: si no,
// los tres numeros que ve el usuario no cierran contra el total.
describe("desglose del impacto blanco", () => {
  it("salarios + cargas sociales + provisiones === impacto blanco", () => {
    const r = run(
      { employerExtraPct: 25 },
      {
        monthlyProvisionCost: 15000,
        config: { ...config, employerInsurancePct: 2 },
      } as any
    );
    expect(r.salaryImpactWhite + r.employerChargesMonthly + r.monthlyProvisionCost).toBeCloseTo(
      r.employerImpact
    );
  });

  it("los salarios llevan la base del aguinaldo y las cargas su parte de cargas", () => {
    const r = run({ employerExtraPct: 25 });
    expect(r.salaryImpactWhite).toBeCloseTo(r.totalGross + r.annualSACBase / 12);
    expect(r.employerChargesMonthly).toBeCloseTo(
      r.employerContrib + r.employerInsurance + r.annualSACCharges / 12
    );
  });

  it("sin cargas ni provisiones, el impacto es todo salario", () => {
    const r = run();
    expect(r.employerChargesMonthly).toBeCloseTo(0);
    expect(r.salaryImpactWhite).toBeCloseTo(r.employerImpact);
  });
});

// Un socio no ficha: cobra su acuerdo completo. Si se liquidara por horas, un mes con pocas horas
// cargadas (o sin cargar) le bajaria el sueldo solo, que es justo lo que no tiene que pasar.
describe("socio / socio gerente", () => {
  it("reconoce la categoria escrita de cualquier forma", () => {
    ["Socio", "socio", "SOCIO GERENTE", "Socio gerente", "socios", "Socio Gerentes"].forEach((c) =>
      expect(isPartnerCategory(c)).toBe(true)
    );
    ["", "Oficial general", "Administracion", "Gerente", "Asociado", "Socio fundador"].forEach((c) =>
      expect(isPartnerCategory(c)).toBe(false)
    );
  });

  it("cobra el acordado completo aunque no tenga horas cargadas", () => {
    const r = run(
      { normalHours: 0 },
      { isFueraConvenio: true, isPartner: true, agreedWhite: 900000, agreedBlack: 600000, computeWhiteCharges: false }
    );
    expect(r.net).toBe(900000);
    expect(r.blackMonthly).toBe(600000);
  });

  it("las horas no le cambian el sueldo: 0 hs y 200 hs liquidan igual", () => {
    const opts = { isFueraConvenio: true, isPartner: true, agreedWhite: 900000, agreedBlack: 600000, computeWhiteCharges: false };
    const sinHoras = run({ normalHours: 0 }, opts);
    const conHoras = run({ normalHours: 200, extra50Hours: 20 }, opts);
    expect(conHoras.net).toBeCloseTo(sinHoras.net);
    expect(conHoras.employerImpact).toBeCloseTo(sinHoras.employerImpact);
    expect(conHoras.blackImpact).toBeCloseTo(sinHoras.blackImpact);
  });

  it("una ausencia injustificada no le descuenta nada", () => {
    const opts = { isFueraConvenio: true, isPartner: true, agreedWhite: 900000, computeWhiteCharges: false };
    const presente = run({ normalHours: 200 }, opts);
    const ausente = run({ normalHours: 200, unjustifiedAbsenceHours: 40 }, opts);
    expect(ausente.net).toBeCloseTo(presente.net);
  });

  it("aunque su categoria matchee una fila de escala, la escala no se le aplica", () => {
    const r = run(
      { normalHours: 200 },
      { isFueraConvenio: true, isPartner: true, agreedWhite: 900000, computeWhiteCharges: false }
    );
    expect(r.grossNormal).toBe(0); // la escala del run() es 1000/hora: sin la regla seria 200.000
    expect(r.partnerFlat).toBe(true);
  });

  it("isPartner sin fuera de convenio no cambia nada (solo aplica a fuera de convenio)", () => {
    const conFlag = run({ normalHours: 200 }, { isPartner: true });
    const sinFlag = run({ normalHours: 200 });
    expect(conFlag.totalGross).toBeCloseTo(sinFlag.totalGross);
    expect(conFlag.partnerFlat).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// EL RECIBO DE VERDAD. Reproduce entero el recibo de De Raiz (CARMONA BUSTAMANTE, 07/2026) que paso
// Nicolas. Es el test mas valioso de la liquidacion: si algun concepto se desvia, este se cae.
describe("recibo real De Raíz · Carmona 07/2026", () => {
  const cfg: PayrollConfig = {
    seniorityPctPerYear: 1,
    unionPct: 3,
    insurancePct: 1.5,
    employerInsurancePct: 0,
    aguinaldoAnnualMonths: 1,
    normalHoursDefault: 198,
    employerJubilacionPct: 18,
    employerObraSocialPct: 6,
    employerArtPct: 11.38,
    employerArtFondoFiduciario: 1765,
    employerLifeInsuranceFixed: 424.62,
    detraccionLey27430: 7003.68,
  };
  const r = computePayrollSummary({
    seniorityYears: 8,
    hourlyNetManual: 0,
    hourlyGrossManual: 7959.06,
    payroll: {
      ...basePayroll,
      month: "2026-07",
      normalHours: 198,
      holidayHours: 9,
      extra50Hours: 4,
      extra100Hours: 2,
      presentismoPctOverride: 10,
      presentismoAsistenciaPct: 100,
    },
    // ASIG. SNR del recibo: 207 unidades (198 normales + 9 de feriado) x 302,44.
    scale: { baseHourly: 7959.06, vht: 7959.06, nonRemHourly: 302.44 },
    config: cfg,
  } as any);

  it("las horas dan los importes del recibo", () => {
    expect(r.grossNormal).toBeCloseTo(1575893.88, 2);   // 0017 · 198 h
    expect(r.extra50).toBeCloseTo(47754.36, 2);         // 0018 · 4 h al 50%
    expect(r.extra100).toBeCloseTo(31836.24, 2);        // 0021 · 2 h al 100%
    expect(r.grossHoliday).toBeCloseTo(71631.54, 2);    // 0043 · 9 h feriado a valor simple
  });

  it("antigüedad: 1% por año sobre horas trabajadas + extras + feriado", () => {
    expect(r.seniorityBonus).toBeCloseTo(138169.28, 2); // 0180 · 8 años
  });

  it("presentismo: 10% de las HORAS TRABAJADAS, sin extras ni feriado ni antigüedad", () => {
    expect(r.presentismo).toBeCloseTo(157589.39, 2);    // 0190
  });

  it("remunerativo y descuentos dan los del recibo", () => {
    expect(r.grossRem).toBeCloseTo(2022874.69, 2);
    expect(r.jubilacion).toBeCloseTo(222516.22, 2);
    expect(r.ley19032).toBeCloseTo(60686.24, 2);
    expect(r.obraSocial).toBeCloseTo(60686.24, 2);
    expect(r.sindicato).toBeCloseTo(60686.24, 2);
    expect(r.seguro).toBeCloseTo(30343.12, 2);
    expect(r.descuentos).toBeCloseTo(434918.06, 2);
  });

  it("contribución jubilatoria: 18% sobre el remunerativo MENOS la detracción de la ley 27.430", () => {
    expect(r.employerJubilacion).toBeCloseTo(362856.79, 1);
  });

  it("obra social patronal: 6% sobre el remunerativo, sin detracción", () => {
    expect(r.employerObraSocial).toBeCloseTo(121372.48, 2);
  });

  it("el no remunerativo y el bruto dan los del recibo", () => {
    expect(r.nonRem).toBeCloseTo(62605.08, 2);       // 0250 · ASIG. SNR
    expect(r.totalGross).toBeCloseTo(2085479.77, 2); // SUELDO BRUTO
  });

  it("ART: % sobre el BRUTO más la cuota fija del fondo fiduciario", () => {
    // Sin la cuota fija ($1.765 del fondo fiduciario) falta justo eso; sobre el remunerativo en vez
    // del bruto, falta mucho mas. Las dos cosas juntas dan el numero del recibo.
    expect(r.employerArt).toBeCloseTo(239092.6, 1);
  });

  it("el neto y el costo total empleador dan los del recibo", () => {
    expect(r.net).toBeCloseTo(1650561.71, 0); // recibo: 1.650.562,00 (diferencia de redondeo 0,29)
    const contribuciones =
      r.employerJubilacion + r.employerObraSocial + r.employerArt + r.employerLifeInsurance;
    expect(contribuciones).toBeCloseTo(723746.49, 0);          // SUB TOTAL CONTRIBUCIONES
    expect(r.totalGross + contribuciones).toBeCloseTo(2809226.26, 0); // COSTO TOTAL EMPLEADOR
  });

  it("en el mes del SAC no se detrae la ley 27.430", () => {
    const conSac = computePayrollSummary({
      seniorityYears: 8, hourlyNetManual: 0, hourlyGrossManual: 7959.06,
      payroll: {
        ...basePayroll, month: "2026-07", normalHours: 198, holidayHours: 9,
        extra50Hours: 4, extra100Hours: 2, presentismoPctOverride: 10,
        presentismoAsistenciaPct: 100, liquidaSAC: true,
      },
      scale: { baseHourly: 7959.06, vht: 7959.06, nonRemHourly: 0 },
      config: cfg,
    } as any);
    // 18% del remunerativo entero, sin restarle nada.
    expect(conSac.employerJubilacion).toBeCloseTo(2022874.69 * 0.18, 1);
    expect(conSac.employerJubilacion).toBeGreaterThan(r.employerJubilacion);
  });
});
