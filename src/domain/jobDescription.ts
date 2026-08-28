// QUE SE HIZO EN UN TRABAJO.
//
// Pedido de Nicolas (2026-08-28): la descripcion del trabajo tiene que verse en el detalle de
// Trabajos aprobados Y en el resumen para el cliente, con los subpresupuestos y sus descripciones,
// "para que quede asentado que es lo que se hizo".
//
// El dato ya existia pero enterrado en el snapshot del presupuesto y no se mostraba en ningun lado
// despues de aprobar. Aca se junta en una sola forma para que las dos pantallas digan lo MISMO: si
// manana cambia de donde sale la descripcion, se toca solo esta funcion.

export type BloqueDelTrabajo = {
  titulo: string;
  descripcion: string;
  // Cantidad cotizada del bloque (N unidades identicas). Ausente o 1 = no se aclara.
  cantidad: number;
  moneda: "ARS" | "USD";
};

export type DescripcionDelTrabajo = {
  // El titulo de la obra ("PROYECTO MIGUELETES").
  proyecto: string;
  // Que se fabrica, en una linea. Sale de las notas del presupuesto.
  descripcion: string;
  // El alcance largo (que incluye y que no). Suele ser un texto fijo de la empresa.
  alcance: string;
  // Notas propias del trabajo aprobado, posteriores al presupuesto.
  notas: string;
  bloques: BloqueDelTrabajo[];
  // true si no hay absolutamente nada que mostrar: sirve para no dibujar una seccion vacia.
  vacio: boolean;
};

const texto = (v: unknown): string => String(v ?? "").trim();

export function describirTrabajo(job: any): DescripcionDelTrabajo {
  const snap = job?.snapshot || {};
  const bud = snap.budget || {};
  const subs: any[] = Array.isArray(snap.subBudgets) ? snap.subBudgets : [];

  const bloques: BloqueDelTrabajo[] = subs
    .map((s, i) => ({
      titulo: texto(s?.title) || `Bloque ${i + 1}`,
      descripcion: texto(s?.notes),
      cantidad: Number(s?.quantity) > 0 ? Number(s.quantity) : 1,
      moneda: s?.currency === "USD" ? ("USD" as const) : ("ARS" as const),
    }))
    // Un bloque sin titulo propio NI descripcion no aporta nada al cliente.
    .filter((b) => b.descripcion || !b.titulo.startsWith("Bloque "));

  const proyecto = texto(job?.project) || texto(bud.project);
  const descripcion = texto(bud.notes);
  const alcance = texto(bud.scope);
  const notas = texto(job?.notes);

  return {
    proyecto,
    descripcion,
    alcance,
    notas,
    bloques,
    vacio: !descripcion && !alcance && !notas && bloques.length === 0,
  };
}
