import {
  aplicarRemito,
  costoSalidasDelTrabajo,
  efectoEnStock,
  esCompraDeMateriales,
  proximoNumero,
  recepcionesSinFactura,
  type Remito,
} from "./remitos";

const items = () => [
  { id: 1, quantity: 10, unitPrice: 100, movements: [] as any[] },
  { id: 2, quantity: 5, unitPrice: 50, movements: [] as any[] },
];
const remito = (extra: Partial<Remito> = {}): Remito => ({
  id: 70,
  company: "BGA",
  tipo: "recepcion",
  numero: "0001-00000123",
  fecha: "2026-10-14",
  proveedor: "DAC SA",
  renglones: [
    { id: 1, stockItemId: 1, codigo: "MEL-001", descripcion: "Melamina", unidad: "u", cantidad: 10, precioUnitario: 200 },
    { id: 2, stockItemId: null, codigo: "", descripcion: "Algo sin stock", unidad: "u", cantidad: 3, precioUnitario: 1 },
  ],
  notas: "",
  creadoEl: "2026-10-14",
  ...extra,
});
let seq = 1000;
const nid = () => ++seq;

describe("remitos y stock", () => {
  it("la recepcion suma, la salida resta y la entrega no mueve stock", () => {
    expect(efectoEnStock(remito()).get(1)).toBe(10);
    expect(efectoEnStock(remito({ tipo: "salida" })).get(1)).toBe(-10);
    expect(efectoEnStock(remito({ tipo: "entrega" })).size).toBe(0);
  });

  it("una recepcion nueva suma, deja el movimiento y promedia el precio", () => {
    const r = aplicarRemito(items(), null, remito(), nid);
    expect(r[0].quantity).toBe(20);
    expect(r[0].unitPrice).toBe(150);
    expect(r[0].movements![0]).toMatchObject({ type: "entrada", quantity: 10, remitoId: 70 });
    expect(r[1]).toEqual(items()[1]);
  });

  it("editar el remito corrige el stock (deshace lo anterior) y quitarlo lo devuelve", () => {
    const original = remito();
    const conRemito = aplicarRemito(items(), null, original, nid);
    const editado = { ...original, renglones: [{ ...original.renglones[0], cantidad: 4 }] };
    const corregido = aplicarRemito(conRemito, original, editado, nid);
    expect(corregido[0].quantity).toBe(14);
    expect(corregido[0].movements!.filter((m: any) => m.remitoId === 70)).toHaveLength(1);
    const quitado = aplicarRemito(corregido, editado, null, nid);
    expect(quitado[0].quantity).toBe(10);
    expect(quitado[0].movements!.filter((m: any) => m.remitoId === 70)).toHaveLength(0);
  });

  it("la salida por trabajo descuenta y queda imputada al trabajo", () => {
    const s = remito({ id: 80, tipo: "salida", jobId: 9, numero: "S-0001", renglones: [{ id: 1, stockItemId: 2, codigo: "", descripcion: "x", unidad: "u", cantidad: 2, precioUnitario: 50 }] });
    const r = aplicarRemito(items(), null, s, nid);
    expect(r[1].quantity).toBe(3);
    expect(r[1].movements![0]).toMatchObject({ type: "salida", quantity: 2, jobId: 9 });
    expect(costoSalidasDelTrabajo([s], 9)).toBe(100);
  });

  it("numeracion propia por empresa y tipo", () => {
    const rs = [remito({ tipo: "salida", numero: "S-0007" }), remito({ tipo: "salida", numero: "S-0002", company: "De Raiz" })];
    expect(proximoNumero(rs, "BGA", "salida")).toBe("S-0008");
    expect(proximoNumero(rs, "BGA", "entrega")).toBe("E-0001");
  });

  it("solo las compras de materiales van al stock; recepciones sin factura del proveedor", () => {
    expect(esCompraDeMateriales("variable|Compras y materiales")).toBe(true);
    expect(esCompraDeMateriales("fijo|Administrativos")).toBe(false);
    const rs = [remito(), remito({ id: 71, purchaseInvoiceId: 5 }), remito({ id: 72, proveedor: "Otro" })];
    expect(recepcionesSinFactura(rs, "BGA", "DAC S.A.").map((r) => r.id)).toEqual([70]);
  });
});
