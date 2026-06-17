// Logica pura de escala salarial (F7). Extraida de App.tsx para poder testearla.
// Sin estado ni dependencias de UI: recibe las filas de escala como argumento.
import type { ScaleRow } from "./types";

// Devuelve la fila de escala para una categoria en un mes dado.
// Fallback (fix F7): si no hay escala del mes pedido, usa el ultimo mes cargado
// para esa categoria (preferentemente anterior o igual al mes pedido) en vez de
// devolver null/0, que rompia el calculo del valor hora.
export const getScaleForCategory = (
  scaleRows: ScaleRow[],
  category: string,
  month: string
): ScaleRow | null => {
  const cat = category.toLowerCase();
  const exact = scaleRows.find(
    (row) => row.month === month && row.category.toLowerCase() === cat
  );
  if (exact) return exact;
  const forCategory = scaleRows
    .filter((row) => row.category.toLowerCase() === cat)
    .sort((a, b) => a.month.localeCompare(b.month));
  if (forCategory.length === 0) return null;
  const notFuture = forCategory.filter((row) => row.month <= month);
  return notFuture.length > 0
    ? notFuture[notFuture.length - 1]
    : forCategory[forCategory.length - 1];
};
