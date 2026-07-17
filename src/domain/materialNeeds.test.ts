import { allocateMaterialNeeds } from "./materialNeeds";
import type { NeedJobInput, NeedMaterialInput } from "./materialNeeds";

const material = (over: Partial<NeedMaterialInput>): NeedMaterialInput => ({
  description: "Tabla",
  unit: "u",
  qty: 10,
  unitPrice: 100,
  stockKey: "stock-1",
  stockQty: 0,
  ...over,
});

const job = (over: Partial<NeedJobInput>): NeedJobInput => ({
  id: 1,
  startDate: "2026-03-01",
  materials: [material({})],
  ...over,
});

const byId = (result: ReturnType<typeof allocateMaterialNeeds>, id: number) =>
  result.find((item) => item.jobId === id) as ReturnType<typeof allocateMaterialNeeds>[number];

describe("allocateMaterialNeeds", () => {
  it("sin stock, todo lo pedido es faltante y se costea al precio unitario", () => {
    const [need] = allocateMaterialNeeds([job({})]);
    expect(need.rows[0]).toMatchObject({ required: 10, allocated: 0, missing: 10 });
    expect(need.missingCount).toBe(1);
    expect(need.estimatedCost).toBe(1000);
  });

  it("con stock de sobra no hay faltante ni costo estimado", () => {
    const [need] = allocateMaterialNeeds([
      job({ materials: [material({ qty: 10, stockQty: 25 })] }),
    ]);
    expect(need.rows[0]).toMatchObject({ required: 10, allocated: 10, missing: 0 });
    expect(need.missingCount).toBe(0);
    expect(need.estimatedCost).toBe(0);
    expect(need.missingRows).toHaveLength(0);
  });

  it("stock parcial: se lleva lo que hay y el resto es faltante", () => {
    const [need] = allocateMaterialNeeds([
      job({ materials: [material({ qty: 10, stockQty: 4 })] }),
    ]);
    expect(need.rows[0]).toMatchObject({ allocated: 4, missing: 6, estimatedCost: 600 });
  });

  // El nucleo del reparto: el stock no se puede contar dos veces.
  it("dos trabajos con el mismo material: el que arranca antes se lleva el stock", () => {
    const result = allocateMaterialNeeds([
      job({ id: 2, startDate: "2026-05-01", materials: [material({ qty: 10, stockQty: 10 })] }),
      job({ id: 1, startDate: "2026-03-01", materials: [material({ qty: 10, stockQty: 10 })] }),
    ]);
    expect(byId(result, 1).rows[0]).toMatchObject({ allocated: 10, missing: 0 });
    expect(byId(result, 2).rows[0]).toMatchObject({ allocated: 0, missing: 10 });
  });

  it("el faltante por trabajo suma el faltante agregado (no se cuenta el stock dos veces)", () => {
    const result = allocateMaterialNeeds([
      job({ id: 1, startDate: "2026-03-01", materials: [material({ qty: 10, stockQty: 12 })] }),
      job({ id: 2, startDate: "2026-04-01", materials: [material({ qty: 10, stockQty: 12 })] }),
      job({ id: 3, startDate: "2026-05-01", materials: [material({ qty: 10, stockQty: 12 })] }),
    ]);
    const totalMissing = result.reduce((acc, need) => acc + need.rows[0].missing, 0);
    // 30 pedidas contra 12 en stock => 18 faltantes en total, sin importar como se repartan.
    expect(totalMissing).toBe(18);
    expect(byId(result, 1).rows[0].missing).toBe(0);
    expect(byId(result, 2).rows[0].missing).toBe(8);
    expect(byId(result, 3).rows[0].missing).toBe(10);
  });

  it("materiales distintos no compiten entre si por el stock", () => {
    const result = allocateMaterialNeeds([
      job({
        materials: [
          material({ description: "Tabla", stockKey: "stock-1", qty: 10, stockQty: 10 }),
          material({ description: "Tornillo", stockKey: "stock-2", qty: 5, stockQty: 0 }),
        ],
      }),
    ]);
    expect(result[0].rows[0].missing).toBe(0);
    expect(result[0].rows[1].missing).toBe(5);
    expect(result[0].missingCount).toBe(1);
  });

  it("un material sin match en stock es faltante completo", () => {
    const [need] = allocateMaterialNeeds([
      job({ materials: [material({ stockKey: null, qty: 7, stockQty: 999 })] }),
    ]);
    expect(need.rows[0]).toMatchObject({ allocated: 0, missing: 7 });
  });

  it("los trabajos sin fecha de inicio se sirven ultimos", () => {
    const result = allocateMaterialNeeds([
      job({ id: 1, startDate: "", materials: [material({ qty: 10, stockQty: 10 })] }),
      job({ id: 2, startDate: "2026-06-01", materials: [material({ qty: 10, stockQty: 10 })] }),
    ]);
    expect(byId(result, 2).rows[0].missing).toBe(0);
    expect(byId(result, 1).rows[0].missing).toBe(10);
  });

  it("a igual fecha desempata por id, de forma estable", () => {
    const result = allocateMaterialNeeds([
      job({ id: 9, startDate: "2026-03-01", materials: [material({ qty: 10, stockQty: 10 })] }),
      job({ id: 4, startDate: "2026-03-01", materials: [material({ qty: 10, stockQty: 10 })] }),
    ]);
    expect(byId(result, 4).rows[0].missing).toBe(0);
    expect(byId(result, 9).rows[0].missing).toBe(10);
  });

  it("el mismo material repetido dentro de un trabajo consume el stock una sola vez", () => {
    const [need] = allocateMaterialNeeds([
      job({
        materials: [
          material({ qty: 6, stockQty: 10 }),
          material({ qty: 6, stockQty: 10 }),
        ],
      }),
    ]);
    expect(need.rows[0]).toMatchObject({ allocated: 6, missing: 0 });
    expect(need.rows[1]).toMatchObject({ allocated: 4, missing: 2 });
  });

  it("devuelve los trabajos en el orden de entrada, no en el del reparto", () => {
    const result = allocateMaterialNeeds([
      job({ id: 7, startDate: "2026-09-01" }),
      job({ id: 3, startDate: "2026-01-01" }),
    ]);
    expect(result.map((need) => need.jobId)).toEqual([7, 3]);
  });

  it("cantidades invalidas o negativas no rompen ni generan faltantes fantasma", () => {
    const [need] = allocateMaterialNeeds([
      job({
        materials: [
          material({ qty: -5, stockQty: 0 }),
          material({ qty: NaN, unitPrice: NaN, stockQty: NaN, stockKey: "stock-9" }),
        ],
      }),
    ]);
    expect(need.rows[0].missing).toBe(0);
    expect(need.rows[1].missing).toBe(0);
    expect(need.estimatedCost).toBe(0);
    expect(need.missingCount).toBe(0);
  });

  it("sin trabajos devuelve lista vacia", () => {
    expect(allocateMaterialNeeds([])).toEqual([]);
  });
});
