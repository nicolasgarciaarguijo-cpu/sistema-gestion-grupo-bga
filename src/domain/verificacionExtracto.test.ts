import { verificarExtractos, signoDelMovimiento, MovimientoExtracto } from "./verificacionExtracto";

const mov = (p: Partial<MovimientoExtracto>): MovimientoExtracto => ({
  id: 1, company: "BGA", bank: "Santander", date: "2026-08-01", concept: "x",
  movementType: "debito", amount: 100, balance: 900, ...p,
});

describe("signoDelMovimiento", () => {
  it("el crédito suma y el débito resta, sin importar el signo del monto", () => {
    expect(signoDelMovimiento({ movementType: "credito", amount: 100 })).toBe(100);
    expect(signoDelMovimiento({ movementType: "debito", amount: 100 })).toBe(-100);
    expect(signoDelMovimiento({ movementType: "debito", amount: -100 })).toBe(-100);
  });
});

describe("verificarExtractos", () => {
  it("una cadena que cierra no tiene rupturas", () => {
    const r = verificarExtractos([
      mov({ id: 1, date: "2026-08-01", movementType: "credito", amount: 1000, balance: 1000 }),
      mov({ id: 2, date: "2026-08-02", movementType: "debito", amount: 300, balance: 700 }),
      mov({ id: 3, date: "2026-08-03", movementType: "credito", amount: 50, balance: 750 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].rupturas).toBe(0);
    expect(r[0].saldoFinal).toBe(750);
    expect(r[0].desde).toBe("2026-08-01");
    expect(r[0].hasta).toBe("2026-08-03");
  });

  it("marca el renglón donde falta un movimiento", () => {
    const r = verificarExtractos([
      mov({ id: 1, date: "2026-08-01", movementType: "credito", amount: 1000, balance: 1000 }),
      // Falta un débito de 200: el saldo salta de 1000 a 500 con un movimiento de 300.
      mov({ id: 2, date: "2026-08-02", movementType: "debito", amount: 300, balance: 500 }),
    ]);
    expect(r[0].rupturas).toBe(1);
    const rota = r[0].lineas.find((l) => l.rompe)!;
    expect(rota.id).toBe(2);
    expect(rota.saldoEsperado).toBe(700);
    expect(rota.desvio).toBe(-200);
  });

  it("la primera línea nunca rompe: no hay con qué compararla", () => {
    const r = verificarExtractos([mov({ id: 1, balance: 12345 })]);
    expect(r[0].lineas[0].rompe).toBe(false);
    expect(r[0].lineas[0].saldoEsperado).toBeUndefined();
  });

  it("cada cuenta se verifica por separado, y dólares es otra cuenta", () => {
    const r = verificarExtractos([
      mov({ id: 1, bank: "Santander", movementType: "credito", amount: 100, balance: 100 }),
      mov({ id: 2, bank: "Patagonia", movementType: "credito", amount: 500, balance: 500 }),
      mov({ id: 3, bank: "Santander", currency: "USD", movementType: "credito", amount: 20, balance: 20 }),
    ]);
    expect(r).toHaveLength(3);
    expect(r.every((x) => x.rupturas === 0)).toBe(true);
  });

  it("cuenta los movimientos sin renglón asignado", () => {
    const r = verificarExtractos([
      mov({ id: 1, movementType: "credito", amount: 100, balance: 100, conceptKey: "cobranzas" }),
      mov({ id: 2, movementType: "debito", amount: 40, balance: 60 }),
    ]);
    expect(r[0].sinClasificar).toBe(1);
  });

  it("tolera centavos de redondeo", () => {
    const r = verificarExtractos([
      mov({ id: 1, movementType: "credito", amount: 1000, balance: 1000 }),
      mov({ id: 2, movementType: "debito", amount: 333.33, balance: 666.67 }),
    ]);
    expect(r[0].rupturas).toBe(0);
  });
});

import { verificarResumenesDeTarjeta } from "./verificacionExtracto";

describe("verificarResumenesDeTarjeta", () => {
  const resumen = { id: 1, company: "BGA", cardId: 5, closingDate: "2026-08-20", totalArs: 1000, totalUsd: 0 };

  it("si los consumos suman el total, el resumen cierra", () => {
    const r = verificarResumenesDeTarjeta([resumen], [
      { statementId: 1, amount: 600, currency: "ARS", group: "Software" },
      { statementId: 1, amount: 400, currency: "ARS", group: "Nafta" },
    ]);
    expect(r[0].cierra).toBe(true);
    expect(r[0].faltaArs).toBe(0);
    expect(r[0].consumos).toBe(2);
  });

  it("avisa cuánto falta itemizar", () => {
    const r = verificarResumenesDeTarjeta([resumen], [
      { statementId: 1, amount: 600, currency: "ARS", group: "Software" },
    ]);
    expect(r[0].cierra).toBe(false);
    expect(r[0].faltaArs).toBe(400);
  });

  it("los pesos y los dólares se verifican por separado", () => {
    const r = verificarResumenesDeTarjeta([{ ...resumen, totalUsd: 50 }], [
      { statementId: 1, amount: 1000, currency: "ARS", group: "x" },
    ]);
    expect(r[0].faltaArs).toBe(0);
    expect(r[0].faltaUsd).toBe(50);
    expect(r[0].cierra).toBe(false);
  });

  it("no toma los consumos de otro resumen", () => {
    const r = verificarResumenesDeTarjeta([resumen], [
      { statementId: 2, amount: 1000, currency: "ARS", group: "x" },
    ]);
    expect(r[0].itemizadoArs).toBe(0);
    expect(r[0].faltaArs).toBe(1000);
  });

  it("cuenta los consumos sin grupo de costo", () => {
    const r = verificarResumenesDeTarjeta([resumen], [
      { statementId: 1, amount: 600, currency: "ARS", group: "Software" },
      { statementId: 1, amount: 400, currency: "ARS", group: "  " },
    ]);
    expect(r[0].sinGrupo).toBe(1);
  });
});
