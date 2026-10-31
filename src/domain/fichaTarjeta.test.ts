import { cuentaDeTarjeta, plasticoDe, fichaDelResumen, sugerirPago, mismoResponsable, vinculosDeCuotas, resumenesDelPago, type TarjetaF, type ResumenF, type RenglonF, type PagoF } from "./fichaTarjeta";
import { cuotasEsperadas } from "./controlTarjetas";

const tarjetas: TarjetaF[] = [
  { id: 1, company: "De Raiz", name: "Visa Corporate", bank: "Patagonia", lastDigits: "" },
  { id: 2, company: "De Raiz", name: "Gustavo", bank: "Patagonia", lastDigits: "7301", responsable: "Gustavo Garcia" },
  { id: 3, company: "De Raiz", name: "Lucas", bank: "Patagonia", lastDigits: "7335", responsable: "Lucas Ruiz", cuentaTarjetaId: 1 },
  { id: 9, company: "BGA", name: "Visa Business", bank: "Patagonia", lastDigits: "" },
];
const resumenes: ResumenF[] = [
  { id: 100, company: "De Raiz", cardId: 1, closingDate: "2026-11-26", dueDate: "2026-12-07", totalArs: 0 },
  { id: 101, company: "De Raiz", cardId: 1, closingDate: "2026-12-30", dueDate: "2027-01-11", totalArs: 0 },
  { id: 900, company: "BGA", cardId: 9, closingDate: "2026-11-26", dueDate: "2026-12-07", totalArs: 0 },
];
const pago = (p: Partial<PagoF>): PagoF => ({ id: 1, company: "De Raiz", tarjetaId: 3, date: "2026-11-10", amount: 1000, supplier: "Pintureria", description: "", ...p });
const renglon = (r: Partial<RenglonF>): RenglonF => ({ id: 1, company: "De Raiz", cardId: 1, statementId: 100, date: "2026-11-10", description: "PINTURERIA", amount: 1000, currency: "ARS", cardDigits: "7335", holder: "LUCAS RUIZ MANSILLA", ...r });

describe("ficha de tarjeta", () => {
  it("el plastico va a su cuenta: por el campo, o por ser el unico banco igual de la empresa con resumenes", () => {
    expect(cuentaDeTarjeta(3, tarjetas, resumenes)).toBe(1);
    expect(cuentaDeTarjeta(2, tarjetas, resumenes)).toBe(1);
    expect(cuentaDeTarjeta(1, tarjetas, resumenes)).toBe(1);
    // Otra empresa con el mismo banco: no se mezcla.
    expect(cuentaDeTarjeta(9, tarjetas, resumenes)).toBe(9);
  });

  it("si el banco cambia el plastico, sigue sobre el responsable", () => {
    expect(mismoResponsable("GUSTAVO O GARCIA A", "Gustavo Garcia")).toBe(true);
    expect(mismoResponsable("MARIA M GARCIA A", "Gustavo Garcia")).toBe(false);
    const p = plasticoDe(1, "7319", "GUSTAVO O GARCIA A", tarjetas, resumenes)!;
    expect(p.tarjeta.id).toBe(2);
    expect(p.cambioDeNumero).toBe(true);
    expect(plasticoDe(1, "7301", "", tarjetas, resumenes)!.cambioDeNumero).toBe(false);
    // El numero viejo queda reconocido.
    const conAnterior = tarjetas.map((t) => (t.id === 2 ? { ...t, lastDigits: "7319", numerosAnteriores: "7301" } : t));
    expect(plasticoDe(1, "7301", "", conAnterior, resumenes)!.tarjeta.id).toBe(2);
  });

  it("sugiere el pago con una tarjeta de esa cuenta por la cuota y la fecha de compra", () => {
    const enCuotas = pago({ id: 7, amount: 3000, cuotas: 3 });
    const s = sugerirPago(renglon({ installments: "02/03" }), 1, [enCuotas], tarjetas, resumenes, new Set())!;
    expect(s).toEqual(expect.objectContaining({ pagoId: 7, cuota: 2 }));
    // Ya linkeada esa cuota en otro resumen: no se vuelve a sugerir.
    expect(sugerirPago(renglon({ installments: "02/03" }), 1, [enCuotas], tarjetas, resumenes, new Set(["7:2"]))).toBeNull();
    // Pago de otra empresa: nunca.
    expect(sugerirPago(renglon({}), 1, [pago({ company: "BGA" })], tarjetas, resumenes, new Set())).toBeNull();
  });

  it("estado del resumen: linkeado, sugerido, comisiones y el tilde", () => {
    const renglones = [
      renglon({ id: 1, pagoId: 1, cuotaNro: 1 }),
      renglon({ id: 2, description: "NAFTA", amount: 500 }),
      renglon({ id: 3, description: "IMPUESTO DE SELLOS", amount: 40, cardDigits: "", holder: "" }),
      renglon({ id: 4, description: "SU PAGO EN PESOS", amount: -9000, cardDigits: "", holder: "" }),
    ];
    const f = fichaDelResumen(resumenes[0], renglones, [pago({ id: 1 }), pago({ id: 2, amount: 500, date: "2026-11-09" })], tarjetas, resumenes);
    expect(f.obligatorio).toBe(true);
    expect(f.renglones.map((x) => x.estado)).toEqual(["linkeado", "sugerido", "comision", "pago_resumen"]);
    expect(f.comisionesArs).toBe(40);
    expect(f.completo).toBe(false);
    expect(f.porPlastico[0].tarjeta?.id).toBe(3);
    const listo = fichaDelResumen(resumenes[0], renglones.map((r) => (r.id === 2 ? { ...r, pagoId: 2, cuotaNro: 1 } : r)), [pago({ id: 1 }), pago({ id: 2, amount: 500 })], tarjetas, resumenes);
    expect(listo.completo).toBe(true);
  });

  it("un consumo sin pago se puede mandar a comisiones; un cargo linkeado a mano deja de ser comision", () => {
    const f = fichaDelResumen(resumenes[0], [renglon({ id: 5, description: "PERSONAL", aComisiones: true })], [], tarjetas, resumenes);
    expect(f.renglones[0].estado).toBe("comision");
    expect(f.completo).toBe(true);
  });

  it("avisa las cuotas cargadas que caen en el resumen y nadie linkeo", () => {
    const f = fichaDelResumen(resumenes[1], [], [pago({ id: 7, amount: 3000, cuotas: 3 })], tarjetas, resumenes);
    expect(f.cuotasSinRenglon).toEqual([expect.objectContaining({ cuota: 2, de: 3, monto: 1000 })]);
  });

  it("resumenes antes del ejercicio nuevo no son obligatorios", () => {
    const viejo: ResumenF = { id: 50, company: "De Raiz", cardId: 1, closingDate: "2026-10-01", dueDate: "2026-10-13", totalArs: 0 };
    expect(fichaDelResumen(viejo, [], [], tarjetas, [viejo, ...resumenes]).obligatorio).toBe(false);
  });

  it("la cuota linkeada se paga el dia del vencimiento de SU resumen y el pago ve el resumen", () => {
    const renglones = [renglon({ id: 1, statementId: 101, pagoId: 7, cuotaNro: 1 })];
    const compras = [{ id: 7, company: "De Raiz", tarjetaId: 3, date: "2026-11-10", amount: 1000, cuotas: 1, description: "", supplier: "" }];
    const q = cuotasEsperadas(compras, resumenes, { cuentaDe: (id) => cuentaDeTarjeta(id, tarjetas, resumenes), vinculos: vinculosDeCuotas(renglones) });
    expect(q[0].statementId).toBe(101);
    expect(q[0].dueDate).toBe("2027-01-11");
    // Sin link, por orden de cierres de la CUENTA (aunque el pago se cargo con el plastico).
    const sinLink = cuotasEsperadas(compras, resumenes, { cuentaDe: (id) => cuentaDeTarjeta(id, tarjetas, resumenes) });
    expect(sinLink[0].dueDate).toBe("2026-12-07");
    expect(resumenesDelPago(7, renglones, resumenes).map((s) => s.id)).toEqual([101]);
  });
});
