import {
  entradasMovimientosInternos,
  filaDeCapital,
  destinoEnSolapa,
  FILA_PASE_ENTRA,
  FILA_PASE_SALE,
} from "./movimientosInternosCalendario";

const EMPRESAS = ["BGA estudio de diseño y produccion industrial", "De raiz s.r.l"];

describe("entradasMovimientosInternos", () => {
  it("un pase entre cuentas da dos patas de la misma empresa: sale de una y entra en la otra", () => {
    const r = entradasMovimientosInternos({
      pases: [{ id: 1, company: "De raiz s.r.l", date: "2026-10-10", direction: "banco_a_banco", amount: 500, cuentaId: "a", cuentaDestinoId: "b" }],
      capital: [],
      empresas: EMPRESAS,
      nombreCuenta: (id) => (id === "a" ? "Santander" : "Patagonia"),
    });
    expect(r).toHaveLength(2);
    const sale = r.find((e) => e.conceptKey === FILA_PASE_SALE)!;
    const entra = r.find((e) => e.conceptKey === FILA_PASE_ENTRA)!;
    expect(sale.statusLabel).toBe("debito");
    expect(entra.statusLabel).toBe("credito");
    expect(sale.amount).toBe(entra.amount);
    expect(sale.title).toContain("Patagonia");
    expect(entra.title).toContain("Santander");
  });

  it("un deposito de efectivo negro sale del negro y entra al banco en blanco", () => {
    const r = entradasMovimientosInternos({
      pases: [{ id: 2, company: "De raiz s.r.l", date: "2026-10-10", direction: "efectivo_a_banco", color: "negro", amount: 100 }],
      capital: [],
      empresas: EMPRESAS,
    });
    expect(r.find((e) => e.conceptKey === FILA_PASE_SALE)!.administration).toBe("negro");
    expect(r.find((e) => e.conceptKey === FILA_PASE_ENTRA)!.administration).toBe("blanco");
  });

  it("no emite montos en cero (el aporte en dolares sin pesos no ensucia la planilla)", () => {
    const r = entradasMovimientosInternos({
      pases: [],
      capital: [{ id: 3, company: "De raiz s.r.l", date: "2026-08-08", origin: "NICOLÁS", kind: "aporte", direction: "recibido", amount: 0 }],
      empresas: EMPRESAS,
    });
    expect(r).toHaveLength(0);
  });
});

describe("filaDeCapital", () => {
  const base = { id: 1, company: "De raiz s.r.l", date: "2026-10-01", amount: 10, color: "blanco" };
  it("ubica cada préstamo en el renglón de quien puso la plata", () => {
    expect(filaDeCapital({ ...base, origin: "NICOLÁS", kind: "prestamo", direction: "recibido" }, EMPRESAS)).toBe("prestamo_nicolas");
    expect(filaDeCapital({ ...base, origin: "Gustavo", kind: "prestamo", direction: "recibido" }, EMPRESAS)).toBe("prestamo_gustavo");
    expect(filaDeCapital({ ...base, origin: "Banco Galicia", kind: "prestamo", direction: "recibido" }, EMPRESAS)).toBe("prestamo_bancario");
    expect(filaDeCapital({ ...base, origin: "BGA", kind: "prestamo", direction: "recibido" }, EMPRESAS)).toBe("mi_in_prestamo_empresa");
    expect(filaDeCapital({ ...base, origin: "Juan", kind: "prestamo", direction: "recibido" }, EMPRESAS)).toBe("custom:prestamos:Préstamo de Juan");
    expect(filaDeCapital({ ...base, origin: "Nicolás", kind: "aporte", direction: "recibido" }, EMPRESAS)).toBe("mi_in_aporte");
  });
  it("una devolución es egreso; a la otra empresa va a su propio renglón", () => {
    expect(filaDeCapital({ ...base, origin: "Gustavo", kind: "prestamo", direction: "devuelto" }, EMPRESAS)).toBe("mi_out_devolucion_prestamo");
    expect(filaDeCapital({ ...base, origin: "BGA", kind: "prestamo", direction: "devuelto" }, EMPRESAS)).toBe("mi_out_prestamo_empresa");
  });
  it("la propia empresa no cuenta como 'otra empresa del grupo'", () => {
    expect(filaDeCapital({ ...base, origin: "De Raiz", kind: "prestamo", direction: "recibido" }, EMPRESAS)).toBe("custom:prestamos:Préstamo de De Raiz");
  });
});

describe("destinoEnSolapa", () => {
  it("lo cargado en la planilla va a la solapa que corresponde", () => {
    expect(destinoEnSolapa(FILA_PASE_SALE)).toEqual({ tipo: "pase" });
    expect(destinoEnSolapa("prestamo_gustavo")).toMatchObject({ tipo: "capital", origin: "Gustavo", direction: "recibido" });
    expect(destinoEnSolapa("mi_out_devolucion_prestamo")).toMatchObject({ direction: "devuelto" });
    expect(destinoEnSolapa("iv_reintegro_art")).toBeNull();
  });
});
