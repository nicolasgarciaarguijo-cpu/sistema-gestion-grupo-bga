// Liga un material (de un presupuesto) con su item de stock. Vinculo PRIMARIO por codigo
// (material.stockCode) y, si no hay codigo o no matchea, fallback por descripcion. Puro.
// Las claves de los mapas estan normalizadas (trim + minusculas).

export function matchStockForMaterial(
  material: { stockCode?: string; description?: string },
  byCode: Map<string, any>,
  byDescription: Map<string, any>
): any {
  const code = (material.stockCode || "").trim().toLowerCase();
  if (code) {
    const byCodeMatch = byCode.get(code);
    if (byCodeMatch) return byCodeMatch;
  }
  const desc = (material.description || "").trim().toLowerCase();
  return byDescription.get(desc) || null;
}

// Nueva cantidad de stock tras un movimiento (entrada suma, salida resta, nunca negativo). Pura.
export function applyStockMovement(
  currentQty: number,
  type: "entrada" | "salida",
  qty: number
): number {
  const delta = type === "entrada" ? Number(qty || 0) : -Number(qty || 0);
  return Math.max(0, Number(currentQty || 0) + delta);
}
