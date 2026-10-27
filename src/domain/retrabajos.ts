// RETRABAJOS (fase 6, Nicolas 2026-10-26): "opcion de porcentaje: si es 100 entonces se rehace la tarea entera; un
// bloque en Fabricacion con el costo de rehacer (costo hora de la persona + materiales) y un contador de efectividad por
// persona en Personal". Cada retrabajo es de un trabajo (y de su empresa), de una tarea y de quien la hizo mal; lo
// rehace esa misma persona u otra. Sus horas se suman al cronograma del trabajo (se corre la fecha de fin).

export type Retrabajo = {
  id: number;
  company: string; // la del trabajo
  fecha: string;
  jobId: number;
  tareaId?: number | null;
  descripcion?: string;
  // Quien hizo la tarea que hubo que rehacer (cuenta en su efectividad) y quien la rehace.
  responsableId: number;
  rehaceId?: number;
  // Cuanto de la tarea se rehace: 100 = entera.
  porcentaje: number;
  // Horas que llevo (o lleva) la tarea original; las del retrabajo = horasTarea x porcentaje.
  horasTarea: number;
  // Materiales que se tiraron o se volvieron a usar ($).
  materiales: number;
  motivo?: string;
  firmante?: string;
  firmadoEn?: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (n: unknown) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0);

export const horasDeRetrabajo = (r: Pick<Retrabajo, "horasTarea" | "porcentaje">) => r2(pos(r.horasTarea) * Math.min(100, pos(r.porcentaje)) / 100);

// Costo de rehacer: las horas por el costo hora de quien rehace, mas los materiales.
export function costoDeRetrabajo(r: Retrabajo, costoHora: (empleadoId: number) => number): { horas: number; manoDeObra: number; materiales: number; total: number } {
  const horas = horasDeRetrabajo(r);
  const manoDeObra = r2(horas * pos(costoHora(r.rehaceId ?? r.responsableId)));
  const materiales = r2(pos(r.materiales));
  return { horas, manoDeObra, materiales, total: r2(manoDeObra + materiales) };
}

// Horas de retrabajo de cada trabajo (para correr su cronograma).
export function horasDeRetrabajoPorTrabajo(retrabajos: Retrabajo[]): Record<number, number> {
  const out: Record<number, number> = {};
  retrabajos.forEach((r) => {
    out[r.jobId] = r2((out[r.jobId] || 0) + horasDeRetrabajo(r));
  });
  return out;
}

// EFECTIVIDAD por persona en un periodo: de las horas de tareas que hizo (las tildadas hechas en la organizacion
// diaria), cuantas hubo que rehacer por su culpa. Efectividad = 1 - horas rehechas / horas trabajadas.
export type EfectividadPersona = { empleadoId: number; horasHechas: number; retrabajos: number; horasRetrabajo: number; costo: number; efectividad: number | null };

export function efectividadPorPersona(
  empleados: number[],
  tareasHechas: Array<{ empleadoId: number; horas: number }>,
  retrabajos: Retrabajo[],
  costoHora: (empleadoId: number) => number
): EfectividadPersona[] {
  return empleados.map((id) => {
    const horasHechas = r2(tareasHechas.filter((t) => t.empleadoId === id).reduce((s, t) => s + pos(t.horas), 0));
    const propios = retrabajos.filter((r) => r.responsableId === id);
    const horasRetrabajo = r2(propios.reduce((s, r) => s + horasDeRetrabajo(r), 0));
    const costo = r2(propios.reduce((s, r) => s + costoDeRetrabajo(r, costoHora).total, 0));
    const efectividad = horasHechas > 0 ? Math.max(0, Math.round((1 - horasRetrabajo / horasHechas) * 1000) / 10) : null;
    return { empleadoId: id, horasHechas, retrabajos: propios.length, horasRetrabajo, costo, efectividad };
  });
}
