import { idsDeGrupo, lineasDeTareas, pegarTareasEnGrupo, type TipoTarea } from "./organizacionDiaria";
import { tareasDelGrupo } from "./tiposMueble";

const LISTA_CNC =
  "1. LIMPIEZA DEL CNC 2. CONTROL DE PRESION DE AIRE 3. SELECCION DE CANTIDAD DE PLACAS 4. CARGAR PLACAS A MECANIZAR 5. CARGAR ARCHIVO. 6. VERIFICAR SUCCION 7. INICIO DE ARCHIVO DE CORTE. 8. REVISION DE PIEZAS + MARCACION DE OPERACION DE PEGADO Y MECANIZADO 9. LIMPIEZA.";

describe("grupos de tareas como listas", () => {
  it("la lista pegada en un renglón (como la escribió Nicolás) se separa en sus 9 tareas", () => {
    const l = lineasDeTareas(LISTA_CNC);
    expect(l).toHaveLength(9);
    expect(l[0]).toBe("LIMPIEZA DEL CNC");
    expect(l[4]).toBe("CARGAR ARCHIVO.");
    expect(l[7]).toBe("REVISION DE PIEZAS + MARCACION DE OPERACION DE PEGADO Y MECANIZADO");
  });

  it("también una por renglón, con o sin números o viñetas", () => {
    expect(lineasDeTareas("1) Cortar\n- Cantear\n\n  Armar  ")).toEqual(["Cortar", "Cantear", "Armar"]);
  });

  it("pegar crea las nuevas en el grupo y LLAMA a las que ya existen (misma tarea), sin repetir", () => {
    const tipos: TipoTarea[] = [{ id: 1, nombre: "Limpieza", grupoId: 5 }];
    let n = 100;
    const r = pegarTareasEnGrupo({ id: 9, nombre: "Pegado de cantos" }, tipos, "1. limpieza 2. Cargar canto 3. Pegar", () => ++n);
    expect(r.llamadas).toBe(1);
    expect(r.nuevas.map((t) => [t.nombre, t.grupoId])).toEqual([["Cargar canto", 9], ["Pegar", 9]]);
    expect(r.grupo.tareaIds).toEqual([1, 101, 102]);
    // la tarea llamada queda en los dos grupos
    const todas = [...tipos, ...r.nuevas];
    expect(idsDeGrupo(r.grupo, todas)).toContain(1);
    expect(idsDeGrupo({ id: 5 }, todas)).toEqual([1]);
    // pegar de nuevo no duplica
    expect(pegarTareasEnGrupo(r.grupo, todas, "Pegar", () => ++n).grupo.tareaIds).toEqual([1, 101, 102]);
  });

  it("el tipo de mueble toma las tareas en el orden del grupo", () => {
    const tipos: TipoTarea[] = [{ id: 1, nombre: "A" }, { id: 2, nombre: "B" }, { id: 3, nombre: "C", activa: false }];
    expect(tareasDelGrupo(9, tipos, [{ id: 9, nombre: "G", tareaIds: [2, 1, 3] }])).toEqual([2, 1]);
  });
});
