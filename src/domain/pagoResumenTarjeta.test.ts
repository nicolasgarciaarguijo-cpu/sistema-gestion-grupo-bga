import { cuotaBajaLaCuenta, pagaElTotal, pagosDeResumenes, repartoDeResumenes, type ResumenParaPago } from "./pagoResumenTarjeta";

// Nicolas, 21/11/2026: "si yo coloco pagado, el importe del resumen debe descontarse de la cuenta... la
// tarjeta se va a pagar tal como marque el resumen... se imputa el total en la fecha de vencimiento".
const resumen = (extra: Partial<ResumenParaPago> = {}): ResumenParaPago => ({
  id: 1, company: "De Raiz", cardId: 9, closingDate: "2026-11-26", dueDate: "2026-12-09", totalArs: 1000000, paid: false, ...extra,
});

describe("pago del resumen de tarjeta", () => {
  it("la regla nueva vale para los resumenes que cierran desde el 1/11/2026", () => {
    expect(pagaElTotal(resumen())).toBe(true);
    expect(pagaElTotal(resumen({ closingDate: "2026-11-01" }))).toBe(true);
    // El de la Corporate que cerro el 29/10 se cargo a mano como debitos del 11/11: no se toca.
    expect(pagaElTotal(resumen({ closingDate: "2026-10-29", dueDate: "2026-11-11" }))).toBe(false);
    expect(pagaElTotal(undefined)).toBe(false);
  });

  it("reparte el total entre lo linkeado y el resto sin linkear", () => {
    const r = repartoDeResumenes([resumen()], [{ statementId: 1, monto: 300000 }, { statementId: 1, monto: 150000.5 }, { statementId: 2, monto: 999 }, { statementId: null, monto: 50 }]).get(1)!;
    expect(r).toMatchObject({ total: 1000000, linkeado: 450000.5, resto: 549999.5, deMas: 0, pagado: false, fecha: "2026-12-09" });
  });

  it("sin nada linkeado, todo el resumen es resto", () => {
    expect(repartoDeResumenes([resumen()], []).get(1)).toMatchObject({ linkeado: 0, resto: 1000000 });
  });

  it("si lo cargado supera al resumen el resto no es negativo y avisa cuanto hay de mas", () => {
    expect(repartoDeResumenes([resumen()], [{ statementId: 1, monto: 1200000 }]).get(1)).toMatchObject({ resto: 0, deMas: 200000 });
  });

  it("los resumenes anteriores no tienen reparto", () => {
    expect(repartoDeResumenes([resumen({ closingDate: "2026-10-29" })], []).size).toBe(0);
  });

  it("solo el resumen marcado pagado mueve la cuenta, por el TOTAL y en el vencimiento", () => {
    const sinPagar = repartoDeResumenes([resumen()], [{ statementId: 1, monto: 300000 }]);
    expect(pagosDeResumenes(sinPagar)).toEqual([]);
    const pagado = pagosDeResumenes(repartoDeResumenes([resumen({ paid: true })], [{ statementId: 1, monto: 300000 }]));
    expect(pagado).toHaveLength(1);
    expect(pagado[0]).toMatchObject({ total: 1000000, fecha: "2026-12-09" });
  });

  it("sin vencimiento cargado se imputa en el cierre", () => {
    expect(pagosDeResumenes(repartoDeResumenes([resumen({ paid: true, dueDate: "" })], []))[0].fecha).toBe("2026-11-26");
  });

  it("un resumen en cero no genera pago", () => {
    expect(pagosDeResumenes(repartoDeResumenes([resumen({ paid: true, totalArs: 0 })], []))).toEqual([]);
  });

  // La misma plata no puede bajar dos veces: o la baja el resumen, o la bajan sus compras.
  it("las compras de un resumen de la regla nueva no bajan la cuenta; las de uno anterior si", () => {
    const porId = new Map<number, { closingDate?: string }>([[1, { closingDate: "2026-11-26" }], [2, { closingDate: "2026-10-29" }]]);
    expect(cuotaBajaLaCuenta({ statementId: 1 }, porId)).toBe(false);
    expect(cuotaBajaLaCuenta({ statementId: 2 }, porId)).toBe(true);
  });

  it("cuentas: resumen pagado + compras linkeadas suman exactamente el total, no mas", () => {
    const cuotas = [{ statementId: 1, monto: 300000 }, { statementId: 1, monto: 200000 }];
    const reparto = repartoDeResumenes([resumen({ paid: true })], cuotas);
    const porId = new Map<number, { closingDate?: string }>([[1, { closingDate: "2026-11-26" }]]);
    const porCompras = cuotas.filter((q) => cuotaBajaLaCuenta(q, porId)).reduce((a, q) => a + q.monto, 0);
    const porResumen = pagosDeResumenes(reparto).reduce((a, r) => a + r.total, 0);
    expect(porCompras + porResumen).toBe(1000000);
  });

  it("cash flow: lo linkeado mas el resto da el total del resumen", () => {
    const r = repartoDeResumenes([resumen({ paid: true })], [{ statementId: 1, monto: 300000 }, { statementId: 1, monto: 200000 }]).get(1)!;
    expect(r.linkeado + r.resto).toBe(r.total);
  });
});
