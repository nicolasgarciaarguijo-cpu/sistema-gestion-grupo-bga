import { agregar, listaVigente, mover, nombresActivos, prefijoDeGrupo, quitar, renombrar, cambiar } from "./listasSistema";

describe("listados del sistema (Nicolas, 31/10/2026)", () => {
  it("sin tocar, valen los de siempre; tocados, mandan", () => {
    expect(nombresActivos({}, "tiposTrabajo")).toContain("Cocina");
    const listas = { tiposTrabajo: [{ nombre: "General" }, { nombre: "Baño" }, { nombre: "Placard", activo: false }] };
    expect(nombresActivos(listas, "tiposTrabajo")).toEqual(["General", "Baño"]);
    expect(listaVigente(listas, "tiposTrabajo")).toHaveLength(3);
  });

  it("agregar no repite; renombrar y borrar respetan los del sistema y lo que está en uso", () => {
    const l = listaVigente({}, "tiposTrabajo");
    expect(agregar(l, " cocina ").ok).toBe(false);
    const r = agregar(l, "Baño");
    expect(r.ok && r.lista[r.lista.length - 1]).toEqual({ nombre: "Baño" });
    expect(renombrar("tiposTrabajo", l, "General", "Todos").ok).toBe(false);
    expect(renombrar("tiposTrabajo", l, "Cocina", "Vestidor").ok).toBe(false);
    const rr = renombrar("tiposTrabajo", l, "Cocina", "Cocinas");
    expect(rr.ok && rr.lista.map((x) => x.nombre)).toContain("Cocinas");
    expect(quitar("tiposTrabajo", l, "Cocina", 3).ok).toBe(false);
    expect(quitar("tiposTrabajo", l, "General", 0).ok).toBe(false);
    expect(quitar("tiposTrabajo", l, "Cocina", 0).ok).toBe(true);
    expect(mover(l, "Mobiliario", -1)[0].nombre).toBe("Mobiliario");
    expect(cambiar(l, "Cocina", { activo: false }).find((x) => x.nombre === "Cocina")?.activo).toBe(false);
  });

  it("el prefijo del código: el cargado, el de siempre o las tres primeras letras", () => {
    expect(prefijoDeGrupo({}, "Melaminas")).toBe("MEL");
    expect(prefijoDeGrupo({ gruposStock: [{ nombre: "Melaminas", codigo: "mlm" }] }, "Melaminas")).toBe("MLM");
    expect(prefijoDeGrupo({}, "Vidrios")).toBe("VID");
  });
});

describe("aplicarListasVigentes", () => {
  const { aplicarListasVigentes } = require("./listasSistema");
  const { PAYMENT_METHOD_OPTIONS } = require("./types");
  const { GRUPOS_MAQUINAS, ESTADOS_MAQUINA } = require("./mantenimiento");
  const { rubroDeRenglon } = require("./checklistProduccion");
  const { GRUPOS_GASTO } = require("./analisisGastos");
  afterAll(() => aplicarListasVigentes({}));

  it("vuelca lo editado en las listas que leen las pantallas, sin perder los valores internos", () => {
    aplicarListasVigentes({
      mediosPago: [{ nombre: "Transferencia bancaria", valor: "transferencia" }, { nombre: "Mercado Pago", valor: "Mercado Pago" }, { nombre: "Cheque", valor: "cheque", activo: false }],
      estadosMaquina: [{ nombre: "Anda", valor: "operativa" }, { nombre: "Prestada", valor: "Prestada" }],
      gruposStock: [{ nombre: "Vidrios", rubro: "materiales" }, { nombre: "Electricidad", rubro: "fuera" }, { nombre: "Compresores", maquinas: true }],
      gruposGasto: [{ nombre: "Sueldos y cargas", valor: "personal" }],
    });
    expect(PAYMENT_METHOD_OPTIONS).toEqual([{ value: "transferencia", label: "Transferencia bancaria" }, { value: "Mercado Pago", label: "Mercado Pago" }]);
    expect(ESTADOS_MAQUINA[0]).toMatchObject({ value: "operativa", label: "Anda", color: "#16a34a" });
    expect(ESTADOS_MAQUINA[1].color).toBe("#64748b");
    expect(GRUPOS_MAQUINAS).toEqual(["Maquinas pesadas", "Maquinas manuales", "Herramientas", "Compresores"]);
    expect(rubroDeRenglon("Electricidad", false)).toBeNull();
    expect(rubroDeRenglon("Insumos carpinteria", false)).toBe("insumos");
    expect(GRUPOS_GASTO.find((g: any) => g.key === "personal").label).toBe("Sueldos y cargas");
    expect(GRUPOS_GASTO.find((g: any) => g.key === "bancos").label).toBe("Bancos y tarjetas");
    aplicarListasVigentes({});
    expect(PAYMENT_METHOD_OPTIONS).toHaveLength(6);
    expect(rubroDeRenglon("Electricidad", false)).toBe("herrajes");
  });

  it("en las listas por valor se renombran también los del sistema, pero no se borran", () => {
    const { renombrar, quitar, agregar, listaVigente } = require("./listasSistema");
    const l = listaVigente({}, "mediosPago");
    const r = renombrar("mediosPago", l, "Efectivo", "Efectivo en mano");
    expect(r.ok && r.lista.find((x: any) => x.valor === "efectivo").nombre).toBe("Efectivo en mano");
    expect(quitar("mediosPago", l, "Efectivo", 0).ok).toBe(false);
    const a = agregar(l, "Mercado Pago", undefined, "mediosPago");
    expect(a.ok && a.lista[a.lista.length - 1]).toEqual({ nombre: "Mercado Pago", valor: "Mercado Pago" });
    expect(agregar(listaVigente({}, "gruposGasto"), "Nuevo", undefined, "gruposGasto").ok).toBe(false);
  });
});
