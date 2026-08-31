import { porcentajePorAsistencia, calcularPresentismo, PRESENTISMO_PCT_DEL_BRUTO } from "./presentismo";

describe("porcentajePorAsistencia", () => {
  it("asistencia perfecta cobra todo", () => {
    expect(porcentajePorAsistencia(0, 0)).toBe(100);
  });

  it("las tardes lo comen de a un cuarto, y a la tercera lo pierde todo", () => {
    expect(porcentajePorAsistencia(1, 0)).toBe(75);
    expect(porcentajePorAsistencia(2, 0)).toBe(50);
    expect(porcentajePorAsistencia(3, 0)).toBe(0);
    expect(porcentajePorAsistencia(9, 0)).toBe(0);
  });

  it("un ausente ya se lleva la mitad, y el segundo todo", () => {
    expect(porcentajePorAsistencia(0, 1)).toBe(50);
    expect(porcentajePorAsistencia(0, 2)).toBe(0);
  });

  it("cuando hay de las dos, manda la peor (no se suman los descuentos)", () => {
    // 1 tarde daria 75 y 1 ausente 50: cobra 50, no 25.
    expect(porcentajePorAsistencia(1, 1)).toBe(50);
    expect(porcentajePorAsistencia(2, 1)).toBe(50);
    expect(porcentajePorAsistencia(1, 2)).toBe(0);
  });

  it("no se rompe con basura", () => {
    expect(porcentajePorAsistencia(-3, 0)).toBe(100);
    expect(porcentajePorAsistencia(NaN as any, NaN as any)).toBe(100);
    expect(porcentajePorAsistencia(1.7, 0)).toBe(75);
  });
});

describe("calcularPresentismo", () => {
  it("el presentismo es el 10% del bruto", () => {
    expect(PRESENTISMO_PCT_DEL_BRUTO).toBe(10);
    const p = calcularPresentismo({ brutoBase: 1000000, tardes: 0, ausentes: 0 });
    expect(p.base).toBe(100000);
    expect(p.pct).toBe(100);
    expect(p.monto).toBe(100000);
    expect(p.motivo).toBe("Asistencia perfecta");
  });

  it("descuenta segun la asistencia y dice por qué", () => {
    const p = calcularPresentismo({ brutoBase: 1000000, tardes: 2, ausentes: 0 });
    expect(p.pct).toBe(50);
    expect(p.monto).toBe(50000);
    expect(p.motivo).toContain("2 tardes");
  });

  it("el porcentaje puesto a mano gana, y se avisa qué habría dado la asistencia", () => {
    const p = calcularPresentismo({ brutoBase: 1000000, tardes: 3, ausentes: 0, override: 75 });
    expect(p.pct).toBe(75);
    expect(p.monto).toBe(75000);
    expect(p.aMano).toBe(true);
    expect(p.motivo).toContain("0%");
  });

  it("un override de 0 es válido y no se confunde con 'sin override'", () => {
    const p = calcularPresentismo({ brutoBase: 1000000, tardes: 0, ausentes: 0, override: 0 });
    expect(p.pct).toBe(0);
    expect(p.aMano).toBe(true);
  });

  it("el override se recorta a 0..100", () => {
    expect(calcularPresentismo({ brutoBase: 1000, tardes: 0, ausentes: 0, override: 150 }).pct).toBe(100);
    expect(calcularPresentismo({ brutoBase: 1000, tardes: 0, ausentes: 0, override: -20 }).pct).toBe(0);
  });

  it("sin override (null/undefined) manda la asistencia", () => {
    expect(calcularPresentismo({ brutoBase: 1000, tardes: 1, ausentes: 0, override: null }).aMano).toBe(false);
    expect(calcularPresentismo({ brutoBase: 1000, tardes: 1, ausentes: 0 }).pct).toBe(75);
  });
});
