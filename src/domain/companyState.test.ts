import {
  splitModuleDataByCompany,
  mergeModuleDataByCompany,
  applyCompanyModuleSlice,
  GENERAL_COMPANY,
} from "./companyState";

const BGA = "BGA estudio de diseño y produccion industrial s.r.l";
const DERAIZ = "De raiz s.r.l";

describe("splitModuleDataByCompany", () => {
  it("separa un array por item.company y deja los globales en General", () => {
    const data = {
      approvedJobs: [
        { id: 1, company: BGA },
        { id: 2, company: DERAIZ },
        { id: 3, company: "General" },
      ],
      someGlobalFlag: true,
    };
    const out = splitModuleDataByCompany("trabajos-aprobados", data, [BGA, DERAIZ]);
    expect((out[BGA].approvedJobs as any[]).map((i) => i.id)).toEqual([1]);
    expect((out[DERAIZ].approvedJobs as any[]).map((i) => i.id)).toEqual([2]);
    expect((out[GENERAL_COMPANY].approvedJobs as any[]).map((i) => i.id)).toEqual([3]);
    expect(out[GENERAL_COMPANY].someGlobalFlag).toBe(true);
  });

  it("un usuario restringido no emite buckets de otras empresas", () => {
    const data = { approvedJobs: [{ id: 1, company: BGA }] };
    const out = splitModuleDataByCompany("trabajos-aprobados", data, [BGA]);
    expect(Object.keys(out).sort()).toEqual([GENERAL_COMPANY, BGA].sort());
    expect(out[DERAIZ]).toBeUndefined();
  });

  it("emite array vacio para persistir borrados", () => {
    const data = { approvedJobs: [] as any[] };
    const out = splitModuleDataByCompany("trabajos-aprobados", data, [BGA]);
    expect(out[BGA].approvedJobs).toEqual([]);
  });

  it("descarta items de empresas no escribibles (no los manda a General)", () => {
    const data = {
      approvedJobs: [
        { id: 1, company: BGA },
        { id: 2, company: DERAIZ }, // no escribible para este usuario
        { id: 3, company: "General" },
      ],
    };
    const out = splitModuleDataByCompany("trabajos-aprobados", data, [BGA]);
    expect((out[BGA].approvedJobs as any[]).map((i) => i.id)).toEqual([1]);
    expect((out[GENERAL_COMPANY].approvedJobs as any[]).map((i) => i.id)).toEqual([3]);
    expect(out[DERAIZ]).toBeUndefined(); // De Raiz no se toca
  });

  it("items sin company van a General", () => {
    const data = { approvedJobs: [{ id: 1 }] };
    const out = splitModuleDataByCompany("trabajos-aprobados", data, [BGA]);
    expect((out[GENERAL_COMPANY].approvedJobs as any[]).map((i) => i.id)).toEqual([1]);
    expect(out[BGA].approvedJobs).toEqual([]);
  });

  it("marcadores: separa todos los campos por empresa (modulo multi-campo)", () => {
    const data = {
      fixedMarkers: [{ id: 1, company: BGA }, { id: 2, company: DERAIZ }],
      laborMarkers: [{ id: 3, company: DERAIZ }],
      supplyMarkers: [{ id: 4, company: BGA }],
      personalProvisionMarkers: [{ id: 5, company: DERAIZ }],
    };
    const out = splitModuleDataByCompany("marcadores", data, [BGA, DERAIZ]);
    expect((out[BGA].fixedMarkers as any[]).map((i) => i.id)).toEqual([1]);
    expect((out[DERAIZ].fixedMarkers as any[]).map((i) => i.id)).toEqual([2]);
    expect((out[BGA].laborMarkers as any[]).length).toBe(0);
    expect((out[DERAIZ].laborMarkers as any[]).map((i) => i.id)).toEqual([3]);
    expect((out[BGA].supplyMarkers as any[]).map((i) => i.id)).toEqual([4]);
    expect((out[DERAIZ].personalProvisionMarkers as any[]).map((i) => i.id)).toEqual([5]);
  });

  it("campos vacios hoy (bankStatementEntries/remitoDrafts/costAnalysisEntries) se parten", () => {
    expect(
      splitModuleDataByCompany(
        "cash-flow",
        { bankStatementEntries: [{ id: 1, company: BGA }] },
        [DERAIZ]
      )[DERAIZ].bankStatementEntries
    ).toEqual([]); // BGA descartado para usuario De Raiz
    expect(
      splitModuleDataByCompany(
        "compras",
        { remitoDrafts: [{ id: 1, company: DERAIZ }] },
        [DERAIZ]
      )[DERAIZ].remitoDrafts as any[]
    ).toHaveLength(1);
  });
});

describe("mergeModuleDataByCompany", () => {
  it("concatena arrays por-empresa y toma globales de General", () => {
    const merged = mergeModuleDataByCompany("trabajos-aprobados", [
      { company: BGA, data: { approvedJobs: [{ id: 1, company: BGA }] } },
      { company: DERAIZ, data: { approvedJobs: [{ id: 2, company: DERAIZ }] } },
      { company: GENERAL_COMPANY, data: { approvedJobs: [{ id: 3 }], someGlobalFlag: true } },
    ]);
    expect((merged.approvedJobs as any[]).map((i) => i.id).sort()).toEqual([1, 2, 3]);
    expect(merged.someGlobalFlag).toBe(true);
  });

  it("roundtrip split -> merge preserva los items (superadmin)", () => {
    const data = {
      stockItems: [
        { id: 1, company: BGA },
        { id: 2, company: DERAIZ },
        { id: 3, company: "General" },
      ],
      costAnalysisEntries: { foo: "bar" }, // global de stock-costos
    };
    const split = splitModuleDataByCompany("stock-costos", data, [BGA, DERAIZ]);
    const rows = Object.entries(split).map(([company, d]) => ({ company, data: d }));
    const merged = mergeModuleDataByCompany("stock-costos", rows);
    expect((merged.stockItems as any[]).map((i) => i.id).sort()).toEqual([1, 2, 3]);
    expect(merged.costAnalysisEntries).toEqual({ foo: "bar" });
  });
});

describe("applyCompanyModuleSlice (realtime)", () => {
  it("reemplaza solo la porcion de la empresa entrante, sin pisar las demas", () => {
    const current = {
      approvedJobs: [
        { id: 1, company: BGA },
        { id: 2, company: DERAIZ },
        { id: 3, company: "General" },
      ],
    };
    const next = applyCompanyModuleSlice("trabajos-aprobados", current, BGA, {
      approvedJobs: [{ id: 10, company: BGA }],
    });
    const ids = (next.approvedJobs as any[]).map((i) => i.id).sort((a, b) => a - b);
    expect(ids).toEqual([2, 3, 10]); // BGA reemplazado; De Raiz y General intactos
  });

  it("la fila General actualiza globales y su porcion", () => {
    const current = { approvedJobs: [{ id: 1, company: BGA }], flag: false };
    const next = applyCompanyModuleSlice("trabajos-aprobados", current, GENERAL_COMPANY, {
      approvedJobs: [{ id: 9, company: "General" }],
      flag: true,
    });
    expect((next.approvedJobs as any[]).map((i) => i.id).sort()).toEqual([1, 9]);
    expect(next.flag).toBe(true);
  });
});
