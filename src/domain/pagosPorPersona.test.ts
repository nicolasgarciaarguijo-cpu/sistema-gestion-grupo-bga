import { conteoPagosPorPersona, pagosCruzadosEntreEmpresas } from "./pagosPorPersona";

it("pago cruzado: factura de una empresa pagada por la otra", () => {
  const r = pagosCruzadosEntreEmpresas(
    [
      { id: 1, company: "De raiz s.r.l", supplier: "DAC", receiptLetter: "A", invoiceNumber: "10", paidByCostEntryId: 11 },
      { id: 2, company: "BGA", paidByCostEntryId: 12 },
      { id: 3, company: "BGA", paidByCostEntryId: null },
    ],
    [
      { id: 11, company: "BGA", date: "2026-10-01", amount: 500 },
      { id: 12, company: "BGA", date: "2026-10-02", amount: 700 },
    ]
  );
  expect(r).toEqual([{ facturaId: 1, pagoId: 11, empresaFactura: "De raiz s.r.l", empresaPaga: "BGA", date: "2026-10-01", amount: 500, detalle: "DAC · A 10" }]);
});

const DR = "De raiz s.r.l";
const BGA = "BGA";
const pago = (id: number, extra: any) => ({ id, company: DR, date: "2026-10-10", amount: 1000, administration: "negro", paymentMethod: "efectivo", ...extra });

describe("conteo de pagos en efectivo negro por persona", () => {
  it("junta por persona (aunque se escriba distinto) y abre por empresa", () => {
    const [c] = conteoPagosPorPersona([
      pago(1, { pagadoPor: "Lucas Ruiz", amount: 1000, date: "2026-10-01" }),
      pago(2, { pagadoPor: "lucas  ruiz", amount: 500, date: "2026-10-12", company: BGA }),
    ]);
    expect(c).toMatchObject({ persona: "Lucas Ruiz", total: 1500, cantidad: 2, ultimo: "2026-10-12", porEmpresa: { [DR]: 1000, [BGA]: 500 } });
    expect(c.pagos[0].id).toBe(2);
  });

  it("solo cuenta efectivo negro con alguien elegido", () => {
    const r = conteoPagosPorPersona([
      pago(1, { pagadoPor: "" }),
      pago(2, { pagadoPor: "Ana", administration: "blanco" }),
      pago(3, { pagadoPor: "Ana", paymentMethod: "transferencia" }),
      pago(4, { pagadoPor: "Ana" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ persona: "Ana", cantidad: 1, total: 1000 });
  });

  it("ordena de mayor a menor", () => {
    const r = conteoPagosPorPersona([pago(1, { pagadoPor: "A", amount: 10 }), pago(2, { pagadoPor: "B", amount: 99 })]);
    expect(r.map((x) => x.persona)).toEqual(["B", "A"]);
  });
});
