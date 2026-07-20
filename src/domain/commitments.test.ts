import { summarizeCommitments } from "./commitments";

const hoy = "2026-07-19";

describe("summarizeCommitments", () => {
  it("el saldo es por CONTRAPARTE, sin casar factura por factura", () => {
    const r = summarizeCommitments({
      invoices: [
        { counterparty: "DAC", date: "2026-05-10", amount: 1000 },
        { counterparty: "DAC", date: "2026-06-10", amount: 500 },
      ],
      movements: [{ counterparty: "DAC", date: "2026-06-01", amount: 1200 }],
      today: hoy,
    });
    expect(r.rows[0]).toMatchObject({ counterparty: "DAC", invoiced: 1500, settled: 1200, pending: 300 });
    expect(r.totalPending).toBe(300);
  });

  it("junta por id aunque el nombre venga escrito distinto", () => {
    const r = summarizeCommitments({
      invoices: [{ counterparty: "Dac", counterpartyId: 7, date: "2026-05-10", amount: 1000 }],
      movements: [{ counterparty: "DAC MADERAS", counterpartyId: 7, date: "2026-05-20", amount: 400 }],
      today: hoy,
    });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].pending).toBe(600);
  });

  it("junta por nombre normalizado cuando no hay id", () => {
    const r = summarizeCommitments({
      invoices: [{ counterparty: " dac ", date: "2026-05-10", amount: 1000 }],
      movements: [{ counterparty: "DAC", date: "2026-05-20", amount: 1000 }],
      today: hoy,
    });
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].pending).toBe(0);
  });

  // Se van tapando de la mas vieja a la mas nueva, que es como se imputa en la practica.
  it("la antiguedad sale de la factura mas vieja que quedo sin cubrir", () => {
    const r = summarizeCommitments({
      invoices: [
        { counterparty: "Cliente", date: "2026-01-10", amount: 100 },
        { counterparty: "Cliente", date: "2026-06-19", amount: 100 },
      ],
      movements: [{ counterparty: "Cliente", date: "2026-02-01", amount: 100 }],
      today: hoy,
    });
    // la de enero quedo cubierta; la abierta es la de junio
    expect(r.rows[0].oldestOpenDate).toBe("2026-06-19");
    expect(r.rows[0].ageDays).toBe(30);
  });

  it("marca como vencido lo que pasa el limite de dias", () => {
    const r = summarizeCommitments({
      invoices: [{ counterparty: "Moroso", date: "2026-01-01", amount: 900 }],
      movements: [],
      today: hoy,
      overdueDays: 30,
    });
    expect(r.overdue).toHaveLength(1);
    expect(r.totalOverdue).toBe(900);
  });

  it("si se pago de mas lo avisa y no inventa antiguedad", () => {
    const r = summarizeCommitments({
      invoices: [{ counterparty: "Prov", date: "2026-05-10", amount: 100 }],
      movements: [{ counterparty: "Prov", date: "2026-05-11", amount: 150 }],
      today: hoy,
    });
    expect(r.rows[0].overpaid).toBe(true);
    expect(r.rows[0].pending).toBe(-50);
    expect(r.rows[0].oldestOpenDate).toBe("");
    expect(r.overdue).toHaveLength(0);
  });

  it("un movimiento sin factura queda como saldo a favor de la contraparte", () => {
    const r = summarizeCommitments({
      invoices: [],
      movements: [{ counterparty: "Sin factura", date: "2026-05-11", amount: 500 }],
      today: hoy,
    });
    expect(r.rows[0]).toMatchObject({ invoiced: 0, settled: 500, pending: -500, overpaid: true });
  });

  // Los montos <=0 se descartan enteros: una contraparte que solo tiene ceros no existe como saldo.
  it("descarta montos en cero o negativos y no rompe sin datos", () => {
    const r = summarizeCommitments({
      invoices: [{ counterparty: "X", date: "2026-05-10", amount: 0 }],
      movements: [{ counterparty: "X", date: "2026-05-10", amount: -5 }],
      today: hoy,
    });
    expect(r.rows).toEqual([]);
    expect(r.totalPending).toBe(0);
    expect(summarizeCommitments({ invoices: [], movements: [], today: hoy }).rows).toEqual([]);
  });
});
