import { facturaDelEgreso } from "./AnalisisGastos";

// 2026-11-13: el saldo previsto de una factura (fecha, estado y de que cuenta sale) se corrige SOLO en
// la ficha de la factura. El previsto de una factura llega con la clave "factura:<id>" de agendaInamovibles,
// y el menu tiene que ofrecer abrir esa ficha en lugar de las pills de estado.
describe("el previsto de una factura manda a su ficha", () => {
  it("saca el id de la factura de la clave del previsto", () => {
    expect(facturaDelEgreso({ id: "prev-factura:1234" })).toBe(1234);
  });

  it("los previstos de otro origen no son facturas (siguen con las pills de estado)", () => {
    expect(facturaDelEgreso({ id: "prev-tarjeta:7" })).toBeNull();
    expect(facturaDelEgreso({ id: "prev-deuda:12:2026-11-10" })).toBeNull();
    expect(facturaDelEgreso({ id: "prev-seguro:4:2026-10" })).toBeNull();
    expect(facturaDelEgreso({ id: "prev-cashflow:88" })).toBeNull();
  });

  it("un pago ya realizado no se confunde con el previsto de una factura", () => {
    expect(facturaDelEgreso({ id: "factura:1234" })).toBeNull();
    expect(facturaDelEgreso({ id: "pago-55" })).toBeNull();
  });
});
