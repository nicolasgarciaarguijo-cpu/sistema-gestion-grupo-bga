import { costoDeRetrabajo, efectividadPorPersona, horasDeRetrabajo, horasDeRetrabajoPorTrabajo, type Retrabajo } from "./retrabajos";

const base: Retrabajo = { id: 1, company: "De raiz s.r.l", fecha: "2026-10-26", jobId: 7, responsableId: 1, porcentaje: 50, horasTarea: 4, materiales: 20000 };
const costoHora = (id: number) => (id === 1 ? 5000 : 8000);

describe("retrabajos", () => {
  it("las horas son el % de la tarea (100 = entera, no más)", () => {
    expect(horasDeRetrabajo(base)).toBe(2);
    expect(horasDeRetrabajo({ horasTarea: 4, porcentaje: 150 })).toBe(4);
  });

  it("el costo es horas por el costo hora de quien rehace, más materiales", () => {
    expect(costoDeRetrabajo(base, costoHora)).toEqual({ horas: 2, manoDeObra: 10000, materiales: 20000, total: 30000 });
    expect(costoDeRetrabajo({ ...base, rehaceId: 2 }, costoHora).manoDeObra).toBe(16000);
  });

  it("suma por trabajo para correr el cronograma", () => {
    expect(horasDeRetrabajoPorTrabajo([base, { ...base, id: 2, porcentaje: 100 }, { ...base, id: 3, jobId: 8 }])).toEqual({ 7: 6, 8: 2 });
  });

  it("efectividad: horas rehechas por su culpa sobre horas trabajadas", () => {
    const e = efectividadPorPersona([1, 2], [{ empleadoId: 1, horas: 18 }, { empleadoId: 1, horas: 2 }, { empleadoId: 3, horas: 5 }], [base], costoHora);
    expect(e[0]).toEqual({ empleadoId: 1, horasHechas: 20, retrabajos: 1, horasRetrabajo: 2, costo: 30000, efectividad: 90 });
    expect(e[1].efectividad).toBeNull(); // sin horas cargadas no hay número
  });
});
