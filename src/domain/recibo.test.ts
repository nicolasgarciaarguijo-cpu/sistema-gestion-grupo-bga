import { workingDaysInMonth, reciboNegroAmount, numeroALetras } from "./recibo";

describe("workingDaysInMonth", () => {
  it("julio 2026 (L-S, sin domingos)", () => {
    // Julio 2026: 31 días. Domingos: 5, 12, 19, 26 => 4 domingos. 31 - 4 = 27.
    expect(workingDaysInMonth("2026-07")).toBe(27);
  });
  it("sin sábados (solo L-V)", () => {
    // Sábados de julio 2026: 4, 11, 18, 25 => 4. 27 - 4 = 23.
    expect(workingDaysInMonth("2026-07", { includeSaturday: false })).toBe(23);
  });
  it("descuenta feriados", () => {
    expect(workingDaysInMonth("2026-07", { holidays: ["2026-07-09"] })).toBe(26);
  });
  it("mes inválido => 0", () => {
    expect(workingDaysInMonth("")).toBe(0);
  });
});

describe("reciboNegroAmount", () => {
  it("prorratea por días trabajados", () => {
    expect(reciboNegroAmount({ totalBlack: 600000, workingDays: 26, daysWorked: 26 })).toBe(600000);
    expect(reciboNegroAmount({ totalBlack: 600000, workingDays: 26, daysWorked: 24 })).toBeCloseTo(
      (600000 / 26) * 24,
      2
    );
  });
  it("nunca supera el total ni baja de 0", () => {
    expect(reciboNegroAmount({ totalBlack: 600000, workingDays: 26, daysWorked: 30 })).toBe(600000);
    expect(reciboNegroAmount({ totalBlack: 600000, workingDays: 26, daysWorked: -3 })).toBe(0);
  });
  it("sin total o sin días => 0", () => {
    expect(reciboNegroAmount({ totalBlack: 0, workingDays: 26, daysWorked: 10 })).toBe(0);
    expect(reciboNegroAmount({ totalBlack: 600000, workingDays: 0, daysWorked: 10 })).toBe(0);
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
