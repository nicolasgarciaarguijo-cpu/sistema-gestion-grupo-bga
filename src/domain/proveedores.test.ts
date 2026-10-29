import { buscarProveedor, fechaDePago, facturasPorPagar, facturasPagadasProgramadas, tipoGastoEfectivo } from "./proveedores";

const DAC = {
  id: 1,
  name: "DAC Maderas",
  taxId: "30-11111111-1",
  aliases: "DAC SA, dac maderas srl",
  tipoGasto: "cm_materiales",
  tipoGastoLocked: true,
  condicionPago: { tipo: "dias" as const, dias: 30 },
};
const LIBRE = { id: 2, name: "Ferretería", taxId: "", tipoGasto: "ci_insumos", tipoGastoLocked: false };

describe("buscarProveedor", () => {
  it("encuentra por CUIT, por nombre y por alias", () => {
    expect(buscarProveedor([DAC, LIBRE], "cualquiera", "30111111111")?.id).toBe(1);
    expect(buscarProveedor([DAC, LIBRE], "dac maderas")?.id).toBe(1);
    expect(buscarProveedor([DAC, LIBRE], "DAC S.A.")?.id).toBe(1);
    expect(buscarProveedor([DAC, LIBRE], "otro")).toBeUndefined();
  });
});

describe("tipoGastoEfectivo", () => {
  it("con candado clasifica sola; sin candado no; lo propio siempre gana", () => {
    expect(tipoGastoEfectivo(undefined, DAC)).toBe("cm_materiales");
    expect(tipoGastoEfectivo(undefined, LIBRE)).toBeUndefined();
    expect(tipoGastoEfectivo("log_internet", DAC)).toBe("log_internet");
  });
});

describe("fechaDePago", () => {
  it("contado, a N días y el día X de cada mes", () => {
    expect(fechaDePago("2026-10-14", { tipo: "contado" })).toBe("2026-10-14");
    expect(fechaDePago("2026-10-14", { tipo: "dias", dias: 30 })).toBe("2026-11-13");
    expect(fechaDePago("2026-10-14", { tipo: "diaDelMes", dia: 20 })).toBe("2026-10-20");
    expect(fechaDePago("2026-10-14", { tipo: "diaDelMes", dia: 10 })).toBe("2026-11-10");
    expect(fechaDePago("2026-01-31", { tipo: "diaDelMes", dia: 31 })).toBe("2026-01-31");
    expect(fechaDePago("2026-02-10", { tipo: "diaDelMes", dia: 31 })).toBe("2026-02-28");
    expect(fechaDePago("2026-10-14", undefined)).toBeUndefined();
  });
});

describe("facturasPorPagar", () => {
  const base = { company: "x", invoiceNumber: "A-1", invoiceDate: "2026-10-01", total: 100, administration: "blanco" as const };
  it("solo las impagas con fecha; la fecha propia gana a la condición", () => {
    const r = facturasPorPagar(
      [
        { ...base, id: 1, supplier: "DAC Maderas", taxId: "" },
        { ...base, id: 2, supplier: "DAC Maderas", taxId: "", paidByCostEntryId: 9 },
        { ...base, id: 3, supplier: "Ferretería", taxId: "" },
        { ...base, id: 4, supplier: "Ferretería", taxId: "", fechaPagoPrevista: "2026-10-25" },
        { ...base, id: 5, supplier: "DAC Maderas", taxId: "", source: "caja_chica" },
        { ...base, id: 6, supplier: "DAC Maderas", taxId: "", paidByPerson: "Juan" },
      ],
      [DAC, LIBRE]
    );
    expect(r.map((f) => f.id)).toEqual([1, 4]);
    expect(r[0]).toMatchObject({ fechaPago: "2026-10-31", conceptKey: "cm_materiales", fechaElegida: false });
    expect(r[1]).toMatchObject({ fechaPago: "2026-10-25", conceptKey: undefined, fechaElegida: true });
  });
});

describe("calendario de pagos: los pagos de la factura en su fecha (Trumar, 28/10/2026)", () => {
  const factura = {
    id: 1, company: "De raiz s.r.l", supplier: "Trumar S.A.I.C.", taxId: "", invoiceNumber: "7189", invoiceDate: "2026-10-23",
    total: 4168213.11, administration: "blanco" as const, fechaPagoPrevista: "2026-10-30", paidByCostEntryId: 11, pagosIds: [10, 11],
  };
  const pagos = [
    { id: 10, date: "2026-11-26", amount: 2000000, paymentMethod: "transferencia" },
    { id: 11, date: "2026-12-22", amount: 2168213.11, paymentMethod: "transferencia" },
  ];
  it("cada pago va en su fecha, pendiente, y no la factura tachada el 30/10", () => {
    const r = facturasPagadasProgramadas([factura], [], pagos, "2026-10-28");
    expect(r.map((x) => [x.fechaPago, x.total, x.pagoId, x.pagoHecho])).toEqual([
      ["2026-11-26", 2000000, 10, false],
      ["2026-12-22", 2168213.11, 11, false],
    ]);
  });
  it("es un calendario de pagos: con los pagos ya hechos siguen siendo los pagos, tachados (nunca la factura)", () => {
    const r = facturasPagadasProgramadas([factura], [], pagos, "2027-01-05");
    expect(r.map((x) => [x.fechaPago, x.pagoId, x.pagoHecho])).toEqual([
      ["2026-11-26", 10, true],
      ["2026-12-22", 11, true],
    ]);
  });
});
