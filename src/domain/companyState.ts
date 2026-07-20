// Logica pura de particionado del estado por empresa (Fase 4 del aislamiento).
// Extraida para poder testearla sin Supabase ni UI.
//
// El estado en memoria es plano: cada campo de un modulo es o bien un ARRAY de items
// (cada item lleva su propio `company`) o un valor GLOBAL (catalogos, configuracion).
// En `app_state_modules_v2` se guarda una fila por (module_key, company); esta logica
// convierte entre ambas representaciones:
//   - splitModuleDataByCompany: estado plano  -> { empresa: data } para escribir.
//   - mergeModuleDataByCompany: filas por empresa -> estado plano para cargar.
//   - applyCompanyModuleSlice: reemplaza la porcion de UNA empresa (realtime).
//
// IMPORTANTE: PER_COMPANY_MODULE_FIELDS debe coincidir con `per_company_keys` del
// splitter SQL (supabase/fase2-3-aislamiento-por-empresa.sql, app_split_module_into_v2).

export const GENERAL_COMPANY = "General";

// module_key -> campos que son arrays de items a separar por item.company.
// Cualquier otro campo del modulo es global y vive en la fila 'General'.
// La lista cubre TODOS los campos cuyos items llevan `company` (verificado contra los
// datos reales), incluso los que hoy estan vacios (bankStatementEntries, remitoDrafts,
// costAnalysisEntries) para que no filtren cuando se empiecen a usar.
// DEBE coincidir con `per_company_keys` del splitter SQL.
export const PER_COMPANY_MODULE_FIELDS: Record<string, readonly string[]> = {
  archivos: ["companyAssets"],
  "caja-chica": ["pettyCashExpenses", "pettyCashFunds"],
  "cash-flow": ["debtPlans", "financialItems", "bankStatementEntries"],
  compras: ["purchaseInvoices", "remitoDrafts"],
  // Costos: los gastos van por empresa; los grupos tambien (cada empresa arma los suyos).
  // Modulo nuevo (2026-07-14): no necesita entrada en el splitter SQL porque no hay datos
  // legacy en app_state_modules que partir; el frontend escribe v2 directo.
  costos: ["costEntries", "costGroups"],
  // Cada factura emitida es de la empresa que la emitio.
  "facturas-emitidas": ["issuedInvoices"],
  "historial-crm": ["savedBudgets"],
  // Marcadores aislados por empresa (decision 2026-06-17; reversible si F3 los comparte).
  marcadores: [
    "fixedMarkers",
    "supplyMarkers",
    "laborMarkers",
    "personalProvisionMarkers",
  ],
  personal: ["employees"],
  "stock-costos": ["costAnalysisGroups", "stockItems", "costAnalysisEntries"],
  "trabajos-aprobados": ["approvedJobs"],
};

type ModuleData = Record<string, unknown>;
type Item = Record<string, unknown>;

const perCompanyFieldsFor = (moduleKey: string): readonly string[] =>
  PER_COMPANY_MODULE_FIELDS[moduleKey] ?? [];

// Empresa "propia" de un item tal cual viene (sin colapsar contra una lista):
// vacio/ausente -> General; cualquier otro string -> ese mismo valor.
const itemOwnCompany = (item: Item): string => {
  const company = (item as Item)?.company;
  return typeof company === "string" && company !== "" ? company : GENERAL_COMPANY;
};

// Estado plano de un modulo -> { empresa: dataParcial }, listo para escribir 1 fila
// por empresa. Cada item se agrupa por SU PROPIA empresa (itemOwnCompany). Solo se
// emiten filas para `writableCompanies` + General (siempre, con arrays vacios si hace
// falta, para que los borrados persistan al hacer upsert). Los items de empresas NO
// escribibles se descartan en vez de colapsarse a General (asi un usuario restringido
// nunca contamina datos compartidos; RLS rechazaria esas filas de todos modos).
export const splitModuleDataByCompany = (
  moduleKey: string,
  data: ModuleData,
  writableCompanies: readonly string[]
): Record<string, ModuleData> => {
  const perCompany = perCompanyFieldsFor(moduleKey);
  const emit = Array.from(new Set([...writableCompanies, GENERAL_COMPANY]));
  const emitSet = new Set(emit);
  const buckets: Record<string, ModuleData> = {};
  for (const company of emit) buckets[company] = {};

  for (const [field, value] of Object.entries(data)) {
    if (perCompany.includes(field) && Array.isArray(value)) {
      // Inicializa el campo como [] en cada bucket emitido (persistir borrados).
      for (const company of emit) (buckets[company][field] as Item[]) = [];
      for (const item of value as Item[]) {
        const own = itemOwnCompany(item);
        if (emitSet.has(own)) (buckets[own][field] as Item[]).push(item);
        // else: item de empresa no escribible -> se descarta.
      }
    } else {
      // Campo global -> siempre a General.
      buckets[GENERAL_COMPANY][field] = value;
    }
  }

  return buckets;
};

// Filas por empresa -> estado plano de un modulo.
// Campos por-empresa: concatena los items de todas las filas (BGA + De Raiz + General).
// Campos globales: gana la fila 'General' (fallback: la primera que lo traiga).
export const mergeModuleDataByCompany = (
  moduleKey: string,
  rows: ReadonlyArray<{ company: string; data: ModuleData }>
): ModuleData => {
  const perCompany = perCompanyFieldsFor(moduleKey);
  const merged: ModuleData = {};

  for (const { company, data } of rows) {
    for (const [field, value] of Object.entries(data)) {
      if (perCompany.includes(field) && Array.isArray(value)) {
        if (!Array.isArray(merged[field])) merged[field] = [];
        (merged[field] as Item[]).push(...(value as Item[]));
      } else if (company === GENERAL_COMPANY || !(field in merged)) {
        merged[field] = value;
      }
    }
  }

  return merged;
};

// Realtime: reemplaza SOLO la porcion de `company` dentro del estado ya mergeado,
// sin pisar los items de las demas empresas (corrige el merge que reemplazaba el
// modulo entero). `incoming` es el data de la fila (module_key, company) que cambio.
export const applyCompanyModuleSlice = (
  moduleKey: string,
  currentData: ModuleData,
  company: string,
  incoming: ModuleData
): ModuleData => {
  const perCompany = perCompanyFieldsFor(moduleKey);
  const next: ModuleData = { ...currentData };

  for (const field of perCompany) {
    const existing = Array.isArray(next[field]) ? (next[field] as Item[]) : [];
    const others = existing.filter((item) => itemOwnCompany(item) !== company);
    const incomingItems = Array.isArray(incoming[field]) ? (incoming[field] as Item[]) : [];
    // Solo reescribe el campo si la fila entrante lo incluye (evita borrar por omision).
    if (field in incoming) {
      next[field] = [...others, ...incomingItems];
    }
  }

  if (company === GENERAL_COMPANY) {
    for (const [field, value] of Object.entries(incoming)) {
      if (!perCompany.includes(field)) next[field] = value;
    }
  }

  return next;
};
