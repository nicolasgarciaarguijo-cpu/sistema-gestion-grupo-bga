import { aggregateCardCosts, resolveCardGroupKind } from "./cardCosts";
import type { CostGroup, CreditCardConsumption } from "./types";

const groups: CostGroup[] = [
  { id: 1, name: "Administrativos", kind: "fijo", company: "General", active: true, auto: false, notes: "" },
  { id: 2, name: "Combustible", kind: "variable", company: "General", active: true, auto: false, notes: "" },
];

const consumo = (p: Partial<CreditCardConsumption>): CreditCardConsumption => ({
  id: 1,
  company: "BGA",
  cardId: 1,
  date: "2026-06-10",
  description: "x",
  amount: 1000,
  currency: "ARS",
  group: "Administrativos",
  installments: "",
  recurring: false,
  notes: "",
  ...p,
});

describe("resolveCardGroupKind", () => {
  it("toma el tipo del grupo; fallback variable", () => {
    expect(resolveCardGroupKind("Administrativos", groups)).toBe("fijo");
    expect(resolveCardGroupKind("Combustible", groups)).toBe("variable");
    expect(resolveCardGroupKind("Inexistente", groups)).toBe("variable");
  });
});

describe("aggregateCardCosts", () => {
  it("separa fijo/variable y pesos/dólares sin sumarlos", () => {
    const r = aggregateCardCosts(
      [
        consumo({ group: "Administrativos", amount: 5000 }), // fijo ARS
        consumo({ group: "Combustible", amount: 3000 }), // variable ARS
        consumo({ group: "Administrativos", amount: 100, currency: "USD" }), // fijo USD
      ],
      groups
    );
    expect(r.ars).toEqual({ fijo: 5000, variable: 3000, total: 8000 });
    expect(r.usd).toEqual({ fijo: 100, variable: 0, total: 100 });
  });

  it("agrupa por grupo+moneda y junta lo recurrente para el marcador", () => {
    const r = aggregateCardCosts(
      [
        consumo({ group: "Administrativos", amount: 2000, recurring: true }),
        consumo({ group: "Administrativos", amount: 1000, recurring: true }),
        consumo({ group: "Administrativos", amount: 500, recurring: false }),
      ],
      groups
    );
    const row = r.byGroup.find((x) => x.group === "Administrativos" && x.currency === "ARS")!;
    expect(row.total).toBe(3500);
    expect(row.recurringMonthly).toBe(3000); // solo los marcados recurrentes
    expect(row.kind).toBe("fijo");
  });

  it("ignora montos <= 0 y clasifica sin grupo como variable", () => {
    const r = aggregateCardCosts(
      [consumo({ group: "", amount: 400 }), consumo({ amount: 0 }), consumo({ amount: -10 })],
      groups
    );
    expect(r.ars.variable).toBe(400);
    expect(r.ars.total).toBe(400);
    expect(r.byGroup[0].group).toBe("(sin clasificar)");
  });
});
