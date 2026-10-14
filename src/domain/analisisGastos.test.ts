import { analizarGastos, egresoDeEntrada, egresoDePrevisto, fvEfectivo } from "./analisisGastos";

const base = { company: "De raiz s.r.l", date: "2026-10-05", title: "x", amount: 1000 };

describe("egresoDeEntrada", () => {
  it("clasifica cada egreso por la sección de su renglón", () => {
    expect(egresoDeEntrada({ ...base, id: "a", kind: "banco", statusLabel: "debito", conceptKey: "imp_iva_mensual" })?.grupo).toBe("empresariales");
    expect(egresoDeEntrada({ ...base, id: "b", kind: "gasto", conceptKey: "cm_materiales" })?.grupo).toBe("materiales");
    expect(egresoDeEntrada({ ...base, id: "c", kind: "haberes-negro", conceptKey: "custom:haberes:Juan" })?.grupo).toBe("personal");
    expect(egresoDeEntrada({ ...base, id: "d", kind: "comision", conceptKey: "" })?.grupo).toBe("funcionamiento");
    expect(egresoDeEntrada({ ...base, id: "e", kind: "banco", statusLabel: "debito" })?.grupo).toBe("sinClasificar");
  });

  it("no cuenta ingresos, facturas, pases internos ni la extracción de la caja chica", () => {
    expect(egresoDeEntrada({ ...base, id: "f", kind: "cobranza", conceptKey: "cobranzas" })).toBeNull();
    expect(egresoDeEntrada({ ...base, id: "g", kind: "banco", statusLabel: "credito", conceptKey: "prestamo_gustavo" })).toBeNull();
    expect(egresoDeEntrada({ ...base, id: "h", kind: "compra", conceptKey: "__facturacion__" })).toBeNull();
    expect(egresoDeEntrada({ ...base, id: "i", kind: "mov-interno", conceptKey: "mi_out_pase" })).toBeNull();
    expect(egresoDeEntrada({ ...base, id: "j", kind: "banco", statusLabel: "debito", conceptKey: "cc_caja_chica" })).toBeNull();
    expect(egresoDeEntrada({ ...base, id: "k", kind: "banco", statusLabel: "credito" })).toBeNull();
    expect(egresoDeEntrada({ ...base, id: "m", kind: "pago", statusLabel: "pendiente", conceptKey: "log_internet" })).toBeNull();
  });

  it("guarda blanco/negro y fijo/variable tal como vienen", () => {
    const e = egresoDeEntrada({ ...base, id: "l", kind: "gasto", conceptKey: "log_internet", administration: "negro", costKind: "fijo" })!;
    expect(e.administracion).toBe("negro");
    expect(e.fv).toBe("fijo");
  });
});

describe("egresoDePrevisto", () => {
  it("una tarjeta sin pagar es inamovible y va a Bancos y tarjetas; lo pagado no se repite", () => {
    const p = { clave: "t1", origen: "tarjeta", company: "x", titulo: "Visa", fechaLimite: "2026-10-10", monto: 500, currency: "ARS" as const, pagado: false };
    expect(egresoDePrevisto(p)).toMatchObject({ estado: "inamovible", grupo: "bancos" });
    expect(egresoDePrevisto({ ...p, pagado: true })).toBeNull();
  });
});

describe("analizarGastos", () => {
  it("solo lo realizado suma; blanco, negro y dólares van separados", () => {
    const egresos = [
      egresoDeEntrada({ ...base, id: "1", kind: "gasto", conceptKey: "cm_materiales", amount: 100 })!,
      egresoDeEntrada({ ...base, id: "2", kind: "gasto", conceptKey: "cm_materiales", amount: 50, administration: "negro" })!,
      egresoDeEntrada({ ...base, id: "3", kind: "banco", statusLabel: "debito", conceptKey: "cm_materiales", amount: 7, currency: "USD" })!,
      egresoDePrevisto({ clave: "p", origen: "manual", company: "x", titulo: "Material", fechaLimite: "2026-10-20", monto: 999, currency: "ARS", conceptKey: "cm_materiales", pagado: false })!,
      egresoDeEntrada({ ...base, id: "4", kind: "gasto", conceptKey: "cm_materiales", amount: 1, date: "2026-11-01" })!,
    ];
    const r = analizarGastos(egresos, "2026-10-01", "2026-10-31");
    const mat = r.grupos.find((g) => g.key === "materiales")!;
    expect(mat.realizado).toMatchObject({ blanco: 100, negro: 50, total: 150 });
    expect(mat.usd.total).toBe(7);
    expect(mat.previsto).toBe(999);
    expect(r.total.total).toBe(150);
    expect(r.previsto.programado).toBe(999);
  });
});

describe("fvEfectivo", () => {
  const cfg = { log_internet: { kind: "fijo" as const, locked: true }, cm_materiales: { kind: "variable" as const, locked: false } };
  it("con candado manda el tipo de gasto aunque el pago diga otra cosa", () => {
    expect(fvEfectivo("variable", "log_internet", cfg)).toBe("fijo");
  });
  it("sin candado manda el pago; si el pago no tiene, la sugerencia del renglón", () => {
    expect(fvEfectivo("fijo", "cm_materiales", cfg)).toBe("fijo");
    expect(fvEfectivo(undefined, "cm_materiales", cfg)).toBe("variable");
    expect(fvEfectivo(undefined, "otro", cfg)).toBeUndefined();
  });
  it("el estado elegido para un pago programado le gana al de su origen", () => {
    const p = { clave: "t1", origen: "tarjeta", company: "x", titulo: "Visa", fechaLimite: "2026-10-10", monto: 5, currency: "ARS" as const, pagado: false, estadoPago: "estimado" as const };
    expect(egresoDePrevisto(p)?.estado).toBe("estimado");
  });
});
