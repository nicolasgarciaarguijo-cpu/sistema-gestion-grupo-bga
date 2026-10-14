import { aRenglonDeProveedores, claveGrupo, etiquetaGrupo, parseRenglonProveedor, SECCION_CTACTE, SECCION_PROVEEDORES } from "./gruposProveedores";

const seccion = (ck: string) =>
  ({ ga_contable_cusmano: "gastos_admin", cm_materiales: "compra_materiales", imp_iva_mensual: "impuestos", log_internet: "logistica", b_com_paquete: "bancos", seg_vehiculo: "seguros" } as Record<string, string>)[ck];

describe("grupos de costos por tipo y nombre", () => {
  it("dos grupos con el mismo nombre y distinto tipo son distintos", () => {
    expect(claveGrupo("fijo", "Administrativos")).not.toBe(claveGrupo("variable", "Administrativos"));
    expect(etiquetaGrupo("variable|Administrativos")).toBe("Variable · Administrativos");
  });
});

describe("aRenglonDeProveedores", () => {
  const base = { id: "cost-1", kind: "gasto", title: "Factura A 1 · transferencia" };

  it("el pago va a CUENTAS CORRIENTES o PROVEEDORES según el proveedor, con su nombre", () => {
    const r = aRenglonDeProveedores(base, seccion, { proveedor: "DAC", grupoDelProveedor: "variable|Compras y materiales", cuentaCorriente: true })!;
    expect(parseRenglonProveedor(r.conceptKey)).toEqual({ seccion: SECCION_CTACTE, grupo: "variable|Compras y materiales" });
    expect(r.title).toBe("DAC");
  });

  it("el grupo de la factura le gana al del pago y al del proveedor", () => {
    const r = aRenglonDeProveedores(base, seccion, {
      proveedor: "X", grupoDeFactura: "fijo|Edilicios", grupoDelPago: "fijo|Operativos", grupoDelProveedor: "variable|Compras y materiales", cuentaCorriente: false,
    })!;
    expect(parseRenglonProveedor(r.conceptKey)?.grupo).toBe("fijo|Edilicios");
  });

  it("un pago clasificado en impuestos o bancos se queda donde está", () => {
    expect(aRenglonDeProveedores({ ...base, conceptKey: "imp_iva_mensual" }, seccion, { proveedor: "AFIP", cuentaCorriente: false })).toBeNull();
  });

  it("lo cargado en los renglones viejos va a su grupo equivalente (no se pierde)", () => {
    const r = aRenglonDeProveedores({ id: "bank-9", kind: "banco", title: "Cusmano", conceptKey: "ga_contable_cusmano" }, seccion)!;
    expect(parseRenglonProveedor(r.conceptKey)).toEqual({ seccion: SECCION_PROVEEDORES, grupo: "fijo|Administrativos" });
    const m = aRenglonDeProveedores({ id: "financial-2", kind: "pago", title: "Maderas", conceptKey: "cm_materiales" }, seccion)!;
    expect(parseRenglonProveedor(m.conceptKey)?.grupo).toBe("variable|Compras y materiales");
  });

  it("las comisiones van a Comerciales con el nombre del trabajo", () => {
    const r = aRenglonDeProveedores({ id: "comm-1", kind: "comision", title: "3199 · Granillo" }, seccion)!;
    expect(r.title).toBe("Comisión · 3199 · Granillo");
    expect(parseRenglonProveedor(r.conceptKey)?.grupo).toBe("fijo|Comerciales");
  });

  it("lo que no es de proveedores no se toca", () => {
    expect(aRenglonDeProveedores({ id: "bank-1", kind: "banco", title: "x", conceptKey: "imp_iva_mensual" }, seccion)).toBeNull();
  });
});

describe("bancos y seguros son proveedores", () => {
  it("el débito del banco va a Financieros con el banco como proveedor; el seguro a Seguros", () => {
    const b = aRenglonDeProveedores({ id: "bank-3", kind: "banco", title: "Santander · COMISION PAQUETE", conceptKey: "b_com_paquete" }, seccion)!;
    expect(parseRenglonProveedor(b.conceptKey)?.grupo).toBe("fijo|Financieros");
    expect(b.title).toBe("Santander");
    const s = aRenglonDeProveedores({ id: "financial-4", kind: "pago", title: "La Segunda", conceptKey: "seg_vehiculo" }, seccion)!;
    expect(parseRenglonProveedor(s.conceptKey)?.grupo).toBe("fijo|Seguros");
  });
});
