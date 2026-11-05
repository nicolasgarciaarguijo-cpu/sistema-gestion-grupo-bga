import { posicionEntreEmpresas, repartirPorEjercicio, summarizeIntercompany } from "./intercompany";
import { bloqueDeDeuda, comprasDeConvenios, cuotasPendientes, deudaDesdeRegistro } from "./desendeudamiento";
import { summarizeContributions } from "./contributions";

const cierre = { startIso: "2025-11-01", endIso: "2026-10-31" };
const giro = (from: string, to: string, date: string, amount: number) => ({ id: 1, from, to, date, amount, text: "", declaresInvoice: false });

describe("cuenta entre empresas: cada ejercicio arranca en cero", () => {
  const giros = [giro("BGA", "DR", "2025-10-31", 7), giro("BGA", "DR", "2026-10-31", 1000), giro("BGA", "DR", "2026-11-01", 50)];

  it("lo del ejercicio cerrado queda aparte y el corriente solo ve lo nuevo", () => {
    const r = repartirPorEjercicio(giros, () => cierre);
    expect(r.corriente.map((g) => g.amount)).toEqual([50]);
    expect(r.anterior.map((g) => g.amount)).toEqual([1000]);
  });

  it("el desbalance viejo no pasa al ejercicio nuevo, pero se puede consultar", () => {
    const r = repartirPorEjercicio(giros, () => cierre);
    const saldo = (t: any[]) => posicionEntreEmpresas(summarizeIntercompany({ transfers: t }).pairs);
    expect(saldo(r.corriente)).toEqual([{ deudor: "DR", acreedor: "BGA", saldo: 50 }]);
    expect(saldo(r.anterior)).toEqual([{ deudor: "DR", acreedor: "BGA", saldo: 1000 }]);
  });

  it("sin cierre, todo es del ejercicio corriente", () => {
    expect(repartirPorEjercicio(giros, () => null).corriente).toHaveLength(3);
  });
});

describe("migrar de Deudas y aportes a Desendeudamiento", () => {
  const entrada: any = { id: 9, company: "BGA", date: "2026-09-01", origin: " Gustavo ", kind: "aporte", direction: "recibido", color: "negro", amount: 500, notes: "" };
  const deuda: any = deudaDesdeRegistro(entrada, 77, "2026-11-05");

  it("nace como prestamo, vinculada y con los datos del asiento", () => {
    expect(deuda).toMatchObject({ id: 77, company: "BGA", acreedor: "Gustavo", capital: 500, fechaInicio: "2026-09-01", ingresoCapitalId: 9, administration: "negro", active: true });
    expect(bloqueDeDeuda(deuda)).toBe("prestamo");
  });

  it("no trae cuotas: la devolucion se define despues y hasta entonces no entra en la cuenta del acreedor", () => {
    expect(cuotasPendientes(deuda)).toEqual([]);
    expect(comprasDeConvenios([deuda], "2026-11-05")).toEqual([]);
  });

  it("lo migrado deja de sumar en el resumen de Deudas y aportes si se filtra por deudaId", () => {
    const filas = [{ ...entrada, kind: "prestamo", deudaId: 77 }, { ...entrada, id: 10, origin: "Ana", kind: "prestamo", amount: 30 }];
    const r = summarizeContributions(filas.filter((x) => x.deudaId == null));
    expect(r.prestamosPendientes.total).toBe(30);
  });
});

describe("la linea de como cerro el ejercicio anterior", () => {
  const cierreLinea = { startIso: "2025-11-01", endIso: "2026-10-31" };
  const saldo = (t: any[]) => posicionEntreEmpresas(summarizeIntercompany({ transfers: t }).pairs);

  it("muestra el saldo del cierre aunque este ejercicio se mueva, y no se suman", () => {
    const antes = repartirPorEjercicio([giro("BGA", "DR", "2026-10-31", 1000)], () => cierreLinea);
    const despues = repartirPorEjercicio([giro("BGA", "DR", "2026-10-31", 1000), giro("DR", "BGA", "2026-11-02", 400)], () => cierreLinea);
    expect(saldo(despues.anterior)).toEqual(saldo(antes.anterior));
    expect(saldo(despues.anterior)).toEqual([{ deudor: "DR", acreedor: "BGA", saldo: 1000 }]);
    expect(saldo(despues.corriente)).toEqual([{ deudor: "BGA", acreedor: "DR", saldo: 400 }]);
  });
});
