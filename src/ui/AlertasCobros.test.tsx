import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { AlertasCobros } from "./AlertasCobros";
import { cobrosConFechaMala, cobrosParaAvisar, cobrosProgramados, type TrabajoConCobros } from "../domain/cobrosProgramados";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Nicolas, 21/11/2026: "cuando programamos un cobro debe avisar el sistema que ese cobro estaria por entrar,
// para pedir un ajuste de fechas o si no confirmar que el cobro se realizo. No deberia dispararse solo."
const HOY = "2026-11-21";
const trabajos: TrabajoConCobros[] = [
  { id: 2, company: "BGA", budgetNumber: "3395", client: "Contract Rent SA", cobrosPrevistos: [{ id: 12, paymentDate: "2026-11-06", amount: 2974474, estado: "estimado" }], payments: [] },
  { id: 5, company: "BGA", budgetNumber: "3500", client: "Otro", cobrosPrevistos: [{ id: 15, paymentDate: "2026-11-24", amount: 100, estado: "estimado" }], payments: [] },
  { id: 9, company: "BGA", budgetNumber: "3415", client: "Bredici", cobrosPrevistos: [], payments: [{ id: 3, paymentDate: "22026-08-13", amount: 4308434 }] },
];
const cuentas: any[] = [{ id: "banco|BGA|santander|ARS", company: "BGA", tipo: "banco", nombre: "Santander", moneda: "ARS", color: "blanco", saldoApertura: 0, fechaApertura: "", activa: true }];

const pintar = (props: any = {}) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  act(() =>
    createRoot(div).render(
      <AlertasCobros
        cobros={cobrosParaAvisar(cobrosProgramados(trabajos, HOY))}
        fechasMalas={cobrosConFechaMala(trabajos, HOY)}
        cuentas={cuentas}
        hoy={HOY}
        companyShort={(c) => c}
        money={(n: number) => "$" + Math.round(n)}
        onConfirmar={() => {}}
        onReprogramar={() => {}}
        onAbrirTrabajo={() => {}}
        {...props}
      />
    )
  );
  return div;
};
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const escribir = (el: Element, valor: string) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor((el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement).prototype, "value")!.set!;
    setter.call(el, valor);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });

describe("AlertasCobros · el aviso", () => {
  it("lista los cobros por entrar y vencidos, y cuantos hay que resolver", () => {
    const texto = pintar().textContent || "";
    expect(texto).toContain("2 cobros programados · 1 para confirmar o cambiar la fecha");
    expect(texto).toContain("Debía entrar hace 15 días");
    expect(texto).toContain("Entra en 3 días");
  });

  it("avisa aparte los cobros con la fecha mal, y el click abre su trabajo", () => {
    const onAbrirTrabajo = jest.fn();
    const div = pintar({ onAbrirTrabajo });
    expect(div.textContent).toContain("1 cobro con la fecha mal");
    expect(div.textContent).toContain("fecha mal tipeada (22026-08-13)");
    click(div.querySelector('[data-fecha-mala="9:3"]')!);
    expect(onAbrirTrabajo).toHaveBeenCalledWith(9);
  });

  it("sin nada para avisar no dibuja nada", () => {
    expect(pintar({ cobros: [], fechasMalas: [] }).querySelector("[data-alertas-cobros]")).toBeNull();
  });
});

describe("AlertasCobros · resolver un cobro", () => {
  const abrir = (props: any = {}) => {
    const div = pintar(props);
    click(div.querySelector('[data-cobro="2:12"]')!);
    return div;
  };

  it("no se confirma solo: sin elegir la cuenta, confirmar no hace nada y lo dice", () => {
    const onConfirmar = jest.fn();
    const div = abrir({ onConfirmar });
    click(div.querySelector("[data-confirmar]")!);
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(div.querySelector("[data-error]")!.textContent).toContain("a qué cuenta entró");
  });

  it("confirmar pasa la fecha real y la cuenta donde entro", () => {
    const onConfirmar = jest.fn();
    const div = abrir({ onConfirmar });
    escribir(div.querySelector("[data-resolver-cobro] select")!, "banco|BGA|santander|ARS");
    escribir(div.querySelector("[data-fecha-cobro]")!, "2026-11-20");
    click(div.querySelector("[data-confirmar]")!);
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar.mock.calls[0][0]).toMatchObject({ jobId: 2, paymentId: 12, monto: 2974474 });
    expect(onConfirmar.mock.calls[0].slice(1)).toEqual(["2026-11-20", "banco|BGA|santander|ARS"]);
    expect(div.querySelector("[data-resolver-cobro]")).toBeNull();
  });

  it("no deja confirmar con una fecha futura: eso es cambiar la fecha", () => {
    const onConfirmar = jest.fn();
    const div = abrir({ onConfirmar });
    escribir(div.querySelector("[data-resolver-cobro] select")!, "banco|BGA|santander|ARS");
    escribir(div.querySelector("[data-fecha-cobro]")!, "2026-12-05");
    click(div.querySelector("[data-confirmar]")!);
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(div.querySelector("[data-error]")!.textContent).toContain("todavía no llegó");
  });

  it("todavia no entro: pide una fecha nueva de hoy en adelante y la pasa", () => {
    const onReprogramar = jest.fn();
    const div = abrir({ onReprogramar });
    click(div.querySelector("[data-reprogramar]")!);
    expect(onReprogramar).not.toHaveBeenCalled();
    escribir(div.querySelector("[data-fecha-nueva]")!, "2026-11-10");
    click(div.querySelector("[data-reprogramar]")!);
    expect(onReprogramar).not.toHaveBeenCalled();
    escribir(div.querySelector("[data-fecha-nueva]")!, "2026-12-05");
    click(div.querySelector("[data-reprogramar]")!);
    expect(onReprogramar.mock.calls[0][1]).toBe("2026-12-05");
  });

  it("los campos de fecha no dejan escribir un año de cinco cifras", () => {
    const div = abrir();
    expect((div.querySelector("[data-fecha-cobro]") as HTMLInputElement).max).toBe(HOY);
    expect((div.querySelector("[data-fecha-nueva]") as HTMLInputElement).max).toBe("2100-12-31");
  });
});

// VENTANA EMERGENTE (Nicolas, 21/11/2026): "que aparezca la ventana emergente pero que se pueda seguir trabajando".
describe("AlertasCobros · la ventana emergente", () => {
  it("aparece sola con lo que hay que resolver, y NO tapa la pantalla", () => {
    const div = pintar();
    const emergente = div.querySelector("[data-emergente-cobros]") as HTMLElement;
    expect(emergente).toBeTruthy();
    // Solo el vencido: el que entra en 3 dias avisa arriba, pero no pide nada todavia.
    expect(emergente.querySelectorAll("[data-emergente-cobro]")).toHaveLength(1);
    expect(emergente.textContent).toContain("Debía entrar hace 15 días");
    expect(emergente.querySelectorAll("[data-emergente-fecha]")).toHaveLength(1);
    // Flotante en una esquina, sin fondo a pantalla completa: se puede seguir trabajando.
    expect(emergente.style.position).toBe("fixed");
    expect(emergente.style.right).toBe("16px");
    expect(emergente.style.inset).toBe("");
  });

  it("«Seguir trabajando» la cierra y el aviso de arriba queda", () => {
    const div = pintar();
    click(div.querySelector("[data-seguir]")!);
    expect(div.querySelector("[data-emergente-cobros]")).toBeNull();
    expect(div.querySelector("[data-alertas-cobros]")).toBeTruthy();
  });

  it("si solo hay cobros por entrar (nada vencido) no aparece", () => {
    const soloProximo = cobrosParaAvisar(cobrosProgramados([trabajos[1]], HOY));
    expect(pintar({ cobros: soloProximo, fechasMalas: [] }).querySelector("[data-emergente-cobros]")).toBeNull();
  });

  it("«Resolver» abre la ventana del cobro", () => {
    const div = pintar();
    click(Array.from(div.querySelectorAll("[data-emergente-cobros] button")).find((b) => b.textContent === "Resolver")!);
    expect(div.querySelector("[data-resolver-cobro]")).toBeTruthy();
  });

  it("un cobro que figura cobrado con fecha futura se pasa a estimado con un click", () => {
    const onPasarAEstimado = jest.fn();
    const futuros: TrabajoConCobros[] = [{ id: 7, company: "BGA", budgetNumber: "CANDE", client: "Cande Arq", payments: [{ id: 70, paymentDate: "2026-12-26", amount: 5456284 }], cobrosPrevistos: [] }];
    const div = pintar({ cobros: [], fechasMalas: cobrosConFechaMala(futuros, HOY), onPasarAEstimado });
    click(Array.from(div.querySelectorAll("[data-emergente-cobros] button")).find((b) => b.textContent === "Pasar a estimado")!);
    expect(onPasarAEstimado.mock.calls[0][0]).toMatchObject({ jobId: 7, paymentId: 70, motivo: "futura" });
  });
});
