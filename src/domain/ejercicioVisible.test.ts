import { rangoDelEjercicio, esDelEjercicio, soloDelEjercicio, escondidasDelEjercicio, esElEjercicioEnCurso } from "./ejercicioVisible";

// Ejercicio en curso de las dos empresas: 1/11/2026 al 31/10/2027.
const rango = rangoDelEjercicio(11, 2026);

describe("rango del ejercicio", () => {
  it("noviembre a octubre", () => {
    expect(rango).toEqual({ startIso: "2026-11-01", endIso: "2027-10-31" });
  });
});

describe("que se ve del ejercicio elegido", () => {
  it("el primero y el ultimo dia entran", () => {
    expect(esDelEjercicio("2026-11-01", rango)).toBe(true);
    expect(esDelEjercicio("2027-10-31", rango)).toBe(true);
  });

  it("el dia anterior al arranque queda afuera", () => {
    expect(esDelEjercicio("2026-10-31", rango)).toBe(false);
  });

  it("lo del ejercicio que viene tambien queda afuera", () => {
    expect(esDelEjercicio("2027-11-01", rango)).toBe(false);
  });

  it("una fila sin fecha NO se esconde: no se puede probar que sea vieja", () => {
    expect(esDelEjercicio("", rango)).toBe(true);
    expect(esDelEjercicio(null, rango)).toBe(true);
    expect(esDelEjercicio("sin fecha", rango)).toBe(true);
  });

  it("acepta una fecha con hora", () => {
    expect(esDelEjercicio("2026-11-05T13:00:00Z", rango)).toBe(true);
    expect(esDelEjercicio("2026-10-05T13:00:00Z", rango)).toBe(false);
  });
});

describe("la lista que se muestra", () => {
  const filas = [
    { id: 1, date: "2026-10-15" },
    { id: 2, date: "2026-11-02" },
    { id: 3, date: "2027-03-01" },
    { id: 4, date: "" },
    { id: 5, date: "2027-11-20" },
  ];

  it("deja solo lo del ejercicio (y lo que no tiene fecha)", () => {
    expect(soloDelEjercicio(filas, (f) => f.date, rango).map((f) => f.id)).toEqual([2, 3, 4]);
  });

  it("cuenta lo que quedo escondido, separando antes y despues", () => {
    expect(escondidasDelEjercicio(filas, (f) => f.date, rango)).toEqual({ anteriores: 1, posteriores: 1, total: 2 });
  });

  it("sin nada escondido, el total es cero", () => {
    expect(escondidasDelEjercicio([{ date: "2026-12-01" }], (f) => f.date, rango).total).toBe(0);
  });
});

describe("si el ejercicio elegido es el de hoy", () => {
  it("hoy cae adentro", () => {
    expect(esElEjercicioEnCurso(rango, "2026-11-18")).toBe(true);
  });

  it("el anterior no", () => {
    expect(esElEjercicioEnCurso(rangoDelEjercicio(11, 2025), "2026-11-18")).toBe(false);
  });
});
