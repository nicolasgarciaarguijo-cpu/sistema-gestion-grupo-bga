// LA CELDA DEL DIA MUESTRA A LOS QUE ESTAN, NO A LOS QUE NO. Pedido de Nicolas (2026-09-09): quiere
// los nombres con su color, pero NO la nomina entera de ausentes cada sabado y domingo (nadie tenia
// que venir). El dibujo se verifica aca porque el dia no laborable marca a TODOS como "off": si la
// regla se afloja, el calendario vuelve a ser un muro de gente que no estaba.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

// La solapa trae adentro el panel de sincronizacion del reloj, que pega a Supabase al montarse.
jest.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({ select: async () => ({ data: [] }) }),
    rpc: async () => ({ error: null }),
  },
}));

import { AsistenciaTab } from "./Asistencia";

const dia = (date: string, status: string, checkIn = "", checkOut = "") =>
  ({ date, status, checkIn, checkOut, normalHours: 0, extra50Hours: 0, extra100Hours: 0, attachmentName: "", notes: "" } as any);

// Agosto 2026: el 1 y el 2 son sabado y domingo; el 3 es lunes; el 17 es feriado.
const MES = "2026-08";
const SABADO = "2026-08-01";
const LUNES = "2026-08-03";
const FERIADO = "2026-08-17";

const empleados = [
  { id: 1, legajo: "5", name: "Maximiliano Pacifico", company: "De raiz s.r.l", attendance: [] },
  { id: 2, legajo: "6", name: "Adalberto Soria", company: "De raiz s.r.l", attendance: [] },
  { id: 3, legajo: "8", name: "Gerardo Carmona", company: "De raiz s.r.l", attendance: [] },
] as any[];

const conFichadas = (porEmpleado: Record<string, any[]>) =>
  empleados.map((e) => ({ ...e, attendance: porEmpleado[e.legajo] || [] }));

const base = {
  initialMonth: MES,
  companyOptions: [{ value: "De raiz s.r.l", short: "DR" }],
  getCompanyMeta: () => ({ short: "DR", primary: "#7c4a21" }),
};

const montados: Array<{ host: HTMLElement; root: ReturnType<typeof createRoot> }> = [];
const render = (employees: any[]) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(<AsistenciaTab {...(base as any)} employees={employees} />); });
  montados.push({ host, root });
  return host;
};
afterEach(() => {
  while (montados.length) {
    const m = montados.pop()!;
    act(() => { m.root.unmount(); });
    m.host.remove();
  }
});

// El calendario del mes: la celda de un dia es el div cuyo encabezado arranca con ese numero.
const celdaDelDia = (host: HTMLElement, numero: number) =>
  Array.from(host.querySelectorAll("div")).find((d) => {
    const head = d.firstElementChild;
    return head?.tagName === "DIV" && head.firstElementChild?.tagName === "STRONG" &&
      head.firstElementChild?.textContent === String(numero);
  }) as HTMLElement | undefined;

describe("la celda del día lista a los que están", () => {
  it("un día hábil lista a cada uno con su nombre", () => {
    const host = render(conFichadas({
      "5": [dia(LUNES, "presente", "07:25", "17:05")],
      "6": [dia(LUNES, "presente", "08:10", "17:05")],
      "8": [dia(LUNES, "ausente_injustificado")],
    }));
    const celda = celdaDelDia(host, 3)!;
    expect(celda.textContent).toContain("Maximiliano Pacifico");
    expect(celda.textContent).toContain("Adalberto Soria");
    expect(celda.textContent).toContain("Gerardo Carmona");
  });

  it("el sábado NO lista a la gente que no vino", () => {
    const host = render(conFichadas({}));
    const celda = celdaDelDia(host, 1)!;
    expect(celda.textContent).toContain("Fin de semana");
    expect(celda.textContent).not.toContain("Pacifico");
    expect(celda.textContent).not.toContain("Soria");
  });

  it("pero al que SÍ vino un sábado lo lista, y solo a él", () => {
    const host = render(conFichadas({ "5": [dia(SABADO, "presente", "07:20", "13:00")] }));
    const celda = celdaDelDia(host, 1)!;
    expect(celda.textContent).toContain("Maximiliano Pacifico");
    expect(celda.textContent).not.toContain("Adalberto Soria");
  });

  it("el feriado no lista a nadie", () => {
    const host = render(conFichadas({}));
    const celda = celdaDelDia(host, 17)!;
    expect(celda.textContent).not.toContain("Pacifico");
  });

  it("las vacaciones sí se ven, con su color", () => {
    const host = render(conFichadas({ "6": [dia(LUNES, "vacaciones")] }));
    const celda = celdaDelDia(host, 3)!;
    const conNombre = Array.from(celda.querySelectorAll("span")).find(
      (sp) => sp.textContent === "Adalberto Soria"
    ) as HTMLElement;
    expect(conNombre).toBeTruthy();
    expect(conNombre.style.color).toBe("rgb(37, 99, 235)"); // azul de vacaciones
  });
});
