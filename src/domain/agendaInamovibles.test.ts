import { agendaInamovibles, alertasActivas, pagosAReclamar, sumarMeses, type FuentesInamovibles } from "./agendaInamovibles";
import { realPorRenglonMes } from "./vencimientos";

const vacio = (): FuentesInamovibles => ({
  vencimientos: [],
  marcas: [],
  debtPlans: [],
  tarjetas: [],
  pagosCashflow: [],
  seguros: [],
  sueldos: [],
  real: new Map(),
});
const RANGO: [string, string] = ["2026-10-01", "2026-12-31"];
const HOY = "2026-10-08";

describe("sumarMeses", () => {
  it("conserva el dia y lo acota al ultimo del mes", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(sumarMeses("2026-11-10", 2)).toBe("2027-01-10");
  });
});

// La agenda JUNTA lo que ya esta en el sistema: no se carga dos veces.
describe("agendaInamovibles · fuentes vinculadas", () => {
  it("cuotas de deuda: una por mes desde la proxima", () => {
    const f = vacio();
    f.debtPlans = [{ id: 7, company: "BGA", concept: "Echeq enchapadora", nextInstallmentAmount: 500000, remainingInstallments: 3, nextDueDate: "2026-10-10", active: true }];
    const a = agendaInamovibles(f, ...RANGO, HOY);
    expect(a.map((i) => i.fechaLimite)).toEqual(["2026-10-10", "2026-11-10", "2026-12-10"]);
    expect(a[0].texto).toBe("Faltan 2 días");
    expect(a[0].origen).toBe("deuda");
  });

  it("la marca de pagado de una cuota apaga solo esa cuota", () => {
    const f = vacio();
    f.debtPlans = [{ id: 7, company: "BGA", concept: "Plan", nextInstallmentAmount: 1, remainingInstallments: 2, nextDueDate: "2026-10-10", active: true }];
    f.marcas = [{ id: 1, company: "BGA", clave: "deuda:7:2026-10-10", pagado: true, at: "" }];
    const a = agendaInamovibles(f, ...RANGO, HOY);
    expect(a[0].estado).toBe("pagado");
    expect(a[1].estado).not.toBe("pagado");
  });

  it("tarjeta: usa el pagado de la solapa Tarjetas, y los dolares van en su renglon", () => {
    const f = vacio();
    f.tarjetas = [{ id: 3, company: "BGA", dueDate: "2026-10-09", totalArs: 800000, totalUsd: 50, paid: false, nombre: "Visa" }];
    const a = agendaInamovibles(f, ...RANGO, HOY);
    expect(a.map((i) => i.currency)).toEqual(["ARS", "USD"]);
    expect(a[0].texto).toBe("Faltan 1 día");
    f.tarjetas[0].paid = true;
    expect(agendaInamovibles(f, ...RANGO, HOY).every((i) => i.estado === "pagado")).toBe(true);
  });

  it("pago programado del cash flow: pendiente avisa, realizado no", () => {
    const f = vacio();
    f.pagosCashflow = [
      { id: 1, company: "BGA", date: "2026-10-08", type: "pago", status: "pendiente", title: "Alquiler", amount: 300000 },
      { id: 2, company: "BGA", date: "2026-10-08", type: "pago", status: "realizado", title: "Luz", amount: 1 },
      { id: 3, company: "BGA", date: "2026-10-08", type: "cobranza", status: "pendiente", title: "Cobro", amount: 1 },
    ];
    const a = agendaInamovibles(f, ...RANGO, HOY);
    expect(a.map((i) => i.titulo)).toEqual(["Alquiler", "Luz"]); // la cobranza no es un pago
    expect(a.find((i) => i.titulo === "Alquiler")?.texto).toBe("Vence hoy");
    expect(alertasActivas(a).map((i) => i.titulo)).toEqual(["Alquiler"]);
  });

  it("seguro: se da por pagado cuando cae el debito en su renglon", () => {
    const f = vacio();
    f.seguros = [{ seguroId: 4, company: "BGA", date: "2026-10-10", amount: 20000, administration: "blanco", conceptKey: "seg_vehiculo", tipo: "Vehículo", descripcion: "Kangoo" }];
    expect(agendaInamovibles(f, ...RANGO, HOY)[0].estado).toBe("proximo");
    f.real = realPorRenglonMes([{ date: "2026-10-11", company: "BGA", amount: -20000, conceptKey: "seg_vehiculo" }]);
    const [s] = agendaInamovibles(f, ...RANGO, HOY);
    expect(s.estado).toBe("pagado");
    expect(s.pagadoComo).toBe("cayó en el banco");
  });

  it("sueldos: avisa con su fecha y se marca a mano", () => {
    const f = vacio();
    f.sueldos = [{ company: "BGA", periodo: "2026-09", fecha: "2026-10-06", monto: 0 }];
    const [s] = agendaInamovibles(f, ...RANGO, HOY);
    expect(s.estado).toBe("vencido");
    expect(s.texto).toBe("Vencido hace 2 días");
    f.marcas = [{ id: 1, company: "BGA", clave: "sueldos:BGA:2026-09", pagado: true, at: "" }];
    expect(agendaInamovibles(f, ...RANGO, HOY)[0].estado).toBe("pagado");
  });

  it("todo junto sale ordenado por fecha", () => {
    const f = vacio();
    f.sueldos = [{ company: "BGA", periodo: "2026-09", fecha: "2026-10-06", monto: 0 }];
    f.tarjetas = [{ id: 3, company: "BGA", dueDate: "2026-10-09", totalArs: 1, totalUsd: 0, paid: false, nombre: "Visa" }];
    f.vencimientos = [
      { id: 1, company: "BGA", titulo: "IVA", tipo: "impuesto", monto: 1, administration: "blanco", recurrencia: "mensual", diaDesde: 18, diaHasta: 22, avisoDias: 5, activo: true, notas: "" },
    ];
    const a = agendaInamovibles(f, "2026-10-01", "2026-10-31", HOY);
    expect(a.map((i) => i.origen)).toEqual(["sueldos", "tarjeta", "manual"]);
  });
});

// El reclamo bloqueante (Nicolas, 2026-10-06): un pago que vence sin cargarse exige comprobante o
// reprogramacion.
describe("reclamo de pagos vencidos", () => {
  const deuda = () => {
    const f = vacio();
    f.debtPlans = [{ id: 7, company: "BGA", concept: "Echeq", nextInstallmentAmount: 100, remainingInstallments: 1, nextDueDate: "2026-10-10", active: true }];
    return f;
  };
  it("vencido y sin pagar desde que rige el reclamo -> se reclama", () => {
    const a = agendaInamovibles(deuda(), ...RANGO, "2026-10-12");
    expect(pagosAReclamar(a, "2026-10-07").map((i) => i.clave)).toEqual(["deuda:7:2026-10-10"]);
  });
  it("lo vencido ANTES de que rija el reclamo no bloquea (solo avisa)", () => {
    const a = agendaInamovibles(deuda(), ...RANGO, "2026-10-12");
    expect(pagosAReclamar(a, "2026-10-11")).toHaveLength(0);
    expect(alertasActivas(a)).toHaveLength(1);
  });
  it("reprogramar mueve la fecha limite y deja de reclamar", () => {
    const f = deuda();
    f.marcas = [{ id: 1, company: "BGA", clave: "deuda:7:2026-10-10", pagado: false, at: "", reprogramadoA: "2026-10-20" }];
    const [i] = agendaInamovibles(f, ...RANGO, "2026-10-12");
    expect(i.fechaLimite).toBe("2026-10-20");
    expect(i.reprogramadoDe).toBe("2026-10-10");
    expect(i.texto).toBe("Faltan 8 días");
    expect(pagosAReclamar([i], "2026-10-07")).toHaveLength(0);
  });
  it("el comprobante lo da por pagado", () => {
    const f = deuda();
    f.marcas = [{ id: 1, company: "BGA", clave: "deuda:7:2026-10-10", pagado: false, at: "", comprobante: { fileName: "transferencia.pdf", at: "" } }];
    const [i] = agendaInamovibles(f, ...RANGO, "2026-10-12");
    expect(i.estado).toBe("pagado");
    expect(i.pagadoComo).toBe("con comprobante");
    expect(i.comprobante?.fileName).toBe("transferencia.pdf");
  });
});

