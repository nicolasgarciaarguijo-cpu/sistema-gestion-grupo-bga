import { mergeItemsById, mergeModuleSlice, mergeObjects3 } from "./mergeItems";

const A = { id: 1, v: "a" };
const B = { id: 2, v: "b" };
const C = { id: 3, v: "c" };

describe("mergeItemsById", () => {
  it("conserva el item que agrego OTRO usuario (no lo pisa)", () => {
    // baseline y nosotros teniamos [A]; otro agrego C en la DB.
    const merged = mergeItemsById([A], [A, B], [A, C]);
    // Nuestro B se guarda y el C ajeno se conserva.
    expect(merged.map((i) => i.id).sort()).toEqual([1, 2, 3]);
  });

  it("respeta NUESTRO borrado (no resucita lo que sacamos)", () => {
    // baseline [A,B]; nosotros borramos B; la DB todavia tiene B.
    const merged = mergeItemsById([A, B], [A], [A, B]);
    expect(merged.map((i) => i.id)).toEqual([1]);
  });

  it("en conflicto del mismo item, gana NUESTRA version", () => {
    const ours = [{ id: 1, v: "ours" }];
    const theirs = [{ id: 1, v: "theirs" }];
    const merged = mergeItemsById([A], ours, theirs);
    expect(merged).toEqual([{ id: 1, v: "ours" }]);
  });

  it("sin baseline (primer guardado) hace union sin perder nada", () => {
    const merged = mergeItemsById([], [A, B], [C]);
    expect(merged.map((i) => i.id).sort()).toEqual([1, 2, 3]);
  });

  it("nuestro item nuevo se conserva aunque la DB no lo tenga", () => {
    const merged = mergeItemsById([A], [A, B], [A]);
    expect(merged.map((i) => i.id).sort()).toEqual([1, 2]);
  });

  it("si otro lo borro y nosotros no lo tocamos, queda borrado (2026-10-20: lo borrado volvia)", () => {
    // baseline [A,B]; nosotros seguimos con B sin cambios; la DB ya no tiene B (otro lo borro).
    const merged = mergeItemsById([A, B], [A, B], [A]);
    expect(merged.map((i) => i.id).sort()).toEqual([1]);
  });

  it("items sin id: los nuestros se mantienen, los ajenos sin id se ignoran", () => {
    const ours = [{ v: "x" } as any];
    const theirs = [{ v: "y" } as any];
    const merged = mergeItemsById([], ours, theirs);
    expect(merged).toEqual([{ v: "x" }]);
  });

  it("soporta idKey alternativa", () => {
    const merged = mergeItemsById(
      [{ key: "a" }],
      [{ key: "a" }, { key: "b" }],
      [{ key: "a" }, { key: "c" }],
      "key"
    );
    expect(merged.map((i) => (i as any).key).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("mergeModuleSlice", () => {
  it("fusiona solo los campos por-empresa; los globales quedan como los nuestros", () => {
    const perCompany = ["savedBudgets"];
    const baseline = { savedBudgets: [A], config: { x: 1 } };
    const ours = { savedBudgets: [A, B], config: { x: 2 } };
    const theirs = { savedBudgets: [A, C], config: { x: 99 } };
    const out = mergeModuleSlice(perCompany, baseline, ours, theirs);
    expect((out.savedBudgets as any[]).map((i) => i.id).sort()).toEqual([1, 2, 3]);
    // El campo global gana el nuestro.
    expect(out.config).toEqual({ x: 2 });
  });

  it("no crea un campo por-empresa si ni ours ni theirs lo traen", () => {
    const out = mergeModuleSlice(["savedBudgets"], {}, { otro: 1 }, {});
    expect("savedBudgets" in out).toBe(false);
    expect(out.otro).toBe(1);
  });

  it("respeta borrados dentro del campo por-empresa", () => {
    const out = mergeModuleSlice(
      ["employees"],
      { employees: [A, B] },
      { employees: [A] },
      { employees: [A, B] }
    );
    expect((out.employees as any[]).map((i) => i.id)).toEqual([1]);
  });
});

describe("anti-pisado con la base (incidente del 13/10/2026)", () => {
  // Un trabajo con sus listas, como en Trabajos aprobados.
  const jobBase = { id: 7, client: "Contract", invoices: [{ id: 1, total: 100 }], payments: [{ id: 10, amount: 50 }], additionals: [] as any[] };

  it("una sesion VIEJA que no toco el trabajo no pisa lo que cargo otro", () => {
    const cargadoPorOtro = { ...jobBase, invoices: [...jobBase.invoices, { id: 2, total: 200 }], payments: [...jobBase.payments, { id: 11, amount: 70 }] };
    const merged = mergeItemsById([jobBase], [jobBase], [cargadoPorOtro]);
    expect(merged).toEqual([cargadoPorOtro]);
  });

  it("si los dos cambiaron el mismo trabajo, se juntan las facturas y los pagos de cada uno", () => {
    const nuestro = { ...jobBase, payments: [...jobBase.payments, { id: 12, amount: 5 }] };
    const ajeno = { ...jobBase, invoices: [...jobBase.invoices, { id: 2, total: 200 }], additionals: [{ id: 30, amount: 9 }] };
    const [m] = mergeItemsById([jobBase], [nuestro], [ajeno]) as any[];
    expect(m.invoices.map((i: any) => i.id).sort()).toEqual([1, 2]);
    expect(m.payments.map((p: any) => p.id).sort()).toEqual([10, 12]);
    expect(m.additionals.map((a: any) => a.id)).toEqual([30]);
  });

  it("un pago borrado por nosotros no vuelve, aunque el otro haya agregado otro", () => {
    const nuestro = { ...jobBase, payments: [] as any[] };
    const ajeno = { ...jobBase, payments: [...jobBase.payments, { id: 11, amount: 70 }] };
    const [m] = mergeItemsById([jobBase], [nuestro], [ajeno]) as any[];
    expect(m.payments.map((p: any) => p.id)).toEqual([11]);
  });

  it("campo distinto cambiado por cada uno: entran los dos cambios", () => {
    const m = mergeObjects3({ id: 1, a: 1, b: 1 }, { id: 1, a: 2, b: 1 }, { id: 1, a: 1, b: 3 });
    expect(m).toEqual({ id: 1, a: 2, b: 3 });
  });

  it("el orden de las claves que devuelve la base no cuenta como cambio", () => {
    const base = { id: 1, a: 1, b: 2 };
    const ajeno = { b: 5, a: 1, id: 1 };
    expect(mergeItemsById([base], [{ id: 1, a: 1, b: 2 }], [ajeno])).toEqual([ajeno]);
  });
});

describe("caso real: la sesion vieja normalizo el trabajo al cargarlo", () => {
  it("los campos que agrega la carga no tapan las facturas y pagos nuevos de la base", () => {
    const base = { id: 3395, client: "Contract", invoices: [] as any[], payments: [] as any[] };
    // La sesion vieja: mismo trabajo, con los defaults que pone la carga (sourceType, legacyImported).
    const vieja = { ...base, sourceType: "from_budget", legacyImported: false };
    // En la base, Nicolas cargo una factura y un pago.
    const enLaBase = { ...base, invoices: [{ id: 381, total: 2023953.91 }], payments: [{ id: 1, amount: 100 }] };
    const [m] = mergeItemsById([base], [vieja], [enLaBase]) as any[];
    expect(m.invoices).toEqual([{ id: 381, total: 2023953.91 }]);
    expect(m.payments).toEqual([{ id: 1, amount: 100 }]);
    expect(m.sourceType).toBe("from_budget");
  });
});

describe("lo borrado por otra sesion no vuelve (2026-10-20)", () => {
  const pago = { id: 7, supplier: "DAC", amount: 2000000 };
  const otro = { id: 8, supplier: "X", amount: 10 };
  it("una sesion vieja que no toco el pago no lo vuelve a escribir", () => {
    expect(mergeItemsById([pago, otro], [pago, otro], [otro])).toEqual([otro]);
  });
  it("si la sesion vieja lo edito despues, se conserva", () => {
    const editado = { ...pago, amount: 1 };
    expect(mergeItemsById([pago, otro], [editado, otro], [otro])).toEqual([editado, otro]);
  });
  it("una lista de la DB vacia o que no vino no cuenta como borrado", () => {
    expect(mergeItemsById([pago], [pago], [])).toEqual([pago]);
    expect(mergeModuleSlice(["costEntries"], { costEntries: [pago] }, { costEntries: [pago] }, {})).toEqual({ costEntries: [pago] });
  });
});
