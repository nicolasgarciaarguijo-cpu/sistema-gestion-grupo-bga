import { buildCrmRows, normalizeClientName, deriveClientsFromHistory, findClientByName } from "./clients";
import type { CrmClient } from "./types";

const short = (c: string) => c;

const sb = (over: any = {}) => ({
  id: over.id ?? 1,
  client: over.client ?? "Juan Perez",
  clientId: over.clientId,
  company: over.company ?? "BGA",
  date: over.date ?? "2026-01-01",
  revisionNumber: over.revisionNumber ?? 1,
  snapshot: { budget: { clientTaxId: "", contactName: "", contactPhone: "", contactEmail: "", clientNotes: "", ...(over.snap || {}) } },
});

const client = (over: Partial<CrmClient> = {}): CrmClient => ({
  id: 100,
  name: "Juan Perez",
  taxId: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
  company: "BGA",
  createdAt: "2026-01-01",
  ...over,
});

describe("normalizeClientName", () => {
  it("normaliza espacios y mayusculas", () => {
    expect(normalizeClientName("  Juan  PEREZ ")).toBe("juan  perez");
  });
});

describe("buildCrmRows (sin clientes-entidad = comportamiento historico)", () => {
  it("agrupa presupuestos por nombre", () => {
    const rows = buildCrmRows({
      savedBudgets: [sb({ id: 1 }), sb({ id: 2, date: "2026-02-01" })],
      approvedJobs: [],
      clients: [],
      getCompanyShort: short,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].quotes).toHaveLength(2);
    expect(rows[0].customerType).toBe("Cliente habitual"); // >1 cotizacion
    expect(rows[0].key.startsWith("n:")).toBe(true);
    expect(rows[0].isStandalone).toBe(false);
  });

  it("un solo presupuesto = nuevo cliente", () => {
    const rows = buildCrmRows({ savedBudgets: [sb()], approvedJobs: [], clients: [], getCompanyShort: short });
    expect(rows[0].customerType).toBe("Nuevo cliente");
    expect(rows[0].bought).toBe(false);
  });

  it("bought y totalSpent desde trabajos aprobados", () => {
    const rows = buildCrmRows({
      savedBudgets: [sb()],
      approvedJobs: [{ client: "Juan Perez", soldGrossPrice: 1000 }, { client: "Juan Perez", soldGrossPrice: 500 }],
      clients: [],
      getCompanyShort: short,
    });
    expect(rows[0].bought).toBe(true);
    expect(rows[0].totalSpent).toBe(1500);
    expect(rows[0].customerType).toBe("Cliente habitual"); // approvedCount>0
  });
});

describe("findClientByName", () => {
  const list = [client({ id: 1, name: "Juan Perez" }), client({ id: 2, name: "Ana Gomez" })];
  it("encuentra ignorando mayusculas y espacios de los extremos", () => {
    expect(findClientByName(list, "JUAN PEREZ")?.id).toBe(1);
    expect(findClientByName(list, "  ana gomez  ")?.id).toBe(2);
  });
  it("null si no hay match o nombre vacio", () => {
    expect(findClientByName(list, "Nadie")).toBeNull();
    expect(findClientByName(list, "")).toBeNull();
  });
});

describe("deriveClientsFromHistory", () => {
  let n = 0;
  const makeId = () => ++n;
  beforeEach(() => {
    n = 0;
  });

  it("un cliente por nombre normalizado distinto, contacto del presupuesto mas reciente", () => {
    const derived = deriveClientsFromHistory(
      [
        sb({ id: 1, client: "Juan Perez", date: "2026-01-01", snap: { contactPhone: "111" } }),
        sb({ id: 2, client: "JUAN PEREZ", date: "2026-05-01", snap: { contactPhone: "222" } }),
        sb({ id: 3, client: "Ana Gomez", date: "2026-03-01" }),
      ],
      [],
      makeId
    );
    expect(derived).toHaveLength(2);
    const juan = derived.find((c) => normalizeClientName(c.name) === "juan perez")!;
    expect(juan.contactPhone).toBe("222"); // el mas reciente
    expect(juan.id).toBeGreaterThan(0);
  });

  it("incluye clientes que solo tienen trabajos aprobados", () => {
    const derived = deriveClientsFromHistory([], [{ client: "Solo Trabajo", company: "BGA" }], makeId);
    expect(derived).toHaveLength(1);
    expect(derived[0].name).toBe("Solo Trabajo");
  });
});

describe("buildCrmRows (clientes como fuente de verdad)", () => {
  it("un cliente sin presupuestos aparece igual (alta standalone)", () => {
    const rows = buildCrmRows({ savedBudgets: [], approvedJobs: [], clients: [client()], getCompanyShort: short });
    expect(rows).toHaveLength(1);
    expect(rows[0].isStandalone).toBe(true);
    expect(rows[0].key).toBe("c:100");
    expect(rows[0].quotes).toHaveLength(0);
  });

  it("matchea por nombre cuando el presupuesto no tiene clientId (fallback)", () => {
    const rows = buildCrmRows({
      savedBudgets: [sb({ client: "juan perez" })],
      approvedJobs: [],
      clients: [client({ taxId: "20-1-3" })],
      getCompanyShort: short,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("c:100");
    expect(rows[0].quotes).toHaveLength(1);
    expect(rows[0].clientTaxId).toBe("20-1-3"); // el cliente-entidad manda
  });

  it("matchea por clientId (vinculo primario)", () => {
    const rows = buildCrmRows({
      savedBudgets: [sb({ client: "Nombre Viejo Distinto", clientId: 100 })],
      approvedJobs: [],
      clients: [client()],
      getCompanyShort: short,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].clientId).toBe(100);
    expect(rows[0].client).toBe("Juan Perez"); // nombre del cliente-entidad
    expect(rows[0].quotes).toHaveLength(1);
  });
});
