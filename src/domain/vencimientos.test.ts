import {
  agendaDeVencimientos,
  diasEntre,
  estadoOcurrencia,
  ocurrenciasEnRango,
  pagadoPorConciliacion,
  previsionesDeVencimientos,
  realPorRenglonMes,
  textoVentana,
  type Vencimiento,
} from "./vencimientos";

const v = (over: Partial<Vencimiento> = {}): Vencimiento => ({
  id: 1,
  company: "BGA",
  titulo: "IVA",
  tipo: "impuesto",
  monto: 100000,
  administration: "blanco",
  conceptKey: "imp_iva",
  recurrencia: "mensual",
  diaDesde: 18,
  diaHasta: 22,
  avisoDias: 5,
  activo: true,
  notas: "",
  ...over,
});

describe("ocurrenciasEnRango", () => {
  it("mensual: una ocurrencia por mes con su ventana", () => {
    const os = ocurrenciasEnRango(v(), "2026-10-01", "2026-11-30");
    expect(os.map((o) => o.key)).toEqual(["2026-10", "2026-11"]);
    expect(os[0].ventanaDesde).toBe("2026-10-18");
    expect(os[0].ventanaHasta).toBe("2026-10-22");
    expect(os[0].fechaLimite).toBe("2026-10-22"); // sin confirmar, manda el ultimo dia de la ventana
  });

  it("la ventana que cruza de mes (28 al 5) termina en el mes siguiente", () => {
    // Octubre toca dos ventanas: la de septiembre (28/09 al 05/10) y la de octubre (28/10 al 05/11).
    const os = ocurrenciasEnRango(v({ diaDesde: 28, diaHasta: 5 }), "2026-10-01", "2026-10-31");
    expect(os.map((x) => x.key)).toEqual(["2026-09", "2026-10"]);
    const o = os[1];
    expect(o.ventanaDesde).toBe("2026-10-28");
    expect(o.ventanaHasta).toBe("2026-11-05");
  });

  it("el dia 31 en febrero se acota al ultimo dia del mes", () => {
    const os = ocurrenciasEnRango(v({ diaDesde: 31, diaHasta: 31 }), "2027-02-01", "2027-02-28");
    expect(os.find((o) => o.key === "2027-02")?.ventanaHasta).toBe("2027-02-28");
  });

  it("anual: solo en su mes", () => {
    const os = ocurrenciasEnRango(v({ recurrencia: "anual", mes: 5, diaDesde: 10, diaHasta: 15 }), "2026-01-01", "2027-12-31");
    expect(os.map((o) => o.ventanaDesde)).toEqual(["2026-05-10", "2027-05-10"]);
  });

  it("unica: una sola vez, entre sus fechas", () => {
    const vv = v({ recurrencia: "unica", fechaDesde: "2026-11-03", fechaHasta: "2026-11-07" });
    expect(ocurrenciasEnRango(vv, "2026-10-01", "2026-12-31")).toHaveLength(1);
    expect(ocurrenciasEnRango(vv, "2027-01-01", "2027-12-31")).toHaveLength(0);
  });

  it("la fecha confirmada pasa a ser la fecha limite", () => {
    const [o] = ocurrenciasEnRango(v({ ocurrencias: { "2026-10": { fecha: "2026-10-20" } } }), "2026-10-01", "2026-10-31");
    expect(o.fechaConfirmada).toBe("2026-10-20");
    expect(o.fechaLimite).toBe("2026-10-20");
  });

  it("cuenta desde que se cargo: los meses anteriores al alta no aparecen como vencidos", () => {
    const os = ocurrenciasEnRango(v({ createdAt: "2026-10-05" }), "2026-07-01", "2026-11-30");
    expect(os.map((o) => o.key)).toEqual(["2026-10", "2026-11"]);
  });

  it("un vencimiento inactivo no genera nada", () => {
    expect(ocurrenciasEnRango(v({ activo: false }), "2026-10-01", "2026-10-31")).toHaveLength(0);
  });
});

describe("estadoOcurrencia (la cuenta regresiva)", () => {
  const [o] = ocurrenciasEnRango(v(), "2026-10-01", "2026-10-31"); // limite 22/10, aviso 5 dias
  it("faltan 2 dias", () => {
    const e = estadoOcurrencia(o, "2026-10-20");
    expect(e.estado).toBe("proximo");
    expect(e.texto).toBe("Faltan 2 días");
    expect(e.alerta).toBe(true);
  });
  it("falta 1 dia (singular)", () => {
    expect(estadoOcurrencia(o, "2026-10-21").texto).toBe("Faltan 1 día");
  });
  it("vence hoy", () => {
    expect(estadoOcurrencia(o, "2026-10-22").texto).toBe("Vence hoy");
  });
  it("vencido sin pagar sigue avisando", () => {
    const e = estadoOcurrencia(o, "2026-10-24");
    expect(e.estado).toBe("vencido");
    expect(e.texto).toBe("Vencido hace 2 días");
    expect(e.alerta).toBe(true);
  });
  it("lejos de la fecha no avisa", () => {
    expect(estadoOcurrencia(o, "2026-10-05").alerta).toBe(false);
  });
  it("pagado a mano apaga la alerta", () => {
    const [p] = ocurrenciasEnRango(v({ ocurrencias: { "2026-10": { pagado: true } } }), "2026-10-01", "2026-10-31");
    const e = estadoOcurrencia(p, "2026-10-24");
    expect(e.estado).toBe("pagado");
    expect(e.alerta).toBe(false);
  });
});

describe("pagado por el banco (conciliacion)", () => {
  const [o] = ocurrenciasEnRango(v(), "2026-10-01", "2026-10-31");
  it("si cae en el renglon y mes lo que se preveia, esta pagado", () => {
    const real = realPorRenglonMes([{ date: "2026-10-21", company: "BGA", amount: -100000, conceptKey: "imp_iva" }]);
    expect(pagadoPorConciliacion(o, real)).toBe(true);
    expect(agendaDeVencimientos([v()], "2026-10-01", "2026-10-31", "2026-10-24", real)[0].estado).toBe("pagado");
  });
  it("un pago parcial no alcanza", () => {
    const real = realPorRenglonMes([{ date: "2026-10-21", company: "BGA", amount: 40000, conceptKey: "imp_iva" }]);
    expect(pagadoPorConciliacion(o, real)).toBe(false);
  });
  it("lo de otra empresa no cuenta", () => {
    const real = realPorRenglonMes([{ date: "2026-10-21", company: "De raiz", amount: 100000, conceptKey: "imp_iva" }]);
    expect(pagadoPorConciliacion(o, real)).toBe(false);
  });
  it("sin renglon no se puede conciliar: queda a mano", () => {
    const [sin] = ocurrenciasEnRango(v({ conceptKey: "" }), "2026-10-01", "2026-10-31");
    const real = realPorRenglonMes([{ date: "2026-10-21", company: "BGA", amount: 100000, conceptKey: "imp_iva" }]);
    expect(pagadoPorConciliacion(sin, real)).toBe(false);
  });
});

describe("previsionesDeVencimientos (lo que baja al cash flow)", () => {
  it("sin fecha confirmada NO baja al calendario", () => {
    expect(previsionesDeVencimientos([v()], "2026-10-01", "2026-10-31")).toHaveLength(0);
  });
  it("con fecha confirmada y renglon baja en esa fecha", () => {
    const p = previsionesDeVencimientos(
      [v({ ocurrencias: { "2026-10": { fecha: "2026-10-20", monto: 120000 } } })],
      "2026-10-01",
      "2026-10-31"
    );
    expect(p).toEqual([
      expect.objectContaining({ conceptKey: "imp_iva", date: "2026-10-20", amount: 120000, company: "BGA" }),
    ]);
  });
  it("sin renglon no baja (no tendria donde dibujarse)", () => {
    const p = previsionesDeVencimientos(
      [v({ conceptKey: "", ocurrencias: { "2026-10": { fecha: "2026-10-20" } } })],
      "2026-10-01",
      "2026-10-31"
    );
    expect(p).toHaveLength(0);
  });
});

describe("utilidades", () => {
  it("diasEntre cuenta dias enteros", () => {
    expect(diasEntre("2026-10-05", "2026-10-07")).toBe(2);
    expect(diasEntre("2026-10-07", "2026-10-05")).toBe(-2);
  });
  it("textoVentana", () => {
    expect(textoVentana(v())).toBe("del 18 al 22 de cada mes");
    expect(textoVentana(v({ recurrencia: "anual", mes: 5, diaDesde: 10, diaHasta: 10 }))).toBe("el 10 de mayo, todos los años");
    expect(textoVentana(v({ recurrencia: "unica", fechaDesde: "2026-11-03", fechaHasta: "2026-11-07" }))).toBe(
      "del 03/11/2026 al 07/11/2026"
    );
  });
});
