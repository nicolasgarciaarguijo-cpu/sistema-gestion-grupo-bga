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
export const PER_COMPANY_MODULE_FIELDS: Record<string, readonly string[]> = {
  archivos: ["companyAssets"],
  "caja-chica": ["pettyCashExpenses", "pettyCashFunds"],
  "cash-flow": ["debtPlans", "financialItems"],
  compras: ["purchaseInvoices"],
  "historial-crm": ["savedBudgets"],
  personal: ["employees"],
  "stock-costos": ["costAnalysisGroups", "stockItems"],
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

// Devuelve el "bucket" (empresa conocida o General) al que pertenece un item.
// Items sin company, con 'General', o con una empresa no escribible -> General.
export const bucketCompany = (
  rawCompany: unknown,
  writableCompanies: readonly string[]
): string => {
  if (typeof rawCompany === "string" && rawCompany !== GENERAL_COMPANY) {
    if (writableCompanies.includes(rawCompany)) return rawCompany;
  }
  return GENERAL_COMPANY;
};

// Estado plano de un modulo -> { empresa: dataParcial }.
// Emite SIEMPRE un bucket por cada empresa escribible + General (con arrays vacios si
// hace falta), para que los borrados persistan al hacer upsert. No emite buckets de
// empresas fuera de `writableCompanies`, asi un usuario restringido nunca pisa filas
// de otras empresas.
export const splitModuleDataByCompany = (
  moduleKey: string,
  data: ModuleData,
  writableCompanies: readonly string[]
): Record<string, ModuleData> => {
  const perCompany = perCompanyFieldsFor(moduleKey);
  const buckets: Record<string, ModuleData> = {};
  const targets = [...writableCompanies, GENERAL_COMPANY];
  for (const company of targets) buckets[company] = {};

  for (const [field, value] of Object.entries(data)) {
    if (perCompany.includes(field) && Array.isArray(value)) {
      // Inicializa el campo como [] en cada bucket destino (persistir borrados).
      for (const company of targets) (buckets[company][field] as Item[]) = [];
      for (const item of value as Item[]) {
        const company = bucketCompany((item as Item)?.company, writableCompanies);
        (buckets[company][field] as Item[]).push(item);
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
