import {
  splitModuleDataByCompany,
  mergeModuleDataByCompany,
  applyCompanyModuleSlice,
  bucketCompany,
  GENERAL_COMPANY,
} from "./companyState";

const BGA = "BGA estudio de diseño y produccion industrial s.r.l";
const DERAIZ = "De raiz s.r.l";

describe("bucketCompany", () => {
  it("mapea empresa escribible conocida a si misma", () => {
    expect(bucketCompany(BGA, [BGA, DERAIZ])).toBe(BGA);
  });
  it("manda General, vacio o desconocido a General", () => {
    expect(bucketCompany("General", [BGA])).toBe(GENERAL_COMPANY);
    expect(bucketCompany(undefined, [BGA])).toBe(GENERAL_COMPANY);
    expect(bucketCompany(DERAIZ, [BGA])).toBe(GENERAL_COMPANY); // no escribible para este user
  });
});

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
