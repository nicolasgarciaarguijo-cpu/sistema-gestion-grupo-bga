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
