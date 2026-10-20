import { estadoDePagos, pagosDeFactura, pagosVinculados, vinculoDePagos } from "./pagosDeFactura";

describe("varios pagos sobre una factura", () => {
  const montos: Record<number, number> = { 1: 400, 2: 600, 3: 100 };
  const montoDe = (id: number) => montos[id];

  it("junta la lista y el pago viejo sin repetir", () => {
    expect(pagosDeFactura({ total: 1000, pagosIds: [1, 2], paidByCostEntryId: 2 })).toEqual([1, 2]);
    expect(pagosDeFactura({ total: 1000, paidByCostEntryId: 3 })).toEqual([3]);
  });

  it("a medio pagar muestra el saldo; completa cuando llega al total", () => {
    expect(estadoDePagos({ total: 1000, pagosIds: [1] }, montoDe)).toEqual({ pagado: 400, saldo: 600, completa: false, ids: [1] });
    expect(estadoDePagos({ total: 1000, pagosIds: [1, 2] }, montoDe)).toMatchObject({ pagado: 1000, saldo: 0, completa: true });
  });

  it("un pago borrado no cuenta", () => {
    expect(estadoDePagos({ total: 1000, pagosIds: [1, 99] }, montoDe)).toMatchObject({ pagado: 400, ids: [1] });
  });

  it("la factura queda 'pagada' (paidByCostEntryId) solo con el total cubierto", () => {
    expect(vinculoDePagos(1000, [{ id: 1, monto: 400 }])).toEqual({ pagosIds: [1], paidByCostEntryId: null });
    expect(vinculoDePagos(1000, [{ id: 1, monto: 400 }, { id: 2, monto: 600 }])).toEqual({ pagosIds: [1, 2], paidByCostEntryId: 2 });
    expect(vinculoDePagos(1000, [])).toEqual({ pagosIds: [], paidByCostEntryId: null });
  });

  it("sabe que pagos ya estan tomados por alguna factura", () => {
    expect(Array.from(pagosVinculados([{ total: 1, pagosIds: [1] }, { total: 1, paidByCostEntryId: 3 }]))).toEqual([1, 3]);
  });
});
