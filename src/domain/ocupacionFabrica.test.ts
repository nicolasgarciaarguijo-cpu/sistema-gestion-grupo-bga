import { ocupacionDelMes } from "./ocupacionFabrica";

describe("ocupación del taller con los trabajos aprobados", () => {
  const hoy = "2026-11-11";

  it("un trabajo entero dentro del mes carga todas sus horas", () => {
    const o = ocupacionDelMes({ trabajos: [{ horas: 90, inicio: "2026-11-02", entrega: "2026-11-13", finalizado: false }], horasPorPersona: [198, 198], hoy });
    expect(o.comprometidas).toBeCloseTo(90);
    expect(o.disponibles).toBe(396);
    expect(o.pct).toBeCloseTo((90 / 396) * 100);
  });

  it("un trabajo que cruza el mes reparte sus horas por días hábiles", () => {
    // 23/11 al 4/12: 6 hábiles en noviembre (23-27, 30) y 4 en diciembre (1-4)
    const o = ocupacionDelMes({ trabajos: [{ horas: 100, inicio: "2026-11-23", entrega: "2026-12-04", finalizado: false }], horasPorPersona: [198], hoy });
    expect(o.comprometidas).toBeCloseTo(60);
  });

  it("el atrasado se debe entero; el finalizado y el que arranca después no cuentan", () => {
    const o = ocupacionDelMes({
      trabajos: [
        { horas: 40, inicio: "2026-09-01", entrega: "2026-10-15", finalizado: false },
        { horas: 70, inicio: "2026-11-02", entrega: "2026-11-06", finalizado: true },
        { horas: 50, inicio: "2026-12-07", entrega: "2026-12-18", finalizado: false },
      ],
      horasPorPersona: [198],
      hoy,
    });
    expect(o.comprometidas).toBeCloseTo(40);
    expect(o.trabajosAbiertos).toBe(2);
  });

  it("avisa los trabajos abiertos sin horas de mano de obra", () => {
    const o = ocupacionDelMes({ trabajos: [{ horas: 0, inicio: "2026-11-02", entrega: "2026-11-20", finalizado: false }], horasPorPersona: [], hoy });
    expect(o.trabajosSinHoras).toBe(1);
    expect(o.pct).toBe(0);
  });
});
