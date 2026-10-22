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

describe("clientes para cotizar (2026-10-22)", () => {
  const { clientesParaCotizar, filtrarClientes } = require("./clients");
  const crm = [{ id: 1, name: "Estudio Pérez", taxId: "", contactName: "Ana", contactPhone: "", contactEmail: "", notes: "", company: "BGA", createdAt: "" }];
  const budgets = [
    { client: "Estudio Pérez", date: "2026-05-01", number: "P-3100", project: "Cocina", snapshot: { budget: { contactPhone: "11 5555-1234" } } },
    { client: "Carlos Gómez", date: "2025-12-10", number: "P-2900", project: "Placard", snapshot: { budget: { contactName: "Carlos", contactPhone: "11 4444-9999" } } },
  ];
  const jobs = [{ client: "Carlos Gómez", company: "De Raíz" }];
  it("junta el CRM con los clientes viejos del historial, sin repetir, con su historia", () => {
    const l = clientesParaCotizar(crm, budgets, jobs);
    expect(l.map((c: any) => [c.name, c.enCrm, c.presupuestos, c.aprobados])).toEqual([
      ["Estudio Pérez", true, 1, 0],
      ["Carlos Gómez", false, 1, 1],
    ]);
    expect(l[0].contactPhone).toBe("11 5555-1234"); // lo que faltaba en el CRM sale del historial
    expect(l[1].ultimo).toEqual({ fecha: "2025-12-10", numero: "P-2900", proyecto: "Placard" });
  });
  it("busca por nombre sin acentos, por contacto o por telefono", () => {
    const l = clientesParaCotizar(crm, budgets, jobs);
    expect(filtrarClientes(l, "perez").map((c: any) => c.name)).toEqual(["Estudio Pérez"]);
    expect(filtrarClientes(l, "4444").map((c: any) => c.name)).toEqual(["Carlos Gómez"]);
  });
});

describe("posibles coincidencias, faltantes y duplicados (2026-10-22)", () => {
  const {
    clientesParaCotizar, posiblesCoincidencias, parecidoNombre, nombreParaComparar,
    faltantesDeCliente, duplicadosEnCrm, duplicadosDeCliente, esDelCliente,
  } = require("./clients");
  const cli = (over: any = {}) => ({ id: 1, name: "", taxId: "", contactName: "", contactPhone: "", contactEmail: "", notes: "", company: "BGA", createdAt: "", ...over });
  const crm = [
    cli({ id: 1, name: "Carlos Gómez", contactPhone: "+54 9 11 4444-9999", taxId: "20-12345678-3" }),
    cli({ id: 2, name: "Estudio Pérez S.R.L.", contactEmail: "info@perez.com" }),
    cli({ id: 3, name: "Lucía Fernández" }),
  ];
  const budgets = [
    { client: "Lucía Fernández", clientId: 3, date: "2026-03-01", number: "P-1", project: "Casa Nordelta Lote 45", snapshot: { budget: {} } },
  ];
  const lista = clientesParaCotizar(crm, budgets, []);

  it("normaliza nombres: sin acentos, sin SRL ni Estudio, sin orden", () => {
    expect(nombreParaComparar("Estudio Pérez S.R.L.")).toBe("perez");
    expect(parecidoNombre("Gomez Carlos", "Carlos Gómez")).toBe(1);
    expect(parecidoNombre("Peres", "Pérez")).toBeGreaterThanOrEqual(0.8);
    expect(parecidoNombre("Perez", "Juan Perez")).toBeGreaterThan(0.8);
    expect(parecidoNombre("Martinez", "Gomez")).toBe(0);
  });

  it("sugiere por nombre parecido y no se sugiere a si mismo", () => {
    const r = posiblesCoincidencias(lista, { nombre: "Gomez Carlos" });
    expect(r[0].cliente.name).toBe("Carlos Gómez");
    expect(r[0].motivos).toContain("mismo nombre");
    expect(posiblesCoincidencias(lista, { nombre: "carlos gómez" })).toEqual([]);
    expect(posiblesCoincidencias(lista, { nombre: "Peres" })[0].cliente.name).toBe("Estudio Pérez S.R.L.");
    expect(posiblesCoincidencias(lista, { nombre: "Gomez", clientId: 1 })).toEqual([]);
  });

  it("vincula por telefono (ultimos 8), CUIT, mail y proyecto aunque el nombre sea otro", () => {
    expect(posiblesCoincidencias(lista, { nombre: "Charly", telefono: "4444 9999" })[0]).toMatchObject({ cliente: { id: 1 }, motivos: ["mismo teléfono"] });
    expect(posiblesCoincidencias(lista, { cuit: "20123456783" })[0].motivos).toEqual(["mismo CUIT"]);
    expect(posiblesCoincidencias(lista, { email: "INFO@perez.com" })[0].cliente.id).toBe(2);
    expect(posiblesCoincidencias(lista, { proyecto: "casa nordelta lote 45" })[0]).toMatchObject({ cliente: { id: 3 }, motivos: ["mismo proyecto"] });
    // Un proyecto generico ("Cocina") no vincula a nadie.
    expect(posiblesCoincidencias(clientesParaCotizar(crm, [{ client: "Lucía Fernández", project: "Cocina" }], []), { proyecto: "Cocina" })).toEqual([]);
  });

  it("ordena por puntaje: CUIT + nombre arriba de solo nombre", () => {
    const l2 = clientesParaCotizar([...crm, cli({ id: 4, name: "Carlos Gomes" })], [], []);
    const r = posiblesCoincidencias(l2, { nombre: "Carlos Gomez SA", cuit: "20-12345678-3" });
    expect(r.map((x: any) => x.cliente.id)).toEqual([1, 4]);
  });

  it("dice lo que le falta a cada ficha", () => {
    expect(faltantesDeCliente(cli({ name: "X" }))).toEqual(["CUIT", "contacto", "teléfono", "mail", "dirección"]);
    expect(faltantesDeCliente(cli({ name: "X", taxId: "20-1", contactName: "a", contactPhone: "1", contactEmail: "a@b", direccion: "Calle 1" }))).toEqual(["CUIT incompleto"]);
  });

  it("encuentra duplicados dentro del CRM y los de un cliente", () => {
    const c = [...crm, cli({ id: 5, name: "Gomez, Carlos" }), cli({ id: 6, name: "Lu Fernandez" })];
    const b = [...budgets, { client: "Lu Fernandez", clientId: 6, project: "Casa Nordelta - Lote 45" }];
    const pares = duplicadosEnCrm(c, b);
    expect(pares.map((p: any) => [p.a.id, p.b.id])).toEqual(expect.arrayContaining([[1, 5], [3, 6]]));
    expect(pares.find((p: any) => p.a.id === 3).motivos).toContain("mismo proyecto");
    expect(duplicadosDeCliente(c[3], pares).map((d: any) => d.cliente.id)).toEqual([1]);
  });

  it("un presupuesto es del cliente por clientId, o por nombre si no tiene", () => {
    expect(esDelCliente(crm[0], { clientId: 1, client: "otro" })).toBe(true);
    expect(esDelCliente(crm[0], { clientId: 9, client: "Carlos Gómez" })).toBe(false);
    expect(esDelCliente(crm[0], { client: " carlos gómez " })).toBe(true);
  });
});
