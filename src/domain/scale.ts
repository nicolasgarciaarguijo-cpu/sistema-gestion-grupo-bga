// Logica pura de escala salarial (F7). Extraida de App.tsx para poder testearla.
// Sin estado ni dependencias de UI: recibe las filas de escala como argumento.
import type { ScaleRow } from "./types";

// Devuelve la fila de escala para una categoria en un mes dado.
// Fallback (fix F7): si no hay escala del mes pedido, usa el ultimo mes cargado
// para esa categoria (preferentemente anterior o igual al mes pedido) en vez de
// devolver null/0, que rompia el calculo del valor hora.
// La categoria se compara sin acentos, mayusculas ni espacios de mas: "Oficial Múltiple " y "oficial
// multiple" son la misma (si no, la escala no aparecia y el valor hora quedaba en 0).
export const normalizarCategoria = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const getScaleForCategory = (
  scaleRows: ScaleRow[],
  category: string,
  month: string
): ScaleRow | null => {
  const cat = normalizarCategoria(category);
  const exact = scaleRows.find(
    (row) => row.month === month && normalizarCategoria(row.category) === cat
  );
  if (exact) return exact;
  const forCategory = scaleRows
    .filter((row) => normalizarCategoria(row.category) === cat)
    .sort((a, b) => a.month.localeCompare(b.month));
  if (forCategory.length === 0) return null;
  const notFuture = forCategory.filter((row) => row.month <= month);
  return notFuture.length > 0
    ? notFuture[notFuture.length - 1]
    : forCategory[forCategory.length - 1];
};
