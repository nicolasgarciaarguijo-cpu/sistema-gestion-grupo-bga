import { mergeItemsById, mergeModuleSlice } from "./mergeItems";

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

  it("si nosotros mantenemos un item y otro lo borro, sobrevive nuestra version (no se pierde dato)", () => {
    // baseline [A,B]; nosotros seguimos con B; la DB ya no tiene B (otro lo borro).
    const merged = mergeItemsById([A, B], [A, B], [A]);
    expect(merged.map((i) => i.id).sort()).toEqual([1, 2]);
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
