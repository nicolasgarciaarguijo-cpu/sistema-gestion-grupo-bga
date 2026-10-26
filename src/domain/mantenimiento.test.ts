import {
  esMaquinaOHerramienta,
  herramientasFaltantes,
  idoneosPara,
  proximaFecha,
  registrarMantenimiento,
  registrarTareasHechas,
  tareaDeMantenimientoEnElDia,
  tareasTrabadasPorHerramientas,
  vencimientosDeMantenimiento,
  type FichaMaquina,
  type MaquinaStock,
} from "./mantenimiento";
import type { CategoriaEmpleado } from "./categoriasEmpleado";
import type { TipoTarea } from "./organizacionDiaria";

const maquinas: MaquinaStock[] = [
  { id: 1, description: "Seccionadora", group: "Maquinas pesadas", quantity: 1, company: "General" },
  { id: 2, description: "Atornillador", group: "Maquinas manuales", quantity: 3, company: "General" },
  { id: 3, description: "Pistola de laca", group: "Herramientas", quantity: 0, company: "General" },
];
const fichas: FichaMaquina[] = [
  {
    stockItemId: 1,
    estado: "en_mantenimiento",
    planes: [{ id: 11, descripcion: "Cambio de correas", cadaDias: 90, ultimaFecha: "2026-08-01", tareaId: 500, horas: 2 }],
    historial: [],
  },
  { stockItemId: 2, planes: [{ id: 21, descripcion: "Revisión de baterías", cadaDias: 30 }], historial: [] },
];
const tipos: TipoTarea[] = [
  { id: 100, nombre: "Cortar placas", herramientas: [1] },
  { id: 200, nombre: "Armar módulo", herramientas: [2] },
  { id: 300, nombre: "Laquear", herramientas: [3, 9] },
];

describe("mantenimiento", () => {
  it("las máquinas son los items de stock de sus grupos", () => {
    expect(esMaquinaOHerramienta({ group: "Maquinas pesadas" })).toBe(true);
    expect(esMaquinaOHerramienta({ group: "Herrajes" })).toBe(false);
    expect(esMaquinaOHerramienta({ group: "Herramientas", kind: "EPP" })).toBe(false);
  });

  it("próximo preventivo: última + cada N días; sin última no hay fecha", () => {
    expect(proximaFecha(fichas[0].planes[0])).toBe("2026-10-30");
    expect(proximaFecha(fichas[1].planes[0])).toBeNull();
    const v = vencimientosDeMantenimiento(maquinas, fichas, "2026-11-05");
    expect(v.map((x) => [x.maquina, x.dias])).toEqual([["Atornillador", null], ["Seccionadora", -6]]);
  });

  it("disponibilidad: qué tareas quedan trabadas y por qué", () => {
    expect(herramientasFaltantes([2], maquinas, fichas)).toEqual([]);
    const trabadas = tareasTrabadasPorHerramientas(tipos, maquinas, fichas);
    expect(trabadas.map((t) => t.tareaId)).toEqual([100, 300]);
    expect(trabadas[0].faltantes[0].motivo).toBe("en mantenimiento");
    expect(trabadas[1].faltantes.map((f) => f.motivo)).toEqual(["sin unidades en stock", "no está en stock"]);
  });

  it("idóneos: quienes tienen la tarea en sus categorías", () => {
    const cats: CategoriaEmpleado[] = [{ id: 19, nombre: "Mantenimiento", nivel: 0, incluye: [], tareaIds: [500], extra: true }];
    const emps = [{ id: 1, categoriasInternas: [19] }, { id: 2, categoriasInternas: [] }, { id: 3 }];
    expect(idoneosPara(500, emps, cats).map((e) => e.id)).toEqual([1]);
  });

  it("programar: la tarea entra al día de la persona, a continuación de lo que tenía", () => {
    let n = 1000;
    const previa = {
      id: 1, company: "De Raíz", fecha: "2026-11-02", empleadoId: 7, empleado: "Juan", lugar: "fabrica" as const,
      turnos: [{ id: "m", nombre: "Mañana", desde: "07:30", hasta: "13:30" }],
      tareas: [{ id: 5, descripcion: "Cortar", desde: "07:30", hasta: "09:00" }],
    };
    const a = tareaDeMantenimientoEnElDia([previa], {
      fecha: "2026-11-02", empleadoId: 7, empleado: "Juan", company: "De Raíz", stockItemId: 1, maquina: "Seccionadora",
      plan: fichas[0].planes[0], horas: 2, nuevoId: () => ++n,
    });
    expect(a.id).toBe(1);
    expect(a.tareas[1]).toMatchObject({ desde: "09:00", hasta: "11:00", tipoTareaId: 500, mantenimiento: { stockItemId: 1, planId: 11 } });
    // Sin dia armado: lo arma con los turnos de siempre.
    const nueva = tareaDeMantenimientoEnElDia([], { fecha: "2026-11-03", empleadoId: 8, empleado: "Ana", company: "BGA", stockItemId: 2, maquina: "Atornillador", horas: 1, nuevoId: () => ++n });
    expect(nueva.tareas[0]).toMatchObject({ desde: "07:30", hasta: "08:30" });
  });

  it("al marcarla hecha queda en el historial, corre el preventivo y la máquina vuelve a operativa (una sola vez)", () => {
    let n = 1;
    const dia = {
      id: 1, company: "De Raíz", fecha: "2026-11-02", empleadoId: 7, empleado: "Juan", lugar: "fabrica" as const, turnos: [],
      tareas: [{ id: 9, descripcion: "Mantenimiento · Seccionadora", desde: "09:00", hasta: "11:00", hecha: true, hechaEn: "2026-11-02T10:55:00", mantenimiento: { stockItemId: 1, planId: 11 } }],
    };
    const r = registrarTareasHechas(fichas, dia, () => ++n);
    const f = r.find((x) => x.stockItemId === 1)!;
    expect(f.estado).toBe("operativa");
    expect(f.planes[0].ultimaFecha).toBe("2026-11-02");
    expect(f.historial).toHaveLength(1);
    expect(registrarTareasHechas(r, dia, () => ++n).find((x) => x.stockItemId === 1)!.historial).toHaveLength(1);
  });

  it("una reposición deja la máquina operativa", () => {
    const f = registrarMantenimiento({ stockItemId: 3, estado: "a_reponer", planes: [], historial: [] }, { id: 1, fecha: "2026-11-01", tipo: "reposicion", descripcion: "Nueva" });
    expect(f.estado).toBe("operativa");
  });
});
