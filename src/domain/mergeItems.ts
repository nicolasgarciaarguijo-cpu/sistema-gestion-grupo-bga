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

const idOf = (item: WithId, idKey: string): unknown => (item as any)?.[idKey];

export function mergeItemsById<T extends WithId>(
  baseline: readonly T[],
  ours: readonly T[],
  theirs: readonly T[],
  idKey: string = "id"
): T[] {
  const baselineIds = new Set(baseline.map((it) => idOf(it, idKey)));
  const ourIds = new Set(ours.map((it) => idOf(it, idKey)));
  // Lo que borramos nosotros: estaba en baseline y ya no esta en ours.
  const ourDeletes = new Set(
    Array.from(baselineIds).filter((id) => id != null && !ourIds.has(id))
  );

  const result: T[] = [];
  const seen = new Set<unknown>();
  for (const it of ours) {
    result.push(it);
    const id = idOf(it, idKey);
    if (id != null) seen.add(id);
  }
  for (const it of theirs) {
    const id = idOf(it, idKey);
    if (id == null) continue; // sin id no se puede fusionar; manda lo nuestro
    if (seen.has(id)) continue; // ya lo tenemos: nuestra version gana
    if (ourDeletes.has(id)) continue; // lo borramos nosotros: no resucitar
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
  theirs: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...ours };
  for (const field of perCompanyFields) {
    const oursArr = Array.isArray(ours[field]) ? (ours[field] as WithId[]) : null;
    const theirsArr = Array.isArray(theirs[field]) ? (theirs[field] as WithId[]) : null;
    // Solo fusiona si alguno de los dos trae el campo como array (evita crear/pisar por omision).
    if (oursArr || theirsArr) {
      const baseArr = Array.isArray(baseline[field]) ? (baseline[field] as WithId[]) : [];
      out[field] = mergeItemsById(baseArr, oursArr || [], theirsArr || []);
    }
  }
  return out;
}
