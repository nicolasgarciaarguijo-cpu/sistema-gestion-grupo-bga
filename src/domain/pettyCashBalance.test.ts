import { computePettyCashBalance } from "./pettyCashBalance";

describe("computePettyCashBalance", () => {
  it("suma entradas por circuito y salidas por administracion", () => {
    const r = computePettyCashBalance(
      [
        { assignedAmount: 10000, assignedWhite: 6000, assignedBlack: 4000 },
        { assignedAmount: 5000, assignedWhite: 0, assignedBlack: 5000 },
      ],
      [
        { amount: 2000, administration: "blanco" },
        { amount: 3000, administration: "negro" },
        { amount: 1000 }, // sin admin = blanco por defecto
      ]
    );
    expect(r.whiteIn).toBe(6000);
    expect(r.blackIn).toBe(9000);
    expect(r.whiteOut).toBe(3000); // 2000 + 1000
    expect(r.blackOut).toBe(3000);
    expect(r.whiteSaldo).toBe(3000);
    expect(r.blackSaldo).toBe(6000);
    expect(r.desbalance).toBe(-3000); // sobra negro
  });

  it("fondos sin origen cargado quedan sin clasificar", () => {
    const r = computePettyCashBalance([{ assignedAmount: 8000 }], []);
    expect(r.unclassifiedIn).toBe(8000);
    expect(r.whiteIn).toBe(0);
    expect(r.blackIn).toBe(0);
  });

  it("sin datos = todo cero", () => {
    const r = computePettyCashBalance([], []);
    expect(r.whiteSaldo).toBe(0);
    expect(r.blackSaldo).toBe(0);
    expect(r.desbalance).toBe(0);
  });
});
