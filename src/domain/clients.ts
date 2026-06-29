import type { CrmClient } from "./types";

// Clave normalizada de un nombre de cliente (para matchear sin importar mayúsculas/espacios).
export const normalizeClientName = (text: string): string => (text || "").trim().toLowerCase();

// Busca un cliente-entidad por nombre normalizado (para el typeahead/autocompletado).
export function findClientByName(clients: CrmClient[], name: string): CrmClient | null {
  const nk = normalizeClientName(name);
  if (!nk) return null;
  return clients.find((c) => normalizeClientName(c.name) === nk) || null;
}

export type CrmRow = {
  key: string; // identidad de fila para la UI (c:<id> si hay cliente, n:<nombre> si no)
  clientId?: number;
  client: string;
  clientTaxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientNotes: string;
  quotes: any[];
  approvedCount: number;
  totalSpent: number;
  companyLabels: string[];
  latestQuote: any | null;
  customerType: "Cliente habitual" | "Nuevo cliente";
  bought: boolean;
  isStandalone: boolean; // tiene registro de cliente (entidad), no solo derivado de presupuestos
};

type Accum = {
  key: string;
  clientId?: number;
  client: string;
  clientTaxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientNotes: string;
  quotes: any[];
  companyLabels: string[];
  isStandalone: boolean;
};

// Lista del CRM con los CLIENTES como fuente de verdad: combina los clientes-entidad con los
// derivados de presupuestos. Vínculo primario por clientId; fallback por nombre normalizado
// (datos viejos sin clientId no se pierden). Si clients=[], el resultado es equivalente al
// agrupado por nombre histórico.
// Migración idempotente: deriva clientes-entidad del historial (uno por nombre normalizado),
// tomando contacto del presupuesto más reciente. makeId genera los ids estables (impuro afuera).
export function deriveClientsFromHistory(
  savedBudgets: any[],
  approvedJobs: any[],
  makeId: () => number
): CrmClient[] {
  const latestByName = new Map<string, any>();
  savedBudgets.forEach((b) => {
    const k = normalizeClientName(b.client);
    if (!k) return;
    const prev = latestByName.get(k);
    if (!prev || (b.date || "").localeCompare(prev.date || "") > 0) latestByName.set(k, b);
  });

  const byName = new Map<string, CrmClient>();
  latestByName.forEach((b, k) => {
    const snap = b.snapshot?.budget || {};
    byName.set(k, {
      id: makeId(),
      name: b.client,
      taxId: snap.clientTaxId || "",
      contactName: snap.contactName || "",
      contactPhone: snap.contactPhone || "",
      contactEmail: snap.contactEmail || "",
      notes: snap.clientNotes || "",
      company: b.company,
      createdAt: b.date || "",
    });
  });

  approvedJobs.forEach((j) => {
    const k = normalizeClientName(j.client);
    if (!k || byName.has(k)) return;
    byName.set(k, {
      id: makeId(),
      name: j.client,
      taxId: j.taxId || "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
      company: j.company,
      createdAt: j.approvalDate || j.date || "",
    });
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildCrmRows(params: {
  savedBudgets: any[];
  approvedJobs: any[];
  clients: CrmClient[];
  getCompanyShort: (company: string) => string;
}): CrmRow[] {
  const { savedBudgets, approvedJobs, clients, getCompanyShort } = params;

  const clientById = new Map<number, CrmClient>();
  const clientByName = new Map<string, CrmClient>();
  clients.forEach((c) => {
    clientById.set(c.id, c);
    const nk = normalizeClientName(c.name);
    if (!clientByName.has(nk)) clientByName.set(nk, c);
  });

  const resolveClient = (clientId: unknown, name: string): CrmClient | null => {
    if (typeof clientId === "number" && clientById.has(clientId)) return clientById.get(clientId)!;
    return clientByName.get(normalizeClientName(name)) || null;
  };
  const groupKey = (c: CrmClient | null, name: string) =>
    c ? `c:${c.id}` : `n:${normalizeClientName(name)}`;

  const groups = new Map<string, Accum>();

  // Asegura una fila por cada cliente-entidad (aunque no tenga presupuestos).
  clients.forEach((c) => {
    const key = `c:${c.id}`;
    groups.set(key, {
      key,
      clientId: c.id,
      client: c.name,
      clientTaxId: c.taxId || "",
      contactName: c.contactName || "",
      contactPhone: c.contactPhone || "",
      contactEmail: c.contactEmail || "",
      clientNotes: c.notes || "",
      quotes: [],
      companyLabels: c.company ? [getCompanyShort(c.company)] : [],
      isStandalone: true,
    });
  });

  savedBudgets.forEach((item) => {
    const c = resolveClient(item.clientId, item.client);
    const key = groupKey(c, item.client);
    const snap = item.snapshot?.budget || {};
    const current =
      groups.get(key) ||
      ({
        key,
        clientId: c?.id,
        client: c?.name || item.client,
        clientTaxId: snap.clientTaxId || "",
        contactName: snap.contactName || "",
        contactPhone: snap.contactPhone || "",
        contactEmail: snap.contactEmail || "",
        clientNotes: snap.clientNotes || "",
        quotes: [],
        companyLabels: [],
        isStandalone: !!c,
      } as Accum);

    current.quotes.push(item);
    // El cliente-entidad manda; si no, se completan los vacíos desde el presupuesto.
    if (!current.isStandalone) {
      if (!current.clientTaxId) current.clientTaxId = snap.clientTaxId || "";
      if (!current.contactName) current.contactName = snap.contactName || "";
      if (!current.contactPhone) current.contactPhone = snap.contactPhone || "";
      if (!current.contactEmail) current.contactEmail = snap.contactEmail || "";
      if (!current.clientNotes) current.clientNotes = snap.clientNotes || "";
    }
    current.companyLabels = Array.from(
      new Set([...current.companyLabels, getCompanyShort(item.company)])
    );
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((row) => {
      const approvedForRow = approvedJobs.filter((job) => {
        const jc = resolveClient(job.clientId, job.client);
        return groupKey(jc, job.client) === row.key;
      });
      const approvedCount = approvedForRow.length;
      const totalSpent = approvedForRow.reduce(
        (acc, job) => acc + Number(job.soldGrossPrice || 0),
        0
      );
      const quotes = [...row.quotes].sort((a, b) => {
        const byDate = (b.date || "").localeCompare(a.date || "");
        if (byDate !== 0) return byDate;
        return (b.revisionNumber || 1) - (a.revisionNumber || 1);
      });
      return {
        ...row,
        quotes,
        approvedCount,
        totalSpent,
        latestQuote: quotes[0] || null,
        customerType:
          quotes.length > 1 || approvedCount > 0
            ? ("Cliente habitual" as const)
            : ("Nuevo cliente" as const),
        bought: approvedCount > 0,
      };
    })
    .sort((a, b) => a.client.localeCompare(b.client));
}
