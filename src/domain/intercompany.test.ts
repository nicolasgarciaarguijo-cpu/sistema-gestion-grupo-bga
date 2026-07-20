import {
  detectIntercompanyTransfers,
  isOwnCompanyTaxId,
  summarizeIntercompany,
} from "./intercompany";
import type { BankMovement, GroupCompany } from "./intercompany";

const GRUPO: GroupCompany[] = [
  { company: "BGA", taxId: "30-71527468-6" },
  { company: "DE RAIZ", taxId: "30-71769540-9" },
];

const mov = (over: Partial<BankMovement> = {}): BankMovement => ({
  id: 1,
  company: "BGA",
  date: "2026-05-14",
  amount: 1000,
  movementType: "debito",
  text: "Transferencia realizada A de raiz srl / / varios - var / 307 Ref: 30717695409",
  ...over,
});

describe("isOwnCompanyTaxId", () => {
  it("reconoce el CUIT de una empresa del grupo aunque venga con guiones", () => {
    expect(isOwnCompanyTaxId("30717695409", GRUPO)).toBe(true);
    expect(isOwnCompanyTaxId("30-71769540-9", GRUPO)).toBe(true);
  });
  it("un proveedor de verdad no es empresa propia", () => {
    expect(isOwnCompanyTaxId("30-53580371-0", GRUPO)).toBe(false);
    expect(isOwnCompanyTaxId("", GRUPO)).toBe(false);
  });
});

describe("detectIntercompanyTransfers", () => {
  it("detecta el giro por el CUIT de la otra empresa", () => {
    const r = detectIntercompanyTransfers([mov()], GRUPO);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ from: "BGA", to: "DE RAIZ", amount: 1000, declaresInvoice: false });
  });

  it("marca los que dicen factura en el concepto", () => {
    const r = detectIntercompanyTransfers(
      [mov({ text: "Transferencia realizada A de raiz srl / factura - fac / 30 Ref: 30717695409" })],
      GRUPO
    );
    expect(r[0].declaresInvoice).toBe(true);
  });

  // El credito del otro lado es el MISMO giro visto desde la otra cuenta: contarlo seria duplicar.
  it("no cuenta el credito espejo del otro lado", () => {
    const debito = mov({ id: 1 });
    const creditoEspejo = mov({
      id: 2,
      company: "DE RAIZ",
      movementType: "credito",
      text: "Transferencia recibida DE bga Ref: 30715274686",
    });
    const r = detectIntercompanyTransfers([debito, creditoEspejo], GRUPO);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
  });

  it("mover plata entre cuentas propias no es un giro entre empresas", () => {
    const propio = mov({ text: "Transferencia entre cuentas propias Ref: 30715274686" });
    expect(detectIntercompanyTransfers([propio], GRUPO)).toHaveLength(0);
  });

  it("un pago a un proveedor comun no entra", () => {
    const proveedor = mov({ text: "Transferencia realizada A dac Ref: 30535803710" });
    expect(detectIntercompanyTransfers([proveedor], GRUPO)).toHaveLength(0);
  });
});

describe("summarizeIntercompany", () => {
  const transfers = detectIntercompanyTransfers(
    [
      mov({ id: 1, amount: 100 }),
      mov({
        id: 2,
        amount: 300,
        text: "Transferencia realizada A de raiz srl / factura - fac Ref: 30717695409",
      }),
    ],
    GRUPO
  );

  it("suma lo girado y separa lo que declara factura de lo que no", () => {
    const r = summarizeIntercompany({ transfers });
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0]).toMatchObject({
      from: "BGA",
      to: "DE RAIZ",
      transferred: 400,
      declaredWithInvoice: 300,
      withoutBacking: 100,
      transfersCount: 2,
    });
  });

  // La factura va al reves del giro: si BGA gira, De Raiz le factura a BGA.
  it("cruza la factura contra el giro y deja el saldo a definir", () => {
    const r = summarizeIntercompany({
      transfers,
      invoices: [{ from: "DE RAIZ", to: "BGA", date: "2026-05-20", amount: 250 }],
    });
    expect(r.pairs[0].invoiced).toBe(250);
    expect(r.pairs[0].pending).toBe(150); // girado 400 - facturado 250
    expect(r.totalPending).toBe(150);
  });

  it("si se facturo de mas el pendiente da negativo (hay que devolver o acreditar)", () => {
    const r = summarizeIntercompany({
      transfers,
      invoices: [{ from: "DE RAIZ", to: "BGA", date: "2026-05-20", amount: 500 }],
    });
    expect(r.pairs[0].pending).toBe(-100);
  });

  it("el neto por empresa dice quien puso plata y quien la recibio", () => {
    const r = summarizeIntercompany({ transfers });
    expect(r.netByCompany["BGA"]).toBe(400);
    expect(r.netByCompany["DE RAIZ"]).toBe(-400);
    expect(r.totalTransferred).toBe(400);
  });

  it("sin giros no rompe", () => {
    const r = summarizeIntercompany({ transfers: [] });
    expect(r.pairs).toEqual([]);
    expect(r.totalTransferred).toBe(0);
  });
});
