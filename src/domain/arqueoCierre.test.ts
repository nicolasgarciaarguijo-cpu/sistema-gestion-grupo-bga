import { billeterasDesdeArqueo, faltantesDelArqueo, filasDeArqueo, movimientosDelArqueo } from "./arqueoCierre";

const saldos = [
  { id: "banco|BGA|santander|ARS", company: "BGA", nombre: "Santander", tipo: "banco" as const, moneda: "ARS" as const, color: "blanco" as const, saldo: 1000 },
  { id: "efectivo|BGA|negro|ARS", company: "BGA", nombre: "Efectivo negro", tipo: "efectivo" as const, moneda: "ARS" as const, color: "negro" as const, saldo: 500 },
  { id: "efectivo|BGA|blanco|USD", company: "BGA", nombre: "Dólares", tipo: "efectivo" as const, moneda: "USD" as const, color: "blanco" as const, saldo: 20 },
  { id: "banco|DR|patagonia|ARS", company: "DR", nombre: "Patagonia", tipo: "banco" as const, moneda: "ARS" as const, color: "blanco" as const, saldo: 9 },
];

describe("arqueo de cierre", () => {
  it("una fila por cuenta de la empresa, arrancando con lo del sistema", () => {
    const f = filasDeArqueo(saldos, "BGA");
    expect(f.map((x) => x.nombre)).toEqual(["Santander", "Efectivo negro", "Dólares"]);
    expect(f.every((x) => x.real === x.sistema)).toBe(true);
    expect(faltantesDelArqueo(f)).toEqual([]);
  });

  it("si la plata no coincide pide el motivo, y que tenga sentido", () => {
    const f = filasDeArqueo(saldos, "BGA");
    f[1].real = 300; // faltan 200 en negro
    expect(faltantesDelArqueo(f)[0]).toMatch(/falta el motivo/);
    f[1].motivo = "aporte";
    expect(faltantesDelArqueo(f)[0]).toMatch(/no puede ser un aporte/);
    f[1].motivo = "retiro";
    expect(faltantesDelArqueo(f)[0]).toMatch(/falta el socio/);
    f[1].socio = "Gustavo";
    expect(faltantesDelArqueo(f)).toEqual([]);
  });

  it("el retiro queda asentado por la diferencia y el año arranca con lo contado", () => {
    const f = filasDeArqueo(saldos, "BGA");
    f[1].real = 300;
    f[1].motivo = "retiro";
    f[1].socio = "Gustavo";
    f[0].real = 1100;
    f[0].motivo = "ajuste";
    f[0].detalle = "intereses no cargados";
    const mov = movimientosDelArqueo(f);
    expect(mov.retiros).toEqual([{ socio: "Gustavo", monto: 200, moneda: "ARS", color: "negro", cuentaId: "efectivo|BGA|negro|ARS", nombre: "Efectivo negro" }]);
    expect(mov.aportes).toEqual([]);
    const b = billeterasDesdeArqueo(f);
    expect(b).toEqual(
      expect.arrayContaining([
        { currency: "ARS", location: "banco", color: "blanco", amount: 1100 },
        { currency: "ARS", location: "efectivo", color: "negro", amount: 300 },
        { currency: "USD", location: "efectivo", color: "blanco", amount: 20 },
      ])
    );
  });
});
