// #16 Merge por item para evitar el "pisado" en la sincronizacion.
//
// Hoy, al guardar, se reescribe la fila entera de (modulo, empresa): si otro usuario agrego/edito un
// item entre medio, se pierde. Este 3-way merge lo resuelve identificando cada item por su id:
//
//   baseline = ultimo estado que teniamos sincronizado con la DB (sirve para saber que borramos NOSOTROS).
//   ours     = estado local que estamos por guardar.
//   theirs   = estado FRESCO leido de la DB justo antes de escribir (puede traer cambios de otros).
//
// Reglas:
//  - Partimos de NUESTROS items (ganan en conflicto: somos el escritor actual).
//  - Sumamos los items de `theirs` que no tenemos y que NO borramos nosotros (asi no perdemos lo que
//    agrego/edito otro usuario mientras tanto).
//  - NO resucitamos lo que nosotros borramos (estaba en baseline y ya no esta en ours).
//
// Es pura y testeada; se usa en el camino de escritura a Supabase (ver App.tsx).

export type WithId = Record<string, unknown> & { id?: unknown };

// DOS COPIAS CON EL MISMO ID (Nicolas, 2026-10-21: "al borrar el credito en cero se borran los 2"). Si un
// item quedo guardado dos veces -- por ejemplo en la fila de la empresa vieja y en la nueva, tras cambiarle
// la empresa -- borrar uno borra los dos (se borra por id). Se deja UNA sola copia por id: la mas completa
// (la que tiene mas datos; a igual tamano, la ultima). Los items sin id quedan como estan.
export function sinIdsRepetidos<T>(items: readonly T[], idKey: string = "id"): T[] {
  const mejor = new Map<unknown, { i: number; peso: number }>();
  items.forEach((it, i) => {
    const id = (it as any)?.[idKey];
    if (id == null) return;
    const peso = JSON.stringify(it ?? "").length;
    const previo = mejor.get(id);
    if (!previo || peso >= previo.peso) mejor.set(id, { i, peso });
  });
  if (mejor.size === items.filter((it) => (it as any)?.[idKey] != null).length) return items as T[];
  return items.filter((it, i) => {
    const id = (it as any)?.[idKey];
    return id == null || mejor.get(id)?.i === i;
  });
}

const idOf = (item: WithId, idKey: string): unknown => (item as any)?.[idKey];

// Igualdad "de contenido": claves ordenadas y sin undefined (la base reordena las claves de los
// objetos, y un campo ausente equivale a uno undefined).
const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === "object"
      ? Object.keys(v as Record<string, unknown>)
          .sort()
          .filter((k) => (v as any)[k] !== undefined)
          .reduce((o: Record<string, unknown>, k) => ((o[k] = canon((v as any)[k])), o), {})
      : v;
export const sameContent = (a: unknown, b: unknown): boolean => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

const isArrayOfItemsWithId = (v: unknown, idKey: string) =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && (x as any)[idKey] != null);

// 3-way por CAMPO de un mismo item que cambiaron las dos sesiones (Nicolas, 2026-10-14: el pisado de
// Trabajos aprobados). Lo que solo cambio una de las dos, entra; si cambiaron el mismo campo, gana la
// nuestra. Las listas de items con id (facturas, pagos, adicionales...) se fusionan item por item.
export function mergeObjects3<T extends WithId>(base: T, ours: T, theirs: T, idKey: string = "id"): T {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(ours || {}), ...Object.keys(theirs || {})]);
  keys.forEach((k) => {
    const b = (base as any)?.[k];
    const o = (ours as any)?.[k];
    const t = (theirs as any)?.[k];
    let v: unknown;
    if (sameContent(o, b)) v = t; // nosotros no lo tocamos: manda la base
    else if (sameContent(t, b)) v = o; // solo lo cambiamos nosotros
    else if (
      (isArrayOfItemsWithId(o, idKey) || isArrayOfItemsWithId(t, idKey) || isArrayOfItemsWithId(b, idKey)) &&
      (o === undefined || Array.isArray(o)) &&
      (t === undefined || Array.isArray(t))
    )
      v = mergeItemsById((Array.isArray(b) ? b : []) as WithId[], (o || []) as WithId[], (t || []) as WithId[], idKey);
    else v = o; // los dos cambiaron el mismo campo: gana el que esta guardando
    if (v !== undefined) out[k] = v;
  });
  return out as T;
}

export function mergeItemsById<T extends WithId>(
  baseline: readonly T[],
  ours: readonly T[],
  theirs: readonly T[],
  idKey: string = "id",
  // false = el campo no vino en la fila de la DB (no se puede saber que borro otro).
  theirsLeida: boolean = true,
  // Ids que NO pueden quedar en esta fila aunque esten en la DB: los que ahora son de OTRA empresa (se
  // les cambio la empresa: la copia vieja quedaba y despues volvia) y los que esta sesion borro.
  fueraDeEstaFila?: ReadonlySet<unknown>
): T[] {
  const baselineIds = new Set(baseline.map((it) => idOf(it, idKey)));
  const ourIds = new Set(ours.map((it) => idOf(it, idKey)));
  const baseById = new Map(baseline.map((it) => [idOf(it, idKey), it]));
  const theirsById = new Map(theirs.map((it) => [idOf(it, idKey), it]));
  // Lo que borramos nosotros: estaba en baseline y ya no esta en ours.
  const ourDeletes = new Set(
    Array.from(baselineIds).filter((id) => id != null && !ourIds.has(id))
  );

  const result: T[] = [];
  const seen = new Set<unknown>();
  for (const it of ours) {
    const id = idOf(it, idKey);
    if (id != null && seen.has(id)) continue; // nunca dos copias del mismo id
    const b = id != null ? baseById.get(id) : undefined;
    const t = id != null ? theirsById.get(id) : undefined;
    // Con la base sabemos QUIEN cambio el item:
    //  - nosotros no lo tocamos (ours == base) y en la DB cambio -> manda la DB. Es el caso de una
    //    sesion vieja abierta en otra maquina: ya no pisa lo que cargo otro.
    //  - cambiamos los dos -> se fusiona campo por campo (y facturas/pagos/adicionales, por id).
    // Lo BORRO otra sesion: estaba en la base, ya no esta en la DB y nosotros no lo tocamos. Una sesion
    // vieja abierta en otra maquina lo volvia a escribir (Nicolas, 2026-10-20: "lo borre y sigue
    // figurando"). Si lo cambiamos nosotros despues, se conserva (no se pierde una edicion).
    // Solo con la lista de la DB a la vista y no vacia: una lista que falta o viene vacia no es un borrado.
    if (b && !t && id != null && theirsLeida && theirs.length > 0 && sameContent(it, b)) continue;
    let elegido: T = it;
    if (b && t && !sameContent(t, b)) {
      if (sameContent(it, b)) elegido = t;
      else if (!sameContent(it, t)) elegido = mergeObjects3(b, it, t, idKey);
    }
    result.push(elegido);
    if (id != null) seen.add(id);
  }
  for (const it of theirs) {
    const id = idOf(it, idKey);
    if (id == null) continue; // sin id no se puede fusionar; manda lo nuestro
    if (seen.has(id)) continue; // ya lo tenemos: nuestra version gana
    if (fueraDeEstaFila?.has(id)) continue; // es de otra empresa o lo borramos: no se conserva aca
    // Lo borramos nosotros: no resucitar (salvo que otro lo haya cambiado despues: ahi se conserva).
    if (ourDeletes.has(id) && sameContent(it, baseById.get(id))) continue;
    result.push(it); // item nuevo/ajeno: conservar para no pisarlo
    seen.add(id);
  }
  return result;
}

// Aplica el merge por item SOLO a los campos por-empresa (arrays de items con id) de un modulo. Los
// campos globales (catalogos, config) quedan como los nuestros (last-write-wins del escritor).
export function mergeModuleSlice(
  perCompanyFields: readonly string[],
  baseline: Record<string, unknown>,
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
  // Por campo: ids que no pueden quedar en esta fila (ver mergeItemsById).
  fueraDeEstaFila?: Record<string, ReadonlySet<unknown>>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...ours };
  for (const field of perCompanyFields) {
    const oursArr = Array.isArray(ours[field]) ? (ours[field] as WithId[]) : null;
    const theirsArr = Array.isArray(theirs[field]) ? (theirs[field] as WithId[]) : null;
    // Solo fusiona si alguno de los dos trae el campo como array (evita crear/pisar por omision).
    if (oursArr || theirsArr) {
      const baseArr = Array.isArray(baseline[field]) ? (baseline[field] as WithId[]) : [];
      out[field] = mergeItemsById(baseArr, oursArr || [], theirsArr || [], "id", !!theirsArr, fueraDeEstaFila?.[field]);
    }
  }
  return out;
}
