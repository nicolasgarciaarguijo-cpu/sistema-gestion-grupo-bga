import { buildPlanillaHtml, resumenDeudas, resumenInventario, resumenMovimientosInternos } from "./resumenesHtml";

const nov = { desde: "2026-11-01", hasta: "2026-11-30", etiqueta: "noviembre 2026" };

describe("resúmenes de las solapas nuevas para la carpeta", () => {
  it("la planilla genérica arma título, tarjetas, secciones y total", () => {
    const html = buildPlanillaHtml({
      titulo: "Prueba",
      subtitulo: "BGA · noviembre",
      tarjetas: [{ k: "Total", v: "$ 10" }],
      secciones: [{ titulo: "Filas", filas: [{ a: "x<y" }], columnas: [{ titulo: "A", valor: (r: any) => r.a }], total: { titulo: "Total", valor: 10 } }],
    });
    expect(html).toContain("<h1>Prueba</h1>");
    expect(html).toContain("x&lt;y");
    expect(html).toContain("Filas (1)");
  });

  it("los movimientos y cuotas se filtran por el período", () => {
    const mi = resumenMovimientosInternos(
      { pases: [{ date: "2026-11-05", amount: 100, description: "pase nov" }, { date: "2026-10-30", amount: 50, description: "pase oct" }], efectivo: [], capital: [], gente: [], retiros: [{ fecha: "2026-11-10", socio: "Gustavo", monto: 7, administration: "negro" }] },
      "BGA",
      nov
    );
    expect(mi).toContain("pase nov");
    expect(mi).not.toContain("pase oct");
    expect(mi).toContain("Gustavo");
    const d = resumenDeudas([{ acreedor: "AFIP", cuotas: [{ numero: 3, fecha: "2026-11-15", monto: 1000 }, { numero: 4, fecha: "2026-12-15", monto: 1000 }] }], "De Raíz", nov);
    expect(d).toContain("Cuotas del período (1)");
  });

  it("el inventario valoriza solo los artículos generales activos", () => {
    const html = resumenInventario(
      [{ kind: "general", code: "MEL-1", description: "Melamina", quantity: 2, unitPrice: 100, active: true }, { kind: "EPP", description: "Guantes", quantity: 5, unitPrice: 10 }],
      "De Raíz",
      nov
    );
    expect(html).toContain("Melamina");
    expect(html).not.toContain("Guantes");
    expect(html).toContain("Artículos (1)");
  });
});
