import { invoiceCandidates, invoiceIsFrom, type LinkableInvoice } from "./bankLinking";

const inv = (over: Partial<LinkableInvoice>): LinkableInvoice => ({
  id: 1,
  company: "BGA",
  supplier: "MADERAS DAC S.A.",
  taxId: "30-71234567-9",
  invoiceNumber: "A-0001-00000123",
  invoiceDate: "2026-08-01",
  total: 1_000_000,
  paid: false,
  ...over,
});

describe("invoiceIsFrom", () => {
  it("matchea por CUIT aunque el nombre este escrito distinto", () => {
    expect(
      invoiceIsFrom(inv({ supplier: "DAC MADERAS SA" }), { name: "Otro nombre", taxId: "30712345679" })
    ).toBe(true);
  });
  it("sin CUIT, matchea por nombre normalizado (acentos y puntos no cuentan)", () => {
    expect(invoiceIsFrom(inv({ taxId: "" }), { name: "maderas dac sa" })).toBe(true);
  });
  it("CUIT distinto = no es del proveedor, aunque el nombre se parezca", () => {
    expect(invoiceIsFrom(inv({}), { name: "MADERAS DAC S.A.", taxId: "30-99999999-1" })).toBe(false);
  });
});

describe("invoiceCandidates", () => {
  const debito = { company: "BGA", date: "2026-08-20", amount: 1_000_000 };
  const dac = { name: "MADERAS DAC S.A.", taxId: "30-71234567-9" };

  it("la del mismo importe va primera aunque otra este mas cerca en fecha", () => {
    const r = invoiceCandidates(debito, dac, [
      inv({ id: 2, total: 250_000, invoiceDate: "2026-08-19" }),
      inv({ id: 3, total: 1_000_000, invoiceDate: "2026-06-10" }),
    ]);
    expect(r.map((c) => c.invoice.id)).toEqual([3, 2]);
    expect(r[0].sameAmount).toBe(true);
  });

  it("no ofrece facturas ya pagadas ni de otra empresa", () => {
    const r = invoiceCandidates(debito, dac, [
      inv({ id: 4, paid: true }),
      inv({ id: 5, company: "De Raiz" }),
      inv({ id: 6 }),
    ]);
    expect(r.map((c) => c.invoice.id)).toEqual([6]);
  });

  it("filtra por proveedor cuando se elige uno", () => {
    const r = invoiceCandidates(debito, dac, [
      inv({ id: 7, supplier: "OTRO PROVEEDOR", taxId: "30-11111111-1", total: 999 }),
      inv({ id: 8, total: 999 }),
    ]);
    expect(r.map((c) => c.invoice.id)).toEqual([8]);
  });

  it("sin proveedor elegido, ofrece las de cualquiera (el usuario decide)", () => {
    const r = invoiceCandidates(debito, null, [
      inv({ id: 9, supplier: "OTRO", taxId: "30-11111111-1", total: 1_000_000, invoiceDate: "2026-01-02" }),
    ]);
    expect(r.map((c) => c.invoice.id)).toEqual([9]);
  });

  it("una factura vieja con OTRO importe queda fuera de la ventana de dias", () => {
    const r = invoiceCandidates(debito, dac, [
      inv({ id: 10, total: 500_000, invoiceDate: "2025-01-05" }),
    ]);
    expect(r).toHaveLength(0);
  });

  it("una factura vieja del MISMO importe se ofrece igual (el importe pesa mas)", () => {
    const r = invoiceCandidates(debito, dac, [
      inv({ id: 11, total: 1_000_000, invoiceDate: "2025-01-05" }),
    ]);
    expect(r.map((c) => c.invoice.id)).toEqual([11]);
  });

  it("tolera $1 de diferencia (redondeos) y toma el monto en valor absoluto", () => {
    const r = invoiceCandidates({ ...debito, amount: -1_000_000.5 }, dac, [inv({ id: 12 })]);
    expect(r[0].sameAmount).toBe(true);
  });
});
