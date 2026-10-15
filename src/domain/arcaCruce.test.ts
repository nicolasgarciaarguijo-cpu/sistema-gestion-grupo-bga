import { buscarFacturaCargada, nombreParecido, numeroSinPuntoDeVenta } from "./arcaCruce";

const DR = "De raiz s.r.l";
const cargada = (extra: any) => ({
  id: 1, company: DR, supplier: "DEL CARRIL", taxId: "", invoiceNumber: "5001", invoiceDate: "2026-10-08", total: 170000, ...extra,
});
const arca = (extra: any) => ({
  date: "2026-10-07", pointOfSale: "00003", number: "00005001", counterpartyTaxId: "30712345678",
  counterpartyName: "DEL CARRIL MADERAS SRL", total: 170000, ...extra,
});

describe("numeroSinPuntoDeVenta", () => {
  it("saca el punto de venta y los ceros", () => {
    expect(numeroSinPuntoDeVenta("0003-00005001")).toBe("5001");
    expect(numeroSinPuntoDeVenta("5001")).toBe("5001");
    expect(numeroSinPuntoDeVenta("A 0005001")).toBe("5001");
    expect(numeroSinPuntoDeVenta("000300005001")).toBe("5001");
    expect(numeroSinPuntoDeVenta("")).toBe("");
  });
});

it("nombre parecido ignora SRL, SA, acentos y mayusculas", () => {
  expect(nombreParecido("DEL CARRIL", "Del Carril Maderas S.R.L.")).toBe(true);
  expect(nombreParecido("Corralón Norte", "CORRALON NORTE SA")).toBe(true);
  expect(nombreParecido("Pinturerias Rex", "Del Carril")).toBe(false);
});

describe("buscarFacturaCargada", () => {
  it("la cargada a mano con el numero corto y sin CUIT es la misma que la de ARCA", () => {
    expect(buscarFacturaCargada(arca({}), DR, [cargada({})])?.id).toBe(1);
  });

  it("con CUIT en las dos, manda el CUIT (mismo numero de otro proveedor NO es la misma)", () => {
    const otra = cargada({ taxId: "30-99999999-1", supplier: "DEL CARRIL" });
    expect(buscarFacturaCargada(arca({}), DR, [otra])).toBeUndefined();
    const misma = cargada({ taxId: "30-71234567-8", supplier: "otro nombre" });
    expect(buscarFacturaCargada(arca({}), DR, [misma])?.id).toBe(1);
  });

  it("de otra empresa no cruza", () => {
    expect(buscarFacturaCargada(arca({}), "BGA", [cargada({})])).toBeUndefined();
  });

  it("cargada sin numero: cruza por emisor, total y fecha cercana", () => {
    const sinNumero = cargada({ invoiceNumber: "" });
    expect(buscarFacturaCargada(arca({}), DR, [sinNumero])?.id).toBe(1);
    expect(buscarFacturaCargada(arca({ total: 170500 }), DR, [sinNumero])).toBeUndefined();
    expect(buscarFacturaCargada(arca({ date: "2026-09-01" }), DR, [sinNumero])).toBeUndefined();
  });

  it("una factura nueva (otro numero) no cruza con nada", () => {
    expect(buscarFacturaCargada(arca({ number: "5002" }), DR, [cargada({})])).toBeUndefined();
  });
});
