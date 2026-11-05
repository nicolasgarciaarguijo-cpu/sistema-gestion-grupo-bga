import { diasHabilesDelMes, reciboNegroAmount, numeroALetras, negroDelMes } from "./recibo";

describe("diasHabilesDelMes", () => {
  it("cuenta de lunes a viernes, sin sabados, domingos ni feriados", () => {
    // Noviembre 2026: 21 dias de lunes a viernes, menos un feriado.
    expect(diasHabilesDelMes("2026-11")).toBe(20);
  });
  it("mes invalido => 0", () => {
    expect(diasHabilesDelMes("")).toBe(0);
  });
});

describe("reciboNegroAmount", () => {
  it("el arreglo dividido las horas laborables por las horas trabajadas", () => {
    expect(reciboNegroAmount({ totalBlack: 900000, horasLaborables: 180, horasTrabajadas: 180 })).toBe(900000);
    expect(reciboNegroAmount({ totalBlack: 900000, horasLaborables: 180, horasTrabajadas: 90 })).toBe(450000);
    expect(reciboNegroAmount({ totalBlack: 900000, horasLaborables: 180, horasTrabajadas: 171 })).toBe(855000);
  });
  it("nunca pasa del arreglo ni baja de cero", () => {
    expect(reciboNegroAmount({ totalBlack: 900000, horasLaborables: 180, horasTrabajadas: 200 })).toBe(900000);
    expect(reciboNegroAmount({ totalBlack: 900000, horasLaborables: 180, horasTrabajadas: -3 })).toBe(0);
  });
  it("sin monto o sin horas laborables da cero", () => {
    expect(reciboNegroAmount({ totalBlack: 0, horasLaborables: 180, horasTrabajadas: 10 })).toBe(0);
    expect(reciboNegroAmount({ totalBlack: 900000, horasLaborables: 0, horasTrabajadas: 10 })).toBe(0);
  });
});

describe("numeroALetras", () => {
  it("el neto del recibo de ejemplo", () => {
    expect(numeroALetras(1049548)).toBe(
      "UN MILLON CUARENTA Y NUEVE MIL QUINIENTOS CUARENTA Y OCHO CON 00/100"
    );
  });
  it("centavos", () => {
    expect(numeroALetras(1324892.1)).toContain("CON 10/100");
  });
  it("casos borde", () => {
    expect(numeroALetras(0)).toBe("CERO CON 00/100");
    expect(numeroALetras(100)).toBe("CIEN CON 00/100");
    expect(numeroALetras(21)).toBe("VEINTIUNO CON 00/100");
    expect(numeroALetras(1000000)).toBe("UN MILLON CON 00/100");
  });
});

// El recibo del socio no se prorratea: cobra lo acordado aunque no haya fichado ninguna hora.
describe("reciboNegroAmount · socio", () => {
  it("sin prorrateo, devuelve el total acordado sin mirar las horas", () => {
    expect(reciboNegroAmount({ totalBlack: 600000, horasLaborables: 180, horasTrabajadas: 0, sinProrrateo: true })).toBe(600000);
    expect(reciboNegroAmount({ totalBlack: 600000, horasLaborables: 0, horasTrabajadas: 0, sinProrrateo: true })).toBe(600000);
  });

  it("sin el flag sigue prorrateando igual que siempre", () => {
    expect(reciboNegroAmount({ totalBlack: 600000, horasLaborables: 180, horasTrabajadas: 0 })).toBe(0);
  });
});

describe("negroDelMes (recibo negro y ficha de pago, misma regla)", () => {
  it("el acuerdo se prorratea por horas trabajadas y el premio va entero", () => {
    const r = negroDelMes({ acordadoPorTipo: 0, acuerdoDelMes: 260000, premio: 50000, horasLaborables: 180, horasTrabajadas: 90 });
    expect(r).toEqual({ acuerdoTotal: 260000, acuerdoAEntregar: 130000, premio: 50000, total: 180000 });
  });

  it("fuera de convenio: su negro acordado + el acuerdo del mes, prorrateados", () => {
    const r = negroDelMes({ acordadoPorTipo: 500000, acuerdoDelMes: 20000, premio: 0, horasLaborables: 180, horasTrabajadas: 180 });
    expect(r.total).toBe(520000);
  });

  it("socio o temporal por dia: sin prorrateo", () => {
    const r = negroDelMes({ acordadoPorTipo: 800000, acuerdoDelMes: 0, premio: 0, horasLaborables: 180, horasTrabajadas: 27, sinProrrateo: true });
    expect(r.total).toBe(800000);
  });
});
