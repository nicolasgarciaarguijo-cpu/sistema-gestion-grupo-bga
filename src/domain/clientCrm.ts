// Consolida los presupuestos guardados en una fila POR CLIENTE, para exportar al CRM.
//
// Trampa que evita este modulo: un mismo presupuesto (mismo `number`) tiene varias revisiones y
// puede figurar en varios estados. Sumar todas contaria la misma venta dos o tres veces. Por eso
// primero se colapsa cada presupuesto a su ULTIMA revision (mayor revisionNumber) y recien despues
// se agrupa por cliente. Asi "monto aprobado" es plata real, no la suma de los borradores.
//
// El cliente se agrupa normalizado (trim + mayusculas) para que "Bea" y "BEA " sean el mismo, pero
// se muestra con el texto de su presupuesto mas reciente. Puro y testeado.

export type CrmBudgetInput = {
  number: string;
  client: string;
  project: string;
  date: string; // "yyyy-mm-dd"
  status: string; // "borrador" | "aprobado" | "no_aprobado" | ...
  revisionNumber?: number;
  finalPrice?: number;
  company?: string;
};

export type ClientCrmRow = {
  client: string; // texto tal cual el presupuesto mas reciente
  companies: string[];
  projects: string[]; // proyectos distintos, del mas nuevo al mas viejo
  lastDate: string; // "yyyy-mm-dd"
  budgetsCount: number;
  approvedCount: number;
  approvedAmount: number;
  stage: string; // etapa derivada para el CRM
};

const APPROVED = "aprobado";
const REJECTED = "no_aprobado";

const clientKey = (client: string) => client.trim().toUpperCase();
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Etapa para el CRM a partir de los estados de los presupuestos del cliente.
function deriveStage(statuses: string[]): string {
  if (statuses.some((s) => s === APPROVED)) return "Ganado";
  if (statuses.length > 0 && statuses.every((s) => s === REJECTED)) return "Perdido";
  return "En presupuesto";
}

export function buildClientCrmRows(budgets: CrmBudgetInput[]): ClientCrmRow[] {
  // 1) Colapsar cada presupuesto a su ultima revision. La clave es cliente|numero (NO la empresa):
  // el mismo presupuesto a veces esta guardado en las dos empresas (misma venta, doble carga) y no
  // debe contarse dos veces. Se incluye el cliente en la clave para no fusionar por accidente dos
  // presupuestos distintos que compartan numero entre empresas.
  const latestByBudget = new Map<string, CrmBudgetInput>();
  budgets.forEach((budget) => {
    const number = (budget.number || "").trim();
    if (!number) return; // sin numero no es un presupuesto identificable
    const key = `${clientKey(budget.client || "")}|${number}`;
    const prev = latestByBudget.get(key);
    if (!prev || num(budget.revisionNumber) >= num(prev.revisionNumber)) {
      latestByBudget.set(key, budget);
    }
  });

  // 2) Agrupar los presupuestos (ya deduplicados) por cliente.
  type Acc = {
    display: string;
    displayDate: string; // fecha del presupuesto que aporta el texto del nombre
    companies: Set<string>;
    projects: Array<{ name: string; date: string }>;
    lastDate: string;
    statuses: string[];
    budgetsCount: number;
    approvedCount: number;
    approvedAmount: number;
  };
  const byClient = new Map<string, Acc>();

  Array.from(latestByBudget.values()).forEach((budget) => {
    const key = clientKey(budget.client || "");
    if (!key) return; // sin cliente no va al CRM
    const date = (budget.date || "").trim();
    const acc =
      byClient.get(key) ||
      ({
        display: budget.client.trim(),
        displayDate: date,
        companies: new Set<string>(),
        projects: [],
        lastDate: "",
        statuses: [],
        budgetsCount: 0,
        approvedCount: 0,
        approvedAmount: 0,
      } as Acc);

    // El nombre visible es el del presupuesto mas reciente.
    if (date >= acc.displayDate) {
      acc.display = budget.client.trim();
      acc.displayDate = date;
    }
    if (budget.company) acc.companies.add(budget.company);
    const project = (budget.project || "").trim();
    if (project) acc.projects.push({ name: project, date });
    if (date > acc.lastDate) acc.lastDate = date;
    acc.statuses.push(budget.status);
    acc.budgetsCount += 1;
    if (budget.status === APPROVED) {
      acc.approvedCount += 1;
      acc.approvedAmount += num(budget.finalPrice);
    }

    byClient.set(key, acc);
  });

  // 3) Armar las filas finales.
  const rows: ClientCrmRow[] = Array.from(byClient.values()).map((acc) => {
    // Proyectos distintos, del mas nuevo al mas viejo, sin repetir.
    const seen = new Set<string>();
    const projects: string[] = [];
    acc.projects
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((p) => {
        const norm = p.name.toUpperCase();
        if (seen.has(norm)) return;
        seen.add(norm);
        projects.push(p.name);
      });

    return {
      client: acc.display,
      companies: Array.from(acc.companies).sort(),
      projects,
      lastDate: acc.lastDate,
      budgetsCount: acc.budgetsCount,
      approvedCount: acc.approvedCount,
      approvedAmount: acc.approvedAmount,
      stage: deriveStage(acc.statuses),
    };
  });

  // Orden: primero los que mas plata metieron, despues por nombre.
  rows.sort((a, b) => {
    if (b.approvedAmount !== a.approvedAmount) return b.approvedAmount - a.approvedAmount;
    return a.client.localeCompare(b.client);
  });

  return rows;
}
