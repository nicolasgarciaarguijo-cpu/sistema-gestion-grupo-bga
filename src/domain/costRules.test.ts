import { deriveKeyword, suggestGroupFromRules, learnCostRule } from "./costRules";
import type { CostRule } from "./types";

const rule = (p: Partial<CostRule>): CostRule => ({
  id: 1,
  company: "BGA",
  matchType: "keyword",
  matchValue: "osde",
  group: "Salud",
  ambiguous: false,
  hits: 1,
  active: true,
  notes: "",
  ...p,
});

describe("deriveKeyword", () => {
  it("toma el token más largo y distintivo, ignorando genéricos y números", () => {
    expect(deriveKeyword("Debito automatico - Osde -0086156841801")).toBe("osde");
    expect(deriveKeyword("Pago a proveedores recibido - Herrajes Magliola")).toBe("herrajes");
  });
  it("devuelve '' si no hay token útil", () => {
    expect(deriveKeyword("pago var / de la")).toBe("");
  });
});

describe("suggestGroupFromRules", () => {
  it("sugiere por palabra clave del concepto", () => {
    const rules = [rule({ matchType: "keyword", matchValue: "osde", group: "Salud" })];
    const s = suggestGroupFromRules({ company: "BGA", concept: "Debito automatico - OSDE" }, rules);
    expect(s?.group).toBe("Salud");
    expect(s?.via).toBe("keyword");
  });

  it("el proveedor gana sobre la palabra clave", () => {
    const rules = [
      rule({ id: 1, matchType: "keyword", matchValue: "magliola", group: "Insumos" }),
      rule({ id: 2, matchType: "supplier", matchValue: "77", group: "Herrajes" }),
    ];
    const s = suggestGroupFromRules(
      { company: "BGA", concept: "transf a magliola", supplierId: 77 },
      rules
    );
    expect(s).toMatchObject({ group: "Herrajes", via: "supplier" });
  });

  it("si el mismo criterio apunta a dos grupos distintos, NO sugiere (manual)", () => {
    const rules = [
      rule({ id: 1, matchType: "supplier", matchValue: "77", group: "Herrajes" }),
      rule({ id: 2, matchType: "supplier", matchValue: "77", group: "Fletes" }),
    ];
    const s = suggestGroupFromRules({ company: "BGA", concept: "x", supplierId: 77 }, rules);
    expect(s).toBeNull();
  });

  it("ignora reglas ambiguas e inactivas", () => {
    const rules = [
      rule({ id: 1, matchValue: "osde", group: "Salud", ambiguous: true }),
      rule({ id: 2, matchValue: "seguro", group: "Seguros", active: false }),
    ];
    expect(suggestGroupFromRules({ company: "BGA", concept: "osde seguro" }, rules)).toBeNull();
  });

  it("respeta la empresa (General aplica a todas)", () => {
    const rules = [rule({ company: "General", matchValue: "afip", group: "Impuestos" })];
    expect(suggestGroupFromRules({ company: "De raiz", concept: "pago AFIP" }, rules)?.group).toBe(
      "Impuestos"
    );
    const soloBga = [rule({ company: "BGA", matchValue: "afip", group: "Impuestos" })];
    expect(suggestGroupFromRules({ company: "De raiz", concept: "pago AFIP" }, soloBga)).toBeNull();
  });

  it("match por monto dentro de tolerancia", () => {
    const rules = [rule({ matchType: "amount", matchValue: "267250", group: "Salud" })];
    expect(suggestGroupFromRules({ company: "BGA", concept: "x", amount: 267250 }, rules)?.group).toBe(
      "Salud"
    );
    expect(suggestGroupFromRules({ company: "BGA", concept: "x", amount: 300000 }, rules)).toBeNull();
  });
});

describe("learnCostRule", () => {
  it("crea una regla por proveedor cuando hay supplierId", () => {
    const r = learnCostRule([], { company: "BGA", group: "Herrajes", concept: "x", supplierId: 77 }, 10);
    expect(r.learned).toMatchObject({ matchType: "supplier", matchValue: "77", group: "Herrajes", id: 10 });
    expect(r.rules).toHaveLength(1);
  });

  it("sin proveedor, aprende por palabra clave del concepto", () => {
    const r = learnCostRule([], { company: "BGA", group: "Salud", concept: "Debito automatico OSDE" }, 10);
    expect(r.learned).toMatchObject({ matchType: "keyword", matchValue: "osde", group: "Salud" });
  });

  it("misma clave y mismo grupo refuerza (hits++)", () => {
    const base = [
      { id: 5, company: "BGA", matchType: "supplier", matchValue: "77", group: "Herrajes", ambiguous: false, hits: 1, active: true, notes: "" } as CostRule,
    ];
    const r = learnCostRule(base, { company: "BGA", group: "Herrajes", concept: "x", supplierId: 77 }, 99);
    expect(r.rules).toHaveLength(1);
    expect(r.learned?.hits).toBe(2);
    expect(r.becameAmbiguous).toBe(false);
  });

  it("misma clave y OTRO grupo marca ambiguo y deja de sugerir", () => {
    const base = [
      { id: 5, company: "BGA", matchType: "supplier", matchValue: "77", group: "Herrajes", ambiguous: false, hits: 3, active: true, notes: "" } as CostRule,
    ];
    const r = learnCostRule(base, { company: "BGA", group: "Fletes", concept: "x", supplierId: 77 }, 99);
    expect(r.becameAmbiguous).toBe(true);
    expect(r.rules[0].ambiguous).toBe(true);
    // ya no sugiere para ese proveedor
    expect(suggestGroupFromRules({ company: "BGA", concept: "x", supplierId: 77 }, r.rules)).toBeNull();
  });

  it("no aprende si el grupo viene vacío", () => {
    const r = learnCostRule([], { company: "BGA", group: "", concept: "OSDE", supplierId: 77 }, 10);
    expect(r.learned).toBeNull();
    expect(r.rules).toHaveLength(0);
  });
});
