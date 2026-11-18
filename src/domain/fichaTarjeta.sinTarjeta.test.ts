import { fichaDelResumen, sugerirPagoSinTarjeta, type PagoSinTarjetaF, type RenglonF, type ResumenF, type TarjetaF } from "./fichaTarjeta";

// Nicolas, 18/11/2026: "sí, ampliala". La sugerencia solo miraba los pagos cargados CON la tarjeta, y por
// eso había 386 renglones de resumen y un solo pago linkeado: los gastos pagados con la tarjeta están
// cargados como transferencia o efectivo. Ahora esos también se sugieren, y aceptarlos pasa el pago a la
// tarjeta (recién ahí deja de bajar la cuenta el día de la compra).
const renglon = (extra: Partial<RenglonF> = {}): RenglonF => ({
  id: 1,
  company: "BGA",
  cardId: 10,
  statementId: 100,
  date: "2026-11-05",
  description: "PINTURERIA DEL FONDO",
  amount: 120000,
  currency: "ARS",
  cardDigits: "4411",
  ...extra,
});

const pago = (extra: Partial<PagoSinTarjetaF> = {}): PagoSinTarjetaF => ({
  id: 77,
  company: "BGA",
  date: "2026-11-05",
  amount: 120000,
  supplier: "Pinturería del fondo",
  description: "Factura A 1-234",
  medio: "transferencia",
  ...extra,
});

describe("sugerir un pago que no dice tarjeta", () => {
  it("lo encuentra por monto y fecha, y avisa cómo está cargado", () => {
    const s = sugerirPagoSinTarjeta(renglon(), [pago()], new Set())!;
    expect(s).toMatchObject({ pagoId: 77, cuota: 1, pasarATarjeta: true });
    expect(s.motivo).toContain("mismo monto");
    expect(s.motivo).toContain("transferencia");
  });

  // Nicolas, 18/11/2026: "empiezo a comprar con tarjeta ni bien cierra el mes anterior": 35 días.
  it("acepta una diferencia de un peso y hasta 35 días", () => {
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ amount: 120000.5 })], new Set())).not.toBeNull();
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ date: "2026-10-20" })], new Set())).not.toBeNull();
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ date: "2026-10-05" })], new Set())).not.toBeNull();
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ date: "2026-09-20" })], new Set())).toBeNull();
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ amount: 125000 })], new Set())).toBeNull();
  });

  it("el pago ya conciliado contra el banco NO se sugiere: esa plata salió del banco", () => {
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ bankEntryId: 5 })], new Set())).toBeNull();
  });

  it("no cruza empresas ni toma uno ya usado", () => {
    expect(sugerirPagoSinTarjeta(renglon(), [pago({ company: "De Raiz" })], new Set())).toBeNull();
    expect(sugerirPagoSinTarjeta(renglon(), [pago()], new Set(["77:1"]))).toBeNull();
  });

  it("si el renglón es una cuota de varias no se sugiere (el pago está por el total)", () => {
    expect(sugerirPagoSinTarjeta(renglon({ installments: "02/06" }), [pago()], new Set())).toBeNull();
    // Una cuota de una sí.
    expect(sugerirPagoSinTarjeta(renglon({ installments: "01/01" }), [pago()], new Set())).not.toBeNull();
  });

  it("los dólares no se sugieren", () => {
    expect(sugerirPagoSinTarjeta(renglon({ currency: "USD" }), [pago()], new Set())).toBeNull();
  });

  it("elige el más cercano en fecha", () => {
    const s = sugerirPagoSinTarjeta(renglon(), [pago({ id: 1, date: "2026-11-01" }), pago({ id: 2, date: "2026-11-05" })], new Set())!;
    expect(s.pagoId).toBe(2);
  });
});

describe("la ficha del resumen con los dos tipos de sugerencia", () => {
  const tarjeta: TarjetaF = { id: 10, company: "BGA", name: "Visa", bank: "Santander", lastDigits: "4411" } as any;
  const resumen: ResumenF = { id: 100, company: "BGA", cardId: 10, closingDate: "2026-11-10", dueDate: "2026-11-20", totalArs: 120000 };

  it("si no hay ningún pago con la tarjeta, sugiere el cargado con otro medio", () => {
    const f = fichaDelResumen(resumen, [renglon()], [], [tarjeta], [resumen], [renglon()], [pago()]);
    expect(f.renglones[0].estado).toBe("sugerido");
    expect(f.renglones[0].sugerencia).toMatchObject({ pagoId: 77, pasarATarjeta: true });
  });

  it("el pago con la tarjeta puesta le gana al que está cargado con otro medio", () => {
    const conTarjeta = { id: 5, company: "BGA", tarjetaId: 10, date: "2026-11-05", amount: 120000, supplier: "Pinturería", description: "" };
    const f = fichaDelResumen(resumen, [renglon()], [conTarjeta], [tarjeta], [resumen], [renglon()], [pago()]);
    expect(f.renglones[0].sugerencia).toMatchObject({ pagoId: 5 });
    expect(f.renglones[0].sugerencia!.pasarATarjeta).toBeUndefined();
  });

  it("sin pagos de ningún tipo el renglón queda pendiente", () => {
    const f = fichaDelResumen(resumen, [renglon()], [], [tarjeta], [resumen], [renglon()], []);
    expect(f.renglones[0].estado).toBe("pendiente");
  });

  it("un pago sin tarjeta no se sugiere dos veces en el mismo resumen", () => {
    const dos = [renglon({ id: 1 }), renglon({ id: 2 })];
    const f = fichaDelResumen(resumen, dos, [], [tarjeta], [resumen], dos, [pago()]);
    expect(f.renglones.filter((x) => x.estado === "sugerido")).toHaveLength(1);
    expect(f.renglones.filter((x) => x.estado === "pendiente")).toHaveLength(1);
  });
});
