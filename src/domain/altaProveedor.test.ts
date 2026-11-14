import { nuevoProveedor, faltaDelProveedor, textoFalta } from "./altaProveedor";

// Nicolas 2026-11-13: el proveedor se daba de alta en 7 lugares con datos distintos. Una sola puerta.
describe("una sola puerta para dar de alta un proveedor", () => {
  it("dos altas del mismo proveedor por caminos distintos salen iguales", () => {
    const desdeFactura = nuevoProveedor(1, { name: " Dac Maderas ", taxId: " 30-11111111-9 ", company: "De Raíz", origen: "factura" });
    const desdeCaja = nuevoProveedor(2, { name: "Dac Maderas", taxId: "30-11111111-9", company: "De Raíz", origen: "cajaChica" });
    const sinId = ({ id, notes, ...resto }: any) => resto;
    expect(sinId(desdeFactura)).toEqual(sinId(desdeCaja));
    expect(desdeFactura.active).toBe(true);
    expect(desdeFactura.aliases).toBe("");
    expect(desdeFactura.name).toBe("Dac Maderas");
    expect(desdeFactura.taxId).toBe("30-11111111-9");
  });

  it("el alta automática deja asentado de dónde salió", () => {
    expect(nuevoProveedor(1, { name: "Barsi", company: "BGA", origen: "factura", detalleOrigen: "A 0001-0002" }).notes).toBe(
      "Alta desde una factura de compra · A 0001-0002"
    );
    expect(nuevoProveedor(1, { name: "Banco Nación", company: "General", origen: "banco" }).notes).toContain("comisiones");
  });

  it("el alta a mano respeta la nota que escribió la persona", () => {
    expect(nuevoProveedor(1, { name: "Barsi", company: "BGA", origen: "ficha", notes: "Lo atiende Jorge" }).notes).toBe("Lo atiende Jorge");
  });

  it("no inventa campos que no se cargaron", () => {
    const p = nuevoProveedor(1, { name: "Barsi", company: "BGA", origen: "arca" });
    expect("grupoCosto" in p).toBe(false);
    expect("currentAccount" in p).toBe(false);
  });

  it("avisa qué le falta para servir", () => {
    expect(faltaDelProveedor({ name: "Barsi" })).toEqual(["el CUIT", "la condición de pago", "el grupo de costo"]);
    expect(faltaDelProveedor({ name: "Barsi", taxId: "30-11111111-9", condicionPago: { tipo: "contado" }, grupoCosto: "fijo|Administrativos" })).toEqual([]);
  });

  it("el de débito automático no necesita condición de pago (se paga en el resumen)", () => {
    expect(faltaDelProveedor({ name: "Edenor", taxId: "30111111119", grupoCosto: "fijo|Servicios", debitoAutomatico: true })).toEqual([]);
  });

  it("el aviso se lee como una frase", () => {
    expect(textoFalta(["el CUIT", "la condición de pago", "el grupo de costo"])).toBe("falta el CUIT, la condición de pago y el grupo de costo");
    expect(textoFalta(["el CUIT"])).toBe("falta el CUIT");
    expect(textoFalta([])).toBe("");
  });
});
