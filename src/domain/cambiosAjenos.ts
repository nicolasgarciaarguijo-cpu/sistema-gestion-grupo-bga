// CAMBIOS DE OTRA SESION (Nicolas, 2026-10-26: "cuando estoy trabajando con Joaquin en simultaneo a veces no
// dispara actualizacion automatica... y se pueden pisar los guardados"). Antes el chequeo periodico miraba solo
// el ULTIMO guardado de toda la base: si ese era propio, los cambios de Joaquin en otro modulo no se veian nunca.
// Ahora se mira cada fila (modulo + empresa) por separado: cualquier fila que cambio desde la ultima vez y que
// guardo OTRO usuario es un cambio ajeno a traer. No depende del reloj de cada maquina.

export type FilaGuardada = { module_key: string; company: string; saved_at: string; updated_by: string | null };

export type CambiosAjenos = { moduleKeys: string[]; updatedBy: string | null; savedAt: string };

const clave = (f: FilaGuardada) => `${f.module_key}|${f.company}`;
const sello = (f: FilaGuardada) => `${f.saved_at}|${f.updated_by || ""}`;

// `antes` = los sellos de la ultima revision (null = primera vez: solo se anotan, no hay "cambios").
export function filasAjenasNuevas(
  antes: Map<string, string> | null,
  filas: FilaGuardada[],
  yo: string | null | undefined
): { sellos: Map<string, string>; cambios: CambiosAjenos | null } {
  const sellos = new Map(filas.map((f) => [clave(f), sello(f)]));
  if (!antes) return { sellos, cambios: null };
  const nuevas = filas.filter((f) => antes.get(clave(f)) !== sello(f) && !!f.updated_by && f.updated_by !== yo);
  if (!nuevas.length) return { sellos, cambios: null };
  const ultima = [...nuevas].sort((a, b) => b.saved_at.localeCompare(a.saved_at))[0];
  return {
    sellos,
    cambios: {
      moduleKeys: Array.from(new Set(nuevas.map((f) => f.module_key))),
      updatedBy: ultima.updated_by,
      savedAt: ultima.saved_at,
    },
  };
}
