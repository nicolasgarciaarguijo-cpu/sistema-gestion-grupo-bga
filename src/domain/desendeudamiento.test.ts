import { camposLegacy, cuotasDeDeuda, cuotasPendientes, generarCuotas, resumenDeuda, sumarMesesIso } from "./desendeudamiento";

const vieja = { id: 7, nextDueDate: "2026-10-20", remainingInstallments: 3, nextInstallmentAmount: 500, active: true };

describe("desendeudamiento", () => {
  it("suma meses respetando el fin de mes", () => {
    expect(sumarMesesIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMesesIso("2026-11-15", 2)).toBe("2027-01-15");
  });

  it("una deuda vieja sin cuotas estipuladas genera una por mes (como antes)", () => {
    const c = cuotasDeDeuda(vieja);
    expect(c.map((x) => x.fecha)).toEqual(["2026-10-20", "2026-11-20", "2026-12-20"]);
    expect(c.every((x) => x.monto === 500)).toBe(true);
  });

  it("las cuotas estipuladas le ganan a los campos viejos, y la pagada no queda pendiente", () => {
    const cuotas = generarCuotas("2026-11-10", 2, 1000);
    cuotas[0].pagoCostEntryId = 99;
    const d = { ...vieja, cuotas };
    expect(cuotasPendientes(d).map((x) => x.fecha)).toEqual(["2026-12-10"]);
    const r = resumenDeuda(d, "2026-12-15");
    expect(r).toMatchObject({ total: 2000, pagado: 1000, pendiente: 1000, cuotasPendientes: 1, vencidas: 1 });
    expect(r.proxima?.fecha).toBe("2026-12-10");
  });

  it("una deuda inactiva no tiene cuotas pendientes", () => {
    expect(cuotasPendientes({ ...vieja, active: false })).toEqual([]);
  });

  it("los campos viejos salen de las cuotas pendientes", () => {
    const cuotas = generarCuotas("2026-11-10", 3, 1000);
    cuotas[0].pagoCostEntryId = 1;
    cuotas[2].monto = 1500;
    expect(camposLegacy(cuotas)).toEqual({ nextDueDate: "2026-12-10", remainingInstallments: 2, nextInstallmentAmount: 1000 });
    expect(camposLegacy([])).toEqual({ nextDueDate: "", remainingInstallments: 0, nextInstallmentAmount: 0 });
  });
});
