import {
  aperturaDeEjercicio,
  billeterasDesdeReserva,
  cierreQueBloquea,
  construirCierre,
  ejercicioDeFecha,
  estaBloqueado,
  motivosParaNoCerrar,
  particionarFacturasCompra,
  particionarFondos,
  particionarGastosDeCajaChica,
  particionarPorFecha,
  particionarTrabajos,
  resumenDeLaPurga,
  totalDeMoneda,
  ultimoCierre,
} from "./cierreEjercicio";
import type { CierreEjercicio } from "./cierreEjercicio";

const DERAIZ = "De raiz s.r.l";
const BGA = "BGA";

const reservaVacia = {
  wallets: [
    { currency: "ARS" as const, location: "banco" as const, byColor: { blanco: { closing: 1000 }, negro: { closing: 300 } } },
    { currency: "ARS" as const, location: "efectivo" as const, byColor: { blanco: { closing: 50 }, negro: { closing: 20 } } },
    { currency: "USD" as const, location: "banco" as const, byColor: { blanco: { closing: 400 }, negro: { closing: 0 } } },
    { currency: "USD" as const, location: "efectivo" as const, byColor: { blanco: { closing: 0 }, negro: { closing: 10 } } },
  ],
};

const cierre = (over: Partial<CierreEjercicio> = {}): CierreEjercicio => ({
  ...construirCierre({
    id: 1,
    company: DERAIZ,
    fiscalStartMonth: 11,
    fiscalStartYear: 2025,
    closedAt: "2026-11-02T10:00:00.000Z",
    closedBy: "Nicolas",
    reserva: reservaVacia,
    aCobrar: 0,
    aPagar: 0,
    cuentaCorrienteGrupo: 0,
    resultado: { ingresos: 0, egresos: 0, resultado: 0 },
    iva: { debito: 0, credito: 0, saldo: 0 },
  }),
  ...over,
});

describe("ejercicio de una fecha (año fiscal nov-oct)", () => {
  it("noviembre arranca el ejercicio nuevo", () => {
    expect(ejercicioDeFecha(11, "2025-11-01")).toBe(2025);
    expect(ejercicioDeFecha(11, "2026-10-31")).toBe(2025);
    expect(ejercicioDeFecha(11, "2026-11-01")).toBe(2026);
  });

  it("una fecha basura no pertenece a ningún ejercicio", () => {
    expect(ejercicioDeFecha(11, "")).toBeNull();
    expect(ejercicioDeFecha(11, "2026-13")).toBeNull();
  });
});

describe("la foto del cierre", () => {
  it("arma los límites del ejercicio sola, a partir del mes de inicio", () => {
    const c = cierre();
    expect(c.startIso).toBe("2025-11-01");
    expect(c.endIso).toBe("2026-10-31");
  });

  it("guarda las 8 billeteras aunque estén en cero", () => {
    expect(billeterasDesdeReserva({ wallets: [] })).toHaveLength(8);
    expect(billeterasDesdeReserva({ wallets: [] }).every((b) => b.amount === 0)).toBe(true);
  });

  it("pesos y dólares NUNCA se suman entre sí", () => {
    const b = cierre().billeteras;
    expect(totalDeMoneda(b, "ARS")).toBe(1370); // 1000 + 300 + 50 + 20
    expect(totalDeMoneda(b, "USD")).toBe(410); // 400 + 10
  });

  it("se puede leer una billetera sola: el negro que quedó en efectivo", () => {
    expect(totalDeMoneda(cierre().billeteras, "ARS", { location: "efectivo", color: "negro" })).toBe(20);
  });
});

describe("el candado: tocar no se puede", () => {
  const cierres = [cierre()];

  it("bloquea cualquier fecha hasta el fin del ejercicio cerrado", () => {
    expect(estaBloqueado(cierres, DERAIZ, "2026-10-31")).toBe(true);
    expect(estaBloqueado(cierres, DERAIZ, "2026-03-15")).toBe(true);
  });

  it("bloquea también lo MÁS VIEJO que el ejercicio cerrado", () => {
    // Si se cerró nov-25/oct-26, meter mano en 2024 tampoco corresponde.
    expect(estaBloqueado(cierres, DERAIZ, "2024-05-10")).toBe(true);
  });

  it("no bloquea el ejercicio nuevo", () => {
    expect(estaBloqueado(cierres, DERAIZ, "2026-11-01")).toBe(false);
  });

  it("el cierre de una empresa no bloquea a la otra", () => {
    expect(estaBloqueado(cierres, BGA, "2026-03-15")).toBe(false);
  });

  it("un cierre reabierto deja de bloquear", () => {
    const reabierto = [{ ...cierre(), reopenedAt: "2026-11-05T12:00:00.000Z", reopenedBy: "Nicolas" }];
    expect(estaBloqueado(reabierto, DERAIZ, "2026-03-15")).toBe(false);
    expect(cierreQueBloquea(reabierto, DERAIZ, "2026-03-15")).toBeNull();
    expect(ultimoCierre(reabierto, DERAIZ)).toBeNull();
  });
});

describe("apertura del ejercicio siguiente", () => {
  it("el cierre de un ejercicio es la apertura del que sigue", () => {
    const c = cierre();
    expect(aperturaDeEjercicio([c], DERAIZ, 2026)).toEqual(c);
  });

  it("sin cierre anterior no hay apertura (se sigue calculando como hasta ahora)", () => {
    expect(aperturaDeEjercicio([cierre()], DERAIZ, 2028)).toBeNull();
    expect(aperturaDeEjercicio([], DERAIZ, 2026)).toBeNull();
  });
});

describe("motivos para NO cerrar", () => {
  const base = { cierres: [] as CierreEjercicio[], company: DERAIZ, fiscalStartMonth: 11, fiscalStartYear: 2025 };

  it("no deja cerrar un ejercicio que todavía no terminó", () => {
    expect(motivosParaNoCerrar({ ...base, hoyIso: "2026-08-27" })[0]).toMatch(/todavía no llegó/);
  });

  it("deja cerrar el día después del cierre", () => {
    expect(motivosParaNoCerrar({ ...base, hoyIso: "2026-11-01" })).toEqual([]);
  });

  it("no deja cerrar dos veces", () => {
    const m = motivosParaNoCerrar({ ...base, cierres: [cierre()], hoyIso: "2026-11-01" });
    expect(m).toContain("Este ejercicio ya está cerrado.");
  });

  it("no deja saltearse un ejercicio", () => {
    const viejo = { ...cierre(), id: 9, fiscalStartYear: 2023, startIso: "2023-11-01", endIso: "2024-10-31" };
    const m = motivosParaNoCerrar({ ...base, fiscalStartYear: 2026, cierres: [viejo], hoyIso: "2027-11-01" });
    expect(m.some((x) => x.includes("salteando"))).toBe(true);
  });
});

describe("la partición: qué queda en el sistema y qué se va a las carpetas", () => {
  const FIN = "2026-10-31";

  it("lo del ejercicio se archiva; lo del ejercicio nuevo se queda", () => {
    const r = particionarPorFecha(
      [
        { id: 1, company: DERAIZ, date: "2026-03-01" },
        { id: 2, company: DERAIZ, date: "2026-11-15" },
      ] as any[],
      DERAIZ,
      FIN
    );
    expect(r.archivar.map((x: any) => x.id)).toEqual([1]);
    expect(r.quedan.map((x: any) => x.id)).toEqual([2]);
  });

  it("lo de la OTRA empresa no se toca", () => {
    const r = particionarPorFecha([{ id: 1, company: BGA, date: "2026-03-01" }] as any[], DERAIZ, FIN);
    expect(r.archivar).toHaveLength(0);
    expect(r.quedan).toHaveLength(1);
  });

  it("sin fecha no se archiva: mejor que quede a la vista que hacerlo desaparecer", () => {
    const r = particionarPorFecha([{ id: 1, company: DERAIZ, date: "" }] as any[], DERAIZ, FIN);
    expect(r.quedan).toHaveLength(1);
  });

  it("un trabajo con saldo a cobrar SE QUEDA; uno cobrado y terminado se archiva", () => {
    const r = particionarTrabajos(
      [
        { id: 1, company: DERAIZ, date: "2026-05-01", saldoACobrar: 500000, terminado: true },
        { id: 2, company: DERAIZ, date: "2026-05-01", saldoACobrar: 0, terminado: true },
      ],
      DERAIZ,
      FIN
    );
    expect(r.quedan.map((t) => t.id)).toEqual([1]);
    expect(r.archivar.map((t) => t.id)).toEqual([2]);
  });

  it("un trabajo cobrado pero SIN TERMINAR se queda", () => {
    const r = particionarTrabajos(
      [{ id: 3, company: DERAIZ, date: "2026-05-01", saldoACobrar: 0, terminado: false }],
      DERAIZ,
      FIN
    );
    expect(r.quedan.map((t) => t.id)).toEqual([3]);
  });

  it("un trabajo cobrado con comisión pendiente se queda", () => {
    const r = particionarTrabajos(
      [{ id: 4, company: DERAIZ, date: "2026-05-01", saldoACobrar: 0, comisionPendiente: 90000, terminado: true }],
      DERAIZ,
      FIN
    );
    expect(r.quedan.map((t) => t.id)).toEqual([4]);
  });

  it("la factura de compra impaga se queda (es deuda viva); la pagada se archiva", () => {
    const r = particionarFacturasCompra(
      [
        { id: 1, company: DERAIZ, date: "2026-06-01", pagada: false },
        { id: 2, company: DERAIZ, date: "2026-06-01", pagada: true },
      ],
      DERAIZ,
      FIN
    );
    expect(r.quedan.map((f) => f.id)).toEqual([1]);
    expect(r.archivar.map((f) => f.id)).toEqual([2]);
  });

  it("el fondo de caja chica abierto se queda con sus gastos, aunque sean del año cerrado", () => {
    const fondos = particionarFondos(
      [
        { id: 10, company: DERAIZ, date: "2026-09-01", closed: false },
        { id: 11, company: DERAIZ, date: "2026-02-01", closed: true },
      ],
      DERAIZ,
      FIN
    );
    expect(fondos.quedan.map((f) => f.id)).toEqual([10]);

    const gastos = particionarGastosDeCajaChica(
      [
        { id: 1, company: DERAIZ, date: "2026-09-05", fundId: 10 },
        { id: 2, company: DERAIZ, date: "2026-02-05", fundId: 11 },
        { id: 3, company: DERAIZ, date: "2026-02-06", fundId: null },
      ] as any[],
      DERAIZ,
      FIN,
      fondos.quedan
    );
    expect(gastos.quedan.map((g: any) => g.id)).toEqual([1]);
    expect(gastos.archivar.map((g: any) => g.id)).toEqual([2, 3]);
  });

  it("el resumen cuenta lo que se va y lo que queda", () => {
    const r = resumenDeLaPurga([
      { nombre: "Banco", archivar: [1, 2, 3], quedan: [] },
      { nombre: "Trabajos", archivar: [1], quedan: [1, 2] },
    ]);
    expect(r.archivados).toBe(4);
    expect(r.conservados).toBe(2);
    expect(r.detalle[0]).toEqual({ nombre: "Banco", archivar: 3, quedan: 0 });
  });
});
