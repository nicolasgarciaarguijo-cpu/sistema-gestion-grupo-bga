import { datosDelPase, faltantesDelPase, pasesParaReserva, type PaseForm } from "./pases";
import { girosDePases, posicionEntreEmpresas, summarizeIntercompany, unirGiros } from "./intercompany";
import { internalTransfersToMovements } from "./reservaSources";
import { entradasMovimientosInternos } from "./movimientosInternosCalendario";

const form: PaseForm = {
  date: "2026-11-04",
  amount: 2700000,
  currency: "ARS",
  company: "BGA",
  cuentaId: "banco|BGA|santander|ARS",
  companyDestino: "BGA",
  cuentaDestinoId: "banco|BGA|patagonia|ARS",
  description: "",
  notes: "",
};

describe("pase: origen y destino obligatorios", () => {
  it("completo no le falta nada", () => {
    expect(faltantesDelPase(form)).toEqual([]);
  });
  it("sin origen, sin destino, sin monto o con una fecha mal escrita no se guarda", () => {
    expect(faltantesDelPase({ ...form, cuentaId: "" })).toEqual(["de dónde sale"]);
    expect(faltantesDelPase({ ...form, cuentaDestinoId: "" })).toEqual(["a dónde va"]);
    expect(faltantesDelPase({ ...form, amount: 0 })).toEqual(["el monto"]);
    expect(faltantesDelPase({ ...form, date: "0002-11-04" })).toEqual(["la fecha"]);
  });
  it("la direccion y el color salen de las dos cuentas", () => {
    const banco = { id: "b", company: "BGA", tipo: "banco", color: "blanco" };
    const negro = { id: "e", company: "BGA", tipo: "efectivo", color: "negro" };
    const caja = { id: "p", company: "BGA", tipo: "persona", color: "blanco" };
    expect(datosDelPase(banco, banco)).toEqual({ direction: "banco_a_banco", color: "blanco" });
    expect(datosDelPase(negro, banco)).toEqual({ direction: "efectivo_a_banco", color: "negro" });
    expect(datosDelPase(banco, negro)).toEqual({ direction: "banco_a_efectivo", color: "negro" });
    expect(datosDelPase(negro, caja)).toEqual({ direction: "efectivo_a_efectivo", color: "negro" });
  });
});

describe("pase entre dos empresas", () => {
  const pase = { id: 1, company: "BGA", companyDestino: "DE RAIZ", date: "2026-11-04", direction: "efectivo_a_efectivo", currency: "ARS", color: "negro", amount: 1000 };

  it("a la billetera de cada empresa le toca su punta", () => {
    const de = (empresa: string) =>
      internalTransfersToMovements(pasesParaReserva([pase], (c) => c === empresa) as any).map((m) => [m.kind, m.color, m.amount]);
    expect(de("BGA")).toEqual([["egreso", "negro", 1000]]);
    expect(de("DE RAIZ")).toEqual([["ingreso", "negro", 1000]]);
    // Mirando las dos juntas no cambia el total del grupo.
    expect(internalTransfersToMovements(pasesParaReserva([pase], () => true) as any)).toEqual([]);
  });

  it("en el Calendario sale de una empresa y entra en la otra", () => {
    const e = entradasMovimientosInternos({ pases: [pase], capital: [], empresas: ["BGA", "DE RAIZ"] });
    expect(e.map((x) => [x.company, x.statusLabel])).toEqual([["BGA", "debito"], ["DE RAIZ", "credito"]]);
  });

  it("un pase dentro de la misma empresa no genera debe y haber", () => {
    expect(girosDePases([{ ...pase, companyDestino: "BGA" }], "ARS")).toEqual([]);
    expect(girosDePases([{ ...pase, companyDestino: undefined }], "ARS")).toEqual([]);
  });

  it("queda el debe y haber: el que recibio le debe al que giro", () => {
    const giros = girosDePases([pase, { ...pase, id: 2, company: "DE RAIZ", companyDestino: "BGA", amount: 300 }], "ARS");
    expect(posicionEntreEmpresas(summarizeIntercompany({ transfers: giros }).pairs)).toEqual([
      { deudor: "DE RAIZ", acreedor: "BGA", saldo: 700 },
    ]);
  });

  it("una factura de la que recibio cubre el giro", () => {
    const giros = girosDePases([pase], "ARS");
    const invoices = [{ from: "DE RAIZ", to: "BGA", date: "2026-11-05", amount: 1500 }];
    expect(posicionEntreEmpresas(summarizeIntercompany({ transfers: giros, invoices }).pairs)).toEqual([
      { deudor: "BGA", acreedor: "DE RAIZ", saldo: 500 },
    ]);
  });

  it("los dolares no entran en la cuenta de pesos", () => {
    expect(girosDePases([{ ...pase, currency: "USD" }], "ARS")).toEqual([]);
    expect(girosDePases([{ ...pase, currency: "USD" }], "USD")).toHaveLength(1);
  });

  it("el mismo giro cargado como pase y visto en el extracto cuenta una sola vez", () => {
    const giros = girosDePases([pase], "ARS");
    const delBanco = (date: string, amount = 1000, id = 9) => ({ id, from: "BGA", to: "DE RAIZ", date, amount, text: "transf", declaresInvoice: false });
    expect(unirGiros(giros, [delBanco("2026-11-06")])).toHaveLength(1);
    // Otro monto, otra fecha lejana u otro giro igual: son otros.
    expect(unirGiros(giros, [delBanco("2026-11-06", 999)])).toHaveLength(2);
    expect(unirGiros(giros, [delBanco("2026-12-20")])).toHaveLength(2);
    expect(unirGiros(giros, [delBanco("2026-11-05"), delBanco("2026-11-06", 1000, 10)])).toHaveLength(2);
  });
});
