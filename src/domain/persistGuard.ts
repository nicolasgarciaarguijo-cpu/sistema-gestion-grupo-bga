// Guard anti-pérdida de datos (segunda línea de defensa, además del guard por hidratación).
// Cuenta los ítems de las colecciones con datos reales del estado persistido. Si un guardado
// queda COMPLETAMENTE vacío habiendo tenido contenido antes, lo bloqueamos: nunca se
// sobrescriben los datos buenos con un estado vacío (lo que paso en el incidente 2026-06-18).
// Puro: sin estado ni efectos, testeable.

export const PERSIST_CONTENT_KEYS = [
  "savedBudgets",
  "approvedJobs",
  "financialItems",
  "purchaseInvoices",
  "pettyCashFunds",
  "pettyCashExpenses",
  "debtPlans",
  "bankStatementEntries",
  "stockItems",
  "costAnalysisGroups",
  "costAnalysisEntries",
  "companyAssets",
  "employees",
  "scaleRows",
  "fixedMarkers",
  "supplyMarkers",
  "laborMarkers",
  "personalProvisionMarkers",
  "materials",
  "labor",
  "fixedCosts",
  "basicSupplies",
  "subBudgets",
] as const;

// Suma la cantidad de ítems en todas las colecciones con datos del estado persistido.
export function countPersistedContent(data: Record<string, unknown> | null | undefined): number {
  if (!data) return 0;
  return PERSIST_CONTENT_KEYS.reduce((acc, key) => {
    const value = (data as Record<string, unknown>)[key];
    return acc + (Array.isArray(value) ? value.length : 0);
  }, 0);
}

// True si el nuevo estado quedó vacío habiendo tenido contenido => hay que BLOQUEAR el guardado.
// No bloquea el caso legítimo de un usuario nuevo sin datos (prev 0 -> next 0).
export function isEmptyOverwrite(prevContentCount: number, nextContentCount: number): boolean {
  return prevContentCount > 0 && nextContentCount === 0;
}
