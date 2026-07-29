// Motor de reglas de clasificación de gastos CON MEMORIA.
//
// Idea (pedido del usuario 2026-07-28): al clasificar un gasto a un grupo se aprende una regla, y el
// próximo gasto "del mismo tipo" SUGIERE ese grupo. Nunca lo aplica solo — el usuario confirma
// (sugiere-y-confirmá). Match por proveedor (más confiable) > palabra clave del concepto > monto.
//
// Ambigüedad: un proveedor puede dar 2 tipos de gasto distintos. Si un mismo criterio se clasificó a
// MÁS DE UN grupo, la regla queda `ambiguous` y deja de sugerir (obliga a clasificar a mano). Ante la
// duda, manual: es exactamente lo que pidió el usuario.
//
// Puro y testeado: solo texto/aritmética, sin estado ni fechas del sistema.

import { normalizeText } from "./suppliers";
import type { CostRule, CostRuleMatchType } from "./types";

export type CostClassifyInput = {
  company: string;
  concept: string;
  supplierId?: number | null;
  amount?: number | null;
};

export type CostRuleSuggestion = {
  group: string;
  via: CostRuleMatchType;
  ruleId: number;
};

// Palabras genéricas del banco/administración que NO sirven como clave (matchearían en cualquier lado).
const STOP_WORDS = new Set([
  "de", "la", "el", "los", "las", "del", "por", "para", "con", "sin", "y", "a", "en", "su",
  "sa", "srl", "s", "varios", "var", "fac", "factura", "pago", "cobro", "recibido", "realizada",
  "transferencia", "transf", "online", "banking", "emp", "debito", "credito", "cuenta", "banco",
  "ref", "cuo", "cci", "hs", "partic", "e",
  // mecánica bancaria/administrativa: describe CÓMO se movió la plata, no QUÉ gasto es. Se filtra
  // para que gane el token distintivo (el nombre del proveedor / la naturaleza del gasto).
  "automatico", "proveedores", "inmediata", "servicio", "servicios", "haberes", "clearing", "echeq",
  "deposito", "efvo", "suc", "acreditac", "sueldos", "camara", "compensadora", "terceros", "bco",
  "ebank", "propia", "adelanto", "reg", "alic", "reducida", "general", "percep",
]);

// Deriva una palabra clave distintiva del concepto: el token normalizado más largo (más específico)
// que no sea genérico ni un número. "" si no hay ninguno útil.
export function deriveKeyword(concept: string): string {
  const tokens = normalizeText(concept || "")
    .split(" ")
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t) && !/^\d+$/.test(t));
  if (tokens.length === 0) return "";
  return tokens.slice().sort((a, b) => b.length - a.length)[0];
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const appliesToCompany = (ruleCompany: string, company: string): boolean =>
  ruleCompany === "General" || ruleCompany === company;

// Monto: match exacto o dentro de una tolerancia chica (servicios de importe casi fijo).
const AMOUNT_TOL_PCT = 0.005;
const amountMatches = (ruleValue: string, amount: number): boolean => {
  const target = num(ruleValue);
  if (target <= 0 || amount <= 0) return false;
  return Math.abs(target - amount) <= Math.max(0.01, target * AMOUNT_TOL_PCT);
};

// Sugerencia de grupo para un gasto. Prioridad: proveedor > palabra clave > monto. Dentro del tipo de
// mayor prioridad que matchee: si todas las reglas coinciden en el grupo, lo sugiere; si NO coinciden,
// devuelve null (ambiguo → clasificación manual). Las reglas `ambiguous` o inactivas no participan.
export function suggestGroupFromRules(
  input: CostClassifyInput,
  rules: CostRule[]
): CostRuleSuggestion | null {
  const norm = normalizeText(input.concept || "");
  const usable = (rules || []).filter(
    (r) => r.active !== false && !r.ambiguous && appliesToCompany(r.company, input.company)
  );

  const supplierMatches =
    input.supplierId != null
      ? usable.filter((r) => r.matchType === "supplier" && r.matchValue === String(input.supplierId))
      : [];
  const keywordMatches = usable.filter(
    (r) => r.matchType === "keyword" && r.matchValue && norm.includes(r.matchValue)
  );
  const monto = num(input.amount);
  const amtMatches =
    monto > 0 ? usable.filter((r) => r.matchType === "amount" && amountMatches(r.matchValue, monto)) : [];

  const byType: Array<[CostRuleMatchType, CostRule[]]> = [
    ["supplier", supplierMatches],
    ["keyword", keywordMatches],
    ["amount", amtMatches],
  ];

  for (const [via, matches] of byType) {
    if (matches.length === 0) continue;
    const groups = Array.from(new Set(matches.map((m) => m.group)));
    if (groups.length > 1) return null; // desacuerdo en el mismo criterio → manual
    // gana la regla con más confirmaciones (para el ruleId de referencia)
    const best = matches.slice().sort((a, b) => num(b.hits) - num(a.hits))[0];
    return { group: groups[0], via, ruleId: best.id };
  }
  return null;
}

export type LearnResult = {
  rules: CostRule[];
  learned: CostRule | null; // regla creada o reforzada (null si no se aprendió nada)
  becameAmbiguous: boolean; // true si el criterio pasó a ambiguo por un conflicto de grupo
};

// Aprende (o refuerza) una regla a partir de una clasificación confirmada por el usuario. Elige la
// clave más confiable disponible: proveedor si lo hay, si no una palabra clave del concepto. NO
// aprende reglas por monto automáticamente (ruidoso); esas se crean a mano en el panel.
//   - clave nueva            -> crea la regla (hits 1).
//   - misma clave, mismo grupo -> hits++ (refuerza).
//   - misma clave, OTRO grupo -> marca `ambiguous` (deja de sugerir; pide manual).
export function learnCostRule(
  rules: CostRule[],
  input: { company: string; group: string; concept: string; supplierId?: number | null; amount?: number | null },
  nextId: number
): LearnResult {
  const group = String(input.group || "").trim();
  if (!group) return { rules, learned: null, becameAmbiguous: false };

  let matchType: CostRuleMatchType;
  let matchValue: string;
  if (input.supplierId != null) {
    matchType = "supplier";
    matchValue = String(input.supplierId);
  } else {
    const kw = deriveKeyword(input.concept);
    if (!kw) return { rules, learned: null, becameAmbiguous: false };
    matchType = "keyword";
    matchValue = kw;
  }

  const existing = (rules || []).find(
    (r) => r.company === input.company && r.matchType === matchType && r.matchValue === matchValue
  );

  if (existing) {
    if (existing.group === group) {
      const bumped = { ...existing, hits: num(existing.hits) + 1, active: true, ambiguous: false };
      return {
        rules: rules.map((r) => (r.id === existing.id ? bumped : r)),
        learned: bumped,
        becameAmbiguous: false,
      };
    }
    // mismo criterio, otro grupo: ambiguo (no volver a sugerir hasta que el usuario lo resuelva)
    return {
      rules: rules.map((r) => (r.id === existing.id ? { ...r, ambiguous: true } : r)),
      learned: null,
      becameAmbiguous: true,
    };
  }

  const rule: CostRule = {
    id: nextId,
    company: input.company as CostRule["company"],
    matchType,
    matchValue,
    group,
    ambiguous: false,
    hits: 1,
    active: true,
    notes: "",
  };
  return { rules: [...rules, rule], learned: rule, becameAmbiguous: false };
}
