import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { FichaExtracto } from "./FichaExtracto";
import { fichasDeExtracto, type MovimientoF } from "../domain/fichaExtracto";
import { fichaDelResumen, type RenglonF, type ResumenF, type TarjetaF } from "../domain/fichaTarjeta";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 25/11/2026: "que pasa si no se linkean las cosas? todo el tiempo me va a estar recordando el faltante"
// -> "preparame esos botones pero solo para el administrador". Cerrar sin link: con motivo y firma, deja de reclamar.
const mov = (id: number, extra: Partial<MovimientoF> = {}): MovimientoF => ({ id, company: "BGA", bank: "Santander", currency: "ARS", date: "2026-11-16", concept: `Transferencia ${id}`, movementType: "debito", amount: 100, balance: 1000 - id * 100, ...extra });
const cierre = { firmante: "Nicolas", fecha: "2026-11-25", motivo: "no hay comprobante" };

describe("cerrar sin link: el extracto", () => {
  it("un movimiento cerrado no cuenta como pendiente ni como desconocido", () => {
    const abierto = fichasDeExtracto([mov(1)], [], [])[0];
    expect(abierto.pendientes).toBe(1);
    expect(abierto.completo).toBe(false);
    const f = fichasDeExtracto([mov(1, { cerradoSinLink: cierre })], [], [])[0];
    expect(f.pendientes).toBe(0);
    expect(f.desconocidos).toBe(0);
    expect(f.completo).toBe(true);
    expect(f.movimientos[0].estado).toBe("cerrado");
    expect(f.movimientos[0].detalle).toContain("no hay comprobante");
    expect(f.movimientos[0].detalle).toContain("Nicolas");
  });

  it("cerrar un desconocido lo saca del reclamo", () => {
    const f = fichasDeExtracto([mov(1, { desconocido: { firmante: "J", fecha: "2026-11-20", nota: "?" }, cerradoSinLink: cierre })], [], [])[0];
    expect(f.desconocidos).toBe(0);
    expect(f.completo).toBe(true);
  });

  const montar = (esAdmin: boolean, onCerrarSinLink = jest.fn()) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    act(() =>
      createRoot(div).render(
        <FichaExtracto
          titulo="Santander · BGA · $"
          meses={fichasDeExtracto([mov(1)], [], [])}
          money={(n) => `$${n}`}
          opciones={() => []}
          onLink={() => {}}
          onTipo={() => {}}
          onDesconocer={() => {}}
          onSoltar={() => {}}
          onCerrar={() => {}}
          renglones={[]}
          etiquetaRenglon={(k) => k}
          onRenglon={() => {}}
          onCircuito={() => {}}
          onBorrar={() => {}}
          onLimpiar={() => {}}
          onNota={() => {}}
          onAdjunto={() => {}}
          sugerenciaRenglon={() => null}
          esAdmin={esAdmin}
          onCerrarSinLink={onCerrarSinLink}
        />
      )
    );
    const fila = Array.from(div.querySelectorAll("tr")).find((tr) => (tr.textContent || "").includes("Transferencia 1"))!;
    act(() => {
      fila.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    });
    return { div, onCerrarSinLink };
  };
  const opcion = () => Array.from(document.body.querySelectorAll("*")).find((el) => el.children.length === 0 && (el.textContent || "").includes("Cerrar sin link")) as HTMLElement | undefined;

  it("el botón solo lo ve el administrador", () => {
    const a = montar(false);
    expect(opcion()).toBeUndefined();
    a.div.remove();
    document.body.innerHTML = "";
    montar(true);
    expect(opcion()).toBeDefined();
    document.body.innerHTML = "";
  });

  it("pide el motivo y sin motivo no cierra", () => {
    const { onCerrarSinLink } = montar(true);
    const alerta = jest.spyOn(window, "alert").mockImplementation(() => {});
    const prompt = jest.spyOn(window, "prompt").mockReturnValue("  ");
    act(() => opcion()!.click());
    expect(onCerrarSinLink).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalled();
    document.body.innerHTML = "";
    const otra = montar(true);
    prompt.mockReturnValue("gasto viejo sin comprobante");
    act(() => opcion()!.click());
    expect(otra.onCerrarSinLink).toHaveBeenCalledWith(1, "gasto viejo sin comprobante");
    prompt.mockRestore();
    alerta.mockRestore();
    document.body.innerHTML = "";
  });
});

describe("cerrar sin link y desconocer: el resumen de la tarjeta", () => {
  const tarjeta: TarjetaF = { id: 1, company: "BGA", name: "Visa", bank: "Patagonia", lastDigits: "" };
  const resumen: ResumenF = { id: 10, company: "BGA", cardId: 1, closingDate: "2026-11-26", dueDate: "2026-12-10", totalArs: 300 };
  const r = (id: number, extra: Partial<RenglonF> = {}): RenglonF => ({ id, company: "BGA", cardId: 1, statementId: 10, date: "2026-11-10", description: `COMPRA ${id}`, amount: 100, currency: "ARS", cardDigits: "1234", holder: "NICOLAS", ...extra });

  it("el cerrado deja de contar; el desconocido sigue contando", () => {
    const f = fichaDelResumen(resumen, [r(1), r(2, { cerradoSinLink: cierre }), r(3, { desconocido: { firmante: "N", fecha: "2026-11-25", nota: "no es nuestro" } })], [], [tarjeta], [resumen]);
    expect(f.renglones.map((x) => x.estado)).toEqual(["pendiente", "cerrado", "desconocido"]);
    expect(f.pendientes).toBe(2);
    expect(f.completo).toBe(false);
  });

  it("con todo cerrado el resumen queda completo", () => {
    const f = fichaDelResumen(resumen, [r(1, { cerradoSinLink: cierre })], [], [tarjeta], [resumen]);
    expect(f.pendientes).toBe(0);
    expect(f.completo).toBe(true);
  });
});

// Nicolas, 25/11/2026: "tambien esta mezclando Patagonia BGA y Patagonia De Raiz".
describe("el extracto de una cuenta solo ofrece los pagos de esa cuenta", () => {
  const { pagoEsDeLaCuenta } = require("../domain/fichaExtracto");
  const movBga = { company: "BGA", bank: "Patagonia", currency: "ARS" };

  it("un pago de la Patagonia de De Raíz no se ofrece en la Patagonia de BGA", () => {
    expect(pagoEsDeLaCuenta({ company: "De Raiz", cuentaId: "banco|De Raiz|patagonia|ARS" }, movBga)).toBe(false);
    expect(pagoEsDeLaCuenta({ company: "BGA", cuentaId: "banco|BGA|patagonia|ARS" }, movBga)).toBe(true);
  });

  it("tampoco uno de otro banco de la misma empresa", () => {
    expect(pagoEsDeLaCuenta({ company: "BGA", cuentaId: "banco|BGA|santander|ARS" }, movBga)).toBe(false);
  });

  it("un pago cruzado aparece en la cuenta de donde salió la plata", () => {
    expect(pagoEsDeLaCuenta({ company: "De Raiz", cuentaId: "banco|BGA|patagonia|ARS" }, movBga)).toBe(true);
  });

  it("sin cuenta de banco elegida vale la empresa del pago", () => {
    expect(pagoEsDeLaCuenta({ company: "BGA" }, movBga)).toBe(true);
    expect(pagoEsDeLaCuenta({ company: "De Raiz" }, movBga)).toBe(false);
  });

  it("la sugerencia respeta la cuenta", () => {
    const m = mov(1, { bank: "Patagonia", concept: "Transferencia a proveedor", amount: 500 });
    const pagoOtraCuenta = { id: 9, company: "BGA", date: "2026-11-16", amount: 500, supplier: "X", description: "", paymentMethod: "transferencia", cuentaId: "banco|BGA|santander|ARS" };
    expect(fichasDeExtracto([m], [pagoOtraCuenta], [])[0].movimientos[0].estado).toBe("pendiente");
    expect(fichasDeExtracto([m], [{ ...pagoOtraCuenta, cuentaId: "banco|BGA|patagonia|ARS" }], [])[0].movimientos[0].estado).toBe("sugerido");
  });
});

// Nicolas, 25/11/2026: "en movimientos internos quiero linkear el movimiento exacto que se hizo con la operacion" y
// "cuando alguien sin autorizacion linkea con alguna solapa que no pueda ver, que quede el recordatorio para el admin".
describe("movimiento interno: la operación exacta", () => {
  const { TEXTO_INTERNO_SIN_OPERACION } = require("../domain/fichaExtracto");
  const pase = { id: 77, date: "2026-11-04", amount: 100, description: "PASE ENTRE BANCOS" };

  it("linkeado con su operación, dice cuál es y no deja recordatorio", () => {
    const f = fichasDeExtracto([mov(1, { assignedKind: "interno", assignedTransferId: 77 })], [], [], [pase])[0];
    expect(f.movimientos[0].estado).toBe("linkeado");
    expect(f.movimientos[0].detalle).toContain("PASE ENTRE BANCOS");
    expect(f.movimientos[0].detalle).toContain("04/11/2026");
    expect(f.internosSinOperacion).toBe(0);
  });

  it("marcado como interno sin operación: queda el recordatorio para el administrador", () => {
    const f = fichasDeExtracto([mov(1, { assignedKind: "interno" })], [], [], [pase])[0];
    expect(f.movimientos[0].detalle).toBe(TEXTO_INTERNO_SIN_OPERACION);
    expect(f.internosSinOperacion).toBe(1);
    expect(f.pendientes).toBe(0);
  });
});
